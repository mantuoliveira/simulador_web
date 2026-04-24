import { COMPONENT_DEFS, GRID_SIZE, THEME_PALETTE_DEFAULTS } from "../core/constants.js";
import {
  appEls,
  createRenderTarget,
  resizeRenderTarget,
  state,
} from "../runtime/state.js";
import { createSpriteMap } from "../runtime/ui.js";
import {
  drawScene,
  getComponentCanvasNameLabelAnchor,
  getComponentCanvasValueLabelAnchor,
  getComponentCanvasValueText,
  getTerminalLabelTextLayout,
} from "../render/render.js";
import { showStatus } from "../editor/ui.js";
import { getComponentRenderBounds } from "../core/model.js";
import { getComponentLabel, getTerminalLabel, getTerminalPosition } from "../editor/selectors.js";

const EXPORT_FILENAME_PREFIX = "circuito";
const EXPORT_TRIM_PADDING_PX = 12;
const EXPORT_SCALE = 3;
const EXPORT_ZOOM = 1.0;
const EXPORT_WORLD_PADDING = 2;
const EXPORT_TEXT_WORLD_PADDING = 0.25;
let exportLightSpriteMapPromise = null;

function getExportThemePalette() {
  return { ...THEME_PALETTE_DEFAULTS };
}

async function handleExportAction({ background = "white" } = {}) {
  if (state.components.length === 0) {
    showStatus("Adicione um componente para exportar", true);
    return;
  }

  try {
    const blob = await exportCircuitBlob({ background });
    const fileName = buildExportFileName();
    const successMessage =
      background === "transparent" ? "PNG transparente pronto para compartilhar" : "PNG pronto para compartilhar";
    const downloadMessage = background === "transparent" ? "PNG transparente exportado" : "PNG exportado";
    if (await tryShareExport(blob, fileName)) {
      showStatus(successMessage);
      return;
    }

    downloadBlob(blob, fileName);
    showStatus(downloadMessage);
  } catch (error) {
    if (error?.name === "AbortError") {
      return;
    }
    showStatus("Falha ao exportar PNG", true);
  }
}

function computeCircuitWorldBounds() {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const textContext = createTextMeasurementContext();
  const pxPerWorld = GRID_SIZE * EXPORT_ZOOM;

  const includeWorldRect = (left, top, right, bottom) => {
    if (left < minX) minX = left;
    if (top < minY) minY = top;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  };

  for (const component of state.components) {
    const b = getComponentRenderBounds(component);
    includeWorldRect(b.left, b.top, b.right, b.bottom);
    includeComponentTextBounds(component, textContext, pxPerWorld, includeWorldRect);
  }

  for (const wire of state.wires) {
    for (const pt of wire.path) {
      includeWorldRect(pt.x, pt.y, pt.x, pt.y);
    }
  }

  if (!isFinite(minX)) return null;
  return { minX, minY, maxX, maxY };
}

function createTextMeasurementContext() {
  const canvas = createAlphaCanvas();
  return canvas.getContext("2d", { alpha: true });
}

function includeComponentTextBounds(component, context, pxPerWorld, includeWorldRect) {
  if (!context || pxPerWorld <= 0) return;

  includeComponentValueTextBounds(component, context, pxPerWorld, includeWorldRect);
  includeComponentNameTextBounds(component, context, pxPerWorld, includeWorldRect);
  includeTerminalLabelTextBounds(component, context, pxPerWorld, includeWorldRect);
}

function includeComponentValueTextBounds(component, context, pxPerWorld, includeWorldRect) {
  const def = COMPONENT_DEFS[component.type];
  if (!def?.editable || def.showValueLabel === false || component.valueLabelHidden === true) {
    return;
  }

  const anchor = getComponentCanvasValueLabelAnchor(component);
  const text = getComponentCanvasValueText(component);
  if (!anchor || !text) return;

  const fontPx = Math.max(16, 16 * EXPORT_ZOOM);
  context.font = `${fontPx}px "Avenir Next", sans-serif`;
  const metrics = context.measureText(text);
  const textHeight = getMeasuredTextHeight(metrics, fontPx);
  includeCenteredTextWorldRect(anchor, metrics.width, textHeight, pxPerWorld, includeWorldRect);
}

