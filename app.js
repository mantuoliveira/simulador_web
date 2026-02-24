const GRID_SIZE = 28;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.2;

const COMPONENT_DEFS = {
  voltage_source: {
    label: "Fonte V",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.3,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 10,
    editable: true,
    unit: "V",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  current_source: {
    label: "Fonte I",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.3,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 0.02,
    editable: true,
    unit: "A",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  resistor: {
    label: "Resistor",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.35,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 1000,
    editable: true,
    unit: "Ω",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  ground: {
    label: "Terra",
    terminals: [[0, -1]],
    bodyHalfW: 1.1,
    bodyHalfH: 1.1,
    bodyOffsetY: 0.35,
    renderW: 2,
    renderH: 2,
    defaultValue: 0,
    editable: false,
    obstacleCells: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 1.6, y: 1.6 },
  },
};

const COMPONENT_ORDER = ["voltage_source", "current_source", "resistor", "ground"];

const state = {
  components: [],
  wires: [],
  nextComponentId: 1,
  nextWireId: 1,
  selectedComponentId: null,
  pendingTerminal: null,
  simulationActive: false,
  simulationResult: null,
  camera: {
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  },
  pointer: {
    mode: "none",
    activeTouchId: null,
    dragComponentId: null,
    dragOffsetX: 0,
    dragOffsetY: 0,
    initialDistance: 0,
    initialZoom: 1,
    initialOffsetX: 0,
    initialOffsetY: 0,
    initialMidX: 0,
    initialMidY: 0,
    worldAtMidX: 0,
    worldAtMidY: 0,
  },
};

const appEls = {
  strip: document.getElementById("component-strip"),
  canvas: document.getElementById("circuit-canvas"),
  simulateBtn: document.getElementById("simulate-btn"),
  rotateBtn: document.getElementById("rotate-btn"),
  deleteBtn: document.getElementById("delete-btn"),
  status: document.getElementById("status-pill"),
  valueWheel: document.getElementById("value-wheel"),
  wheelPointer: document.querySelector(".wheel-pointer"),
  wheelValue: document.getElementById("wheel-value"),
  wheelTitle: document.getElementById("wheel-title"),
};

const ctx = appEls.canvas.getContext("2d");
let dpr = Math.max(1, window.devicePixelRatio || 1);
let lastCanvasW = 0;
let lastCanvasH = 0;
let statusTimer = null;

const wheelState = {
  dragging: false,
  pointerId: null,
};

const spriteMap = loadSprites();

buildComponentStrip();
setupCanvas();
setupButtons();
setupCanvasGestures();
setupWheelGestures();
setupNativeZoomGuards();
setupServiceWorker();

requestAnimationFrame(renderLoop);

function loadSprites() {
  const sprites = {};
  for (const type of COMPONENT_ORDER) {
    const svg = buildSvgForType(type);
    const image = new Image();
    image.src = svgToDataUri(svg);
    sprites[type] = image;
  }
  return sprites;
}

function buildComponentStrip() {
  for (const type of COMPONENT_ORDER) {
    const def = COMPONENT_DEFS[type];
    const button = document.createElement("button");
    button.className = "comp-btn";
    button.type = "button";
    button.dataset.type = type;

    const img = document.createElement("img");
    img.alt = def.label;
    img.src = svgToDataUri(buildSvgForType(type));

    const span = document.createElement("span");
    span.textContent = def.label;

    button.append(img, span);
    button.addEventListener("click", () => addComponent(type));
    appEls.strip.appendChild(button);
  }
}

function setupCanvas() {
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);
}

function resizeCanvas() {
  const rect = appEls.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  dpr = Math.max(1, window.devicePixelRatio || 1);

  appEls.canvas.width = Math.floor(width * dpr);
  appEls.canvas.height = Math.floor(height * dpr);

  if (lastCanvasW === 0 && lastCanvasH === 0) {
    state.camera.offsetX = width * 0.5;
    state.camera.offsetY = height * 0.5;
  } else {
    state.camera.offsetX += (width - lastCanvasW) * 0.5;
    state.camera.offsetY += (height - lastCanvasH) * 0.5;
  }

  lastCanvasW = width;
  lastCanvasH = height;
}

function setupButtons() {
  appEls.simulateBtn.addEventListener("click", () => {
    if (!state.simulationActive) {
      const result = runSimulation();
      if (!result.ok) {
        showStatus(result.message || "Falha na simulação", true);
        return;
      }
      state.simulationActive = true;
      appEls.simulateBtn.textContent = "Pausar";
      appEls.simulateBtn.classList.add("running");
      showStatus("Simulação DC ativa");
      return;
    }

    state.simulationActive = false;
    state.simulationResult = null;
    appEls.simulateBtn.textContent = "Simular";
    appEls.simulateBtn.classList.remove("running");
    showStatus("Simulação pausada");
  });

  appEls.rotateBtn.addEventListener("click", () => {
    if (state.selectedComponentId == null) return;
    const component = getComponentById(state.selectedComponentId);
    if (!component) return;
    const before = { x: component.x, y: component.y, rotation: component.rotation };
    component.rotation = (component.rotation + 90) % 360;

    if (!isComponentPlacementValid(component, component.id)) {
      component.rotation = before.rotation;
      showStatus("Rotação bloqueada por colisão", true);
      return;
    }

    if (!rerouteConnectedWires(component.id)) {
      component.rotation = before.rotation;
      rerouteConnectedWires(component.id);
      showStatus("Sem rota livre para os fios", true);
      return;
    }

    onCircuitChanged();
  });

  appEls.deleteBtn.addEventListener("click", () => {
    if (state.selectedComponentId == null) return;
    removeComponent(state.selectedComponentId);
  });
}

function setupCanvasGestures() {
  appEls.canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();

      if (event.touches.length >= 2) {
        startPinch(event.touches);
        return;
      }

      if (event.touches.length === 1) {
        startSingleTouch(event.touches[0]);
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
          state.pointer.mode = "none";
          state.pointer.activeTouchId = null;
          state.pointer.dragComponentId = null;
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
    },
    { passive: false }
  );

  appEls.canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const point = clientToWorld(event.clientX, event.clientY);
    const terminalHit = pickTerminal(point.x, point.y, 0.48);
    if (terminalHit) {
      handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
      return;
    }

    const compHit = pickComponentBody(point.x, point.y);
    if (compHit) {
      selectComponent(compHit.id);
      state.pointer.mode = "mouse-drag";
      state.pointer.dragComponentId = compHit.id;
      state.pointer.dragOffsetX = point.x - compHit.x;
      state.pointer.dragOffsetY = point.y - compHit.y;
    } else {
      clearSelection();
    }
  });

  window.addEventListener("mousemove", (event) => {
    if (state.pointer.mode !== "mouse-drag") return;
    const component = getComponentById(state.pointer.dragComponentId);
    if (!component) return;

    const point = clientToWorld(event.clientX, event.clientY);
    const targetX = Math.round(point.x - state.pointer.dragOffsetX);
    const targetY = Math.round(point.y - state.pointer.dragOffsetY);
    if (targetX === component.x && targetY === component.y) return;
    tryMoveComponent(component.id, targetX, targetY);
  });

  window.addEventListener("mouseup", () => {
    if (state.pointer.mode === "mouse-drag") {
      state.pointer.mode = "none";
      state.pointer.dragComponentId = null;
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
    try {
      appEls.valueWheel.releasePointerCapture(event.pointerId);
    } catch (_) {}
  });

  appEls.valueWheel.addEventListener("pointercancel", () => {
    wheelState.dragging = false;
    wheelState.pointerId = null;
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

function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

function renderLoop() {
  drawScene();
  requestAnimationFrame(renderLoop);
}

function drawScene() {
  const width = appEls.canvas.clientWidth;
  const height = appEls.canvas.clientHeight;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  drawGrid(width, height);
  drawWires();
  drawComponents();

  if (state.pendingTerminal) {
    const terminal = getTerminalPosition(state.pendingTerminal.componentId, state.pendingTerminal.terminalIndex);
    if (terminal) {
      const sp = worldToScreen(terminal.x, terminal.y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();
    }
  }

  if (state.simulationActive && state.simulationResult?.ok) {
    drawSimulationAnnotations(state.simulationResult.data);
  }
}

function drawGrid(width, height) {
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  const minX = Math.floor(topLeft.x) - 1;
  const maxX = Math.ceil(bottomRight.x) + 1;
  const minY = Math.floor(topLeft.y) - 1;
  const maxY = Math.ceil(bottomRight.y) + 1;

  const r = Math.max(0.8, Math.min(1.8, state.camera.zoom * 1.15));
  ctx.fillStyle = "rgba(15, 23, 42, 0.2)";

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const sp = worldToScreen(x, y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWires() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const wire of state.wires) {
    if (!wire.path || wire.path.length < 2) continue;

    ctx.beginPath();
    wire.path.forEach((point, index) => {
      const sp = worldToScreen(point.x, point.y);
      if (index === 0) {
        ctx.moveTo(sp.x, sp.y);
      } else {
        ctx.lineTo(sp.x, sp.y);
      }
    });

    ctx.lineWidth = Math.max(2.1, state.camera.zoom * 2.4);
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();
  }
}

function drawComponents() {
  for (const component of state.components) {
    const def = COMPONENT_DEFS[component.type];
    const sprite = spriteMap[component.type];
    const center = worldToScreen(component.x, component.y);
    const width = worldLengthToScreen(def.renderW);
    const height = worldLengthToScreen(def.renderH);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(degToRad(component.rotation));

    if (sprite?.complete) {
      ctx.drawImage(sprite, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = "#dbe4ef";
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    if (state.selectedComponentId === component.id) {
      ctx.strokeStyle = "#0ea5a8";
      ctx.lineWidth = 2;
      ctx.strokeRect(-width / 2 - 4, -height / 2 - 4, width + 8, height + 8);
    }

    ctx.restore();

    const terminalCount = def.terminals.length;
    for (let i = 0; i < terminalCount; i += 1) {
      const tp = getTerminalPosition(component.id, i);
      if (!tp) continue;
      const sp = worldToScreen(tp.x, tp.y);
      const connected = isTerminalConnected(component.id, i);
      const isPending =
        state.pendingTerminal &&
        state.pendingTerminal.componentId === component.id &&
        state.pendingTerminal.terminalIndex === i;

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 4.3, 0, Math.PI * 2);
      ctx.fillStyle = isPending ? "#f59e0b" : connected ? "#0f172a" : "#f8fafc";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = connected ? "#0f172a" : "#334155";
      ctx.stroke();
    }

    if (def.editable) {
      const labelPoint = getValueLabelAnchor(component);
      const screenPoint = worldToScreen(labelPoint.x, labelPoint.y);
      const valueText = formatComponentValue(component);
      ctx.font = `${Math.max(11, 11 * state.camera.zoom)}px "Avenir Next", sans-serif`;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(valueText, screenPoint.x + 6, screenPoint.y);
    }
  }
}

function drawSimulationAnnotations(data) {
  if (!data) return;

  for (const marker of data.nodeMarkers) {
    const sp = worldToScreen(marker.x, marker.y);
    const label = `${formatVoltage(marker.voltage)}`;

    ctx.font = '12px "Avenir Next", sans-serif';
    const textW = ctx.measureText(label).width;
    const padX = 7;
    const boxW = textW + padX * 2;
    const boxH = 20;

    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
    roundedRect(ctx, sp.x - boxW / 2, sp.y - 28, boxW, boxH, 8);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, sp.x, sp.y - 18);
  }

  for (const component of state.components) {
    const current = data.componentCurrents.get(component.id);
    if (current == null || component.type === "ground") continue;
    drawCurrentArrow(component, current);
  }
}

function drawCurrentArrow(component, current) {
  const def = COMPONENT_DEFS[component.type];
  if (def.terminals.length < 2) return;

  const p0 = getTerminalPosition(component.id, 0);
  const p1 = getTerminalPosition(component.id, 1);
  if (!p0 || !p1) return;

  let dirX = p1.x - p0.x;
  let dirY = p1.y - p0.y;
  const magnitude = Math.hypot(dirX, dirY) || 1;
  dirX /= magnitude;
  dirY /= magnitude;

  let signed = current;
  if (signed < 0) {
    dirX *= -1;
    dirY *= -1;
    signed = Math.abs(signed);
  }

  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5;
  const normalX = -dirY;
  const normalY = dirX;
  const shaftHalf = 1.05;
  const lateralOffset = 1.0;

  const start = {
    x: midX - dirX * shaftHalf + normalX * lateralOffset,
    y: midY - dirY * shaftHalf + normalY * lateralOffset,
  };
  const end = {
    x: midX + dirX * shaftHalf + normalX * lateralOffset,
    y: midY + dirY * shaftHalf + normalY * lateralOffset,
  };

  const s = worldToScreen(start.x, start.y);
  const e = worldToScreen(end.x, end.y);

  ctx.strokeStyle = "#dc2626";
  ctx.fillStyle = "#dc2626";
  ctx.lineWidth = Math.max(2.8, state.camera.zoom * 3.2);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();

  const arrowLen = Math.max(12, state.camera.zoom * 14);
  const arrowSpread = 0.46;
  const angle = Math.atan2(e.y - s.y, e.x - s.x);
  ctx.beginPath();
  ctx.moveTo(e.x, e.y);
  ctx.lineTo(
    e.x - arrowLen * Math.cos(angle - arrowSpread),
    e.y - arrowLen * Math.sin(angle - arrowSpread)
  );
  ctx.lineTo(
    e.x - arrowLen * Math.cos(angle + arrowSpread),
    e.y - arrowLen * Math.sin(angle + arrowSpread)
  );
  ctx.closePath();
  ctx.fill();

  const text = formatCurrent(signed);
  ctx.font = '12px "Avenir Next", sans-serif';
  ctx.fillStyle = "#7f1d1d";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(text, (s.x + e.x) / 2, (s.y + e.y) / 2 - 7);
}

function startSingleTouch(touch) {
  const point = clientToWorld(touch.clientX, touch.clientY);

  const terminalHit = pickTerminal(point.x, point.y, 0.5);
  if (terminalHit) {
    handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
    state.pointer.mode = "none";
    return;
  }

  const componentHit = pickComponentBody(point.x, point.y);
  if (!componentHit) {
    clearSelection();
    state.pointer.mode = "none";
    return;
  }

  selectComponent(componentHit.id);
  state.pointer.mode = "drag";
  state.pointer.activeTouchId = touch.identifier;
  state.pointer.dragComponentId = componentHit.id;
  state.pointer.dragOffsetX = point.x - componentHit.x;
  state.pointer.dragOffsetY = point.y - componentHit.y;
}

function moveDrag(touch) {
  const component = getComponentById(state.pointer.dragComponentId);
  if (!component) return;

  const point = clientToWorld(touch.clientX, touch.clientY);
  const targetX = Math.round(point.x - state.pointer.dragOffsetX);
  const targetY = Math.round(point.y - state.pointer.dragOffsetY);

  if (targetX === component.x && targetY === component.y) return;

  tryMoveComponent(component.id, targetX, targetY);
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
}

function zoomAroundPoint(screenX, screenY, targetZoom) {
  const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
  const world = screenToWorld(screenX, screenY);
  state.camera.zoom = newZoom;
  state.camera.offsetX = screenX - world.x * GRID_SIZE * newZoom;
  state.camera.offsetY = screenY - world.y * GRID_SIZE * newZoom;
}

function findTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}

function handleTerminalTap(componentId, terminalIndex) {
  if (!state.pendingTerminal) {
    state.pendingTerminal = { componentId, terminalIndex };
    return;
  }

  const first = state.pendingTerminal;
  if (first.componentId === componentId && first.terminalIndex === terminalIndex) {
    state.pendingTerminal = null;
    return;
  }

  if (first.componentId === componentId) {
    showStatus("Conexão no mesmo componente não permitida", true);
    state.pendingTerminal = null;
    return;
  }

  if (
    hasDirectWireBetween(
      first.componentId,
      first.terminalIndex,
      componentId,
      terminalIndex
    )
  ) {
    showStatus("Conexão já existe", true);
    state.pendingTerminal = null;
    return;
  }

  const start = getTerminalPosition(first.componentId, first.terminalIndex);
  const end = getTerminalPosition(componentId, terminalIndex);
  if (!start || !end) {
    state.pendingTerminal = null;
    return;
  }

  const route = routeWire(start, end);
  if (!route) {
    showStatus("Não foi possível rotear o fio", true);
    state.pendingTerminal = null;
    return;
  }

  state.wires.push({
    id: state.nextWireId++,
    from: { componentId: first.componentId, terminalIndex: first.terminalIndex },
    to: { componentId, terminalIndex },
    path: route,
  });

  state.pendingTerminal = null;
  onCircuitChanged();
}

function hasDirectWireBetween(aComponentId, aTerminalIndex, bComponentId, bTerminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === aComponentId &&
        wire.from.terminalIndex === aTerminalIndex &&
        wire.to.componentId === bComponentId &&
        wire.to.terminalIndex === bTerminalIndex) ||
      (wire.from.componentId === bComponentId &&
        wire.from.terminalIndex === bTerminalIndex &&
        wire.to.componentId === aComponentId &&
        wire.to.terminalIndex === aTerminalIndex)
  );
}

function addComponent(type) {
  const def = COMPONENT_DEFS[type];
  if (!def) return;

  const spot = findEmptySpot(type);
  if (!spot) {
    showStatus("Sem espaço livre no canvas", true);
    return;
  }

  const component = {
    id: state.nextComponentId++,
    type,
    x: spot.x,
    y: spot.y,
    rotation: 0,
    value: def.defaultValue,
  };

  state.components.push(component);
  selectComponent(component.id);
  state.pendingTerminal = null;
  onCircuitChanged();
}

function findEmptySpot(type) {
  const def = COMPONENT_DEFS[type];
  if (!def) return null;

  const center = screenToWorld(appEls.canvas.clientWidth * 0.5, appEls.canvas.clientHeight * 0.5);
  const visible = getVisibleWorldBounds();
  const margin = 1;

  const minX = Math.ceil(visible.minX + def.footprintHalf.x + margin);
  const maxX = Math.floor(visible.maxX - def.footprintHalf.x - margin);
  const minY = Math.ceil(visible.minY + def.footprintHalf.y + margin);
  const maxY = Math.floor(visible.maxY - def.footprintHalf.y - margin);

  if (minX > maxX || minY > maxY) return null;

  const baseX = clamp(Math.round(center.x), minX, maxX);
  const baseY = clamp(Math.round(center.y), minY, maxY);

  const candidate = { id: -1, type, x: baseX, y: baseY, rotation: 0 };
  if (isComponentPlacementValid(candidate, null, 2)) {
    return { x: baseX, y: baseY };
  }

  const maxRing = Math.max(maxX - minX, maxY - minY);
  for (let ring = 1; ring <= maxRing; ring += 1) {
    for (let x = baseX - ring; x <= baseX + ring; x += 1) {
      if (x < minX || x > maxX) continue;

      const topY = baseY - ring;
      if (topY >= minY && topY <= maxY) {
        candidate.x = x;
        candidate.y = topY;
        if (isComponentPlacementValid(candidate, null, 2)) return { x, y: topY };
      }

      const bottomY = baseY + ring;
      if (bottomY >= minY && bottomY <= maxY) {
        candidate.x = x;
        candidate.y = bottomY;
        if (isComponentPlacementValid(candidate, null, 2)) return { x, y: bottomY };
      }
    }

    for (let y = baseY - ring + 1; y <= baseY + ring - 1; y += 1) {
      if (y < minY || y > maxY) continue;

      const leftX = baseX - ring;
      if (leftX >= minX && leftX <= maxX) {
        candidate.x = leftX;
        candidate.y = y;
        if (isComponentPlacementValid(candidate, null, 2)) return { x: leftX, y };
      }

      const rightX = baseX + ring;
      if (rightX >= minX && rightX <= maxX) {
        candidate.x = rightX;
        candidate.y = y;
        if (isComponentPlacementValid(candidate, null, 2)) return { x: rightX, y };
      }
    }
  }

  return null;
}

function tryMoveComponent(componentId, targetX, targetY) {
  const component = getComponentById(componentId);
  if (!component) return false;

  const prevX = component.x;
  const prevY = component.y;

  component.x = targetX;
  component.y = targetY;

  if (!isComponentPlacementValid(component, component.id, 0)) {
    component.x = prevX;
    component.y = prevY;
    return false;
  }

  const linkedWires = getWiresForComponent(component.id);
  const previousPaths = new Map();
  for (const wire of linkedWires) {
    previousPaths.set(wire.id, wire.path);
  }

  if (!rerouteConnectedWires(component.id)) {
    component.x = prevX;
    component.y = prevY;
    for (const wire of linkedWires) {
      const old = previousPaths.get(wire.id);
      if (old) wire.path = old;
    }
    return false;
  }

  onCircuitChanged();
  return true;
}

function isComponentPlacementValid(candidate, ignoreId = null, padding = 0) {
  for (const component of state.components) {
    if (ignoreId != null && component.id === ignoreId) continue;
    if (componentsOverlap(candidate, component, padding)) {
      return false;
    }
  }
  return true;
}

function componentsOverlap(a, b, padding = 0) {
  const fa = getFootprintHalf(a);
  const fb = getFootprintHalf(b);
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);

  return dx < fa.x + fb.x + padding && dy < fa.y + fb.y + padding;
}

