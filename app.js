const GRID_SIZE = 28;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.2;
const IDLE_FPS = 1;
const IDLE_FRAME_MS = 1000 / IDLE_FPS;
const MOBILE_INITIAL_ZOOM = 0.8;
const NEWTON_MAX_ITERATIONS = 40;
const NEWTON_KCL_RESIDUAL_TOLERANCE = 1e-12;
const NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE = 1e-8;
const NEWTON_STEP_TOLERANCE = 1e-12;
const NEWTON_BACKTRACK_STEPS = 14;
const NEWTON_SOURCE_STEPS = 20;
const MAX_DIODE_EXP_ARG = 40;
const MAX_DIODE_VOLTAGE_STEP = 0.03;
const MAX_BJT_JUNCTION_VOLTAGE_STEP = 0.12;
const OP_AMP_OPEN_LOOP_GAIN = 200000;
const OP_AMP_MIN_SUPPLY = 1;
const OP_AMP_MAX_SUPPLY = 24;
const OP_AMP_SUPPLY_STEP = 0.5;
const MAX_OP_AMP_TANH_ARG = 18;
const MAX_BJT_SATURATION_ARG = 24;
const OP_AMP_TOP_INPUT_TERMINAL_INDEX = 0;
const OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX = 1;
const OP_AMP_OUTPUT_TERMINAL_INDEX = 2;
const BJT_BASE_TERMINAL_INDEX = 0;
const BJT_COLLECTOR_TERMINAL_INDEX = 1;
const BJT_EMITTER_TERMINAL_INDEX = 2;
const BJT_MIN_BETA = 20;
const BJT_MAX_BETA = 300;
const BJT_BETA_STEP = 1;
const OCCUPIED_WIRE_EDGE_PENALTY = 40;
const NODE_PROXIMITY_PENALTY = 18;
const TURN_PENALTY = 3;
const TERMINAL_DIRECTION_MISMATCH_PENALTY = 0.75;
const MOUSE_TERMINAL_HIT_RADIUS = 0.48;
const TOUCH_TERMINAL_HIT_RADIUS = 0.78;
const DOUBLE_TAP_MAX_DELAY_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 28;
const EMPTY_TAP_MOVE_TOLERANCE_PX = 10;
const DELETE_BUTTON_HOLD_MS = 2000;
const SIMULATION_BUTTON_ICONS = {
  idle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l10-6.5z"/></svg>',
  running:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
};

const COMPONENT_DEFS = {
  voltage_source: {
    label: "Fonte V",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.3,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 10,
    editable: true,
    unit: "V",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  current_source: {
    label: "Fonte I",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.3,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 0.02,
    editable: true,
    unit: "A",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  resistor: {
    label: "Resistor",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.35,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 1000,
    editable: true,
    unit: "Ω",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  op_amp: {
    label: "Amp Op",
    terminals: [
      [-2, -1],
      [-2, 1],
      [3, 0],
    ],
    bodyHalfW: 2.2,
    bodyHalfH: 1.55,
    renderW: 5,
    renderH: 4,
    renderOffsetX: 0.5,
    defaultValue: 15,
    editable: true,
    showValueLabel: false,
    unit: "V",
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [-1, 1],
      [0, 1],
    ],
    footprintExtents: { left: 2.5, right: 3, up: 2.5, down: 2.5 },
    footprintHalf: { x: 3, y: 2.5 },
  },
  diode: {
    label: "Diodo",
    terminals: [
      [-2, 0],
      [2, 0],
    ],
    bodyHalfW: 1.35,
    bodyHalfH: 0.95,
    renderW: 4,
    renderH: 2,
    defaultValue: 0.7,
    editable: false,
    unit: "V",
    model: {
      saturationCurrent: 1e-12,
      idealityFactor: 1.2,
      thermalVoltage: 0.02585,
      gmin: 1e-9,
    },
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 1.5 },
  },
  bjt_npn: {
    label: "Trans NPN",
    terminals: [
      [-2, 0],
      [0, -2],
      [0, 2],
    ],
    bodyHalfW: 1.35,
    bodyHalfH: 1.55,
    renderW: 4,
    renderH: 4,
    defaultValue: 100,
    editable: true,
    showValueLabel: false,
    unit: "beta",
    model: {
      baseSaturationCurrent: 1e-14,
      collectorSaturationCurrent: 1e-14,
      idealityFactor: 1.2,
      thermalVoltage: 0.02585,
      gmin: 1e-9,
      saturationVoltage: 0.15,
      saturationSharpness: 0.04,
      collectorEmitterConductance: 1e-9,
    },
    obstacleCells: [
      [-1, -1],
      [0, -1],
      [1, -1],
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 2.5, y: 2.5 },
  },
  junction: {
    label: "Junção",
    terminals: [[0, 0]],
    bodyHalfW: 0,
    bodyHalfH: 0,
    renderW: 0,
    renderH: 0,
    defaultValue: 0,
    editable: false,
    obstacleCells: [],
    footprintHalf: { x: 0.25, y: 0.25 },
  },
  ground: {
    label: "Terra",
    terminals: [[0, -1]],
    bodyHalfW: 1.1,
    bodyHalfH: 1.1,
    bodyOffsetY: 0.35,
    renderW: 2,
    renderH: 2,
    defaultValue: 0,
    editable: false,
    obstacleCells: [
      [-1, 0],
      [0, 0],
      [1, 0],
      [-1, 1],
      [0, 1],
      [1, 1],
    ],
    footprintHalf: { x: 1.5, y: 1.5 },
  },
};

const COMPONENT_ORDER = ["voltage_source", "current_source", "resistor", "op_amp", "diode", "bjt_npn", "ground"];

const DEFAULT_COMPONENT_BEHAVIOR = {
  createState: () => ({}),
  buildSvg: () => buildDefaultComponentSvg(),
  formatValue: () => "",
  valueFromNormalized: () => 0,
  normalizedFromValue: () => 0,
  getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
  isSimulatedBranch: false,
  getReachabilityTerminalPairs: () => [],
  allowsIntraComponentConnection: () => false,
  getCurrentArrowTerminalPair: () => [0, 1],
  getCurrentArrowLayout: () => ({
    sideSign: 1,
    lateralOffset: 1.0,
    textOffsetExtra: 0,
  }),
  applySpriteTransform: () => {},
  drawSpriteOverlay: () => {},
  swapControl: null,
};

const COMPONENT_BEHAVIORS = {
  voltage_source: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildVoltageSourceSvg(),
    formatValue: (component) => formatVoltage(component.value),
    valueFromNormalized: (normalized) => roundTo(-24 + 48 * clamp(normalized, 0, 1), 1),
    normalizedFromValue: (component) => clamp((component.value + 24) / 48, 0, 1),
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: (component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        getCardinalValueLabelAnchor(component, 1.62),
        geometry.midX,
        geometry.midY,
        geometry.normalX,
        geometry.normalY
      ),
      lateralOffset: 1.45,
      textOffsetExtra: 0,
    }),
  },
  current_source: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildCurrentSourceSvg(),
    formatValue: (component) => formatCurrent(component.value),
    valueFromNormalized: (normalized) => snapToStep(-0.1 + 0.2 * clamp(normalized, 0, 1), 0.001),
    normalizedFromValue: (component) => clamp((component.value + 0.1) / 0.2, 0, 1),
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.05),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: 1,
      lateralOffset: 1.45,
      textOffsetExtra:
        Math.abs(geometry.dirY) > Math.abs(geometry.dirX) ? Math.max(12, state.camera.zoom * 14) : 0,
    }),
  },
  resistor: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildResistorSvg(),
    formatValue: (component) => formatResistance(component.value),
    valueFromNormalized: (normalized) => {
      const n = clamp(normalized, 0, 1);
      const exp = 6 * n;
      return quantizeResistor(Math.pow(10, exp));
    },
    normalizedFromValue: (component) => {
      const safe = clamp(component.value, 1, 1_000_000);
      return clamp(Math.log10(safe) / 6, 0, 1);
    },
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: (component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        getCardinalValueLabelAnchor(component, 1.62),
        geometry.midX,
        geometry.midY,
        geometry.normalX,
        geometry.normalY
      ),
      lateralOffset: 1.2,
      textOffsetExtra:
        Math.abs(geometry.dirY) > Math.abs(geometry.dirX) ? Math.max(10, state.camera.zoom * 12) : 0,
    }),
  },
  op_amp: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({ inputsSwapped: false }),
    buildSvg: (options = {}) => buildOpAmpSvg(options),
    formatValue: (component) => formatSymmetricVoltage(component.value),
    valueFromNormalized: (normalized) =>
      snapToStep(
        OP_AMP_MIN_SUPPLY + (OP_AMP_MAX_SUPPLY - OP_AMP_MIN_SUPPLY) * clamp(normalized, 0, 1),
        OP_AMP_SUPPLY_STEP
      ),
    normalizedFromValue: (component) => {
      const safe = clamp(Math.abs(component.value), OP_AMP_MIN_SUPPLY, OP_AMP_MAX_SUPPLY);
      return clamp((safe - OP_AMP_MIN_SUPPLY) / (OP_AMP_MAX_SUPPLY - OP_AMP_MIN_SUPPLY), 0, 1);
    },
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.2),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [],
    allowsIntraComponentConnection: (_component, firstTerminalIndex, secondTerminalIndex) => {
      const terminalPair = new Set([firstTerminalIndex, secondTerminalIndex]);
      return (
        terminalPair.has(OP_AMP_OUTPUT_TERMINAL_INDEX) &&
        (terminalPair.has(OP_AMP_TOP_INPUT_TERMINAL_INDEX) ||
          terminalPair.has(OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX))
      );
    },
    drawSpriteOverlay: (component) => drawOpAmpInputMarkers(component),
    swapControl: {
      title: "Trocar entradas do amp op",
      ariaLabel: "Trocar entradas do amp op",
      toggle(component) {
        component.inputsSwapped = !component.inputsSwapped;
        return "Entradas do amp op trocadas";
      },
    },
  },
  diode: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildDiodeSvg(),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: () => ({
      sideSign: 1,
      lateralOffset: 1.2,
      textOffsetExtra: 0,
    }),
  },
  bjt_npn: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({ collectorEmitterSwapped: false }),
    buildSvg: () => buildBjtNpnSvg(),
    formatValue: (component) => `β=${Math.round(component.value)}`,
    valueFromNormalized: (normalized) =>
      snapToStep(
        BJT_MIN_BETA + (BJT_MAX_BETA - BJT_MIN_BETA) * clamp(normalized, 0, 1),
        BJT_BETA_STEP
      ),
    normalizedFromValue: (component) => {
      const safe = clamp(component.value, BJT_MIN_BETA, BJT_MAX_BETA);
      return clamp((safe - BJT_MIN_BETA) / (BJT_MAX_BETA - BJT_MIN_BETA), 0, 1);
    },
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.1),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: (component) => {
      const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
      return [
        [BJT_BASE_TERMINAL_INDEX, collectorIndex],
        [BJT_BASE_TERMINAL_INDEX, emitterIndex],
        [collectorIndex, emitterIndex],
      ];
    },
    allowsIntraComponentConnection: (component, firstTerminalIndex, secondTerminalIndex) => {
      const { collectorIndex } = getBjtCollectorEmitterTerminalIndices(component);
      const terminalPair = new Set([firstTerminalIndex, secondTerminalIndex]);
      return terminalPair.has(BJT_BASE_TERMINAL_INDEX) && terminalPair.has(collectorIndex);
    },
    getCurrentArrowTerminalPair: (component) => {
      const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
      return [collectorIndex, emitterIndex];
    },
    getCurrentArrowLayout: (component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        getTerminalPosition(component.id, BJT_BASE_TERMINAL_INDEX),
        geometry.midX,
        geometry.midY,
        geometry.normalX,
        geometry.normalY
      ),
      lateralOffset: 1.08,
      textOffsetExtra: 0,
    }),
    applySpriteTransform: (context, component) => {
      if (component.collectorEmitterSwapped === true) {
        context.scale(1, -1);
      }
    },
    swapControl: {
      title: "Trocar coletor e emissor",
      ariaLabel: "Trocar coletor e emissor",
      toggle(component) {
        component.collectorEmitterSwapped = !component.collectorEmitterSwapped;
        return "Coletor e emissor trocados";
      },
    },
  },
  ground: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildGroundSvg(),
  },
  junction: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: () => buildGroundSvg(),
  },
};

for (const [type, def] of Object.entries(COMPONENT_DEFS)) {
  def.behavior = COMPONENT_BEHAVIORS[type] || DEFAULT_COMPONENT_BEHAVIOR;
}

function getComponentBehavior(type) {
  return COMPONENT_DEFS[type]?.behavior || DEFAULT_COMPONENT_BEHAVIOR;
}

function getInitialCameraZoom() {
  if (window.matchMedia?.("(pointer: coarse)").matches) {
    return MOBILE_INITIAL_ZOOM;
  }

  return 1;
}

const state = {
  components: [],
  wires: [],
  nextComponentId: 1,
  nextWireId: 1,
  nextSplitGroupId: 1,
  selectedComponentId: null,
  selectedWireId: null,
  pendingTerminal: null,
  simulationActive: false,
  simulationResult: null,
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
  },
};

const appEls = {
  strip: document.getElementById("component-strip"),
  canvasWrap: document.getElementById("canvas-wrap"),
  canvas: document.getElementById("circuit-canvas"),
  simulateBtn: document.getElementById("simulate-btn"),
  rotateBtn: document.getElementById("rotate-btn"),
  deleteBtn: document.getElementById("delete-btn"),
  swapOpAmpBtn: document.getElementById("swap-op-amp-btn"),
  status: document.getElementById("status-pill"),
  valueWheel: document.getElementById("value-wheel"),
  wheelPointer: document.querySelector(".wheel-pointer"),
  wheelValue: document.getElementById("wheel-value"),
  wheelTitle: document.getElementById("wheel-title"),
};

const ctx = appEls.canvas.getContext("2d");
let dpr = Math.max(1, window.devicePixelRatio || 1);
let lastCanvasW = 0;
let lastCanvasH = 0;
let statusTimer = null;
let pendingCanvasResizeFrame = null;

const renderState = {
  rafId: null,
  idleTimerId: null,
  dirty: true,
};

const wheelState = {
  dragging: false,
  pointerId: null,
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

const spriteMap = loadSprites();

buildComponentStrip();
setupCanvas();
setupButtons();
setupKeyboardShortcuts();
setupCanvasGestures();
setupWheelGestures();
setupNativeZoomGuards();
setupServiceWorker();
setupRenderLoop();

function loadSprites() {
  const sprites = {};
  for (const type of COMPONENT_ORDER) {
    const svg = buildSvgForType(type, {
      showOpAmpMarkers: type !== "op_amp",
    });
    const image = new Image();
    image.src = svgToDataUri(svg);
    sprites[type] = image;
  }
  return sprites;
}

function buildComponentStrip() {
  for (const type of COMPONENT_ORDER) {
    const def = COMPONENT_DEFS[type];
    const button = document.createElement("button");
    button.className = "comp-btn";
    button.type = "button";
    button.dataset.type = type;

    const img = document.createElement("img");
    img.alt = def.label;
    img.src = svgToDataUri(buildSvgForType(type));

    const span = document.createElement("span");
    span.textContent = def.label;

    button.append(img, span);
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
  dpr = Math.max(1, window.devicePixelRatio || 1);
  const pixelWidth = Math.max(1, Math.floor(width * dpr));
  const pixelHeight = Math.max(1, Math.floor(height * dpr));

  if (
    width === lastCanvasW &&
    height === lastCanvasH &&
    appEls.canvas.width === pixelWidth &&
    appEls.canvas.height === pixelHeight
  ) {
    requestRender(true);
    return;
  }

  appEls.canvas.width = pixelWidth;
  appEls.canvas.height = pixelHeight;

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

function setupButtons() {
  setSimulationButtonState(false);

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
      state.simulationActive = true;
      setSimulationButtonState(true);
      showStatus("Simulação DC ativa");
      return;
    }

    state.simulationActive = false;
    state.simulationResult = null;
    setSimulationButtonState(false);
    showStatus("Simulação pausada");
  });

  appEls.swapOpAmpBtn.addEventListener("click", toggleSelectedComponentTerminalOrder);
  appEls.rotateBtn.addEventListener("click", () => {
    if (state.selectedComponentId == null) return;
    const result = rotateComponentInCircuit(state, state.selectedComponentId);
    if (!result.ok) {
      showStatus(result.message || "Falha ao rotacionar componente", true);
      return;
    }

    onCircuitChanged();
  });

  setupDeleteButtonGestures();
}

