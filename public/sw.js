// Acadex service worker — minimal, network-first for HTML, supports notifications.
const CACHE = "acadex-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// Network-first for navigations; cache static assets opportunistically.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(() => caches.match("/").then((r) => r || new Response("Offline", { status: 503 })))
    );
    return;
  }

  if (url.origin === self.location.origin && /\.(png|jpg|jpeg|svg|webp|ico|css|js|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const fetched = fetch(req).then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || fetched;
      })
    );
  }
});

// Push notifications (server-sent)
self.addEventListener("push", (event) => {
  let data = { title: "Acadex", body: "You have a new notification" };
  try {
    if (event.data) data = { ...data, ...event.data.json() };
  } catch (_) {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      data: data.url || "/",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clients) => {
      for (const c of clients) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
