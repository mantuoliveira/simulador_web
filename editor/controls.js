import {
  COMPONENT_DEFS,
  DARK_THEME,
  DELETE_BUTTON_HOLD_MS,
  EXPORT_BUTTON_HOLD_MS,
  LIGHT_THEME,
  isGroundReferencedVoltageSourceComponent,
} from "../core/constants.js";
import { getComponentCollisionExtents } from "../core/model.js";
import {
  appEls,
  clearSelectionState,
  clearSimulationState,
  deleteButtonHoldState,
  exportButtonHoldState,
  state,
  themeState,
} from "../runtime/state.js";
import { applyThemeMode, updateThemeToggleButtonState } from "../runtime/ui.js";
import { requestRender } from "../render/render.js";
import { handleExportAction } from "../export/png.js";
import { handleBomAction } from "../export/bom.js";
import { exportCircuitJson, importCircuitJson, handleImportFileChange } from "../export/circuit-json.js";
import { buildStoredSimulationResult, runSimulation } from "../simulation/solver.js";
import { getSelectedNodeMarker, getTerminalPosition } from "./selectors.js";
import { getVisibleWorldBounds } from "../runtime/viewport.js";
import {
  applyDefaultGroundNodeMarkerVisibility,
  closeTerminalLabelEditor,
  findEmptySpot,
  getComponentById,
  getTerminalLabelEditorTarget,
  isComponentPlacementValid,
  onCircuitChanged,
  openTerminalLabelEditor,
  removeComponent,
  removeTerminalLabel,
  removeWire,
  rotateComponentInCircuit,
  saveTerminalLabelFromEditor,
  terminalKey,
  terminalRefsEqual,
  toggleComponentTerminalOrderInCircuit,
  toggleGroupSelectionMode,
  updateSelectionUi,
} from "./circuit.js";
import { buildRouteTerminalOptions } from "./circuit.js";
import { routeWire } from "./routing.js";
import {
  canToggleComponentValueLabel,
  canToggleCurrentArrow,
  canToggleNodeMarkerVoltage,
  clearDeleteButtonHold,
  getComponentVisibilityToggleMode,
  setSimulationButtonState,
  setVisibilityToggleButtonState,
  showStatus,
} from "./ui.js";

// Top-level UI controls, editor actions, and keyboard shortcuts.

function setupButtons() {
  setSimulationButtonState(false);
  updateThemeToggleButtonState();
  setupTerminalLabelModal();

  appEls.themeToggleBtn.addEventListener("click", () => {
    applyThemeMode(themeState.mode === DARK_THEME ? LIGHT_THEME : DARK_THEME, {
      announce: true,
    });
  });

  appEls.editTerminalLabelBtn.addEventListener("click", () => {
    const terminalRef = getTerminalLabelEditorTarget();
    if (!terminalRef) return;
    openTerminalLabelEditor(terminalRef);
  });

  appEls.moreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isOpen = appEls.managerialActions.classList.toggle("open");
    appEls.moreBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  appEls.managerialActions.addEventListener("click", () => {
    appEls.managerialActions.classList.remove("open");
    appEls.moreBtn.setAttribute("aria-expanded", "false");
  });

  document.addEventListener("click", () => {
    appEls.managerialActions.classList.remove("open");
    appEls.moreBtn.setAttribute("aria-expanded", "false");
  });

  appEls.bomBtn.addEventListener("click", () => {
    handleBomAction();
  });

  appEls.groupSelectBtn.addEventListener("click", () => {
    toggleGroupSelectionMode();
  });

  appEls.thermalBtn.addEventListener("click", () => {
    if (!state.simulationActive || !state.simulationResult?.ok) return;

    state.thermalModeActive = state.thermalModeActive !== true;
    updateSelectionUi();
    requestRender(true);
    showStatus(state.thermalModeActive ? "Potência dissipada visível" : "Potência dissipada oculta");
  });

  appEls.simulateBtn.addEventListener("click", () => {
    if (!state.simulationActive) {
      const autoGround = ensureGroundForSimulation();
      if (!autoGround.ok) {
        showStatus(autoGround.message || "Falha ao preparar circuito", true);
        return;
      }

      const result = runSimulation();
      if (!result.ok) {
        showStatus(result.message || "Falha na simulação", true);
        return;
      }
      state.simulationResult = buildStoredSimulationResult(result);
      state.simulationActive = true;
      applyDefaultGroundNodeMarkerVisibility();
      setSimulationButtonState(true);
      updateSelectionUi();
      showStatus("Simulação DC ativa");
      return;
    }

    clearSimulationState();
    setSimulationButtonState(false);
    updateSelectionUi();
    showStatus("Simulação pausada");
  });

  appEls.swapOpAmpBtn.addEventListener("click", toggleSelectedComponentTerminalOrder);
  appEls.currentArrowBtn.addEventListener("click", toggleSelectedAnnotationVisibility);
  appEls.rotateBtn.addEventListener("click", () => {
    if (state.selectedComponentId == null) return;
    const result = rotateComponentInCircuit(state, state.selectedComponentId);
    if (!result.ok) {
      showStatus(result.message || "Falha ao rotacionar componente", true);
      return;
    }

    onCircuitChanged();
    if (result.selectionChanged) {
      updateSelectionUi();
    }
  });

  setupExportButtonGestures();
  setupDeleteButtonGestures();
}