function getFootprintHalf(component) {
  const def = COMPONENT_DEFS[component.type];
  if (!def) return { x: 1, y: 1 };
  const rotation = normalizeRotation(component.rotation);
  if (rotation === 90 || rotation === 270) {
    return { x: def.footprintHalf.y, y: def.footprintHalf.x };
  }
  return def.footprintHalf;
}

function rerouteConnectedWires(componentId) {
  const wires = getWiresForComponent(componentId);
  for (const wire of wires) {
    const start = getTerminalPosition(wire.from.componentId, wire.from.terminalIndex);
    const end = getTerminalPosition(wire.to.componentId, wire.to.terminalIndex);
    if (!start || !end) return false;

    const route = routeWire(start, end);
    if (!route) return false;
    wire.path = route;
  }
  return true;
}

function getWiresForComponent(componentId) {
  return state.wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
}

function routeWire(start, end) {
  const blocked = new Set();

  for (const component of state.components) {
    const cells = getObstacleCells(component);
    for (const cell of cells) {
      blocked.add(key(cell.x, cell.y));
    }
  }

  blocked.delete(key(start.x, start.y));
  blocked.delete(key(end.x, end.y));

  const bounds = routeBounds(start, end);
  return findPathAStar(start, end, blocked, bounds);
}

function routeBounds(start, end) {
  let minX = Math.min(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxX = Math.max(start.x, end.x);
  let maxY = Math.max(start.y, end.y);

  for (const component of state.components) {
    const fp = getFootprintHalf(component);
    minX = Math.min(minX, Math.floor(component.x - fp.x - 2));
    maxX = Math.max(maxX, Math.ceil(component.x + fp.x + 2));
    minY = Math.min(minY, Math.floor(component.y - fp.y - 2));
    maxY = Math.max(maxY, Math.ceil(component.y + fp.y + 2));
  }

  const pad = 10;
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minY: minY - pad,
    maxY: maxY + pad,
  };
}

