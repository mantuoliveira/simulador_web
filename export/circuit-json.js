import { state, appEls, clearSelectionState, clearSimulationState } from "../runtime/state.js";
import { onCircuitChanged, updateSelectionUi } from "../editor/circuit.js";
import { showStatus, setSimulationButtonState } from "../editor/ui.js";

// Circuit JSON export and import.

const CIRCUIT_FORMAT_VERSION = 1;

function exportCircuitJson() {
  if (state.components.length === 0) {
    showStatus("Nenhum componente no circuito", true);
    return;
  }

  const data = {
    version: CIRCUIT_FORMAT_VERSION,
    components: state.components,
    wires: state.wires,
    terminalLabels: [...state.terminalLabels.entries()],
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "circuito.json";
  a.click();
  URL.revokeObjectURL(url);

  showStatus("Circuito exportado");
}

function importCircuitJson() {
  appEls.importFileInput.click();
}

function handleImportFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  // Reset input so the same file can be re-imported
  event.target.value = "";

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      applyImportedCircuit(data);
    } catch {
      showStatus("Arquivo JSON inválido", true);
    }
  };
  reader.readAsText(file);
}

function applyImportedCircuit(data) {
  if (!data || typeof data !== "object") {
    showStatus("Formato inválido", true);
    return;
  }

  const components = data.components;
  const wires = data.wires;
  const terminalLabels = data.terminalLabels;

  if (!Array.isArray(components) || !Array.isArray(wires)) {
    showStatus("Formato inválido", true);
    return;
  }

  clearSelectionState();
  clearSimulationState();

  state.components = components;
  state.wires = wires;
  state.preferredComponentPositions.clear();
  for (const component of components) {
    state.preferredComponentPositions.set(component.type, { x: component.x, y: component.y });
  }

  state.terminalLabels.clear();
  if (Array.isArray(terminalLabels)) {
    for (const [key, value] of terminalLabels) {
      state.terminalLabels.set(key, value);
    }
  }

  // Recalculate next IDs
  state.nextComponentId =
    components.reduce((max, c) => Math.max(max, c.id ?? 0), 0) + 1;
  state.nextWireId =
    wires.reduce((max, w) => Math.max(max, w.id ?? 0), 0) + 1;
  state.nextSplitGroupId = 1;

  setSimulationButtonState(false);
  onCircuitChanged();
  updateSelectionUi();

  showStatus("Circuito importado");
}

export { exportCircuitJson, importCircuitJson, handleImportFileChange };
