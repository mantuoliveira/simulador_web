// Shared constants, component metadata, and domain behavior definitions.

const GRID_SIZE = 28;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3.2;
const IDLE_FPS = 1;
const IDLE_FRAME_MS = 1000 / IDLE_FPS;
const MOBILE_INITIAL_ZOOM = 1;
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
const LIGHT_THEME = "light";
const DARK_THEME = "dark";
const VOLTAGE_NODE_TYPE = "voltage_node";
const THEME_PALETTE_DEFAULTS = {
  themeColor: "#edf4fb",
  statusBg: "rgba(15, 23, 42, 0.88)",
  statusErrorBg: "rgba(185, 28, 28, 0.92)",
  statusInk: "#f8fafc",
  statusErrorInk: "#f8fafc",
  canvasGrid: "rgba(15, 23, 42, 0.2)",
  canvasWire: "#0f172a",
  canvasWireSelected: "#ea580c",
  canvasSelection: "#0ea5a8",
  canvasPendingFill: "rgba(245, 158, 11, 0.2)",
  canvasPendingStroke: "#f59e0b",
  canvasSpriteFallback: "#dbe4ef",
  canvasTerminalFilled: "#0f172a",
  canvasTerminalEmpty: "#f8fafc",
  canvasTerminalStroke: "#334155",
  canvasLabel: "#0f172a",
  canvasLabelSelected: "#0ea5a8",
  canvasAnnotationBg: "rgba(15, 23, 42, 0.86)",
  canvasAnnotationText: "#f8fafc",
  canvasCurrent: "#dc2626",
  canvasCurrentText: "#7f1d1d",
  canvasSpriteStroke: "#0f172a",
  canvasSpriteFill: "#e2e8f0",
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
  [VOLTAGE_NODE_TYPE]: {
    label: "No V",
    terminals: [[0, -1]],
    bodyHalfW: 1.1,
    bodyHalfH: 1.1,
    bodyOffsetY: 0.28,
    renderW: 2,
    renderH: 2,
    defaultRotation: 180,
    defaultValue: 10,
    editable: true,
    unit: "V",
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
  bjt_pnp: {
    label: "Trans PNP",
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

const COMPONENT_ORDER = [
  "voltage_source",
  "current_source",
  "resistor",
  "op_amp",
  "diode",
  "bjt_npn",
  "bjt_pnp",
  "ground",
  VOLTAGE_NODE_TYPE,
];

function isIdealVoltageSourceComponent(componentOrType) {
  const type =
    typeof componentOrType === "string" ? componentOrType : componentOrType?.type;
  return type === "voltage_source" || type === VOLTAGE_NODE_TYPE;
}

function isGroundReferencedVoltageSourceComponent(componentOrType) {
  const type =
    typeof componentOrType === "string" ? componentOrType : componentOrType?.type;
  return type === VOLTAGE_NODE_TYPE;
}

function isBjtComponentType(componentOrType) {
  const type =
    typeof componentOrType === "string" ? componentOrType : componentOrType?.type;
  return type === "bjt_npn" || type === "bjt_pnp";
}

function getInitialCameraZoom() {
  if (window.matchMedia?.("(pointer: coarse)").matches) {
    return MOBILE_INITIAL_ZOOM;
  }

  return 1;
}

export {
  GRID_SIZE,
  MIN_ZOOM,
  MAX_ZOOM,
  IDLE_FPS,
  IDLE_FRAME_MS,
  MOBILE_INITIAL_ZOOM,
  NEWTON_MAX_ITERATIONS,
  NEWTON_KCL_RESIDUAL_TOLERANCE,
  NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE,
  NEWTON_STEP_TOLERANCE,
  NEWTON_BACKTRACK_STEPS,
  NEWTON_SOURCE_STEPS,
  MAX_DIODE_EXP_ARG,
  MAX_DIODE_VOLTAGE_STEP,
  MAX_BJT_JUNCTION_VOLTAGE_STEP,
  OP_AMP_OPEN_LOOP_GAIN,
  OP_AMP_MIN_SUPPLY,
  OP_AMP_MAX_SUPPLY,
  OP_AMP_SUPPLY_STEP,
  MAX_OP_AMP_TANH_ARG,
  MAX_BJT_SATURATION_ARG,
  OP_AMP_TOP_INPUT_TERMINAL_INDEX,
  OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX,
  OP_AMP_OUTPUT_TERMINAL_INDEX,
  BJT_BASE_TERMINAL_INDEX,
  BJT_COLLECTOR_TERMINAL_INDEX,
  BJT_EMITTER_TERMINAL_INDEX,
  BJT_MIN_BETA,
  BJT_MAX_BETA,
  BJT_BETA_STEP,
  OCCUPIED_WIRE_EDGE_PENALTY,
  NODE_PROXIMITY_PENALTY,
  TURN_PENALTY,
  TERMINAL_DIRECTION_MISMATCH_PENALTY,
  MOUSE_TERMINAL_HIT_RADIUS,
  TOUCH_TERMINAL_HIT_RADIUS,
  DOUBLE_TAP_MAX_DELAY_MS,
  DOUBLE_TAP_MAX_DISTANCE_PX,
  EMPTY_TAP_MOVE_TOLERANCE_PX,
  DELETE_BUTTON_HOLD_MS,
  EXPORT_BUTTON_HOLD_MS,
  SIMULATION_BUTTON_ICONS,
  CURRENT_ARROW_BUTTON_ICONS,
  LIGHT_THEME,
  DARK_THEME,
  VOLTAGE_NODE_TYPE,
  THEME_PALETTE_DEFAULTS,
  COMPONENT_DEFS,
  COMPONENT_ORDER,
  isIdealVoltageSourceComponent,
  isGroundReferencedVoltageSourceComponent,
  isBjtComponentType,
  getInitialCameraZoom,
};
