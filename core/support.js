import {
  COMPONENT_DEFS,
  LOGIC_GATE_HIGH_VOLTAGE,
  LOGIC_GATE_THRESHOLD_VOLTAGE,
  LOGIC_GATE_TRANSITION_VOLTAGE,
  MAX_BJT_SATURATION_ARG,
  MAX_DIODE_EXP_ARG,
  MAX_OP_AMP_TANH_ARG,
  OP_AMP_MIN_SUPPLY,
  OP_AMP_OPEN_LOOP_GAIN,
  THEME_PALETTE_DEFAULTS,
} from "./constants.js";

// Shared math, formatting, SVG, and solver support utilities.

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

function safePotentiometerWiperPosition(value) {
  if (!Number.isFinite(value)) return 0.5;
  return clamp(value, 0, 1);
}

function getPotentiometerSectionResistances(component) {
  const totalResistance = safeResistance(component?.value);
  const wiperPosition = safePotentiometerWiperPosition(component?.wiperPosition);
  return {
    totalResistance,
    wiperPosition,
    leftResistance: totalResistance * wiperPosition,
    rightResistance: totalResistance * (1 - wiperPosition),
  };
}

function safeCapacitance(value) {
  if (!Number.isFinite(value)) return 1e-6;
  return Math.max(1e-12, value);
}

function safeOpAmpSupply(value) {
  if (!Number.isFinite(value)) return OP_AMP_MIN_SUPPLY;
  return Math.max(1e-6, Math.abs(value));
}

function safeBjtBeta(value) {
  if (!Number.isFinite(value)) return 100;
  return Math.max(1, value);
}

function safeMosfetTransconductance(value) {
  if (!Number.isFinite(value)) return 0.01;
  return Math.max(1e-9, value);
}

