import {
  COMPONENT_DEFS,
  DOUBLE_TAP_MAX_DELAY_MS,
  DOUBLE_TAP_MAX_DISTANCE_PX,
  EMPTY_TAP_MOVE_TOLERANCE_PX,
  GRID_SIZE,
  MAX_ZOOM,
  MIN_ZOOM,
  MOUSE_TERMINAL_HIT_RADIUS,
  TOUCH_TERMINAL_HIT_RADIUS,
} from "../core/constants.js";
import { clamp, distance } from "../core/support.js";
import { appEls, emptyCanvasTapState, state, wheelState } from "../runtime/state.js";
import { requestRender } from "../render/render.js";
import {
  clearSelection,
  clientToCanvas,
  clientToWorld,
  cycleNodeMarkerAnchor,
  getComponentById,
  handleTerminalTap,
  handleWireTap,
  isComponentGroupSelected,
  normalizedFromValue,
  pickComponentBody,
  pickNodeMarker,
  pickTerminal,
  pickTerminalLabel,
  pickWire,
  screenToWorld,
  selectComponent,
  selectNodeMarker,
  selectTerminalLabel,
  toggleSelectedEditableParameter,
  selectWire,
  toggleComponentInGroupSelection,
  tryMoveComponent,
  tryMoveSelectedComponents,
  updateSelectionUi,
  updateValueFromWheelPointer,
  worldToScreen,
} from "./circuit.js";

// Pointer, touch, zoom, and wheel interaction handlers.

const nodeMarkerTapState = {
  lastTimestamp: 0,
  lastScreenX: 0,
  lastScreenY: 0,
  lastRoot: null,
};

