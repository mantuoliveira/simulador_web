import {
  BJT_BASE_TERMINAL_INDEX,
  COMPONENT_DEFS,
  MAX_BJT_JUNCTION_VOLTAGE_STEP,
  MAX_DIODE_VOLTAGE_STEP,
  MOSFET_DRAIN_TERMINAL_INDEX,
  MOSFET_GATE_TERMINAL_INDEX,
  MOSFET_SOURCE_TERMINAL_INDEX,
  NEWTON_BACKTRACK_STEPS,
  NEWTON_CONSTRAINT_RESIDUAL_TOLERANCE,
  NEWTON_KCL_RESIDUAL_TOLERANCE,
  NEWTON_MAX_ITERATIONS,
  NEWTON_SOURCE_STEPS,
  NEWTON_STEP_TOLERANCE,
  OP_AMP_OUTPUT_TERMINAL_INDEX,
  isBjtComponentType,
  isGroundReferencedVoltageSourceComponent,
  isIdealVoltageSourceComponent,
  isMosfetComponentType,
} from "../core/constants.js";
import {
  DisjointSet,
  clamp,
  evaluateAndGateModel,
  evaluateBjtModel,
  evaluateDiodeModel,
  evaluateMosfetModel,
  evaluateNotGateModel,
  evaluateOpAmpModel,
  evaluateOrGateModel,
  evaluateXorGateModel,
  evaluateZenerModel,
  maxAbsValue,
  multiplyMatrixVector,
  safeResistance,
} from "../core/support.js";
import { state } from "../runtime/state.js";
import {
  getBjtCollectorEmitterTerminalIndices,
  getMosfetDrainSourceTerminalIndices,
  getOpAmpInputTerminalIndices,
  getTerminalPositionForComponents,
  parseTerminalKey,
  terminalKey,
  clonePoint,
  cloneTerminalRef,
} from "../core/model.js";
import {
  getReachabilityTerminalPairs,
  isSimulatedBranchComponent,
} from "../core/behaviors.js";

const IMPLICIT_GROUND_ROOT = "__implicit_ground__";