function findPathAStar(start, end, blocked, bounds) {
  const startKey = key(start.x, start.y);
  const endKey = key(end.x, end.y);

  const open = new Set([startKey]);
  const cameFrom = new Map();
  const gScore = new Map([[startKey, 0]]);
  const fScore = new Map([[startKey, manhattan(start, end)]]);

  while (open.size > 0) {
    let currentKey = null;
    let best = Infinity;

    for (const candidate of open) {
      const val = fScore.get(candidate) ?? Infinity;
      if (val < best) {
        best = val;
        currentKey = candidate;
      }
    }

    if (!currentKey) break;

    if (currentKey === endKey) {
      return rebuildPath(cameFrom, currentKey);
    }

    open.delete(currentKey);
    const current = parseKey(currentKey);

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      if (
        next.x < bounds.minX ||
        next.x > bounds.maxX ||
        next.y < bounds.minY ||
        next.y > bounds.maxY
      ) {
        continue;
      }

      const nk = key(next.x, next.y);
      if (blocked.has(nk) && nk !== endKey) continue;

      const tentative = (gScore.get(currentKey) ?? Infinity) + 1;
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        cameFrom.set(nk, currentKey);
        gScore.set(nk, tentative);
        fScore.set(nk, tentative + manhattan(next, end));
        open.add(nk);
      }
    }
  }

  return null;
}

