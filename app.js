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
const DELETE_BUTTON_HOLD_MS = 1000;
const EXPORT_BUTTON_HOLD_MS = 1000;
const SIMULATION_BUTTON_ICONS = {
  idle: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5.5v13l10-6.5z"/></svg>',
  running:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 5h4v14H7zm6 0h4v14h-4z"/></svg>',
};
const CURRENT_ARROW_BUTTON_ICONS = {
  visible:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 5c-5.85 0-9.64 5.22-10 5.78L1.5 12l.5 1.22C2.36 13.78 6.15 19 12 19s9.64-5.22 10-5.78l.5-1.22-.5-1.22C21.64 10.22 17.85 5 12 5zm0 11c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm0-6.2A2.2 2.2 0 1 0 12 14.2a2.2 2.2 0 0 0 0-4.4z"/></svg>',
  hidden:
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.27 2 2 3.27l3 3C2.92 7.9 1.52 9.84 1 10.78L.5 12l.5 1.22C1.36 13.78 5.15 19 11 19c2.03 0 3.83-.63 5.38-1.53L20.73 22 22 20.73 3.27 2zM12 16c-2.21 0-4-1.79-4-4 0-.53.1-1.03.29-1.49l5.2 5.2c-.46.19-.96.29-1.49.29zm10.5-4-.5 1.22c-.3.73-1.64 3-3.92 4.8l-1.45-1.45C18.09 15.32 19.3 13.6 19.7 13l.3-.46-.3-.46C19.34 11.53 16.31 7 12 7c-.84 0-1.64.11-2.39.31L8.02 5.72C9.25 5.26 10.57 5 12 5c5.85 0 9.64 5.22 10 5.78L22.5 12zm-6.43.54-4.61-4.61c.18-.02.36-.03.54-.03 2.21 0 4 1.79 4 4 0 .18-.01.36-.03.64z"/></svg>',
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
      [-3, -1],
      [-3, 1],
      [3, 0],
    ],
    bodyHalfW: 2.7,
    bodyHalfH: 1.55,
    renderW: 6,
    renderH: 4,
    defaultValue: 15,
    editable: true,
    showValueLabel: false,
    unit: "V",
    obstacleCells: [
      [-2, -1],
      [-1, -1],
      [0, -1],
      [-2, 0],
      [-1, 0],
      [0, 0],
      [1, 0],
      [2, 0],
      [-2, 1],
      [-1, 1],
      [0, 1],
    ],
    footprintExtents: { left: 3, right: 3, up: 2.5, down: 2.5 },
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
    buildSvg: (options = {}) => buildVoltageSourceSvg(options),
    formatValue: (component) => formatVoltage(component.value),
    valueFromNormalized: (normalized) => roundTo(-24 + 48 * clamp(normalized, 0, 1), 1),
    normalizedFromValue: (component) => clamp((component.value + 24) / 48, 0, 1),
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    drawSpriteOverlay: (component, renderTarget) =>
      drawVoltageSourcePolarityMarkers(renderTarget, component),
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
    drawSpriteOverlay: (component, renderTarget) => drawOpAmpInputMarkers(renderTarget, component),
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
  selectedNodeMarkerRoot: null,
  selectedNodeMarkerTerminal: null,
  pendingTerminal: null,
  simulationActive: false,
  simulationResult: null,
  hiddenNodeMarkerRoots: new Set(),
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
};

const mainRenderTarget = createRenderTarget(appEls.canvas);
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

const spriteMap = loadSprites();