function clearCircuit() {
  state.components = [];
  state.wires = [];
  state.nextComponentId = 1;
  state.nextWireId = 1;
  state.nextSplitGroupId = 1;
  state.selectedComponentId = null;
  state.selectedWireId = null;
  state.pendingTerminal = null;
  state.simulationActive = false;
  state.simulationResult = null;

  setSimulationButtonState(false);
  updateSelectionUi();
  requestRender(true);
  showStatus("Canvas limpo");
}

function setSimulationButtonState(isRunning) {
  appEls.simulateBtn.innerHTML = isRunning ? SIMULATION_BUTTON_ICONS.running : SIMULATION_BUTTON_ICONS.idle;
  appEls.simulateBtn.classList.toggle("running", isRunning);
  appEls.simulateBtn.title = isRunning ? "Pausar simulacao" : "Iniciar simulacao";
  appEls.simulateBtn.setAttribute("aria-label", isRunning ? "Pausar simulacao" : "Iniciar simulacao");
  appEls.simulateBtn.setAttribute("aria-pressed", isRunning ? "true" : "false");
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

function clearDeleteButtonHold() {
  if (deleteButtonHoldState.timerId == null) return;

  clearTimeout(deleteButtonHoldState.timerId);
  deleteButtonHoldState.timerId = null;
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

    const footprint = getFootprintExtents({ type: "ground", rotation });
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
    if (state.selectedComponentId == null && state.selectedWireId == null) return;

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
  }
}

function isEditableTarget(target) {
  if (!target || typeof target !== "object") return false;
  if (target.isContentEditable) return true;

  const tagName = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
  return tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
}