function rebuildPath(cameFrom, currentKey) {
  const path = [parseKey(currentKey)];
  let ck = currentKey;

  while (cameFrom.has(ck)) {
    ck = cameFrom.get(ck);
    path.push(parseKey(ck));
  }

  path.reverse();
  return simplifyOrthogonalPath(path);
}

function simplifyOrthogonalPath(path) {
  if (path.length <= 2) return path;
  const simplified = [path[0]];

  for (let i = 1; i < path.length - 1; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    if (dx1 === dx2 && dy1 === dy2) {
      continue;
    }

    simplified.push(curr);
  }

  simplified.push(path[path.length - 1]);
  return simplified;
}

function getObstacleCells(component) {
  const def = COMPONENT_DEFS[component.type];
  const cells = [];
  for (const base of def.obstacleCells) {
    const rotated = rotateOffset(base[0], base[1], component.rotation);
    cells.push({ x: component.x + rotated.x, y: component.y + rotated.y });
  }
  return cells;
}

function pickTerminal(worldX, worldY, threshold) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    const def = COMPONENT_DEFS[component.type];

    for (let t = 0; t < def.terminals.length; t += 1) {
      const tp = getTerminalPosition(component.id, t);
      if (!tp) continue;
      const dist = Math.hypot(tp.x - worldX, tp.y - worldY);
      if (dist <= threshold) {
        return { componentId: component.id, terminalIndex: t };
      }
    }
  }
  return null;
}