function setupTerminalLabelModal() {
  appEls.terminalLabelForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTerminalLabelFromEditor();
  });

  appEls.terminalLabelCancel.addEventListener("click", () => {
    closeTerminalLabelEditor();
  });

  appEls.terminalLabelModal.addEventListener("pointerdown", (event) => {
    if (event.target === appEls.terminalLabelModal) {
      closeTerminalLabelEditor();
    }
  });
}

function clearCircuit() {
  state.components = [];
  state.wires = [];
  state.terminalLabels.clear();
  state.nextComponentId = 1;
  state.nextWireId = 1;
  state.nextSplitGroupId = 1;
  clearSelectionState();
  clearSimulationState();

  setSimulationButtonState(false);
  closeTerminalLabelEditor();
  updateSelectionUi();
  requestRender(true);
  showStatus("Canvas limpo");
}

function toggleSelectedAnnotationVisibility() {
  const nodeMarker = getSelectedNodeMarker();
  if (canToggleNodeMarkerVoltage(nodeMarker)) {
    if (
      state.pendingTerminal &&
      state.selectedNodeMarkerTerminal &&
      terminalRefsEqual(state.pendingTerminal, state.selectedNodeMarkerTerminal)
    ) {
      state.pendingTerminal = null;
    }

    if (state.hiddenNodeMarkerRoots.has(nodeMarker.root)) {
      state.hiddenNodeMarkerRoots.delete(nodeMarker.root);
      updateSelectionUi();
      requestRender(true);
      showStatus("Tensão do nó visível");
      return;
    }

    state.hiddenNodeMarkerRoots.add(nodeMarker.root);
    updateSelectionUi();
    requestRender(true);
    showStatus("Tensão do nó oculta");
    return;
  }

  const component = getComponentById(state.selectedComponentId);
  const componentVisibilityMode = getComponentVisibilityToggleMode(component);
  if (componentVisibilityMode === "value") {
    component.valueLabelHidden = component.valueLabelHidden !== true;
    setVisibilityToggleButtonState({
      mode: "value",
      hidden: component.valueLabelHidden === true,
    });
    requestRender(true);
    showStatus(component.valueLabelHidden ? "Valor do componente ocultado" : "Valor do componente visível");
    return;
  }

  if (componentVisibilityMode !== "component") return;

  component.currentArrowHidden = component.currentArrowHidden !== true;
  setVisibilityToggleButtonState({ mode: "component", hidden: component.currentArrowHidden === true });
  requestRender(true);
  showStatus(component.currentArrowHidden ? "Seta de corrente oculta" : "Seta de corrente visível");
}

