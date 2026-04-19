// src/hooks/useDomains.ts
// Hook domaines — 100% Supabase direct, sans backend Node.js séparé
// Vérification DNS via Google DNS over HTTPS (fonctionne depuis le navigateur)

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

// ── Types ──────────────────────────────────────────────────

export type DomainStatus = "pending" | "verified" | "active" | "error";
export type PageType = "boutique" | "immobilier" | "tunnel" | "all";

export interface Domain {
  id: string;
  user_id: string;
  domain_name: string;
  status: DomainStatus;
  page_type: PageType;
  page_slug: string | null;
  verification_token: string;
  ssl_status: "pending" | "active" | "error";
  last_checked_at: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DNSInstructions {
  step1_txt: { type: string; host: string; value: string; ttl: string; purpose: string; } | null;
  step2_cname: { type: string; host: string; value: string; ttl: string; purpose: string; };
  step2_alternative_a: { type: string; host: string; value: string; ttl: string; purpose: string; };
  note: string;
}

// ── Config ─────────────────────────────────────────────────

const APP_HOSTNAME = import.meta.env.VITE_APP_HOSTNAME || "app.nexora.com";
const SERVER_IP    = import.meta.env.VITE_SERVER_IP    || "X.X.X.X";

const RESERVED_DOMAINS = [
  "nexora.com", "localhost", "127.0.0.1",
  "vercel.app", "netlify.app", "supabase.co",
  "railway.app", "render.com",
];

// ── Helpers ────────────────────────────────────────────────

function generateToken(): string {
  const arr = new Uint8Array(20);
  crypto.getRandomValues(arr);
  return "nexora-verify-" + Array.from(arr).map(b => b.toString(16).padStart(2, "0")).join("");
}

function normalizeDomain(domain: string): string {
  return domain
    .trim().toLowerCase()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .replace(/:\d+$/, "");
}

function isValidDomain(domain: string): boolean {
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
}

function isReserved(domain: string): boolean {
  return RESERVED_DOMAINS.some(r => domain === r || domain.endsWith(`.${r}`));
}

function buildInstructions(domain: string, token: string | null): DNSInstructions {
  return {
    step1_txt: token ? {
      type: "TXT", host: domain, value: token, ttl: "3600",
      purpose: "Vérification de propriété — à ajouter chez votre registrar",
    } : null,
    step2_cname: {
      type: "CNAME", host: `www.${domain}`, value: APP_HOSTNAME, ttl: "3600",
      purpose: "Pointer www vers Nexora (recommandé)",
    },
    step2_alternative_a: {
      type: "A", host: domain, value: SERVER_IP, ttl: "3600",
      purpose: "Alternative pour le domaine racine sans www",
    },
    note: "La propagation DNS peut prendre 5 minutes à 48 heures.",
  };
}

// ── DNS over HTTPS via Google (fonctionne depuis le navigateur, pas besoin de backend)

async function dohQuery(name: string, type: string): Promise<any[]> {
  try {
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`,
      { headers: { Accept: "application/dns-json" }, signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data.Answer || [];
  } catch {
    return [];
  }
}

async function resolveTXT(domain: string): Promise<string[]> {
  const records = await dohQuery(domain, "TXT");
  return records
    .filter((r: any) => r.type === 16)
    .map((r: any) => r.data.replace(/"/g, "").trim());
}

async function resolveCNAME(domain: string): Promise<string[]> {
  const records = await dohQuery(domain, "CNAME");
  return records
    .filter((r: any) => r.type === 5)
    .map((r: any) => r.data.replace(/\.$/, "").trim());
}

async function resolveA(domain: string): Promise<string[]> {
  const records = await dohQuery(domain, "A");
  return records
    .filter((r: any) => r.type === 1)
    .map((r: any) => r.data.trim());
}

// ══════════════════════════════════════════════════════════
// HOOK PRINCIPAL
// ══════════════════════════════════════════════════════════

export function useDomains() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getUser = () => {
    const user = getNexoraUser();
    if (!user) throw new Error("Vous devez être connecté");
    return user;
  };

  // ── Charger les domaines depuis Supabase
  const fetchDomains = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = getNexoraUser();
      if (!user) { setDomains([]); return; }

      const { data, error: err } = await supabase
        .from("domains" as any)
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (err) throw new Error(err.message);
      setDomains((data as any) || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDomains(); }, [fetchDomains]);

  // ── Ajouter un domaine (couvre automatiquement boutique + immobilier + tunnel)
  const addDomain = async (
    domainName: string,
    pageType: PageType = "all",
    pageSlug?: string
  ): Promise<{ domain: Domain; instructions: DNSInstructions }> => {
    setActionLoading("add");
    setError(null);
    try {
      const user = getUser();
      const normalized = normalizeDomain(domainName);

      if (!isValidDomain(normalized)) throw new Error("Format de domaine invalide. Ex: monsite.com");
      if (isReserved(normalized)) throw new Error("Ce domaine est réservé et ne peut pas être utilisé");

      // Vérifier unicité
      const { data: existing } = await supabase
        .from("domains" as any)
        .select("id, user_id")
        .eq("domain_name", normalized)
        .maybeSingle();

      if (existing) {
        if ((existing as any).user_id === user.id) throw new Error("Vous avez déjà ajouté ce domaine");
        throw new Error("Ce domaine est déjà utilisé sur la plateforme");
      }

      const token = generateToken();

      const { data, error: insertErr } = await supabase
        .from("domains" as any)
        .insert({
          user_id: user.id,
          domain_name: normalized,
          page_type: pageType,
          page_slug: pageSlug?.trim() || null,
          status: "pending",
          ssl_status: "pending",
          verification_token: token,
        })
        .select()
        .single();

      if (insertErr) throw new Error(insertErr.message);

      await fetchDomains();
      return { domain: data as any, instructions: buildInstructions(normalized, token) };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  // ── Vérifier la propriété via TXT DNS (Google DoH)
  const verifyDomain = async (domainId: string) => {
    setActionLoading(domainId);
    setError(null);
    try {
      const user = getUser();

      const { data: domain } = await supabase
        .from("domains" as any)
        .select("*")
        .eq("id", domainId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!domain) throw new Error("Domaine introuvable");
      const d = domain as any;
      if (d.status === "active") return { success: true, message: "Domaine déjà actif" };

      const txtRecords = await resolveTXT(d.domain_name);
      const txtFound = txtRecords.some(r => r === d.verification_token);

      await supabase.from("domains" as any)
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", domainId);

      if (!txtFound) {
        return {
          success: false,
          message: `Enregistrement TXT non trouvé.\nAttendu : ${d.verification_token}\nTrouvé : ${txtRecords.join(", ") || "aucun"}\n\nLa propagation DNS peut prendre jusqu'à 48h.`,
        };
      }

