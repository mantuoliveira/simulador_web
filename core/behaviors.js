import {
  BJT_BASE_TERMINAL_INDEX,
  BJT_BETA_STEP,
  BJT_MAX_BETA,
  BJT_MIN_BETA,
  COMPONENT_DEFS,
  MOSFET_DRAIN_TERMINAL_INDEX,
  MOSFET_GATE_TERMINAL_INDEX,
  MOSFET_SOURCE_TERMINAL_INDEX,
  OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX,
  OP_AMP_MAX_SUPPLY,
  OP_AMP_MIN_SUPPLY,
  OP_AMP_OUTPUT_TERMINAL_INDEX,
  OP_AMP_SUPPLY_STEP,
  OP_AMP_TOP_INPUT_TERMINAL_INDEX,
  VOLTAGE_NODE_TYPE,
} from "./constants.js";
import {
  buildBjtNpnSvg,
  buildBjtPnpSvg,
  buildCurrentSourceSvg,
  buildDefaultComponentSvg,
  buildDiodeSvg,
  buildGroundSvg,
  buildMosfetNSvg,
  buildMosfetPSvg,
  buildOpAmpSvg,
  buildResistorSvg,
  buildVoltageNodeSvg,
  buildVoltageSourceSvg,
  clamp,
  formatCurrent,
  formatEngineeringValueFixed,
  formatTransconductance,
  formatResistance,
  formatSymmetricVoltage,
  formatVoltage,
  getPointProjectionSideSign,
  normalizeRotation,
  roundTo,
  snapToStep,
} from "./support.js";
import {
  getBjtCollectorEmitterTerminalIndices,
  getCardinalValueLabelAnchor,
  getMosfetDrainSourceTerminalIndices,
  getOpAmpInputTerminalIndices,
  getReverseCardinalValueLabelAnchor,
} from "./model.js";

const DEFAULT_COMPONENT_BEHAVIOR = {
  createState: () => ({}),
  buildSvg: (options = {}) => buildDefaultComponentSvg(options),
  formatValue: () => "",
  formatWheelValue: (component) => DEFAULT_COMPONENT_BEHAVIOR.formatValue(component),
  getWheelTitle: (component) => COMPONENT_DEFS[component?.type]?.label || "",
  valueFromNormalized: (_component, _normalized) => 0,
  normalizedFromValue: () => 0,
  setEditableValue(component, value) {
    component.value = value;
  },
  resetEditableParameter: () => {},
  toggleEditableParameter: () => false,
  getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
  isSimulatedBranch: false,
  getReachabilityTerminalPairs: () => [],
  allowsIntraComponentConnection: () => false,
  supportsCurrentArrow: false,
  getCurrentArrowTerminalPair: () => [0, 1],
  getCurrentArrowLayout: () => ({
    sideSign: 1,
    lateralOffset: 1.0,
    textOffsetExtra: 0,
  }),
  applySpriteTransform: () => {},
  spriteOverlay: null,
  swapControl: null,
};

