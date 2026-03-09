# Repository Guidelines

## Project Structure & Module Organization
This repository is a static browser app served directly from the project root. `index.html` defines the shell and loads a single ESM entrypoint, `app-bootstrap.js`. `styles.css` contains layout and visual styles. Runtime code is organized by domain:

- `app-bootstrap.js`: thin browser entrypoint; keep it limited to boot delegation.
- `bootstrap/bootstrap.js`: startup orchestration.
- `core/constants.js`: shared constants, component metadata, and solver limits.
- `core/behaviors.js`: per-component behavior, value logic, and SVG assembly.
- `core/model.js`: pure geometry, ids, terminal helpers, and footprint math.
- `core/support.js`: pure math, formatting, SVG, and solver support helpers.
- `runtime/state.js`: global mutable runtime state, DOM references, render targets, and theme holders.
- `runtime/ui.js`: theme application, sprite creation, component strip, and canvas sizing.
- `runtime/viewport.js`: screen/world coordinate transforms.
- `render/render.js`: canvas drawing, render scheduling, and service worker registration.
- `editor/ui.js`: button state and transient UI feedback helpers.
- `editor/selectors.js`: read-only selectors over `state`.
- `editor/circuit.js`: circuit mutation, selection, topology updates, and editor orchestration.
- `editor/controls.js`: bottom-bar actions, keyboard shortcuts, modal flows, and top-level commands.
- `editor/interactions.js`: pointer, touch, wheel, pan, drag, and pinch handling.
- `editor/routing.js`: orthogonal wire routing and path cost logic.
- `simulation/solver.js`: MNA/DC solver, nonlinear devices, and simulation annotations.
- `export/png.js`: PNG export and native share handling.

PWA assets live in the root: `service-worker.js`, `manifest.webmanifest`, and `icon.svg`. `README.md` documents usage. `docs/refactor-notes.md` is the quick source of truth for load order and invariants.

## Navigation Shortcuts
- Start with `index.html` to confirm the entrypoint and static DOM ids.
- Use `docs/refactor-notes.md` before moving symbols across modules.
- For visual bugs, check `styles.css`, then `render/render.js`, then `runtime/ui.js`.
- For theme or sprite issues, check `runtime/ui.js` first.
- For state shape or shared runtime holders, check `runtime/state.js`.
- For interaction bugs, check `editor/interactions.js`, then `editor/controls.js`, then `editor/circuit.js`.
- For circuit mutation, selection, rerouting, or topology cleanup, check `editor/circuit.js` first.
- For route/path issues, check `editor/routing.js`.
- For simulation or annotation issues, check `simulation/solver.js`.
- For export-only issues, check `export/png.js`.
- When a browser-loaded asset is added, removed, or renamed, update `service-worker.js`.

## Build, Test, and Development Commands
There is no bundler, compile step, or dependency install step for the app itself.

- `python3 -m http.server 8080` serves the app locally at `http://localhost:8080/index.html`.
- `python3 -m http.server 8080 --bind 0.0.0.0` exposes the app on the local network for phone or tablet testing.
- `git diff -- index.html styles.css app-bootstrap.js bootstrap/bootstrap.js core/constants.js core/behaviors.js core/model.js core/support.js runtime/state.js runtime/ui.js runtime/viewport.js render/render.js editor/ui.js editor/selectors.js editor/circuit.js editor/controls.js editor/interactions.js editor/routing.js simulation/solver.js export/png.js service-worker.js README.md docs/refactor-notes.md` is the quickest review pass before committing UI or simulation changes.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript. Follow the existing JavaScript style: `const`/`let`, semicolons, uppercase snake case for shared constants (`GRID_SIZE`, `MAX_ZOOM`), and snake case component keys such as `voltage_source`, `voltage_node`, `bjt_npn`, and `bjt_pnp`. Prefer small helpers over repeated inline geometry or solver math. Keep browser behavior dependency-free and preserve Portuguese for user-facing labels, messages, and controls.

## Testing Guidelines
There is no automated test suite yet. Test changes manually in a browser after starting the local server: add components, connect wires, move and rotate parts, create a tap on an existing wire, run and pause simulation, and reload once to verify offline caching still behaves correctly. If automated tests are added later, place them under `tests/` and use names ending in `.test.js`.

Smoke checks worth running before finishing a refactor:

- `node --check app-bootstrap.js bootstrap/bootstrap.js core/constants.js core/behaviors.js core/model.js core/support.js runtime/state.js runtime/ui.js runtime/viewport.js render/render.js editor/ui.js editor/selectors.js editor/circuit.js editor/controls.js editor/interactions.js editor/routing.js simulation/solver.js export/png.js service-worker.js`
- Open `index.html` and confirm the component strip renders and the canvas initializes.
- Verify `Play/Pause` once after state or solver changes.
- Verify export once after render or theme changes.

## Commit & Pull Request Guidelines
Recent commits use short imperative subjects such as `Add desktop mouse panning` and `Prefer straighter wire routes`. Keep commit titles concise, present tense, and focused on one change. Pull requests should include a brief summary, manual test steps, and screenshots or a short recording for UI changes. When changing cached assets, update `CACHE_NAME` or the `ASSETS` list in `service-worker.js`.
