const CACHE_NAME = "simulador-dc-v79";
const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app-bootstrap.js",
  "./bootstrap/bootstrap.js",
  "./core/behaviors.js",
  "./core/constants.js",
  "./core/model.js",
  "./core/support.js",
  "./runtime/state.js",
  "./runtime/ui.js",
  "./runtime/viewport.js",
  "./render/render.js",
  "./editor/circuit.js",
  "./editor/controls.js",
  "./editor/interactions.js",
  "./editor/routing.js",
  "./editor/selectors.js",
  "./editor/ui.js",
  "./simulation/solver.js",
  "./export/png.js",
  "./manifest.webmanifest",
  "./icon.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() =>
        caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return caches.match("./index.html");
        })
      )
  );
});