function safeMosfetThreshold(value) {
  if (!Number.isFinite(value)) return 2;
  return value;
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

function evaluateZenerModel(component, voltage) {
  const zenerVoltage = Math.max(0, Math.abs(component?.vz ?? 5.1));
  const dynamicResistance = safeResistance(component?.rz ?? 10);

  if (voltage <= -zenerVoltage) {
    return {
      current: (voltage + zenerVoltage) / dynamicResistance,
      conductance: 1 / dynamicResistance,
    };
  }

  return evaluateDiodeModel(component, voltage);
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

function evaluateBjtCoreModel(component, vbe, vbc) {
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

function evaluateBjtModel(component, vbe, vbc) {
  const type = component?.type;
  if (type === "bjt_pnp") {
    const mirroredModel = evaluateBjtCoreModel(component, -vbe, -vbc);
    return {
      ib: -mirroredModel.ib,
      ic: -mirroredModel.ic,
      ie: -mirroredModel.ie,
      dIb_dVb: mirroredModel.dIb_dVb,
      dIb_dVc: mirroredModel.dIb_dVc,
      dIb_dVe: mirroredModel.dIb_dVe,
      dIc_dVb: mirroredModel.dIc_dVb,
      dIc_dVc: mirroredModel.dIc_dVc,
      dIc_dVe: mirroredModel.dIc_dVe,
      dIe_dVb: mirroredModel.dIe_dVb,
      dIe_dVc: mirroredModel.dIe_dVc,
      dIe_dVe: mirroredModel.dIe_dVe,
    };
  }

  return evaluateBjtCoreModel(component, vbe, vbc);
}

function evaluateOpAmpModel(component, differentialVoltage) {
  const supply = safeOpAmpSupply(component?.value);
  const openLoopGainKvPerV = Number.isFinite(component?.av)
    ? component.av
    : OP_AMP_OPEN_LOOP_GAIN / 1000;
  const openLoopGain = clamp(openLoopGainKvPerV, 10, 1000) * 1000;
  const arg = clamp(
    (openLoopGain * differentialVoltage) / supply,
    -MAX_OP_AMP_TANH_ARG,
    MAX_OP_AMP_TANH_ARG
  );
  const tanhValue = Math.tanh(arg);
  const sech2 = Math.max(0, 1 - tanhValue * tanhValue);

  return {
    voltage: supply * tanhValue,
    gain: openLoopGain * sech2,
  };
}

function gateActivationFromInput(voltage) {
  const transition = Math.max(1e-6, LOGIC_GATE_TRANSITION_VOLTAGE);
  const arg = clamp(
    (voltage - LOGIC_GATE_THRESHOLD_VOLTAGE) / transition,
    -MAX_OP_AMP_TANH_ARG,
    MAX_OP_AMP_TANH_ARG
  );
  const tanhValue = Math.tanh(arg);
  const activation = 0.5 * (1 + tanhValue);
  const derivative = (0.5 * Math.max(0, 1 - tanhValue * tanhValue)) / transition;
  return { activation, derivative };
}

function evaluateAndGateModel(inputA, inputB) {
  const highVoltage = Math.max(0, LOGIC_GATE_HIGH_VOLTAGE);
  const inputAState = gateActivationFromInput(inputA);
  const inputBState = gateActivationFromInput(inputB);
  const voltage = highVoltage * inputAState.activation * inputBState.activation;

  return {
    voltage,
    dVoltage_dInputA: highVoltage * inputAState.derivative * inputBState.activation,
    dVoltage_dInputB: highVoltage * inputAState.activation * inputBState.derivative,
  };
}

function evaluateOrGateModel(inputA, inputB) {
  const highVoltage = Math.max(0, LOGIC_GATE_HIGH_VOLTAGE);
  const inputAState = gateActivationFromInput(inputA);
  const inputBState = gateActivationFromInput(inputB);
  const voltage =
    highVoltage *
    (inputAState.activation +
      inputBState.activation -
      inputAState.activation * inputBState.activation);

  return {
    voltage,
    dVoltage_dInputA: highVoltage * inputAState.derivative * (1 - inputBState.activation),
    dVoltage_dInputB: highVoltage * inputBState.derivative * (1 - inputAState.activation),
  };
}

function evaluateXorGateModel(inputA, inputB) {
  const highVoltage = Math.max(0, LOGIC_GATE_HIGH_VOLTAGE);
  const inputAState = gateActivationFromInput(inputA);
  const inputBState = gateActivationFromInput(inputB);
  const voltage =
    highVoltage *
    (inputAState.activation +
      inputBState.activation -
      2 * inputAState.activation * inputBState.activation);

  return {
    voltage,
    dVoltage_dInputA: highVoltage * inputAState.derivative * (1 - 2 * inputBState.activation),
    dVoltage_dInputB: highVoltage * inputBState.derivative * (1 - 2 * inputAState.activation),
  };
}

function evaluateNotGateModel(inputA) {
  const highVoltage = Math.max(0, LOGIC_GATE_HIGH_VOLTAGE);
  const inputAState = gateActivationFromInput(inputA);
  const voltage = highVoltage * (1 - inputAState.activation);

  return {
    voltage,
    dVoltage_dInputA: -highVoltage * inputAState.derivative,
  };
}

function evaluateMosfetModel(component, vgs, vds) {
  if (component?.type === "mosfet_p") {
    return evaluatePmosfetModel(component, vgs, vds);
  }

  const k = safeMosfetTransconductance(component?.k);
  const vt = safeMosfetThreshold(component?.vt);

  if (vgs <= vt || vds <= 0) {
    return {
      ids: 0,
      dIds_dVg: 0,
      dIds_dVd: 0,
      dIds_dVs: 0,
    };
  }

  const overdrive = vgs - vt;
  if (vds < overdrive) {
    return {
      ids: 2 * k * (overdrive * vds - (vds * vds) / 2),
      dIds_dVg: 2 * k * vds,
      dIds_dVd: 2 * k * (overdrive - vds),
      dIds_dVs: -2 * k * overdrive,
    };
  }

  return {
    ids: k * overdrive * overdrive,
    dIds_dVg: 2 * k * overdrive,
    dIds_dVd: 0,
    dIds_dVs: -2 * k * overdrive,
  };
}

function evaluatePmosfetModel(component, _vgs, _vds) {
  const k = safeMosfetTransconductance(component?.k);
  const vt = safeMosfetThreshold(component?.vt);
  const vsg = -_vgs;
  const vsd = -_vds;

  if (vsg <= vt || vsd <= 0) {
    return {
      ids: 0,
      dIds_dVg: 0,
      dIds_dVd: 0,
      dIds_dVs: 0,
    };
  }

  const overdrive = vsg - vt;
  if (vsd < overdrive) {
    return {
      ids: -2 * k * (overdrive * vsd - (vsd * vsd) / 2),
      dIds_dVg: 2 * k * vsd,
      dIds_dVd: 2 * k * (overdrive - vsd),
      dIds_dVs: -2 * k * overdrive,
    };
  }

  return {
    ids: -k * overdrive * overdrive,
    dIds_dVg: 2 * k * overdrive,
    dIds_dVd: 0,
    dIds_dVs: -2 * k * overdrive,
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

const SI_PREFIXES = new Map([
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

function engineeringExponent(value) {
  const abs = Math.abs(value);
  const rawExponent = Math.floor(Math.log10(abs) / 3) * 3;
  return clamp(rawExponent, -12, 12);
}

function formatEngineeringValue(value, unit, decimals = 2) {
  if (!Number.isFinite(value) || value === 0) {
    return `0 ${unit}`;
  }

  const exponent = engineeringExponent(value);
  const scaled = value / Math.pow(10, exponent);
  return `${roundTo(scaled, decimals)} ${SI_PREFIXES.get(exponent)}${unit}`;
}

function formatEngineeringValueFixed(value, unit, decimals = 1) {
  const safeDecimals = Math.max(0, decimals);
  if (!Number.isFinite(value) || value === 0) {
    return `${(0).toFixed(safeDecimals)} ${unit}`;
  }

  const exponent = engineeringExponent(value);
  const scaled = value / Math.pow(10, exponent);
  return `${scaled.toFixed(safeDecimals)} ${SI_PREFIXES.get(exponent)}${unit}`;
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

function formatTransconductance(value) {
  return formatEngineeringValue(value, "A/V²");
}

function formatPower(value) {
  return formatEngineeringValue(value, "W");
}

function parseCssColor(color) {
  const value = String(color || "").trim();
  if (!value) return null;

  if (value.startsWith("#")) {
    const hex = value.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }

    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  const rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) return null;

  const [r = 0, g = 0, b = 0] = rgbMatch[1]
    .split(",")
    .slice(0, 3)
    .map((channel) => Number.parseFloat(channel.trim()));

  return {
    r: clamp(Number.isFinite(r) ? r : 0, 0, 255),
    g: clamp(Number.isFinite(g) ? g : 0, 0, 255),
    b: clamp(Number.isFinite(b) ? b : 0, 0, 255),
  };
}

function mixColors(fromColor, toColor, amount) {
  const from = parseCssColor(fromColor);
  const to = parseCssColor(toColor);
  const t = clamp(amount, 0, 1);

  if (!from || !to) {
    return t < 0.5 ? fromColor : toColor;
  }

  const mixChannel = (fromValue, toValue) => Math.round(fromValue + (toValue - fromValue) * t);
  return `rgb(${mixChannel(from.r, to.r)}, ${mixChannel(from.g, to.g)}, ${mixChannel(from.b, to.b)})`;
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

function getSpriteThemeColors(palette) {
  const resolvedPalette = palette || THEME_PALETTE_DEFAULTS;
  return {
    stroke: resolvedPalette.canvasSpriteStroke || THEME_PALETTE_DEFAULTS.canvasSpriteStroke,
    fill: resolvedPalette.canvasSpriteFill || THEME_PALETTE_DEFAULTS.canvasSpriteFill,
  };
}

function buildDefaultComponentSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="40" y1="0" x2="40" y2="24"/>
      <line x1="16" y1="26" x2="64" y2="26"/>
      <line x1="24" y1="40" x2="56" y2="40"/>
      <line x1="30" y1="54" x2="50" y2="54"/>
    </g>
  </svg>`;
}

function buildCapacitorSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="66" y2="40"/>
      <line x1="66" y1="18" x2="66" y2="62"/>
      <path d="M 94,18 Q 78,40 94,62"/>
      <line x1="88" y1="40" x2="160" y2="40"/>
      <line x1="38" y1="26" x2="50" y2="26"/>
      <line x1="44" y1="20" x2="44" y2="32"/>
    </g>
  </svg>`;
}

function buildResistorSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="34" y2="40"/>
      <polyline points="34,40 44,18 56,62 68,18 80,62 92,18 104,62 116,18 126,40"/>
      <line x1="126" y1="40" x2="160" y2="40"/>
    </g>
  </svg>`;
}

function buildPotentiometerSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  const showWiper = options.showPotentiometerWiper !== false;
  const wiperPosition = safePotentiometerWiperPosition(options.wiperPosition);
  const contactX = 36 + (132 - 36) * wiperPosition;
  const wiperMarkup = showWiper
    ? `
      <line x1="80" y1="8" x2="${contactX}" y2="58"/>
      <polyline points="${contactX - 14},54 ${contactX},58 ${contactX - 7},71"/>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="80" x2="24" y2="80"/>
      <polyline points="24,80 36,58 48,102 60,58 72,102 84,58 96,102 108,58 120,102 132,58 136,80"/>
      <line x1="136" y1="80" x2="160" y2="80"/>
      ${wiperMarkup}
    </g>
  </svg>`;
}

function buildVoltageSourceSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  const showPolarityMarkers = options.showPolarityMarkers !== false;
  const polarityMarkup = showPolarityMarkers
    ? `
      <line x1="58" y1="40" x2="74" y2="40"/>
      <line x1="94" y1="32" x2="94" y2="48"/>
      <line x1="86" y1="40" x2="102" y2="40"/>`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="42" y2="40"/>
      <line x1="118" y1="40" x2="160" y2="40"/>
      <circle cx="80" cy="40" r="37"/>
      ${polarityMarkup}
    </g>
  </svg>`;
}

function buildCurrentSourceSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="42" y2="40"/>
      <line x1="118" y1="40" x2="160" y2="40"/>
      <circle cx="80" cy="40" r="37"/>
    </g>
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="58" y1="40" x2="102" y2="40"/>
      <polyline points="92,30 102,40 92,50"/>
    </g>
  </svg>`;
}

function buildCccsSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="40" y1="0" x2="40" y2="160"/>
      <polygon points="112,80 160,24 208,80 160,136"/>
      <line x1="160" y1="0" x2="160" y2="25"/>
      <line x1="160" y1="136" x2="160" y2="160"/>
      <line x1="40" y1="46" x2="40" y2="114"/>
      <polyline points="28,96 40,114 52,96"/>
      <line x1="160" y1="46" x2="160" y2="114"/>
      <polyline points="148,96 160,114 172,96"/>
    </g>
  </svg>`;
}

function buildVoltageNodeSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="40" y1="0" x2="40" y2="35"/>
    </g>
    <circle cx="40" cy="44" r="9" fill="${stroke}" />
  </svg>`;
}

function buildOpAmpSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  const showMarkers = options.showOpAmpMarkers !== false;
  const plusOnTop = options.opAmpPlusOnTop !== false;
  const markerCenterX = 70;
  const topMarker = showMarkers ? buildOpAmpMarkerSvg(40, plusOnTop, markerCenterX) : "";
  const bottomMarker = showMarkers ? buildOpAmpMarkerSvg(120, !plusOnTop, markerCenterX) : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="48" y2="40"/>
      <line x1="0" y1="120" x2="48" y2="120"/>
      <line x1="192" y1="80" x2="240" y2="80"/>
      <polygon points="48,6 48,154 192,80"/>
      ${topMarker}
      ${bottomMarker}
    </g>
  </svg>`;
}

function buildAndGateSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="48" y2="40"/>
      <line x1="0" y1="120" x2="48" y2="120"/>
      <line x1="200" y1="80" x2="240" y2="80"/>
      <path d="M48 12 L128 12 A68 68 0 0 1 128 148 L48 148 Z"/>
    </g>
  </svg>`;
}

function buildOrGateSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="60" y2="40"/>
      <line x1="0" y1="120" x2="60" y2="120"/>
      <line x1="200" y1="80" x2="240" y2="80"/>
      <path d="M48 12 Q118 18 200 80 Q118 142 48 148"/>
      <path d="M48 12 Q92 80 48 148"/>
    </g>
  </svg>`;
}

function buildXorGateSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="44" y2="40"/>
      <line x1="0" y1="120" x2="44" y2="120"/>
      <line x1="200" y1="80" x2="240" y2="80"/>
      <path d="M48 12 Q118 18 200 80 Q118 142 48 148"/>
      <path d="M48 12 Q92 80 48 148"/>
      <path d="M32 12 Q76 80 32 148"/>
    </g>
  </svg>`;
}

function buildNotGateSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="40" x2="36" y2="40"/>
      <path d="M36 8 L36 72 L108 40 Z"/>
      <circle cx="120" cy="40" r="12"/>
      <line x1="132" y1="40" x2="160" y2="40"/>
    </g>
  </svg>`;
}

function buildDiodeSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <line x1="0" y1="40" x2="42" y2="40" fill="none"/>
      <line x1="100" y1="40" x2="160" y2="40" fill="none"/>
      <polygon points="42,16 42,64 100,40" fill="none"/>
      <line x1="100" y1="16" x2="100" y2="64" fill="none"/>
    </g>
  </svg>`;
}

function buildZenerDiodeSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 80">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">
      <line x1="0" y1="40" x2="42" y2="40" fill="none"/>
      <line x1="100" y1="40" x2="160" y2="40" fill="none"/>
      <polygon points="42,16 42,64 100,40" fill="none"/>
      <line x1="100" y1="16" x2="100" y2="64" fill="none"/>
      <line x1="100" y1="64" x2="108" y2="64" fill="none"/>
      <line x1="92" y1="16" x2="100" y2="16" fill="none"/>
    </g>
  </svg>`;
}

function buildMosfetNSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="80" x2="30" y2="80"/>
      <line x1="30" y1="54" x2="30" y2="106"/>
      <line x1="45" y1="34" x2="45" y2="126"/>
      <line x1="80" y1="0" x2="80" y2="42"/>
      <line x1="45" y1="42" x2="80" y2="42"/>
      <line x1="80" y1="118" x2="80" y2="160"/>
      <line x1="45" y1="118" x2="80" y2="118"/>
      <polyline points="64,124 78,118 64,112"/>
    </g>
  </svg>`;
}

function buildMosfetPSvg(options = {}) {
  const { stroke } = getSpriteThemeColors(options.palette);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="80" x2="30" y2="80"/>
      <line x1="30" y1="54" x2="30" y2="106"/>
      <line x1="45" y1="34" x2="45" y2="126"/>
      <line x1="80" y1="0" x2="80" y2="42"/>
      <line x1="45" y1="42" x2="80" y2="42"/>
      <line x1="80" y1="118" x2="80" y2="160"/>
      <line x1="45" y1="118" x2="80" y2="118"/>
      <polyline points="59,124 45,118 59,112"/>
    </g>
  </svg>`;
}

