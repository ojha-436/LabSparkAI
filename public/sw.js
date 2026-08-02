/* ── LabSpark AI service worker ──
   Conservative, dependency-free caching so the app is installable and has an
   offline shell WITHOUT risking stale/broken behaviour:
   - Cross-origin requests (Firebase, Cloud Run backend, Gemini) are never touched.
   - Navigations: network-first, fall back to the cached shell when offline.
   - Same-origin static assets (hashed JS/CSS, icons, narration .wav): cache-first.
   Bump CACHE_VERSION to invalidate old caches on deploy. */
const CACHE_VERSION = "labspark-v1";
const SHELL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_VERSION).then((c) => c.add(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // never cache POST/WS/etc.

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // leave Firebase/backend/Gemini alone

  // App navigations → network-first, offline fallback to the cached shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match(SHELL))
    );
    return;
  }

  // Same-origin static assets → cache-first, then network (and cache it).
  event.respondWith(
    caches.match(req).then((hit) =>
      hit ||
      fetch(req).then((res) => {
        if (res && res.ok && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit)
    )
  );
});
