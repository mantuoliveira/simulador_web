import { DARK_THEME, LIGHT_THEME, getInitialCameraZoom } from "../core/constants.js";

// Application state, DOM references, and shared runtime holders.

const state = {
  components: [],
  wires: [],
  terminalLabels: new Map(),
  nextComponentId: 1,
  nextWireId: 1,
  nextSplitGroupId: 1,
  selectedComponentId: null,
  selectedComponentIds: new Set(),
  selectedWireId: null,
  selectedTerminalLabelKey: null,
  selectedNodeMarkerRoot: null,
  selectedNodeMarkerTerminal: null,
  pendingTerminal: null,
  groupSelectMode: false,
  simulationActive: false,
  simulationResult: null,
  thermalModeActive: false,
  nodeMarkerTerminalByRoot: new Map(),
  hiddenNodeMarkerRoots: new Set(),
  defaultHiddenNodeMarkerRoots: new Set(),
  preferredComponentRotations: new Map(),
  preferredComponentParams: new Map(),
  camera: {
    offsetX: 0,
    offsetY: 0,
    zoom: getInitialCameraZoom(),
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
    emptyTapCandidate: false,
    tapStartScreenX: 0,
    tapStartScreenY: 0,
    tapComponentId: null,
    tapStartedSelectedComponent: false,
  },
};

function clearGroupSelection(circuit = state) {
  if (circuit.selectedComponentIds instanceof Set) {
    circuit.selectedComponentIds.clear();
  }
}

function clearNodeMarkerSelection(circuit = state) {
  circuit.selectedNodeMarkerRoot = null;
  circuit.selectedNodeMarkerTerminal = null;
}

function clearNonComponentSelection(circuit = state) {
  circuit.selectedWireId = null;
  circuit.selectedTerminalLabelKey = null;
  clearNodeMarkerSelection(circuit);
}

function clearSelectionState(circuit = state) {
  circuit.selectedComponentId = null;
  circuit.groupSelectMode = false;
  clearGroupSelection(circuit);
  clearNonComponentSelection(circuit);
  circuit.pendingTerminal = null;
}

function clearSimulationState(circuit = state) {
  circuit.simulationActive = false;
  circuit.simulationResult = null;
  circuit.thermalModeActive = false;
  if (circuit.nodeMarkerTerminalByRoot instanceof Map) {
    circuit.nodeMarkerTerminalByRoot.clear();
  }

  if (circuit.hiddenNodeMarkerRoots instanceof Set) {
    circuit.hiddenNodeMarkerRoots.clear();
  }
  if (circuit.defaultHiddenNodeMarkerRoots instanceof Set) {
    circuit.defaultHiddenNodeMarkerRoots.clear();
  }

  clearNodeMarkerSelection(circuit);
}

const appEls = {
  strip: document.getElementById("component-strip"),
  canvasWrap: document.getElementById("canvas-wrap"),
  canvas: document.getElementById("circuit-canvas"),
  simulateBtn: document.getElementById("simulate-btn"),
  themeToggleBtn: document.getElementById("theme-toggle-btn"),
  editTerminalLabelBtn: document.getElementById("edit-terminal-label-btn"),
  thermalBtn: document.getElementById("thermal-btn"),
  groupSelectBtn: document.getElementById("group-select-btn"),
  exportBtn: document.getElementById("export-btn"),
  currentArrowBtn: document.getElementById("current-arrow-btn"),
  rotateBtn: document.getElementById("rotate-btn"),
  deleteBtn: document.getElementById("delete-btn"),
  swapOpAmpBtn: document.getElementById("swap-op-amp-btn"),
  status: document.getElementById("status-pill"),
  valueWheel: document.getElementById("value-wheel"),
  wheelPointer: document.querySelector(".wheel-pointer"),
  wheelValue: document.getElementById("wheel-value"),
  wheelTitle: document.getElementById("wheel-title"),
  wheelUnit: document.getElementById("wheel-unit"),
  terminalLabelModal: document.getElementById("terminal-label-modal"),
  terminalLabelForm: document.getElementById("terminal-label-form"),
  terminalLabelInput: document.getElementById("terminal-label-input"),
  terminalLabelCancel: document.getElementById("terminal-label-cancel"),
};

function createRenderTarget(
  canvas,
  {
    width = Math.max(1, Math.floor(canvas?.clientWidth || canvas?.width || 1)),
    height = Math.max(1, Math.floor(canvas?.clientHeight || canvas?.height || 1)),
    dpr = Math.max(1, window.devicePixelRatio || 1),
  } = {}
) {
  const context = canvas?.getContext("2d", { alpha: true });
  if (!context) {
    throw new Error("canvas context unavailable");
  }

  return {
    canvas,
    context,
    width,
    height,
    dpr,
  };
}

function resizeRenderTarget(renderTarget, width, height, nextDpr) {
  renderTarget.width = width;
  renderTarget.height = height;
  renderTarget.dpr = Math.max(1, nextDpr || 1);

  const pixelWidth = Math.max(1, Math.floor(width * renderTarget.dpr));
  const pixelHeight = Math.max(1, Math.floor(height * renderTarget.dpr));
  if (renderTarget.canvas.width !== pixelWidth) {
    renderTarget.canvas.width = pixelWidth;
  }
  if (renderTarget.canvas.height !== pixelHeight) {
    renderTarget.canvas.height = pixelHeight;
  }

  return {
    pixelWidth,
    pixelHeight,
  };
}

const mainRenderTarget = createRenderTarget(appEls.canvas);

const renderState = {
  rafId: null,
  dirty: true,
};

const wheelState = {
  dragging: false,
  pointerId: null,
  lastRawNormalized: null,
  activeNormalized: null,
};

const emptyCanvasTapState = {
  lastTimestamp: 0,
  lastScreenX: 0,
  lastScreenY: 0,
};

const deleteButtonHoldState = {
  timerId: null,
  suppressNextClick: false,
};

const exportButtonHoldState = {
  timerId: null,
  suppressNextClick: false,
};

const terminalLabelEditorState = {
  terminalRef: null,
};

const themeState = {
  mode: document.documentElement.dataset.theme === DARK_THEME ? DARK_THEME : LIGHT_THEME,
};

let themePalette = {};
let spriteMap = {};

function setThemePalette(nextPalette) {
  themePalette = nextPalette || {};
}

function setSpriteMap(nextSpriteMap) {
  spriteMap = nextSpriteMap || {};
}

function getRenderThemePalette(renderTarget = mainRenderTarget) {
  return renderTarget?.themePalette || themePalette;
}

function getRenderSpriteMap(renderTarget = mainRenderTarget) {
  return renderTarget?.spriteMap || spriteMap;
}

export {
  state,
  clearGroupSelection,
  clearNodeMarkerSelection,
  clearNonComponentSelection,
  clearSelectionState,
  clearSimulationState,
  appEls,
  createRenderTarget,
  resizeRenderTarget,
  mainRenderTarget,
  renderState,
  wheelState,
  emptyCanvasTapState,
  deleteButtonHoldState,
  exportButtonHoldState,
  terminalLabelEditorState,
  themeState,
  themePalette,
  spriteMap,
  setThemePalette,
  setSpriteMap,
  getRenderThemePalette,
  getRenderSpriteMap,
};
