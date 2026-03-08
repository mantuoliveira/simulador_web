import {
  COMPONENT_DEFS,
  COMPONENT_ORDER,
  DARK_THEME,
  LIGHT_THEME,
  THEME_PALETTE_DEFAULTS,
  VOLTAGE_NODE_TYPE,
} from "../core/constants.js";
import { buildSvgForType } from "../core/behaviors.js";
import { svgToDataUri } from "../core/support.js";
import {
  appEls,
  mainRenderTarget,
  resizeRenderTarget,
  setSpriteMap,
  setThemePalette,
  spriteMap,
  state,
  themePalette,
  themeState,
} from "./state.js";
import { requestRender } from "../render/render.js";
import { addComponent } from "../editor/circuit.js";
import { showStatus } from "../editor/ui.js";

let lastCanvasW = 0;
let lastCanvasH = 0;
let pendingCanvasResizeFrame = null;
let uiInitialized = false;

function initializeUiRuntime() {
  if (uiInitialized) return;

  refreshThemePalette();
  updateThemeColorMeta(themePalette.themeColor);
  setSpriteMap(loadSprites());
  uiInitialized = true;
}

function createSpriteMap(svgOptions = {}, { notifyOnLoad = true } = {}) {
  const sprites = {};
  const palette = svgOptions.palette || themePalette;

  for (const type of COMPONENT_ORDER) {
    const svg = buildSvgForType(type, {
      showOpAmpMarkers: type !== "op_amp",
      showPolarityMarkers: type !== "voltage_source",
      palette,
      ...svgOptions,
    });
    const image = new Image();
    if (notifyOnLoad) {
      image.addEventListener("load", () => {
        requestRender(true);
      });
    }
    image.src = svgToDataUri(svg);
    sprites[type] = image;
  }

  return sprites;
}

function loadSprites() {
  return createSpriteMap();
}

function refreshComponentStripIcons() {
  if (!appEls.strip) return;

  const buttons = appEls.strip.querySelectorAll(".comp-btn");
  for (const button of buttons) {
    const type = button.dataset.type;
    const img = button.querySelector("img");
    if (!type || !img) continue;
    img.src = svgToDataUri(buildSvgForType(type, { palette: themePalette }));
  }
}

function refreshThemePalette() {
  const styles = getComputedStyle(document.documentElement);
  setThemePalette({
    themeColor: readThemeCssVar(styles, "--theme-color", THEME_PALETTE_DEFAULTS.themeColor),
    statusBg: readThemeCssVar(styles, "--status-bg", THEME_PALETTE_DEFAULTS.statusBg),
    statusErrorBg: readThemeCssVar(styles, "--status-error-bg", THEME_PALETTE_DEFAULTS.statusErrorBg),
    statusInk: readThemeCssVar(styles, "--status-ink", THEME_PALETTE_DEFAULTS.statusInk),
    statusErrorInk: readThemeCssVar(
      styles,
      "--status-error-ink",
      THEME_PALETTE_DEFAULTS.statusErrorInk
    ),
    canvasGrid: readThemeCssVar(styles, "--canvas-grid", THEME_PALETTE_DEFAULTS.canvasGrid),
    canvasWire: readThemeCssVar(styles, "--canvas-wire", THEME_PALETTE_DEFAULTS.canvasWire),
    canvasWireSelected: readThemeCssVar(
      styles,
      "--canvas-wire-selected",
      THEME_PALETTE_DEFAULTS.canvasWireSelected
    ),
    canvasSelection: readThemeCssVar(
      styles,
      "--canvas-selection",
      THEME_PALETTE_DEFAULTS.canvasSelection
    ),
    canvasPendingFill: readThemeCssVar(
      styles,
      "--canvas-pending-fill",
      THEME_PALETTE_DEFAULTS.canvasPendingFill
    ),
    canvasPendingStroke: readThemeCssVar(
      styles,
      "--canvas-pending-stroke",
      THEME_PALETTE_DEFAULTS.canvasPendingStroke
    ),
    canvasSpriteFallback: readThemeCssVar(
      styles,
      "--canvas-sprite-fallback",
      THEME_PALETTE_DEFAULTS.canvasSpriteFallback
    ),
    canvasTerminalFilled: readThemeCssVar(
      styles,
      "--canvas-terminal-filled",
      THEME_PALETTE_DEFAULTS.canvasTerminalFilled
    ),
    canvasTerminalEmpty: readThemeCssVar(
      styles,
      "--canvas-terminal-empty",
      THEME_PALETTE_DEFAULTS.canvasTerminalEmpty
    ),
    canvasTerminalStroke: readThemeCssVar(
      styles,
      "--canvas-terminal-stroke",
      THEME_PALETTE_DEFAULTS.canvasTerminalStroke
    ),
    canvasLabel: readThemeCssVar(styles, "--canvas-label", THEME_PALETTE_DEFAULTS.canvasLabel),
    canvasLabelSelected: readThemeCssVar(
      styles,
      "--canvas-label-selected",
      THEME_PALETTE_DEFAULTS.canvasLabelSelected
    ),
    canvasAnnotationBg: readThemeCssVar(
      styles,
      "--canvas-annotation-bg",
      THEME_PALETTE_DEFAULTS.canvasAnnotationBg
    ),
    canvasAnnotationText: readThemeCssVar(
      styles,
      "--canvas-annotation-text",
      THEME_PALETTE_DEFAULTS.canvasAnnotationText
    ),
    canvasCurrent: readThemeCssVar(styles, "--canvas-current", THEME_PALETTE_DEFAULTS.canvasCurrent),
    canvasCurrentText: readThemeCssVar(
      styles,
      "--canvas-current-text",
      THEME_PALETTE_DEFAULTS.canvasCurrentText
    ),
    canvasSpriteStroke: readThemeCssVar(
      styles,
      "--canvas-sprite-stroke",
      THEME_PALETTE_DEFAULTS.canvasSpriteStroke
    ),
    canvasSpriteFill: readThemeCssVar(
      styles,
      "--canvas-sprite-fill",
      THEME_PALETTE_DEFAULTS.canvasSpriteFill
    ),
    canvasThermalResistorWarm: readThemeCssVar(
      styles,
      "--canvas-thermal-resistor-warm",
      THEME_PALETTE_DEFAULTS.canvasThermalResistorWarm
    ),
    canvasThermalResistorHot: readThemeCssVar(
      styles,
      "--canvas-thermal-resistor-hot",
      THEME_PALETTE_DEFAULTS.canvasThermalResistorHot
    ),
  });
}

