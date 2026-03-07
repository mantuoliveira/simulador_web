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

function sameGridPoint(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function clonePath(path) {
  return path.map(clonePoint);
}