function includeComponentNameTextBounds(component, context, pxPerWorld, includeWorldRect) {
  const label = getComponentLabel(component.id);
  if (!label) return;

  const anchor = getComponentCanvasNameLabelAnchor(component);
  if (!anchor) return;

  const textLayout = getTerminalLabelTextLayout(context, label);
  includeCenteredTextWorldRect(
    anchor,
    textLayout.totalWidth,
    textLayout.boxHeight,
    pxPerWorld,
    includeWorldRect
  );
}

function includeTerminalLabelTextBounds(component, context, pxPerWorld, includeWorldRect) {
  const def = COMPONENT_DEFS[component.type];
  if (!def?.terminals) return;

  for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
    const label = getTerminalLabel(component.id, terminalIndex);
    if (!label) continue;

    const terminalPosition = getTerminalPosition(component.id, terminalIndex);
    if (!terminalPosition) continue;

    const textLayout = getTerminalLabelTextLayout(context, label);
    const gapPx = 8;
    const boxW = textLayout.totalWidth + 16;
    const boxH = textLayout.boxHeight;
    includeWorldRect(
      terminalPosition.x - (boxW + gapPx) / pxPerWorld - EXPORT_TEXT_WORLD_PADDING,
      terminalPosition.y - (boxH + gapPx) / pxPerWorld - EXPORT_TEXT_WORLD_PADDING,
      terminalPosition.x + (boxW + gapPx) / pxPerWorld + EXPORT_TEXT_WORLD_PADDING,
      terminalPosition.y + (boxH + gapPx) / pxPerWorld + EXPORT_TEXT_WORLD_PADDING
    );
  }
}

function includeCenteredTextWorldRect(anchor, widthPx, heightPx, pxPerWorld, includeWorldRect) {
  const halfW = widthPx / pxPerWorld / 2 + EXPORT_TEXT_WORLD_PADDING;
  const halfH = heightPx / pxPerWorld / 2 + EXPORT_TEXT_WORLD_PADDING;
  includeWorldRect(anchor.x - halfW, anchor.y - halfH, anchor.x + halfW, anchor.y + halfH);
}

function getMeasuredTextHeight(metrics, fallbackFontPx) {
  const actualHeight = metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent;
  return Number.isFinite(actualHeight) && actualHeight > 0 ? actualHeight : fallbackFontPx;
}

async function exportCircuitBlob({ background = "white" } = {}) {
  const bounds = computeCircuitWorldBounds();
  const exportDpr = Math.max(1, EXPORT_SCALE);
  const exportThemePalette = getExportThemePalette();
  const exportSpriteMap = await getExportLightSpriteMap();

  let width, height, exportOffsetX, exportOffsetY;
  if (bounds) {
    const p = EXPORT_WORLD_PADDING;
    width = Math.max(1, Math.ceil((bounds.maxX - bounds.minX + 2 * p) * GRID_SIZE * EXPORT_ZOOM));
    height = Math.max(1, Math.ceil((bounds.maxY - bounds.minY + 2 * p) * GRID_SIZE * EXPORT_ZOOM));
    exportOffsetX = (p - bounds.minX) * GRID_SIZE * EXPORT_ZOOM;
    exportOffsetY = (p - bounds.minY) * GRID_SIZE * EXPORT_ZOOM;
  } else {
    width = Math.max(1, Math.floor(appEls.canvas.clientWidth));
    height = Math.max(1, Math.floor(appEls.canvas.clientHeight));
    exportOffsetX = state.camera.offsetX;
    exportOffsetY = state.camera.offsetY;
  }

  const savedCamera = { zoom: state.camera.zoom, offsetX: state.camera.offsetX, offsetY: state.camera.offsetY };
  state.camera.zoom = EXPORT_ZOOM;
  state.camera.offsetX = exportOffsetX;
  state.camera.offsetY = exportOffsetY;

  let exportCanvas;
  try {
    exportCanvas = createAlphaCanvas();
    const exportRenderTarget = createRenderTarget(exportCanvas, { width, height, dpr: exportDpr });
    resizeRenderTarget(exportRenderTarget, width, height, exportDpr);

    drawScene(
      {
        background: "transparent",
        showGrid: false,
        showSelection: false,
        showPendingTerminal: false,
        themePalette: exportThemePalette,
        spriteMap: exportSpriteMap,
      },
      exportRenderTarget
    );
  } finally {
    state.camera.zoom = savedCamera.zoom;
    state.camera.offsetX = savedCamera.offsetX;
    state.camera.offsetY = savedCamera.offsetY;
  }

  const trimmedCanvas = trimCanvas(exportCanvas, Math.ceil(exportDpr * EXPORT_TRIM_PADDING_PX));
  const finalCanvas =
    background === "white" ? applyCanvasBackground(trimmedCanvas, "#ffffff") : trimmedCanvas;
  return canvasToBlob(finalCanvas, "image/png");
}

