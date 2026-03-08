import {
  BJT_COLLECTOR_TERMINAL_INDEX,
  BJT_EMITTER_TERMINAL_INDEX,
  COMPONENT_DEFS,
  OP_AMP_BOTTOM_INPUT_TERMINAL_INDEX,
  OP_AMP_TOP_INPUT_TERMINAL_INDEX,
} from "./constants.js";
import { clamp, degToRad, normalizeRotation } from "./support.js";

function clonePoint(point) {
  return { x: point.x, y: point.y };
}

function clonePath(path) {
  return path.map(clonePoint);
}

function sameGridPoint(a, b) {
  return !!a && !!b && a.x === b.x && a.y === b.y;
}

function cloneTerminalRef(ref) {
  return {
    componentId: ref.componentId,
    terminalIndex: ref.terminalIndex,
  };
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
  const base = def?.terminals?.[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  return {
    x: component.x + offset.x,
    y: component.y + offset.y,
  };
}

function getTerminalLabelDirectionForComponents(components, componentId, terminalIndex) {
  const component = getComponentByIdFromCollection(components, componentId);
  if (!component) return null;

  const def = COMPONENT_DEFS[component.type];
  const base = def?.terminals?.[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  if (offset.x === 0 && offset.y === 0) return null;

  if (Math.abs(offset.x) >= Math.abs(offset.y)) {
    return offset.x >= 0 ? "right" : "left";
  }

  return offset.y >= 0 ? "down" : "up";
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

function getCardinalValueLabelAnchor(component, offset) {
  const rotation = normalizeRotation(component.rotation);
  if (rotation === 0) return { x: component.x, y: component.y - offset };
  if (rotation === 90) return { x: component.x + offset, y: component.y };
  if (rotation === 180) return { x: component.x, y: component.y + offset };
  return { x: component.x - offset, y: component.y };
}

function getReverseCardinalValueLabelAnchor(component, offset) {
  const rotation = normalizeRotation(component.rotation);
  if (rotation === 0) return { x: component.x, y: component.y + offset };
  if (rotation === 90) return { x: component.x - offset, y: component.y };
  if (rotation === 180) return { x: component.x, y: component.y - offset };
  return { x: component.x + offset, y: component.y };
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

function getComponentBodyBounds(component) {
  const def = COMPONENT_DEFS[component.type];
  if (!def) {
    return {
      left: component.x,
      right: component.x,
      top: component.y,
      bottom: component.y,
    };
  }

  const offsetY = def.bodyOffsetY || 0;
  const corners = [
    rotateOffset(-def.bodyHalfW, -def.bodyHalfH + offsetY, component.rotation),
    rotateOffset(def.bodyHalfW, -def.bodyHalfH + offsetY, component.rotation),
    rotateOffset(def.bodyHalfW, def.bodyHalfH + offsetY, component.rotation),
    rotateOffset(-def.bodyHalfW, def.bodyHalfH + offsetY, component.rotation),
  ];

  const xs = corners.map((corner) => component.x + corner.x);
  const ys = corners.map((corner) => component.y + corner.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

function getComponentRenderBounds(component) {
  const def = COMPONENT_DEFS[component.type];
  if (!def) {
    return getComponentBodyBounds(component);
  }

  if (def.renderBounds) {
    const corners = [
      rotateOffset(-def.renderBounds.left, -def.renderBounds.up, component.rotation),
      rotateOffset(def.renderBounds.right, -def.renderBounds.up, component.rotation),
      rotateOffset(def.renderBounds.right, def.renderBounds.down, component.rotation),
      rotateOffset(-def.renderBounds.left, def.renderBounds.down, component.rotation),
    ];

    const xs = corners.map((corner) => component.x + corner.x);
    const ys = corners.map((corner) => component.y + corner.y);
    return {
      left: Math.min(...xs),
      right: Math.max(...xs),
      top: Math.min(...ys),
      bottom: Math.max(...ys),
    };
  }

  const renderW = def.renderW || 0;
  const renderH = def.renderH || 0;
  if (renderW <= 0 || renderH <= 0) {
    const footprint = getFootprintExtents(component);
    return {
      left: component.x - footprint.left,
      right: component.x + footprint.right,
      top: component.y - footprint.up,
      bottom: component.y + footprint.down,
    };
  }

  const halfW = renderW * 0.5;
  const halfH = renderH * 0.5;
  const offsetX = def.renderOffsetX || 0;
  const offsetY = def.renderOffsetY || 0;
  const corners = [
    rotateOffset(-halfW + offsetX, -halfH + offsetY, component.rotation),
    rotateOffset(halfW + offsetX, -halfH + offsetY, component.rotation),
    rotateOffset(halfW + offsetX, halfH + offsetY, component.rotation),
    rotateOffset(-halfW + offsetX, halfH + offsetY, component.rotation),
  ];

  const xs = corners.map((corner) => component.x + corner.x);
  const ys = corners.map((corner) => component.y + corner.y);
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
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

function componentsRenderBoundsOverlap(a, b, padding = 0) {
  const boundsA = getComponentRenderBounds(a);
  const boundsB = getComponentRenderBounds(b);

  return (
    boundsA.left < boundsB.right + padding &&
    boundsA.right + padding > boundsB.left &&
    boundsA.top < boundsB.bottom + padding &&
    boundsA.bottom + padding > boundsB.top
  );
}

function componentsBodiesOverlap(a, b, padding = 0) {
  const bodyA = getComponentBodyBounds(a);
  const bodyB = getComponentBodyBounds(b);

  return (
    bodyA.left < bodyB.right + padding &&
    bodyA.right + padding > bodyB.left &&
    bodyA.top < bodyB.bottom + padding &&
    bodyA.bottom + padding > bodyB.top
  );
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

function pointOnOrthogonalSegment(point, start, end) {
  const withinX =
    point.x >= Math.min(start.x, end.x) && point.x <= Math.max(start.x, end.x);
  const withinY =
    point.y >= Math.min(start.y, end.y) && point.y <= Math.max(start.y, end.y);

  if (!withinX || !withinY) return false;
  if (start.x === end.x) return point.x === start.x;
  if (start.y === end.y) return point.y === start.y;
  return false;
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

function worldToLocal(component, worldX, worldY) {
  const dx = worldX - component.x;
  const dy = worldY - component.y;
  const rad = degToRad(-component.rotation);
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
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

function getObstacleCells(component) {
  const def = COMPONENT_DEFS[component.type];
  const cells = [];
  for (const base of def.obstacleCells) {
    const rotated = rotateOffset(base[0], base[1], component.rotation);
    cells.push({ x: component.x + rotated.x, y: component.y + rotated.y });
  }
  return cells;
}

export {
  clonePoint,
  clonePath,
  sameGridPoint,
  cloneTerminalRef,
  rotateOffset,
  terminalKey,
  parseTerminalKey,
  key,
  edgeKey,
  pathStateKey,
  parsePathStateKey,
  parseKey,
  stepDirection,
  oppositeDirection,
  manhattan,
  getComponentByIdFromCollection,
  getWireByIdFromCollection,
  getTerminalPositionForComponents,
  getTerminalLabelDirectionForComponents,
  buildRouteTerminalOptionsForComponents,
  getOpAmpInputTerminalIndices,
  getBjtCollectorEmitterTerminalIndices,
  getCardinalValueLabelAnchor,
  getReverseCardinalValueLabelAnchor,
  getFootprintExtents,
  getComponentBodyBounds,
  getComponentRenderBounds,
  componentsOverlap,
  componentsRenderBoundsOverlap,
  componentsBodiesOverlap,
  getWireTerminalPositionsForComponents,
  pointOnOrthogonalSegment,
  snapPointToSegment,
  worldToLocal,
  pointInsideComponentBody,
  getObstacleCells,
};