function readThemeCssVar(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  return value || fallback;
}

function updateThemeColorMeta(color) {
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme && color) {
    metaTheme.setAttribute("content", color);
  }
}

function updateThemeToggleButtonState() {
  if (!appEls.themeToggleBtn) return;

  const nextThemeLabel =
    themeState.mode === DARK_THEME ? "Ativar tema claro" : "Ativar tema escuro";
  appEls.themeToggleBtn.title = nextThemeLabel;
  appEls.themeToggleBtn.setAttribute("aria-label", nextThemeLabel);
  appEls.themeToggleBtn.setAttribute("aria-pressed", themeState.mode === DARK_THEME ? "true" : "false");
}

function applyThemeMode(mode, { announce = false } = {}) {
  const nextMode = mode === DARK_THEME ? DARK_THEME : LIGHT_THEME;
  themeState.mode = nextMode;
  document.documentElement.dataset.theme = nextMode;
  refreshThemePalette();
  updateThemeColorMeta(themePalette.themeColor);
  setSpriteMap(loadSprites());
  refreshComponentStripIcons();
  updateThemeToggleButtonState();
  requestRender(true);

  if (announce) {
    showStatus(nextMode === DARK_THEME ? "Tema escuro ativo" : "Tema claro ativo");
  }
}

function buildComponentStrip() {
  if (!appEls.strip) return;

  appEls.strip.textContent = "";
  for (const type of COMPONENT_ORDER) {
    const def = COMPONENT_DEFS[type];
    const button = document.createElement("button");
    button.className = "comp-btn";
    button.type = "button";
    button.dataset.type = type;
    button.title = def.label;
    button.setAttribute("aria-label", def.label);

    const img = document.createElement("img");
    img.alt = "";
    img.setAttribute("aria-hidden", "true");
    img.src = svgToDataUri(buildSvgForType(type, { palette: themePalette }));
    if (type === VOLTAGE_NODE_TYPE) {
      img.style.transform = "rotate(180deg)";
    }

    button.append(img);
    button.addEventListener("click", () => addComponent(type));
    appEls.strip.appendChild(button);
  }
}

function setupCanvas() {
  queueCanvasResize();
  window.addEventListener("resize", queueCanvasResize);
  window.addEventListener("orientationchange", queueCanvasResize);
  window.addEventListener("pageshow", queueCanvasResize);

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", queueCanvasResize);
  }

  if (window.ResizeObserver && appEls.canvasWrap) {
    const observer = new ResizeObserver(() => {
      queueCanvasResize();
    });
    observer.observe(appEls.canvasWrap);
  }
}

function queueCanvasResize() {
  if (pendingCanvasResizeFrame != null) return;

  pendingCanvasResizeFrame = requestAnimationFrame(() => {
    pendingCanvasResizeFrame = null;
    resizeCanvas();
  });
}

function resizeCanvas() {
  const rect = appEls.canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  const nextDpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.floor(width * nextDpr));
  const pixelHeight = Math.max(1, Math.floor(height * nextDpr));

  if (
    width === lastCanvasW &&
    height === lastCanvasH &&
    appEls.canvas.width === pixelWidth &&
    appEls.canvas.height === pixelHeight
  ) {
    resizeRenderTarget(mainRenderTarget, width, height, nextDpr);
    requestRender(true);
    return;
  }

  resizeRenderTarget(mainRenderTarget, width, height, nextDpr);

  if (lastCanvasW === 0 && lastCanvasH === 0) {
    state.camera.offsetX = width * 0.5;
    state.camera.offsetY = height * 0.5;
  } else {
    state.camera.offsetX += (width - lastCanvasW) * 0.5;
    state.camera.offsetY += (height - lastCanvasH) * 0.5;
  }

  lastCanvasW = width;
  lastCanvasH = height;
  requestRender(true);
}

export {
  initializeUiRuntime,
  createSpriteMap,
  loadSprites,
  refreshComponentStripIcons,
  refreshThemePalette,
  readThemeCssVar,
  updateThemeColorMeta,
  updateThemeToggleButtonState,
  applyThemeMode,
  buildComponentStrip,
  setupCanvas,
  queueCanvasResize,
  resizeCanvas,
};
