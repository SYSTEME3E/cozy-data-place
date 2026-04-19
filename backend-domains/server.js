// ═══════════════════════════════════════════════════════════
// NEXORA — Custom Domain API  v2.0
// backend-domains/server.js
// Node.js 18+ + Express — À déployer sur Railway / Render / VPS
// ═══════════════════════════════════════════════════════════


import express from "express";
import cors from "cors";
import dns from "dns/promises";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// ── CORS sécurisé
const allowedOrigins = (process.env.FRONTEND_URL || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// ── Supabase Admin (service role — JAMAIS exposé côté client)
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const APP_HOSTNAME = process.env.APP_HOSTNAME || "app.nexora.com";
const SERVER_IP    = process.env.SERVER_IP    || "";
const NEXORA_DOMAIN = process.env.NEXORA_DOMAIN || "nexora.com";

// ════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════

function generateVerificationToken() {
  return `nexora-verify-${crypto.randomBytes(20).toString("hex")}`;
}

function normalizeDomain(domain) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function isValidDomain(domain) {
  const re = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/;
  return re.test(domain);
}

const RESERVED_DOMAINS = [
  "nexora.com", "localhost", "127.0.0.1",
  "vercel.app", "netlify.app", "supabase.co",
  "railway.app", "render.com", "herokuapp.com",
];

function isReservedDomain(domain) {
  return RESERVED_DOMAINS.some(r => domain === r || domain.endsWith(`.${r}`));
}

// ── Middleware auth — vérifie x-user-id (+ optionnel Bearer token)
async function authMiddleware(req, res, next) {
  const userId = req.headers["x-user-id"];
  const token  = req.headers.authorization?.replace("Bearer ", "");

  if (!userId && !token) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  if (token) {
    // Vérifier le token JWT Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (!error && user) {
      req.userId = user.id;
      return next();
    }
  }

  if (userId) {
    // Fallback x-user-id header (pour développement)
    req.userId = userId;
    return next();
  }

  return res.status(401).json({ error: "Token invalide" });
}

// ── Rate limiting simple en mémoire
const rateLimitMap = new Map();
function rateLimit(maxReqs = 20, windowMs = 60_000) {
  return (req, res, next) => {
    const key = req.userId || req.ip;
    const now = Date.now();
    const window = rateLimitMap.get(key) || { count: 0, start: now };

    if (now - window.start > windowMs) {
      window.count = 1; window.start = now;
    } else {
      window.count++;
    }
    rateLimitMap.set(key, window);

    if (window.count > maxReqs) {
      return res.status(429).json({ error: "Trop de requêtes. Réessayez dans une minute." });
    }
    next();
  };
}

// ════════════════════════════════════════════════════════════
// ENDPOINTS
// ════════════════════════════════════════════════════════════

// ── Healthcheck
app.get("/health", (req, res) => res.json({ ok: true, ts: Date.now() }));

// ── GET /domains — Lister les domaines de l'utilisateur
app.get("/domains", authMiddleware, async (req, res) => {
  const { data, error } = await supabase
    .from("domains")
    .select("*")
    .eq("user_id", req.userId)
    .order("created_at", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ domains: data || [] });
});

