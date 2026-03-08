// Circuit editing, selection state, topology changes, and shared runtime helpers.

function handleTerminalTap(componentId, terminalIndex) {
  if (!state.pendingTerminal) {
    syncSelectedNodeMarkerWithTerminal(componentId, terminalIndex);
  } else {
    state.selectedWireId = null;
    state.selectedTerminalLabelKey = null;
  }

  if (!state.pendingTerminal) {
    state.pendingTerminal = { componentId, terminalIndex };
    updateSelectionUi();
    return;
  }

  const first = state.pendingTerminal;
  if (first.componentId === componentId && first.terminalIndex === terminalIndex) {
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  if (first.componentId === componentId) {
    if (isIntraComponentConnectionAllowed(componentId, first.terminalIndex, terminalIndex)) {
      // Allow explicit feedback/short pairs declared by the component behavior.
    } else {
      showStatus("Conexão no mesmo componente não permitida", true);
      state.pendingTerminal = null;
      updateSelectionUi();
      return;
    }
  }
  if (
    hasDirectWireBetween(
      first.componentId,
      first.terminalIndex,
      componentId,
      terminalIndex
    )
  ) {
    showStatus("Conexão já existe", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const start = getTerminalPosition(first.componentId, first.terminalIndex);
  const end = getTerminalPosition(componentId, terminalIndex);
  if (!start || !end) {
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const route = routeWire(start, end, buildRouteTerminalOptions(first, { componentId, terminalIndex }));
  if (!route) {
    showStatus("Não foi possível rotear o fio", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  state.wires.push({
    id: state.nextWireId++,
    from: { componentId: first.componentId, terminalIndex: first.terminalIndex },
    to: { componentId, terminalIndex },
    path: route,
  });

  state.pendingTerminal = null;
  updateSelectionUi();
  onCircuitChanged();
}

function isIntraComponentConnectionAllowed(componentId, firstTerminalIndex, secondTerminalIndex) {
  if (firstTerminalIndex === secondTerminalIndex) return false;

  const component = getComponentById(componentId);
  if (!component) return false;

  return getComponentBehavior(component.type).allowsIntraComponentConnection(
    component,
    firstTerminalIndex,
    secondTerminalIndex
  );
}

function handleWireTap(wireHit) {
  if (!state.pendingTerminal) {
    selectWire(wireHit.wire.id);
    return;
  }

  if (state.selectedWireId != null || state.selectedNodeMarkerRoot != null) {
    state.selectedWireId = null;
    clearNodeMarkerSelection();
    updateSelectionUi();
  }

  const endpoint = getWireEndpointAtPoint(wireHit.wire, wireHit.point);
  if (endpoint) {
    handleTerminalTap(endpoint.componentId, endpoint.terminalIndex);
    return;
  }

  const pending = state.pendingTerminal;
  const start = getTerminalPosition(pending.componentId, pending.terminalIndex);
  if (!start) {
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const splitPaths = splitWirePathAtPoint(wireHit.wire.path, wireHit.segmentIndex, wireHit.point);
  if (!splitPaths) {
    showStatus("Nao foi possivel dividir o fio", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const junction = buildJunctionComponent(wireHit.point);
  if (!isComponentPlacementValid(junction, null, 0)) {
    showStatus("Nao foi possivel criar a juncao", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const branchRoute = routeWire(start, wireHit.point, buildRouteTerminalOptions(pending));
  if (!branchRoute) {
    showStatus("Nao foi possivel conectar ao fio", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  const splitWires = buildSplitWires(wireHit.wire, junction.id, splitPaths);
  const branchWire = {
    id: state.nextWireId + 2,
    from: cloneTerminalRef(pending),
    to: { componentId: junction.id, terminalIndex: 0 },
    path: branchRoute,
  };

  const result = replaceWireWithTap(wireHit.wire.id, junction, splitWires, branchWire);
  if (!result.ok) {
    showStatus(result.message || "Nao foi possivel criar a derivacao", true);
    state.pendingTerminal = null;
    updateSelectionUi();
    return;
  }

  state.pendingTerminal = null;
  updateSelectionUi();
  onCircuitChanged();
}

function hasDirectWireBetween(aComponentId, aTerminalIndex, bComponentId, bTerminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === aComponentId &&
        wire.from.terminalIndex === aTerminalIndex &&
        wire.to.componentId === bComponentId &&
        wire.to.terminalIndex === bTerminalIndex) ||
      (wire.from.componentId === bComponentId &&
        wire.from.terminalIndex === bTerminalIndex &&
        wire.to.componentId === aComponentId &&
        wire.to.terminalIndex === aTerminalIndex)
  );
}

function addComponent(type) {
  const spot = findEmptySpot(type);
  if (!spot) {
    showStatus("Sem espaço livre no canvas", true);
    return;
  }

  const result = addComponentToCircuit(state, type, spot);
  if (!result.ok) {
    showStatus(result.message || "Falha ao adicionar componente", true);
    return;
  }

  selectComponent(result.component.id);
  onCircuitChanged();
}

function addComponentToCircuit(circuit, type, position) {
  const def = COMPONENT_DEFS[type];
  if (!def) {
    return { ok: false, message: "Tipo de componente invalido" };
  }

  if (!position) {
    return { ok: false, message: "Posicao invalida" };
  }

  const behavior = getComponentBehavior(type);
  const component = {
    id: circuit.nextComponentId,
    type,
    x: position.x,
    y: position.y,
    rotation: getDefaultComponentRotation(type, circuit),
    value: def.defaultValue,
    ...behavior.createState(),
  };

  if (!isComponentPlacementValidForComponents(circuit.components, component, null, 0)) {
    return { ok: false, message: "Posicao ocupada" };
  }

  circuit.components.push(component);
  circuit.nextComponentId += 1;
  return { ok: true, component };
}

function buildJunctionComponent(point) {
  return buildJunctionComponentForCircuit(state, point);
}

function buildJunctionComponentForCircuit(circuit, point) {
  return {
    id: circuit.nextComponentId,
    type: "junction",
    x: point.x,
    y: point.y,
    rotation: 0,
    value: 0,
  };
}

function buildSplitWires(originalWire, junctionId, splitPaths) {
  return buildSplitWiresForCircuit(state, originalWire, junctionId, splitPaths);
}

function buildSplitWiresForCircuit(circuit, originalWire, junctionId, splitPaths) {
  const splitGroupId = circuit.nextSplitGroupId;
  const originalPath = clonePath(originalWire.path);
  const originalFrom = cloneTerminalRef(originalWire.from);
  const originalTo = cloneTerminalRef(originalWire.to);

  return [
    {
      id: circuit.nextWireId,
      from: cloneTerminalRef(originalWire.from),
      to: { componentId: junctionId, terminalIndex: 0 },
      path: splitPaths.firstPath,
      splitGroupId,
      splitGroupRole: "from",
      splitOriginalPath: originalPath,
      splitOriginalFrom: originalFrom,
      splitOriginalTo: originalTo,
    },
    {
      id: circuit.nextWireId + 1,
      from: { componentId: junctionId, terminalIndex: 0 },
      to: cloneTerminalRef(originalWire.to),
      path: splitPaths.secondPath,
      splitGroupId,
      splitGroupRole: "to",
      splitOriginalPath: originalPath,
      splitOriginalFrom: originalFrom,
      splitOriginalTo: originalTo,
    },
  ];
}

function replaceWireWithTap(originalWireId, junction, splitWires, branchWire) {
  return replaceWireWithTapInCircuit(state, originalWireId, junction, splitWires, branchWire);
}

function replaceWireWithTapInCircuit(circuit, originalWireId, junction, splitWires, branchWire) {
  if (!getWireByIdFromCollection(circuit.wires, originalWireId)) {
    return { ok: false, message: "Fio original nao encontrado" };
  }

  circuit.wires = circuit.wires.filter((wire) => wire.id !== originalWireId);
  circuit.components.push(junction);
  circuit.wires.push(...splitWires, branchWire);
  circuit.nextComponentId += 1;
  circuit.nextWireId += 3;
  circuit.nextSplitGroupId += 1;
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true };
}

function splitWirePathAtPoint(path, segmentIndex, point) {
  if (!path || path.length < 2) return null;
  if (segmentIndex < 0 || segmentIndex >= path.length - 1) return null;

  const start = path[segmentIndex];
  const end = path[segmentIndex + 1];
  if (!pointOnOrthogonalSegment(point, start, end)) return null;

  if (sameGridPoint(point, path[0]) || sameGridPoint(point, path[path.length - 1])) {
    return null;
  }

  const firstPath = clonePath(path.slice(0, segmentIndex + 1));
  if (!sameGridPoint(firstPath[firstPath.length - 1], point)) {
    firstPath.push(clonePoint(point));
  }

  const secondPath = [clonePoint(point)];
  if (!sameGridPoint(point, end)) {
    secondPath.push(clonePoint(end));
  }

  for (let i = segmentIndex + 2; i < path.length; i += 1) {
    secondPath.push(clonePoint(path[i]));
  }

  if (firstPath.length < 2 || secondPath.length < 2) {
    return null;
  }

  return {
    firstPath: simplifyOrthogonalPath(firstPath),
    secondPath: simplifyOrthogonalPath(secondPath),
  };
}

function getWireEndpointAtPoint(wire, point) {
  if (sameGridPoint(point, wire.path[0])) {
    return wire.from;
  }

  if (sameGridPoint(point, wire.path[wire.path.length - 1])) {
    return wire.to;
  }

  return null;
}

function findEmptySpot(type) {
  const def = COMPONENT_DEFS[type];
  if (!def) return null;

  const center = screenToWorld(appEls.canvas.clientWidth * 0.5, appEls.canvas.clientHeight * 0.5);
  const visible = getVisibleWorldBounds();
  const margin = 1;
  const preferredRotation = getDefaultComponentRotation(type);
  const footprint = getFootprintExtents({ type, rotation: preferredRotation });

  const minX = Math.ceil(visible.minX + footprint.left + margin);
  const maxX = Math.floor(visible.maxX - footprint.right - margin);
  const minY = Math.ceil(visible.minY + footprint.up + margin);
  const maxY = Math.floor(visible.maxY - footprint.down - margin);

  if (minX > maxX || minY > maxY) return null;

  const baseX = clamp(Math.round(center.x), minX, maxX);
  const baseY = clamp(Math.round(center.y), minY, maxY);

  const candidate = { id: -1, type, x: baseX, y: baseY, rotation: preferredRotation };
  const searchPaddingValues = [2, 0];

  // Prefer a bit of breathing room on auto-placement, but fall back to the
  // actual collision rules so valid dense layouts are still insertable.
  for (const padding of searchPaddingValues) {
    candidate.x = baseX;
    candidate.y = baseY;
    if (isComponentPlacementValid(candidate, null, padding)) {
      return { x: baseX, y: baseY };
    }

    const maxRing = Math.max(maxX - minX, maxY - minY);
    for (let ring = 1; ring <= maxRing; ring += 1) {
      for (let x = baseX - ring; x <= baseX + ring; x += 1) {
        if (x < minX || x > maxX) continue;

        const topY = baseY - ring;
        if (topY >= minY && topY <= maxY) {
          candidate.x = x;
          candidate.y = topY;
          if (isComponentPlacementValid(candidate, null, padding)) return { x, y: topY };
        }

        const bottomY = baseY + ring;
        if (bottomY >= minY && bottomY <= maxY) {
          candidate.x = x;
          candidate.y = bottomY;
          if (isComponentPlacementValid(candidate, null, padding)) return { x, y: bottomY };
        }
      }

      for (let y = baseY - ring + 1; y <= baseY + ring - 1; y += 1) {
        if (y < minY || y > maxY) continue;

        const leftX = baseX - ring;
        if (leftX >= minX && leftX <= maxX) {
          candidate.x = leftX;
          candidate.y = y;
          if (isComponentPlacementValid(candidate, null, padding)) return { x: leftX, y };
        }

        const rightX = baseX + ring;
        if (rightX >= minX && rightX <= maxX) {
          candidate.x = rightX;
          candidate.y = y;
          if (isComponentPlacementValid(candidate, null, padding)) return { x: rightX, y };
        }
      }
    }
  }

  return null;
}

function snapshotWireStates(wires) {
  const previousPaths = new Map();
  for (const wire of wires) {
    previousPaths.set(wire.id, {
      path: wire.path,
      implicitContact: wire.implicitContact === true,
    });
  }
  return previousPaths;
}

function restoreWireStates(wires, previousPaths) {
  for (const wire of wires) {
    const previousState = previousPaths.get(wire.id);
    if (!previousState) continue;
    wire.path = previousState.path;
    wire.implicitContact = previousState.implicitContact;
  }
}

function tryMoveComponent(componentId, targetX, targetY) {
  const result = moveComponentInCircuit(state, componentId, targetX, targetY);
  if (result.ok) {
    onCircuitChanged();
    if (result.selectionChanged) {
      updateSelectionUi();
    }
  }
  return result.ok;
}

function getWiresForComponentIdsFromCollection(wires, componentIds) {
  const ids = componentIds instanceof Set ? componentIds : new Set(componentIds);
  const seen = new Set();
  const linked = [];

  for (const wire of wires) {
    if (!ids.has(wire.from.componentId) && !ids.has(wire.to.componentId)) {
      continue;
    }

    if (seen.has(wire.id)) continue;
    seen.add(wire.id);
    linked.push(wire);
  }

  return linked;
}

function restoreComponentPositions(components, previousPositions) {
  for (const component of components) {
    const previous = previousPositions.get(component.id);
    if (!previous) continue;
    component.x = previous.x;
    component.y = previous.y;
  }
}

function rollbackGroupMoveInCircuit(
  circuit,
  movedComponents,
  previousPositions,
  linkedWires,
  previousWireStates,
  previousNextWireId,
  createdWireIds
) {
  restoreComponentPositions(movedComponents, previousPositions);
  circuit.nextWireId = previousNextWireId;
  if (createdWireIds.length > 0) {
    const createdIds = new Set(createdWireIds);
    circuit.wires = circuit.wires.filter((wire) => !createdIds.has(wire.id));
  }
  restoreWireStates(linkedWires, previousWireStates);
}

function tryMoveSelectedComponents(anchorComponentId, targetX, targetY) {
  const result = moveSelectedComponentsInCircuit(state, anchorComponentId, targetX, targetY);
  if (result.ok) {
    onCircuitChanged();
    if (result.selectionChanged) {
      updateSelectionUi();
    }
  }
  return result.ok;
}

function moveSelectedComponentsInCircuit(circuit, anchorComponentId, targetX, targetY) {
  const selectedIds = circuit.selectedComponentIds instanceof Set ? [...circuit.selectedComponentIds] : [];
  if (selectedIds.length === 0) {
    return { ok: false, message: "Nenhum componente selecionado" };
  }

  if (!selectedIds.includes(anchorComponentId)) {
    return { ok: false, message: "Componente ancora nao selecionado" };
  }

  const selectedIdSet = new Set(selectedIds);
  const movedComponents = selectedIds
    .map((componentId) => getComponentByIdFromCollection(circuit.components, componentId))
    .filter(Boolean);
  if (movedComponents.length !== selectedIds.length) {
    return { ok: false, message: "Selecao de grupo invalida" };
  }

  const anchorComponent = getComponentByIdFromCollection(circuit.components, anchorComponentId);
  if (!anchorComponent) {
    return { ok: false, message: "Componente ancora nao encontrado" };
  }

  const deltaX = targetX - anchorComponent.x;
  const deltaY = targetY - anchorComponent.y;
  if (deltaX === 0 && deltaY === 0) {
    return { ok: true };
  }

  const previousPositions = new Map(
    movedComponents.map((component) => [component.id, { x: component.x, y: component.y }])
  );
  const linkedWires = getWiresForComponentIdsFromCollection(circuit.wires, selectedIdSet);
  const previousWireStates = snapshotWireStates(linkedWires);
  const previousNextWireId = circuit.nextWireId;
  const createdWireIds = [];
  const stationaryComponents = circuit.components.filter((component) => !selectedIdSet.has(component.id));

  for (const component of movedComponents) {
    component.x += deltaX;
    component.y += deltaY;
  }

  for (const component of movedComponents) {
    const autoContactCandidate = findAutoContactCandidateForTargetsInCircuit(
      circuit,
      component.id,
      stationaryComponents
    );
    const placementOk = isComponentPlacementValidForComponents(stationaryComponents, component, null, 0);
    if (!placementOk && !autoContactCandidate) {
      rollbackGroupMoveInCircuit(
        circuit,
        movedComponents,
        previousPositions,
        linkedWires,
        previousWireStates,
        previousNextWireId,
        createdWireIds
      );
      return { ok: false };
    }
  }

  for (const component of movedComponents) {
    const autoContactCandidate = findAutoContactCandidateForTargetsInCircuit(
      circuit,
      component.id,
      stationaryComponents
    );
    const contactSyncResult = syncImplicitContactWiresInCircuit(
      circuit,
      component.id,
      autoContactCandidate
    );
    if (!contactSyncResult.ok) {
      rollbackGroupMoveInCircuit(
        circuit,
        movedComponents,
        previousPositions,
        linkedWires,
        previousWireStates,
        previousNextWireId,
        createdWireIds
      );
      return { ok: false };
    }

    if (Array.isArray(contactSyncResult.createdWireIds) && contactSyncResult.createdWireIds.length > 0) {
      createdWireIds.push(...contactSyncResult.createdWireIds);
    }
  }

  for (const component of movedComponents) {
    if (rerouteConnectedWiresInCircuit(circuit, component.id)) {
      continue;
    }

    rollbackGroupMoveInCircuit(
      circuit,
      movedComponents,
      previousPositions,
      linkedWires,
      previousWireStates,
      previousNextWireId,
      createdWireIds
    );
    return { ok: false };
  }

  return {
    ok: true,
    selectionChanged: clearInvalidSelectionsInCircuit(circuit),
  };
}

function moveComponentInCircuit(circuit, componentId, targetX, targetY) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  if (targetX === component.x && targetY === component.y) {
    return { ok: true, component };
  }

  const previousPosition = { x: component.x, y: component.y };
  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  const previousWireStates = snapshotWireStates(linkedWires);
  const previousNextWireId = circuit.nextWireId;

  component.x = targetX;
  component.y = targetY;

  const autoContactCandidate = findAutoContactCandidateInCircuit(circuit, componentId);
  if (
    !isComponentPlacementValidForComponents(circuit.components, component, component.id, 0) &&
    !autoContactCandidate
  ) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    return { ok: false };
  }

  const contactSyncResult = syncImplicitContactWiresInCircuit(
    circuit,
    componentId,
    autoContactCandidate
  );
  if (!contactSyncResult.ok || !rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.x = previousPosition.x;
    component.y = previousPosition.y;
    circuit.nextWireId = previousNextWireId;
    if (Array.isArray(contactSyncResult.createdWireIds) && contactSyncResult.createdWireIds.length > 0) {
      const createdWireIds = new Set(contactSyncResult.createdWireIds);
      circuit.wires = circuit.wires.filter((wire) => !createdWireIds.has(wire.id));
    }
    restoreWireStates(linkedWires, previousWireStates);
    return { ok: false };
  }

  const selectionChanged = clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, component, selectionChanged };
}

function rotateComponentInCircuit(circuit, componentId, step = 90) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const previousRotation = component.rotation;
  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  const previousWireStates = snapshotWireStates(linkedWires);

  component.rotation = normalizeRotation(component.rotation + step);

  if (!isComponentPlacementValidForComponents(circuit.components, component, component.id, 0)) {
    component.rotation = previousRotation;
    return { ok: false, message: "Rotacao bloqueada por colisao" };
  }

  const contactSyncResult = syncImplicitContactWiresInCircuit(circuit, componentId);
  if (!contactSyncResult.ok || !rerouteConnectedWiresInCircuit(circuit, componentId)) {
    component.rotation = previousRotation;
    restoreWireStates(linkedWires, previousWireStates);
    return { ok: false, message: "Sem rota livre para os fios" };
  }

  rememberComponentRotation(component, circuit);

  return {
    ok: true,
    component,
    selectionChanged: clearInvalidSelectionsInCircuit(circuit),
  };
}

function toggleComponentTerminalOrderInCircuit(circuit, componentId) {
  const component = getComponentByIdFromCollection(circuit.components, componentId);
  if (!component) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const swapControl = getComponentBehavior(component.type).swapControl;
  if (!swapControl) {
    return { ok: false };
  }

  const message = swapControl.toggle(component);
  return { ok: true, component, message };
}

function isComponentPlacementValidForComponents(components, candidate, ignoreId = null, padding = 0) {
  for (const component of components) {
    if (ignoreId != null && component.id === ignoreId) continue;
    if (componentsOverlap(candidate, component, padding)) {
      return false;
    }
  }
  return true;
}

function isComponentPlacementValid(candidate, ignoreId = null, padding = 0) {
  return isComponentPlacementValidForComponents(state.components, candidate, ignoreId, padding);
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

function findAutoContactCandidateForTargetsInCircuit(circuit, movingComponentId, targetComponents) {
  const movingComponent = getComponentByIdFromCollection(circuit.components, movingComponentId);
  if (!movingComponent) return null;

  const overlappingComponents = targetComponents.filter((component) =>
    componentsOverlap(movingComponent, component, 0)
  );
  if (overlappingComponents.length === 0) {
    return null;
  }

  const movingDef = COMPONENT_DEFS[movingComponent.type];
  const matches = [];
  const matchKeys = new Set();

  for (const targetComponent of overlappingComponents) {
    if (componentsBodiesOverlap(movingComponent, targetComponent, 0)) {
      return null;
    }

    const targetDef = COMPONENT_DEFS[targetComponent.type];
    let matchedTarget = false;

    for (let movingTerminalIndex = 0; movingTerminalIndex < movingDef.terminals.length; movingTerminalIndex += 1) {
      const movingTerminal = getTerminalPositionForComponents(
        circuit.components,
        movingComponentId,
        movingTerminalIndex
      );
      if (!movingTerminal) continue;

      for (let targetTerminalIndex = 0; targetTerminalIndex < targetDef.terminals.length; targetTerminalIndex += 1) {
        const targetTerminal = getTerminalPositionForComponents(
          circuit.components,
          targetComponent.id,
          targetTerminalIndex
        );
        if (!targetTerminal || !sameGridPoint(movingTerminal, targetTerminal)) {
          continue;
        }

        const fromRef = { componentId: movingComponentId, terminalIndex: movingTerminalIndex };
        const toRef = { componentId: targetComponent.id, terminalIndex: targetTerminalIndex };
        const matchKey = `${fromRef.componentId}:${fromRef.terminalIndex}|${toRef.componentId}:${toRef.terminalIndex}`;
        if (matchKeys.has(matchKey)) {
          continue;
        }

        matchKeys.add(matchKey);
        matchedTarget = true;
        matches.push({
          fromRef,
          toRef,
          existingWire: findDirectWireBetweenInCircuit(circuit, fromRef, toRef),
        });
      }
    }

    if (!matchedTarget) {
      return null;
    }
  }

  return matches.length > 0 ? { matches } : null;
}

function findAutoContactCandidateInCircuit(circuit, movingComponentId) {
  return findAutoContactCandidateForTargetsInCircuit(
    circuit,
    movingComponentId,
    circuit.components.filter((component) => component.id !== movingComponentId)
  );
}

function findDirectWireBetweenInCircuit(circuit, firstRef, secondRef) {
  return (
    circuit.wires.find((wire) => wireConnectsTerminalRefs(wire, firstRef, secondRef)) || null
  );
}

function wireConnectsTerminalRefs(wire, firstRef, secondRef) {
  return (
    (terminalRefsEqual(wire.from, firstRef) && terminalRefsEqual(wire.to, secondRef)) ||
    (terminalRefsEqual(wire.from, secondRef) && terminalRefsEqual(wire.to, firstRef))
  );
}

function syncImplicitContactWiresInCircuit(circuit, componentId, autoContactCandidate = null) {
  const activeWireIds = new Set();
  const createdWireIds = [];
  const matches = autoContactCandidate?.matches || [];

  for (const match of matches) {
    let activeWire = match.existingWire || null;
    if (!activeWire) {
      activeWire = buildImplicitContactWireInCircuit(circuit, match.fromRef, match.toRef);
      if (!activeWire) {
        return { ok: false, createdWireIds };
      }
      circuit.wires.push(activeWire);
      createdWireIds.push(activeWire.id);
    }

    activeWireIds.add(activeWire.id);
  }

  const linkedWires = getWiresForComponentFromCollection(circuit.wires, componentId);
  for (const wire of linkedWires) {
    const isActiveWire = activeWireIds.has(wire.id);
    if (!wire.implicitContact && !isActiveWire) continue;

    const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, wire);
    if (!terminalPositions) {
      return { ok: false, createdWireIds };
    }

    const coincident = sameGridPoint(terminalPositions.start, terminalPositions.end);
    if (coincident && (wire.implicitContact || isActiveWire)) {
      wire.implicitContact = true;
      wire.path = [
        clonePoint(terminalPositions.start),
        clonePoint(terminalPositions.end),
      ];
      continue;
    }

    if (wire.implicitContact) {
      wire.implicitContact = false;
    }
  }

  return { ok: true, createdWireIds };
}

function buildImplicitContactWireInCircuit(circuit, fromRef, toRef) {
  const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, {
    from: fromRef,
    to: toRef,
  });
  if (!terminalPositions) {
    return null;
  }

  return {
    id: circuit.nextWireId++,
    from: cloneTerminalRef(fromRef),
    to: cloneTerminalRef(toRef),
    path: [
      clonePoint(terminalPositions.start),
      clonePoint(terminalPositions.end),
    ],
    implicitContact: true,
  };
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

function rerouteConnectedWiresInCircuit(circuit, componentId) {
  const wires = getWiresForComponentFromCollection(circuit.wires, componentId);
  for (const wire of wires) {
    if (wire.implicitContact) continue;

    const terminalPositions = getWireTerminalPositionsForComponents(circuit.components, wire);
    if (!terminalPositions) return false;

    const route = routeWireInCircuit(
      circuit,
      terminalPositions.start,
      terminalPositions.end,
      buildRouteTerminalOptionsForComponents(circuit.components, wire.from, wire.to, {
        ignoreWireIds: new Set([wire.id]),
      })
    );
    if (!route) return false;
    wire.path = route;
  }
  return true;
}

function rerouteConnectedWires(componentId) {
  return rerouteConnectedWiresInCircuit(state, componentId);
}

function isWireVisible(wire) {
  return (
    !!wire &&
    wire.implicitContact !== true &&
    Array.isArray(wire.path) &&
    wire.path.length >= 2
  );
}

function getWiresForComponentFromCollection(wires, componentId) {
  return wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
}

function getWiresForComponent(componentId) {
  return getWiresForComponentFromCollection(state.wires, componentId);
}

function pickTerminal(worldX, worldY, threshold) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    const def = COMPONENT_DEFS[component.type];

    for (let t = 0; t < def.terminals.length; t += 1) {
      const tp = getTerminalPosition(component.id, t);
      if (!tp) continue;
      const dist = Math.hypot(tp.x - worldX, tp.y - worldY);
      if (dist <= threshold) {
        return { componentId: component.id, terminalIndex: t };
      }
    }
  }
  return null;
}

function pickComponentBody(worldX, worldY) {
  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    if (component.type === "junction") continue;
    if (pointInsideComponentBody(component, worldX, worldY)) {
      return component;
    }
  }
  return null;
}

function pickWire(worldX, worldY) {
  const threshold = clamp(9 / (GRID_SIZE * state.camera.zoom), 0.12, 0.46);

  for (let i = state.wires.length - 1; i >= 0; i -= 1) {
    const wire = state.wires[i];
    if (!isWireVisible(wire)) continue;
    const path = wire.path;

    for (let j = 0; j < path.length - 1; j += 1) {
      const a = path[j];
      const b = path[j + 1];
      if (distanceToSegment(worldX, worldY, a.x, a.y, b.x, b.y) <= threshold) {
        return {
          wire,
          segmentIndex: j,
          point: snapPointToSegment(worldX, worldY, a, b),
        };
      }
    }
  }

  return null;
}

function pickTerminalLabel(screenX, screenY, renderTarget = mainRenderTarget) {
  const hitPadding = 6;

  for (let i = state.components.length - 1; i >= 0; i -= 1) {
    const component = state.components[i];
    const def = COMPONENT_DEFS[component.type];

    for (let terminalIndex = def.terminals.length - 1; terminalIndex >= 0; terminalIndex -= 1) {
      const label = getTerminalLabel(component.id, terminalIndex);
      if (!label) continue;

      const metrics = getTerminalLabelRenderMetrics(renderTarget, {
        componentId: component.id,
        terminalIndex,
        label,
      });
      if (!metrics) continue;

      if (
        screenX >= metrics.boxX - hitPadding &&
        screenX <= metrics.boxX + metrics.boxW + hitPadding &&
        screenY >= metrics.boxY - hitPadding &&
        screenY <= metrics.boxY + metrics.boxH + hitPadding
      ) {
        return { componentId: component.id, terminalIndex };
      }
    }
  }

  return null;
}

function pickNodeMarker(screenX, screenY, renderTarget = mainRenderTarget) {
  if (!state.simulationActive || !state.simulationResult?.ok) return null;

  const hitPadding = 6;
  for (let i = state.simulationResult.data.nodeMarkers.length - 1; i >= 0; i -= 1) {
    const marker = state.simulationResult.data.nodeMarkers[i];
    if (state.hiddenNodeMarkerRoots.has(marker.root)) continue;

    const metrics = getNodeMarkerRenderMetrics(renderTarget, marker);
    if (
      screenX >= metrics.boxX - hitPadding &&
      screenX <= metrics.boxX + metrics.boxW + hitPadding &&
      screenY >= metrics.boxY - hitPadding &&
      screenY <= metrics.boxY + metrics.boxH + hitPadding
    ) {
      return marker;
    }
  }

  return null;
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

function cloneTerminalRef(ref) {
  return {
    componentId: ref.componentId,
    terminalIndex: ref.terminalIndex,
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

function worldToLocal(component, worldX, worldY) {
  const dx = worldX - component.x;
  const dy = worldY - component.y;
  const rad = degToRad(-component.rotation);
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function isComponentGroupSelected(componentId, circuit = state) {
  return circuit.selectedComponentIds instanceof Set && circuit.selectedComponentIds.has(componentId);
}

function toggleComponentInGroupSelection(componentId) {
  if (!state.groupSelectMode) {
    return false;
  }

  clearNonComponentSelection();
  state.pendingTerminal = null;

  if (state.selectedComponentIds.has(componentId)) {
    state.selectedComponentIds.delete(componentId);
  } else {
    state.selectedComponentIds.add(componentId);
  }

  updateSelectionUi();
  return state.selectedComponentIds.has(componentId);
}

function setGroupSelectionMode(active) {
  if (!active) {
    clearSelection();
    return;
  }

  clearSelectionState();
  state.groupSelectMode = true;
  updateSelectionUi();
}

function toggleGroupSelectionMode() {
  setGroupSelectionMode(!state.groupSelectMode);
}

function selectComponent(componentId) {
  clearSelectionState();
  state.selectedComponentId = componentId;
  updateSelectionUi();
}

function selectWire(wireId) {
  clearSelectionState();
  state.selectedWireId = wireId;
  updateSelectionUi();
}

function selectTerminalLabel(terminalRef) {
  clearSelectionState();
  state.selectedTerminalLabelKey = terminalKey(terminalRef.componentId, terminalRef.terminalIndex);
  updateSelectionUi();
}

function selectNodeMarker(root, terminalRef = null) {
  clearSelectionState();
  state.selectedNodeMarkerRoot = root;
  state.selectedNodeMarkerTerminal = terminalRef ? cloneTerminalRef(terminalRef) : null;
  updateSelectionUi();
}

function clearSelection() {
  clearSelectionState();
  updateSelectionUi();
}

function removeComponent(componentId) {
  const result = removeComponentFromCircuit(state, componentId);
  if (!result.ok) return;

  updateSelectionUi();
  onCircuitChanged();
  showStatus("Componente removido");
}

function removeWire(wireId) {
  const result = removeWireFromCircuit(state, wireId);
  if (!result.ok) return;

  updateSelectionUi();
  onCircuitChanged();
  showStatus("Conector removido");
}

function removeTerminalLabel(labelKey) {
  if (!state.terminalLabels.has(labelKey)) return;

  state.terminalLabels.delete(labelKey);
  if (state.selectedTerminalLabelKey === labelKey) {
    state.selectedTerminalLabelKey = null;
  }
  closeTerminalLabelEditor();
  updateSelectionUi();
  onCircuitChanged();
  showStatus("Label do pad removido");
}

function collectWireCleanupTargets(wires) {
  return collectWireCleanupTargetsForCircuit(state, wires);
}

function collectWireCleanupTargetsForCircuit(circuit, wires) {
  const targets = new Set();

  for (const wire of wires) {
    if (getComponentByIdFromCollection(circuit.components, wire.from.componentId)?.type === "junction") {
      targets.add(wire.from.componentId);
    }

    if (getComponentByIdFromCollection(circuit.components, wire.to.componentId)?.type === "junction") {
      targets.add(wire.to.componentId);
    }
  }

  return [...targets];
}

function cleanupAutoJunctions(junctionIds) {
  return cleanupAutoJunctionsInCircuit(state, junctionIds);
}

function cleanupAutoJunctionsInCircuit(circuit, junctionIds) {
  const queue = [...junctionIds];
  const seen = new Set();

  while (queue.length > 0) {
    const junctionId = queue.shift();
    if (seen.has(junctionId)) continue;
    seen.add(junctionId);

    const junction = getComponentByIdFromCollection(circuit.components, junctionId);
    if (!junction || junction.type !== "junction") continue;

    const connectedWires = getWiresForComponentFromCollection(circuit.wires, junctionId);
    if (connectedWires.length === 0) {
      removeJunctionComponentFromCircuit(circuit, junctionId);
      continue;
    }

    if (connectedWires.length !== 2) continue;

    const merged = tryMergeSplitJunctionInCircuit(circuit, junctionId, connectedWires);
    if (merged) {
      if (getComponentByIdFromCollection(circuit.components, merged.from.componentId)?.type === "junction") {
        queue.push(merged.from.componentId);
      }
      if (getComponentByIdFromCollection(circuit.components, merged.to.componentId)?.type === "junction") {
        queue.push(merged.to.componentId);
      }
    }
  }

  clearInvalidSelectionsInCircuit(circuit);
}

function removeJunctionComponent(junctionId) {
  return removeJunctionComponentFromCircuit(state, junctionId);
}

function removeJunctionComponentFromCircuit(circuit, junctionId) {
  circuit.components = circuit.components.filter((component) => component.id !== junctionId);

  if (circuit.pendingTerminal?.componentId === junctionId) {
    circuit.pendingTerminal = null;
  }

  if (circuit.selectedComponentId === junctionId) {
    circuit.selectedComponentId = null;
  }

  clearInvalidSelectionsInCircuit(circuit);
}

function tryMergeSplitJunction(junctionId, connectedWires) {
  return tryMergeSplitJunctionInCircuit(state, junctionId, connectedWires);
}

function tryMergeSplitJunctionInCircuit(circuit, junctionId, connectedWires) {
  const [first, second] = connectedWires;
  if (!areMergeableSplitPair(first, second)) {
    return null;
  }

  const meta = first;
  const start = getTerminalPositionForComponents(
    circuit.components,
    meta.splitOriginalFrom.componentId,
    meta.splitOriginalFrom.terminalIndex
  );
  const end = getTerminalPositionForComponents(
    circuit.components,
    meta.splitOriginalTo.componentId,
    meta.splitOriginalTo.terminalIndex
  );
  if (!start || !end) return null;

  let path = null;
  if (
    Array.isArray(meta.splitOriginalPath) &&
    meta.splitOriginalPath.length >= 2 &&
    sameGridPoint(meta.splitOriginalPath[0], start) &&
    sameGridPoint(meta.splitOriginalPath[meta.splitOriginalPath.length - 1], end)
  ) {
    path = clonePath(meta.splitOriginalPath);
  } else {
    path = routeWireInCircuit(
      circuit,
      start,
      end,
      buildRouteTerminalOptionsForComponents(
        circuit.components,
        meta.splitOriginalFrom,
        meta.splitOriginalTo
      )
    );
  }

  if (!path) return null;

  circuit.wires = circuit.wires.filter(
    (wire) => wire.id !== first.id && wire.id !== second.id
  );
  circuit.wires.push({
    id: circuit.nextWireId++,
    from: cloneTerminalRef(meta.splitOriginalFrom),
    to: cloneTerminalRef(meta.splitOriginalTo),
    path,
  });
  removeJunctionComponentFromCircuit(circuit, junctionId);
  return {
    from: cloneTerminalRef(meta.splitOriginalFrom),
    to: cloneTerminalRef(meta.splitOriginalTo),
  };
}

function removeComponentFromCircuit(circuit, componentId) {
  const index = circuit.components.findIndex((component) => component.id === componentId);
  if (index < 0) {
    return { ok: false, message: "Componente nao encontrado" };
  }

  const removedWires = circuit.wires.filter(
    (wire) => wire.from.componentId === componentId || wire.to.componentId === componentId
  );
  const cleanupTargets = collectWireCleanupTargetsForCircuit(circuit, removedWires);

  circuit.components.splice(index, 1);
  circuit.wires = circuit.wires.filter(
    (wire) => wire.from.componentId !== componentId && wire.to.componentId !== componentId
  );

  if (circuit.pendingTerminal?.componentId === componentId) {
    circuit.pendingTerminal = null;
  }

  if (circuit.selectedComponentId === componentId) {
    circuit.selectedComponentId = null;
  }

  if (circuit.terminalLabels instanceof Map) {
    for (const labelKey of [...circuit.terminalLabels.keys()]) {
      const ref = parseTerminalKey(labelKey);
      if (ref?.componentId !== componentId) continue;
      circuit.terminalLabels.delete(labelKey);
      if (circuit.selectedTerminalLabelKey === labelKey) {
        circuit.selectedTerminalLabelKey = null;
      }
    }
  }

  cleanupAutoJunctionsInCircuit(circuit, cleanupTargets);
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, removedWires };
}

function removeWireFromCircuit(circuit, wireId) {
  const wire = getWireByIdFromCollection(circuit.wires, wireId);
  if (!wire) {
    return { ok: false, message: "Conector nao encontrado" };
  }

  const cleanupTargets = collectWireCleanupTargetsForCircuit(circuit, [wire]);
  circuit.wires = circuit.wires.filter((candidate) => candidate.id !== wireId);

  if (circuit.selectedWireId === wireId) {
    circuit.selectedWireId = null;
  }

  cleanupAutoJunctionsInCircuit(circuit, cleanupTargets);
  clearInvalidSelectionsInCircuit(circuit);
  return { ok: true, wire };
}

function clearInvalidSelectionsInCircuit(circuit) {
  let changed = false;

  if (
    circuit.selectedComponentId != null &&
    !getComponentByIdFromCollection(circuit.components, circuit.selectedComponentId)
  ) {
    circuit.selectedComponentId = null;
    changed = true;
  }

  if (circuit.selectedComponentIds instanceof Set) {
    for (const componentId of [...circuit.selectedComponentIds]) {
      if (getComponentByIdFromCollection(circuit.components, componentId)) continue;
      circuit.selectedComponentIds.delete(componentId);
      changed = true;
    }
  }

  const selectedWire =
    circuit.selectedWireId != null
      ? getWireByIdFromCollection(circuit.wires, circuit.selectedWireId)
      : null;
  if (circuit.selectedWireId != null && (!selectedWire || !isWireVisible(selectedWire))) {
    circuit.selectedWireId = null;
    changed = true;
  }

  if (circuit.selectedNodeMarkerRoot != null) {
    const nodeMarkers = circuit.simulationResult?.ok ? circuit.simulationResult.data.nodeMarkers : null;
    if (!nodeMarkers?.some((marker) => marker.root === circuit.selectedNodeMarkerRoot)) {
      circuit.selectedNodeMarkerRoot = null;
      circuit.selectedNodeMarkerTerminal = null;
      changed = true;
    }
  }

  if (circuit.selectedNodeMarkerRoot == null && circuit.selectedNodeMarkerTerminal != null) {
    circuit.selectedNodeMarkerTerminal = null;
    changed = true;
  }

  if (circuit.selectedNodeMarkerTerminal != null) {
    const selectedTerminalComponent = getComponentByIdFromCollection(
      circuit.components,
      circuit.selectedNodeMarkerTerminal.componentId
    );
    const selectedTerminalDef = selectedTerminalComponent
      ? COMPONENT_DEFS[selectedTerminalComponent.type]
      : null;
    if (
      !selectedTerminalComponent ||
      !selectedTerminalDef ||
      !selectedTerminalDef.terminals[circuit.selectedNodeMarkerTerminal.terminalIndex]
    ) {
      circuit.selectedNodeMarkerTerminal = null;
      changed = true;
    }
  }

  if (circuit.selectedTerminalLabelKey != null) {
    const selectedLabelRef = parseTerminalKey(circuit.selectedTerminalLabelKey);
    const selectedLabelComponent = selectedLabelRef
      ? getComponentByIdFromCollection(circuit.components, selectedLabelRef.componentId)
      : null;
    const selectedLabelDef = selectedLabelComponent ? COMPONENT_DEFS[selectedLabelComponent.type] : null;
    const selectedLabelStillExists =
      selectedLabelRef &&
      selectedLabelComponent &&
      selectedLabelDef?.terminals[selectedLabelRef.terminalIndex] &&
      circuit.terminalLabels instanceof Map &&
      circuit.terminalLabels.has(circuit.selectedTerminalLabelKey);
    if (!selectedLabelStillExists) {
      circuit.selectedTerminalLabelKey = null;
      changed = true;
    }
  }

  if (circuit.hiddenNodeMarkerRoots instanceof Set && circuit.simulationResult?.ok) {
    const validRoots = new Set(circuit.simulationResult.data.nodeMarkers.map((marker) => marker.root));
    for (const root of [...circuit.hiddenNodeMarkerRoots]) {
      if (validRoots.has(root)) continue;
      circuit.hiddenNodeMarkerRoots.delete(root);
      changed = true;
    }

    if (circuit.defaultHiddenNodeMarkerRoots instanceof Set) {
      for (const root of [...circuit.defaultHiddenNodeMarkerRoots]) {
        if (validRoots.has(root)) continue;
        circuit.defaultHiddenNodeMarkerRoots.delete(root);
      }
    }
  }

  if (!circuit.pendingTerminal) {
    return changed;
  }

  const pendingComponent = getComponentByIdFromCollection(
    circuit.components,
    circuit.pendingTerminal.componentId
  );
  const def = pendingComponent ? COMPONENT_DEFS[pendingComponent.type] : null;
  if (!pendingComponent || !def || !def.terminals[circuit.pendingTerminal.terminalIndex]) {
    circuit.pendingTerminal = null;
    changed = true;
  }

  return changed;
}

function areMergeableSplitPair(first, second) {
  if (!first?.splitGroupId || !second?.splitGroupId) return false;
  if (first.splitGroupId !== second.splitGroupId) return false;

  const roles = new Set([first.splitGroupRole, second.splitGroupRole]);
  if (!roles.has("from") || !roles.has("to")) return false;

  return (
    terminalRefsEqual(first.splitOriginalFrom, second.splitOriginalFrom) &&
    terminalRefsEqual(first.splitOriginalTo, second.splitOriginalTo)
  );
}

function terminalRefsEqual(a, b) {
  return (
    !!a &&
    !!b &&
    a.componentId === b.componentId &&
    a.terminalIndex === b.terminalIndex
  );
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

function getSelectedNodeMarker() {
  if (state.selectedNodeMarkerRoot == null || !state.simulationResult?.ok) {
    return null;
  }

  return (
    state.simulationResult.data.nodeMarkers.find((marker) => marker.root === state.selectedNodeMarkerRoot) || null
  );
}

function getNodeMarkerRootForTerminal(componentId, terminalIndex) {
  if (!state.simulationActive || !state.simulationResult?.ok) {
    return null;
  }

  const root = state.simulationResult.data.rootByTerminal?.get(terminalKey(componentId, terminalIndex)) ?? null;
  if (root == null) {
    return null;
  }

  return state.simulationResult.data.nodeMarkers.some((marker) => marker.root === root) ? root : null;
}

function syncSelectedNodeMarkerWithTerminal(componentId, terminalIndex) {
  state.selectedWireId = null;
  state.selectedTerminalLabelKey = null;

  const root = getNodeMarkerRootForTerminal(componentId, terminalIndex);
  if (root == null) {
    clearNodeMarkerSelection();
    return null;
  }

  state.selectedNodeMarkerRoot = root;
  state.selectedNodeMarkerTerminal = { componentId, terminalIndex };
  return root;
}

function applyDefaultGroundNodeMarkerVisibility(simulationData = state.simulationResult?.data) {
  if (!simulationData) {
    return;
  }

  for (const component of state.components) {
    if (component.type !== "ground" && !isGroundReferencedVoltageSourceComponent(component)) {
      continue;
    }

    const root = simulationData.rootByTerminal?.get(terminalKey(component.id, 0));
    if (root != null) {
      if (state.defaultHiddenNodeMarkerRoots.has(root)) {
        continue;
      }

      state.defaultHiddenNodeMarkerRoots.add(root);
      state.hiddenNodeMarkerRoots.add(root);
    }
  }
}

function deriveSelectionUiState() {
  const component = getComponentById(state.selectedComponentId);
  const wire = getWireById(state.selectedWireId);
  const terminalPending = state.pendingTerminal != null;
  const terminalLabelTarget = getTerminalLabelEditorTarget();
  const terminalLabelSelected = state.selectedTerminalLabelKey != null;
  const nodeMarker = getSelectedNodeMarker();
  const groupSelectionActive = state.groupSelectMode === true;
  const hasGroupedComponents =
    state.selectedComponentIds instanceof Set && state.selectedComponentIds.size > 0;
  const canExport = state.components.length > 0;

  const uiState = {
    showThemeToggle: false,
    showEditTerminalLabel: terminalLabelTarget != null,
    showGroupSelect: false,
    groupSelectActive: false,
    showExport: false,
    showCurrentArrow: false,
    showRotate: false,
    showDelete: false,
    showSwap: false,
    showValueWheel: false,
    resetDeleteHold: false,
    visibilityToggleState: null,
    swapControl: null,
    wheelTitle: null,
    syncWheel: false,
  };

  if (groupSelectionActive) {
    uiState.resetDeleteHold = true;
    uiState.showEditTerminalLabel = false;
    uiState.showGroupSelect = canExport;
    uiState.groupSelectActive = true;
    uiState.showExport = canExport && !hasGroupedComponents;
    return uiState;
  }

  if (!component && !wire && !nodeMarker && !terminalLabelSelected && !terminalPending) {
    uiState.resetDeleteHold = true;
    uiState.showThemeToggle = true;
    uiState.showEditTerminalLabel = false;
    uiState.showGroupSelect = canExport;
    uiState.showExport = canExport;
    return uiState;
  }

  if (terminalPending) {
    if (nodeMarker && canToggleNodeMarkerVoltage(nodeMarker)) {
      uiState.showCurrentArrow = true;
      uiState.visibilityToggleState = {
        mode: "node",
        hidden: state.hiddenNodeMarkerRoots.has(nodeMarker.root),
      };
    }
    return uiState;
  }

  if (terminalLabelSelected) {
    uiState.showDelete = true;
    return uiState;
  }

  if (nodeMarker) {
    if (canToggleNodeMarkerVoltage(nodeMarker)) {
      uiState.showCurrentArrow = true;
      uiState.visibilityToggleState = {
        mode: "node",
        hidden: state.hiddenNodeMarkerRoots.has(nodeMarker.root),
      };
    }
    return uiState;
  }

  uiState.showDelete = true;

  if (!component) {
    return uiState;
  }

  const componentVisibilityMode = getComponentVisibilityToggleMode(component);
  if (componentVisibilityMode === "value") {
    uiState.showCurrentArrow = true;
    uiState.visibilityToggleState = {
      mode: "value",
      hidden: component.valueLabelHidden === true,
    };
  } else if (componentVisibilityMode === "component") {
    uiState.showCurrentArrow = true;
    uiState.visibilityToggleState = {
      mode: "component",
      hidden: component.currentArrowHidden === true,
    };
  }

  uiState.showRotate = true;
  uiState.swapControl = getComponentBehavior(component.type).swapControl;
  uiState.showSwap = !!uiState.swapControl;

  const def = COMPONENT_DEFS[component.type];
  if (!def.editable) {
    return uiState;
  }

  uiState.showValueWheel = true;
  uiState.wheelTitle = def.label;
  uiState.syncWheel = true;
  return uiState;
}

function applySelectionUiState(uiState) {
  if (uiState.resetDeleteHold) {
    clearDeleteButtonHold();
    deleteButtonHoldState.suppressNextClick = false;
  }

  appEls.themeToggleBtn.classList.toggle("hidden", !uiState.showThemeToggle);
  appEls.editTerminalLabelBtn.classList.toggle("hidden", !uiState.showEditTerminalLabel);
  appEls.groupSelectBtn.classList.toggle("hidden", !uiState.showGroupSelect);
  appEls.groupSelectBtn.classList.toggle("active", !!uiState.groupSelectActive);
  appEls.exportBtn.classList.toggle("hidden", !uiState.showExport);
  appEls.currentArrowBtn.classList.toggle("hidden", !uiState.showCurrentArrow);
  appEls.rotateBtn.classList.toggle("hidden", !uiState.showRotate);
  appEls.deleteBtn.classList.toggle("hidden", !uiState.showDelete);
  appEls.swapOpAmpBtn.classList.toggle("hidden", !uiState.showSwap);
  appEls.valueWheel.classList.toggle("hidden", !uiState.showValueWheel);
  appEls.groupSelectBtn.title = uiState.groupSelectActive ? "Sair da seleção em grupo" : "Selecionar varios";
  appEls.groupSelectBtn.setAttribute(
    "aria-label",
    uiState.groupSelectActive ? "Sair da seleção em grupo" : "Selecionar varios"
  );
  appEls.groupSelectBtn.setAttribute("aria-pressed", uiState.groupSelectActive ? "true" : "false");

  if (uiState.visibilityToggleState) {
    setVisibilityToggleButtonState(uiState.visibilityToggleState);
  }

  if (uiState.swapControl) {
    appEls.swapOpAmpBtn.title = uiState.swapControl.title;
    appEls.swapOpAmpBtn.setAttribute("aria-label", uiState.swapControl.ariaLabel);
  }

  if (uiState.showValueWheel) {
    appEls.wheelTitle.textContent = uiState.wheelTitle;
  }

  if (uiState.syncWheel) {
    syncWheelWithSelectedComponent();
  }
}

function updateSelectionUi() {
  requestRender(true);
  clearInvalidSelectionsInCircuit(state);
  const uiState = deriveSelectionUiState();
  applySelectionUiState(uiState);
}

function syncWheelWithSelectedComponent() {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;
  const normalized = normalizedFromValue(component);
  const angleDeg = normalized * 360 - 90;
  appEls.wheelPointer.style.transform = `translate(0, -50%) rotate(${angleDeg}deg)`;
  appEls.wheelValue.textContent = formatComponentValue(component);
}

function updateValueFromWheelPointer(clientX, clientY) {
  const component = getComponentById(state.selectedComponentId);
  if (!component) return;

  const rawNormalized = getWheelNormalizedAtClientPoint(clientX, clientY);
  let normalized = rawNormalized;

  if (wheelState.dragging) {
    if (wheelState.lastRawNormalized == null || wheelState.activeNormalized == null) {
      wheelState.lastRawNormalized = rawNormalized;
      wheelState.activeNormalized = rawNormalized;
    } else {
      let delta = rawNormalized - wheelState.lastRawNormalized;
      if (delta > 0.5) {
        delta -= 1;
      } else if (delta < -0.5) {
        delta += 1;
      }

      wheelState.activeNormalized = clamp(wheelState.activeNormalized + delta, 0, 1);
      wheelState.lastRawNormalized = rawNormalized;
    }

    normalized = wheelState.activeNormalized;
  }

  const value = valueFromNormalized(component.type, normalized);
  component.value = value;
  syncWheelWithSelectedComponent();
  onCircuitChanged();
}

function getWheelNormalizedAtClientPoint(clientX, clientY) {
  const rect = appEls.valueWheel.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angle = Math.atan2(clientY - cy, clientX - cx);
  let normalized = (angle + Math.PI / 2) / (Math.PI * 2);
  normalized = ((normalized % 1) + 1) % 1;
  return normalized;
}

function valueFromNormalized(type, normalized) {
  return getComponentBehavior(type).valueFromNormalized(normalized);
}

function normalizedFromValue(component) {
  return getComponentBehavior(component.type).normalizedFromValue(component);
}

function quantizeResistor(value) {
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
  const base = def.terminals[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  return {
    x: component.x + offset.x,
    y: component.y + offset.y,
  };
}

function getTerminalPosition(componentId, terminalIndex) {
  return getTerminalPositionForComponents(state.components, componentId, terminalIndex);
}

function getTerminalLabelDirectionForComponents(components, componentId, terminalIndex) {
  const component = getComponentByIdFromCollection(components, componentId);
  if (!component) return null;

  const def = COMPONENT_DEFS[component.type];
  const base = def?.terminals[terminalIndex];
  if (!base) return null;

  const offset = rotateOffset(base[0], base[1], component.rotation);
  if (offset.x === 0 && offset.y === 0) return null;

  if (Math.abs(offset.x) >= Math.abs(offset.y)) {
    return offset.x >= 0 ? "right" : "left";
  }

  return offset.y >= 0 ? "down" : "up";
}

function getTerminalLabelDirection(componentId, terminalIndex) {
  return getTerminalLabelDirectionForComponents(state.components, componentId, terminalIndex);
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

function buildRouteTerminalOptions(fromRef, toRef = null, extraOptions = {}) {
  return buildRouteTerminalOptionsForComponents(state.components, fromRef, toRef, extraOptions);
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

function isTerminalConnected(componentId, terminalIndex) {
  return state.wires.some(
    (wire) =>
      (wire.from.componentId === componentId && wire.from.terminalIndex === terminalIndex) ||
      (wire.to.componentId === componentId && wire.to.terminalIndex === terminalIndex)
  );
}

function getComponentById(id) {
  return getComponentByIdFromCollection(state.components, id);
}

function getWireById(id) {
  return getWireByIdFromCollection(state.wires, id);
}

function getTerminalLabel(componentId, terminalIndex) {
  return state.terminalLabels.get(terminalKey(componentId, terminalIndex)) || "";
}

function getTerminalLabelEditorTarget() {
  if (state.pendingTerminal) {
    return cloneTerminalRef(state.pendingTerminal);
  }

  if (state.selectedTerminalLabelKey != null) {
    return parseTerminalKey(state.selectedTerminalLabelKey);
  }

  if (state.selectedNodeMarkerTerminal != null) {
    return cloneTerminalRef(state.selectedNodeMarkerTerminal);
  }

  return null;
}

function setTerminalLabel(componentId, terminalIndex, label) {
  const labelKey = terminalKey(componentId, terminalIndex);
  const trimmed = String(label || "").trim();
  if (!trimmed) {
    state.terminalLabels.delete(labelKey);
    if (state.selectedTerminalLabelKey === labelKey) {
      state.selectedTerminalLabelKey = null;
    }
    return false;
  }

  state.terminalLabels.set(labelKey, trimmed);
  state.selectedTerminalLabelKey = labelKey;
  return true;
}

function openTerminalLabelEditor(terminalRef) {
  terminalLabelEditorState.terminalRef = cloneTerminalRef(terminalRef);
  appEls.terminalLabelInput.value = getTerminalLabel(terminalRef.componentId, terminalRef.terminalIndex);
  appEls.terminalLabelModal.classList.remove("hidden");
  appEls.terminalLabelModal.setAttribute("aria-hidden", "false");
  setTimeout(() => {
    appEls.terminalLabelInput.focus();
    appEls.terminalLabelInput.select();
  }, 0);
}

function closeTerminalLabelEditor() {
  terminalLabelEditorState.terminalRef = null;
  appEls.terminalLabelModal.classList.add("hidden");
  appEls.terminalLabelModal.setAttribute("aria-hidden", "true");
}

function saveTerminalLabelFromEditor() {
  const terminalRef = terminalLabelEditorState.terminalRef;
  if (!terminalRef) return;

  const hadLabel = !!getTerminalLabel(terminalRef.componentId, terminalRef.terminalIndex);
  const hasLabel = setTerminalLabel(
    terminalRef.componentId,
    terminalRef.terminalIndex,
    appEls.terminalLabelInput.value
  );
  closeTerminalLabelEditor();
  updateSelectionUi();
  onCircuitChanged();

  if (hasLabel) {
    showStatus("Label do pad salvo");
    return;
  }

  showStatus(hadLabel ? "Label do pad removido" : "Label do pad vazio", !hadLabel);
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

function getValueLabelAnchor(component) {
  return getComponentBehavior(component.type).getValueLabelAnchor(component);
}

function onCircuitChanged() {
  const shouldRefreshSelectionUi = state.selectedNodeMarkerRoot != null;
  if (state.simulationActive) {
    const result = runSimulation();
    state.simulationResult = buildStoredSimulationResult(result);
    if (!result.ok) {
      clearSimulationState();
      setSimulationButtonState(false);
      updateSelectionUi();
      showStatus(result.message || "Erro na simulação", true);
    } else {
      applyDefaultGroundNodeMarkerVisibility();
    }
  }

  syncWheelWithSelectedComponent();
  if (shouldRefreshSelectionUi) {
    updateSelectionUi();
    return;
  }
  requestRender(true);
}

function showStatus(text, isError = false) {
  appEls.status.textContent = text;
  appEls.status.style.background = isError ? themePalette.statusErrorBg : themePalette.statusBg;
  appEls.status.style.color = isError ? themePalette.statusErrorInk : themePalette.statusInk;
  appEls.status.classList.add("show");

  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    appEls.status.classList.remove("show");
  }, 1700);
}

function worldToScreen(worldX, worldY) {
  return {
    x: worldX * GRID_SIZE * state.camera.zoom + state.camera.offsetX,
    y: worldY * GRID_SIZE * state.camera.zoom + state.camera.offsetY,
  };
}

function getVisibleWorldBounds() {
  const w = appEls.canvas.clientWidth;
  const h = appEls.canvas.clientHeight;
  const topLeft = screenToWorld(0, 0);
  const bottomRight = screenToWorld(w, h);

  return {
    minX: Math.min(topLeft.x, bottomRight.x),
    maxX: Math.max(topLeft.x, bottomRight.x),
    minY: Math.min(topLeft.y, bottomRight.y),
    maxY: Math.max(topLeft.y, bottomRight.y),
  };
}

function clientToCanvas(clientX, clientY) {
  const rect = appEls.canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function clientToWorld(
  clientX,
  clientY,
  zoom = state.camera.zoom,
  offsetX = state.camera.offsetX,
  offsetY = state.camera.offsetY
) {
  const point = clientToCanvas(clientX, clientY);
  return screenToWorld(point.x, point.y, zoom, offsetX, offsetY);
}

function screenToWorld(screenX, screenY, zoom = state.camera.zoom, offsetX = state.camera.offsetX, offsetY = state.camera.offsetY) {
  return {
    x: (screenX - offsetX) / (GRID_SIZE * zoom),
    y: (screenY - offsetY) / (GRID_SIZE * zoom),
  };
}

function worldLengthToScreen(lengthInGrid) {
  return lengthInGrid * GRID_SIZE * state.camera.zoom;
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
