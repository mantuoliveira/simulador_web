# Refactor Notes

This note is a quick map for safe refactors in this browser-only app.

## Load Order

`index.html` loads a single browser entrypoint: `app-bootstrap.js`.

The runtime graph is now ESM-driven:

1. `app-bootstrap.js`
2. `bootstrap/bootstrap.js`
3. `core/constants.js`
4. `core/behaviors.js`
5. `runtime/state.js`
6. `runtime/ui.js`
7. `runtime/viewport.js`
8. `core/model.js`
9. `core/support.js`
10. `render/render.js`
11. `editor/ui.js`
12. `editor/selectors.js`
13. `editor/circuit.js`
14. `editor/controls.js`
15. `editor/interactions.js`
16. `editor/routing.js`
17. `simulation/solver.js`
18. `export/png.js`

If a symbol moves across files, re-check the import graph and the service-worker asset list.

## Runtime Invariants

- `state` is the single mutable runtime store used by editor, renderer, routing, simulation, and export.
- `appEls` is resolved once from static DOM ids in `index.html`; changing ids requires matching JS updates.
- `app-bootstrap.js` should stay thin and only delegate to `bootstrap/bootstrap.js`.
- `editor/interactions.js` may mutate `state.pointer` and `state.camera` directly; other user-visible circuit mutations should stay in `editor/circuit.js` or `editor/controls.js`.
- `runtime/state.js`, `core/model.js`, `editor/selectors.js`, and `runtime/viewport.js` should stay dependency-light so `render`, `solver`, and `routing` can consume them without cycles.
- `service-worker.js` must be updated when browser-loaded assets are added, renamed, or removed.
- Behavior must remain browser-first and dependency-free; do not introduce a build step unless that is an explicit project change.

## File Ownership

- `core/constants.js`: component metadata and shared constants.
- `core/behaviors.js`: component-specific behavior, value logic, and SVG builders.
- `core/model.js`: pure circuit geometry, ids, and component layout helpers.
- `core/support.js`: pure helpers, formatting, math, SVG, and shared support code.
- `runtime/state.js`: `state`, DOM references, render targets, and shared runtime holders.
- `runtime/ui.js`: theme palette, sprite rebuilds, component strip, and canvas sizing.
- `runtime/viewport.js`: screen/world coordinate transforms.
- `render/render.js`: drawing, render scheduling, and service worker registration.
- `editor/ui.js`: status pill and button state helpers.
- `editor/selectors.js`: read-only selectors over `state`.
- `editor/circuit.js`: selection, circuit mutation, and editor orchestration.
- `editor/controls.js`: button flows, keyboard flows, clear/delete/export controls, and UI actions.
- `editor/interactions.js`: pointer/touch/wheel gestures.
- `editor/routing.js`: orthogonal pathfinding.
- `simulation/solver.js`: MNA solver and nonlinear device handling.
- `export/png.js`: PNG export/share.

## Safe Refactor Checklist

- Start a static server and load `index.html` in a browser after moving modules.
- Reload the page and confirm the component strip renders.
- Confirm the canvas initializes and resizes.
- Test one component insertion, one wire connection, one move, and one rotation.
- Test `Play/Pause` once after any state or simulation-related refactor.
- Test export once after render or theme changes.
- Reload once to verify offline asset caching still works after asset list changes.

## High-Risk Areas

- Functions that read and write `state` inside the same flow and also trigger `requestRender`, `updateSelectionUi`, or `onCircuitChanged`.
- Any code path that touches both component mutation and wire rerouting.
- Theme changes, because sprites are rebuilt and UI labels are updated together.
- Simulation toggling, because it also resets selection and visibility state.
