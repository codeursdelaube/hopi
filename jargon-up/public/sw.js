/*
 * Service worker de Hopi (écrit à la main, sans dépendance).
 * - Fichiers statiques (/_next/static, /icons) : cache d'abord (ils sont versionnés).
 * - Pages : réseau d'abord, copie en cache ; réseau trop lent (> 3,5 s) ou coupé → dernière
 *   copie, sinon /offline.
 *   Les leçons récemment ouvertes restent donc consultables sans connexion.
 * - Déconnexion : les pages en cache (données personnelles) sont effacées.
 * - Notifications push : rappel du mot du jour et des révisions (voir /api/cron/notifications).
 */
const VERSION = "hopi-v3";
const STATIC_CACHE = `${VERSION}-static`;
const PAGES_CACHE = `${VERSION}-pages`;
const OFFLINE_URL = "/offline";
const MAX_PAGES = 40;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

async function trimCache(name, max) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.method === "POST" && url.pathname === "/auth/signout") {
    event.waitUntil(caches.delete(PAGES_CACHE));
    return;
  }
  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigate(request, event));
  }
});

/**
 * Pages : réseau d'abord, MAIS si le réseau traîne (3G faible) et qu'on a une copie en cache,
 * on affiche la copie après NAVIGATION_TIMEOUT ; la réponse du réseau met le cache à jour ensuite.
 */
const NAVIGATION_TIMEOUT = 3500;

async function navigate(request, event) {
  const network = fetch(request).then((response) => {
    if (response.ok && !response.redirected) {
      const copy = response.clone();
      event.waitUntil(
        caches
          .open(PAGES_CACHE)
          .then((cache) => cache.put(request, copy))
          .then(() => trimCache(PAGES_CACHE, MAX_PAGES)),
      );
    }
    return response;
  });

  const cached = await caches.match(request);
  if (!cached) {
    return network.catch(async () => (await caches.match(OFFLINE_URL)) || Response.error());
  }

  const slow = new Promise((resolve) => setTimeout(() => resolve(cached), NAVIGATION_TIMEOUT));
  return Promise.race([network.catch(() => cached), slow]);
}

self.addEventListener("push", (event) => {
  let data = { title: "Hopi", body: "", url: "/learn", tag: "hopi" };
  try {
    data = { ...data, ...event.data.json() };
  } catch {
    if (event.data) data.body = event.data.text();
  }
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      tag: data.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      lang: "fr",
      data: { url: data.url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/learn", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      // L'appli est déjà ouverte : on la ramène au premier plan sur la bonne page.
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.navigate(url);
        return open.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