function pickComponentBody(worldX, worldY) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    if (pointInsideComponentBody(component, worldX, worldY)) {
      return component;
    }
  }
  return null;
}

function pointInsideComponentBody(component, worldX, worldY) {
  const def = COMPONENT_DEFS[component.type];
  const local = worldToLocal(component, worldX, worldY);
  const offsetY = def.bodyOffsetY || 0;

  return (
    local.x >= -def.bodyHalfW &&
    local.x <= def.bodyHalfW &&
    local.y >= -def.bodyHalfH + offsetY &&
    local.y <= def.bodyHalfH + offsetY
  );
}

function worldToLocal(component, worldX, worldY) {
  const dx = worldX - component.x;
  const dy = worldY - component.y;
  const rad = degToRad(-component.rotation);
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function selectComponent(componentId) {
  state.selectedComponentId = componentId;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function clearSelection() {
  state.selectedComponentId = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function removeComponent(componentId) {
  const index = state.components.findIndex((component) => component.id === componentId);
  if (index < 0) return;

  state.components.splice(index, 1);
  state.wires = state.wires.filter(
    (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId
  );

  if (state.pendingTerminal?.componentId === componentId) {
    state.pendingTerminal = null;
  }

  if (state.selectedComponentId === componentId) {
    state.selectedComponentId = null;
  }

  updateSelectionUi();
  onCircuitChanged();
  showStatus("Componente removido");
}

function updateSelectionUi() {
  const component = getComponentById(state.selectedComponentId);
  if (!component) {
    appEls.rotateBtn.classList.add("hidden");
    appEls.deleteBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.rotateBtn.classList.remove("hidden");
  appEls.deleteBtn.classList.remove("hidden");

  const def = COMPONENT_DEFS[component.type];
  if (!def.editable) {
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.valueWheel.classList.remove("hidden");
  appEls.wheelTitle.textContent = def.label;
  syncWheelWithSelectedComponent();
}

function syncWheelWithSelectedComponent() {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;
  const normalized = normalizedFromValue(component);
  const angleDeg = normalized * 360 - 90;
  appEls.wheelPointer.style.transform = `translate(0, -50%) rotate(${angleDeg}deg)`;
  appEls.wheelValue.textContent = formatComponentValue(component);
}

function updateValueFromWheelPointer(clientX, clientY) {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;

  const rect = appEls.valueWheel.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const angle = Math.atan2(clientY - cy, clientX - cx);
  let normalized = (angle + Math.PI / 2) / (Math.PI * 2);
  normalized = ((normalized % 1) + 1) % 1;

  const value = valueFromNormalized(component.type, normalized);
  component.value = value;
  syncWheelWithSelectedComponent();
  onCircuitChanged();
}

function valueFromNormalized(type, normalized) {
  const n = clamp(normalized, 0, 1);

  if (type === "resistor") {
    const minExp = 0;
    const maxExp = 6;
    const exp = minExp + (maxExp - minExp) * n;
    const raw = Math.pow(10, exp);
    return quantizeResistor(raw);
  }

  if (type === "voltage_source") {
    return roundTo((-24 + 48 * n), 2);
  }

  if (type === "current_source") {
    return roundTo((-1 + 2 * n), 4);
  }

  return 0;
}

function normalizedFromValue(component) {
  const value = component.value;

  if (component.type === "resistor") {
    const safe = clamp(value, 1, 1_000_000);
    const exp = Math.log10(safe);
    return clamp(exp / 6, 0, 1);
  }

  if (component.type === "voltage_source") {
    return clamp((value + 24) / 48, 0, 1);
  }

  if (component.type === "current_source") {
    return clamp((value + 1) / 2, 0, 1);
  }

  return 0;
}

function quantizeResistor(value) {
  const decades = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);

  let best = decades[0];
  let bestErr = Infinity;
  for (const d of decades) {
    const err = Math.abs(d - mantissa);
    if (err < bestErr) {
      bestErr = err;
      best = d;
    }
  }

  const quantized = best * Math.pow(10, exponent);
  return clamp(quantized, 1, 1_000_000);
}

function getTerminalPosition(componentId, terminalIndex) {
  const component = getComponentById(componentId);
  if (!component) return null;
  const def = COMPONENT_DEFS[component.type];
  const base = def.terminals[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  return {
    x: component.x + offset.x,
    y: component.y + offset.y,
  };
}

function isTerminalConnected(componentId, terminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === componentId && wire.from.terminalIndex === terminalIndex) ||
      (wire.to.componentId === componentId && wire.to.terminalIndex === terminalIndex)
  );
}

function getComponentById(id) {
  if (id == null) return null;
  return state.components.find((component) => component.id === id) || null;
}

function getValueLabelAnchor(component) {
  const rotation = normalizeRotation(component.rotation);

  if (rotation === 0) return { x: component.x, y: component.y - 1.45 };
  if (rotation === 90) return { x: component.x + 1.45, y: component.y };
  if (rotation === 180) return { x: component.x, y: component.y + 1.45 };
  return { x: component.x - 1.45, y: component.y };
}

function runSimulation() {
  if (state.components.length === 0) {
    state.simulationResult = null;
    return { ok: false, message: "Adicione componentes antes de simular" };
  }

  const terminals = [];
  const terminalPosition = new Map();

  for (const component of state.components) {
    const def = COMPONENT_DEFS[component.type];
    for (let i = 0; i < def.terminals.length; i += 1) {
      const tKey = terminalKey(component.id, i);
      terminals.push(tKey);
      terminalPosition.set(tKey, getTerminalPosition(component.id, i));
    }
  }

  const dsu = new DisjointSet(terminals);

  for (const wire of state.wires) {
    dsu.union(terminalKey(wire.from.componentId, wire.from.terminalIndex), terminalKey(wire.to.componentId, wire.to.terminalIndex));
  }

  const groundTerminals = state.components
    .filter((component) => component.type === "ground")
    .map((component) => terminalKey(component.id, 0));

  if (groundTerminals.length === 0) {
    state.simulationResult = null;
    return { ok: false, message: "Inclua pelo menos um terra" };
  }

  for (let i = 1; i < groundTerminals.length; i += 1) {
    dsu.union(groundTerminals[0], groundTerminals[i]);
  }

  const groundRoot = dsu.find(groundTerminals[0]);

  const rootByTerminal = new Map();
  for (const t of terminals) {
    rootByTerminal.set(t, dsu.find(t));
  }

  const edges = new Map();
  function addEdge(a, b) {
    if (!edges.has(a)) edges.set(a, new Set());
    if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a).add(b);
    edges.get(b).add(a);
  }

  for (const component of state.components) {
    if (component.type === "ground") continue;
    const t0 = terminalKey(component.id, 0);
    const t1 = terminalKey(component.id, 1);
    const n0 = rootByTerminal.get(t0);
    const n1 = rootByTerminal.get(t1);
    if (!n0 || !n1) continue;
    addEdge(n0, n1);
  }

  const reachableNodes = new Set([groundRoot]);
  const queue = [groundRoot];

  while (queue.length > 0) {
    const node = queue.shift();
    const neighbors = edges.get(node);
    if (!neighbors) continue;

    for (const nb of neighbors) {
      if (!reachableNodes.has(nb)) {
        reachableNodes.add(nb);
        queue.push(nb);
      }
    }
  }

  const activeComponents = state.components.filter((component) => {
    if (component.type === "ground") return false;
    const n0 = rootByTerminal.get(terminalKey(component.id, 0));
    const n1 = rootByTerminal.get(terminalKey(component.id, 1));
    if (!n0 || !n1) return false;
    return reachableNodes.has(n0) || reachableNodes.has(n1);
  });

  if (activeComponents.length === 0) {
    state.simulationResult = null;
    return { ok: false, message: "Nenhum circuito fechado ligado ao terra" };
  }

  const activeRoots = new Set();
  for (const component of activeComponents) {
    activeRoots.add(rootByTerminal.get(terminalKey(component.id, 0)));
    activeRoots.add(rootByTerminal.get(terminalKey(component.id, 1)));
  }

  const nonGroundRoots = [...activeRoots].filter((root) => root !== groundRoot);
  const nodeIndex = new Map(nonGroundRoots.map((root, idx) => [root, idx]));

  const voltageSources = activeComponents.filter((component) => component.type === "voltage_source");

  const N = nonGroundRoots.length;
  const M = voltageSources.length;
  const size = N + M;

  if (size === 0) {
    state.simulationResult = null;
    return { ok: false, message: "Circuito inválido para MNA" };
  }

  const A = Array.from({ length: size }, () => Array(size).fill(0));
  const z = Array(size).fill(0);

  const getNodeIdx = (root) => {
    if (root === groundRoot) return -1;
    return nodeIndex.get(root) ?? -1;
  };

  for (const component of activeComponents) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);

    if (component.type === "resistor") {
      const R = Math.max(1e-9, component.value || 1);
      const g = 1 / R;

      if (n0 >= 0) A[n0][n0] += g;
      if (n1 >= 0) A[n1][n1] += g;
      if (n0 >= 0 && n1 >= 0) {
        A[n0][n1] -= g;
        A[n1][n0] -= g;
      }
    }

    if (component.type === "current_source") {
      const I = component.value || 0;
      if (n0 >= 0) z[n0] -= I;
      if (n1 >= 0) z[n1] += I;
    }
  }

  voltageSources.forEach((component, k) => {
    const row = N + k;
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);

    if (n0 >= 0) {
      A[n0][row] -= 1;
      A[row][n0] -= 1;
    }

    if (n1 >= 0) {
      A[n1][row] += 1;
      A[row][n1] += 1;
    }

    z[row] = component.value || 0;
  });

  const solution = solveLinearSystem(A, z);
  if (!solution) {
    state.simulationResult = null;
    return {
      ok: false,
      message: "Sistema singular. Verifique se o circuito está referenciado ao terra.",
    };
  }

  const nodeVoltageByRoot = new Map();
  nodeVoltageByRoot.set(groundRoot, 0);
  for (const root of nonGroundRoots) {
    nodeVoltageByRoot.set(root, solution[nodeIndex.get(root)]);
  }

  const componentCurrents = new Map();

  for (const component of activeComponents) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const v0 = nodeVoltageByRoot.get(r0) ?? 0;
    const v1 = nodeVoltageByRoot.get(r1) ?? 0;

    if (component.type === "resistor") {
      componentCurrents.set(component.id, (v0 - v1) / component.value);
    } else if (component.type === "current_source") {
      componentCurrents.set(component.id, component.value || 0);
    }
  }

  voltageSources.forEach((component, k) => {
    // Align displayed arrow direction with terminal order (esquerda -> direita).
    componentCurrents.set(component.id, -solution[N + k]);
  });

  const markerGroups = new Map();
  for (const [terminal, root] of rootByTerminal.entries()) {
    if (!nodeVoltageByRoot.has(root)) continue;
    if (!markerGroups.has(root)) {
      markerGroups.set(root, []);
    }

    const pos = terminalPosition.get(terminal);
    if (pos) {
      markerGroups.get(root).push(pos);
    }
  }

  const nodeMarkers = [];
  for (const [root, points] of markerGroups.entries()) {
    if (!points.length) continue;
    const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
    nodeMarkers.push({
      x: sum.x / points.length,
      y: sum.y / points.length,
      voltage: nodeVoltageByRoot.get(root) || 0,
    });
  }

  const data = {
    nodeVoltages: nodeVoltageByRoot,
    componentCurrents,
    nodeMarkers,
  };

  state.simulationResult = { ok: true, data };
  return { ok: true, data };
}

