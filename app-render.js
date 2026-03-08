// Canvas rendering, theme-driven sprite handling, and service worker/render loop setup.

function setupServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  });
}

function setupRenderLoop() {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelScheduledRender();
      return;
    }
    requestRender(true);
  });

  requestRender(true);
}

function isHighFpsInteractionActive() {
  return (
    state.pointer.mode === "drag" ||
    state.pointer.mode === "pan" ||
    state.pointer.mode === "panzoom" ||
    state.pointer.mode === "mouse-drag" ||
    wheelState.dragging
  );
}

function cancelScheduledRender() {
  if (renderState.rafId != null) {
    cancelAnimationFrame(renderState.rafId);
    renderState.rafId = null;
  }

  if (renderState.idleTimerId != null) {
    clearTimeout(renderState.idleTimerId);
    renderState.idleTimerId = null;
  }
}

function requestRender(immediate = false) {
  renderState.dirty = true;
  scheduleRender(immediate);
}

function scheduleRender(immediate = false) {
  if (document.hidden) return;

  const interacting = isHighFpsInteractionActive();
  if (immediate || interacting || renderState.dirty) {
    if (renderState.idleTimerId != null) {
      clearTimeout(renderState.idleTimerId);
      renderState.idleTimerId = null;
    }

    if (renderState.rafId == null) {
      renderState.rafId = requestAnimationFrame(renderLoop);
    }
    return;
  }

  if (renderState.rafId != null || renderState.idleTimerId != null) return;

  renderState.idleTimerId = setTimeout(() => {
    renderState.idleTimerId = null;
    if (document.hidden) return;
    if (renderState.rafId == null) {
      renderState.rafId = requestAnimationFrame(renderLoop);
    }
  }, IDLE_FRAME_MS);
}

function renderLoop() {
  renderState.rafId = null;
  if (document.hidden) return;

  drawScene({}, mainRenderTarget);
  renderState.dirty = false;

  if (isHighFpsInteractionActive()) {
    renderState.rafId = requestAnimationFrame(renderLoop);
    return;
  }

  scheduleRender(false);
}

function drawScene(options = {}, renderTarget = mainRenderTarget) {
  const { context, dpr, width, height } = renderTarget;
  const {
    background = "clear",
    showGrid = true,
    showSelection = true,
    showPendingTerminal = true,
    themePalette: renderThemePalette = themePalette,
    spriteMap: renderSpriteMap = spriteMap,
  } = options;
  renderTarget.themePalette = renderThemePalette;
  renderTarget.spriteMap = renderSpriteMap;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  if (background === "white") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
  }

  if (showGrid) {
    drawGrid(renderTarget);
  }

  drawWires(renderTarget, showSelection);
  drawComponents(renderTarget, showSelection);

  if (showPendingTerminal && state.pendingTerminal) {
    const terminal = getTerminalPosition(state.pendingTerminal.componentId, state.pendingTerminal.terminalIndex);
    if (terminal) {
      const sp = worldToScreen(terminal.x, terminal.y);
      context.beginPath();
      context.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      context.fillStyle = renderThemePalette.canvasPendingFill;
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = renderThemePalette.canvasPendingStroke;
      context.stroke();
    }
  }

  if (state.simulationActive && state.simulationResult?.ok) {
    drawSimulationAnnotations(renderTarget, state.simulationResult.data);
  }
}

function drawGrid(renderTarget) {
  const { context, width, height } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  const minX = Math.floor(topLeft.x) - 1;
  const maxX = Math.ceil(bottomRight.x) + 1;
  const minY = Math.floor(topLeft.y) - 1;
  const maxY = Math.ceil(bottomRight.y) + 1;

  const r = Math.max(0.8, Math.min(1.8, state.camera.zoom * 1.15));
  context.fillStyle = palette.canvasGrid;

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const sp = worldToScreen(x, y);
      context.beginPath();
      context.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      context.fill();
    }
  }
}