// ── POST /domains — Ajouter un nouveau domaine
app.post("/domains", authMiddleware, rateLimit(10), async (req, res) => {
  const { domain_name, page_type = "boutique", page_slug } = req.body;

  if (!domain_name) {
    return res.status(400).json({ error: "domain_name requis" });
  }

  const normalized = normalizeDomain(domain_name);

  if (!isValidDomain(normalized)) {
    return res.status(400).json({ error: "Format de domaine invalide. Ex: monsite.com" });
  }

  if (isReservedDomain(normalized)) {
    return res.status(400).json({ error: "Ce domaine est réservé et ne peut pas être utilisé" });
  }

  const validPageTypes = ["boutique", "immobilier", "tunnel"];
  if (!validPageTypes.includes(page_type)) {
    return res.status(400).json({ error: "page_type invalide" });
  }

  // Vérifier unicité
  const { data: existing } = await supabase
    .from("domains")
    .select("id, user_id")
    .eq("domain_name", normalized)
    .maybeSingle();

  if (existing) {
    if (existing.user_id === req.userId) {
      return res.status(409).json({ error: "Vous avez déjà ajouté ce domaine" });
    }
    return res.status(409).json({ error: "Ce domaine est déjà utilisé sur la plateforme" });
  }

  // Vérifier la limite de domaines par utilisateur (ex: plan)
  const { count } = await supabase
    .from("domains")
    .select("*", { count: "exact", head: true })
    .eq("user_id", req.userId);

  const MAX_DOMAINS = parseInt(process.env.MAX_DOMAINS_PER_USER || "10");
  if (count >= MAX_DOMAINS) {
    return res.status(403).json({ error: `Limite de ${MAX_DOMAINS} domaines atteinte` });
  }

  const verificationToken = generateVerificationToken();

  const { data, error } = await supabase
    .from("domains")
    .insert({
      user_id: req.userId,
      domain_name: normalized,
      page_type,
      page_slug: page_slug?.trim() || null,
      status: "pending",
      ssl_status: "pending",
      verification_token: verificationToken,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({
    domain: data,
    instructions: buildDNSInstructions(normalized, verificationToken),
  });
});

// ── POST /domains/:id/verify — Vérifier la propriété (TXT record)
app.post("/domains/:id/verify", authMiddleware, rateLimit(30), async (req, res) => {
  const { data: domain, error: fetchError } = await supabase
    .from("domains")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId) // SÉCURITÉ : seul le propriétaire peut vérifier
    .maybeSingle();

  if (fetchError || !domain) {
    return res.status(404).json({ error: "Domaine introuvable ou accès refusé" });
  }

  if (domain.status === "active") {
    return res.json({ success: true, message: "Domaine déjà actif" });
  }

  // ── Résolution TXT DNS
  let txtVerified = false;
  try {
    const txtRecords = await dns.resolveTxt(domain.domain_name);
    const allTxt = txtRecords.flat();
    txtVerified = allTxt.some(r => r.trim() === domain.verification_token);
  } catch (dnsErr) {
    await supabase.from("domains")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", domain.id);

    return res.status(400).json({
      success: false,
      error: "Enregistrement TXT DNS non trouvé.",
      hint: "La propagation DNS peut prendre 5 min à 48h selon votre registrar.",
      expected_record: {
        type: "TXT",
        host: domain.domain_name,
        value: domain.verification_token,
      },
    });
  }

  if (!txtVerified) {
    await supabase.from("domains")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", domain.id);

    return res.status(400).json({
      success: false,
      error: "L'enregistrement TXT ne correspond pas.",
      expected: domain.verification_token,
      hint: "Vérifiez que vous avez copié la valeur exacte sans espaces.",
    });
  }

  // ── Vérification CNAME/A (bonus — si déjà configuré)
  let dnsConfigured = await checkDNSConfig(domain.domain_name);
  const newStatus = dnsConfigured ? "active" : "verified";

  await supabase.from("domains").update({
    status: newStatus,
    verified_at: new Date().toISOString(),
    last_checked_at: new Date().toISOString(),
  }).eq("id", domain.id);

  if (dnsConfigured && process.env.CLOUDFLARE_API_TOKEN) {
    provisionSSL(domain.domain_name).catch(console.error);
  }

  return res.json({
    success: true,
    status: newStatus,
    message: dnsConfigured
      ? "✅ Domaine vérifié et DNS configuré ! SSL en cours."
      : "✅ Propriété vérifiée ! Configurez maintenant votre CNAME ou A record.",
    dns_configured: dnsConfigured,
    next_instructions: dnsConfigured ? null : buildDNSInstructions(domain.domain_name, null),
  });
});

// ── POST /domains/:id/check-dns — Vérifier CNAME/A record
app.post("/domains/:id/check-dns", authMiddleware, rateLimit(30), async (req, res) => {
  const { data: domain } = await supabase
    .from("domains")
    .select("*")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (!domain) {
    return res.status(404).json({ error: "Domaine introuvable ou accès refusé" });
  }

  if (domain.status === "pending") {
    return res.status(400).json({
      error: "Vérifiez d'abord la propriété du domaine avec l'enregistrement TXT",
    });
  }

  const { cnameOk, aRecordOk, details } = await checkDNSConfigDetailed(domain.domain_name);
  const dnsOk = cnameOk || aRecordOk;

  if (dnsOk) {
    await supabase.from("domains").update({
      status: "active",
      last_checked_at: new Date().toISOString(),
    }).eq("id", domain.id);

    if (process.env.CLOUDFLARE_API_TOKEN) {
      provisionSSL(domain.domain_name).catch(console.error);
    }
  } else {
    await supabase.from("domains")
      .update({ last_checked_at: new Date().toISOString() })
      .eq("id", domain.id);
  }

  res.json({
    success: dnsOk,
    cnameOk,
    aRecordOk,
    details,
    message: dnsOk
      ? "✅ DNS correctement configuré ! Votre domaine est maintenant actif."
      : "⏳ DNS pas encore propagé. Vérifiez votre configuration et réessayez dans quelques minutes.",
    instructions: dnsOk ? null : buildDNSInstructions(domain.domain_name, null),
  });
});

// ── DELETE /domains/:id — Supprimer un domaine
app.delete("/domains/:id", authMiddleware, async (req, res) => {
  // Récupérer d'abord pour pouvoir nettoyer Cloudflare
  const { data: domain } = await supabase
    .from("domains")
    .select("domain_name")
    .eq("id", req.params.id)
    .eq("user_id", req.userId)
    .maybeSingle();

  if (!domain) {
    return res.status(404).json({ error: "Domaine introuvable ou accès refusé" });
  }

  const { error } = await supabase
    .from("domains")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.userId);

  if (error) return res.status(500).json({ error: error.message });

  // Nettoyer Cloudflare si nécessaire
  if (process.env.CLOUDFLARE_API_TOKEN) {
    removeCloudflareHostname(domain.domain_name).catch(console.error);
  }

  res.json({ success: true });
});