function solveLinearSystem(matrix, vector) {
  const n = matrix.length;
  const A = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let best = Math.abs(A[col][col]);

    for (let row = col + 1; row < n; row += 1) {
      const val = Math.abs(A[row][col]);
      if (val > best) {
        best = val;
        pivotRow = row;
      }
    }

    if (best < 1e-11) {
      return null;
    }

    if (pivotRow !== col) {
      const tmp = A[col];
      A[col] = A[pivotRow];
      A[pivotRow] = tmp;
    }

    const pivot = A[col][col];
    for (let j = col; j <= n; j += 1) {
      A[col][j] /= pivot;
    }

    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row][col];
      if (Math.abs(factor) < 1e-14) continue;

      for (let j = col; j <= n; j += 1) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = A[row][n];
    for (let col = row + 1; col < n; col += 1) {
      sum -= A[row][col] * x[col];
    }
    x[row] = sum;
  }

  return x;
}

function onCircuitChanged() {
  if (state.simulationActive) {
    const result = runSimulation();
    if (!result.ok) {
      state.simulationActive = false;
      state.simulationResult = null;
      appEls.simulateBtn.textContent = "Simular";
      appEls.simulateBtn.classList.remove("running");
      showStatus(result.message || "Erro na simulação", true);
    }
  }

  syncWheelWithSelectedComponent();
}