function getExportLightSpriteMap() {
  if (!exportLightSpriteMapPromise) {
    exportLightSpriteMapPromise = buildExportLightSpriteMap().catch((error) => {
      exportLightSpriteMapPromise = null;
      throw error;
    });
  }

  return exportLightSpriteMapPromise;
}

async function buildExportLightSpriteMap() {
  const sprites = createSpriteMap({ palette: getExportThemePalette() }, { notifyOnLoad: false });
  await Promise.all(Object.values(sprites).map(waitForImageLoad));
  return sprites;
}

function waitForImageLoad(image) {
  if (!image) {
    return Promise.resolve();
  }

  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const handleLoad = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(new Error("sprite load failed"));
    };
    const cleanup = () => {
      image.removeEventListener("load", handleLoad);
      image.removeEventListener("error", handleError);
    };

    image.addEventListener("load", handleLoad);
    image.addEventListener("error", handleError);
  });
}

function createAlphaCanvas(width = 1, height = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  return canvas;
}

function canvasToBlob(canvas, type) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
        return;
      }

      reject(new Error("blob export failed"));
    }, type);
  });
}

async function tryShareExport(blob, fileName) {
  const isMobile = window.matchMedia?.("(pointer: coarse)").matches;
  if (!isMobile || !navigator.share || typeof File === "undefined") {
    return false;
  }

  try {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare && !navigator.canShare({ files: [file] })) {
      return false;
    }

    await navigator.share({
      files: [file],
      title: "Circuito",
    });
    return true;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }
    return false;
  }
}

function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

function buildExportFileName() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  return `${EXPORT_FILENAME_PREFIX}-${year}${month}${day}-${hours}${minutes}${seconds}.png`;
}

function applyCanvasBackground(sourceCanvas, fillStyle) {
  const outputCanvas = createAlphaCanvas(sourceCanvas.width, sourceCanvas.height);

  const outputCtx = outputCanvas.getContext("2d", { alpha: true });
  if (!outputCtx) {
    return sourceCanvas;
  }

  outputCtx.fillStyle = fillStyle;
  outputCtx.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  outputCtx.drawImage(sourceCanvas, 0, 0);
  return outputCanvas;
}

function trimCanvas(sourceCanvas, paddingPx = 0) {
  const sourceCtx = sourceCanvas.getContext("2d", { alpha: true });
  if (!sourceCtx) {
    return sourceCanvas;
  }

  const { width, height } = sourceCanvas;
  const imageData = sourceCtx.getImageData(0, 0, width, height);
  const { data } = imageData;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha === 0) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return sourceCanvas;
  }

  const left = Math.max(0, minX - paddingPx);
  const top = Math.max(0, minY - paddingPx);
  const right = Math.min(width - 1, maxX + paddingPx);
  const bottom = Math.min(height - 1, maxY + paddingPx);
  const trimmedCanvas = createAlphaCanvas(right - left + 1, bottom - top + 1);

  const trimmedCtx = trimmedCanvas.getContext("2d", { alpha: true });
  if (!trimmedCtx) {
    return sourceCanvas;
  }

  trimmedCtx.drawImage(
    sourceCanvas,
    left,
    top,
    trimmedCanvas.width,
    trimmedCanvas.height,
    0,
    0,
    trimmedCanvas.width,
    trimmedCanvas.height
  );

  return trimmedCanvas;
}

export {
  EXPORT_FILENAME_PREFIX,
  EXPORT_TRIM_PADDING_PX,
  EXPORT_SCALE,
  EXPORT_ZOOM,
  EXPORT_WORLD_PADDING,
  handleExportAction,
  exportCircuitBlob,
  computeCircuitWorldBounds,
  getExportThemePalette,
  getExportLightSpriteMap,
  waitForImageLoad,
  createAlphaCanvas,
  canvasToBlob,
  downloadBlob,
  buildExportFileName,
  applyCanvasBackground,
  trimCanvas,
};
