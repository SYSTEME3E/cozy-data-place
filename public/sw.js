// ============================================================
//  Nexora Service Worker — Cache-first strategy
//  Place this file at: /public/sw.js
// ============================================================

const CACHE_NAME = "nexora-cache-v1";

// Resources to pre-cache on install (app shell)
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  // Vite génère des noms de fichiers hachés — on les met en cache
  // dynamiquement via le fetch handler ci-dessous.
];

// ── Install : pré-cache de l'app shell ─────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[SW] Pre-caching app shell");
      return cache.addAll(APP_SHELL);
    })
  );
  // Prend le contrôle immédiatement sans attendre le rechargement
  self.skipWaiting();
});

// ── Activate : supprime les anciens caches ──────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      )
    )
  );
  // Prend le contrôle de toutes les pages ouvertes immédiatement
  self.clients.claim();
});

// ── Fetch : Network-first pour les API, Cache-first pour les assets ──
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore les requêtes non-GET et les extensions Chrome
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // Requêtes API (Supabase, KKiaPay, postimg) → réseau uniquement
  const isApiCall =
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("kkiapay.me") ||
    url.hostname.includes("postimg.cc") ||
    url.pathname.startsWith("/api/");

  if (isApiCall) {
    event.respondWith(fetch(request));
    return;
  }

  // Navigation HTML → Network-first avec fallback sur /index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Met à jour le cache avec la réponse fraîche
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(request, responseClone)
          );
          return response;
        })
        .catch(() =>
          caches.match("/index.html").then(
            (cached) => cached || new Response("Hors-ligne", { status: 503 })
          )
        )
    );
    return;
  }

  // Assets statiques (JS, CSS, images, fonts) → Cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Ne met en cache que les réponses valides
          if (
            !response ||
            response.status !== 200 ||
            response.type === "opaque"
          ) {
            return response;
          }
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) =>
            cache.put(request, responseClone)
          );
          return response;
        })
        .catch(() => {
          // Fallback image SVG générique si l'asset est une image
          if (request.destination === "image") {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" fill="#000"/>
                <text x="50%" y="50%" fill="#84cc16" text-anchor="middle" dy=".3em" font-size="14">Nexora</text>
              </svg>`,
              { headers: { "Content-Type": "image/svg+xml" } }
            );
          }
        });
    })
  );
});