// ── GET /resolve/:domain — Résolution domaine personnalisé (PUBLIC, sans auth)
// Utilisé par le proxy / middleware frontend
app.get("/resolve/:domain", async (req, res) => {
  const domain = normalizeDomain(req.params.domain);

  // Sécurité : refuser les hostnames internes
  if (isReservedDomain(domain)) {
    return res.status(400).json({ error: "Domaine invalide" });
  }

  const { data, error } = await supabase
    .from("domains")
    .select("user_id, page_type, page_slug, status, domain_name")
    .eq("domain_name", domain)
    .eq("status", "active") // SÉCURITÉ : seulement les domaines actifs et vérifiés
    .maybeSingle();

  if (error || !data) {
    return res.status(404).json({ error: "Domaine non trouvé ou non actif" });
  }

  res.json({
    user_id:   data.user_id,
    page_type: data.page_type,
    page_slug: data.page_slug,
    domain:    data.domain_name,
    redirect_url: buildRedirectUrl(data),
  });
});

// ════════════════════════════════════════════════════════════
// HELPERS MÉTIER
// ════════════════════════════════════════════════════════════

async function checkDNSConfig(domainName) {
  const { cnameOk, aRecordOk } = await checkDNSConfigDetailed(domainName);
  return cnameOk || aRecordOk;
}

async function checkDNSConfigDetailed(domainName) {
  let cnameOk = false;
  let aRecordOk = false;
  const details = {};

  // Vérifier CNAME www
  try {
    const cnames = await dns.resolveCname(`www.${domainName}`);
    details.cname_found = cnames;
    cnameOk = cnames.some(c =>
      c.includes("nexora") ||
      c === APP_HOSTNAME ||
      c.endsWith(`.${APP_HOSTNAME}`)
    );
  } catch (e) {
    details.cname_error = e.code;
  }

  // Vérifier A record (domaine racine)
  if (!cnameOk && SERVER_IP) {
    try {
      const aRecords = await dns.resolve4(domainName);
      details.a_records_found = aRecords;
      aRecordOk = aRecords.includes(SERVER_IP);
    } catch (e) {
      details.a_record_error = e.code;
    }
  }

  return { cnameOk, aRecordOk, details };
}

