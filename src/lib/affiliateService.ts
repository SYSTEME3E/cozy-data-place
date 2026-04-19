/**
 * NEXORA — Service d'affiliation formations (CORRIGÉ)
 *
 * BUGS CORRIGÉS :
 *  1. [CRITIQUE] AffiliateStats retournait totalClics/totalVentes/totalCommissions
 *     mais AffiliateStatsPage.tsx lisait stats.totalClicks / stats.totalSales / stats.totalRevenue
 *     → Champs renommés pour correspondre au frontend.
 *  2. [CRITIQUE] getAffiliateStats() cherchait les clics par "ref_code"
 *     mais affiliateTracker.ts insère avec "affiliate_ref" → colonne unifiée à "ref_code".
 *  3. [CRITIQUE] getAffiliateStats() cherchait les ventes par "referrer_id" (userId)
 *     mais AffiliateStatsPage.tsx les cherchait par "affiliate_ref" (ref_code).
 *     → getAffiliateStats prend maintenant le refCode ET le userId.
 *  4. [IMPORTANT] SaleHistory.commission → commission_amount pour correspondre
 *     à l'affichage dans AffiliateStatsPage.tsx (sale.commission_amount).
 *  5. [IMPORTANT] trackAffiliateClick insère maintenant "ref_code" (cohérence BDD).
 */

import { supabase } from "@/integrations/supabase/client";

const AFFILIATE_REF_KEY       = "nexora_affiliate_ref";
const AFFILIATE_FORMATION_KEY = "nexora_affiliate_formation";

// ─── Stockage local du code affilié ──────────────────────────────────────────

export function saveAffiliateRef(ref: string): void {
  if (!ref || ref === "public") return;
  try {
    localStorage.setItem(AFFILIATE_REF_KEY, ref);
    sessionStorage.setItem(AFFILIATE_REF_KEY, ref);
    document.cookie = `${AFFILIATE_REF_KEY}=${encodeURIComponent(ref)}; path=/; max-age=31536000; SameSite=Lax`;
  } catch (_) {}
}

export function saveAffiliateFormation(formationId: string): void {
  try {
    localStorage.setItem(AFFILIATE_FORMATION_KEY, formationId);
    sessionStorage.setItem(AFFILIATE_FORMATION_KEY, formationId);
  } catch (_) {}
}

export function getAffiliateRef(): string | null {
  try {
    const ls = localStorage.getItem(AFFILIATE_REF_KEY);
    if (ls) return ls;
    const ss = sessionStorage.getItem(AFFILIATE_REF_KEY);
    if (ss) return ss;
    const match = document.cookie.match(
      new RegExp(`(?:^|; )${AFFILIATE_REF_KEY}=([^;]*)`)
    );
    return match ? decodeURIComponent(match[1]) : null;
  } catch (_) {
    return null;
  }
}

export function getAffiliateFormation(): string | null {
  try {
    return (
      localStorage.getItem(AFFILIATE_FORMATION_KEY) ||
      sessionStorage.getItem(AFFILIATE_FORMATION_KEY)
    );
  } catch (_) {
    return null;
  }
}

export function clearAffiliateRef(): void {
  try {
    localStorage.removeItem(AFFILIATE_REF_KEY);
    sessionStorage.removeItem(AFFILIATE_REF_KEY);
    document.cookie = `${AFFILIATE_REF_KEY}=; path=/; max-age=0`;
  } catch (_) {}
}

export function clearAffiliateFormation(): void {
  try {
    localStorage.removeItem(AFFILIATE_FORMATION_KEY);
    sessionStorage.removeItem(AFFILIATE_FORMATION_KEY);
  } catch (_) {}
}

// ─── Résolution referrer_id ───────────────────────────────────────────────────

export async function getReferrerIdFromCode(refCode: string): Promise<string | null> {
  if (!refCode || refCode === "public") return null;
  try {
    const { data: byRef } = await (supabase as any)
      .from("nexora_users")
      .select("id")
      .eq("ref_code", refCode)
      .maybeSingle();
    if (byRef) return (byRef as any).id;

    const { data: byId } = await (supabase as any)
      .from("nexora_users")
      .select("id")
      .eq("id", refCode)
      .maybeSingle();
    return byId ? (byId as any).id : null;
  } catch (_) {
    return null;
  }
}