function buildBjtSvg(options = {}, emitterArrowDirection = "out") {
  const { stroke } = getSpriteThemeColors(options.palette);
  const branchStart = { x: 50, y: 80 };
  const branchEnd = { x: 80, y: 112 };
  const branchDx = branchEnd.x - branchStart.x;
  const branchDy = branchEnd.y - branchStart.y;
  const branchLength = Math.hypot(branchDx, branchDy) || 1;
  const dirX = branchDx / branchLength;
  const dirY = branchDy / branchLength;
  const normalX = -dirY;
  const normalY = dirX;
  const tipDistance = emitterArrowDirection === "in" ? 18 : 32;
  const arrowLength = 14;
  const arrowHalfWidth = 7;
  const tipX = branchStart.x + dirX * tipDistance;
  const tipY = branchStart.y + dirY * tipDistance;
  const tailCenterX = tipX + dirX * (emitterArrowDirection === "in" ? arrowLength : -arrowLength);
  const tailCenterY = tipY + dirY * (emitterArrowDirection === "in" ? arrowLength : -arrowLength);
  const leftX = tailCenterX + normalX * arrowHalfWidth;
  const leftY = tailCenterY + normalY * arrowHalfWidth;
  const rightX = tailCenterX - normalX * arrowHalfWidth;
  const rightY = tailCenterY - normalY * arrowHalfWidth;
  const arrowMarkup = `
      <polyline points="${leftX.toFixed(1)},${leftY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} ${rightX.toFixed(1)},${rightY.toFixed(1)}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <g stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none">
      <line x1="0" y1="80" x2="50" y2="80"/>
      <line x1="50" y1="48" x2="50" y2="112"/>
      <line x1="50" y1="80" x2="80" y2="48"/>
      <line x1="80" y1="48" x2="80" y2="0"/>
      <line x1="50" y1="80" x2="80" y2="112"/>
      <line x1="80" y1="112" x2="80" y2="160"/>
      ${arrowMarkup}
    </g>
  </svg>`;
}