function drawWires(renderTarget, showSelection = true) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const wire of state.wires) {
    if (!isWireVisible(wire)) continue;

    context.beginPath();
    wire.path.forEach((point, index) => {
      const sp = worldToScreen(point.x, point.y);
      if (index === 0) {
        context.moveTo(sp.x, sp.y);
      } else {
        context.lineTo(sp.x, sp.y);
      }
    });

    const isSelected = showSelection && state.selectedWireId === wire.id;
    context.lineWidth = Math.max(2.1, state.camera.zoom * 2.4) + (isSelected ? 1.9 : 0);
    context.strokeStyle = isSelected ? palette.canvasWireSelected : palette.canvasWire;
    context.stroke();
  }
}

function drawComponents(renderTarget, showSelection = true) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const sprites = getRenderSpriteMap(renderTarget);
  for (const component of state.components) {
    const def = COMPONENT_DEFS[component.type];
    const behavior = getComponentBehavior(component.type);
    const sprite = sprites[component.type];
    const center = worldToScreen(component.x, component.y);
    const width = worldLengthToScreen(def.renderW);
    const height = worldLengthToScreen(def.renderH);
    const renderOffsetX = worldLengthToScreen(def.renderOffsetX || 0);
    const renderOffsetY = worldLengthToScreen(def.renderOffsetY || 0);

    context.save();
    context.translate(center.x, center.y);
    context.rotate(degToRad(component.rotation));
    behavior.applySpriteTransform(context, component);

    if (sprite?.complete) {
      context.drawImage(
        sprite,
        -width / 2 + renderOffsetX,
        -height / 2 + renderOffsetY,
        width,
        height
      );
    } else if (width > 0 && height > 0) {
      context.fillStyle = palette.canvasSpriteFallback;
      context.fillRect(-width / 2 + renderOffsetX, -height / 2 + renderOffsetY, width, height);
    }

    behavior.drawSpriteOverlay(component, renderTarget);

    const isSelected =
      showSelection &&
      (state.selectedComponentId === component.id || isComponentGroupSelected(component.id));
    if (isSelected) {
      context.strokeStyle = palette.canvasSelection;
      context.lineWidth = 2;
      context.strokeRect(
        -width / 2 + renderOffsetX - 4,
        -height / 2 + renderOffsetY - 4,
        width + 8,
        height + 8
      );
    }

    context.restore();

    const terminalCount = def.terminals.length;
    for (let i = 0; i < terminalCount; i += 1) {
      const tp = getTerminalPosition(component.id, i);
      if (!tp) continue;
      const sp = worldToScreen(tp.x, tp.y);
      const connected = isTerminalConnected(component.id, i);
      const isPending =
        showSelection &&
        state.pendingTerminal &&
        state.pendingTerminal.componentId === component.id &&
        state.pendingTerminal.terminalIndex === i;
      const isNodeMarkerTerminalSelected =
        showSelection &&
        state.selectedNodeMarkerTerminal &&
        state.selectedNodeMarkerTerminal.componentId === component.id &&
        state.selectedNodeMarkerTerminal.terminalIndex === i;
      const radius = getTerminalRenderRadius(component.type);

      context.beginPath();
      context.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
      context.fillStyle =
        component.type === "junction"
          ? palette.canvasTerminalFilled
          : isPending || isNodeMarkerTerminalSelected
            ? palette.canvasPendingStroke
            : connected
              ? palette.canvasTerminalFilled
              : palette.canvasTerminalEmpty;
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle =
        component.type === "junction" || connected
          ? palette.canvasTerminalFilled
          : palette.canvasTerminalStroke;
      context.stroke();
    }

    drawComponentTerminalLabels(renderTarget, component);

    if (def.editable && def.showValueLabel !== false && component.valueLabelHidden !== true) {
      const labelPoint = getValueLabelAnchor(component);
      const screenPoint = worldToScreen(labelPoint.x, labelPoint.y);
      const valueText = formatComponentValue(component);
      context.font = `${Math.max(13, 13 * state.camera.zoom)}px "Avenir Next", sans-serif`;
      context.fillStyle = palette.canvasLabel;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(valueText, screenPoint.x, screenPoint.y);
    }
  }
}

