import {
  COMPONENT_DEFS,
  CURRENT_ARROW_BUTTON_ICONS,
  SIMULATION_BUTTON_ICONS,
} from "../core/constants.js";
import { getComponentBehavior } from "../core/behaviors.js";
import { appEls, deleteButtonHoldState, state, themePalette } from "../runtime/state.js";

let statusTimer = null;

function setSimulationButtonState(isRunning) {
  appEls.simulateBtn.innerHTML = isRunning ? SIMULATION_BUTTON_ICONS.running : SIMULATION_BUTTON_ICONS.idle;
  appEls.simulateBtn.classList.toggle("running", isRunning);
  appEls.simulateBtn.title = isRunning ? "Pausar simulacao" : "Iniciar simulacao";
  appEls.simulateBtn.setAttribute("aria-label", isRunning ? "Pausar simulacao" : "Iniciar simulacao");
  appEls.simulateBtn.setAttribute("aria-pressed", isRunning ? "true" : "false");
}

function canToggleCurrentArrow(component) {
  return !!component && getComponentBehavior(component.type).supportsCurrentArrow === true;
}

function canToggleComponentValueLabel(component) {
  if (!component) return false;
  const def = COMPONENT_DEFS[component.type];
  return !!def && def.editable === true && def.showValueLabel !== false;
}

function canToggleNodeMarkerVoltage(nodeMarker) {
  return !!nodeMarker && state.simulationActive && state.simulationResult?.ok;
}

function getComponentVisibilityToggleMode(component) {
  if (!component) return null;
  if (state.simulationActive) {
    return canToggleCurrentArrow(component) ? "component" : null;
  }
  return canToggleComponentValueLabel(component) ? "value" : null;
}

function setVisibilityToggleButtonState({ mode, hidden }) {
  const label =
    mode === "node"
      ? hidden
        ? "Mostrar tensão do nó"
        : "Ocultar tensão do nó"
      : mode === "value"
        ? hidden
          ? "Mostrar valor do componente"
          : "Ocultar valor do componente"
      : hidden
        ? "Mostrar seta de corrente"
        : "Ocultar seta de corrente";
  appEls.currentArrowBtn.innerHTML = hidden
    ? CURRENT_ARROW_BUTTON_ICONS.hidden
    : CURRENT_ARROW_BUTTON_ICONS.visible;
  appEls.currentArrowBtn.title = label;
  appEls.currentArrowBtn.setAttribute("aria-label", label);
  appEls.currentArrowBtn.setAttribute("aria-pressed", hidden ? "true" : "false");
}

function clearDeleteButtonHold() {
  if (deleteButtonHoldState.timerId == null) return;

  clearTimeout(deleteButtonHoldState.timerId);
  deleteButtonHoldState.timerId = null;
}

function showStatus(text, isError = false) {
  appEls.status.textContent = text;
  appEls.status.style.background = isError ? themePalette.statusErrorBg : themePalette.statusBg;
  appEls.status.style.color = isError ? themePalette.statusErrorInk : themePalette.statusInk;
  appEls.status.classList.add("show");

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    appEls.status.classList.remove("show");
  }, 1700);
}

export {
  setSimulationButtonState,
  canToggleCurrentArrow,
  canToggleComponentValueLabel,
  canToggleNodeMarkerVoltage,
  getComponentVisibilityToggleMode,
  setVisibilityToggleButtonState,
  clearDeleteButtonHold,
  showStatus,
};
