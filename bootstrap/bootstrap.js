import { themeState } from "../runtime/state.js";
import {
  applyThemeMode,
  buildComponentStrip,
  initializeUiRuntime,
  setupCanvas,
} from "../runtime/ui.js";
import { setupButtons, setupKeyboardShortcuts } from "../editor/controls.js";
import {
  setupCanvasGestures,
  setupNativeZoomGuards,
  setupWheelGestures,
} from "../editor/interactions.js";
import { updateSelectionUi } from "../editor/circuit.js";
import { setupRenderLoop, setupServiceWorker } from "../render/render.js";

function bootstrapApp() {
  initializeUiRuntime();
  buildComponentStrip();
  applyThemeMode(themeState.mode);
  setupCanvas();
  setupButtons();
  setupKeyboardShortcuts();
  setupCanvasGestures();
  setupWheelGestures();
  setupNativeZoomGuards();
  setupServiceWorker();
  setupRenderLoop();
  updateSelectionUi();
}

export { bootstrapApp };