function setupCanvasGestures() {
  appEls.canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();

      if (event.touches.length >= 2) {
        clearEmptyCanvasTapHistory();
        clearNodeMarkerTapHistory();
        startPinch(event.touches);
        return;
      }

      if (event.touches.length === 1) {
        startSingleTouch(event.touches[0], event.timeStamp || Date.now());
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();

      if (state.pointer.mode === "panzoom" && event.touches.length >= 2) {
        movePinch(event.touches);
        return;
      }

      if (state.pointer.mode === "drag" && event.touches.length >= 1) {
        const touch = findTouchById(event.touches, state.pointer.activeTouchId);
        if (touch) {
          moveDrag(touch);
        }
        return;
      }

      if (state.pointer.mode === "group-press" && event.touches.length >= 1) {
        const touch = findTouchById(event.touches, state.pointer.activeTouchId);
        if (touch) {
          moveGroupPress(touch, "drag");
        }
        return;
      }

      if (state.pointer.mode === "pan" && event.touches.length >= 1) {
        const touch = findTouchById(event.touches, state.pointer.activeTouchId);
        if (touch) {
          movePan(touch);
        }
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchend",
    (event) => {
      event.preventDefault();

      if (state.pointer.mode === "panzoom") {
        if (event.touches.length < 2) {
          state.pointer.mode = "none";
        }
        return;
      }

      if (state.pointer.mode === "drag") {
        const ended = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === state.pointer.activeTouchId
        );
        if (ended) {
          const shouldToggle = shouldToggleSelectedComponentParameter();
          state.pointer.mode = "none";
          state.pointer.activeTouchId = null;
          state.pointer.dragComponentId = null;
          state.pointer.emptyTapCandidate = false;
          clearComponentTapCandidate();
          if (shouldToggle) {
            toggleSelectedEditableParameter();
          }
        }
        return;
      }

      if (state.pointer.mode === "group-press") {
        const ended = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === state.pointer.activeTouchId
        );
        if (ended) {
          finishGroupPressSelection();
        }
        return;
      }

      if (state.pointer.mode === "pan") {
        const endedTouch = Array.from(event.changedTouches).find(
          (touch) => touch.identifier === state.pointer.activeTouchId
        );
        if (endedTouch) {
          const wasTap = state.pointer.emptyTapCandidate === true;
          const tapPoint = clientToCanvas(endedTouch.clientX, endedTouch.clientY);
          state.pointer.mode = "none";
          state.pointer.activeTouchId = null;
          state.pointer.emptyTapCandidate = false;

          if (wasTap) {
            const worldPoint = screenToWorld(tapPoint.x, tapPoint.y);
            if (isCanvasPointEmpty(worldPoint.x, worldPoint.y, TOUCH_TERMINAL_HIT_RADIUS)) {
              clearNodeMarkerTapHistory();
              registerEmptyCanvasTap(
                tapPoint.x,
                tapPoint.y,
                event.timeStamp || Date.now()
              );
            } else {
              clearEmptyCanvasTapHistory();
            }
          }
        }
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchcancel",
    (event) => {
      event.preventDefault();
      state.pointer.mode = "none";
      state.pointer.activeTouchId = null;
      state.pointer.dragComponentId = null;
      state.pointer.emptyTapCandidate = false;
      clearComponentTapCandidate();
      clearEmptyCanvasTapHistory();
      clearNodeMarkerTapHistory();
    },
    { passive: false }
  );

  appEls.canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const canvasPoint = clientToCanvas(event.clientX, event.clientY);
    const point = clientToWorld(event.clientX, event.clientY);
    if (state.groupSelectMode) {
      clearEmptyCanvasTapHistory();
      const groupSelectableComponent = pickGroupSelectableComponent(
        point.x,
        point.y,
        MOUSE_TERMINAL_HIT_RADIUS
      );
      if (groupSelectableComponent) {
        startGroupPressSelection(groupSelectableComponent, point, canvasPoint, {
          mode: "mouse-group-press",
        });
        return;
      }

      clearNodeMarkerTapHistory();
      if (!pickNodeMarker(canvasPoint.x, canvasPoint.y) && isCanvasPointEmpty(point.x, point.y, MOUSE_TERMINAL_HIT_RADIUS)) {
        clearSelection();
      }
      return;
    }

    const nodeMarkerHit = pickNodeMarker(canvasPoint.x, canvasPoint.y);
    if (nodeMarkerHit) {
      clearEmptyCanvasTapHistory();
      selectNodeMarker(nodeMarkerHit.root);
      return;
    }

    const terminalLabelHit = pickTerminalLabel(canvasPoint.x, canvasPoint.y);
    if (terminalLabelHit) {
      clearEmptyCanvasTapHistory();
      selectTerminalLabel(terminalLabelHit);
      return;
    }

    const terminalHit = pickTerminal(point.x, point.y, MOUSE_TERMINAL_HIT_RADIUS);
    if (terminalHit) {
      clearEmptyCanvasTapHistory();
      handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
      return;
    }

    const compHit = pickComponentBody(point.x, point.y);
    if (compHit) {
      const wasSelected = state.selectedComponentId === compHit.id;
      selectComponent(compHit.id);
      state.pointer.mode = "mouse-drag";
      state.pointer.dragComponentId = compHit.id;
      state.pointer.dragOffsetX = point.x - compHit.x;
      state.pointer.dragOffsetY = point.y - compHit.y;
      primeComponentTapCandidate(compHit.id, wasSelected, canvasPoint);
      return;
    }

    const wireHit = pickWire(point.x, point.y);
    if (wireHit) {
      if (state.pendingTerminal) {
        handleWireTap(wireHit);
        return;
      }

      selectWire(wireHit.wire.id);
      return;
    }

    clearSelection();
    startMousePan(event);
  });

  appEls.canvas.addEventListener(
    "dblclick",
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();

      const canvasPoint = clientToCanvas(event.clientX, event.clientY);
      const nodeMarkerHit = pickNodeMarker(canvasPoint.x, canvasPoint.y);
      if (nodeMarkerHit) {
        cycleNodeMarkerAnchor(nodeMarkerHit.root);
        return;
      }

      const worldPoint = clientToWorld(event.clientX, event.clientY);
      if (!isCanvasPointEmpty(worldPoint.x, worldPoint.y, MOUSE_TERMINAL_HIT_RADIUS)) {
        return;
      }

      const screenPoint = clientToCanvas(event.clientX, event.clientY);
      state.pointer.mode = "none";
      state.pointer.dragComponentId = null;
      resetZoomToDefaultAtPoint(screenPoint.x, screenPoint.y);
      clearEmptyCanvasTapHistory();
    },
    { passive: false }
  );

  window.addEventListener("mousemove", (event) => {
    if (state.pointer.mode === "mouse-group-press") {
      moveGroupPress(event, "mouse-drag");
      return;
    }

    if (state.pointer.mode === "mouse-drag") {
      const component = getComponentById(state.pointer.dragComponentId);
      if (!component) return;

      const canvasPoint = clientToCanvas(event.clientX, event.clientY);
      maybeClearComponentTapCandidate(canvasPoint);

      const point = clientToWorld(event.clientX, event.clientY);
      const targetX = Math.round(point.x - state.pointer.dragOffsetX);
      const targetY = Math.round(point.y - state.pointer.dragOffsetY);
      if (targetX === component.x && targetY === component.y) return;
      if (state.groupSelectMode && isComponentGroupSelected(component.id)) {
        tryMoveSelectedComponents(component.id, targetX, targetY);
        return;
      }

      tryMoveComponent(component.id, targetX, targetY);
      return;
    }

    if (state.pointer.mode === "mouse-pan") {
      moveMousePan(event);
    }
  });

  window.addEventListener("mouseup", () => {
    if (state.pointer.mode === "mouse-group-press") {
      finishGroupPressSelection();
      return;
    }

    if (state.pointer.mode === "mouse-drag") {
      const shouldToggle = shouldToggleSelectedComponentParameter();
      finishPointerInteraction();
      if (shouldToggle) {
        toggleSelectedEditableParameter();
      }
      return;
    }

    if (state.pointer.mode === "mouse-pan") {
      finishPointerInteraction();
    }
  });

  appEls.canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? 1.08 : 0.92;
      const point = clientToCanvas(event.clientX, event.clientY);
      zoomAroundPoint(point.x, point.y, state.camera.zoom * factor);
    },
    { passive: false }
  );
}

