import {
  COMPONENT_DEFS,
} from "../core/constants.js";
import { state } from "../runtime/state.js";
import {
  edgeKey,
  getComponentCollisionBounds,
  getComponentCollisionExtents,
  getTerminalPositionForComponents,
  key,
  manhattan,
  oppositeDirection,
  parsePathStateKey,
  pathStateKey,
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
const TURN_PENALTY = 0.5;
const SHARED_EDGE_PENALTY = 2;

function routeWireInCircuit(circuit, start, end, options = {}) {
  const blocked = buildBlockedCellSetForComponents(circuit.components, start, end);
  const occupiedEdges = buildOccupiedEdgeSetForWires(circuit.wires, options.ignoreWireIds);
  const bounds = routeBoundsForComponents(circuit.components, start, end);

  const route = findPathAStar(start, end, blocked, occupiedEdges, bounds, options);
  if (route) return route;

  if (options.startDirection || options.endDirection) {
    return findPathAStar(start, end, blocked, occupiedEdges, bounds, {});
  }

  return null;
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
    const collision = getComponentCollisionExtents(component);
    minX = Math.min(minX, Math.floor(component.x - collision.left - COMPONENT_ROUTE_MARGIN));
    maxX = Math.max(maxX, Math.ceil(component.x + collision.right + COMPONENT_ROUTE_MARGIN));
    minY = Math.min(minY, Math.floor(component.y - collision.up - COMPONENT_ROUTE_MARGIN));
    maxY = Math.max(maxY, Math.ceil(component.y + collision.down + COMPONENT_ROUTE_MARGIN));
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

function getNeighborInDirection(point, direction) {
  if (direction === "right") return { x: point.x + 1, y: point.y };
  if (direction === "left") return { x: point.x - 1, y: point.y };
  if (direction === "down") return { x: point.x, y: point.y + 1 };
  if (direction === "up") return { x: point.x, y: point.y - 1 };
  return null;
}

function findPathAStar(start, end, blocked, occupiedEdges, bounds, options = {}) {
  const { startDirection, endDirection } = options;
  const endKey = key(end.x, end.y);
  const startKey = key(start.x, start.y);

  const startDirNeighbor = startDirection ? getNeighborInDirection(start, startDirection) : null;
  const forceStartDir =
    startDirNeighbor != null &&
    isPointWithinRouteBounds(startDirNeighbor, bounds) &&
    (!blocked.has(key(startDirNeighbor.x, startDirNeighbor.y)) ||
      key(startDirNeighbor.x, startDirNeighbor.y) === endKey);

  const endApproachCell = endDirection
    ? getNeighborInDirection(end, oppositeDirection(endDirection))
    : null;
  const forceEndDir =
    endApproachCell != null &&
    isPointWithinRouteBounds(endApproachCell, bounds) &&
    !blocked.has(key(endApproachCell.x, endApproachCell.y));

  const startStateKey = pathStateKey(start, startDirection ?? null);
  const open = new Set([startStateKey]);
  const cameFrom = new Map();
  const gScore = new Map([[startStateKey, 0]]);
  const fScore = new Map([[startStateKey, manhattan(start, end)]]);

  while (open.size > 0) {
    const currentStateKey = findLowestScoreStateKey(open, fScore);

    if (!currentStateKey) break;

    const currentState = parsePathStateKey(currentStateKey);
    const current = currentState.point;

    if (key(current.x, current.y) === endKey) {
      return rebuildPath(cameFrom, currentStateKey);
    }

    open.delete(currentStateKey);

    for (const next of getOrthogonalNeighbors(current)) {
      if (!isPointWithinRouteBounds(next, bounds)) continue;

      const nk = key(next.x, next.y);
      if (blocked.has(nk) && nk !== endKey) continue;

      const nextDirection = stepDirection(current, next);

      if (forceStartDir && key(current.x, current.y) === startKey && nextDirection !== startDirection) {
        continue;
      }

      if (forceEndDir && nk === endKey && nextDirection !== endDirection) {
        continue;
      }

      const nextStateKey = pathStateKey(next, nextDirection);
      const turnCost =
        currentState.direction && currentState.direction !== nextDirection ? TURN_PENALTY : 0;
      const edgeCost =
        occupiedEdges.has(edgeKey(current, next)) ? SHARED_EDGE_PENALTY : 0;
      const tentative = (gScore.get(currentStateKey) ?? Infinity) + 1 + turnCost + edgeCost;

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
  const protectedKeys = new Set([key(start.x, start.y), key(end.x, end.y)]);

  for (const component of components) {
    const cells = getCollisionObstacleCells(component);
    for (const cell of cells) {
      blocked.add(key(cell.x, cell.y));
    }

    const def = COMPONENT_DEFS[component.type];
    if (!def) continue;
    for (let i = 0; i < def.terminals.length; i += 1) {
      const terminal = getTerminalPositionForComponents(components, component.id, i);
      if (!terminal) continue;
      const tk = key(terminal.x, terminal.y);
      if (!protectedKeys.has(tk)) {
        blocked.add(tk);
      }
    }
  }

  blocked.delete(key(start.x, start.y));
  blocked.delete(key(end.x, end.y));
  return blocked;
}

function buildOccupiedEdgeSetForWires(wires, ignoreWireIds = new Set()) {
  const blocked = new Set();

  for (const wire of wires) {
    if (ignoreWireIds.has(wire.id)) continue;
    if (!Array.isArray(wire.path) || wire.path.length < 2) continue;

    for (let i = 0; i < wire.path.length - 1; i += 1) {
      const a = wire.path[i];
      const b = wire.path[i + 1];
      const dx = Math.sign(b.x - a.x);
      const dy = Math.sign(b.y - a.y);
      let cx = a.x;
      let cy = a.y;

      while (cx !== b.x || cy !== b.y) {
        const nx = cx + dx;
        const ny = cy + dy;
        blocked.add(edgeKey({ x: cx, y: cy }, { x: nx, y: ny }));
        cx = nx;
        cy = ny;
      }
    }
  }

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

function getCollisionObstacleCells(component) {
  const bounds = getComponentCollisionBounds(component);
  const cells = new Map();

  const minX = Math.ceil(bounds.left + 0.5);
  const maxX = Math.floor(bounds.right - 0.5);
  const minY = Math.ceil(bounds.top + 0.5);
  const maxY = Math.floor(bounds.bottom - 0.5);

  for (let x = minX; x <= maxX; x += 1) {
    for (let y = minY; y <= maxY; y += 1) {
      cells.set(key(x, y), { x, y });
    }
  }

  const def = COMPONENT_DEFS[component.type];
  for (let terminalIndex = 0; terminalIndex < def.terminals.length; terminalIndex += 1) {
    const terminal = getTerminalPositionForComponents([component], component.id, terminalIndex);
    if (!terminal) continue;

    const dx = terminal.x - component.x;
    const dy = terminal.y - component.y;
    if (Math.abs(dx) >= Math.abs(dy)) {
      for (let y = minY; y <= maxY; y += 1) {
        cells.delete(key(terminal.x, y));
      }
      continue;
    }

    for (let x = minX; x <= maxX; x += 1) {
      cells.delete(key(x, terminal.y));
    }
  }

  return [...cells.values()];
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
  getNeighborInDirection,
  buildBlockedCellSetForComponents,
  findLowestScoreStateKey,
  getOrthogonalNeighbors,
  isPointWithinRouteBounds,
  rebuildPath,
  simplifyOrthogonalPath,
  getCollisionObstacleCells,
  sameGridPoint,
  clonePoint,
  clonePath,
};
