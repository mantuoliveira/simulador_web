# Repository Guidelines

## Project Structure & Module Organization
This repository is a static web app served directly from the project root. `index.html` defines the shell and controls, `styles.css` contains layout and visual styles, and `app.js` holds canvas interaction, wire routing, and the DC simulation logic. PWA files live beside the app entry points: `service-worker.js`, `manifest.webmanifest`, and `icon.svg`. `README.md` documents local usage and features. Keep related runtime files in the root unless a new folder adds a clear boundary.

## Build, Test, and Development Commands
There is no bundler or compile step.

- `python3 -m http.server 8080` serves the app locally at `http://localhost:8080/index.html`.
- `python3 -m http.server 8080 --bind 0.0.0.0` exposes the app on the local network for phone or tablet testing.
- `git diff -- index.html styles.css app.js service-worker.js` is the quickest review pass before committing UI or simulation changes.

## Coding Style & Naming Conventions
Use 2-space indentation in HTML, CSS, and JavaScript. Follow the existing JavaScript style: `const`/`let`, semicolons, uppercase snake case for shared constants (`GRID_SIZE`, `MAX_ZOOM`), and snake case identifiers for component keys such as `voltage_source` and `bjt_npn`. Prefer small helper functions over repeated inline geometry or solver math. Keep user-facing labels and messages in Portuguese to match the current UI.

## Testing Guidelines
The repository currently has no automated test suite. Test changes manually in a browser after starting the local server: place components, connect wires, rotate or swap supported parts, run and pause the simulation, and reload once to verify offline caching still behaves correctly. If automated tests are added later, place them under `tests/` and use names ending in `.test.js`.

## Commit & Pull Request Guidelines
Recent commits use short imperative subjects such as `Add desktop mouse panning` and `Prefer straighter wire routes`. Keep commit titles concise, present tense, and focused on one change. Pull requests should include a brief summary, manual test steps, and screenshots or a short recording for UI changes. When changing cached assets, update `CACHE_NAME` or the `ASSETS` list in `service-worker.js`.