function setupCanvasGestures() {
  appEls.canvas.addEventListener(
    "touchstart",
    (event) => {
      event.preventDefault();

      if (event.touches.length >= 2) {
        clearEmptyCanvasTapHistory();
        startPinch(event.touches);
        return;
      }

      if (event.touches.length === 1) {
        startSingleTouch(event.touches[0]);
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchmove",
    (event) => {
      event.preventDefault();

      if (state.pointer.mode === "panzoom" && event.touches.length >= 2) {
        movePinch(event.touches);
        return;
      }

      if (state.pointer.mode === "drag" && event.touches.length >= 1) {
        const touch = findTouchById(event.touches, state.pointer.activeTouchId);
        if (touch) {
          moveDrag(touch);
        }
        return;
      }

      if (state.pointer.mode === "pan" && event.touches.length >= 1) {
        const touch = findTouchById(event.touches, state.pointer.activeTouchId);
        if (touch) {
          movePan(touch);
        }
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchend",
    (event) => {
      event.preventDefault();

      if (state.pointer.mode === "panzoom") {
        if (event.touches.length < 2) {
          state.pointer.mode = "none";
        }
        return;
      }

      if (state.pointer.mode === "drag") {
        const ended = Array.from(event.changedTouches).some(
          (touch) => touch.identifier === state.pointer.activeTouchId
        );
        if (ended) {
          state.pointer.mode = "none";
          state.pointer.activeTouchId = null;
          state.pointer.dragComponentId = null;
          state.pointer.emptyTapCandidate = false;
        }
        return;
      }

      if (state.pointer.mode === "pan") {
        const endedTouch = Array.from(event.changedTouches).find(
          (touch) => touch.identifier === state.pointer.activeTouchId
        );
        if (endedTouch) {
          const wasTap = state.pointer.emptyTapCandidate === true;
          const tapPoint = clientToCanvas(endedTouch.clientX, endedTouch.clientY);
          state.pointer.mode = "none";
          state.pointer.activeTouchId = null;
          state.pointer.emptyTapCandidate = false;

          if (wasTap) {
            const worldPoint = screenToWorld(tapPoint.x, tapPoint.y);
            if (isCanvasPointEmpty(worldPoint.x, worldPoint.y, TOUCH_TERMINAL_HIT_RADIUS)) {
              registerEmptyCanvasTap(
                tapPoint.x,
                tapPoint.y,
                event.timeStamp || Date.now()
              );
            } else {
              clearEmptyCanvasTapHistory();
            }
          }
        }
      }
    },
    { passive: false }
  );

  appEls.canvas.addEventListener(
    "touchcancel",
    (event) => {
      event.preventDefault();
      state.pointer.mode = "none";
      state.pointer.activeTouchId = null;
      state.pointer.dragComponentId = null;
      state.pointer.emptyTapCandidate = false;
      clearEmptyCanvasTapHistory();
    },
    { passive: false }
  );

  appEls.canvas.addEventListener("mousedown", (event) => {
    if (event.button !== 0) return;
    const point = clientToWorld(event.clientX, event.clientY);
    const terminalHit = pickTerminal(point.x, point.y, MOUSE_TERMINAL_HIT_RADIUS);
    if (terminalHit) {
      handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
      return;
    }

    const compHit = pickComponentBody(point.x, point.y);
    if (compHit) {
      selectComponent(compHit.id);
      state.pointer.mode = "mouse-drag";
      state.pointer.dragComponentId = compHit.id;
      state.pointer.dragOffsetX = point.x - compHit.x;
      state.pointer.dragOffsetY = point.y - compHit.y;
      return;
    }

    const wireHit = pickWire(point.x, point.y);
    if (wireHit) {
      if (state.pendingTerminal) {
        handleWireTap(wireHit);
        return;
      }

      selectWire(wireHit.wire.id);
      return;
    }

    clearSelection();
    startMousePan(event);
  });

  appEls.canvas.addEventListener(
    "dblclick",
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();

      const worldPoint = clientToWorld(event.clientX, event.clientY);
      if (!isCanvasPointEmpty(worldPoint.x, worldPoint.y, MOUSE_TERMINAL_HIT_RADIUS)) {
        return;
      }

      const screenPoint = clientToCanvas(event.clientX, event.clientY);
      state.pointer.mode = "none";
      state.pointer.dragComponentId = null;
      resetZoomToDefaultAtPoint(screenPoint.x, screenPoint.y);
      clearEmptyCanvasTapHistory();
    },
    { passive: false }
  );

  window.addEventListener("mousemove", (event) => {
    if (state.pointer.mode === "mouse-drag") {
      const component = getComponentById(state.pointer.dragComponentId);
      if (!component) return;

      const point = clientToWorld(event.clientX, event.clientY);
      const targetX = Math.round(point.x - state.pointer.dragOffsetX);
      const targetY = Math.round(point.y - state.pointer.dragOffsetY);
      if (targetX === component.x && targetY === component.y) return;
      tryMoveComponent(component.id, targetX, targetY);
      return;
    }

    if (state.pointer.mode === "mouse-pan") {
      moveMousePan(event);
    }
  });

  window.addEventListener("mouseup", () => {
    if (state.pointer.mode === "mouse-drag" || state.pointer.mode === "mouse-pan") {
      state.pointer.mode = "none";
      state.pointer.dragComponentId = null;
    }
  });

  appEls.canvas.addEventListener(
    "wheel",
    (event) => {
      event.preventDefault();
      const direction = event.deltaY > 0 ? -1 : 1;
      const factor = direction > 0 ? 1.08 : 0.92;
      const point = clientToCanvas(event.clientX, event.clientY);
      zoomAroundPoint(point.x, point.y, state.camera.zoom * factor);
    },
    { passive: false }
  );
}

function setupWheelGestures() {
  appEls.valueWheel.addEventListener("pointerdown", (event) => {
    if (state.selectedComponentId == null) return;
    const component = getComponentById(state.selectedComponentId);
    if (!component || !COMPONENT_DEFS[component.type].editable) return;

    wheelState.dragging = true;
    wheelState.pointerId = event.pointerId;
    appEls.valueWheel.setPointerCapture(event.pointerId);
    updateValueFromWheelPointer(event.clientX, event.clientY);
  });

  appEls.valueWheel.addEventListener("pointermove", (event) => {
    if (!wheelState.dragging || wheelState.pointerId !== event.pointerId) return;
    updateValueFromWheelPointer(event.clientX, event.clientY);
  });

  appEls.valueWheel.addEventListener("pointerup", (event) => {
    if (wheelState.pointerId !== event.pointerId) return;
    wheelState.dragging = false;
    wheelState.pointerId = null;
    try {
      appEls.valueWheel.releasePointerCapture(event.pointerId);
    } catch (_) {}
  });

  appEls.valueWheel.addEventListener("pointercancel", () => {
    wheelState.dragging = false;
    wheelState.pointerId = null;
  });
}

function setupNativeZoomGuards() {
  document.addEventListener(
    "dblclick",
    (event) => {
      event.preventDefault();
    },
    { passive: false }
  );

  const preventGesture = (event) => {
    event.preventDefault();
  };

  document.addEventListener("gesturestart", preventGesture, { passive: false });
  document.addEventListener("gesturechange", preventGesture, { passive: false });
  document.addEventListener("gestureend", preventGesture, { passive: false });
}

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

  drawScene();
  renderState.dirty = false;

  if (isHighFpsInteractionActive()) {
    renderState.rafId = requestAnimationFrame(renderLoop);
    return;
  }

  scheduleRender(false);
}

function drawScene() {
  const width = appEls.canvas.clientWidth;
  const height = appEls.canvas.clientHeight;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  drawGrid(width, height);
  drawWires();
  drawComponents();

  if (state.pendingTerminal) {
    const terminal = getTerminalPosition(state.pendingTerminal.componentId, state.pendingTerminal.terminalIndex);
    if (terminal) {
      const sp = worldToScreen(terminal.x, terminal.y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#f59e0b";
      ctx.stroke();
    }
  }

  if (state.simulationActive && state.simulationResult?.ok) {
    drawSimulationAnnotations(state.simulationResult.data);
  }
}

function drawGrid(width, height) {
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  const minX = Math.floor(topLeft.x) - 1;
  const maxX = Math.ceil(bottomRight.x) + 1;
  const minY = Math.floor(topLeft.y) - 1;
  const maxY = Math.ceil(bottomRight.y) + 1;

  const r = Math.max(0.8, Math.min(1.8, state.camera.zoom * 1.15));
  ctx.fillStyle = "rgba(15, 23, 42, 0.2)";

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      const sp = worldToScreen(x, y);
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawWires() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (const wire of state.wires) {
    if (!wire.path || wire.path.length < 2) continue;

    ctx.beginPath();
    wire.path.forEach((point, index) => {
      const sp = worldToScreen(point.x, point.y);
      if (index === 0) {
        ctx.moveTo(sp.x, sp.y);
      } else {
        ctx.lineTo(sp.x, sp.y);
      }
    });

    const isSelected = state.selectedWireId === wire.id;
    ctx.lineWidth = Math.max(2.1, state.camera.zoom * 2.4) + (isSelected ? 1.9 : 0);
    ctx.strokeStyle = isSelected ? "#ea580c" : "#0f172a";
    ctx.stroke();
  }
}

function drawComponents() {
  for (const component of state.components) {
    const def = COMPONENT_DEFS[component.type];
    const behavior = getComponentBehavior(component.type);
    const sprite = spriteMap[component.type];
    const center = worldToScreen(component.x, component.y);
    const width = worldLengthToScreen(def.renderW);
    const height = worldLengthToScreen(def.renderH);
    const renderOffsetX = worldLengthToScreen(def.renderOffsetX || 0);
    const renderOffsetY = worldLengthToScreen(def.renderOffsetY || 0);

    ctx.save();
    ctx.translate(center.x, center.y);
    ctx.rotate(degToRad(component.rotation));
    behavior.applySpriteTransform(ctx, component);

    if (sprite?.complete) {
      ctx.drawImage(sprite, -width / 2 + renderOffsetX, -height / 2 + renderOffsetY, width, height);
    } else if (width > 0 && height > 0) {
      ctx.fillStyle = "#dbe4ef";
      ctx.fillRect(-width / 2 + renderOffsetX, -height / 2 + renderOffsetY, width, height);
    }

    behavior.drawSpriteOverlay(component);

    if (state.selectedComponentId === component.id) {
      ctx.strokeStyle = "#0ea5a8";
      ctx.lineWidth = 2;
      ctx.strokeRect(-width / 2 + renderOffsetX - 4, -height / 2 + renderOffsetY - 4, width + 8, height + 8);
    }

    ctx.restore();

    const terminalCount = def.terminals.length;
    for (let i = 0; i < terminalCount; i += 1) {
      const tp = getTerminalPosition(component.id, i);
      if (!tp) continue;
      const sp = worldToScreen(tp.x, tp.y);
      const connected = isTerminalConnected(component.id, i);
      const isPending =
        state.pendingTerminal &&
        state.pendingTerminal.componentId === component.id &&
        state.pendingTerminal.terminalIndex === i;
      const radius = getTerminalRenderRadius(component.type);

      ctx.beginPath();
      ctx.arc(sp.x, sp.y, radius, 0, Math.PI * 2);
      ctx.fillStyle =
        component.type === "junction" ? "#0f172a" : isPending ? "#f59e0b" : connected ? "#0f172a" : "#f8fafc";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = component.type === "junction" || connected ? "#0f172a" : "#334155";
      ctx.stroke();
    }

    if (def.editable && def.showValueLabel !== false) {
      const labelPoint = getValueLabelAnchor(component);
      const screenPoint = worldToScreen(labelPoint.x, labelPoint.y);
      const valueText = formatComponentValue(component);
      ctx.font = `${Math.max(13, 13 * state.camera.zoom)}px "Avenir Next", sans-serif`;
      ctx.fillStyle = "#0f172a";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(valueText, screenPoint.x, screenPoint.y);
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

function drawOpAmpInputMarkers(component) {
  const def = COMPONENT_DEFS.op_amp;
  const { plusIndex, minusIndex } = getOpAmpInputTerminalIndices(component);
  const plusBase = def.terminals[plusIndex];
  const minusBase = def.terminals[minusIndex];
  if (!plusBase || !minusBase) return;

  const markerOffsetX = 1.25;
  const halfSpan = Math.max(4.8, worldLengthToScreen(0.18));
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = Math.max(2.2, state.camera.zoom * 2.2);
  ctx.lineCap = "round";

  drawOpAmpMarkerAt(
    worldLengthToScreen(plusBase[0] + markerOffsetX),
    worldLengthToScreen(plusBase[1]),
    halfSpan,
    true
  );
  drawOpAmpMarkerAt(
    worldLengthToScreen(minusBase[0] + markerOffsetX),
    worldLengthToScreen(minusBase[1]),
    halfSpan,
    false
  );
}

function drawOpAmpMarkerAt(x, y, halfSpan, isPlus) {
  ctx.beginPath();
  ctx.moveTo(x - halfSpan, y);
  ctx.lineTo(x + halfSpan, y);

  if (isPlus) {
    ctx.moveTo(x, y - halfSpan);
    ctx.lineTo(x, y + halfSpan);
  }

  ctx.stroke();
}

function drawSimulationAnnotations(data) {
  if (!data) return;

  for (const marker of data.nodeMarkers) {
    const sp = worldToScreen(marker.x, marker.y);
    const label = `${formatVoltage(marker.voltage)}`;

    ctx.font = '12px "Avenir Next", sans-serif';
    const textW = ctx.measureText(label).width;
    const padX = 7;
    const boxW = textW + padX * 2;
    const boxH = 20;
    const placement = getNodeMarkerPlacement(sp, boxW, boxH, marker.labelDirection);

    ctx.fillStyle = "rgba(15, 23, 42, 0.86)";
    roundedRect(ctx, placement.boxX, placement.boxY, boxW, boxH, 8);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, placement.textX, placement.textY);
  }

  for (const component of state.components) {
    const current = data.componentCurrents.get(component.id);
    if (current == null || component.type === "ground") continue;
    drawCurrentArrow(component, current);
  }
}

function getCurrentArrowTerminalPair(component) {
  return getComponentBehavior(component.type).getCurrentArrowTerminalPair(component);
}

function getNodeMarkerPlacement(screenPoint, boxW, boxH, labelDirection = "up") {
  const gap = 8;

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

function drawCurrentArrow(component, current) {
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

  ctx.strokeStyle = "#dc2626";
  ctx.fillStyle = "#dc2626";
  ctx.lineWidth = Math.max(2.8, state.camera.zoom * 3.2);

  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();

  const arrowLen = Math.max(12, state.camera.zoom * 14);
  const arrowSpread = 0.46;
  const angle = Math.atan2(e.y - s.y, e.x - s.x);
  const tipAdvance = Math.max(2.2, ctx.lineWidth * 0.9);
  const tipX = e.x + Math.cos(angle) * tipAdvance;
  const tipY = e.y + Math.sin(angle) * tipAdvance;
  ctx.beginPath();
  ctx.moveTo(tipX, tipY);
  ctx.lineTo(
    tipX - arrowLen * Math.cos(angle - arrowSpread),
    tipY - arrowLen * Math.sin(angle - arrowSpread)
  );
  ctx.lineTo(
    tipX - arrowLen * Math.cos(angle + arrowSpread),
    tipY - arrowLen * Math.sin(angle + arrowSpread)
  );
  ctx.closePath();
  ctx.fill();

  const text = formatCurrent(signed);
  ctx.font = `${Math.max(14, 14 * state.camera.zoom)}px "Avenir Next", sans-serif`;
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

  ctx.fillStyle = "#7f1d1d";
  ctx.textAlign = textAlign;
  ctx.textBaseline = textBaseline;
  ctx.fillText(text, textX, textY);
}

function startSingleTouch(touch) {
  const point = clientToWorld(touch.clientX, touch.clientY);

  const terminalHit = pickTerminal(point.x, point.y, TOUCH_TERMINAL_HIT_RADIUS);
  if (terminalHit) {
    clearEmptyCanvasTapHistory();
    handleTerminalTap(terminalHit.componentId, terminalHit.terminalIndex);
    state.pointer.mode = "none";
    return;
  }

  const componentHit = pickComponentBody(point.x, point.y);
  if (componentHit) {
    clearEmptyCanvasTapHistory();
    selectComponent(componentHit.id);
    state.pointer.mode = "drag";
    state.pointer.activeTouchId = touch.identifier;
    state.pointer.dragComponentId = componentHit.id;
    state.pointer.dragOffsetX = point.x - componentHit.x;
    state.pointer.dragOffsetY = point.y - componentHit.y;
    return;
  }

  const wireHit = pickWire(point.x, point.y);
  if (wireHit) {
    clearEmptyCanvasTapHistory();
    if (state.pendingTerminal) {
      handleWireTap(wireHit);
      state.pointer.mode = "none";
      return;
    }

    selectWire(wireHit.wire.id);
    state.pointer.mode = "none";
    return;
  }

  clearSelection();
  startPan(touch);
}

function moveDrag(touch) {
  const component = getComponentById(state.pointer.dragComponentId);
  if (!component) return;

  const point = clientToWorld(touch.clientX, touch.clientY);
  const targetX = Math.round(point.x - state.pointer.dragOffsetX);
  const targetY = Math.round(point.y - state.pointer.dragOffsetY);

  if (targetX === component.x && targetY === component.y) return;

  tryMoveComponent(component.id, targetX, targetY);
}

function startPan(touch) {
  const point = clientToCanvas(touch.clientX, touch.clientY);
  state.pointer.mode = "pan";
  state.pointer.activeTouchId = touch.identifier;
  state.pointer.initialMidX = point.x;
  state.pointer.initialMidY = point.y;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.emptyTapCandidate = true;
  state.pointer.tapStartScreenX = point.x;
  state.pointer.tapStartScreenY = point.y;
  requestRender(true);
}

function movePan(touch) {
  const point = clientToCanvas(touch.clientX, touch.clientY);
  if (
    state.pointer.emptyTapCandidate &&
    distance(
      point.x,
      point.y,
      state.pointer.tapStartScreenX,
      state.pointer.tapStartScreenY
    ) > EMPTY_TAP_MOVE_TOLERANCE_PX
  ) {
    state.pointer.emptyTapCandidate = false;
    clearEmptyCanvasTapHistory();
  }

  state.camera.offsetX = state.pointer.initialOffsetX + (point.x - state.pointer.initialMidX);
  state.camera.offsetY = state.pointer.initialOffsetY + (point.y - state.pointer.initialMidY);
  requestRender();
}

function startMousePan(event) {
  const point = clientToCanvas(event.clientX, event.clientY);
  state.pointer.mode = "mouse-pan";
  state.pointer.initialMidX = point.x;
  state.pointer.initialMidY = point.y;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.emptyTapCandidate = false;
  requestRender(true);
}

function moveMousePan(event) {
  const point = clientToCanvas(event.clientX, event.clientY);
  state.camera.offsetX = state.pointer.initialOffsetX + (point.x - state.pointer.initialMidX);
  state.camera.offsetY = state.pointer.initialOffsetY + (point.y - state.pointer.initialMidY);
  requestRender();
}

function startPinch(touches) {
  const t0 = touches[0];
  const t1 = touches[1];
  const p0 = clientToCanvas(t0.clientX, t0.clientY);
  const p1 = clientToCanvas(t1.clientX, t1.clientY);
  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5;
  const dist = distance(p0.x, p0.y, p1.x, p1.y);

  state.pointer.mode = "panzoom";
  state.pointer.initialDistance = Math.max(0.0001, dist);
  state.pointer.initialZoom = state.camera.zoom;
  state.pointer.initialOffsetX = state.camera.offsetX;
  state.pointer.initialOffsetY = state.camera.offsetY;
  state.pointer.initialMidX = midX;
  state.pointer.initialMidY = midY;

  const world = screenToWorld(midX, midY, state.pointer.initialZoom, state.pointer.initialOffsetX, state.pointer.initialOffsetY);
  state.pointer.worldAtMidX = world.x;
  state.pointer.worldAtMidY = world.y;
  requestRender(true);
}

function movePinch(touches) {
  const t0 = touches[0];
  const t1 = touches[1];
  const p0 = clientToCanvas(t0.clientX, t0.clientY);
  const p1 = clientToCanvas(t1.clientX, t1.clientY);
  const midX = (p0.x + p1.x) * 0.5;
  const midY = (p0.y + p1.y) * 0.5;
  const dist = distance(p0.x, p0.y, p1.x, p1.y);

  const scale = dist / state.pointer.initialDistance;
  const newZoom = clamp(state.pointer.initialZoom * scale, MIN_ZOOM, MAX_ZOOM);

  state.camera.zoom = newZoom;
  state.camera.offsetX = midX - state.pointer.worldAtMidX * GRID_SIZE * newZoom;
  state.camera.offsetY = midY - state.pointer.worldAtMidY * GRID_SIZE * newZoom;
  requestRender();
}

function zoomAroundPoint(screenX, screenY, targetZoom) {
  const newZoom = clamp(targetZoom, MIN_ZOOM, MAX_ZOOM);
  const world = screenToWorld(screenX, screenY);
  state.camera.zoom = newZoom;
  state.camera.offsetX = screenX - world.x * GRID_SIZE * newZoom;
  state.camera.offsetY = screenY - world.y * GRID_SIZE * newZoom;
  requestRender();
}

function resetZoomToDefaultAtPoint(screenX, screenY) {
  if (Math.abs(state.camera.zoom - 1) <= 1e-9) {
    return false;
  }

  zoomAroundPoint(screenX, screenY, 1);
  return true;
}

function clearEmptyCanvasTapHistory() {
  emptyCanvasTapState.lastTimestamp = 0;
}

function registerEmptyCanvasTap(screenX, screenY, timestamp = Date.now()) {
  const isDoubleTap =
    timestamp - emptyCanvasTapState.lastTimestamp <= DOUBLE_TAP_MAX_DELAY_MS &&
    distance(
      screenX,
      screenY,
      emptyCanvasTapState.lastScreenX,
      emptyCanvasTapState.lastScreenY
    ) <= DOUBLE_TAP_MAX_DISTANCE_PX;

  emptyCanvasTapState.lastTimestamp = timestamp;
  emptyCanvasTapState.lastScreenX = screenX;
  emptyCanvasTapState.lastScreenY = screenY;

  if (!isDoubleTap) {
    return false;
  }

  clearEmptyCanvasTapHistory();
  return resetZoomToDefaultAtPoint(screenX, screenY);
}

function isCanvasPointEmpty(worldX, worldY, terminalThreshold) {
  return (
    !pickTerminal(worldX, worldY, terminalThreshold) &&
    !pickComponentBody(worldX, worldY) &&
    !pickWire(worldX, worldY)
  );
}

function findTouchById(touchList, id) {
  for (let i = 0; i < touchList.length; i += 1) {
    if (touchList[i].identifier === id) return touchList[i];
  }
  return null;
}

function handleTerminalTap(componentId, terminalIndex) {
  if (state.selectedWireId != null) {
    state.selectedWireId = null;
    updateSelectionUi();
  }

  if (!state.pendingTerminal) {
    state.pendingTerminal = { componentId, terminalIndex };
    requestRender(true);
    return;
  }

  const first = state.pendingTerminal;
  if (first.componentId === componentId && first.terminalIndex === terminalIndex) {
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  if (first.componentId === componentId) {
    if (isIntraComponentConnectionAllowed(componentId, first.terminalIndex, terminalIndex)) {
      // Allow explicit feedback/short pairs declared by the component behavior.
    } else {
      showStatus("Conexão no mesmo componente não permitida", true);
      state.pendingTerminal = null;
      requestRender(true);
      return;
    }
  }
  if (
    hasDirectWireBetween(
      first.componentId,
      first.terminalIndex,
      componentId,
      terminalIndex
    )
  ) {
    showStatus("Conexão já existe", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const start = getTerminalPosition(first.componentId, first.terminalIndex);
  const end = getTerminalPosition(componentId, terminalIndex);
  if (!start || !end) {
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const route = routeWire(start, end, buildRouteTerminalOptions(first, { componentId, terminalIndex }));
  if (!route) {
    showStatus("Não foi possível rotear o fio", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  state.wires.push({
    id: state.nextWireId++,
    from: { componentId: first.componentId, terminalIndex: first.terminalIndex },
    to: { componentId, terminalIndex },
    path: route,
  });

  state.pendingTerminal = null;
  onCircuitChanged();
}

function isIntraComponentConnectionAllowed(componentId, firstTerminalIndex, secondTerminalIndex) {
  if (firstTerminalIndex === secondTerminalIndex) return false;

  const component = getComponentById(componentId);
  if (!component) return false;

  return getComponentBehavior(component.type).allowsIntraComponentConnection(
    component,
    firstTerminalIndex,
    secondTerminalIndex
  );
}

function handleWireTap(wireHit) {
  if (!state.pendingTerminal) {
    selectWire(wireHit.wire.id);
    return;
  }

  if (state.selectedWireId != null) {
    state.selectedWireId = null;
    updateSelectionUi();
  }

  const endpoint = getWireEndpointAtPoint(wireHit.wire, wireHit.point);
  if (endpoint) {
    handleTerminalTap(endpoint.componentId, endpoint.terminalIndex);
    return;
  }

  const pending = state.pendingTerminal;
  const start = getTerminalPosition(pending.componentId, pending.terminalIndex);
  if (!start) {
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const splitPaths = splitWirePathAtPoint(wireHit.wire.path, wireHit.segmentIndex, wireHit.point);
  if (!splitPaths) {
    showStatus("Nao foi possivel dividir o fio", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const junction = buildJunctionComponent(wireHit.point);
  if (!isComponentPlacementValid(junction, null, 0)) {
    showStatus("Nao foi possivel criar a juncao", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const branchRoute = routeWire(start, wireHit.point, buildRouteTerminalOptions(pending));
  if (!branchRoute) {
    showStatus("Nao foi possivel conectar ao fio", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  const splitWires = buildSplitWires(wireHit.wire, junction.id, splitPaths);
  const branchWire = {
    id: state.nextWireId + 2,
    from: cloneTerminalRef(pending),
    to: { componentId: junction.id, terminalIndex: 0 },
    path: branchRoute,
  };

  const result = replaceWireWithTap(wireHit.wire.id, junction, splitWires, branchWire);
  if (!result.ok) {
    showStatus(result.message || "Nao foi possivel criar a derivacao", true);
    state.pendingTerminal = null;
    requestRender(true);
    return;
  }

  state.pendingTerminal = null;
  onCircuitChanged();
}

function hasDirectWireBetween(aComponentId, aTerminalIndex, bComponentId, bTerminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === aComponentId &&
        wire.from.terminalIndex === aTerminalIndex &&
        wire.to.componentId === bComponentId &&
        wire.to.terminalIndex === bTerminalIndex) ||
      (wire.from.componentId === bComponentId &&
        wire.from.terminalIndex === bTerminalIndex &&
        wire.to.componentId === aComponentId &&
        wire.to.terminalIndex === aTerminalIndex)
  );
}

function addComponent(type) {
  const spot = findEmptySpot(type);
  if (!spot) {
    showStatus("Sem espaço livre no canvas", true);
    return;
  }

  const result = addComponentToCircuit(state, type, spot);
  if (!result.ok) {
    showStatus(result.message || "Falha ao adicionar componente", true);
    return;
  }

  selectComponent(result.component.id);
  onCircuitChanged();
}

function addComponentToCircuit(circuit, type, position) {
  const def = COMPONENT_DEFS[type];
  if (!def) {
    return { ok: false, message: "Tipo de componente invalido" };
  }

  if (!position) {
    return { ok: false, message: "Posicao invalida" };
  }

  const behavior = getComponentBehavior(type);
  const component = {
    id: circuit.nextComponentId,
    type,
    x: position.x,
    y: position.y,
    rotation: 0,
    value: def.defaultValue,
    ...behavior.createState(),
  };

  if (!isComponentPlacementValidForComponents(circuit.components, component, null, 0)) {
    return { ok: false, message: "Posicao ocupada" };
  }

  circuit.components.push(component);
  circuit.nextComponentId += 1;
  return { ok: true, component };
}

function buildJunctionComponent(point) {
  return buildJunctionComponentForCircuit(state, point);
}

function buildJunctionComponentForCircuit(circuit, point) {
  return {
    id: circuit.nextComponentId,
    type: "junction",
    x: point.x,
    y: point.y,
    rotation: 0,
    value: 0,
  };
}

function buildSplitWires(originalWire, junctionId, splitPaths) {
  return buildSplitWiresForCircuit(state, originalWire, junctionId, splitPaths);
}

function buildSplitWiresForCircuit(circuit, originalWire, junctionId, splitPaths) {
  const splitGroupId = circuit.nextSplitGroupId;
  const originalPath = clonePath(originalWire.path);
  const originalFrom = cloneTerminalRef(originalWire.from);
  const originalTo = cloneTerminalRef(originalWire.to);

  return [
    {
      id: circuit.nextWireId,
      from: cloneTerminalRef(originalWire.from),
      to: { componentId: junctionId, terminalIndex: 0 },
      path: splitPaths.firstPath,
      splitGroupId,
      splitGroupRole: "from",
      splitOriginalPath: originalPath,
      splitOriginalFrom: originalFrom,
      splitOriginalTo: originalTo,
    },
    {
      id: circuit.nextWireId + 1,
      from: { componentId: junctionId, terminalIndex: 0 },
      to: cloneTerminalRef(originalWire.to),
      path: splitPaths.secondPath,
      splitGroupId,
      splitGroupRole: "to",
      splitOriginalPath: originalPath,
      splitOriginalFrom: originalFrom,
      splitOriginalTo: originalTo,
    },
  ];
}

function replaceWireWithTap(originalWireId, junction, splitWires, branchWire) {
  return replaceWireWithTapInCircuit(state, originalWireId, junction, splitWires, branchWire);
}

function replaceWireWithTapInCircuit(circuit, originalWireId, junction, splitWires, branchWire) {
  if (!getWireByIdFromCollection(circuit.wires, originalWireId)) {
    return { ok: false, message: "Fio original nao encontrado" };
  }

  circuit.wires = circuit.wires.filter((wire) => wire.id !== originalWireId);
  circuit.components.push(junction);
  circuit.wires.push(...splitWires, branchWire);
  circuit.nextComponentId += 1;
  circuit.nextWireId += 3;
  circuit.nextSplitGroupId += 1;
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true };
}

function splitWirePathAtPoint(path, segmentIndex, point) {
  if (!path || path.length < 2) return null;
  if (segmentIndex < 0 || segmentIndex >= path.length - 1) return null;

  const start = path[segmentIndex];
  const end = path[segmentIndex + 1];
  if (!pointOnSegment(point, start, end)) return null;

  if (sameGridPoint(point, path[0]) || sameGridPoint(point, path[path.length - 1])) {
    return null;
  }

  const firstPath = clonePath(path.slice(0, segmentIndex + 1));
  if (!sameGridPoint(firstPath[firstPath.length - 1], point)) {
    firstPath.push(clonePoint(point));
  }

  const secondPath = [clonePoint(point)];
  if (!sameGridPoint(point, end)) {
    secondPath.push(clonePoint(end));
  }

  for (let i = segmentIndex + 2; i < path.length; i += 1) {
    secondPath.push(clonePoint(path[i]));
  }

  if (firstPath.length < 2 || secondPath.length < 2) {
    return null;
  }

  return {
    firstPath: simplifyOrthogonalPath(firstPath),
    secondPath: simplifyOrthogonalPath(secondPath),
  };
}

function getWireEndpointAtPoint(wire, point) {
  if (sameGridPoint(point, wire.path[0])) {
    return wire.from;
  }

  if (sameGridPoint(point, wire.path[wire.path.length - 1])) {
    return wire.to;
  }

  return null;
}

function findEmptySpot(type) {
  const def = COMPONENT_DEFS[type];
  if (!def) return null;

  const center = screenToWorld(appEls.canvas.clientWidth * 0.5, appEls.canvas.clientHeight * 0.5);
  const visible = getVisibleWorldBounds();
  const margin = 1;
  const footprint = getFootprintExtents({ type, rotation: 0 });

  const minX = Math.ceil(visible.minX + footprint.left + margin);
  const maxX = Math.floor(visible.maxX - footprint.right - margin);
  const minY = Math.ceil(visible.minY + footprint.up + margin);
  const maxY = Math.floor(visible.maxY - footprint.down - margin);

  if (minX > maxX || minY > maxY) return null;

  const baseX = clamp(Math.round(center.x), minX, maxX);
  const baseY = clamp(Math.round(center.y), minY, maxY);

  const candidate = { id: -1, type, x: baseX, y: baseY, rotation: 0 };
  if (isComponentPlacementValid(candidate, null, 2)) {
    return { x: baseX, y: baseY };
  }

  const maxRing = Math.max(maxX - minX, maxY - minY);
  for (let ring = 1; ring <= maxRing; ring += 1) {
    for (let x = baseX - ring; x <= baseX + ring; x += 1) {
      if (x < minX || x > maxX) continue;

      const topY = baseY - ring;
      if (topY >= minY && topY <= maxY) {
        candidate.x = x;
        candidate.y = topY;
        if (isComponentPlacementValid(candidate, null, 2)) return { x, y: topY };
      }

      const bottomY = baseY + ring;
      if (bottomY >= minY && bottomY <= maxY) {
        candidate.x = x;
        candidate.y = bottomY;
        if (isComponentPlacementValid(candidate, null, 2)) return { x, y: bottomY };
      }
    }

    for (let y = baseY - ring + 1; y <= baseY + ring - 1; y += 1) {
      if (y < minY || y > maxY) continue;

      const leftX = baseX - ring;
      if (leftX >= minX && leftX <= maxX) {
        candidate.x = leftX;
        candidate.y = y;
        if (isComponentPlacementValid(candidate, null, 2)) return { x: leftX, y };
      }

      const rightX = baseX + ring;
      if (rightX >= minX && rightX <= maxX) {
        candidate.x = rightX;
        candidate.y = y;
        if (isComponentPlacementValid(candidate, null, 2)) return { x: rightX, y };
      }
    }
  }

  return null;
}

function snapshotWirePaths(wires) {
  const previousPaths = new Map();
  for (const wire of wires) {
    previousPaths.set(wire.id, wire.path);
  }
  return previousPaths;
}

function restoreWirePaths(wires, previousPaths) {
  for (const wire of wires) {
    if (previousPaths.has(wire.id)) {
      wire.path = previousPaths.get(wire.id);
    }
  }
}

function tryMoveComponent(componentId, targetX, targetY) {
  const result = moveComponentInCircuit(state, componentId, targetX, targetY);
  if (result.ok) {
    onCircuitChanged();
  }
  return result.ok;
}

function moveComponentInCircuit(circuit, componentId, targetX, targetY) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  if (targetX === component.x && targetY === component.y) {
    return { ok: true, component };
  }

  const previousPosition = { x: component.x, y: component.y };
  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  const previousPaths = snapshotWirePaths(linkedWires);

  component.x = targetX;
  component.y = targetY;

  if (!isComponentPlacementValidForComponents(circuit.components, component, component.id, 0)) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    return { ok: false };
  }

  if (!rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    restoreWirePaths(linkedWires, previousPaths);
    return { ok: false };
  }

  return { ok: true, component };
}

function rotateComponentInCircuit(circuit, componentId, step = 90) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const previousRotation = component.rotation;
  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  const previousPaths = snapshotWirePaths(linkedWires);

  component.rotation = normalizeRotation(component.rotation + step);

  if (!isComponentPlacementValidForComponents(circuit.components, component, component.id, 0)) {
    component.rotation = previousRotation;
    return { ok: false, message: "Rotacao bloqueada por colisao" };
  }

  if (!rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.rotation = previousRotation;
    restoreWirePaths(linkedWires, previousPaths);
    return { ok: false, message: "Sem rota livre para os fios" };
  }

  return { ok: true, component };
}

function toggleComponentTerminalOrderInCircuit(circuit, componentId) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const swapControl = getComponentBehavior(component.type).swapControl;
  if (!swapControl) {
    return { ok: false };
  }

  const message = swapControl.toggle(component);
  return { ok: true, component, message };
}

function isComponentPlacementValidForComponents(components, candidate, ignoreId = null, padding = 0) {
  for (const component of components) {
    if (ignoreId != null && component.id === ignoreId) continue;
    if (componentsOverlap(candidate, component, padding)) {
      return false;
    }
  }
  return true;
}

function isComponentPlacementValid(candidate, ignoreId = null, padding = 0) {
  return isComponentPlacementValidForComponents(state.components, candidate, ignoreId, padding);
}

function componentsOverlap(a, b, padding = 0) {
  const fa = getFootprintExtents(a);
  const fb = getFootprintExtents(b);

  const aLeft = a.x - fa.left;
  const aRight = a.x + fa.right;
  const aTop = a.y - fa.up;
  const aBottom = a.y + fa.down;

  const bLeft = b.x - fb.left;
  const bRight = b.x + fb.right;
  const bTop = b.y - fb.up;
  const bBottom = b.y + fb.down;

  return (
    aLeft < bRight + padding &&
    aRight + padding > bLeft &&
    aTop < bBottom + padding &&
    aBottom + padding > bTop
  );
}

function getFootprintExtents(component) {
  const def = COMPONENT_DEFS[component.type];
  if (!def) return { left: 1, right: 1, up: 1, down: 1 };

  const extents = def.footprintExtents || {
    left: def.footprintHalf.x,
    right: def.footprintHalf.x,
    up: def.footprintHalf.y,
    down: def.footprintHalf.y,
  };
  const rotation = normalizeRotation(component.rotation);

  if (rotation === 90) {
    return {
      left: extents.down,
      right: extents.up,
      up: extents.left,
      down: extents.right,
    };
  }

  if (rotation === 180) {
    return {
      left: extents.right,
      right: extents.left,
      up: extents.down,
      down: extents.up,
    };
  }

  if (rotation === 270) {
    return {
      left: extents.up,
      right: extents.down,
      up: extents.right,
      down: extents.left,
    };
  }

  return extents;
}

function rerouteConnectedWiresInCircuit(circuit, componentId) {
  const wires = getWiresForComponentFromCollection(circuit.wires, componentId);
  for (const wire of wires) {
    const start = getTerminalPositionForComponents(
      circuit.components,
      wire.from.componentId,
      wire.from.terminalIndex
    );
    const end = getTerminalPositionForComponents(
      circuit.components,
      wire.to.componentId,
      wire.to.terminalIndex
    );
    if (!start || !end) return false;

    const route = routeWireInCircuit(
      circuit,
      start,
      end,
      buildRouteTerminalOptionsForComponents(circuit.components, wire.from, wire.to, {
        ignoreWireIds: new Set([wire.id]),
      })
    );
    if (!route) return false;
    wire.path = route;
  }
  return true;
}

function rerouteConnectedWires(componentId) {
  return rerouteConnectedWiresInCircuit(state, componentId);
}

function getWiresForComponentFromCollection(wires, componentId) {
  return wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
}

function getWiresForComponent(componentId) {
  return getWiresForComponentFromCollection(state.wires, componentId);
}

function routeWireInCircuit(circuit, start, end, options = {}) {
  const blocked = new Set();
  const occupiedEdges = buildOccupiedWireEdgeSetForWires(circuit.wires, options.ignoreWireIds);
  const nodeProximity = buildTerminalProximitySetForComponents(circuit.components, start, end);

  for (const component of circuit.components) {
    const cells = getObstacleCells(component);
    for (const cell of cells) {
      blocked.add(key(cell.x, cell.y));
    }
  }

  blocked.delete(key(start.x, start.y));
  blocked.delete(key(end.x, end.y));

  const bounds = routeBoundsForComponents(circuit.components, start, end);
  return findPathAStar(start, end, blocked, occupiedEdges, nodeProximity, bounds, {
    preferredStartDirection: options.startDirection || null,
    preferredEndDirection: options.endDirection || null,
  });
}

function routeWire(start, end, options = {}) {
  return routeWireInCircuit(state, start, end, options);
}

function routeBoundsForComponents(components, start, end) {
  let minX = Math.min(start.x, end.x);
  let minY = Math.min(start.y, end.y);
  let maxX = Math.max(start.x, end.x);
  let maxY = Math.max(start.y, end.y);

  for (const component of components) {
    const fp = getFootprintExtents(component);
    minX = Math.min(minX, Math.floor(component.x - fp.left - 2));
    maxX = Math.max(maxX, Math.ceil(component.x + fp.right + 2));
    minY = Math.min(minY, Math.floor(component.y - fp.up - 2));
    maxY = Math.max(maxY, Math.ceil(component.y + fp.down + 2));
  }

  const pad = 10;
  return {
    minX: minX - pad,
    maxX: maxX + pad,
    minY: minY - pad,
    maxY: maxY + pad,
  };
}

function routeBounds(start, end) {
  return routeBoundsForComponents(state.components, start, end);
}

function findPathAStar(start, end, blocked, occupiedEdges, nodeProximity, bounds, preferences = {}) {
  const startKey = key(start.x, start.y);
  const endKey = key(end.x, end.y);
  const startStateKey = pathStateKey(start, null);
  const open = new Set([startStateKey]);
  const cameFrom = new Map();
  const gScore = new Map([[startStateKey, 0]]);
  const fScore = new Map([[startStateKey, manhattan(start, end)]]);
  const preferredStartDirection = preferences.preferredStartDirection || null;
  const preferredEndDirection = preferences.preferredEndDirection || null;

  while (open.size > 0) {
    let currentStateKey = null;
    let best = Infinity;

    for (const candidate of open) {
      const val = fScore.get(candidate) ?? Infinity;
      if (val < best) {
        best = val;
        currentStateKey = candidate;
      }
    }

    if (!currentStateKey) break;

    const currentState = parsePathStateKey(currentStateKey);
    const current = currentState.point;
    const currentKey = key(current.x, current.y);

    if (currentKey === endKey) {
      return rebuildPath(cameFrom, currentStateKey);
    }

    open.delete(currentStateKey);

    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 },
    ];

    for (const next of neighbors) {
      if (
        next.x < bounds.minX ||
        next.x > bounds.maxX ||
        next.y < bounds.minY ||
        next.y > bounds.maxY
      ) {
        continue;
      }

      const nk = key(next.x, next.y);
      if (blocked.has(nk) && nk !== endKey) continue;

      const nextDirection = stepDirection(current, next);
      const edgePenalty = occupiedEdges.has(edgeKey(current, next)) ? OCCUPIED_WIRE_EDGE_PENALTY : 0;
      const proximityPenalty =
        nk !== startKey && nk !== endKey && nodeProximity.has(nk) ? NODE_PROXIMITY_PENALTY : 0;
      const turnPenalty =
        currentState.direction && currentState.direction !== nextDirection ? TURN_PENALTY : 0;
      const startDirectionPenalty =
        !currentState.direction &&
        preferredStartDirection &&
        nextDirection !== preferredStartDirection
          ? TERMINAL_DIRECTION_MISMATCH_PENALTY
          : 0;
      const endDirectionPenalty =
        nk === endKey && preferredEndDirection && nextDirection !== preferredEndDirection
          ? TERMINAL_DIRECTION_MISMATCH_PENALTY
          : 0;
      const nextStateKey = pathStateKey(next, nextDirection);
      const tentative =
        (gScore.get(currentStateKey) ?? Infinity) +
        1 +
        edgePenalty +
        proximityPenalty +
        turnPenalty +
        startDirectionPenalty +
        endDirectionPenalty;
      if (tentative < (gScore.get(nextStateKey) ?? Infinity)) {
        cameFrom.set(nextStateKey, currentStateKey);
        gScore.set(nextStateKey, tentative);
        fScore.set(nextStateKey, tentative + manhattan(next, end));
        open.add(nextStateKey);
      }
    }
  }

  return null;
}

function buildOccupiedWireEdgeSetForWires(wires, ignoreWireIds = new Set()) {
  const occupied = new Set();

  for (const wire of wires) {
    if (ignoreWireIds.has(wire.id)) continue;
    if (!Array.isArray(wire.path) || wire.path.length < 2) continue;

    for (let i = 0; i < wire.path.length - 1; i += 1) {
      const start = wire.path[i];
      const end = wire.path[i + 1];

      if (start.x === end.x) {
        const step = start.y < end.y ? 1 : -1;
        for (let y = start.y; y !== end.y; y += step) {
          occupied.add(edgeKey({ x: start.x, y }, { x: start.x, y: y + step }));
        }
        continue;
      }

      if (start.y === end.y) {
        const step = start.x < end.x ? 1 : -1;
        for (let x = start.x; x !== end.x; x += step) {
          occupied.add(edgeKey({ x, y: start.y }, { x: x + step, y: start.y }));
        }
      }
    }
  }

  return occupied;
}

function buildOccupiedWireEdgeSet(ignoreWireIds = new Set()) {
  return buildOccupiedWireEdgeSetForWires(state.wires, ignoreWireIds);
}

function buildTerminalProximitySetForComponents(components, start, end) {
  const protectedKeys = new Set([key(start.x, start.y), key(end.x, end.y)]);
  const proximity = new Set();

  for (const component of components) {
    const def = COMPONENT_DEFS[component.type];
    if (!def) continue;

    for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
      const terminal = getTerminalPositionForComponents(components, component.id, terminalIndex);
      if (!terminal) continue;

      const terminalKeyValue = key(terminal.x, terminal.y);
      if (protectedKeys.has(terminalKeyValue)) continue;

      const neighbors = [
        { x: terminal.x + 1, y: terminal.y },
        { x: terminal.x - 1, y: terminal.y },
        { x: terminal.x, y: terminal.y + 1 },
        { x: terminal.x, y: terminal.y - 1 },
      ];

      for (const neighbor of neighbors) {
        const neighborKey = key(neighbor.x, neighbor.y);
        if (!protectedKeys.has(neighborKey)) {
          proximity.add(neighborKey);
        }
      }
    }
  }

  return proximity;
}

function buildTerminalProximitySet(start, end) {
  return buildTerminalProximitySetForComponents(state.components, start, end);
}

function rebuildPath(cameFrom, currentKey) {
  const path = [parsePathStateKey(currentKey).point];
  let ck = currentKey;

  while (cameFrom.has(ck)) {
    ck = cameFrom.get(ck);
    path.push(parsePathStateKey(ck).point);
  }

  path.reverse();
  return simplifyOrthogonalPath(path);
}

function simplifyOrthogonalPath(path) {
  if (path.length <= 2) return path;
  const simplified = [path[0]];

  for (let i = 1; i < path.length - 1; i += 1) {
    const prev = path[i - 1];
    const curr = path[i];
    const next = path[i + 1];
    const dx1 = curr.x - prev.x;
    const dy1 = curr.y - prev.y;
    const dx2 = next.x - curr.x;
    const dy2 = next.y - curr.y;

    if (dx1 === dx2 && dy1 === dy2) {
      continue;
    }

    simplified.push(curr);
  }

  simplified.push(path[path.length - 1]);
  return simplified;
}

function getObstacleCells(component) {
  const def = COMPONENT_DEFS[component.type];
  const cells = [];
  for (const base of def.obstacleCells) {
    const rotated = rotateOffset(base[0], base[1], component.rotation);
    cells.push({ x: component.x + rotated.x, y: component.y + rotated.y });
  }
  return cells;
}

function pickTerminal(worldX, worldY, threshold) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    const def = COMPONENT_DEFS[component.type];

    for (let t = 0; t < def.terminals.length; t += 1) {
      const tp = getTerminalPosition(component.id, t);
      if (!tp) continue;
      const dist = Math.hypot(tp.x - worldX, tp.y - worldY);
      if (dist <= threshold) {
        return { componentId: component.id, terminalIndex: t };
      }
    }
  }
  return null;
}

function pickComponentBody(worldX, worldY) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    if (component.type === "junction") continue;
    if (pointInsideComponentBody(component, worldX, worldY)) {
      return component;
    }
  }
  return null;
}

function pickWire(worldX, worldY) {
  const threshold = clamp(9 / (GRID_SIZE * state.camera.zoom), 0.12, 0.46);

  for (let i = state.wires.length - 1; i >= 0; i -= 1) {
    const wire = state.wires[i];
    const path = wire.path;
    if (!path || path.length < 2) continue;

    for (let j = 0; j < path.length - 1; j += 1) {
      const a = path[j];
      const b = path[j + 1];
      if (distanceToSegment(worldX, worldY, a.x, a.y, b.x, b.y) <= threshold) {
        return {
          wire,
          segmentIndex: j,
          point: snapPointToSegment(worldX, worldY, a, b),
        };
      }
    }
  }

  return null;
}

function snapPointToSegment(worldX, worldY, start, end) {
  if (start.x === end.x) {
    return {
      x: start.x,
      y: clamp(Math.round(worldY), Math.min(start.y, end.y), Math.max(start.y, end.y)),
    };
  }

  return {
    x: clamp(Math.round(worldX), Math.min(start.x, end.x), Math.max(start.x, end.x)),
    y: start.y,
  };
}

function pointOnSegment(point, start, end) {
  const withinX =
    point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x);
  const withinY =
    point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);

  if (!withinX || !withinY) return false;
  if (start.x === end.x) return point.x === start.x;
  if (start.y === end.y) return point.y === start.y;
  return false;
}

function sameGridPoint(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function clonePath(path) {
  return path.map(clonePoint);
}

function cloneTerminalRef(ref) {
  return {
    componentId: ref.componentId,
    terminalIndex: ref.terminalIndex,
  };
}

function pointInsideComponentBody(component, worldX, worldY) {
  const def = COMPONENT_DEFS[component.type];
  const local = worldToLocal(component, worldX, worldY);
  const offsetY = def.bodyOffsetY || 0;

  return (
    local.x >= -def.bodyHalfW &&
    local.x <= def.bodyHalfW &&
    local.y >= -def.bodyHalfH + offsetY &&
    local.y <= def.bodyHalfH + offsetY
  );
}

function worldToLocal(component, worldX, worldY) {
  const dx = worldX - component.x;
  const dy = worldY - component.y;
  const rad = degToRad(-component.rotation);
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function selectComponent(componentId) {
  state.selectedComponentId = componentId;
  state.selectedWireId = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function selectWire(wireId) {
  state.selectedWireId = wireId;
  state.selectedComponentId = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function clearSelection() {
  state.selectedComponentId = null;
  state.selectedWireId = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function removeComponent(componentId) {
  const result = removeComponentFromCircuit(state, componentId);
  if (!result.ok) return;

  updateSelectionUi();
  onCircuitChanged();
  showStatus("Componente removido");
}

function removeWire(wireId) {
  const result = removeWireFromCircuit(state, wireId);
  if (!result.ok) return;

  updateSelectionUi();
  onCircuitChanged();
  showStatus("Conector removido");
}

function collectWireCleanupTargets(wires) {
  return collectWireCleanupTargetsForCircuit(state, wires);
}

function collectWireCleanupTargetsForCircuit(circuit, wires) {
  const targets = new Set();

  for (const wire of wires) {
    if (getComponentByIdFromCollection(circuit.components, wire.from.componentId)?.type === "junction") {
      targets.add(wire.from.componentId);
    }

    if (getComponentByIdFromCollection(circuit.components, wire.to.componentId)?.type === "junction") {
      targets.add(wire.to.componentId);
    }
  }

  return [...targets];
}

function cleanupAutoJunctions(junctionIds) {
  return cleanupAutoJunctionsInCircuit(state, junctionIds);
}

function cleanupAutoJunctionsInCircuit(circuit, junctionIds) {
  const queue = [...junctionIds];
  const seen = new Set();

  while (queue.length > 0) {
    const junctionId = queue.shift();
    if (seen.has(junctionId)) continue;
    seen.add(junctionId);

    const junction = getComponentByIdFromCollection(circuit.components, junctionId);
    if (!junction || junction.type !== "junction") continue;

    const connectedWires = getWiresForComponentFromCollection(circuit.wires, junctionId);
    if (connectedWires.length === 0) {
      removeJunctionComponentFromCircuit(circuit, junctionId);
      continue;
    }

    if (connectedWires.length !== 2) continue;

    const merged = tryMergeSplitJunctionInCircuit(circuit, junctionId, connectedWires);
    if (merged) {
      if (getComponentByIdFromCollection(circuit.components, merged.from.componentId)?.type === "junction") {
        queue.push(merged.from.componentId);
      }
      if (getComponentByIdFromCollection(circuit.components, merged.to.componentId)?.type === "junction") {
        queue.push(merged.to.componentId);
      }
    }
  }

  clearInvalidSelectionsInCircuit(circuit);
}

function removeJunctionComponent(junctionId) {
  return removeJunctionComponentFromCircuit(state, junctionId);
}

function removeJunctionComponentFromCircuit(circuit, junctionId) {
  circuit.components = circuit.components.filter((component) => component.id !== junctionId);

  if (circuit.pendingTerminal?.componentId === junctionId) {
    circuit.pendingTerminal = null;
  }

  if (circuit.selectedComponentId === junctionId) {
    circuit.selectedComponentId = null;
  }

  clearInvalidSelectionsInCircuit(circuit);
}

function tryMergeSplitJunction(junctionId, connectedWires) {
  return tryMergeSplitJunctionInCircuit(state, junctionId, connectedWires);
}

function tryMergeSplitJunctionInCircuit(circuit, junctionId, connectedWires) {
  const [first, second] = connectedWires;
  if (!areMergeableSplitPair(first, second)) {
    return null;
  }

  const meta = first;
  const start = getTerminalPositionForComponents(
    circuit.components,
    meta.splitOriginalFrom.componentId,
    meta.splitOriginalFrom.terminalIndex
  );
  const end = getTerminalPositionForComponents(
    circuit.components,
    meta.splitOriginalTo.componentId,
    meta.splitOriginalTo.terminalIndex
  );
  if (!start || !end) return null;

  let path = null;
  if (
    Array.isArray(meta.splitOriginalPath) &&
    meta.splitOriginalPath.length >= 2 &&
    sameGridPoint(meta.splitOriginalPath[0], start) &&
    sameGridPoint(meta.splitOriginalPath[meta.splitOriginalPath.length - 1], end)
  ) {
    path = clonePath(meta.splitOriginalPath);
  } else {
    path = routeWireInCircuit(
      circuit,
      start,
      end,
      buildRouteTerminalOptionsForComponents(
        circuit.components,
        meta.splitOriginalFrom,
        meta.splitOriginalTo
      )
    );
  }

  if (!path) return null;

  circuit.wires = circuit.wires.filter(
    (wire) => wire.id !== first.id && wire.id !== second.id
  );
  circuit.wires.push({
    id: circuit.nextWireId++,
    from: cloneTerminalRef(meta.splitOriginalFrom),
    to: cloneTerminalRef(meta.splitOriginalTo),
    path,
  });
  removeJunctionComponentFromCircuit(circuit, junctionId);
  return {
    from: cloneTerminalRef(meta.splitOriginalFrom),
    to: cloneTerminalRef(meta.splitOriginalTo),
  };
}

function removeComponentFromCircuit(circuit, componentId) {
  const index = circuit.components.findIndex((component) => component.id === componentId);
  if (index < 0) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const removedWires = circuit.wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
  const cleanupTargets = collectWireCleanupTargetsForCircuit(circuit, removedWires);

  circuit.components.splice(index, 1);
  circuit.wires = circuit.wires.filter(
    (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId
  );

  if (circuit.pendingTerminal?.componentId === componentId) {
    circuit.pendingTerminal = null;
  }

  if (circuit.selectedComponentId === componentId) {
    circuit.selectedComponentId = null;
  }

  cleanupAutoJunctionsInCircuit(circuit, cleanupTargets);
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, removedWires };
}

function removeWireFromCircuit(circuit, wireId) {
  const wire = getWireByIdFromCollection(circuit.wires, wireId);
  if (!wire) {
    return { ok: false, message: "Conector nao encontrado" };
  }

  const cleanupTargets = collectWireCleanupTargetsForCircuit(circuit, [wire]);
  circuit.wires = circuit.wires.filter((candidate) => candidate.id !== wireId);

  if (circuit.selectedWireId === wireId) {
    circuit.selectedWireId = null;
  }

  cleanupAutoJunctionsInCircuit(circuit, cleanupTargets);
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, wire };
}

function clearInvalidSelectionsInCircuit(circuit) {
  if (
    circuit.selectedComponentId != null &&
    !getComponentByIdFromCollection(circuit.components, circuit.selectedComponentId)
  ) {
    circuit.selectedComponentId = null;
  }

  if (
    circuit.selectedWireId != null &&
    !getWireByIdFromCollection(circuit.wires, circuit.selectedWireId)
  ) {
    circuit.selectedWireId = null;
  }

  if (!circuit.pendingTerminal) {
    return;
  }

  const pendingComponent = getComponentByIdFromCollection(
    circuit.components,
    circuit.pendingTerminal.componentId
  );
  const def = pendingComponent ? COMPONENT_DEFS[pendingComponent.type] : null;
  if (!pendingComponent || !def || !def.terminals[circuit.pendingTerminal.terminalIndex]) {
    circuit.pendingTerminal = null;
  }
}

function areMergeableSplitPair(first, second) {
  if (!first?.splitGroupId || !second?.splitGroupId) return false;
  if (first.splitGroupId !== second.splitGroupId) return false;

  const roles = new Set([first.splitGroupRole, second.splitGroupRole]);
  if (!roles.has("from") || !roles.has("to")) return false;

  return (
    terminalRefsEqual(first.splitOriginalFrom, second.splitOriginalFrom) &&
    terminalRefsEqual(first.splitOriginalTo, second.splitOriginalTo)
  );
}

function terminalRefsEqual(a, b) {
  return (
    !!a &&
    !!b &&
    a.componentId === b.componentId &&
    a.terminalIndex === b.terminalIndex
  );
}

function isSimulatedBranchComponent(type) {
  return getComponentBehavior(type).isSimulatedBranch;
}

function getReachabilityTerminalPairs(component) {
  if (!component) {
    return [];
  }
  return getComponentBehavior(component.type).getReachabilityTerminalPairs(component);
}

function updateSelectionUi() {
  requestRender(true);

  const component = getComponentById(state.selectedComponentId);
  const wire = getWireById(state.selectedWireId);

  if (!component && !wire) {
    clearDeleteButtonHold();
    deleteButtonHoldState.suppressNextClick = false;
    appEls.rotateBtn.classList.add("hidden");
    appEls.deleteBtn.classList.add("hidden");
    appEls.swapOpAmpBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.deleteBtn.classList.remove("hidden");

  if (!component) {
    appEls.rotateBtn.classList.add("hidden");
    appEls.swapOpAmpBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.rotateBtn.classList.remove("hidden");
  const swapControl = getComponentBehavior(component.type).swapControl;
  if (swapControl) {
    appEls.swapOpAmpBtn.classList.remove("hidden");
    appEls.swapOpAmpBtn.title = swapControl.title;
    appEls.swapOpAmpBtn.setAttribute("aria-label", swapControl.ariaLabel);
  } else {
    appEls.swapOpAmpBtn.classList.add("hidden");
  }

  const def = COMPONENT_DEFS[component.type];
  if (!def.editable) {
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.valueWheel.classList.remove("hidden");
  appEls.wheelTitle.textContent = def.label;
  syncWheelWithSelectedComponent();
}

function syncWheelWithSelectedComponent() {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;
  const normalized = normalizedFromValue(component);
  const angleDeg = normalized * 360 - 90;
  appEls.wheelPointer.style.transform = `translate(0, -50%) rotate(${angleDeg}deg)`;
  appEls.wheelValue.textContent = formatComponentValue(component);
}

function updateValueFromWheelPointer(clientX, clientY) {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;

  const rect = appEls.valueWheel.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const angle = Math.atan2(clientY - cy, clientX - cx);
  let normalized = (angle + Math.PI / 2) / (Math.PI * 2);
  normalized = ((normalized % 1) + 1) % 1;

  const value = valueFromNormalized(component.type, normalized);
  component.value = value;
  syncWheelWithSelectedComponent();
  onCircuitChanged();
}

function valueFromNormalized(type, normalized) {
  return getComponentBehavior(type).valueFromNormalized(normalized);
}

function normalizedFromValue(component) {
  return getComponentBehavior(component.type).normalizedFromValue(component);
}

function quantizeResistor(value) {
  const decades = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
  const exponent = Math.floor(Math.log10(value));
  const mantissa = value / Math.pow(10, exponent);

  let best = decades[0];
  let bestErr = Infinity;
  for (const d of decades) {
    const err = Math.abs(d - mantissa);
    if (err < bestErr) {
      bestErr = err;
      best = d;
    }
  }

  const quantized = best * Math.pow(10, exponent);
  return clamp(quantized, 1, 1_000_000);
}

function getComponentByIdFromCollection(components, id) {
  if (id == null) return null;
  return components.find((component) => component.id === id) || null;
}

function getWireByIdFromCollection(wires, id) {
  if (id == null) return null;
  return wires.find((wire) => wire.id === id) || null;
}

function getTerminalPositionForComponents(components, componentId, terminalIndex) {
  const component = getComponentByIdFromCollection(components, componentId);
  if (!component) return null;
  const def = COMPONENT_DEFS[component.type];
  const base = def.terminals[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  return {
    x: component.x + offset.x,
    y: component.y + offset.y,
  };
}

function getTerminalPosition(componentId, terminalIndex) {
  return getTerminalPositionForComponents(state.components, componentId, terminalIndex);
}

function getTerminalLabelDirectionForComponents(components, componentId, terminalIndex) {
  const component = getComponentByIdFromCollection(components, componentId);
  if (!component) return null;

  const def = COMPONENT_DEFS[component.type];
  const base = def?.terminals[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  if (offset.x === 0 && offset.y === 0) return null;

  if (Math.abs(offset.x) >= Math.abs(offset.y)) {
    return offset.x >= 0 ? "right" : "left";
  }

  return offset.y >= 0 ? "down" : "up";
}

function getTerminalLabelDirection(componentId, terminalIndex) {
  return getTerminalLabelDirectionForComponents(state.components, componentId, terminalIndex);
}

function buildRouteTerminalOptionsForComponents(components, fromRef, toRef = null, extraOptions = {}) {
  const options = { ...extraOptions };

  if (fromRef) {
    const startDirection = getTerminalLabelDirectionForComponents(
      components,
      fromRef.componentId,
      fromRef.terminalIndex
    );
    if (startDirection) {
      options.startDirection = startDirection;
    }
  }

  if (toRef) {
    const outwardDirection = getTerminalLabelDirectionForComponents(
      components,
      toRef.componentId,
      toRef.terminalIndex
    );
    const endDirection = oppositeDirection(outwardDirection);
    if (endDirection) {
      options.endDirection = endDirection;
    }
  }

  return options;
}

function buildRouteTerminalOptions(fromRef, toRef = null, extraOptions = {}) {
  return buildRouteTerminalOptionsForComponents(state.components, fromRef, toRef, extraOptions);
}

function getOpAmpInputTerminalIndices(component) {
  const inputsSwapped = component?.inputsSwapped === true;
  return inputsSwapped
    ? {
        plusIndex: OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX,
        minusIndex: OP_AMP_TOP_INPUT_TERMINAL_INDEX,
      }
    : {
        plusIndex: OP_AMP_TOP_INPUT_TERMINAL_INDEX,
        minusIndex: OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX,
      };
}

function getBjtCollectorEmitterTerminalIndices(component) {
  const collectorEmitterSwapped = component?.collectorEmitterSwapped === true;
  return collectorEmitterSwapped
    ? {
        collectorIndex: BJT_EMITTER_TERMINAL_INDEX,
        emitterIndex: BJT_COLLECTOR_TERMINAL_INDEX,
      }
    : {
        collectorIndex: BJT_COLLECTOR_TERMINAL_INDEX,
        emitterIndex: BJT_EMITTER_TERMINAL_INDEX,
      };
}

function isTerminalConnected(componentId, terminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === componentId && wire.from.terminalIndex === terminalIndex) ||
      (wire.to.componentId === componentId && wire.to.terminalIndex === terminalIndex)
  );
}

function getComponentById(id) {
  return getComponentByIdFromCollection(state.components, id);
}

function getWireById(id) {
  return getWireByIdFromCollection(state.wires, id);
}

function getCardinalValueLabelAnchor(component, offset) {
  const rotation = normalizeRotation(component.rotation);
  if (rotation === 0) return { x: component.x, y: component.y - offset };
  if (rotation === 90) return { x: component.x + offset, y: component.y };
  if (rotation === 180) return { x: component.x, y: component.y + offset };
  return { x: component.x - offset, y: component.y };
}

function getValueLabelAnchor(component) {
  return getComponentBehavior(component.type).getValueLabelAnchor(component);
}

function simulateCircuit({ components, wires, previousSolution = null }) {
  if (components.length === 0) {
    return { ok: false, message: "Adicione componentes antes de simular" };
  }

  const terminals = [];
  const terminalPosition = new Map();

  for (const component of components) {
    const def = COMPONENT_DEFS[component.type];
    for (let i = 0; i < def.terminals.length; i += 1) {
      const tKey = terminalKey(component.id, i);
      terminals.push(tKey);
      terminalPosition.set(tKey, getTerminalPositionForComponents(components, component.id, i));
    }
  }

  const dsu = new DisjointSet(terminals);

  for (const wire of wires) {
    dsu.union(terminalKey(wire.from.componentId, wire.from.terminalIndex), terminalKey(wire.to.componentId, wire.to.terminalIndex));
  }

  const groundTerminals = components
    .filter((component) => component.type === "ground")
    .map((component) => terminalKey(component.id, 0));

  if (groundTerminals.length === 0) {
    return { ok: false, message: "Inclua pelo menos um terra" };
  }

  for (let i = 1; i < groundTerminals.length; i += 1) {
    dsu.union(groundTerminals[0], groundTerminals[i]);
  }

  const groundRoot = dsu.find(groundTerminals[0]);

  const rootByTerminal = new Map();
  for (const t of terminals) {
    rootByTerminal.set(t, dsu.find(t));
  }

  const edges = new Map();
  function addEdge(a, b) {
    if (!edges.has(a)) edges.set(a, new Set());
    if (!edges.has(b)) edges.set(b, new Set());
    edges.get(a).add(b);
    edges.get(b).add(a);
  }

  for (const component of components) {
    for (const [fromIndex, toIndex] of getReachabilityTerminalPairs(component)) {
      const n0 = rootByTerminal.get(terminalKey(component.id, fromIndex));
      const n1 = rootByTerminal.get(terminalKey(component.id, toIndex));
      if (!n0 || !n1) continue;
      addEdge(n0, n1);
    }
  }

  const reachableNodes = new Set([groundRoot]);
  const queue = [groundRoot];

  while (queue.length > 0) {
    const node = queue.shift();
    const neighbors = edges.get(node);
    if (!neighbors) continue;

    for (const nb of neighbors) {
      if (!reachableNodes.has(nb)) {
        reachableNodes.add(nb);
        queue.push(nb);
      }
    }
  }

  const activeComponents = components.filter((component) => {
    if (!isSimulatedBranchComponent(component.type)) return false;
    const terminalRoots = getComponentTerminalRoots(component, rootByTerminal);
    if (terminalRoots.length === 0) return false;
    return terminalRoots.some((root) => reachableNodes.has(root));
  });

  if (activeComponents.length === 0) {
    return { ok: false, message: "Nenhum circuito fechado ligado ao terra" };
  }

  const activeRoots = new Set();
  for (const component of activeComponents) {
    for (const root of getComponentTerminalRoots(component, rootByTerminal)) {
      activeRoots.add(root);
    }
  }

  const nonGroundRoots = [...activeRoots].filter((root) => root !== groundRoot);
  const nodeIndex = new Map(nonGroundRoots.map((root, idx) => [root, idx]));

  const voltageSources = activeComponents.filter((component) => component.type === "voltage_source");
  const diodes = activeComponents.filter((component) => component.type === "diode");
  const bjts = activeComponents.filter((component) => component.type === "bjt_npn");
  const opAmps = activeComponents.filter((component) => component.type === "op_amp");

  const N = nonGroundRoots.length;
  const M = voltageSources.length;
  const O = opAmps.length;
  const size = N + M + O;

  if (size === 0) {
    return { ok: false, message: "Circuito inválido para MNA" };
  }

  const getNodeIdx = (root) => {
    if (root === groundRoot) return -1;
    return nodeIndex.get(root) ?? -1;
  };

  const linearSystem = buildLinearMnaSystem(
    activeComponents,
    voltageSources,
    opAmps,
    rootByTerminal,
    getNodeIdx,
    N
  );

  let solution = null;
  if (diodes.length > 0 || bjts.length > 0 || opAmps.length > 0) {
    solution = solveNonlinearCircuit({
      baseMatrix: linearSystem.A,
      baseVector: linearSystem.z,
      diodes,
      bjts,
      opAmps,
      nodeCount: N,
      opAmpRowOffset: N + M,
      rootByTerminal,
      getNodeIdx,
      previousSolution,
    });

    if (!solution) {
      return {
        ok: false,
        message: "O solver nao convergiu para o circuito nao linear. Revise saturacoes, malhas ideais e entradas flutuantes.",
      };
    }
  } else {
    solution = solveLinearSystem(linearSystem.A, linearSystem.z);
    if (!solution) {
      return {
        ok: false,
        message: "Sistema singular. Verifique se o circuito está referenciado ao terra.",
      };
    }
  }

  const nodeVoltageByRoot = new Map();
  nodeVoltageByRoot.set(groundRoot, 0);
  for (const root of nonGroundRoots) {
    nodeVoltageByRoot.set(root, solution[nodeIndex.get(root)]);
  }

  const componentCurrents = new Map();

  for (const component of activeComponents) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const v0 = nodeVoltageByRoot.get(r0) ?? 0;
    const v1 = nodeVoltageByRoot.get(r1) ?? 0;

    if (component.type === "resistor") {
      componentCurrents.set(component.id, (v0 - v1) / safeResistance(component.value));
    } else if (component.type === "current_source") {
      componentCurrents.set(component.id, component.value || 0);
    } else if (component.type === "diode") {
      componentCurrents.set(component.id, evaluateDiodeModel(component, v0 - v1).current);
    } else if (component.type === "bjt_npn") {
      const rBase = rootByTerminal.get(terminalKey(component.id, BJT_BASE_TERMINAL_INDEX));
      const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
      const rCollector = rootByTerminal.get(terminalKey(component.id, collectorIndex));
      const rEmitter = rootByTerminal.get(terminalKey(component.id, emitterIndex));
      const vBase = nodeVoltageByRoot.get(rBase) ?? 0;
      const vCollector = nodeVoltageByRoot.get(rCollector) ?? 0;
      const vEmitter = nodeVoltageByRoot.get(rEmitter) ?? 0;
      componentCurrents.set(component.id, evaluateBjtModel(component, vBase - vEmitter, vBase - vCollector).ic);
    }
  }

  voltageSources.forEach((component, k) => {
    // Align displayed arrow direction with terminal order (esquerda -> direita).
    componentCurrents.set(component.id, -solution[N + k]);
  });

  const markerGroups = new Map();
  for (const [terminal, root] of rootByTerminal.entries()) {
    if (!nodeVoltageByRoot.has(root)) continue;
    const ref = parseTerminalKey(terminal);
    const labelDirection = ref
      ? getTerminalLabelDirectionForComponents(components, ref.componentId, ref.terminalIndex)
      : null;
    pushNodeMarkerGroupPoint(markerGroups, root, terminalPosition.get(terminal), labelDirection);
  }

  for (const wire of wires) {
    if (!Array.isArray(wire.path) || wire.path.length === 0) continue;

    const fromRoot = rootByTerminal.get(terminalKey(wire.from.componentId, wire.from.terminalIndex));
    const toRoot = rootByTerminal.get(terminalKey(wire.to.componentId, wire.to.terminalIndex));
    if (!fromRoot || fromRoot !== toRoot || !nodeVoltageByRoot.has(fromRoot)) continue;

    for (const point of wire.path) {
      pushNodeMarkerGroupPoint(markerGroups, fromRoot, point);
    }
  }

  const groundMarkerPoints = dedupeMarkerPoints(
    groundTerminals.map((terminal) => terminalPosition.get(terminal))
  );

  const nodeMarkers = [];
  for (const [root, group] of markerGroups.entries()) {
    const markerPoints = root === groundRoot && groundMarkerPoints.length ? groundMarkerPoints : group.points;
    const markerPoint = chooseNodeMarkerAnchor(group.points, markerPoints, group.pointDirections);
    if (!markerPoint) continue;

    nodeMarkers.push({
      x: markerPoint.x,
      y: markerPoint.y,
      voltage: nodeVoltageByRoot.get(root) ?? 0,
      labelDirection: markerPoint.labelDirection,
    });
  }

  const data = {
    nodeVoltages: nodeVoltageByRoot,
    componentCurrents,
    nodeMarkers,
    solutionVector: solution.slice(),
  };

  return { ok: true, data };
}

function runSimulation() {
  const result = simulateCircuit({
    components: state.components,
    wires: state.wires,
    previousSolution: state.simulationResult?.data?.solutionVector,
  });

  state.simulationResult = result.ok ? { ok: true, data: result.data } : null;
  return result;
}

function getComponentTerminalRoots(component, rootByTerminal) {
  const def = COMPONENT_DEFS[component.type];
  if (!def) return [];

  const roots = [];
  for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
    const root = rootByTerminal.get(terminalKey(component.id, terminalIndex));
    if (root) {
      roots.push(root);
    }
  }
  return roots;
}

function pushNodeMarkerGroupPoint(groups, root, point, labelDirection = null) {
  if (!root || !point) return;

  let group = groups.get(root);
  if (!group) {
    group = {
      points: [],
      pointKeys: new Set(),
      pointDirections: new Map(),
    };
    groups.set(root, group);
  }

  const pointKeyValue = key(point.x, point.y);
  if (!group.pointKeys.has(pointKeyValue)) {
    group.pointKeys.add(pointKeyValue);
    group.points.push(clonePoint(point));
  }

  if (!labelDirection) return;

  let directions = group.pointDirections.get(pointKeyValue);
  if (!directions) {
    directions = new Set();
    group.pointDirections.set(pointKeyValue, directions);
  }
  directions.add(labelDirection);
}

function dedupeMarkerPoints(points) {
  const unique = [];
  const seen = new Set();

  for (const point of points) {
    if (!point) continue;

    const pointKeyValue = key(point.x, point.y);
    if (seen.has(pointKeyValue)) continue;

    seen.add(pointKeyValue);
    unique.push(clonePoint(point));
  }

  return unique;
}

function chooseNodeMarkerAnchor(geometryPoints, candidatePoints = geometryPoints, pointDirections = new Map()) {
  // Keep the label attached to a real point on the node instead of the averaged centroid,
  // which can fall in empty canvas space for large nets.
  const geometry = dedupeMarkerPoints(geometryPoints);
  const candidates = dedupeMarkerPoints(candidatePoints);
  if (!geometry.length || !candidates.length) return null;

  const centroid = geometry.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
    }),
    { x: 0, y: 0 }
  );
  centroid.x /= geometry.length;
  centroid.y /= geometry.length;

  let bestPoint = candidates[0];
  let bestDistance = distanceSquared(bestPoint, centroid);

  for (let index = 1; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const candidateDistance = distanceSquared(candidate, centroid);

    if (
      candidateDistance < bestDistance - 1e-9 ||
      (Math.abs(candidateDistance - bestDistance) <= 1e-9 && isBetterMarkerTieBreak(candidate, bestPoint))
    ) {
      bestPoint = candidate;
      bestDistance = candidateDistance;
    }
  }

  return {
    x: bestPoint.x,
    y: bestPoint.y,
    labelDirection: chooseNodeMarkerLabelDirection(bestPoint, pointDirections),
  };
}

function distanceSquared(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function isBetterMarkerTieBreak(candidate, currentBest) {
  if (candidate.y !== currentBest.y) {
    return candidate.y < currentBest.y;
  }

  return candidate.x < currentBest.x;
}

function chooseNodeMarkerLabelDirection(point, pointDirections) {
  const directions = pointDirections.get(key(point.x, point.y));
  if (!directions || directions.size === 0) {
    return "up";
  }

  if (directions.has("down") && !directions.has("up")) {
    return "down";
  }

  if (directions.has("up") && !directions.has("down")) {
    return "up";
  }

  if (directions.has("right") && !directions.has("left")) {
    return "right";
  }

  if (directions.has("left") && !directions.has("right")) {
    return "left";
  }

  return "up";
}

function buildLinearMnaSystem(activeComponents, voltageSources, opAmps, rootByTerminal, getNodeIdx, nodeCount) {
  const size = nodeCount + voltageSources.length + opAmps.length;
  const A = Array.from({ length: size }, () => Array(size).fill(0));
  const z = Array(size).fill(0);

  for (const component of activeComponents) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);

    if (component.type === "resistor") {
      stampConductance(A, n0, n1, 1 / safeResistance(component.value));
    }

    if (component.type === "current_source") {
      const current = component.value || 0;
      if (n0 >= 0) z[n0] -= current;
      if (n1 >= 0) z[n1] += current;
    }
  }

  voltageSources.forEach((component, index) => {
    const row = nodeCount + index;
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);

    if (n0 >= 0) {
      A[n0][row] -= 1;
      A[row][n0] -= 1;
    }

    if (n1 >= 0) {
      A[n1][row] += 1;
      A[row][n1] += 1;
    }

    z[row] = component.value || 0;
  });

  opAmps.forEach((component, index) => {
    const row = nodeCount + voltageSources.length + index;
    const outputRoot = rootByTerminal.get(terminalKey(component.id, OP_AMP_OUTPUT_TERMINAL_INDEX));
    const outputNode = getNodeIdx(outputRoot);

    if (outputNode >= 0) {
      A[outputNode][row] += 1;
      A[row][outputNode] += 1;
    }
  });

  return { A, z };
}

function solveNonlinearCircuit({
  baseMatrix,
  baseVector,
  diodes,
  bjts,
  opAmps,
  nodeCount,
  opAmpRowOffset,
  rootByTerminal,
  getNodeIdx,
  previousSolution,
}) {
  const size = baseVector.length;
  const hasPreviousSolution = Array.isArray(previousSolution) && previousSolution.length === size;
  const linearGuess = solveLinearSystem(baseMatrix, baseVector);

  if (hasPreviousSolution) {
    const direct = runNewtonIterations(
      previousSolution.slice(),
      baseMatrix,
      baseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      1
    );
    if (direct) {
      return direct;
    }
  }

  if (linearGuess) {
    const directFromLinear = runNewtonIterations(
      linearGuess.slice(),
      baseMatrix,
      baseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      1
    );
    if (directFromLinear) {
      return directFromLinear;
    }
  }

  let vector =
    solveLinearSystem(
      baseMatrix,
      baseVector.map((value) => value / NEWTON_SOURCE_STEPS)
    ) || Array(size).fill(0);
  let steppingFailed = false;
  for (let stepIndex = 1; stepIndex <= NEWTON_SOURCE_STEPS; stepIndex += 1) {
    const scale = stepIndex / NEWTON_SOURCE_STEPS;
    const scaledBaseVector = baseVector.map((value) => value * scale);
    let steppedVector = runNewtonIterations(
      vector,
      baseMatrix,
      scaledBaseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      scale
    );

    if (!steppedVector) {
      const scaledLinearGuess = solveLinearSystem(baseMatrix, scaledBaseVector);
      if (scaledLinearGuess) {
        steppedVector = runNewtonIterations(
          scaledLinearGuess,
          baseMatrix,
          scaledBaseVector,
          diodes,
          bjts,
          opAmps,
          nodeCount,
          opAmpRowOffset,
          rootByTerminal,
          getNodeIdx,
          scale
        );
      }
    }

    if (!steppedVector) {
      steppingFailed = true;
      break;
    }

    vector = steppedVector;
  }

  if (!steppingFailed) {
    return vector;
  }

  const resumed = runNewtonIterations(
    vector,
    baseMatrix,
    baseVector,
    diodes,
    bjts,
    opAmps,
    nodeCount,
    opAmpRowOffset,
    rootByTerminal,
    getNodeIdx,
    1
  );
  if (resumed) {
    return resumed;
  }

  if (linearGuess) {
    const retriedLinear = runNewtonIterations(
      linearGuess.slice(),
      baseMatrix,
      baseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      1
    );
    if (retriedLinear) {
      return retriedLinear;
    }
  }

  if (maxAbsValue(vector) > 0) {
    return runNewtonIterations(
      Array(size).fill(0),
      baseMatrix,
      baseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      1
    );
  }

  return null;
}

function runNewtonIterations(
  initialVector,
  baseMatrix,
  baseVector,
  diodes,
  bjts,
  opAmps,
  nodeCount,
  opAmpRowOffset,
  rootByTerminal,
  getNodeIdx,
  nonlinearScale = 1
) {
  let vector = initialVector.slice();

  for (let iteration = 0; iteration < NEWTON_MAX_ITERATIONS; iteration += 1) {
    const { residual, jacobian } = evaluateNonlinearSystem(
      vector,
      baseMatrix,
      baseVector,
      diodes,
      bjts,
      opAmps,
      nodeCount,
      opAmpRowOffset,
      rootByTerminal,
      getNodeIdx,
      nonlinearScale
    );
    const residualMetrics = evaluateResidualMetrics(residual, nodeCount);
    const residualScore = residualMetricsToScore(residualMetrics);
    if (isResidualConverged(residualMetrics)) {
      return vector;
    }

    const step = solveLinearSystem(jacobian, residual.map((value) => -value));
    if (!step) {
      return null;
    }

    const stepNorm = maxAbsValue(step);
    if (stepNorm <= NEWTON_STEP_TOLERANCE) {
      return isResidualCloseEnough(residualMetrics) ? vector : null;
    }

    let damping = 1;
    let nextVector = null;
    let nextResidualNorm = Infinity;

    for (let attempt = 0; attempt < NEWTON_BACKTRACK_STEPS; attempt += 1) {
      const candidate = limitCandidateJunctionVoltages(
        vector.map((value, index) => value + step[index] * damping),
        vector,
        diodes,
        bjts,
        rootByTerminal,
        getNodeIdx
      );
      const candidateResidualNorm = evaluateResidualNorm(
        candidate,
        baseMatrix,
        baseVector,
        diodes,
        bjts,
        opAmps,
        nodeCount,
        opAmpRowOffset,
        rootByTerminal,
        getNodeIdx,
        nonlinearScale
      );

      if (candidateResidualNorm < residualScore) {
        nextVector = candidate;
        nextResidualNorm = candidateResidualNorm;
        break;
      }

      if (candidateResidualNorm < nextResidualNorm) {
        nextVector = candidate;
        nextResidualNorm = candidateResidualNorm;
      }

      damping *= 0.5;
    }

    if (!nextVector || nextResidualNorm === Infinity) {
      return null;
    }

    vector = nextVector;

    if (nextResidualNorm <= 1 && stepNorm * damping <= NEWTON_STEP_TOLERANCE) {
      return vector;
    }
  }

  return null;
}

function evaluateNonlinearSystem(
  vector,
  baseMatrix,
  baseVector,
  diodes,
  bjts,
  opAmps,
  nodeCount,
  opAmpRowOffset,
  rootByTerminal,
  getNodeIdx,
  nonlinearScale = 1
) {
  const deviceScale = clamp(nonlinearScale, 0, 1);
  const residual = multiplyMatrixVector(baseMatrix, vector).map(
    (value, index) => value - baseVector[index]
  );
  const jacobian = baseMatrix.map((row) => row.slice());

  for (const component of diodes) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);
    const v0 = n0 >= 0 ? vector[n0] : 0;
    const v1 = n1 >= 0 ? vector[n1] : 0;
    const { current, conductance } = evaluateDiodeModel(component, v0 - v1);
    const scaledCurrent = current * deviceScale;
    const scaledConductance = conductance * deviceScale;

    if (n0 >= 0) {
      residual[n0] += scaledCurrent;
      jacobian[n0][n0] += scaledConductance;
    }

    if (n1 >= 0) {
      residual[n1] -= scaledCurrent;
      jacobian[n1][n1] += scaledConductance;
    }

    if (n0 >= 0 && n1 >= 0) {
      jacobian[n0][n1] -= scaledConductance;
      jacobian[n1][n0] -= scaledConductance;
    }
  }

  for (const component of bjts) {
    const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
    const rBase = rootByTerminal.get(terminalKey(component.id, BJT_BASE_TERMINAL_INDEX));
    const rCollector = rootByTerminal.get(terminalKey(component.id, collectorIndex));
    const rEmitter = rootByTerminal.get(terminalKey(component.id, emitterIndex));
    const nBase = getNodeIdx(rBase);
    const nCollector = getNodeIdx(rCollector);
    const nEmitter = getNodeIdx(rEmitter);
    const vBase = nBase >= 0 ? vector[nBase] : 0;
    const vCollector = nCollector >= 0 ? vector[nCollector] : 0;
    const vEmitter = nEmitter >= 0 ? vector[nEmitter] : 0;
    const model = evaluateBjtModel(component, vBase - vEmitter, vBase - vCollector);

    stampBjtResidualAndJacobian(
      residual,
      jacobian,
      nBase,
      nCollector,
      nEmitter,
      model,
      deviceScale
    );
  }

  opAmps.forEach((component, index) => {
    const row = opAmpRowOffset + index;
    const { plusIndex, minusIndex } = getOpAmpInputTerminalIndices(component);
    const rPlus = rootByTerminal.get(terminalKey(component.id, plusIndex));
    const rMinus = rootByTerminal.get(terminalKey(component.id, minusIndex));
    const nPlus = getNodeIdx(rPlus);
    const nMinus = getNodeIdx(rMinus);
    const vPlus = nPlus >= 0 ? vector[nPlus] : 0;
    const vMinus = nMinus >= 0 ? vector[nMinus] : 0;
    const { voltage, gain } = evaluateOpAmpModel(component, vPlus - vMinus);

    residual[row] -= voltage;

    if (nPlus >= 0) {
      jacobian[row][nPlus] -= gain;
    }

    if (nMinus >= 0) {
      jacobian[row][nMinus] += gain;
    }
  });

  return { residual, jacobian };
}

function evaluateResidualNorm(
  vector,
  baseMatrix,
  baseVector,
  diodes,
  bjts,
  opAmps,
  nodeCount,
  opAmpRowOffset,
  rootByTerminal,
  getNodeIdx,
  nonlinearScale = 1
) {
  const { residual } = evaluateNonlinearSystem(
    vector,
    baseMatrix,
    baseVector,
    diodes,
    bjts,
    opAmps,
    nodeCount,
    opAmpRowOffset,
    rootByTerminal,
    getNodeIdx,
    nonlinearScale
  );
  return residualMetricsToScore(evaluateResidualMetrics(residual, nodeCount));
}

function evaluateResidualMetrics(residual, nodeCount) {
  let maxKclResidual = 0;
  let maxConstraintResidual = 0;

  for (let index = 0; index < residual.length; index += 1) {
    const absResidual = Math.abs(residual[index]);
    if (index < nodeCount) {
      maxKclResidual = Math.max(maxKclResidual, absResidual);
    } else {
      maxConstraintResidual = Math.max(maxConstraintResidual, absResidual);
    }
  }

  return { maxKclResidual, maxConstraintResidual };
}

function residualMetricsToScore(metrics) {
  const nodeScore = metrics.maxKclResidual / NEWTON_KCL_RESIDUAL_TOLERANCE;
  const constraintScore =
    metrics.maxConstraintResidual / NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE;
  return Math.max(nodeScore, constraintScore);
}

function isResidualConverged(metrics) {
  return (
    metrics.maxKclResidual <= NEWTON_KCL_RESIDUAL_TOLERANCE &&
    metrics.maxConstraintResidual <= NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE
  );
}

function isResidualCloseEnough(metrics) {
  return (
    metrics.maxKclResidual <= NEWTON_KCL_RESIDUAL_TOLERANCE * 10 &&
    metrics.maxConstraintResidual <= NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE * 10
  );
}

function stampConductance(matrix, n0, n1, conductance) {
  if (n0 >= 0) matrix[n0][n0] += conductance;
  if (n1 >= 0) matrix[n1][n1] += conductance;
  if (n0 >= 0 && n1 >= 0) {
    matrix[n0][n1] -= conductance;
    matrix[n1][n0] -= conductance;
  }
}

function limitCandidateJunctionVoltages(candidate, previousVector, diodes, bjts, rootByTerminal, getNodeIdx) {
  if (!diodes.length && !bjts.length) return candidate;

  const limited = candidate.slice();

  for (const component of diodes) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);
    limitBranchVoltageStep(limited, previousVector, n0, n1, MAX_DIODE_VOLTAGE_STEP);
  }

  for (const component of bjts) {
    const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
    const rBase = rootByTerminal.get(terminalKey(component.id, BJT_BASE_TERMINAL_INDEX));
    const rCollector = rootByTerminal.get(terminalKey(component.id, collectorIndex));
    const rEmitter = rootByTerminal.get(terminalKey(component.id, emitterIndex));
    const nBase = getNodeIdx(rBase);
    const nCollector = getNodeIdx(rCollector);
    const nEmitter = getNodeIdx(rEmitter);

    limitBranchVoltageStep(limited, previousVector, nBase, nEmitter, MAX_BJT_JUNCTION_VOLTAGE_STEP);
    limitBranchVoltageStep(limited, previousVector, nBase, nCollector, MAX_BJT_JUNCTION_VOLTAGE_STEP);
  }

  return limited;
}

