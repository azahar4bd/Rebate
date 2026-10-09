/** Rebate Calculator: cache public data only; never cache admin sessions. */
const CACHE_NAME = "rebate-calc-v2";
const PRECACHE_URLS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];
const PUBLIC_API_PATHS = new Set(["/api/rates", "/api/content"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith("rebate-calc-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

async function fetchAndCache(request) {
  const response = await fetch(request);
  if (response.ok && !response.headers.get("Cache-Control")?.includes("no-store")) {
    try {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    } catch {
      // Storage may be full or unavailable. The online response still works.
    }
  }
  return response;
}

async function networkFirst(request, homeFallback = false) {
  try {
    return await fetchAndCache(request);
  } catch {
    return (await caches.match(request)) ||
      (homeFallback ? await caches.match("/") : undefined) ||
      new Response("Offline", { status: 503 });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // All auth, health and other private API requests go straight to the network.
  if (url.pathname.startsWith("/api/")) {
    if (PUBLIC_API_PATHS.has(url.pathname)) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // Refresh the HTML on each online visit so new deployments are visible.
  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Only immutable build assets and public icons use cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icon")) {
    event.respondWith(
      caches.match(request).then((cached) => cached || networkFirst(request))
    );
  }
});