function getTerminalRenderRadius(componentType) {
  const isJunction = componentType === "junction";
  const gridRadius = isJunction ? 0.19 : 0.155;
  const minRadius = isJunction ? 4.2 : 3.4;
  const maxRadius = isJunction ? 10.8 : 8.8;
  return clamp(worldLengthToScreen(gridRadius), minRadius, maxRadius);
}

function drawComponentTerminalLabels(renderTarget, component) {
  const def = COMPONENT_DEFS[component.type];
  const palette = getRenderThemePalette(renderTarget);
  for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
    const label = getTerminalLabel(component.id, terminalIndex);
    if (!label) continue;

    const metrics = getTerminalLabelRenderMetrics(renderTarget, {
      componentId: component.id,
      terminalIndex,
      label,
    });
    if (!metrics) continue;

    const { context } = renderTarget;
    context.fillStyle =
      state.selectedTerminalLabelKey === metrics.labelKey
        ? palette.canvasLabelSelected
        : palette.canvasLabel;
    drawTerminalLabelText(context, metrics);
  }
}

function drawOpAmpInputMarkers(renderTarget, component) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const def = COMPONENT_DEFS.op_amp;
  const { plusIndex, minusIndex } = getOpAmpInputTerminalIndices(component);
  const plusBase = def.terminals[plusIndex];
  const minusBase = def.terminals[minusIndex];
  if (!plusBase || !minusBase) return;

  const markerOffsetX = 1.8;
  const halfSpan = Math.max(4.8, worldLengthToScreen(0.18));
  context.strokeStyle = palette.canvasSpriteStroke;
  context.lineWidth = Math.max(2.2, state.camera.zoom * 2.2);
  context.lineCap = "round";

  drawOpAmpMarkerAt(
    context,
    worldLengthToScreen(plusBase[0] + markerOffsetX),
    worldLengthToScreen(plusBase[1]),
    halfSpan,
    true
  );
  drawOpAmpMarkerAt(
    context,
    worldLengthToScreen(minusBase[0] + markerOffsetX),
    worldLengthToScreen(minusBase[1]),
    halfSpan,
    false
  );
}

function drawOpAmpMarkerAt(context, x, y, halfSpan, isPlus) {
  context.beginPath();
  context.moveTo(x - halfSpan, y);
  context.lineTo(x + halfSpan, y);

  if (isPlus) {
    context.moveTo(x, y - halfSpan);
    context.lineTo(x, y + halfSpan);
  }

  context.stroke();
}

function drawVoltageSourcePolarityMarkers(renderTarget, component) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const rotationRad = degToRad(component.rotation);
  const offset = Math.max(4.5, worldLengthToScreen(0.35));
  const halfSpan = Math.max(3, worldLengthToScreen(0.2));
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const minusCenterX = -offset * cos;
  const minusCenterY = -offset * sin;
  const plusCenterX = offset * cos;
  const plusCenterY = offset * sin;

  context.save();
  context.rotate(-rotationRad);
  context.strokeStyle = palette.canvasSpriteStroke;
  context.lineWidth = Math.max(2, worldLengthToScreen(0.15));
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(minusCenterX - halfSpan, minusCenterY);
  context.lineTo(minusCenterX + halfSpan, minusCenterY);
  context.moveTo(plusCenterX - halfSpan, plusCenterY);
  context.lineTo(plusCenterX + halfSpan, plusCenterY);
  context.moveTo(plusCenterX, plusCenterY - halfSpan);
  context.lineTo(plusCenterX, plusCenterY + halfSpan);
  context.stroke();
  context.restore();
}