function getBranchVoltage(vector, n0, n1) {
  const v0 = n0 >= 0 ? vector[n0] : 0;
  const v1 = n1 >= 0 ? vector[n1] : 0;
  return v0 - v1;
}

function limitBranchVoltageStep(candidate, previousVector, n0, n1, maxVoltageStep = MAX_DIODE_VOLTAGE_STEP) {
  const previousDrop = getBranchVoltage(previousVector, n0, n1);
  const nextDrop = getBranchVoltage(candidate, n0, n1);
  const maxDrop = previousDrop + maxVoltageStep;
  const minDrop = previousDrop - maxVoltageStep;
  const boundedDrop = clamp(nextDrop, minDrop, maxDrop);
  const correction = boundedDrop - nextDrop;

  if (Math.abs(correction) < 1e-12) return;

  if (n0 >= 0 && n1 >= 0) {
    candidate[n0] += correction * 0.5;
    candidate[n1] -= correction * 0.5;
  } else if (n0 >= 0) {
    candidate[n0] += correction;
  } else if (n1 >= 0) {
    candidate[n1] -= correction;
  }
}

function stampBjtResidualAndJacobian(
  residual,
  jacobian,
  nBase,
  nCollector,
  nEmitter,
  model,
  scale = 1
) {
  const nodeIndices = [nBase, nCollector, nEmitter];
  const terminalCurrents = [model.ib * scale, model.ic * scale, model.ie * scale];
  const derivatives = [
    [model.dIb_dVb * scale, model.dIb_dVc * scale, model.dIb_dVe * scale],
    [model.dIc_dVb * scale, model.dIc_dVc * scale, model.dIc_dVe * scale],
    [model.dIe_dVb * scale, model.dIe_dVc * scale, model.dIe_dVe * scale],
  ];

  for (let row = 0; row < nodeIndices.length; row += 1) {
    const rowIndex = nodeIndices[row];
    if (rowIndex < 0) continue;

    residual[rowIndex] += terminalCurrents[row];

    for (let col = 0; col < nodeIndices.length; col += 1) {
      const colIndex = nodeIndices[col];
      if (colIndex < 0) continue;
      jacobian[rowIndex][colIndex] += derivatives[row][col];
    }
  }
}