// ─── Génération du lien affilié ──────────────────────────────────────────────

export async function buildAffiliateLink(
  formationId: string,
  userId: string
): Promise<string> {
  const { data } = await (supabase as any)
    .from("nexora_users")
    .select("ref_code")
    .eq("id", userId)
    .maybeSingle();
  const code = (data as any)?.ref_code || userId;
  return `${window.location.origin}/formations/${formationId}?ref=${code}`;
}

// ─── Enregistrement d'un clic affilié ────────────────────────────────────────

/** Hash léger pour déduplication (user-agent + date) */
async function hashString(str: string): Promise<string> {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .substring(0, 16);
  } catch (_) {
    return str.substring(0, 16);
  }
}

// FIX #5 : colonne unifiée → "ref_code" dans affiliate_clicks
export async function trackAffiliateClick(
  refCode: string,
  formationId?: string
): Promise<void> {
  if (!refCode || refCode === "public") return;
  try {
    const ua = navigator.userAgent || "";
    const ipHash = await hashString(ua + new Date().toDateString());

    const { error } = await (supabase as any).from("affiliate_clicks").insert({
      ref_code:     refCode,   // ← colonne unifiée (était "affiliate_ref" dans affiliateTracker)
      formation_id: formationId || null,
      ip_hash:      ipHash,
      user_agent:   ua.substring(0, 200),
    });

    if (error) {
      console.error("[affiliateService] trackAffiliateClick DB error:", error);
    } else {
      console.log(`[affiliateService] ✅ Clic enregistré — ref_code=${refCode}`);
    }
  } catch (err) {
    console.error("[affiliateService] trackAffiliateClick error:", err);
  }
}

// ─── Interface AffiliateStats — FIX #1 : champs alignés avec AffiliateStatsPage ─

export interface SaleHistory {
  id: string;
  formation_id: string;
  formation_titre: string;
  commission_amount: number;   // FIX #4 : était "commission", la page lit "commission_amount"
  status: "pending" | "validated" | "paid";
  created_at: string;
}

export interface AffiliateStats {
  totalClicks: number;        // FIX #1 : était totalClics
  totalSales: number;         // FIX #1 : était totalVentes
  totalRevenue: number;       // FIX #1 : était totalCommissions
  ventesEnAttente: number;
  ventesValidees: number;
  tauxConversion: number;
  ventesByFormation: { titre: string; count: number; commission: number }[];
  salesHistory: SaleHistory[];
}

// ─── Récupération des stats affilié — FIX #2 & #3 ────────────────────────────

/**
 * @param userId  - ID de l'utilisateur (pour chercher ses ventes via referrer_id)
 * Le refCode est résolu en interne depuis nexora_users.
 */