function setupDeleteButtonGestures() {
  appEls.deleteBtn.addEventListener("click", (event) => {
    if (deleteButtonHoldState.suppressNextClick) {
      deleteButtonHoldState.suppressNextClick = false;
      event.preventDefault();
      return;
    }

    handleDeleteAction();
  });

  appEls.deleteBtn.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (state.selectedComponentId == null && state.selectedWireId == null) return;

    clearDeleteButtonHold();
    deleteButtonHoldState.suppressNextClick = false;
    deleteButtonHoldState.timerId = setTimeout(() => {
      deleteButtonHoldState.timerId = null;
      deleteButtonHoldState.suppressNextClick = true;
      clearCircuit();
    }, DELETE_BUTTON_HOLD_MS);
  });

  appEls.deleteBtn.addEventListener("pointerup", clearDeleteButtonHold);
  appEls.deleteBtn.addEventListener("pointerleave", clearDeleteButtonHold);
  appEls.deleteBtn.addEventListener("pointercancel", clearDeleteButtonHold);
}

function setupExportButtonGestures() {
  appEls.exportBtn.addEventListener("click", () => {
    exportCircuitJson();
  });

  appEls.importBtn.addEventListener("click", () => {
    importCircuitJson();
  });

  appEls.importFileInput.addEventListener("change", handleImportFileChange);

  appEls.pngBtn.addEventListener("click", (event) => {
    if (exportButtonHoldState.suppressNextClick) {
      exportButtonHoldState.suppressNextClick = false;
      event.preventDefault();
      return;
    }

    void handleExportAction({ background: "white" });
  });

  appEls.pngBtn.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (state.components.length === 0) return;

    clearExportButtonHold();
    exportButtonHoldState.suppressNextClick = false;
    exportButtonHoldState.timerId = setTimeout(() => {
      exportButtonHoldState.timerId = null;
      exportButtonHoldState.suppressNextClick = true;
      void handleExportAction({ background: "transparent" });
    }, EXPORT_BUTTON_HOLD_MS);
  });

  appEls.pngBtn.addEventListener("pointerup", clearExportButtonHold);
  appEls.pngBtn.addEventListener("pointerleave", clearExportButtonHold);
  appEls.pngBtn.addEventListener("pointercancel", clearExportButtonHold);
}

function clearExportButtonHold() {
  if (exportButtonHoldState.timerId == null) return;

  clearTimeout(exportButtonHoldState.timerId);
  exportButtonHoldState.timerId = null;
}

function toggleSelectedComponentTerminalOrder() {
  const result = toggleComponentTerminalOrderInCircuit(state, state.selectedComponentId);
  if (!result.ok) return;

  onCircuitChanged();
  if (result.message) {
    showStatus(result.message);
  }
}

function ensureGroundForSimulation() {
  if (state.components.length === 0) {
    return { ok: true };
  }

  if (state.components.some((component) => isGroundReferencedVoltageSourceComponent(component))) {
    return { ok: true };
  }

  if (state.components.some((component) => component.type === "ground")) {
    return { ok: true };
  }

  const targetTerminals = collectAutoGroundTargets();
  if (targetTerminals.length === 0) {
    return { ok: false, message: "Nao foi possivel inserir um terra automaticamente" };
  }

  for (const target of targetTerminals) {
    const inserted = tryInsertAutoGround(target);
    if (inserted) {
      showStatus("Terra inserido automaticamente");
      requestRender(true);
      return { ok: true, inserted: true };
    }
  }

  return {
    ok: false,
    message: "Nao foi possivel inserir e conectar um terra automaticamente",
  };
}

function collectAutoGroundTargets() {
  const targets = [];
  const seen = new Set();

  const pushTarget = (componentId, terminalIndex) => {
    const mapKey = terminalKey(componentId, terminalIndex);
    if (seen.has(mapKey)) return;
    seen.add(mapKey);
    targets.push({ componentId, terminalIndex });
  };

  for (const component of state.components) {
    if (component.type === "voltage_source") {
      pushTarget(component.id, 0);
    }
  }

  if (targets.length > 0) {
    return targets;
  }

  for (const component of state.components) {
    if (component.type === "current_source") {
      pushTarget(component.id, 0);
    }
  }

  if (targets.length > 0) {
    return targets;
  }

  for (const component of state.components) {
    if (component.type === "ground" || component.type === "junction") continue;
    const def = COMPONENT_DEFS[component.type];
    for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
      pushTarget(component.id, terminalIndex);
    }
  }

  return targets;
}