const COMPONENT_BEHAVIORS = {
  voltage_source: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: (options = {}) => buildVoltageSourceSvg(options),
    formatValue: (component) => formatVoltage(component.value),
    formatWheelValue: (component) => `V=${formatEngineeringValueFixed(component.value, "V", 1)}`,
    valueFromNormalized: (_component, normalized) =>
      roundTo(-24 + 48 * clamp(normalized, 0, 1), 1),
    normalizedFromValue: (component) => clamp((component.value + 24) / 48, 0, 1),
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 1.62),
    isSimulatedBranch: true,
    supportsCurrentArrow: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    spriteOverlay: "voltage_source_polarity",
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
  [VOLTAGE_NODE_TYPE]: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: (options = {}) => buildVoltageNodeSvg(options),
    formatValue: (component) => formatVoltage(component.value),
    formatWheelValue: (component) => `V=${formatEngineeringValueFixed(component.value, "V", 1)}`,
    valueFromNormalized: (_component, normalized) =>
      roundTo(-24 + 48 * clamp(normalized, 0, 1), 1),
    normalizedFromValue: (component) => clamp((component.value + 24) / 48, 0, 1),
    getValueLabelAnchor: (component) => getReverseCardinalValueLabelAnchor(component, 1.22),
    isSimulatedBranch: true,
    getReachabilityTerminalPairs: () => [],
  },
  current_source: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: (options = {}) => buildCurrentSourceSvg(options),
    formatValue: (component) => formatCurrent(component.value),
    formatWheelValue: (component) => `I=${formatEngineeringValueFixed(component.value, "A", 1)}`,
    valueFromNormalized: (_component, normalized) =>
      snapToStep(-0.1 + 0.2 * clamp(normalized, 0, 1), 0.001),
    normalizedFromValue: (component) => clamp((component.value + 0.1) / 0.2, 0, 1),
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.05),
    isSimulatedBranch: true,
    supportsCurrentArrow: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: 1,
      lateralOffset: 1.45,
      textOffsetExtra:
        Math.abs(geometry.dirY) > Math.abs(geometry.dirX) ? Math.max(12, geometry.zoom * 14) : 0,
    }),
  },
  resistor: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: (options = {}) => buildResistorSvg(options),
    formatValue: (component) => formatResistance(component.value),
    formatWheelValue: (component) => `R=${formatEngineeringValueFixed(component.value, "Ω", 1)}`,
    valueFromNormalized: (_component, normalized) => {
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
    supportsCurrentArrow: true,
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
        Math.abs(geometry.dirY) > Math.abs(geometry.dirX) ? Math.max(10, geometry.zoom * 12) : 0,
    }),
  },
  op_amp: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({ inputsSwapped: false }),
    buildSvg: (options = {}) => buildOpAmpSvg(options),
    formatValue: (component) => formatSymmetricVoltage(component.value),
    formatWheelValue: (component) =>
      `±${formatEngineeringValueFixed(Math.abs(component.value), "V", 1)}`,
    valueFromNormalized: (_component, normalized) =>
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
    spriteOverlay: "op_amp_inputs",
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
    buildSvg: (options = {}) => buildDiodeSvg(options),
    isSimulatedBranch: true,
    supportsCurrentArrow: true,
    getReachabilityTerminalPairs: () => [[0, 1]],
    getCurrentArrowLayout: () => ({
      sideSign: 1,
      lateralOffset: 1.2,
      textOffsetExtra: 0,
    }),
  },
  mosfet_n: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({
      k: 0.01,
      vt: 2,
      activeEditableParam: "k",
      drainSourceSwapped: false,
    }),
    buildSvg: (options = {}) => buildMosfetNSvg(options),
    formatValue: (component) =>
      component.activeEditableParam === "vt"
        ? `Vt=${formatVoltage(component.vt)}`
        : `k=${formatTransconductance(component.k)}`,
    formatWheelValue: (component) =>
      component.activeEditableParam === "vt"
        ? `Vt=${formatEngineeringValueFixed(component.vt, "V", 1)}`
        : `k=${formatEngineeringValueFixed(component.k, "A/V²", 1)}`,
    getWheelTitle: () => "MOSFET N",
    valueFromNormalized: (component, normalized) => {
      const clamped = clamp(normalized, 0, 1);
      if (component.activeEditableParam === "vt") {
        return roundTo(0.5 + 4.5 * clamped, 2);
      }

      return roundTo(Math.pow(10, -3 + 2 * clamped), 6);
    },
    normalizedFromValue: (component) => {
      if (component.activeEditableParam === "vt") {
        return clamp((component.vt - 0.5) / 4.5, 0, 1);
      }

      const safe = clamp(component.k, 0.001, 0.1);
      return clamp((Math.log10(safe) + 3) / 2, 0, 1);
    },
    setEditableValue(component, value) {
      if (component.activeEditableParam === "vt") {
        component.vt = value;
        return;
      }

      component.k = value;
    },
    resetEditableParameter(component) {
      component.activeEditableParam = "k";
    },
    toggleEditableParameter(component) {
      component.activeEditableParam = component.activeEditableParam === "vt" ? "k" : "vt";
      return true;
    },
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.1),
    isSimulatedBranch: true,
    supportsCurrentArrow: true,
    getReachabilityTerminalPairs: () => [],
    getCurrentArrowTerminalPair: (component) => {
      const { drainIndex, sourceIndex } = getMosfetDrainSourceTerminalIndices(component);
      return [drainIndex, sourceIndex];
    },
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        geometry.baseTerminalPoint,
        geometry.midX,
        geometry.midY,
        geometry.normalX,
        geometry.normalY
      ),
      lateralOffset: 1.08,
      textOffsetExtra: 0,
    }),
    applySpriteTransform: (context, component) => {
      if (component.drainSourceSwapped === true) {
        context.scale(1, -1);
      }
    },
    swapControl: {
      title: "Trocar source e drain",
      ariaLabel: "Trocar source e drain",
      toggle(component) {
        component.drainSourceSwapped = !component.drainSourceSwapped;
        return "Source e drain trocados";
      },
    },
  },
  mosfet_p: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({
      k: 0.01,
      vt: 2,
      activeEditableParam: "k",
      drainSourceSwapped: false,
    }),
    buildSvg: (options = {}) => buildMosfetPSvg(options),
    formatValue: (component) =>
      component.activeEditableParam === "vt"
        ? `Vt=${formatVoltage(component.vt)}`
        : `k=${formatTransconductance(component.k)}`,
    formatWheelValue: (component) =>
      component.activeEditableParam === "vt"
        ? `Vt=${formatEngineeringValueFixed(component.vt, "V", 1)}`
        : `k=${formatEngineeringValueFixed(component.k, "A/V²", 1)}`,
    getWheelTitle: () => "MOSFET P",
    valueFromNormalized: (component, normalized) => {
      const clamped = clamp(normalized, 0, 1);
      if (component.activeEditableParam === "vt") {
        return roundTo(0.5 + 4.5 * clamped, 2);
      }

      return roundTo(Math.pow(10, -3 + 2 * clamped), 6);
    },
    normalizedFromValue: (component) => {
      if (component.activeEditableParam === "vt") {
        return clamp((component.vt - 0.5) / 4.5, 0, 1);
      }

      const safe = clamp(component.k, 0.001, 0.1);
      return clamp((Math.log10(safe) + 3) / 2, 0, 1);
    },
    setEditableValue(component, value) {
      if (component.activeEditableParam === "vt") {
        component.vt = value;
        return;
      }

      component.k = value;
    },
    resetEditableParameter(component) {
      component.activeEditableParam = "k";
    },
    toggleEditableParameter(component) {
      component.activeEditableParam = component.activeEditableParam === "vt" ? "k" : "vt";
      return true;
    },
    getValueLabelAnchor: (component) => getCardinalValueLabelAnchor(component, 2.1),
    isSimulatedBranch: true,
    supportsCurrentArrow: true,
    getReachabilityTerminalPairs: () => [],
    getCurrentArrowTerminalPair: (component) => {
      const { drainIndex, sourceIndex } = getMosfetDrainSourceTerminalIndices(component);
      return [drainIndex, sourceIndex];
    },
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        geometry.baseTerminalPoint,
        geometry.midX,
        geometry.midY,
        geometry.normalX,
        geometry.normalY
      ),
      lateralOffset: 1.08,
      textOffsetExtra: 0,
    }),
    applySpriteTransform: (context, component) => {
      if (component.drainSourceSwapped === true) {
        context.scale(1, -1);
      }
    },
    swapControl: {
      title: "Trocar source e drain",
      ariaLabel: "Trocar source e drain",
      toggle(component) {
        component.drainSourceSwapped = !component.drainSourceSwapped;
        return "Source e drain trocados";
      },
    },
  },
  bjt_npn: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({ collectorEmitterSwapped: false }),
    buildSvg: (options = {}) => buildBjtNpnSvg(options),
    formatValue: (component) => `β=${Math.round(component.value)}`,
    formatWheelValue: (component) => `β=${component.value.toFixed(1)}`,
    valueFromNormalized: (_component, normalized) =>
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
    supportsCurrentArrow: true,
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
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        geometry.baseTerminalPoint,
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
  bjt_pnp: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    createState: () => ({ collectorEmitterSwapped: false }),
    buildSvg: (options = {}) => buildBjtPnpSvg(options),
    formatValue: (component) => `β=${Math.round(component.value)}`,
    formatWheelValue: (component) => `β=${component.value.toFixed(1)}`,
    valueFromNormalized: (_component, normalized) =>
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
    supportsCurrentArrow: true,
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
    getCurrentArrowLayout: (_component, geometry) => ({
      sideSign: getPointProjectionSideSign(
        geometry.baseTerminalPoint,
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
    buildSvg: (options = {}) => buildGroundSvg(options),
  },
  junction: {
    ...DEFAULT_COMPONENT_BEHAVIOR,
    buildSvg: (options = {}) => buildGroundSvg(options),
  },
};

function getComponentBehavior(type) {
  return COMPONENT_BEHAVIORS[type] || DEFAULT_COMPONENT_BEHAVIOR;
}

function getDefaultComponentRotation(type, circuit) {
  const preferredRotation =
    circuit?.preferredComponentRotations instanceof Map
      ? circuit.preferredComponentRotations.get(type)
      : null;
  if (preferredRotation != null) {
    return normalizeRotation(preferredRotation);
  }

  return normalizeRotation(COMPONENT_DEFS[type]?.defaultRotation || 0);
}

function rememberComponentRotation(component, circuit) {
  if (!component || !(circuit?.preferredComponentRotations instanceof Map)) {
    return;
  }

  circuit.preferredComponentRotations.set(component.type, normalizeRotation(component.rotation || 0));
}

function formatComponentValue(component) {
  return getComponentBehavior(component.type).formatValue(component);
}

function getComponentWheelDisplay(component) {
  if (!component) {
    return {
      parameter: "",
      value: "",
      unit: "",
    };
  }

  if (component.type === "voltage_source" || component.type === VOLTAGE_NODE_TYPE) {
    const valueAndUnit = splitWheelValueAndUnit(formatEngineeringValueFixed(component.value, "V", 1));
    return {
      parameter: "V",
      ...valueAndUnit,
    };
  }

  if (component.type === "current_source") {
    const valueAndUnit = splitWheelValueAndUnit(formatEngineeringValueFixed(component.value, "A", 1));
    return {
      parameter: "I",
      ...valueAndUnit,
    };
  }

  if (component.type === "resistor") {
    const valueAndUnit = splitWheelValueAndUnit(formatEngineeringValueFixed(component.value, "Ω", 1));
    return {
      parameter: "R",
      ...valueAndUnit,
    };
  }

  if (component.type === "op_amp") {
    const valueAndUnit = splitWheelValueAndUnit(
      formatEngineeringValueFixed(Math.abs(component.value), "V", 1)
    );
    return {
      parameter: "V",
      value: `±${valueAndUnit.value}`,
      unit: valueAndUnit.unit,
    };
  }

  if (component.type === "mosfet_n" || component.type === "mosfet_p") {
    const parameter = component.activeEditableParam === "vt" ? "Vt" : "k";
    const valueAndUnit = splitWheelValueAndUnit(
      component.activeEditableParam === "vt"
        ? formatEngineeringValueFixed(component.vt, "V", 1)
        : formatEngineeringValueFixed(component.k, "A/V²", 1)
    );
    return {
      parameter,
      ...valueAndUnit,
    };
  }

  if (component.type === "bjt_npn" || component.type === "bjt_pnp") {
    return {
      parameter: "β",
      value: component.value.toFixed(1),
      unit: "A/A",
    };
  }

  const formatted = getComponentBehavior(component.type).formatWheelValue(component);
  const valueAndUnit = splitWheelValueAndUnit(typeof formatted === "string" ? formatted : String(formatted));
  return {
    parameter: "",
    ...valueAndUnit,
  };
}

function formatComponentWheelValue(component) {
  const { parameter, value, unit } = getComponentWheelDisplay(component);
  return [parameter, value, unit].filter((line) => line !== "").join("\n");
}

function splitWheelValueAndUnit(formatted) {
  const splitIndex = formatted.lastIndexOf(" ");
  if (splitIndex <= 0) {
    return {
      value: formatted,
      unit: "",
    };
  }

  return {
    value: formatted.slice(0, splitIndex),
    unit: formatted.slice(splitIndex + 1),
  };
}

function buildSvgForType(type, options = {}) {
  return getComponentBehavior(type).buildSvg(options);
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

function getValueLabelAnchor(component) {
  return getComponentBehavior(component.type).getValueLabelAnchor(component);
}

function getCurrentArrowTerminalPair(component) {
  return getComponentBehavior(component.type).getCurrentArrowTerminalPair(component);
}

function getComponentWheelTitle(component) {
  return getComponentBehavior(component.type).getWheelTitle(component);
}

function applyNormalizedValueToComponent(component, normalized) {
  const behavior = getComponentBehavior(component.type);
  const value = behavior.valueFromNormalized(component, normalized);
  behavior.setEditableValue(component, value);
}

function resetEditableParameter(component) {
  if (!component) return;
  getComponentBehavior(component.type).resetEditableParameter(component);
}

function toggleEditableParameter(component) {
  if (!component) return false;
  return getComponentBehavior(component.type).toggleEditableParameter(component) === true;
}

function quantizeResistor(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1000;
  }

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

export {
  DEFAULT_COMPONENT_BEHAVIOR,
  COMPONENT_BEHAVIORS,
  getComponentBehavior,
  getDefaultComponentRotation,
  rememberComponentRotation,
  formatComponentValue,
  formatComponentWheelValue,
  getComponentWheelDisplay,
  buildSvgForType,
  isSimulatedBranchComponent,
  getReachabilityTerminalPairs,
  getValueLabelAnchor,
  getCurrentArrowTerminalPair,
  getComponentWheelTitle,
  applyNormalizedValueToComponent,
  resetEditableParameter,
  toggleEditableParameter,
};
