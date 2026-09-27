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

// Web push (payload sent by /api/push/dispatch): { title, body, url }.
self.addEventListener("push", (event) => {
  let data = { title: "American Barber Tattoo", body: "", url: "/app" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    // Non-JSON or empty payload - show the generic title.
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url },
    }),
  );
});

// Tap on a notification: focus an open app window, or open one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/app", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