function tryInsertAutoGround(target) {
  const targetPosition = getTerminalPosition(target.componentId, target.terminalIndex);
  if (!targetPosition) return false;

  const groundId = state.nextComponentId;
  const candidates = buildAutoGroundCandidates(targetPosition);

  for (const candidate of candidates) {
    const ground = {
      id: groundId,
      type: "ground",
      x: candidate.x,
      y: candidate.y,
      rotation: candidate.rotation,
      value: COMPONENT_DEFS.ground.defaultValue,
    };

    if (!isComponentPlacementValid(ground, null, 0)) {
      continue;
    }

    state.components.push(ground);

    const groundTerminal = getTerminalPosition(groundId, 0);
    const route = groundTerminal
      ? routeWire(
          targetPosition,
          groundTerminal,
          buildRouteTerminalOptions(target, { componentId: groundId, terminalIndex: 0 })
        )
      : null;
    if (!route) {
      state.components.pop();
      continue;
    }

    state.nextComponentId += 1;
    state.wires.push({
      id: state.nextWireId++,
      from: { componentId: target.componentId, terminalIndex: target.terminalIndex },
      to: { componentId: groundId, terminalIndex: 0 },
      path: route,
    });
    return true;
  }

  return false;
}

function buildAutoGroundCandidates(targetPosition) {
  const candidates = [];
  const seen = new Set();
  const visible = getVisibleWorldBounds();
  const searchMargin = 2;

  const pushCandidate = (x, y, rotation) => {
    const keyValue = `${x},${y},${rotation}`;
    if (seen.has(keyValue)) return;

    const footprint = getComponentCollisionExtents({ type: "ground", rotation });
    const minX = visible.minX - searchMargin;
    const maxX = visible.maxX + searchMargin;
    const minY = visible.minY - searchMargin;
    const maxY = visible.maxY + searchMargin;

    if (
      x - footprint.left < minX ||
      x + footprint.right > maxX ||
      y - footprint.up < minY ||
      y + footprint.down > maxY
    ) {
      return;
    }

    seen.add(keyValue);
    candidates.push({ x, y, rotation });
  };

  const maxReach = Math.max(
    4,
    Math.ceil(
      Math.max(visible.maxX - visible.minX, visible.maxY - visible.minY)
    )
  );

  for (let distance = 2; distance <= maxReach; distance += 1) {
    pushCandidate(targetPosition.x, targetPosition.y + distance, 0);
    pushCandidate(targetPosition.x, targetPosition.y - distance, 180);
    pushCandidate(targetPosition.x - distance, targetPosition.y, 90);
    pushCandidate(targetPosition.x + distance, targetPosition.y, 270);
  }

  const fallbackSpot = findEmptySpot("ground");
  if (fallbackSpot) {
    for (const rotation of [0, 90, 180, 270]) {
      pushCandidate(fallbackSpot.x, fallbackSpot.y, rotation);
    }
  }

  return candidates;
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", (event) => {
    if (event.key !== "Delete") return;
    if (isEditableTarget(event.target)) return;
    if (
      state.selectedComponentId == null &&
      state.selectedWireId == null &&
      state.selectedTerminalLabelKey == null
    ) {
      return;
    }

    event.preventDefault();
    handleDeleteAction();
  });
}

function handleDeleteAction() {
  if (state.selectedComponentId != null) {
    removeComponent(state.selectedComponentId);
    return;
  }

  if (state.selectedWireId != null) {
    removeWire(state.selectedWireId);
    return;
  }

  if (state.selectedTerminalLabelKey != null) {
    removeTerminalLabel(state.selectedTerminalLabelKey);
  }
}

function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  if (target.isContentEditable) return true;

  const tagName = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

export {
  setupButtons,
  setupTerminalLabelModal,
  clearCircuit,
  setSimulationButtonState,
  canToggleCurrentArrow,
  canToggleComponentValueLabel,
  canToggleNodeMarkerVoltage,
  getComponentVisibilityToggleMode,
  setVisibilityToggleButtonState,
  toggleSelectedAnnotationVisibility,
  setupDeleteButtonGestures,
  clearDeleteButtonHold,
  setupExportButtonGestures,
  clearExportButtonHold,
  toggleSelectedComponentTerminalOrder,
  ensureGroundForSimulation,
  collectAutoGroundTargets,
  tryInsertAutoGround,
  buildAutoGroundCandidates,
  setupKeyboardShortcuts,
  handleDeleteAction,
  isEditableTarget,
};
