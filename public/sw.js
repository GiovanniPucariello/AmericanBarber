// Deliberately minimal. This app is entirely server-rendered against a
// live, auth-gated database (DESIGN.md section E/F) - there is no correct
// way to cache a booking page and serve it stale, so this service worker
// does exactly one thing: if a page navigation fails because the device
// has no network, show a friendly offline page instead of the browser's
// default error screen (spec section 96 Phase 15's "offline fallback").
// Everything else (data, API calls, RSC payloads) always goes to the
// network - never cached, never served stale.
const CACHE_NAME = "abt-shell-v1";
const OFFLINE_URL = "/offline";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.add(OFFLINE_URL)),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    fetch(event.request).catch(() =>
      caches.open(CACHE_NAME).then((cache) => cache.match(OFFLINE_URL)),
    ),
  );
});