function buildRedirectUrl(domain) {
  const base = process.env.FRONTEND_URL?.split(",")[0] || `https://${NEXORA_DOMAIN}`;
  const routes = {
    boutique:   `/shop/${domain.page_slug || ""}`,
    immobilier: `/immo/${domain.page_slug || ""}`,
    tunnel:     `/funnel/${domain.page_slug || ""}`,
  };
  return `${base}${routes[domain.page_type] || "/"}`;
}

function buildDNSInstructions(domain, token) {
  return {
    ...(token ? {
      step1_txt: {
        type: "TXT",
        host: domain,
        value: token,
        ttl: "3600",
        purpose: "Vérification de propriété — à ajouter chez votre registrar",
      }
    } : {}),
    step2_cname: {
      type: "CNAME",
      host: `www.${domain}`,
      value: APP_HOSTNAME,
      ttl: "3600",
      purpose: "Pointer www vers Nexora (recommandé)",
    },
    step2_alternative_a: {
      type: "A",
      host: domain,
      value: SERVER_IP || "VOTRE_IP_SERVEUR",
      ttl: "3600",
      purpose: "Alternative CNAME pour le domaine racine",
    },
    note: "La propagation DNS peut prendre 5 minutes à 48 heures.",
  };
}

// ── SSL via Cloudflare For SaaS (Custom Hostnames)
async function provisionSSL(domain) {
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID } = process.env;
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) {
    return console.log(`[SSL] Skip — Cloudflare non configuré pour ${domain}`);
  }

  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: domain,
          ssl: {
            method: "http",
            type: "dv",
            settings: { http2: "on", tls_1_3: "on", min_tls_version: "1.2" },
          },
        }),
      }
    );

    const data = await response.json();

    if (data.success) {
      await supabase.from("domains").update({ ssl_status: "active" }).eq("domain_name", domain);
      console.log(`[SSL] ✅ Certificat provisionné pour ${domain}`);
    } else {
      // Gérer le cas "already exists" (code 1406)
      if (data.errors?.some(e => e.code === 1406)) {
        await supabase.from("domains").update({ ssl_status: "active" }).eq("domain_name", domain);
        console.log(`[SSL] ℹ️ Certificat déjà existant pour ${domain}`);
      } else {
        await supabase.from("domains").update({ ssl_status: "error" }).eq("domain_name", domain);
        console.error(`[SSL] ❌ Cloudflare erreur pour ${domain}:`, data.errors);
      }
    }
  } catch (err) {
    console.error(`[SSL] Exception pour ${domain}:`, err.message);
  }
}

async function removeCloudflareHostname(domain) {
  const { CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID } = process.env;
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ZONE_ID) return;

  try {
    // Chercher l'ID du custom hostname
    const listRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames?hostname=${domain}`,
      { headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );
    const listData = await listRes.json();
    const hostId = listData.result?.[0]?.id;
    if (!hostId) return;

    await fetch(
      `https://api.cloudflare.com/client/v4/zones/${CLOUDFLARE_ZONE_ID}/custom_hostnames/${hostId}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${CLOUDFLARE_API_TOKEN}` } }
    );
    console.log(`[SSL] 🗑️ Hostname Cloudflare supprimé pour ${domain}`);
  } catch (err) {
    console.error(`[SSL] Erreur suppression Cloudflare pour ${domain}:`, err.message);
  }
}

// ── Gestion erreurs globales
app.use((err, req, res, next) => {
  console.error("API Error:", err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

// ── Démarrage
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Nexora Domain API — Port ${PORT}`);
  console.log(`   APP_HOSTNAME : ${APP_HOSTNAME}`);
  console.log(`   SERVER_IP    : ${SERVER_IP || "(non configuré)"}`);
  console.log(`   Cloudflare   : ${process.env.CLOUDFLARE_API_TOKEN ? "✅" : "❌"}`);
});

export default app;