function solveLinearSystem(matrix, vector) {
  const n = matrix.length;
  const A = matrix.map((row, i) => [...row, vector[i]]);

  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    let best = Math.abs(A[col][col]);

    for (let row = col + 1; row < n; row += 1) {
      const val = Math.abs(A[row][col]);
      if (val > best) {
        best = val;
        pivotRow = row;
      }
    }

    if (best < 1e-11) {
      return null;
    }

    if (pivotRow !== col) {
      const tmp = A[col];
      A[col] = A[pivotRow];
      A[pivotRow] = tmp;
    }

    const pivot = A[col][col];
    for (let j = col; j <= n; j += 1) {
      A[col][j] /= pivot;
    }

    for (let row = col + 1; row < n; row += 1) {
      const factor = A[row][col];
      if (Math.abs(factor) < 1e-14) continue;

      for (let j = col; j <= n; j += 1) {
        A[row][j] -= factor * A[col][j];
      }
    }
  }

  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let sum = A[row][n];
    for (let col = row + 1; col < n; col += 1) {
      sum -= A[row][col] * x[col];
    }
    x[row] = sum;
  }

  return x;
}

function onCircuitChanged() {
  if (state.simulationActive) {
    const result = runSimulation();
    if (!result.ok) {
      state.simulationActive = false;
      state.simulationResult = null;
      setSimulationButtonState(false);
      showStatus(result.message || "Erro na simulação", true);
    }
  }

  syncWheelWithSelectedComponent();
  requestRender(true);
}