function showStatus(text, isError = false) {
  appEls.status.textContent = text;
  appEls.status.style.background = isError ? "rgba(185, 28, 28, 0.92)" : "rgba(15, 23, 42, 0.88)";
  appEls.status.classList.add("show");

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    appEls.status.classList.remove("show");
  }, 1700);
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * GRID_SIZE * state.camera.zoom + state.camera.offsetX,
    y: worldY * GRID_SIZE * state.camera.zoom + state.camera.offsetY,
  };
}

function getVisibleWorldBounds() {
  const w = appEls.canvas.clientWidth;
  const h = appEls.canvas.clientHeight;
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(w, h);

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

function clientToCanvas(clientX, clientY) {
  const rect = appEls.canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function clientToWorld(
  clientX,
  clientY,
  zoom = state.camera.zoom,
  offsetX = state.camera.offsetX,
  offsetY = state.camera.offsetY
) {
  const point = clientToCanvas(clientX, clientY);
  return screenToWorld(point.x, point.y, zoom, offsetX, offsetY);
}

function screenToWorld(screenX, screenY, zoom = state.camera.zoom, offsetX = state.camera.offsetX, offsetY = state.camera.offsetY) {
  return {
    x: (screenX - offsetX) / (GRID_SIZE * zoom),
    y: (screenY - offsetY) / (GRID_SIZE * zoom),
  };
}

function worldLengthToScreen(lengthInGrid) {
  return lengthInGrid * GRID_SIZE * state.camera.zoom;
}

function rotateOffset(x, y, rotationDeg) {
  const rad = degToRad(rotationDeg);
  const rx = x * Math.cos(rad) - y * Math.sin(rad);
  const ry = x * Math.sin(rad) + y * Math.cos(rad);
  return {
    x: Math.round(rx),
    y: Math.round(ry),
  };
}

function terminalKey(componentId, terminalIndex) {
  return `${componentId}:${terminalIndex}`;
}

function key(x, y) {
  return `${x},${y}`;
}

function parseKey(k) {
  const [x, y] = k.split(",").map(Number);
  return { x, y };
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, decimals) {
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
}

function normalizeRotation(rotation) {
  return ((rotation % 360) + 360) % 360;
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function formatComponentValue(component) {
  if (component.type === "resistor") {
    return formatResistance(component.value);
  }
  if (component.type === "voltage_source") {
    return formatVoltage(component.value);
  }
  if (component.type === "current_source") {
    return formatCurrent(component.value);
  }
  return "";
}

function formatResistance(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${roundTo(value / 1_000_000, 2)} MΩ`;
  if (abs >= 1_000) return `${roundTo(value / 1_000, 2)} kΩ`;
  return `${roundTo(value, 2)} Ω`;
}

function formatVoltage(value) {
  return `${roundTo(value, 3)} V`;
}

function formatCurrent(value) {
  const abs = Math.abs(value);
  if (abs >= 1) return `${roundTo(value, 3)} A`;
  if (abs >= 1e-3) return `${roundTo(value * 1e3, 3)} mA`;
  return `${roundTo(value * 1e6, 2)} µA`;
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.arcTo(x + width, y, x + width, y + r, r);
  context.lineTo(x + width, y + height - r);
  context.arcTo(x + width, y + height, x + width - r, y + height, r);
  context.lineTo(x + r, y + height);
  context.arcTo(x, y + height, x, y + height - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildSvgForType(type) {
  if (type === "resistor") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
      <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="0" y1="40" x2="34" y2="40"/>
        <polyline points="34,40 44,18 56,62 68,18 80,62 92,18 104,62 116,18 126,40"/>
        <line x1="126" y1="40" x2="160" y2="40"/>
      </g>
    </svg>`;
  }

  if (type === "voltage_source") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
      <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="0" y1="40" x2="42" y2="40"/>
        <line x1="118" y1="40" x2="160" y2="40"/>
        <circle cx="80" cy="40" r="38"/>
        <line x1="56" y1="40" x2="76" y2="40"/>
        <line x1="94" y1="30" x2="94" y2="50"/>
        <line x1="84" y1="40" x2="104" y2="40"/>
      </g>
    </svg>`;
  }

  if (type === "current_source") {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
      <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="0" y1="40" x2="42" y2="40"/>
        <line x1="118" y1="40" x2="160" y2="40"/>
        <circle cx="80" cy="40" r="38"/>
      </g>
      <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <line x1="58" y1="40" x2="102" y2="40"/>
        <polyline points="92,30 102,40 92,50"/>
      </g>
    </svg>`;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="40" y1="0" x2="40" y2="24"/>
      <line x1="16" y1="26" x2="64" y2="26"/>
      <line x1="24" y1="40" x2="56" y2="40"/>
      <line x1="30" y1="54" x2="50" y2="54"/>
    </g>
  </svg>`;
}

class DisjointSet {
  constructor(items) {
    this.parent = new Map();
    this.rank = new Map();
    for (const item of items) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
    }
  }

  find(item) {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
      return item;
    }

    const parent = this.parent.get(item);
    if (parent !== item) {
      const root = this.find(parent);
      this.parent.set(item, root);
      return root;
    }

    return parent;
  }

  union(a, b) {
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    if (rankA < rankB) {
      [rootA, rootB] = [rootB, rootA];
    }

    this.parent.set(rootB, rootA);
    if (rankA === rankB) {
      this.rank.set(rootA, rankA + 1);
    }
  }
}