function setupWheelGestures() {
  appEls.valueWheel.addEventListener("pointerdown", (event) => {
    if (state.selectedComponentId == null) return;
    const component = getComponentById(state.selectedComponentId);
    if (!component || !COMPONENT_DEFS[component.type].editable) return;

    wheelState.dragging = true;
    wheelState.pointerId = event.pointerId;
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = normalizedFromValue(component);
    appEls.valueWheel.setPointerCapture(event.pointerId);
    updateValueFromWheelPointer(event.clientX, event.clientY);
  });

  appEls.valueWheel.addEventListener("pointermove", (event) => {
    if (!wheelState.dragging || wheelState.pointerId !== event.pointerId) return;
    updateValueFromWheelPointer(event.clientX, event.clientY);
  });

  appEls.valueWheel.addEventListener("pointerup", (event) => {
    if (wheelState.pointerId !== event.pointerId) return;
    wheelState.dragging = false;
    wheelState.pointerId = null;
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = null;
    try {
      appEls.valueWheel.releasePointerCapture(event.pointerId);
    } catch (_) {}
  });

  appEls.valueWheel.addEventListener("pointercancel", () => {
    wheelState.dragging = false;
    wheelState.pointerId = null;
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = null;
  });
}

function setupNativeZoomGuards() {
  document.addEventListener(
    "dblclick",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  const preventGesture = (event) => {
    event.preventDefault();
  };

  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
}

function finishPointerInteraction() {
  state.pointer.mode = "none";
  state.pointer.activeTouchId = null;
  state.pointer.dragComponentId = null;
  state.pointer.emptyTapCandidate = false;
  clearComponentTapCandidate();
}

function pickGroupSelectableComponent(worldX, worldY, terminalThreshold) {
  const terminalHit = pickTerminal(worldX, worldY, terminalThreshold);
  if (terminalHit) {
    return getComponentById(terminalHit.componentId);
  }

  return pickComponentBody(worldX, worldY);
}

function startGroupPressSelection(component, worldPoint, canvasPoint, { mode, activeTouchId = null } = {}) {
  state.pointer.mode = mode;
  state.pointer.activeTouchId = activeTouchId;
  state.pointer.dragComponentId = component.id;
  state.pointer.dragOffsetX = worldPoint.x - component.x;
  state.pointer.dragOffsetY = worldPoint.y - component.y;
  state.pointer.tapStartScreenX = canvasPoint.x;
  state.pointer.tapStartScreenY = canvasPoint.y;
  state.pointer.emptyTapCandidate = false;
}

function moveGroupPress(pointerLike, dragMode) {
  const component = getComponentById(state.pointer.dragComponentId);
  if (!component) return;

  const canvasPoint = clientToCanvas(pointerLike.clientX, pointerLike.clientY);
  if (
    distance(
      canvasPoint.x,
      canvasPoint.y,
      state.pointer.tapStartScreenX,
      state.pointer.tapStartScreenY
    ) <= EMPTY_TAP_MOVE_TOLERANCE_PX
  ) {
    return;
  }

  if (!isComponentGroupSelected(component.id)) {
    state.selectedComponentIds.add(component.id);
    updateSelectionUi();
  }

  state.pointer.mode = dragMode;

  const point = clientToWorld(pointerLike.clientX, pointerLike.clientY);
  const targetX = Math.round(point.x - state.pointer.dragOffsetX);
  const targetY = Math.round(point.y - state.pointer.dragOffsetY);
  if (targetX === component.x && targetY === component.y) return;
  tryMoveSelectedComponents(component.id, targetX, targetY);
}

function finishGroupPressSelection() {
  const componentId = state.pointer.dragComponentId;
  finishPointerInteraction();
  if (componentId == null) return;
  toggleComponentInGroupSelection(componentId);
}

function startSingleTouch(touch, timestamp = Date.now()) {
  const canvasPoint = clientToCanvas(touch.clientX, touch.clientY);
  const point = clientToWorld(touch.clientX, touch.clientY);
  if (state.groupSelectMode) {
    clearEmptyCanvasTapHistory();
    clearNodeMarkerTapHistory();
    const groupSelectableComponent = pickGroupSelectableComponent(
      point.x,
      point.y,
      TOUCH_TERMINAL_HIT_RADIUS
    );
    if (groupSelectableComponent) {
      startGroupPressSelection(groupSelectableComponent, point, canvasPoint, {
        mode: "group-press",
        activeTouchId: touch.identifier,
      });
      return;
    }

    if (!pickNodeMarker(canvasPoint.x, canvasPoint.y) && isCanvasPointEmpty(point.x, point.y, TOUCH_TERMINAL_HIT_RADIUS)) {
      clearSelection();
      state.pointer.mode = "none";
    }
    return;
  }

  const nodeMarkerHit = pickNodeMarker(canvasPoint.x, canvasPoint.y);
  if (nodeMarkerHit) {
    clearEmptyCanvasTapHistory();
    handleNodeMarkerTap(nodeMarkerHit, canvasPoint.x, canvasPoint.y, timestamp);
    state.pointer.mode = "none";
    return;
  }

  clearNodeMarkerTapHistory();

  const terminalLabelHit = pickTerminalLabel(canvasPoint.x, canvasPoint.y);
  if (terminalLabelHit) {
    clearEmptyCanvasTapHistory();
    selectTerminalLabel(terminalLabelHit);
    state.pointer.mode = "none";
    return;
  }

  const terminalHit = pickTerminal(point.x, point.y, TOUCH_TERMINAL_HIT_RADIUS);
  if (terminalHit) {
    clearEmptyCanvasTapHistory();
    handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
    state.pointer.mode = "none";
    return;
  }

  const componentHit = pickComponentBody(point.x, point.y);
  if (componentHit) {
    clearEmptyCanvasTapHistory();
    const wasSelected = state.selectedComponentId === componentHit.id;
    selectComponent(componentHit.id);
    state.pointer.mode = "drag";
    state.pointer.activeTouchId = touch.identifier;
    state.pointer.dragComponentId = componentHit.id;
    state.pointer.dragOffsetX = point.x - componentHit.x;
    state.pointer.dragOffsetY = point.y - componentHit.y;
    primeComponentTapCandidate(componentHit.id, wasSelected, canvasPoint);
    return;
  }

  const wireHit = pickWire(point.x, point.y);
  if (wireHit) {
    clearEmptyCanvasTapHistory();
    if (state.pendingTerminal) {
      handleWireTap(wireHit);
      state.pointer.mode = "none";
      return;
    }

    selectWire(wireHit.wire.id);
    state.pointer.mode = "none";
    return;
  }

  clearSelection();
  startPan(touch);
}

function moveDrag(touch) {
  const component = getComponentById(state.pointer.dragComponentId);
  if (!component) return;

  const canvasPoint = clientToCanvas(touch.clientX, touch.clientY);
  maybeClearComponentTapCandidate(canvasPoint);

  const point = clientToWorld(touch.clientX, touch.clientY);
  const targetX = Math.round(point.x - state.pointer.dragOffsetX);
  const targetY = Math.round(point.y - state.pointer.dragOffsetY);

  if (targetX === component.x && targetY === component.y) return;

  if (state.groupSelectMode && isComponentGroupSelected(component.id)) {
    tryMoveSelectedComponents(component.id, targetX, targetY);
    return;
  }

  tryMoveComponent(component.id, targetX, targetY);
}

function startPan(touch) {
  const point = clientToCanvas(touch.clientX, touch.clientY);
  state.pointer.mode = "pan";
  state.pointer.activeTouchId = touch.identifier;
  state.pointer.initialMidX = point.x;
  state.pointer.initialMidY = point.y;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.emptyTapCandidate = true;
  state.pointer.tapStartScreenX = point.x;
  state.pointer.tapStartScreenY = point.y;
  requestRender(true);
}

function primeComponentTapCandidate(componentId, wasSelected, canvasPoint) {
  state.pointer.tapComponentId = componentId;
  state.pointer.tapStartedSelectedComponent = wasSelected;
  state.pointer.tapStartScreenX = canvasPoint.x;
  state.pointer.tapStartScreenY = canvasPoint.y;
}

function clearComponentTapCandidate() {
  state.pointer.tapComponentId = null;
  state.pointer.tapStartedSelectedComponent = false;
}

function maybeClearComponentTapCandidate(canvasPoint) {
  if (state.pointer.tapComponentId == null) return;

  if (
    distance(
      canvasPoint.x,
      canvasPoint.y,
      state.pointer.tapStartScreenX,
      state.pointer.tapStartScreenY
    ) > EMPTY_TAP_MOVE_TOLERANCE_PX
  ) {
    clearComponentTapCandidate();
  }
}

function shouldToggleSelectedComponentParameter() {
  return (
    state.pointer.tapComponentId != null &&
    state.pointer.tapStartedSelectedComponent === true &&
    state.selectedComponentId === state.pointer.tapComponentId
  );
}

function movePan(touch) {
  const point = clientToCanvas(touch.clientX, touch.clientY);
  if (
    state.pointer.emptyTapCandidate &&
    distance(
      point.x,
      point.y,
      state.pointer.tapStartScreenX,
      state.pointer.tapStartScreenY
    ) > EMPTY_TAP_MOVE_TOLERANCE_PX
  ) {
    state.pointer.emptyTapCandidate = false;
    clearEmptyCanvasTapHistory();
  }

  state.camera.offsetX = state.pointer.initialOffsetX + (point.x - state.pointer.initialMidX);
  state.camera.offsetY = state.pointer.initialOffsetY + (point.y - state.pointer.initialMidY);
  requestRender();
}

function startMousePan(event) {
  const point = clientToCanvas(event.clientX, event.clientY);
  state.pointer.mode = "mouse-pan";
  state.pointer.initialMidX = point.x;
  state.pointer.initialMidY = point.y;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.emptyTapCandidate = false;
  requestRender(true);
}

function moveMousePan(event) {
  const point = clientToCanvas(event.clientX, event.clientY);
  state.camera.offsetX = state.pointer.initialOffsetX + (point.x - state.pointer.initialMidX);
  state.camera.offsetY = state.pointer.initialOffsetY + (point.y - state.pointer.initialMidY);
  requestRender();
}

function startPinch(touches) {
  const t0 = touches[0];
  const t1 = touches[1];
  const p0 = clientToCanvas(t0.clientX, t0.clientY);
  const p1 = clientToCanvas(t1.clientX, t1.clientY);
  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5;
  const dist = distance(p0.x, p0.y, p1.x, p1.y);

  state.pointer.mode = "panzoom";
  state.pointer.initialDistance = Math.max(0.0001, dist);
  state.pointer.initialZoom = state.camera.zoom;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.initialMidX = midX;
  state.pointer.initialMidY = midY;

  const world = screenToWorld(midX, midY, state.pointer.initialZoom, state.pointer.initialOffsetX, state.pointer.initialOffsetY);
  state.pointer.worldAtMidX = world.x;
  state.pointer.worldAtMidY = world.y;
  requestRender(true);
}

function movePinch(touches) {
  const t0 = touches[0];
  const t1 = touches[1];
  const p0 = clientToCanvas(t0.clientX, t0.clientY);
  const p1 = clientToCanvas(t1.clientX, t1.clientY);
  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5;
  const dist = distance(p0.x, p0.y, p1.x, p1.y);

  const scale = dist / state.pointer.initialDistance;
  const newZoom = clamp(state.pointer.initialZoom * scale, MIN_ZOOM, MAX_ZOOM);

  state.camera.zoom = newZoom;
  state.camera.offsetX = midX - state.pointer.worldAtMidX * GRID_SIZE * newZoom;
  state.camera.offsetY = midY - state.pointer.worldAtMidY * GRID_SIZE * newZoom;
  requestRender();
}

function zoomAroundPoint(screenX, screenY, targetZoom) {
  const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
  const world = screenToWorld(screenX, screenY);
  state.camera.zoom = newZoom;
  state.camera.offsetX = screenX - world.x * GRID_SIZE * newZoom;
  state.camera.offsetY = screenY - world.y * GRID_SIZE * newZoom;
  requestRender();
}

function resetZoomToDefaultAtPoint(screenX, screenY) {
  if (Math.abs(state.camera.zoom - 1) <= 1e-9) {
    return false;
  }

  zoomAroundPoint(screenX, screenY, 1);
  return true;
}

function clearEmptyCanvasTapHistory() {
  emptyCanvasTapState.lastTimestamp = 0;
}

function clearNodeMarkerTapHistory() {
  nodeMarkerTapState.lastTimestamp = 0;
  nodeMarkerTapState.lastRoot = null;
}

function handleNodeMarkerTap(marker, screenX, screenY, timestamp = Date.now()) {
  const isDoubleTap =
    marker?.root != null &&
    nodeMarkerTapState.lastRoot === marker.root &&
    timestamp - nodeMarkerTapState.lastTimestamp <= DOUBLE_TAP_MAX_DELAY_MS &&
    distance(
      screenX,
      screenY,
      nodeMarkerTapState.lastScreenX,
      nodeMarkerTapState.lastScreenY
    ) <= DOUBLE_TAP_MAX_DISTANCE_PX;

  nodeMarkerTapState.lastTimestamp = timestamp;
  nodeMarkerTapState.lastScreenX = screenX;
  nodeMarkerTapState.lastScreenY = screenY;
  nodeMarkerTapState.lastRoot = marker?.root ?? null;

  if (isDoubleTap) {
    clearNodeMarkerTapHistory();
    if (!cycleNodeMarkerAnchor(marker.root)) {
      selectNodeMarker(marker.root);
    }
    return true;
  }

  selectNodeMarker(marker.root);
  return false;
}

function registerEmptyCanvasTap(screenX, screenY, timestamp = Date.now()) {
  const isDoubleTap =
    timestamp - emptyCanvasTapState.lastTimestamp <= DOUBLE_TAP_MAX_DELAY_MS &&
    distance(
      screenX,
      screenY,
      emptyCanvasTapState.lastScreenX,
      emptyCanvasTapState.lastScreenY
    ) <= DOUBLE_TAP_MAX_DISTANCE_PX;

  emptyCanvasTapState.lastTimestamp = timestamp;
  emptyCanvasTapState.lastScreenX = screenX;
  emptyCanvasTapState.lastScreenY = screenY;

  if (!isDoubleTap) {
    return false;
  }

  clearEmptyCanvasTapHistory();
  return resetZoomToDefaultAtPoint(screenX, screenY);
}

function isCanvasPointEmpty(worldX, worldY, terminalThreshold) {
  const screenPoint = worldToScreen(worldX, worldY);
  return (
    !pickTerminalLabel(screenPoint.x, screenPoint.y) &&
    !pickTerminal(worldX, worldY, terminalThreshold) &&
    !pickComponentBody(worldX, worldY) &&
    !pickWire(worldX, worldY)
  );
}

function findTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}

export {
  setupCanvasGestures,
  setupWheelGestures,
  setupNativeZoomGuards,
  finishPointerInteraction,
  pickGroupSelectableComponent,
  startGroupPressSelection,
  moveGroupPress,
  finishGroupPressSelection,
  startSingleTouch,
  moveDrag,
  startPan,
  movePan,
  startMousePan,
  moveMousePan,
  startPinch,
  movePinch,
  zoomAroundPoint,
  resetZoomToDefaultAtPoint,
  clearEmptyCanvasTapHistory,
  registerEmptyCanvasTap,
  isCanvasPointEmpty,
  findTouchById,
};
