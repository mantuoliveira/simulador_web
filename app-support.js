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
