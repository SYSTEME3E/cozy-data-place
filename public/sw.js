// ============================================================
//  Nexora Service Worker — Stale-While-Revalidate
//  Stratégie : cache immédiat + mise à jour en arrière-plan
//  Support hors-ligne complet
// ============================================================

const CACHE_NAME    = "nexora-cache-v3";
const OFFLINE_URL   = "/index.html";

// Ressources à pré-cacher dès l'installation
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

// ── INSTALL : pré-cache de l'app shell ──────────────────────
self.addEventListener("install", (event) => {
  console.log("[SW Nexora] Installation...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        APP_SHELL.map((url) =>
          cache.add(url).catch((e) =>
            console.warn("[SW] Impossible de cacher :", url, e)
          )
        )
      )
    )
  );
  // Activation immédiate sans attendre le rechargement
  self.skipWaiting();
});

// ── ACTIVATE : suppression des anciens caches ────────────────
self.addEventListener("activate", (event) => {
  console.log("[SW Nexora] Activation...");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME)
          .map((k) => {
            console.log("[SW] Suppression ancien cache :", k);
            return caches.delete(k);
          })
      )
    )
  );
  self.clients.claim();
});

// ── FETCH : stratégie par type de ressource ──────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET et extensions Chrome
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:" || url.protocol === "chrome:") return;

  // ── Appels API (Supabase, GeniusPay) → réseau direct ────────
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

  // ── Navigation HTML → Stale-While-Revalidate + fallback hors-ligne ──
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(OFFLINE_URL);

        // Lance la requête réseau en arrière-plan
        const networkPromise = fetch(request)
          .then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          })
          .catch(() => {
            // Hors-ligne : retourne le cache ou une page d'erreur propre
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
          });

        // Retourne le cache immédiatement s'il existe (stale),
        // sinon attend le réseau
        return cached || networkPromise;
      })
    );
    return;
  }

  // ── Assets statiques → Stale-While-Revalidate ───────────────
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);

      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type !== "opaque") {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // Fallback SVG pour les images manquantes
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
          // ✅ Toujours retourner une Response valide
          return new Response("", { status: 503, statusText: "Offline" });
        });

      // Stale-While-Revalidate :
      // → Cache dispo : retourne immédiatement + met à jour en arrière-plan
      // → Pas de cache : attend le réseau
      return cached || networkFetch;
    })
  );
});