function showStatus(text, isError = false) {
  appEls.status.textContent = text;
  appEls.status.style.background = isError ? "rgba(185, 28, 28, 0.92)" : "rgba(15, 23, 42, 0.88)";
  appEls.status.classList.add("show");

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    appEls.status.classList.remove("show");
  }, 1700);
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * GRID_SIZE * state.camera.zoom + state.camera.offsetX,
    y: worldY * GRID_SIZE * state.camera.zoom + state.camera.offsetY,
  };
}

function getVisibleWorldBounds() {
  const w = appEls.canvas.clientWidth;
  const h = appEls.canvas.clientHeight;
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(w, h);

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

function clientToCanvas(clientX, clientY) {
  const rect = appEls.canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function clientToWorld(
  clientX,
  clientY,
  zoom = state.camera.zoom,
  offsetX = state.camera.offsetX,
  offsetY = state.camera.offsetY
) {
  const point = clientToCanvas(clientX, clientY);
  return screenToWorld(point.x, point.y, zoom, offsetX, offsetY);
}

function screenToWorld(screenX, screenY, zoom = state.camera.zoom, offsetX = state.camera.offsetX, offsetY = state.camera.offsetY) {
  return {
    x: (screenX - offsetX) / (GRID_SIZE * zoom),
    y: (screenY - offsetY) / (GRID_SIZE * zoom),
  };
}

function worldLengthToScreen(lengthInGrid) {
  return lengthInGrid * GRID_SIZE * state.camera.zoom;
}

function rotateOffset(x, y, rotationDeg) {
  const rad = degToRad(rotationDeg);
  const rx = x * Math.cos(rad) - y * Math.sin(rad);
  const ry = x * Math.sin(rad) + y * Math.cos(rad);
  return {
    x: Math.round(rx),
    y: Math.round(ry),
  };
}

function terminalKey(componentId, terminalIndex) {
  return `${componentId}:${terminalIndex}`;
}

function parseTerminalKey(value) {
  const [componentId, terminalIndex] = String(value).split(":").map(Number);
  if (!Number.isFinite(componentId) || !Number.isFinite(terminalIndex)) {
    return null;
  }

  return { componentId, terminalIndex };
}

function key(x, y) {
  return `${x},${y}`;
}

function edgeKey(a, b) {
  const ak = key(a.x, a.y);
  const bk = key(b.x, b.y);
  return ak < bk ? `${ak}|${bk}` : `${bk}|${ak}`;
}

function pathStateKey(point, direction) {
  return `${key(point.x, point.y)}|${direction || "start"}`;
}

function parsePathStateKey(stateKey) {
  const splitIndex = stateKey.lastIndexOf("|");
  const pointKey = stateKey.slice(0, splitIndex);
  const direction = stateKey.slice(splitIndex + 1);
  return {
    point: parseKey(pointKey),
    direction: direction === "start" ? null : direction,
  };
}

function parseKey(k) {
  const [x, y] = k.split(",").map(Number);
  return { x, y };
}

function stepDirection(from, to) {
  if (to.x > from.x) return "right";
  if (to.x < from.x) return "left";
  if (to.y > from.y) return "down";
  return "up";
}

function oppositeDirection(direction) {
  if (direction === "right") return "left";
  if (direction === "left") return "right";
  if (direction === "down") return "up";
  if (direction === "up") return "down";
  return null;
}

function manhattan(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundTo(value, decimals) {
  const m = Math.pow(10, decimals);
  return Math.round(value * m) / m;
}

function snapToStep(value, step) {
  if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return value;
  const snapped = Math.round(value / step) * step;
  const decimals = Math.max(0, Math.round(-Math.log10(step)));
  return roundTo(snapped, decimals);
}

function safeResistance(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1e-9, value);
}

function safeOpAmpSupply(value) {
  if (!Number.isFinite(value)) return OP_AMP_MIN_SUPPLY;
  return Math.max(1e-6, Math.abs(value));
}

function safeBjtBeta(value) {
  if (!Number.isFinite(value)) return 100;
  return Math.max(1, value);
}

function evaluateJunctionModel(model, voltage) {
  const saturationCurrent = model.saturationCurrent ?? 1e-12;
  const idealityFactor = model.idealityFactor ?? 1;
  const thermalVoltage = model.thermalVoltage ?? 0.02585;
  const gmin = model.gmin ?? 0;
  const thermalFactor = Math.max(1e-9, idealityFactor * thermalVoltage);
  const expArg = clamp(voltage / thermalFactor, -60, MAX_DIODE_EXP_ARG);
  const expTerm = Math.exp(expArg);

  return {
    current: saturationCurrent * (expTerm - 1) + gmin * voltage,
    conductance: (saturationCurrent / thermalFactor) * expTerm + gmin,
  };
}

function evaluateDiodeModel(component, voltage) {
  const def = COMPONENT_DEFS[component?.type];
  return evaluateJunctionModel(def?.model || {}, voltage);
}

function evaluateForwardOnlyJunctionModel(model, voltage) {
  if (voltage <= 0) {
    return { current: 0, conductance: 0 };
  }

  return evaluateJunctionModel(model, voltage);
}

function evaluateBjtSaturationFactor(model, vce) {
  const saturationVoltage = model.saturationVoltage ?? 0.15;
  const saturationSharpness = Math.max(1e-4, model.saturationSharpness ?? 0.04);
  const arg = clamp(
    (vce - saturationVoltage) / saturationSharpness,
    -MAX_BJT_SATURATION_ARG,
    MAX_BJT_SATURATION_ARG
  );
  const factor = 1 / (1 + Math.exp(-arg));
  return {
    factor,
    conductance: (factor * (1 - factor)) / saturationSharpness,
  };
}

function evaluateBjtModel(component, vbe, vbc) {
  const def = COMPONENT_DEFS[component?.type];
  const model = def?.model || {};
  const beta = safeBjtBeta(component?.value);
  const baseJunctionModel = {
    saturationCurrent: model.baseSaturationCurrent ?? 1e-14,
    idealityFactor: model.idealityFactor ?? 1.2,
    thermalVoltage: model.thermalVoltage ?? 0.02585,
    gmin: model.gmin ?? 1e-9,
  };
  const collectorJunctionModel = {
    saturationCurrent: model.collectorSaturationCurrent ?? 1e-14,
    idealityFactor: model.idealityFactor ?? 1.2,
    thermalVoltage: model.thermalVoltage ?? 0.02585,
    gmin: 0,
  };
  const collectorEmitterConductance = model.collectorEmitterConductance ?? 1e-9;
  const baseDiode = evaluateJunctionModel(baseJunctionModel, vbe);
  const baseTransport = evaluateForwardOnlyJunctionModel(
    { ...baseJunctionModel, gmin: 0 },
    vbe
  );
  // BC only contributes when directly polarized to avoid self-biasing an open base.
  const collectorDiode = evaluateForwardOnlyJunctionModel(collectorJunctionModel, vbc);
  const vce = vbe - vbc;
  const saturation = evaluateBjtSaturationFactor(model, vce);
  const controlledCollectorCurrent = beta * baseTransport.current * saturation.factor;
  const collectorEmitterLeakage = collectorEmitterConductance * vce;

  const ic = controlledCollectorCurrent - collectorDiode.current + collectorEmitterLeakage;
  const ib = baseDiode.current + collectorDiode.current;
  const ie = -(ic + ib);

  const dIc_dVb = beta * baseTransport.conductance * saturation.factor - collectorDiode.conductance;
  const dIc_dVc =
    beta * baseTransport.current * saturation.conductance +
    collectorDiode.conductance +
    collectorEmitterConductance;
  const dIc_dVe =
    -beta * baseTransport.conductance * saturation.factor -
    beta * baseTransport.current * saturation.conductance -
    collectorEmitterConductance;
  const dIb_dVb = baseDiode.conductance + collectorDiode.conductance;
  const dIb_dVc = -collectorDiode.conductance;
  const dIb_dVe = -baseDiode.conductance;

  return {
    ib,
    ic,
    ie,
    dIb_dVb,
    dIb_dVc,
    dIb_dVe,
    dIc_dVb,
    dIc_dVc,
    dIc_dVe,
    dIe_dVb: -(dIc_dVb + dIb_dVb),
    dIe_dVc: -(dIc_dVc + dIb_dVc),
    dIe_dVe: -(dIc_dVe + dIb_dVe),
  };
}

function evaluateOpAmpModel(component, differentialVoltage) {
  const supply = safeOpAmpSupply(component?.value);
  const arg = clamp((OP_AMP_OPEN_LOOP_GAIN * differentialVoltage) / supply, -MAX_OP_AMP_TANH_ARG, MAX_OP_AMP_TANH_ARG);
  const tanhValue = Math.tanh(arg);
  const sech2 = Math.max(0, 1 - tanhValue * tanhValue);

  return {
    voltage: supply * tanhValue,
    gain: OP_AMP_OPEN_LOOP_GAIN * sech2,
  };
}

function normalizeRotation(rotation) {
  return ((rotation % 360) + 360) % 360;
}

function degToRad(deg) {
  return (deg * Math.PI) / 180;
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function distanceToSegment(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const denom = abx * abx + aby * aby;

  if (denom < 1e-12) {
    return Math.hypot(px - ax, py - ay);
  }

  const t = clamp((apx * abx + apy * aby) / denom, 0, 1);
  const cx = ax + t * abx;
  const cy = ay + t * aby;
  return Math.hypot(px - cx, py - cy);
}

function getPointProjectionSideSign(point, midX, midY, normalX, normalY) {
  if (!point) return 1;
  const projection = (point.x - midX) * normalX + (point.y - midY) * normalY;
  return projection >= 0 ? -1 : 1;
}

function formatComponentValue(component) {
  return getComponentBehavior(component.type).formatValue(component);
}

function multiplyMatrixVector(matrix, vector) {
  return matrix.map((row) => {
    let sum = 0;
    for (let i = 0; i < row.length; i += 1) {
      sum += row[i] * vector[i];
    }
    return sum;
  });
}

function maxAbsValue(values) {
  let max = 0;
  for (const value of values) {
    max = Math.max(max, Math.abs(value));
  }
  return max;
}

function formatResistance(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${roundTo(value / 1_000_000, 2)} MΩ`;
  if (abs >= 1_000) return `${roundTo(value / 1_000, 2)} kΩ`;
  return `${roundTo(value, 2)} Ω`;
}

function formatEngineeringValue(value, unit, decimals = 2) {
  if (!Number.isFinite(value) || value === 0) {
    return `0 ${unit}`;
  }

  const prefixes = new Map([
    [-12, "p"],
    [-9, "n"],
    [-6, "µ"],
    [-3, "m"],
    [0, ""],
    [3, "k"],
    [6, "M"],
    [9, "G"],
    [12, "T"],
  ]);
  const abs = Math.abs(value);
  const rawExponent = Math.floor(Math.log10(abs) / 3) * 3;
  const exponent = clamp(rawExponent, -12, 12);
  const scaled = value / Math.pow(10, exponent);
  return `${roundTo(scaled, decimals)} ${prefixes.get(exponent)}${unit}`;
}

function formatVoltage(value) {
  return formatEngineeringValue(value, "V");
}

function formatSymmetricVoltage(value) {
  return `±${roundTo(Math.abs(value), 1)} V`;
}

function formatCurrent(value) {
  return formatEngineeringValue(value, "A");
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  context.beginPath();
  context.moveTo(x + r, y);
  context.lineTo(x + width - r, y);
  context.arcTo(x + width, y, x + width, y + r, r);
  context.lineTo(x + width, y + height - r);
  context.arcTo(x + width, y + height, x + width - r, y + height, r);
  context.lineTo(x + r, y + height);
  context.arcTo(x, y + height, x, y + height - r, r);
  context.lineTo(x, y + r);
  context.arcTo(x, y, x + r, y, r);
  context.closePath();
}

function svgToDataUri(svg) {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function buildOpAmpMarkerSvg(y, isPlus) {
  const horizontal = `<line x1="44" y1="${y}" x2="56" y2="${y}"/>`;
  if (!isPlus) return horizontal;
  return `${horizontal}
        <line x1="50" y1="${y - 6}" x2="50" y2="${y + 6}"/>`;
}

function buildDefaultComponentSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="40" y1="0" x2="40" y2="24"/>
      <line x1="16" y1="26" x2="64" y2="26"/>
      <line x1="24" y1="40" x2="56" y2="40"/>
      <line x1="30" y1="54" x2="50" y2="54"/>
    </g>
  </svg>`;
}

function buildResistorSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="34" y2="40"/>
      <polyline points="34,40 44,18 56,62 68,18 80,62 92,18 104,62 116,18 126,40"/>
      <line x1="126" y1="40" x2="160" y2="40"/>
    </g>
  </svg>`;
}

function buildVoltageSourceSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="42" y2="40"/>
      <line x1="118" y1="40" x2="160" y2="40"/>
      <circle cx="80" cy="40" r="37"/>
      <line x1="58" y1="40" x2="74" y2="40"/>
      <line x1="94" y1="32" x2="94" y2="48"/>
      <line x1="86" y1="40" x2="102" y2="40"/>
    </g>
  </svg>`;
}

function buildCurrentSourceSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="42" y2="40"/>
      <line x1="118" y1="40" x2="160" y2="40"/>
      <circle cx="80" cy="40" r="37"/>
    </g>
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="58" y1="40" x2="102" y2="40"/>
      <polyline points="92,30 102,40 92,50"/>
    </g>
  </svg>`;
}

function buildOpAmpSvg(options = {}) {
  const showMarkers = options.showOpAmpMarkers !== false;
  const plusOnTop = options.opAmpPlusOnTop !== false;
  const topMarker = showMarkers ? buildOpAmpMarkerSvg(40, plusOnTop) : "";
  const bottomMarker = showMarkers ? buildOpAmpMarkerSvg(120, !plusOnTop) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 160">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="34" y2="40"/>
      <line x1="0" y1="120" x2="34" y2="120"/>
      <line x1="166" y1="80" x2="200" y2="80"/>
      <polygon points="34,16 34,144 166,80" fill="#e2e8f0"/>
      ${topMarker}
      ${bottomMarker}
    </g>
  </svg>`;
}

function buildDiodeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <line x1="0" y1="40" x2="42" y2="40" fill="none"/>
      <line x1="100" y1="40" x2="160" y2="40" fill="none"/>
      <polygon points="42,16 42,64 100,40" fill="#e2e8f0"/>
      <line x1="100" y1="16" x2="100" y2="64" fill="none"/>
    </g>
  </svg>`;
}

function buildBjtNpnSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="80" x2="50" y2="80"/>
      <line x1="50" y1="48" x2="50" y2="112"/>
      <line x1="50" y1="80" x2="80" y2="48"/>
      <line x1="80" y1="48" x2="80" y2="0"/>
      <line x1="50" y1="80" x2="80" y2="112"/>
      <line x1="80" y1="112" x2="80" y2="160"/>
      <line x1="66" y1="112" x2="80" y2="112"/>
      <line x1="80" y1="98" x2="80" y2="112"/>
    </g>
  </svg>`;
}

function buildGroundSvg() {
  return buildDefaultComponentSvg();
}

function buildSvgForType(type, options = {}) {
  return getComponentBehavior(type).buildSvg(options);
}

class DisjointSet {
  constructor(items) {
    this.parent = new Map();
    this.rank = new Map();
    for (const item of items) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
    }
  }

  find(item) {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
      return item;
    }

    const parent = this.parent.get(item);
    if (parent !== item) {
      const root = this.find(parent);
      this.parent.set(item, root);
      return root;
    }

    return parent;
  }

  union(a, b) {
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    if (rankA < rankB) {
      [rootA, rootB] = [rootB, rootA];
    }

    this.parent.set(rootB, rootA);
    if (rankA === rankB) {
      this.rank.set(rootA, rankA + 1);
    }
  }
}
