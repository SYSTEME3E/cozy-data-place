// ============================================================
//  Nexora Service Worker — v5 — Network-First + Auto-Update
//  ✅ CORRECTION : les modifications de code sont désormais
//     prises en compte immédiatement sans vider le cache.
// ============================================================

// ⚠️ IMPORTANT : incrémenter cette version à chaque déploiement
// pour forcer l'invalidation du cache automatiquement.
const CACHE_VERSION  = "nexora-cache-v5";
const OFFLINE_URL    = "/index.html";

// Ressources à pré-cacher (app shell minimal)
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW Nexora v5] Installation...");
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) =>
      Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((e) =>
            console.warn("[SW] Impossible de cacher :", url, e)
          )
        )
      )
    )
  );
  // Active immédiatement le nouveau SW sans attendre
  // que tous les onglets soient fermés
  self.skipWaiting();
});

// ── ACTIVATE : suppression de TOUS les anciens caches ────────
self.addEventListener("activate", (event) => {
  console.log("[SW Nexora v5] Activation — nettoyage des anciens caches...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_VERSION)
          .map((k) => {
            console.log("[SW] Suppression cache obsolète :", k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      // Prend le contrôle de tous les onglets ouverts immédiatement
      return self.clients.claim();
    }).then(() => {
      // Notifie tous les onglets qu'une mise à jour est disponible
      return self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({ type: "SW_UPDATED" });
        });
      });
    })
  );
});

// ── FETCH : stratégie par type de ressource ──────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et extensions Chrome
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:" || url.protocol === "chrome:") return;

  // ── Appels API (Supabase, GeniusPay) → réseau direct, jamais de cache ──
  const isApi =
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("pay.genius.ci") ||
    url.pathname.startsWith("/api/");

  if (isApi) {
    event.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ error: "Hors-ligne" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    return;
  }

  // ── Navigation HTML → NETWORK-FIRST ─────────────────────────
  // CORRECTION PRINCIPALE : on interroge TOUJOURS le réseau en premier
  // pour les pages HTML. Le cache n'est utilisé qu'en cas d'échec réseau.
  // Cela garantit que les modifications sont visibles immédiatement.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(OFFLINE_URL, responseClone);
            });
          }
          return response;
        })
        .catch(async () => {
          // Hors-ligne seulement → utiliser le cache
          const cached = await caches.match(OFFLINE_URL);
          return (
            cached ||
            new Response(
              `<!DOCTYPE html>
              <html lang="fr">
              <head>
                <meta charset="UTF-8"/>
                <meta name="viewport" content="width=device-width, initial-scale=1"/>
                <title>Nexora — Hors-ligne</title>
                <style>
                  body { margin:0; background:#000; color:#fff; font-family:sans-serif;
                         display:flex; align-items:center; justify-content:center;
                         min-height:100vh; text-align:center; padding:24px; }
                  h1 { color:#84cc16; font-size:2rem; margin-bottom:8px; }
                  p  { color:#666; font-size:0.9rem; }
                  button { margin-top:24px; padding:12px 32px;
                           background:#84cc16; color:#000; font-weight:700;
                           border:none; border-radius:12px; cursor:pointer;
                           font-size:1rem; }
                </style>
              </head>
              <body>
                <div>
                  <h1>📡 Nexora</h1>
                  <p>Vous êtes hors-ligne.</p>
                  <p>Vérifiez votre connexion et réessayez.</p>
                  <button onclick="location.reload()">Réessayer</button>
                </div>
              </body>
              </html>`,
              { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
            )
          );
        })
    );
    return;
  }

  // ── Assets JS/CSS (chunks Vite) → NETWORK-FIRST ─────────────
  // Les fichiers JS et CSS sont servis en network-first
  // pour que les modifications de code soient visibles sans vider le cache.
  const isAppAsset =
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.includes("/assets/");

  if (isAppAsset) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          return new Response("", { status: 503, statusText: "Offline" });
        })
    );
    return;
  }

  // ── Autres ressources (images, fonts) → Stale-While-Revalidate ──
  // Les images et polices changent rarement, le cache est acceptable.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          if (request.destination === "image") {
            return new Response(
              `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
                <rect width="200" height="200" fill="#000"/>
                <text x="50%" y="50%" fill="#84cc16" text-anchor="middle"
                  dy=".3em" font-size="14" font-family="sans-serif">Nexora</text>
              </svg>`,
              { headers: { "Content-Type": "image/svg+xml" } }
            );
          }
          return new Response("", { status: 503, statusText: "Offline" });
        });

      return cached || networkFetch;
    })
  );
});