function simulateCircuit({
  components,
  wires,
  previousSolution = null,
  nodeMarkerTerminalByRoot = null,
}) {
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
  const hasImplicitGroundReference = components.some((component) =>
    isGroundReferencedVoltageSourceComponent(component)
  );

  if (groundTerminals.length === 0 && !hasImplicitGroundReference) {
    return { ok: false, message: "Inclua pelo menos um terra" };
  }

  if (groundTerminals.length > 0) {
    for (let i = 1; i < groundTerminals.length; i += 1) {
      dsu.union(groundTerminals[0], groundTerminals[i]);
    }
  }

  const groundRoot =
    groundTerminals.length > 0 ? dsu.find(groundTerminals[0]) : IMPLICIT_GROUND_ROOT;

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

    if (isGroundReferencedVoltageSourceComponent(component)) {
      const nodeRoot = rootByTerminal.get(terminalKey(component.id, 0));
      if (nodeRoot) {
        addEdge(nodeRoot, groundRoot);
      }
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

  const voltageSources = activeComponents.filter((component) =>
    isIdealVoltageSourceComponent(component)
  );
  const diodes = activeComponents.filter((component) => component.type === "diode");
  const zeners = activeComponents.filter((component) => component.type === "zener_diode");
  const bjts = activeComponents.filter((component) => isBjtComponentType(component));
  const mosfets = activeComponents.filter((component) => isMosfetComponentType(component));
  const opAmps = activeComponents.filter((component) => component.type === "op_amp");
  const logicGates = activeComponents.filter(
    (component) =>
      component.type === "and_gate" ||
      component.type === "or_gate" ||
      component.type === "xor_gate" ||
      component.type === "not_gate"
  );

  const N = nonGroundRoots.length;
  const M = voltageSources.length;
  const O = opAmps.length + logicGates.length;
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
    logicGates,
    rootByTerminal,
    getNodeIdx,
    N
  );

  let solution = null;
  if (
    diodes.length > 0 ||
    zeners.length > 0 ||
    bjts.length > 0 ||
    mosfets.length > 0 ||
    opAmps.length > 0 ||
    logicGates.length > 0
  ) {
    solution = solveNonlinearCircuit({
      baseMatrix: linearSystem.A,
      baseVector: linearSystem.z,
      diodes,
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
  const componentPowers = new Map();

  for (const component of activeComponents) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const v0 = nodeVoltageByRoot.get(r0) ?? 0;
    const v1 = nodeVoltageByRoot.get(r1) ?? 0;

    if (component.type === "resistor") {
      const current = (v0 - v1) / safeResistance(component.value);
      componentCurrents.set(component.id, current);
      componentPowers.set(component.id, safeResistance(component.value) * current * current);
    } else if (component.type === "current_source") {
      componentCurrents.set(component.id, component.value || 0);
    } else if (component.type === "diode") {
      componentCurrents.set(component.id, evaluateDiodeModel(component, v0 - v1).current);
    } else if (component.type === "zener_diode") {
      componentCurrents.set(component.id, evaluateZenerModel(component, v0 - v1).current);
    } else if (isBjtComponentType(component)) {
      const rBase = rootByTerminal.get(terminalKey(component.id, BJT_BASE_TERMINAL_INDEX));
      const { collectorIndex, emitterIndex } = getBjtCollectorEmitterTerminalIndices(component);
      const rCollector = rootByTerminal.get(terminalKey(component.id, collectorIndex));
      const rEmitter = rootByTerminal.get(terminalKey(component.id, emitterIndex));
      const vBase = nodeVoltageByRoot.get(rBase) ?? 0;
      const vCollector = nodeVoltageByRoot.get(rCollector) ?? 0;
      const vEmitter = nodeVoltageByRoot.get(rEmitter) ?? 0;
      componentCurrents.set(component.id, evaluateBjtModel(component, vBase - vEmitter, vBase - vCollector).ic);
    } else if (isMosfetComponentType(component)) {
      const rGate = rootByTerminal.get(terminalKey(component.id, MOSFET_GATE_TERMINAL_INDEX));
      const { drainIndex, sourceIndex } = getMosfetDrainSourceTerminalIndices(component);
      const rDrain = rootByTerminal.get(terminalKey(component.id, drainIndex));
      const rSource = rootByTerminal.get(terminalKey(component.id, sourceIndex));
      const vGate = nodeVoltageByRoot.get(rGate) ?? 0;
      const vDrain = nodeVoltageByRoot.get(rDrain) ?? 0;
      const vSource = nodeVoltageByRoot.get(rSource) ?? 0;
      componentCurrents.set(component.id, evaluateMosfetModel(component, vGate - vSource, vDrain - vSource).ids);
    }
  }

  voltageSources.forEach((component, k) => {
    componentCurrents.set(component.id, -solution[N + k]);
  });

  const markerGroups = new Map();
  for (const [terminal, root] of rootByTerminal.entries()) {
    if (!nodeVoltageByRoot.has(root)) continue;
    pushNodeMarkerGroupPoint(
      markerGroups,
      root,
      terminalPosition.get(terminal),
      parseTerminalKey(terminal)
    );
  }

  const nodeMarkers = [];
  for (const [root, group] of markerGroups.entries()) {
    const markerAnchor = chooseNodeMarkerAnchor(group, nodeMarkerTerminalByRoot?.get(root) ?? null);
    if (!markerAnchor) continue;

    nodeMarkers.push({
      root,
      x: markerAnchor.point.x,
      y: markerAnchor.point.y,
      voltage: nodeVoltageByRoot.get(root) ?? 0,
      anchorTerminal: cloneTerminalRef(markerAnchor.terminalRef),
      terminals: group.terminals.map(({ terminalRef }) => cloneTerminalRef(terminalRef)),
    });
  }

  const data = {
    nodeVoltages: nodeVoltageByRoot,
    componentCurrents,
    componentPowers,
    nodeMarkers,
    rootByTerminal,
    solutionVector: solution.slice(),
  };

  return { ok: true, data };
}

function buildStoredSimulationResult(result) {
  return result.ok ? { ok: true, data: result.data } : null;
}

function runSimulation(circuit = state) {
  const result = simulateCircuit({
    components: circuit.components,
    wires: circuit.wires,
    previousSolution: circuit.simulationResult?.data?.solutionVector,
    nodeMarkerTerminalByRoot: circuit.nodeMarkerTerminalByRoot,
  });
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

function pushNodeMarkerGroupPoint(groups, root, point, terminalRef) {
  if (!root || !point || !terminalRef) return;

  let group = groups.get(root);
  if (!group) {
    group = {
      terminals: [],
      terminalKeys: new Set(),
    };
    groups.set(root, group);
  }

  const refKey = terminalKey(terminalRef.componentId, terminalRef.terminalIndex);
  if (group.terminalKeys.has(refKey)) return;

  group.terminalKeys.add(refKey);
  group.terminals.push({
    terminalRef: cloneTerminalRef(terminalRef),
    point: clonePoint(point),
  });
}

function chooseNodeMarkerAnchor(group, preferredTerminalRef = null) {
  const candidates = Array.isArray(group?.terminals) ? group.terminals : [];
  if (!candidates.length) return null;

  if (preferredTerminalRef) {
    const preferredKey = terminalKey(
      preferredTerminalRef.componentId,
      preferredTerminalRef.terminalIndex
    );
    const preferredCandidate = candidates.find(
      ({ terminalRef }) => terminalKey(terminalRef.componentId, terminalRef.terminalIndex) === preferredKey
    );
    if (preferredCandidate) {
      return {
        point: clonePoint(preferredCandidate.point),
        terminalRef: cloneTerminalRef(preferredCandidate.terminalRef),
      };
    }
  }

  return {
    point: clonePoint(candidates[0].point),
    terminalRef: cloneTerminalRef(candidates[0].terminalRef),
  };
}

function buildLinearMnaSystem(
  activeComponents,
  voltageSources,
  opAmps,
  logicGates,
  rootByTerminal,
  getNodeIdx,
  nodeCount
) {
  const size = nodeCount + voltageSources.length + opAmps.length + logicGates.length;
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
    const r0 = isGroundReferencedVoltageSourceComponent(component)
      ? null
      : rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = isGroundReferencedVoltageSourceComponent(component)
      ? rootByTerminal.get(terminalKey(component.id, 0))
      : rootByTerminal.get(terminalKey(component.id, 1));
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

  logicGates.forEach((component, index) => {
    const row = nodeCount + voltageSources.length + opAmps.length + index;
    const outputTerminalIdx =
      component.type === "not_gate" ? 1 : OP_AMP_OUTPUT_TERMINAL_INDEX;
    const outputRoot = rootByTerminal.get(terminalKey(component.id, outputTerminalIdx));
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
  zeners,
  bjts,
  mosfets,
  opAmps,
  logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
          zeners,
          bjts,
          mosfets,
          opAmps,
          logicGates,
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
    zeners,
    bjts,
    mosfets,
    opAmps,
    logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
  zeners,
  bjts,
  mosfets,
  opAmps,
  logicGates,
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
      zeners,
      bjts,
      mosfets,
      opAmps,
      logicGates,
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
        zeners,
        bjts,
        mosfets,
        rootByTerminal,
        getNodeIdx
      );
      const candidateResidualNorm = evaluateResidualNorm(
        candidate,
        baseMatrix,
        baseVector,
        diodes,
        zeners,
        bjts,
        mosfets,
        opAmps,
        logicGates,
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
  zeners,
  bjts,
  mosfets,
  opAmps,
  logicGates,
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

  for (const component of zeners) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);
    const v0 = n0 >= 0 ? vector[n0] : 0;
    const v1 = n1 >= 0 ? vector[n1] : 0;
    const { current, conductance } = evaluateZenerModel(component, v0 - v1);
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

  for (const component of mosfets) {
    const rGate = rootByTerminal.get(terminalKey(component.id, MOSFET_GATE_TERMINAL_INDEX));
    const { drainIndex, sourceIndex } = getMosfetDrainSourceTerminalIndices(component);
    const rDrain = rootByTerminal.get(terminalKey(component.id, drainIndex));
    const rSource = rootByTerminal.get(terminalKey(component.id, sourceIndex));
    const nGate = getNodeIdx(rGate);
    const nDrain = getNodeIdx(rDrain);
    const nSource = getNodeIdx(rSource);
    const vGate = nGate >= 0 ? vector[nGate] : 0;
    const vDrain = nDrain >= 0 ? vector[nDrain] : 0;
    const vSource = nSource >= 0 ? vector[nSource] : 0;
    const model = evaluateMosfetModel(component, vGate - vSource, vDrain - vSource);

    stampMosfetResidualAndJacobian(
      residual,
      jacobian,
      nGate,
      nDrain,
      nSource,
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

  logicGates.forEach((component, index) => {
    const row = opAmpRowOffset + opAmps.length + index;

    if (component.type === "not_gate") {
      const rInput = rootByTerminal.get(terminalKey(component.id, 0));
      const nInput = getNodeIdx(rInput);
      const vInput = nInput >= 0 ? vector[nInput] : 0;
      const { voltage, dVoltage_dInputA } = evaluateNotGateModel(vInput);

      residual[row] -= voltage;
      if (nInput >= 0) jacobian[row][nInput] -= dVoltage_dInputA;
      return;
    }

    const rInputA = rootByTerminal.get(terminalKey(component.id, 0));
    const rInputB = rootByTerminal.get(terminalKey(component.id, 1));
    const nInputA = getNodeIdx(rInputA);
    const nInputB = getNodeIdx(rInputB);
    const vInputA = nInputA >= 0 ? vector[nInputA] : 0;
    const vInputB = nInputB >= 0 ? vector[nInputB] : 0;
    const { voltage, dVoltage_dInputA, dVoltage_dInputB } =
      component.type === "xor_gate"
        ? evaluateXorGateModel(vInputA, vInputB)
        : component.type === "or_gate"
          ? evaluateOrGateModel(vInputA, vInputB)
          : evaluateAndGateModel(vInputA, vInputB);

    residual[row] -= voltage;

    if (nInputA >= 0) {
      jacobian[row][nInputA] -= dVoltage_dInputA;
    }

    if (nInputB >= 0) {
      jacobian[row][nInputB] -= dVoltage_dInputB;
    }
  });

  return { residual, jacobian };
}

function evaluateResidualNorm(
  vector,
  baseMatrix,
  baseVector,
  diodes,
  zeners,
  bjts,
  mosfets,
  opAmps,
  logicGates,
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
    zeners,
    bjts,
    mosfets,
    opAmps,
    logicGates,
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

function limitCandidateJunctionVoltages(
  candidate,
  previousVector,
  diodes,
  zeners,
  bjts,
  _mosfets,
  rootByTerminal,
  getNodeIdx
) {
  if (!diodes.length && !zeners.length && !bjts.length) return candidate;

  const limited = candidate.slice();

  for (const component of diodes) {
    const r0 = rootByTerminal.get(terminalKey(component.id, 0));
    const r1 = rootByTerminal.get(terminalKey(component.id, 1));
    const n0 = getNodeIdx(r0);
    const n1 = getNodeIdx(r1);
    limitBranchVoltageStep(limited, previousVector, n0, n1, MAX_DIODE_VOLTAGE_STEP);
  }

  for (const component of zeners) {
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

function stampMosfetResidualAndJacobian(
  residual,
  jacobian,
  nGate,
  nDrain,
  nSource,
  model,
  scale = 1
) {
  const ids = model.ids * scale;
  const dIds_dVg = model.dIds_dVg * scale;
  const dIds_dVd = model.dIds_dVd * scale;
  const dIds_dVs = model.dIds_dVs * scale;

  if (nDrain >= 0) {
    residual[nDrain] += ids;
    if (nGate >= 0) jacobian[nDrain][nGate] += dIds_dVg;
    if (nDrain >= 0) jacobian[nDrain][nDrain] += dIds_dVd;
    if (nSource >= 0) jacobian[nDrain][nSource] += dIds_dVs;
  }

  if (nSource >= 0) {
    residual[nSource] -= ids;
    if (nGate >= 0) jacobian[nSource][nGate] -= dIds_dVg;
    if (nDrain >= 0) jacobian[nSource][nDrain] -= dIds_dVd;
    if (nSource >= 0) jacobian[nSource][nSource] -= dIds_dVs;
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

export {
  IMPLICIT_GROUND_ROOT,
  simulateCircuit,
  buildStoredSimulationResult,
  runSimulation,
  getComponentTerminalRoots,
  pushNodeMarkerGroupPoint,
  chooseNodeMarkerAnchor,
  buildLinearMnaSystem,
  solveNonlinearCircuit,
  runNewtonIterations,
  evaluateNonlinearSystem,
  evaluateResidualNorm,
  evaluateResidualMetrics,
  residualMetricsToScore,
  isResidualConverged,
  isResidualCloseEnough,
  stampConductance,
  limitCandidateJunctionVoltages,
  getBranchVoltage,
  limitBranchVoltageStep,
  stampBjtResidualAndJacobian,
  stampMosfetResidualAndJacobian,
  solveLinearSystem,
};
