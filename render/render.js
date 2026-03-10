import {
  BJT_BASE_TERMINAL_INDEX,
  COMPONENT_DEFS,
  DARK_THEME,
  LIGHT_THEME,
  RESISTOR_THERMAL_BUCKET_COUNT,
  RESISTOR_THERMAL_RATED_POWER_W,
} from "../core/constants.js";
import {
  formatComponentValue,
  getComponentBehavior,
  getCurrentArrowTerminalPair,
  getValueLabelAnchor,
} from "../core/behaviors.js";
import {
  getCardinalValueLabelAnchor,
  getComponentRenderBounds,
  getOpAmpInputTerminalIndices,
  terminalKey,
} from "../core/model.js";
import {
  clamp,
  degToRad,
  formatCurrent,
  formatPower,
  formatVoltage,
  mixColors,
  roundedRect,
} from "../core/support.js";
import {
  mainRenderTarget,
  renderState,
  spriteMap,
  state,
  themePalette,
  themeState,
  wheelState,
  getRenderSpriteMap,
  getRenderThemePalette,
} from "../runtime/state.js";
import {
  getTerminalLabel,
  getTerminalLabelDirection,
  getTerminalPosition,
  isComponentGroupSelected,
  isTerminalConnected,
  isWireVisible,
} from "../editor/selectors.js";
import {
  screenToWorld,
  worldLengthToScreen,
  worldToScreen,
} from "../runtime/viewport.js";

// Canvas rendering, theme-driven sprite handling, and service worker/render loop setup.

const thermalTintedSpriteCache = new WeakMap();

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
}

function requestRender(immediate = false) {
  renderState.dirty = true;
  scheduleRender(immediate);
}

