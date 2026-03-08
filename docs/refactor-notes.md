# Refactor Notes

This note is a quick map for safe refactors in this browser-only app.

## Load Order

`index.html` loads scripts in a strict order and they share globals.

1. `app-core.js`
2. `app-support.js`
3. `app-render.js`
4. `app-runtime.js`
5. `app-controls.js`
6. `app-interaction.js`
7. `app.js`
8. `app-routing.js`
9. `app-simulation.js`
10. `app-export.js`
11. `app-bootstrap.js`

If a symbol moves across files, re-check that every consumer still loads after its definition.

## Runtime Invariants

- `state` is the single mutable runtime store used by editor, renderer, routing, simulation, and export.
- `appEls` is resolved once from static DOM ids in `index.html`; changing ids requires matching JS updates.
- `app-bootstrap.js` should stay thin and only orchestrate startup.
- `app-routing.js`, `app-simulation.js`, and `app-export.js` still depend on globals defined by earlier scripts.
- `service-worker.js` must be updated when browser-loaded assets are added, renamed, or removed.
- Behavior must remain browser-first and dependency-free; do not introduce a build step unless that is an explicit project change.

## File Ownership

- `app-core.js`: component metadata and domain rules.
- `app-support.js`: pure helpers, formatting, math, SVG, and shared support code.
- `app-render.js`: drawing, theme palette, sprites, render scheduling, and service worker registration.
- `app-runtime.js`: `state`, DOM references, canvas sizing, and startup state holders.
- `app-controls.js`: button flows, keyboard flows, clear/delete/export controls, and UI actions.
- `app-interaction.js`: pointer/touch/wheel gestures.
- `app.js`: selection, circuit mutation, geometry helpers tied to editor state, and integration glue.
- `app-routing.js`: orthogonal pathfinding.
- `app-simulation.js`: MNA solver and nonlinear device handling.
- `app-export.js`: PNG export/share.

## Safe Refactor Checklist

- Run `node --check` on every browser script after moving code.
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
