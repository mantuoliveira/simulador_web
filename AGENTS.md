# Repository Guidelines

## Project Structure & Module Organization
This repository is a static web app served directly from the project root. `index.html` defines the shell and the script load order, and `styles.css` contains layout and visual styles. The runtime is split across focused browser scripts:

- `app-core.js`: constants, component definitions, and domain behavior metadata.
- `app-support.js`: math, formatting, SVG builders, and shared low-level helpers.
- `app-render.js`: theme rendering, sprites, canvas drawing, and render loop helpers.
- `app-runtime.js`: app state, DOM element lookup, theme palette state, and canvas setup.
- `app-controls.js`: top bar / bottom bar actions, keyboard shortcuts, and editor commands.
- `app-interaction.js`: pointer, touch, pinch, zoom, and wheel interaction handling.
- `app.js`: circuit editing, selection, topology changes, and shared editor utilities.
- `app-routing.js`: orthogonal wire routing.
- `app-simulation.js`: DC solver and simulation annotations.
- `app-export.js`: PNG export and native share flow.
- `app-bootstrap.js`: final boot sequence; keep this file thin.

PWA files live beside the app entry points: `service-worker.js`, `manifest.webmanifest`, and `icon.svg`. `README.md` documents local usage and features. Keep related runtime files in the root unless a new folder adds a clear boundary.

## Navigation Shortcuts
- Start with `index.html` to confirm script order before moving functions between files.
- Use `docs/refactor-notes.md` as the quick source of truth for load order and refactor invariants.
- For visual bugs, check `styles.css`, then `app-render.js`, then `app-runtime.js`.
- For interaction bugs, check `app-interaction.js` first, then `app-controls.js`, then `app.js`.
- For circuit mutation or selection bugs, check `app.js` first.
- For route/path issues, check `app-routing.js`.
- For solver or annotation issues, check `app-simulation.js`.
- For export-only issues, check `app-export.js`.
- When a change adds or renames a browser-loaded asset, update `service-worker.js`.

## Build, Test, and Development Commands
There is no bundler, compile step, or dependency installation step for the app itself. The Python command below is only a convenient static file server.

- `python3 -m http.server 8080` serves the app locally at `http://localhost:8080/index.html`.
- `python3 -m http.server 8080 --bind 0.0.0.0` exposes the app on the local network for phone or tablet testing.
- `git diff -- index.html styles.css app-core.js app-support.js app-runtime.js app-controls.js app-render.js app-interaction.js app.js app-routing.js app-simulation.js app-export.js app-bootstrap.js service-worker.js` is the quickest review pass before committing UI or simulation changes.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript. Follow the existing JavaScript style: `const`/`let`, semicolons, uppercase snake case for shared constants (`GRID_SIZE`, `MAX_ZOOM`), and snake case identifiers for component keys such as `voltage_source` and `bjt_npn`. Prefer small helper functions over repeated inline geometry or solver math. Keep user-facing labels and messages in Portuguese to match the current UI.

## Testing Guidelines
The repository currently has no automated test suite. Test changes manually in a browser after starting the local server: place components, connect wires, rotate or swap supported parts, run and pause the simulation, and reload once to verify offline caching still behaves correctly. If automated tests are added later, place them under `tests/` and use names ending in `.test.js`.

Smoke checks worth running before finishing a refactor:

- `node --check app-core.js app-support.js app-runtime.js app-controls.js app-render.js app-interaction.js app.js app-routing.js app-simulation.js app-export.js app-bootstrap.js service-worker.js`
- Open `index.html` and confirm the component strip renders and the canvas initializes.

## Commit & Pull Request Guidelines
Recent commits use short imperative subjects such as `Add desktop mouse panning` and `Prefer straighter wire routes`. Keep commit titles concise, present tense, and focused on one change. Pull requests should include a brief summary, manual test steps, and screenshots or a short recording for UI changes. When changing cached assets, update `CACHE_NAME` or the `ASSETS` list in `service-worker.js`.