function drawSimulationAnnotations(renderTarget, data) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  if (!data) return;

  for (const marker of data.nodeMarkers) {
    if (state.hiddenNodeMarkerRoots.has(marker.root)) continue;
    const metrics = getNodeMarkerRenderMetrics(renderTarget, marker);

    context.fillStyle = palette.canvasAnnotationBg;
    roundedRect(
      context,
      metrics.boxX,
      metrics.boxY,
      metrics.boxW,
      metrics.boxH,
      metrics.cornerRadius
    );
    context.fill();

    if (state.selectedNodeMarkerRoot === marker.root) {
      context.lineWidth = 2;
      context.strokeStyle = palette.canvasSelection;
      roundedRect(
        context,
        metrics.boxX,
        metrics.boxY,
        metrics.boxW,
        metrics.boxH,
        metrics.cornerRadius
      );
      context.stroke();
    }

    context.font = metrics.font;
    context.fillStyle = palette.canvasAnnotationText;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(metrics.label, metrics.textX, metrics.textY);
  }

  for (const component of state.components) {
    const current = data.componentCurrents.get(component.id);
    if (current == null || component.type === "ground" || component.currentArrowHidden === true) continue;
    drawCurrentArrow(renderTarget, component, current);
  }
}

function getCurrentArrowTerminalPair(component) {
  return getComponentBehavior(component.type).getCurrentArrowTerminalPair(component);
}

function getNodeMarkerRenderMetrics(renderTarget, marker) {
  const { context } = renderTarget;
  const sp = worldToScreen(marker.x, marker.y);
  const label = `${formatVoltage(marker.voltage)}`;
  const fontPx = clamp(12 * state.camera.zoom, 10, 28);
  const font = `${fontPx}px "Avenir Next", sans-serif`;
  const padX = clamp(fontPx * 0.58, 7, 14);
  const padY = clamp(fontPx * 0.35, 4, 10);
  const gap = clamp(fontPx * 0.66, 8, 16);
  const cornerRadius = clamp(fontPx * 0.5, 8, 14);

  context.font = font;
  const textW = context.measureText(label).width;
  const boxW = textW + padX * 2;
  const boxH = fontPx + padY * 2;
  const placement = chooseNodeMarkerPlacement(renderTarget, sp, boxW, boxH, marker.labelDirection, gap);

  return {
    label,
    font,
    cornerRadius,
    labelDirection: placement.labelDirection,
    boxW,
    boxH,
    boxX: placement.boxX,
    boxY: placement.boxY,
    textX: placement.textX,
    textY: placement.textY,
  };
}

function getNodeMarkerPlacement(screenPoint, boxW, boxH, labelDirection = "up", gap = 8) {
  if (labelDirection === "down") {
    return {
      boxX: screenPoint.x - boxW * 0.5,
      boxY: screenPoint.y + gap,
      textX: screenPoint.x,
      textY: screenPoint.y + gap + boxH * 0.5,
    };
  }

  if (labelDirection === "left") {
    return {
      boxX: screenPoint.x - gap - boxW,
      boxY: screenPoint.y - boxH * 0.5,
      textX: screenPoint.x - gap - boxW * 0.5,
      textY: screenPoint.y,
    };
  }

  if (labelDirection === "right") {
    return {
      boxX: screenPoint.x + gap,
      boxY: screenPoint.y - boxH * 0.5,
      textX: screenPoint.x + gap + boxW * 0.5,
      textY: screenPoint.y,
    };
  }

  return {
    boxX: screenPoint.x - boxW * 0.5,
    boxY: screenPoint.y - gap - boxH,
    textX: screenPoint.x,
    textY: screenPoint.y - gap - boxH * 0.5,
  };
}

function chooseNodeMarkerPlacement(renderTarget, screenPoint, boxW, boxH, preferredDirection = "up", gap = 8) {
  const directions = getNodeMarkerCandidateDirections(preferredDirection);
  let bestPlacement = null;
  let bestScore = null;

  for (let index = 0; index < directions.length; index += 1) {
    const labelDirection = directions[index];
    const placement = getNodeMarkerPlacement(screenPoint, boxW, boxH, labelDirection, gap);
    const rect = {
      x: placement.boxX,
      y: placement.boxY,
      width: boxW,
      height: boxH,
    };
    const score = getNodeMarkerPlacementScore(renderTarget, rect, index);

    if (!bestScore || isBetterNodeMarkerPlacementScore(score, bestScore)) {
      bestPlacement = {
        ...placement,
        labelDirection,
      };
      bestScore = score;
    }
  }

  return (
    bestPlacement || {
      ...getNodeMarkerPlacement(screenPoint, boxW, boxH, preferredDirection, gap),
      labelDirection: preferredDirection,
    }
  );
}