function createRenderTarget(
  canvas,
  {
    width = Math.max(1, Math.floor(canvas?.clientWidth || canvas?.width || 1)),
    height = Math.max(1, Math.floor(canvas?.clientHeight || canvas?.height || 1)),
    dpr = Math.max(1, window.devicePixelRatio || 1),
  } = {}
) {
  const context = canvas?.getContext("2d");
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

function loadSprites() {
  const sprites = {};
  for (const type of COMPONENT_ORDER) {
    const svg = buildSvgForType(type, {
      showOpAmpMarkers: type !== "op_amp",
      showPolarityMarkers: type !== "voltage_source",
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
      updateSelectionUi();
      showStatus("Simulação DC ativa");
      return;
    }

    state.simulationActive = false;
    state.simulationResult = null;
    state.hiddenNodeMarkerRoots.clear();
    state.selectedNodeMarkerRoot = null;
    state.selectedNodeMarkerTerminal = null;
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

function clearCircuit() {
  state.components = [];
  state.wires = [];
  state.nextComponentId = 1;
  state.nextWireId = 1;
  state.nextSplitGroupId = 1;
  state.selectedComponentId = null;
  state.selectedWireId = null;
  state.selectedNodeMarkerRoot = null;
  state.selectedNodeMarkerTerminal = null;
  state.pendingTerminal = null;
  state.simulationActive = false;
  state.simulationResult = null;
  state.hiddenNodeMarkerRoots.clear();

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

function canToggleCurrentArrow(component) {
  return !!component && isSimulatedBranchComponent(component.type) && component.type !== "ground";
}

function canToggleNodeMarkerVoltage(nodeMarker) {
  return !!nodeMarker && state.simulationActive && state.simulationResult?.ok;
}

function setVisibilityToggleButtonState({ mode, hidden }) {
  const label =
    mode === "node"
      ? hidden
        ? "Mostrar tensão do nó"
        : "Ocultar tensão do nó"
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

function toggleSelectedAnnotationVisibility() {
  const nodeMarker = getSelectedNodeMarker();
  if (canToggleNodeMarkerVoltage(nodeMarker)) {
    if (state.hiddenNodeMarkerRoots.has(nodeMarker.root)) {
      state.hiddenNodeMarkerRoots.delete(nodeMarker.root);
      setVisibilityToggleButtonState({ mode: "node", hidden: false });
      requestRender(true);
      showStatus("Tensão do nó visível");
      return;
    }

    state.hiddenNodeMarkerRoots.add(nodeMarker.root);
    setVisibilityToggleButtonState({ mode: "node", hidden: true });
    requestRender(true);
    showStatus("Tensão do nó oculta");
    return;
  }

  const component = getComponentById(state.selectedComponentId);
  if (!canToggleCurrentArrow(component)) return;

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

function clearDeleteButtonHold() {
  if (deleteButtonHoldState.timerId == null) return;

  clearTimeout(deleteButtonHoldState.timerId);
  deleteButtonHoldState.timerId = null;
}

function setupExportButtonGestures() {
  appEls.exportBtn.addEventListener("click", (event) => {
    if (exportButtonHoldState.suppressNextClick) {
      exportButtonHoldState.suppressNextClick = false;
      event.preventDefault();
      return;
    }

    void handleExportAction({ background: "white" });
  });

  appEls.exportBtn.addEventListener("pointerdown", (event) => {
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

  appEls.exportBtn.addEventListener("pointerup", clearExportButtonHold);
  appEls.exportBtn.addEventListener("pointerleave", clearExportButtonHold);
  appEls.exportBtn.addEventListener("pointercancel", clearExportButtonHold);
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
    const canvasPoint = clientToCanvas(event.clientX, event.clientY);
    const nodeMarkerHit = pickNodeMarker(canvasPoint.x, canvasPoint.y);
    if (nodeMarkerHit) {
      clearEmptyCanvasTapHistory();
      selectNodeMarker(nodeMarkerHit.root);
      return;
    }

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

      const canvasPoint = clientToCanvas(event.clientX, event.clientY);
      if (pickNodeMarker(canvasPoint.x, canvasPoint.y)) {
        return;
      }

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
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = normalizedFromValue(component);
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
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = null;
    try {
      appEls.valueWheel.releasePointerCapture(event.pointerId);
    } catch (_) {}
  });

  appEls.valueWheel.addEventListener("pointercancel", () => {
    wheelState.dragging = false;
    wheelState.pointerId = null;
    wheelState.lastRawNormalized = null;
    wheelState.activeNormalized = null;
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
  } = options;

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
      context.fillStyle = "rgba(245, 158, 11, 0.2)";
      context.fill();
      context.lineWidth = 2;
      context.strokeStyle = "#f59e0b";
      context.stroke();
    }
  }

  if (state.simulationActive && state.simulationResult?.ok) {
    drawSimulationAnnotations(renderTarget, state.simulationResult.data);
  }
}

function drawGrid(renderTarget) {
  const { context, width, height } = renderTarget;
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(width, height);

  const minX = Math.floor(topLeft.x) - 1;
  const maxX = Math.ceil(bottomRight.x) + 1;
  const minY = Math.floor(topLeft.y) - 1;
  const maxY = Math.ceil(bottomRight.y) + 1;

  const r = Math.max(0.8, Math.min(1.8, state.camera.zoom * 1.15));
  context.fillStyle = "rgba(15, 23, 42, 0.2)";

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
    context.strokeStyle = isSelected ? "#ea580c" : "#0f172a";
    context.stroke();
  }
}

function drawComponents(renderTarget, showSelection = true) {
  const { context } = renderTarget;
  for (const component of state.components) {
    const def = COMPONENT_DEFS[component.type];
    const behavior = getComponentBehavior(component.type);
    const sprite = spriteMap[component.type];
    const center = worldToScreen(component.x, component.y);
    const width = worldLengthToScreen(def.renderW);
    const height = worldLengthToScreen(def.renderH);
    const renderOffsetX = worldLengthToScreen(def.renderOffsetX || 0);
    const renderOffsetY = worldLengthToScreen(def.renderOffsetY || 0);

    context.save();
    context.translate(center.x, center.y);
    context.rotate(degToRad(component.rotation));
    behavior.applySpriteTransform(context, component);

    if (sprite?.complete) {
      context.drawImage(
        sprite,
        -width / 2 + renderOffsetX,
        -height / 2 + renderOffsetY,
        width,
        height
      );
    } else if (width > 0 && height > 0) {
      context.fillStyle = "#dbe4ef";
      context.fillRect(-width / 2 + renderOffsetX, -height / 2 + renderOffsetY, width, height);
    }

    behavior.drawSpriteOverlay(component, renderTarget);

    if (showSelection && state.selectedComponentId === component.id) {
      context.strokeStyle = "#0ea5a8";
      context.lineWidth = 2;
      context.strokeRect(
        -width / 2 + renderOffsetX - 4,
        -height / 2 + renderOffsetY - 4,
        width + 8,
        height + 8
      );
    }

    context.restore();

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
          ? "#0f172a"
          : isPending || isNodeMarkerTerminalSelected
            ? "#f59e0b"
            : connected
              ? "#0f172a"
              : "#f8fafc";
      context.fill();
      context.lineWidth = 1.5;
      context.strokeStyle = component.type === "junction" || connected ? "#0f172a" : "#334155";
      context.stroke();
    }

    if (def.editable && def.showValueLabel !== false) {
      const labelPoint = getValueLabelAnchor(component);
      const screenPoint = worldToScreen(labelPoint.x, labelPoint.y);
      const valueText = formatComponentValue(component);
      context.font = `${Math.max(13, 13 * state.camera.zoom)}px "Avenir Next", sans-serif`;
      context.fillStyle = "#0f172a";
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

function drawOpAmpInputMarkers(renderTarget, component) {
  const { context } = renderTarget;
  const def = COMPONENT_DEFS.op_amp;
  const { plusIndex, minusIndex } = getOpAmpInputTerminalIndices(component);
  const plusBase = def.terminals[plusIndex];
  const minusBase = def.terminals[minusIndex];
  if (!plusBase || !minusBase) return;

  const markerOffsetX = 1.8;
  const halfSpan = Math.max(4.8, worldLengthToScreen(0.18));
  context.strokeStyle = "#0f172a";
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
  const rotationRad = degToRad(component.rotation);
  const offset = worldLengthToScreen(0.35);
  const halfSpan = Math.max(6, worldLengthToScreen(0.22));
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const minusCenterX = -offset * cos;
  const minusCenterY = -offset * sin;
  const plusCenterX = offset * cos;
  const plusCenterY = offset * sin;

  context.save();
  context.rotate(-rotationRad);
  context.strokeStyle = "#0f172a";
  context.lineWidth = Math.max(4.2, state.camera.zoom * 4.2);
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
  if (!data) return;

  for (const marker of data.nodeMarkers) {
    if (state.hiddenNodeMarkerRoots.has(marker.root)) continue;
    const metrics = getNodeMarkerRenderMetrics(renderTarget, marker);

    context.fillStyle = "rgba(15, 23, 42, 0.86)";
    roundedRect(context, metrics.boxX, metrics.boxY, metrics.boxW, metrics.boxH, 8);
    context.fill();

    if (state.selectedNodeMarkerRoot === marker.root) {
      context.lineWidth = 2;
      context.strokeStyle = "#0ea5a8";
      roundedRect(context, metrics.boxX, metrics.boxY, metrics.boxW, metrics.boxH, 8);
      context.stroke();
    }

    context.fillStyle = "#f8fafc";
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

function getCurrentArrowTerminalPair(component) {
  return getComponentBehavior(component.type).getCurrentArrowTerminalPair(component);
}

function getNodeMarkerRenderMetrics(renderTarget, marker) {
  const { context } = renderTarget;
  const sp = worldToScreen(marker.x, marker.y);
  const label = `${formatVoltage(marker.voltage)}`;

  context.font = '12px "Avenir Next", sans-serif';
  const textW = context.measureText(label).width;
  const padX = 7;
  const boxW = textW + padX * 2;
  const boxH = 20;
  const placement = getNodeMarkerPlacement(sp, boxW, boxH, marker.labelDirection);

  return {
    label,
    boxW,
    boxH,
    boxX: placement.boxX,
    boxY: placement.boxY,
    textX: placement.textX,
    textY: placement.textY,
  };
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

function drawCurrentArrow(renderTarget, component, current) {
  const { context } = renderTarget;
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

  context.strokeStyle = "#dc2626";
  context.fillStyle = "#dc2626";
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

  context.fillStyle = "#7f1d1d";
  context.textAlign = textAlign;
  context.textBaseline = textBaseline;
  context.fillText(text, textX, textY);
}

function startSingleTouch(touch) {
  const canvasPoint = clientToCanvas(touch.clientX, touch.clientY);
  const nodeMarkerHit = pickNodeMarker(canvasPoint.x, canvasPoint.y);
  if (nodeMarkerHit) {
    clearEmptyCanvasTapHistory();
    selectNodeMarker(nodeMarkerHit.root);
    state.pointer.mode = "none";
    return;
  }

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
  if (trySelectNodeMarkerFromTerminal(componentId, terminalIndex)) {
    return;
  }

  if (state.selectedWireId != null || state.selectedNodeMarkerRoot != null) {
    state.selectedWireId = null;
    state.selectedNodeMarkerRoot = null;
    state.selectedNodeMarkerTerminal = null;
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

  if (state.selectedWireId != null || state.selectedNodeMarkerRoot != null) {
    state.selectedWireId = null;
    state.selectedNodeMarkerRoot = null;
    state.selectedNodeMarkerTerminal = null;
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

function snapshotWireStates(wires) {
  const previousPaths = new Map();
  for (const wire of wires) {
    previousPaths.set(wire.id, {
      path: wire.path,
      implicitContact: wire.implicitContact === true,
    });
  }
  return previousPaths;
}

function restoreWireStates(wires, previousPaths) {
  for (const wire of wires) {
    const previousState = previousPaths.get(wire.id);
    if (!previousState) continue;
    wire.path = previousState.path;
    wire.implicitContact = previousState.implicitContact;
  }
}

function tryMoveComponent(componentId, targetX, targetY) {
  const result = moveComponentInCircuit(state, componentId, targetX, targetY);
  if (result.ok) {
    onCircuitChanged();
    if (result.selectionChanged) {
      updateSelectionUi();
    }
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
  const previousWireStates = snapshotWireStates(linkedWires);
  const previousNextWireId = circuit.nextWireId;

  component.x = targetX;
  component.y = targetY;

  const autoContactCandidate = findAutoContactCandidateInCircuit(circuit, componentId);
  if (
    !isComponentPlacementValidForComponents(circuit.components, component, component.id, 0) &&
    !autoContactCandidate
  ) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    return { ok: false };
  }

  const contactSyncResult = syncImplicitContactWiresInCircuit(
    circuit,
    componentId,
    autoContactCandidate
  );
  if (!contactSyncResult.ok || !rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    circuit.nextWireId = previousNextWireId;
    if (contactSyncResult.createdWireId != null) {
      circuit.wires = circuit.wires.filter((wire) => wire.id !== contactSyncResult.createdWireId);
    }
    restoreWireStates(linkedWires, previousWireStates);
    return { ok: false };
  }

  const selectionChanged = clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, component, selectionChanged };
}

function rotateComponentInCircuit(circuit, componentId, step = 90) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const previousRotation = component.rotation;
  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  const previousWireStates = snapshotWireStates(linkedWires);

  component.rotation = normalizeRotation(component.rotation + step);

  if (!isComponentPlacementValidForComponents(circuit.components, component, component.id, 0)) {
    component.rotation = previousRotation;
    return { ok: false, message: "Rotacao bloqueada por colisao" };
  }

  const contactSyncResult = syncImplicitContactWiresInCircuit(circuit, componentId);
  if (!contactSyncResult.ok || !rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.rotation = previousRotation;
    restoreWireStates(linkedWires, previousWireStates);
    return { ok: false, message: "Sem rota livre para os fios" };
  }

  return {
    ok: true,
    component,
    selectionChanged: clearInvalidSelectionsInCircuit(circuit),
  };
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

function findAutoContactCandidateInCircuit(circuit, movingComponentId) {
  const movingComponent = getComponentByIdFromCollection(circuit.components, movingComponentId);
  if (!movingComponent) return null;

  const overlappingComponents = circuit.components.filter(
    (component) =>
      component.id !== movingComponentId && componentsOverlap(movingComponent, component, 0)
  );
  if (overlappingComponents.length !== 1) {
    return null;
  }

  const targetComponent = overlappingComponents[0];
  const movingDef = COMPONENT_DEFS[movingComponent.type];
  const targetDef = COMPONENT_DEFS[targetComponent.type];
  let match = null;

  for (let movingTerminalIndex = 0; movingTerminalIndex < movingDef.terminals.length; movingTerminalIndex += 1) {
    const movingTerminal = getTerminalPositionForComponents(
      circuit.components,
      movingComponentId,
      movingTerminalIndex
    );
    if (!movingTerminal) continue;

    for (let targetTerminalIndex = 0; targetTerminalIndex < targetDef.terminals.length; targetTerminalIndex += 1) {
      const targetTerminal = getTerminalPositionForComponents(
        circuit.components,
        targetComponent.id,
        targetTerminalIndex
      );
      if (!targetTerminal || !sameGridPoint(movingTerminal, targetTerminal)) {
        continue;
      }

      const fromRef = { componentId: movingComponentId, terminalIndex: movingTerminalIndex };
      const toRef = { componentId: targetComponent.id, terminalIndex: targetTerminalIndex };
      const existingWire = findDirectWireBetweenInCircuit(circuit, fromRef, toRef);

      if (match) {
        return null;
      }

      match = {
        fromRef,
        toRef,
        existingWire,
      };
    }
  }

  return match;
}

function findDirectWireBetweenInCircuit(circuit, firstRef, secondRef) {
  return (
    circuit.wires.find((wire) => wireConnectsTerminalRefs(wire, firstRef, secondRef)) || null
  );
}

function wireConnectsTerminalRefs(wire, firstRef, secondRef) {
  return (
    (terminalRefsEqual(wire.from, firstRef) && terminalRefsEqual(wire.to, secondRef)) ||
    (terminalRefsEqual(wire.from, secondRef) && terminalRefsEqual(wire.to, firstRef))
  );
}

function syncImplicitContactWiresInCircuit(circuit, componentId, autoContactCandidate = null) {
  let activeWire = autoContactCandidate?.existingWire || null;
  let createdWireId = null;

  if (!activeWire && autoContactCandidate) {
    activeWire = buildImplicitContactWireInCircuit(
      circuit,
      autoContactCandidate.fromRef,
      autoContactCandidate.toRef
    );
    if (!activeWire) {
      return { ok: false };
    }
    circuit.wires.push(activeWire);
    createdWireId = activeWire.id;
  }

  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  for (const wire of linkedWires) {
    const isActiveWire = activeWire?.id === wire.id;
    if (!wire.implicitContact && !isActiveWire) continue;

    const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, wire);
    if (!terminalPositions) {
      return { ok: false, createdWireId };
    }

    const coincident = sameGridPoint(terminalPositions.start, terminalPositions.end);
    if (coincident && (wire.implicitContact || isActiveWire)) {
      wire.implicitContact = true;
      wire.path = [
        clonePoint(terminalPositions.start),
        clonePoint(terminalPositions.end),
      ];
      continue;
    }

    if (wire.implicitContact) {
      wire.implicitContact = false;
    }
  }

  return { ok: true, createdWireId };
}

function buildImplicitContactWireInCircuit(circuit, fromRef, toRef) {
  const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, {
    from: fromRef,
    to: toRef,
  });
  if (!terminalPositions) {
    return null;
  }

  return {
    id: circuit.nextWireId++,
    from: cloneTerminalRef(fromRef),
    to: cloneTerminalRef(toRef),
    path: [
      clonePoint(terminalPositions.start),
      clonePoint(terminalPositions.end),
    ],
    implicitContact: true,
  };
}

function getWireTerminalPositionsForComponents(components, wire) {
  const start = getTerminalPositionForComponents(
    components,
    wire.from.componentId,
    wire.from.terminalIndex
  );
  const end = getTerminalPositionForComponents(
    components,
    wire.to.componentId,
    wire.to.terminalIndex
  );

  if (!start || !end) {
    return null;
  }

  return { start, end };
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
    if (wire.implicitContact) continue;

    const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, wire);
    if (!terminalPositions) return false;

    const route = routeWireInCircuit(
      circuit,
      terminalPositions.start,
      terminalPositions.end,
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

function isWireVisible(wire) {
  return (
    !!wire &&
    wire.implicitContact !== true &&
    Array.isArray(wire.path) &&
    wire.path.length >= 2
  );
}

function getWiresForComponentFromCollection(wires, componentId) {
  return wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
}

function getWiresForComponent(componentId) {
  return getWiresForComponentFromCollection(state.wires, componentId);
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
    if (!isWireVisible(wire)) continue;
    const path = wire.path;

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

function pickNodeMarker(screenX, screenY, renderTarget = mainRenderTarget) {
  if (!state.simulationActive || !state.simulationResult?.ok) return null;

  const hitPadding = 6;
  for (let i = state.simulationResult.data.nodeMarkers.length - 1; i >= 0; i -= 1) {
    const marker = state.simulationResult.data.nodeMarkers[i];
    if (state.hiddenNodeMarkerRoots.has(marker.root)) continue;

    const metrics = getNodeMarkerRenderMetrics(renderTarget, marker);
    if (
      screenX >= metrics.boxX - hitPadding &&
      screenX <= metrics.boxX + metrics.boxW + hitPadding &&
      screenY >= metrics.boxY - hitPadding &&
      screenY <= metrics.boxY + metrics.boxH + hitPadding
    ) {
      return marker;
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
  state.selectedNodeMarkerRoot = null;
  state.selectedNodeMarkerTerminal = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function selectWire(wireId) {
  state.selectedWireId = wireId;
  state.selectedComponentId = null;
  state.selectedNodeMarkerRoot = null;
  state.selectedNodeMarkerTerminal = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function selectNodeMarker(root, terminalRef = null) {
  state.selectedNodeMarkerRoot = root;
  state.selectedNodeMarkerTerminal = terminalRef ? cloneTerminalRef(terminalRef) : null;
  state.selectedComponentId = null;
  state.selectedWireId = null;
  state.pendingTerminal = null;
  updateSelectionUi();
}

function clearSelection() {
  state.selectedComponentId = null;
  state.selectedWireId = null;
  state.selectedNodeMarkerRoot = null;
  state.selectedNodeMarkerTerminal = null;
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
  let changed = false;

  if (
    circuit.selectedComponentId != null &&
    !getComponentByIdFromCollection(circuit.components, circuit.selectedComponentId)
  ) {
    circuit.selectedComponentId = null;
    changed = true;
  }

  const selectedWire =
    circuit.selectedWireId != null
      ? getWireByIdFromCollection(circuit.wires, circuit.selectedWireId)
      : null;
  if (circuit.selectedWireId != null && (!selectedWire || !isWireVisible(selectedWire))) {
    circuit.selectedWireId = null;
    changed = true;
  }

  if (circuit.selectedNodeMarkerRoot != null) {
    const nodeMarkers = circuit.simulationResult?.ok ? circuit.simulationResult.data.nodeMarkers : null;
    if (!nodeMarkers?.some((marker) => marker.root === circuit.selectedNodeMarkerRoot)) {
      circuit.selectedNodeMarkerRoot = null;
      circuit.selectedNodeMarkerTerminal = null;
      changed = true;
    }
  }

  if (circuit.selectedNodeMarkerRoot == null && circuit.selectedNodeMarkerTerminal != null) {
    circuit.selectedNodeMarkerTerminal = null;
    changed = true;
  }

  if (circuit.selectedNodeMarkerTerminal != null) {
    const selectedTerminalComponent = getComponentByIdFromCollection(
      circuit.components,
      circuit.selectedNodeMarkerTerminal.componentId
    );
    const selectedTerminalDef = selectedTerminalComponent
      ? COMPONENT_DEFS[selectedTerminalComponent.type]
      : null;
    if (
      !selectedTerminalComponent ||
      !selectedTerminalDef ||
      !selectedTerminalDef.terminals[circuit.selectedNodeMarkerTerminal.terminalIndex]
    ) {
      circuit.selectedNodeMarkerTerminal = null;
      changed = true;
    }
  }

  if (circuit.hiddenNodeMarkerRoots instanceof Set && circuit.simulationResult?.ok) {
    const validRoots = new Set(circuit.simulationResult.data.nodeMarkers.map((marker) => marker.root));
    for (const root of [...circuit.hiddenNodeMarkerRoots]) {
      if (validRoots.has(root)) continue;
      circuit.hiddenNodeMarkerRoots.delete(root);
      changed = true;
    }
  }

  if (!circuit.pendingTerminal) {
    return changed;
  }

  const pendingComponent = getComponentByIdFromCollection(
    circuit.components,
    circuit.pendingTerminal.componentId
  );
  const def = pendingComponent ? COMPONENT_DEFS[pendingComponent.type] : null;
  if (!pendingComponent || !def || !def.terminals[circuit.pendingTerminal.terminalIndex]) {
    circuit.pendingTerminal = null;
    changed = true;
  }

  return changed;
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

function getSelectedNodeMarker() {
  if (state.selectedNodeMarkerRoot == null || !state.simulationResult?.ok) {
    return null;
  }

  return (
    state.simulationResult.data.nodeMarkers.find((marker) => marker.root === state.selectedNodeMarkerRoot) || null
  );
}

function getNodeMarkerRootForTerminal(componentId, terminalIndex) {
  if (!state.simulationActive || !state.simulationResult?.ok) {
    return null;
  }

  const root = state.simulationResult.data.rootByTerminal?.get(terminalKey(componentId, terminalIndex)) ?? null;
  if (root == null) {
    return null;
  }

  return state.simulationResult.data.nodeMarkers.some((marker) => marker.root === root) ? root : null;
}

function trySelectNodeMarkerFromTerminal(componentId, terminalIndex) {
  if (state.pendingTerminal) {
    return false;
  }

  const root = getNodeMarkerRootForTerminal(componentId, terminalIndex);
  if (root == null) {
    return false;
  }

  selectNodeMarker(root, { componentId, terminalIndex });
  return true;
}

function updateSelectionUi() {
  requestRender(true);
  clearInvalidSelectionsInCircuit(state);

  const component = getComponentById(state.selectedComponentId);
  const wire = getWireById(state.selectedWireId);
  const nodeMarker = getSelectedNodeMarker();
  const canExport = state.components.length > 0;

  if (!component && !wire && !nodeMarker) {
    clearDeleteButtonHold();
    deleteButtonHoldState.suppressNextClick = false;
    appEls.exportBtn.classList.toggle("hidden", !canExport);
    appEls.currentArrowBtn.classList.add("hidden");
    appEls.rotateBtn.classList.add("hidden");
    appEls.deleteBtn.classList.add("hidden");
    appEls.swapOpAmpBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  appEls.exportBtn.classList.add("hidden");

  if (nodeMarker) {
    appEls.deleteBtn.classList.add("hidden");
    appEls.rotateBtn.classList.add("hidden");
    appEls.swapOpAmpBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");

    if (canToggleNodeMarkerVoltage(nodeMarker)) {
      setVisibilityToggleButtonState({
        mode: "node",
        hidden: state.hiddenNodeMarkerRoots.has(nodeMarker.root),
      });
      appEls.currentArrowBtn.classList.remove("hidden");
    } else {
      appEls.currentArrowBtn.classList.add("hidden");
    }
    return;
  }

  appEls.deleteBtn.classList.remove("hidden");

  if (!component) {
    appEls.currentArrowBtn.classList.add("hidden");
    appEls.rotateBtn.classList.add("hidden");
    appEls.swapOpAmpBtn.classList.add("hidden");
    appEls.valueWheel.classList.add("hidden");
    return;
  }

  if (state.simulationActive && canToggleCurrentArrow(component)) {
    setVisibilityToggleButtonState({
      mode: "component",
      hidden: component.currentArrowHidden === true,
    });
    appEls.currentArrowBtn.classList.remove("hidden");
  } else {
    appEls.currentArrowBtn.classList.add("hidden");
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

  const rawNormalized = getWheelNormalizedAtClientPoint(clientX, clientY);
  let normalized = rawNormalized;

  if (wheelState.dragging) {
    if (wheelState.lastRawNormalized == null || wheelState.activeNormalized == null) {
      wheelState.lastRawNormalized = rawNormalized;
      wheelState.activeNormalized = rawNormalized;
    } else {
      let delta = rawNormalized - wheelState.lastRawNormalized;
      if (delta > 0.5) {
        delta -= 1;
      } else if (delta < -0.5) {
        delta += 1;
      }

      wheelState.activeNormalized = clamp(wheelState.activeNormalized + delta, 0, 1);
      wheelState.lastRawNormalized = rawNormalized;
    }

    normalized = wheelState.activeNormalized;
  }

  const value = valueFromNormalized(component.type, normalized);
  component.value = value;
  syncWheelWithSelectedComponent();
  onCircuitChanged();
}

function getWheelNormalizedAtClientPoint(clientX, clientY) {
  const rect = appEls.valueWheel.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angle = Math.atan2(clientY - cy, clientX - cx);
  let normalized = (angle + Math.PI / 2) / (Math.PI * 2);
  normalized = ((normalized % 1) + 1) % 1;
  return normalized;
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

function onCircuitChanged() {
  const shouldRefreshSelectionUi = state.selectedNodeMarkerRoot != null;
  if (state.simulationActive) {
    const result = runSimulation();
    if (!result.ok) {
      state.simulationActive = false;
      state.simulationResult = null;
      state.hiddenNodeMarkerRoots.clear();
      state.selectedNodeMarkerRoot = null;
      state.selectedNodeMarkerTerminal = null;
      setSimulationButtonState(false);
      updateSelectionUi();
      showStatus(result.message || "Erro na simulação", true);
    }
  }

  syncWheelWithSelectedComponent();
  if (shouldRefreshSelectionUi) {
    updateSelectionUi();
    return;
  }
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

function buildOpAmpMarkerSvg(y, isPlus, centerX = 50, halfSpan = 6) {
  const horizontal = `<line x1="${centerX - halfSpan}" y1="${y}" x2="${centerX + halfSpan}" y2="${y}"/>`;
  if (!isPlus) return horizontal;
  return `${horizontal}
        <line x1="${centerX}" y1="${y - halfSpan}" x2="${centerX}" y2="${y + halfSpan}"/>`;
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

function buildVoltageSourceSvg(options = {}) {
  const showPolarityMarkers = options.showPolarityMarkers !== false;
  const polarityMarkup = showPolarityMarkers
    ? `
      <line x1="58" y1="40" x2="74" y2="40"/>
      <line x1="94" y1="32" x2="94" y2="48"/>
      <line x1="86" y1="40" x2="102" y2="40"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="42" y2="40"/>
      <line x1="118" y1="40" x2="160" y2="40"/>
      <circle cx="80" cy="40" r="37"/>
      ${polarityMarkup}
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
  const markerCenterX = 70;
  const topMarker = showMarkers ? buildOpAmpMarkerSvg(40, plusOnTop, markerCenterX) : "";
  const bottomMarker = showMarkers ? buildOpAmpMarkerSvg(120, !plusOnTop, markerCenterX) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="#0f172a" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="48" y2="40"/>
      <line x1="0" y1="120" x2="48" y2="120"/>
      <line x1="192" y1="80" x2="240" y2="80"/>
      <polygon points="48,6 48,154 192,80"/>
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
