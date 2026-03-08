import {
  COMPONENT_DEFS,
  NODE_PROXIMITY_PENALTY,
  OCCUPIED_WIRE_EDGE_PENALTY,
  TERMINAL_DIRECTION_MISMATCH_PENALTY,
  TURN_PENALTY,
} from "../core/constants.js";
import { state } from "../runtime/state.js";
import {
  edgeKey,
  getFootprintExtents,
  getTerminalPositionForComponents,
  key,
  manhattan,
  parsePathStateKey,
  pathStateKey,
  rotateOffset,
  stepDirection,
} from "../core/model.js";

const ORTHOGONAL_NEIGHBOR_STEPS = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];
const COMPONENT_ROUTE_MARGIN = 2;
const ROUTE_BOUNDS_PADDING = 10;

function routeWireInCircuit(circuit, start, end, options = {}) {
  const blocked = buildBlockedCellSetForComponents(circuit.components, start, end);
  const occupiedEdges = buildOccupiedWireEdgeSetForWires(circuit.wires, options.ignoreWireIds);
  const nodeProximity = buildTerminalProximitySetForComponents(circuit.components, start, end);
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
    minX = Math.min(minX, Math.floor(component.x - fp.left - COMPONENT_ROUTE_MARGIN));
    maxX = Math.max(maxX, Math.ceil(component.x + fp.right + COMPONENT_ROUTE_MARGIN));
    minY = Math.min(minY, Math.floor(component.y - fp.up - COMPONENT_ROUTE_MARGIN));
    maxY = Math.max(maxY, Math.ceil(component.y + fp.down + COMPONENT_ROUTE_MARGIN));
  }

  return {
    minX: minX - ROUTE_BOUNDS_PADDING,
    maxX: maxX + ROUTE_BOUNDS_PADDING,
    minY: minY - ROUTE_BOUNDS_PADDING,
    maxY: maxY + ROUTE_BOUNDS_PADDING,
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
    const currentStateKey = findLowestScoreStateKey(open, fScore);

    if (!currentStateKey) break;

    const currentState = parsePathStateKey(currentStateKey);
    const current = currentState.point;
    const currentKey = key(current.x, current.y);

    if (currentKey === endKey) {
      return rebuildPath(cameFrom, currentStateKey);
    }

    open.delete(currentStateKey);

    for (const next of getOrthogonalNeighbors(current)) {
      if (!isPointWithinRouteBounds(next, bounds)) {
        continue;
      }

      const nk = key(next.x, next.y);
      if (blocked.has(nk) && nk !== endKey) continue;

      const nextDirection = stepDirection(current, next);
      const nextStateKey = pathStateKey(next, nextDirection);
      const tentative =
        (gScore.get(currentStateKey) ?? Infinity) +
        computePathTransitionCost({
          current,
          currentState,
          next,
          nextKey: nk,
          nextDirection,
          startKey,
          endKey,
          occupiedEdges,
          nodeProximity,
          preferredStartDirection,
          preferredEndDirection,
        });
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

function buildBlockedCellSetForComponents(components, start, end) {
  const blocked = new Set();

  for (const component of components) {
    const cells = getObstacleCells(component);
    for (const cell of cells) {
      blocked.add(key(cell.x, cell.y));
    }
  }

  blocked.delete(key(start.x, start.y));
  blocked.delete(key(end.x, end.y));
  return blocked;
}

function findLowestScoreStateKey(open, fScore) {
  let bestKey = null;
  let bestScore = Infinity;

  for (const candidate of open) {
    const score = fScore.get(candidate) ?? Infinity;
    if (score < bestScore) {
      bestScore = score;
      bestKey = candidate;
    }
  }

  return bestKey;
}

function getOrthogonalNeighbors(point) {
  return ORTHOGONAL_NEIGHBOR_STEPS.map((step) => ({
    x: point.x + step.x,
    y: point.y + step.y,
  }));
}

function isPointWithinRouteBounds(point, bounds) {
  return (
    point.x >= bounds.minX &&
    point.x <= bounds.maxX &&
    point.y >= bounds.minY &&
    point.y <= bounds.maxY
  );
}

function computePathTransitionCost({
  current,
  currentState,
  next,
  nextKey,
  nextDirection,
  startKey,
  endKey,
  occupiedEdges,
  nodeProximity,
  preferredStartDirection,
  preferredEndDirection,
}) {
  const edgePenalty = occupiedEdges.has(edgeKey(current, next)) ? OCCUPIED_WIRE_EDGE_PENALTY : 0;
  const proximityPenalty =
    nextKey !== startKey && nextKey !== endKey && nodeProximity.has(nextKey) ? NODE_PROXIMITY_PENALTY : 0;
  const turnPenalty =
    currentState.direction && currentState.direction !== nextDirection ? TURN_PENALTY : 0;
  const startDirectionPenalty =
    !currentState.direction &&
    preferredStartDirection &&
    nextDirection !== preferredStartDirection
      ? TERMINAL_DIRECTION_MISMATCH_PENALTY
      : 0;
  const endDirectionPenalty =
    nextKey === endKey && preferredEndDirection && nextDirection !== preferredEndDirection
      ? TERMINAL_DIRECTION_MISMATCH_PENALTY
      : 0;

  return (
    1 +
    edgePenalty +
    proximityPenalty +
    turnPenalty +
    startDirectionPenalty +
    endDirectionPenalty
  );
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
        addLinearOccupiedEdges(occupied, start, end, "y");
        continue;
      }

      if (start.y === end.y) {
        addLinearOccupiedEdges(occupied, start, end, "x");
      }
    }
  }

  return occupied;
}

function addLinearOccupiedEdges(occupied, start, end, axis) {
  const delta = end[axis] > start[axis] ? 1 : -1;

  if (axis === "y") {
    for (let y = start.y; y !== end.y; y += delta) {
      occupied.add(edgeKey({ x: start.x, y }, { x: start.x, y: y + delta }));
    }
    return;
  }

  for (let x = start.x; x !== end.x; x += delta) {
    occupied.add(edgeKey({ x, y: start.y }, { x: x + delta, y: start.y }));
  }
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

      for (const neighbor of getOrthogonalNeighbors(terminal)) {
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

export {
  ORTHOGONAL_NEIGHBOR_STEPS,
  COMPONENT_ROUTE_MARGIN,
  ROUTE_BOUNDS_PADDING,
  routeWireInCircuit,
  routeWire,
  routeBoundsForComponents,
  routeBounds,
  findPathAStar,
  buildBlockedCellSetForComponents,
  findLowestScoreStateKey,
  getOrthogonalNeighbors,
  isPointWithinRouteBounds,
  computePathTransitionCost,
  buildOccupiedWireEdgeSetForWires,
  addLinearOccupiedEdges,
  buildOccupiedWireEdgeSet,
  buildTerminalProximitySetForComponents,
  buildTerminalProximitySet,
  rebuildPath,
  simplifyOrthogonalPath,
  getObstacleCells,
  sameGridPoint,
  clonePoint,
  clonePath,
};