function getNodeMarkerCandidateDirections(preferredDirection = "up") {
  const ordered = [preferredDirection, "up", "down", "right", "left"];
  return [...new Set(ordered.filter(Boolean))];
}

function getNodeMarkerPlacementScore(renderTarget, rect, directionOrder) {
  const collisionRect = expandRect(rect, Math.max(3, Math.max(2.1, state.camera.zoom * 2.4) * 0.5 + 2));
  const preferredClearance = Math.max(10, state.camera.zoom * 10);
  let wireOverlaps = 0;
  let wireProximityPenalty = 0;

  for (const wire of state.wires) {
    if (!isWireVisible(wire)) continue;

    for (let index = 1; index < wire.path.length; index += 1) {
      const start = worldToScreen(wire.path[index - 1].x, wire.path[index - 1].y);
      const end = worldToScreen(wire.path[index].x, wire.path[index].y);

      if (segmentIntersectsRect(start, end, collisionRect)) {
        wireOverlaps += 1;
        continue;
      }

      const distance = distanceSegmentToRect(start, end, collisionRect);
      if (distance < preferredClearance) {
        wireProximityPenalty += preferredClearance - distance;
      }
    }
  }

  return {
    wireOverlaps,
    overflowPenalty: getRectOverflowPenalty(rect, renderTarget.width, renderTarget.height),
    wireProximityPenalty,
    directionOrder,
  };
}

function isBetterNodeMarkerPlacementScore(candidate, currentBest) {
  if (candidate.wireOverlaps !== currentBest.wireOverlaps) {
    return candidate.wireOverlaps < currentBest.wireOverlaps;
  }

  if (Math.abs(candidate.overflowPenalty - currentBest.overflowPenalty) > 1e-9) {
    return candidate.overflowPenalty < currentBest.overflowPenalty;
  }

  if (Math.abs(candidate.wireProximityPenalty - currentBest.wireProximityPenalty) > 1e-9) {
    return candidate.wireProximityPenalty < currentBest.wireProximityPenalty;
  }

  return candidate.directionOrder < currentBest.directionOrder;
}

function getRectOverflowPenalty(rect, width, height) {
  return (
    Math.max(0, -rect.x) +
    Math.max(0, -rect.y) +
    Math.max(0, rect.x + rect.width - width) +
    Math.max(0, rect.y + rect.height - height)
  );
}

function expandRect(rect, padding) {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function segmentIntersectsRect(start, end, rect) {
  if (pointInRect(start.x, start.y, rect) || pointInRect(end.x, end.y, rect)) {
    return true;
  }

  const topLeft = { x: rect.x, y: rect.y };
  const topRight = { x: rect.x + rect.width, y: rect.y };
  const bottomLeft = { x: rect.x, y: rect.y + rect.height };
  const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };

  return (
    segmentsIntersect(start, end, topLeft, topRight) ||
    segmentsIntersect(start, end, topRight, bottomRight) ||
    segmentsIntersect(start, end, bottomRight, bottomLeft) ||
    segmentsIntersect(start, end, bottomLeft, topLeft)
  );
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);

  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  if (o1 === 0 && pointOnCollinearSegment(a, c, b)) return true;
  if (o2 === 0 && pointOnCollinearSegment(a, d, b)) return true;
  if (o3 === 0 && pointOnCollinearSegment(c, a, d)) return true;
  if (o4 === 0 && pointOnCollinearSegment(c, b, d)) return true;
  return false;
}

