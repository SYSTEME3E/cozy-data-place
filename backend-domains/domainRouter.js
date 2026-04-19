// ═══════════════════════════════════════════════════════════
// NEXORA — Middleware de routage dynamique des domaines
// domainRouter.js
// ═══════════════════════════════════════════════════════════

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ══════════════════════════════════════════════════════════
// OPTION A — Next.js Middleware (middleware.ts à la racine)
// ══════════════════════════════════════════════════════════
//
// Créer ce fichier : /middleware.ts dans votre projet Next.js
//
// import { NextRequest, NextResponse } from "next/server";
//
// const NEXORA_DOMAIN  = process.env.NEXT_PUBLIC_APP_HOSTNAME || "app.nexora.com";
// const DOMAIN_API_URL = process.env.DOMAIN_API_URL || "http://localhost:3001";
//
// export async function middleware(req: NextRequest) {
//   const hostname = (req.headers.get("host") || "")
//     .replace(/^www\./, "").replace(/:\d+$/, "");
//
//   if (hostname === NEXORA_DOMAIN || hostname.endsWith(".nexora.com")) {
//     return NextResponse.next();
//   }
//
//   try {
//     const res = await fetch(`${DOMAIN_API_URL}/resolve/${hostname}`, {
//       next: { revalidate: 300 }, // cache 5min
//     });
//     if (!res.ok) return NextResponse.next();
//     const { page_type, page_slug } = await res.json();
//
//     const routes = {
//       boutique:   `/shop/${page_slug || ""}`,
//       immobilier: `/immo/${page_slug || ""}`,
//       tunnel:     `/funnel/${page_slug || ""}`,
//     };
//
//     const url = req.nextUrl.clone();
//     url.pathname = routes[page_type] || "/";
//     return NextResponse.rewrite(url);
//   } catch {
//     return NextResponse.next();
//   }
// }
//
// export const config = {
//   matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
// };

// ══════════════════════════════════════════════════════════
// OPTION B — Express + Vite SPA (serveur frontend custom)
// À utiliser à la place de servir directement les fichiers dist/
// ══════════════════════════════════════════════════════════

const app = express();

const NEXORA_DOMAIN  = process.env.NEXORA_DOMAIN  || "app.nexora.com";
const DOMAIN_API_URL = process.env.DOMAIN_API_URL || "http://localhost:3001";
const DIST_PATH      = path.resolve(__dirname, "../dist");

// Cache en mémoire pour éviter des appels API répétés
const resolveCache = new Map(); // domain → { data, expiresAt }
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

async function resolveDomain(hostname) {
  const now = Date.now();
  const cached = resolveCache.get(hostname);
  if (cached && cached.expiresAt > now) return cached.data;

  try {
    const res = await fetch(`${DOMAIN_API_URL}/resolve/${hostname}`, {
      signal: AbortSignal.timeout(2000), // timeout 2s
    });
    if (!res.ok) return null;
    const data = await res.json();
    resolveCache.set(hostname, { data, expiresAt: now + CACHE_TTL_MS });
    return data;
  } catch {
    return null;
  }
}

// Middleware de résolution domaine personnalisé
app.use(async (req, res, next) => {
  const hostname = req.hostname.replace(/^www\./, "");

  // Domaine Nexora ou localhost → pass through
  if (
    hostname === NEXORA_DOMAIN ||
    hostname.endsWith(".nexora.com") ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return next();
  }

  const domainData = await resolveDomain(hostname);
  if (!domainData) return next();

  // Injecter le contexte dans window.__NEXORA_DOMAIN_CONTEXT__
  // Le hook useDomainContext.ts le lira pour rediriger automatiquement
  const contextScript = `window.__NEXORA_DOMAIN_CONTEXT__ = ${JSON.stringify({
    page_type: domainData.page_type,
    page_slug: domainData.page_slug || "",
    hostname,
  })};`;

  // Lire et modifier le index.html
  const indexPath = path.join(DIST_PATH, "index.html");
  try {
    const fs = await import("fs/promises");
    let html = await fs.readFile(indexPath, "utf-8");
    html = html.replace(
      "<head>",
      `<head><script>${contextScript}</script>`
    );
    return res.send(html);
  } catch {
    return next();
  }
});

// Fichiers statiques Vite
app.use(express.static(DIST_PATH));
app.get("*", (req, res) => {
  res.sendFile(path.join(DIST_PATH, "index.html"));
});

export default app;