function scheduleRender(immediate = false) {
  if (document.hidden) return;

  const interacting = isHighFpsInteractionActive();
  if (immediate || interacting || renderState.dirty) {
    if (renderState.rafId == null) {
      renderState.rafId = requestAnimationFrame(renderLoop);
    }
  }
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
    const thermalTint = getComponentThermalTint(component, palette);
    const renderSprite = getComponentRenderSprite(sprite, thermalTint);
    const spriteX = -width / 2 + renderOffsetX;
    const spriteY = -height / 2 + renderOffsetY;

    if (renderSprite) {
      context.drawImage(renderSprite, spriteX, spriteY, width, height);
    } else if (width > 0 && height > 0) {
      context.fillStyle = thermalTint || palette.canvasSpriteFallback;
      context.fillRect(spriteX, spriteY, width, height);
    }

    if (behavior.spriteOverlay === "op_amp_inputs") {
      drawOpAmpInputMarkers(renderTarget, component);
    } else if (behavior.spriteOverlay === "voltage_source_polarity") {
      drawVoltageSourcePolarityMarkers(renderTarget, component);
    }

    const isSelected =
      showSelection &&
      (state.selectedComponentId === component.id || isComponentGroupSelected(component.id));
    context.restore();

    if (isSelected) {
      drawComponentSelectionOutline(renderTarget, component);
    }

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
      const labelPoint = getComponentCanvasValueLabelAnchor(component);
      const screenPoint = worldToScreen(labelPoint.x, labelPoint.y);
      const valueText = getComponentCanvasValueText(component);
      context.font = `${Math.max(16, 16 * state.camera.zoom)}px "Avenir Next", sans-serif`;
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

function drawComponentSelectionOutline(renderTarget, component) {
  const { context } = renderTarget;
  const palette = getRenderThemePalette(renderTarget);
  const rect = getComponentScreenRect(component);
  if (!rect) return;

  context.strokeStyle = palette.canvasSelection;
  context.lineWidth = 2;
  context.strokeRect(rect.x - 4, rect.y - 4, rect.width + 8, rect.height + 8);
}

function getComponentRenderSprite(sprite, thermalTint) {
  if (!sprite?.complete) {
    return null;
  }

  if (!thermalTint) {
    return sprite;
  }

  let tintedVariants = thermalTintedSpriteCache.get(sprite);
  if (!tintedVariants) {
    tintedVariants = new Map();
    thermalTintedSpriteCache.set(sprite, tintedVariants);
  }

  if (tintedVariants.has(thermalTint)) {
    return tintedVariants.get(thermalTint);
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, sprite.naturalWidth || sprite.width || 1);
  canvas.height = Math.max(1, sprite.naturalHeight || sprite.height || 1);
  const offscreenContext = canvas.getContext("2d", { alpha: true });
  if (!offscreenContext) {
    return sprite;
  }

  offscreenContext.drawImage(sprite, 0, 0, canvas.width, canvas.height);
  offscreenContext.globalCompositeOperation = "source-in";
  offscreenContext.fillStyle = thermalTint;
  offscreenContext.fillRect(0, 0, canvas.width, canvas.height);
  tintedVariants.set(thermalTint, canvas);
  return canvas;
}

function getComponentThermalTint(component, palette) {
  if (component.type !== "resistor" || !state.thermalModeActive || !state.simulationResult?.ok) {
    return null;
  }

  const power = state.simulationResult.data.componentPowers?.get(component.id);
  if (!(power > 0)) {
    return null;
  }

  const ratio = quantizeThermalRatio(power / RESISTOR_THERMAL_RATED_POWER_W);
  if (ratio <= 0) {
    return null;
  }

  if (ratio <= 0.5) {
    return mixColors(palette.canvasSpriteStroke, palette.canvasThermalResistorWarm, ratio / 0.5);
  }

  return mixColors(
    palette.canvasThermalResistorWarm,
    palette.canvasThermalResistorHot,
    (ratio - 0.5) / 0.5
  );
}

function quantizeThermalRatio(ratio) {
  const clampedRatio = clamp(ratio, 0, 1);
  return (
    Math.round(clampedRatio * RESISTOR_THERMAL_BUCKET_COUNT) / RESISTOR_THERMAL_BUCKET_COUNT
  );
}

function getComponentCanvasValueText(component) {
  if (component.type === "resistor" && state.thermalModeActive && state.simulationResult?.ok) {
    const power = state.simulationResult.data.componentPowers?.get(component.id);
    if (power != null) {
      return formatPower(power);
    }
  }

  return formatComponentValue(component);
}

function getComponentCanvasValueLabelAnchor(component) {
  if (component.type === "resistor" && state.thermalModeActive && state.simulationResult?.ok) {
    return getCardinalValueLabelAnchor(component, 2.35);
  }

  return getValueLabelAnchor(component);
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

    context.lineWidth = 1.4;
    context.strokeStyle = getNodeMarkerBorderColor();
    roundedRect(
      context,
      metrics.boxX,
      metrics.boxY,
      metrics.boxW,
      metrics.boxH,
      metrics.cornerRadius
    );
    context.stroke();

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

function getNodeMarkerRenderMetrics(renderTarget, marker) {
  const { context } = renderTarget;
  const sp = worldToScreen(marker.x, marker.y);
  const label = `${formatVoltage(marker.voltage)}`;
  const fontPx = clamp(12 * state.camera.zoom, 10, 28);
  const font = `${fontPx}px "Avenir Next", sans-serif`;
  const padX = clamp(fontPx * 0.58, 7, 14);
  const padY = clamp(fontPx * 0.35, 4, 10);
  const cornerRadius = clamp(fontPx * 0.5, 8, 14);

  context.font = font;
  const textW = context.measureText(label).width;
  const boxW = textW + padX * 2;
  const boxH = fontPx + padY * 2;
  const placement = getNodeMarkerPlacement(sp, boxW, boxH);

  return {
    label,
    font,
    cornerRadius,
    boxW,
    boxH,
    boxX: placement.boxX,
    boxY: placement.boxY,
    textX: placement.textX,
    textY: placement.textY,
  };
}

function getNodeMarkerBorderColor() {
  if (themeState.mode === LIGHT_THEME) {
    return "rgba(226, 232, 240, 0.78)";
  }

  if (themeState.mode === DARK_THEME) {
    return "rgba(51, 65, 85, 0.78)";
  }

  return "rgba(148, 163, 184, 0.72)";
}

function getNodeMarkerPlacement(screenPoint, boxW, boxH) {
  return {
    boxX: screenPoint.x - boxW * 0.5,
    boxY: screenPoint.y - boxH * 0.5,
    textX: screenPoint.x,
    textY: screenPoint.y,
  };
}

function getDirectionalLabelPlacement(screenPoint, boxW, boxH, labelDirection = "up", gap = 8) {
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

function getComponentScreenRect(component) {
  const bounds = getComponentRenderBounds(component);
  if (!bounds) return null;

  const topLeft = worldToScreen(bounds.left, bounds.top);
  const bottomRight = worldToScreen(bounds.right, bounds.bottom);
  return {
    x: Math.min(topLeft.x, bottomRight.x),
    y: Math.min(topLeft.y, bottomRight.y),
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  };
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
  const placement = getDirectionalLabelPlacement(screenPoint, boxW, boxH, labelDirection);

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
    baseTerminalPoint: getTerminalPosition(component.id, BJT_BASE_TERMINAL_INDEX),
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

export {
  setupServiceWorker,
  setupRenderLoop,
  isHighFpsInteractionActive,
  cancelScheduledRender,
  requestRender,
  scheduleRender,
  renderLoop,
  drawScene,
  drawGrid,
  drawWires,
  drawComponents,
  getTerminalRenderRadius,
  drawComponentTerminalLabels,
  drawOpAmpInputMarkers,
  drawOpAmpMarkerAt,
  drawVoltageSourcePolarityMarkers,
  drawSimulationAnnotations,
  getCurrentArrowTerminalPair,
  getNodeMarkerRenderMetrics,
  getNodeMarkerBorderColor,
  getNodeMarkerPlacement,
  getDirectionalLabelPlacement,
  getComponentScreenRect,
  getTerminalLabelRenderMetrics,
  parseTerminalLabelText,
  getTerminalLabelTextLayout,
  drawTerminalLabelText,
  drawCurrentArrow,
};
