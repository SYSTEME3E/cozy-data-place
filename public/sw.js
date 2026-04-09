// ============================================================
//  Nexora Service Worker — Cache-first strategy
//  Version corrigée : 3 bugs résolus
// ============================================================

const CACHE_NAME = "nexora-cache-v2";

const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── Install ─────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((err) =>
            console.warn("[SW] Cache échoué pour :", url, err)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});


// ── Fetch ─────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:" || url.protocol === "chrome:") return;

  // API calls → réseau direct
  const isApiCall =
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("pay.genius.ci") ||
    url.hostname.includes("postimg.cc") ||
    url.pathname.startsWith("/api/");

  if (isApiCall) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Réseau indisponible" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // Navigation → Network-first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        // ✅ FIX : double catch pour éviter rejection non gérée
        .catch(() =>
          caches.match("/index.html")
            .then((cached) => cached || new Response("Hors-ligne", { status: 503 }))
            .catch(() => new Response("Hors-ligne", { status: 503 }))
        )
    );
    return;
  }

  // Assets statiques → Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (!response || response.status !== 200 || response.type === "opaque") {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          if (request.destination === "image") {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" fill="#0a0e27"/>
                <text x="50%" y="50%" fill="#84cc16" text-anchor="middle" dy=".3em" font-size="14" font-family="sans-serif">Nexora</text>
              </svg>`,
              { headers: { "Content-Type": "image/svg+xml" } }
            );
          }
          // ✅ FIX : toujours retourner une Response valide (évite TypeError)
          return new Response("", { status: 503, statusText: "Offline" });
        });
    })
  );
});