export async function getAffiliateStats(userId: string): Promise<AffiliateStats> {
  const empty: AffiliateStats = {
    totalClicks: 0,
    totalSales: 0,
    totalRevenue: 0,
    ventesEnAttente: 0,
    ventesValidees: 0,
    tauxConversion: 0,
    ventesByFormation: [],
    salesHistory: [],
  };

  try {
    // 1. Récupérer le ref_code
    const { data: userData } = await (supabase as any)
      .from("nexora_users")
      .select("ref_code")
      .eq("id", userId)
      .maybeSingle();
    const refCode: string = (userData as any)?.ref_code || userId;

    // 2. Clics par ref_code (FIX #2 : colonne unifiée "ref_code")
    const { count: totalClicks, error: clickError } = await (supabase as any)
      .from("affiliate_clicks")
      .select("*", { count: "exact", head: true })
      .eq("ref_code", refCode);

    if (clickError) {
      console.error("[affiliateService] getAffiliateStats clics error:", clickError);
    }

    // 3. Ventes par referrer_id = userId (FIX #3 : cohérent avec recordAffiliateSale)
    const { data: salesRaw, error: salesError } = await (supabase as any)
      .from("affiliate_sales")
      .select(`id, formation_id, commission, status, created_at, formations(titre)`)
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });

    if (salesError) {
      console.error("[affiliateService] getAffiliateStats ventes error:", salesError);
    }

    const sales: any[] = salesRaw || [];

    const totalSales       = sales.length;
    const ventesEnAttente  = sales.filter((s) => s.status === "pending").length;
    const ventesValidees   = sales.filter((s) => s.status === "validated" || s.status === "paid").length;
    const totalRevenue     = sales
      .filter((s) => s.status === "validated" || s.status === "paid")
      .reduce((sum, s) => sum + Number(s.commission ?? 0), 0);
    const tauxConversion   = (totalClicks ?? 0) > 0
      ? Number(((totalSales / (totalClicks ?? 1)) * 100).toFixed(1))
      : 0;

    // 4. Agrégation par formation
    const byFormation: Record<string, { titre: string; count: number; commission: number }> = {};
    for (const s of sales) {
      const fid = s.formation_id;
      if (!byFormation[fid]) {
        byFormation[fid] = {
          titre:      (s.formations as any)?.titre || "Formation inconnue",
          count:      0,
          commission: 0,
        };
      }
      byFormation[fid].count += 1;
      if (s.status !== "pending") byFormation[fid].commission += Number(s.commission ?? 0);
    }

    // 5. Historique — FIX #4 : champ renommé commission_amount
    const salesHistory: SaleHistory[] = sales.slice(0, 20).map((s) => ({
      id:               s.id,
      formation_id:     s.formation_id,
      formation_titre:  (s.formations as any)?.titre || "Formation",
      commission_amount: Number(s.commission ?? 0),   // FIX #4
      status:           s.status,
      created_at:       s.created_at,
    }));

    return {
      totalClicks:        totalClicks ?? 0,
      totalSales,
      totalRevenue,
      ventesEnAttente,
      ventesValidees,
      tauxConversion,
      ventesByFormation:  Object.values(byFormation),
      salesHistory,
    };
  } catch (err) {
    console.error("[affiliateService] getAffiliateStats error:", err);
    return empty;
  }
}

// ─── Historique détaillé ──────────────────────────────────────────────────────

export interface AffiliateSale {
  id: string;
  buyer_id: string;
  formation_id: string;
  amount: number;
  commission: number;
  status: "pending" | "validated" | "paid";
  created_at: string;
  formations?: { titre: string; image_url?: string | null };
  buyer?: { nom_prenom: string; username: string };
}

export async function getAffiliateSales(userId: string): Promise<AffiliateSale[]> {
  try {
    const { data } = await (supabase as any)
      .from("affiliate_sales")
      .select(`
        id, buyer_id, formation_id, amount, commission, status, created_at,
        formations(titre, image_url),
        buyer:nexora_users!affiliate_sales_buyer_id_fkey(nom_prenom, username)
      `)
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false });
    return (data as AffiliateSale[]) || [];
  } catch (_) {
    return [];
  }
}

// ─── Enregistrement d'une vente affiliée ─────────────────────────────────────

export async function recordAffiliateSale({
  referrerId,
  buyerId,
  formationId,
  purchaseId,
  amount,
  currency = "XOF",
}: {
  referrerId: string;
  buyerId: string;
  formationId: string;
  purchaseId: string;
  amount: number;
  currency?: string;
}): Promise<void> {
  if (!referrerId || referrerId === buyerId) return;
  try {
    const commission = Math.round(amount * 0.3);
    const { error } = await (supabase as any).from("affiliate_sales").insert({
      referrer_id:  referrerId,
      buyer_id:     buyerId,
      formation_id: formationId,
      purchase_id:  purchaseId,
      amount,
      commission,
      currency,
      status: "validated",
    });
    if (error) {
      console.error("[affiliateService] recordAffiliateSale DB error:", error);
    } else {
      console.log(`[affiliateService] ✅ Vente enregistrée — referrer=${referrerId} commission=${commission}`);
    }
  } catch (err) {
    console.error("[affiliateService] recordAffiliateSale error:", err);
  }
}