function buildBjtNpnSvg(options = {}) {
  return buildBjtSvg(options, "out");
}

function buildBjtPnpSvg(options = {}) {
  return buildBjtSvg(options, "in");
}

function buildGroundSvg(options = {}) {
  return buildDefaultComponentSvg(options);
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

export {
  clamp,
  roundTo,
  snapToStep,
  safeResistance,
  safePotentiometerWiperPosition,
  getPotentiometerSectionResistances,
  safeOpAmpSupply,
  safeBjtBeta,
  safeMosfetTransconductance,
  safeMosfetThreshold,
  evaluateJunctionModel,
  evaluateDiodeModel,
  evaluateZenerModel,
  evaluateForwardOnlyJunctionModel,
  evaluateBjtSaturationFactor,
  evaluateBjtCoreModel,
  evaluateBjtModel,
  evaluateOpAmpModel,
  evaluateAndGateModel,
  evaluateOrGateModel,
  evaluateXorGateModel,
  evaluateNotGateModel,
  evaluateMosfetModel,
  evaluatePmosfetModel,
  normalizeRotation,
  degToRad,
  distance,
  distanceToSegment,
  getPointProjectionSideSign,
  multiplyMatrixVector,
  maxAbsValue,
  formatResistance,
  formatEngineeringValue,
  formatEngineeringValueFixed,
  formatVoltage,
  formatSymmetricVoltage,
  formatCurrent,
  formatTransconductance,
  formatPower,
  mixColors,
  roundedRect,
  svgToDataUri,
  buildOpAmpMarkerSvg,
  getSpriteThemeColors,
  buildDefaultComponentSvg,
  safeCapacitance,
  buildCapacitorSvg,
  buildResistorSvg,
  buildPotentiometerSvg,
  buildVoltageSourceSvg,
  buildCurrentSourceSvg,
  buildCccsSvg,
  buildVoltageNodeSvg,
  buildOpAmpSvg,
  buildAndGateSvg,
  buildOrGateSvg,
  buildXorGateSvg,
  buildNotGateSvg,
  buildDiodeSvg,
  buildZenerDiodeSvg,
  buildMosfetNSvg,
  buildMosfetPSvg,
  buildBjtSvg,
  buildBjtNpnSvg,
  buildBjtPnpSvg,
  buildGroundSvg,
  DisjointSet,
};
