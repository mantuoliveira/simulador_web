import { state } from "../runtime/state.js";
import {
  getComponentByIdFromCollection,
  getTerminalLabelDirectionForComponents,
  getTerminalPositionForComponents,
  getWireByIdFromCollection,
  terminalKey,
} from "../core/model.js";

function isWireVisible(wire) {
  return (
    !!wire &&
    wire.implicitContact !== true &&
    Array.isArray(wire.path) &&
    wire.path.length >= 2
  );
}

function isComponentGroupSelected(componentId, circuit = state) {
  return circuit.selectedComponentIds instanceof Set && circuit.selectedComponentIds.has(componentId);
}

function getComponentById(id, circuit = state) {
  return getComponentByIdFromCollection(circuit.components, id);
}

function getWireById(id, circuit = state) {
  return getWireByIdFromCollection(circuit.wires, id);
}

function getTerminalPosition(componentId, terminalIndex, circuit = state) {
  return getTerminalPositionForComponents(circuit.components, componentId, terminalIndex);
}

function getTerminalLabelDirection(componentId, terminalIndex, circuit = state) {
  return getTerminalLabelDirectionForComponents(circuit.components, componentId, terminalIndex);
}

function isTerminalConnected(componentId, terminalIndex, circuit = state) {
  return circuit.wires.some(
    (wire) =>
      (wire.from.componentId === componentId && wire.from.terminalIndex === terminalIndex) ||
      (wire.to.componentId === componentId && wire.to.terminalIndex === terminalIndex)
  );
}

function getTerminalLabel(componentId, terminalIndex, circuit = state) {
  return circuit.terminalLabels.get(terminalKey(componentId, terminalIndex)) || "";
}

function getSelectedNodeMarker(circuit = state) {
  if (circuit.selectedNodeMarkerRoot == null || !circuit.simulationResult?.ok) {
    return null;
  }

  return (
    circuit.simulationResult.data.nodeMarkers.find(
      (marker) => marker.root === circuit.selectedNodeMarkerRoot
    ) || null
  );
}

function getNodeMarkerRootForTerminal(componentId, terminalIndex, circuit = state) {
  if (!circuit.simulationActive || !circuit.simulationResult?.ok) {
    return null;
  }

  const root =
    circuit.simulationResult.data.rootByTerminal?.get(terminalKey(componentId, terminalIndex)) ?? null;
  if (root == null) {
    return null;
  }

  return circuit.simulationResult.data.nodeMarkers.some((marker) => marker.root === root) ? root : null;
}

export {
  isWireVisible,
  isComponentGroupSelected,
  getComponentById,
  getWireById,
  getTerminalPosition,
  getTerminalLabelDirection,
  isTerminalConnected,
  getTerminalLabel,
  getSelectedNodeMarker,
  getNodeMarkerRootForTerminal,
};