      // TXT ok → vérifier aussi CNAME/A
      const cnameRecords = await resolveCNAME(`www.${d.domain_name}`);
      const aRecords     = await resolveA(d.domain_name);
      const cnameOk = cnameRecords.some(c => c.includes("nexora") || c === APP_HOSTNAME);
      const aOk     = SERVER_IP !== "X.X.X.X" && aRecords.includes(SERVER_IP);
      const newStatus = (cnameOk || aOk) ? "active" : "verified";

      await supabase.from("domains" as any).update({
        status: newStatus,
        verified_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      }).eq("id", domainId);

      await fetchDomains();
      return {
        success: true,
        status: newStatus,
        message: (cnameOk || aOk)
          ? "✅ Domaine vérifié et DNS configuré ! Votre domaine est maintenant actif."
          : "✅ Propriété vérifiée ! Configurez maintenant votre CNAME ou A record puis cliquez 'Vérifier le DNS'.",
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  // ── Vérifier la config DNS (CNAME/A)
  const checkDNS = async (domainId: string) => {
    setActionLoading(domainId + "-dns");
    setError(null);
    try {
      const user = getUser();

      const { data: domain } = await supabase
        .from("domains" as any)
        .select("*")
        .eq("id", domainId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!domain) throw new Error("Domaine introuvable");
      const d = domain as any;

      if (d.status === "pending") {
        throw new Error("Vérifiez d'abord la propriété avec l'enregistrement TXT");
      }

      const cnameRecords = await resolveCNAME(`www.${d.domain_name}`);
      const aRecords     = await resolveA(d.domain_name);
      const cnameOk = cnameRecords.some(c => c.includes("nexora") || c === APP_HOSTNAME);
      const aOk     = SERVER_IP !== "X.X.X.X" && aRecords.includes(SERVER_IP);
      const dnsOk   = cnameOk || aOk;

      await supabase.from("domains" as any).update({
        status: dnsOk ? "active" : d.status,
        last_checked_at: new Date().toISOString(),
      }).eq("id", domainId);

      await fetchDomains();
      return {
        success: dnsOk,
        cnameOk,
        aRecordOk: aOk,
        message: dnsOk
          ? "✅ DNS correctement configuré ! Votre domaine est actif."
          : `⏳ DNS pas encore propagé.\nCNAME trouvé : ${cnameRecords.join(", ") || "aucun"}\nA records : ${aRecords.join(", ") || "aucun"}\nAttendu : ${APP_HOSTNAME}`,
      };
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  // ── Supprimer un domaine
  const deleteDomain = async (domainId: string) => {
    setActionLoading(domainId + "-delete");
    setError(null);
    try {
      const user = getUser();
      const { error: deleteErr } = await supabase
        .from("domains" as any)
        .delete()
        .eq("id", domainId)
        .eq("user_id", user.id);

      if (deleteErr) throw new Error(deleteErr.message);
      setDomains(prev => prev.filter(d => d.id !== domainId));
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setActionLoading(null);
    }
  };

  return { domains, loading, actionLoading, error, fetchDomains, addDomain, verifyDomain, checkDNS, deleteDomain };
}
