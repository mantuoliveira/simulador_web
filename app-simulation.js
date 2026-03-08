const IMPLICIT_GROUND_ROOT = "__implicit_ground__";

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
  const bjts = activeComponents.filter((component) => isBjtComponentType(component));
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
    } else if (isBjtComponentType(component)) {
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
      root,
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