function orientation(a, b, c) {
  const value = (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
  if (Math.abs(value) <= 1e-9) return 0;
  return value > 0 ? 1 : 2;
}

function pointOnCollinearSegment(a, b, c) {
  return (
    b.x >= Math.min(a.x, c.x) - 1e-9 &&
    b.x <= Math.max(a.x, c.x) + 1e-9 &&
    b.y >= Math.min(a.y, c.y) - 1e-9 &&
    b.y <= Math.max(a.y, c.y) + 1e-9
  );
}

function distanceSegmentToRect(start, end, rect) {
  if (segmentIntersectsRect(start, end, rect)) {
    return 0;
  }

  const corners = [
    { x: rect.x, y: rect.y },
    { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height },
    { x: rect.x + rect.width, y: rect.y + rect.height },
  ];

  let minDistance = Math.min(
    distancePointToRect(start.x, start.y, rect),
    distancePointToRect(end.x, end.y, rect)
  );

  for (const corner of corners) {
    minDistance = Math.min(
      minDistance,
      distanceToSegment(corner.x, corner.y, start.x, start.y, end.x, end.y)
    );
  }

  return minDistance;
}

function distancePointToRect(x, y, rect) {
  const dx = Math.max(rect.x - x, 0, x - (rect.x + rect.width));
  const dy = Math.max(rect.y - y, 0, y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

function getTerminalLabelRenderMetrics(renderTarget, { componentId, terminalIndex, label }) {
  const terminalPosition = getTerminalPosition(componentId, terminalIndex);
  if (!terminalPosition || !label) return null;

  const { context } = renderTarget;
  const screenPoint = worldToScreen(terminalPosition.x, terminalPosition.y);
  const labelDirection = getTerminalLabelDirection(componentId, terminalIndex);
  const textLayout = getTerminalLabelTextLayout(context, label);
  const padX = 8;
  const boxW = textLayout.totalWidth + padX * 2;
  const boxH = textLayout.boxHeight;
  const placement = getNodeMarkerPlacement(screenPoint, boxW, boxH, labelDirection);

  return {
    label,
    labelKey: terminalKey(componentId, terminalIndex),
    textLayout,
    boxW,
    boxH,
    boxX: placement.boxX,
    boxY: placement.boxY,
    textX: placement.textX,
    textY: placement.textY,
  };
}

function parseTerminalLabelText(label) {
  const text = String(label || "");
  const separatorIndex = text.indexOf("_");
  if (separatorIndex <= 0 || separatorIndex >= text.length - 1) {
    return {
      mainText: text,
      subText: "",
    };
  }

  return {
    mainText: text.slice(0, separatorIndex),
    subText: text.slice(separatorIndex + 1),
  };
}

function getTerminalLabelTextLayout(context, label) {
  const { mainText, subText } = parseTerminalLabelText(label);
  const mainFontPx = Math.max(18, 18 * state.camera.zoom);
  const subFontPx = Math.max(13, mainFontPx * 0.72);
  const mainFont = `${mainFontPx}px "Avenir Next", sans-serif`;
  const subFont = `${subFontPx}px "Avenir Next", sans-serif`;

  context.font = mainFont;
  const mainWidth = context.measureText(mainText).width;
  context.font = subFont;
  const subWidth = subText ? context.measureText(subText).width : 0;

  const totalWidth = mainWidth + subWidth;
  const subscriptDrop = subText ? Math.max(3, mainFontPx * 0.28) : 0;
  const top = -mainFontPx * 0.72;
  const bottom = Math.max(mainFontPx * 0.22, subscriptDrop + subFontPx * 0.22);
  const baselineOffset = -((top + bottom) * 0.5);
  const boxHeight = Math.max(28, bottom - top + 6);

  return {
    mainText,
    subText,
    mainFont,
    subFont,
    mainWidth,
    subWidth,
    totalWidth,
    subscriptDrop,
    baselineOffset,
    boxHeight,
  };
}

function drawTerminalLabelText(context, metrics) {
  const { textX, textY, textLayout } = metrics;
  const startX = textX - textLayout.totalWidth * 0.5;
  const baselineY = textY + textLayout.baselineOffset;

  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  context.font = textLayout.mainFont;
  context.fillText(textLayout.mainText, startX, baselineY);

  if (!textLayout.subText) {
    return;
  }

  context.font = textLayout.subFont;
  context.fillText(
    textLayout.subText,
    startX + textLayout.mainWidth,
    baselineY + textLayout.subscriptDrop
  );
}

function drawCurrentArrow(renderTarget, component, current) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const def = COMPONENT_DEFS[component.type];
  if (def.terminals.length < 2) return;
  const behavior = getComponentBehavior(component.type);

  const [fromIndex, toIndex] = getCurrentArrowTerminalPair(component);
  const p0 = getTerminalPosition(component.id, fromIndex);
  const p1 = getTerminalPosition(component.id, toIndex);
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
  const arrowLayout = behavior.getCurrentArrowLayout(component, {
    dirX,
    dirY,
    midX,
    midY,
    normalX,
    normalY,
    zoom: state.camera.zoom,
  });
  const sideSign = arrowLayout.sideSign ?? 1;
  const lateralOffset = arrowLayout.lateralOffset ?? 1.0;

  const sideNormalX = normalX * sideSign;
  const sideNormalY = normalY * sideSign;

  const start = {
    x: midX - dirX * shaftHalf + sideNormalX * lateralOffset,
    y: midY - dirY * shaftHalf + sideNormalY * lateralOffset,
  };
  const end = {
    x: midX + dirX * shaftHalf + sideNormalX * lateralOffset,
    y: midY + dirY * shaftHalf + sideNormalY * lateralOffset,
  };

  const s = worldToScreen(start.x, start.y);
  const e = worldToScreen(end.x, end.y);

  context.strokeStyle = palette.canvasCurrent;
  context.fillStyle = palette.canvasCurrent;
  context.lineWidth = Math.max(2.8, state.camera.zoom * 3.2);

  context.beginPath();
  context.moveTo(s.x, s.y);
  context.lineTo(e.x, e.y);
  context.stroke();

  const arrowLen = Math.max(12, state.camera.zoom * 14);
  const arrowSpread = 0.46;
  const angle = Math.atan2(e.y - s.y, e.x - s.x);
  const tipAdvance = Math.max(2.2, context.lineWidth * 0.9);
  const tipX = e.x + Math.cos(angle) * tipAdvance;
  const tipY = e.y + Math.sin(angle) * tipAdvance;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(
    tipX - arrowLen * Math.cos(angle - arrowSpread),
    tipY - arrowLen * Math.sin(angle - arrowSpread)
  );
  context.lineTo(
    tipX - arrowLen * Math.cos(angle + arrowSpread),
    tipY - arrowLen * Math.sin(angle + arrowSpread)
  );
  context.closePath();
  context.fill();

  const text = formatCurrent(signed);
  context.font = `${Math.max(14, 14 * state.camera.zoom)}px "Avenir Next", sans-serif`;
  const textOffset = Math.max(12, state.camera.zoom * 13) + (arrowLayout.textOffsetExtra || 0);

  const arrowMidX = (s.x + e.x) * 0.5;
  const arrowMidY = (s.y + e.y) * 0.5;
  const textGap = Math.max(7, state.camera.zoom * 8);
  const leftSideTextGap = Math.max(4, state.camera.zoom * 5);
  let textX = arrowMidX + sideNormalX * textOffset;
  let textY = arrowMidY + sideNormalY * textOffset;
  let textAlign = "center";
  let textBaseline = "middle";

  if (Math.abs(sideNormalX) >= Math.abs(sideNormalY) && sideNormalX > 0.15) {
    textAlign = "left";
    textX += textGap;
  } else if (Math.abs(sideNormalX) >= Math.abs(sideNormalY) && sideNormalX < -0.15) {
    textAlign = "right";
    textX -= leftSideTextGap;
  } else if (sideNormalY > 0.15) {
    textBaseline = "top";
    textY += textGap * 0.7;
  } else if (sideNormalY < -0.15) {
    textBaseline = "bottom";
    textY -= textGap * 0.7;
  }

  context.fillStyle = palette.canvasCurrentText;
  context.textAlign = textAlign;
  context.textBaseline = textBaseline;
  context.fillText(text, textX, textY);
}
