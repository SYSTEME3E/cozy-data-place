/**
 * NEXORA — Affiliate Tracker (CORRIGÉ)
 *
 * BUGS CORRIGÉS :
 *  1. [CRITIQUE] trackAffiliateClick() insérait "affiliate_ref" dans la table affiliate_clicks
 *     mais affiliateService.ts et getAffiliateStats() cherchaient par "ref_code".
 *     → Colonne unifiée à "ref_code" dans tous les INSERT.
 *  2. [IMPORTANT] Ajout de logs d'erreur DB pour faciliter le débogage futur.
 *  3. [DEV] Le cooldown 24h est désactivable via ?dev_mode=1 dans l'URL pour tests locaux.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Constantes localStorage ───────────────────────────────────────────────
const REF_KEY         = "nexora_aff_ref";
const REF_EXPIRY_KEY  = "nexora_aff_ref_exp";
const COOLDOWN_PREFIX = "nexora_aff_cd_";
const EXPIRY_DAYS     = 30;
const CLICK_COOLDOWN  = 24 * 3600 * 1000; // 1 clic / 24h (anti-spam)

// ─── Mode développement : désactive le cooldown si ?dev_mode=1 ───────────
function isDevMode(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("dev_mode") === "1";
  } catch (_) {
    return false;
  }
}

// ─── Stockage du ref ────────────────────────────────────────────────────────

export function storeAffiliateRef(ref: string): void {
  const expiry = Date.now() + EXPIRY_DAYS * 24 * 3600 * 1000;
  localStorage.setItem(REF_KEY, ref);
  localStorage.setItem(REF_EXPIRY_KEY, String(expiry));
}

export function getStoredAffiliateRef(): string | null {
  const ref    = localStorage.getItem(REF_KEY);
  const expiry = localStorage.getItem(REF_EXPIRY_KEY);
  if (!ref || !expiry) return null;
  if (Date.now() > Number(expiry)) {
    clearAffiliateRef();
    return null;
  }
  return ref;
}

export function clearAffiliateRef(): void {
  localStorage.removeItem(REF_KEY);
  localStorage.removeItem(REF_EXPIRY_KEY);
}

// ─── Tracking des clics — FIX #1 : colonne "ref_code" unifiée ───────────────

/**
 * Enregistre un clic affilié dans affiliate_clicks.
 * Anti-spam : 1 enregistrement max par (ref + formation) toutes les 24h.
 * En mode dev (?dev_mode=1) le cooldown est ignoré pour faciliter les tests.
 *
 * @param ref         - Code affilié (ex: "abc123")
 * @param formationId - ID de la formation (null pour clic global)
 */
export async function trackAffiliateClick(
  ref: string,
  formationId: string | null = null
): Promise<void> {
  const cooldownKey = `${COOLDOWN_PREFIX}${ref}_${formationId ?? "global"}`;
  const lastClick   = localStorage.getItem(cooldownKey);

  // Bloquer si clic déjà enregistré dans les dernières 24h (sauf en dev mode)
  if (!isDevMode() && lastClick && Date.now() - Number(lastClick) < CLICK_COOLDOWN) {
    console.log("[Affiliate] Clic ignoré (cooldown actif). Ajoutez ?dev_mode=1 pour tester.");
    return;
  }

  try {
    const { error } = await (supabase as any)
      .from("affiliate_clicks")
      .insert({
        ref_code:     ref,          // FIX #1 : était "affiliate_ref", unifié à "ref_code"
        formation_id: formationId,
        created_at:   new Date().toISOString(),
        user_agent:   navigator.userAgent?.substring(0, 200) || null,
      });

    if (error) {
      // FIX #2 : log d'erreur DB explicite pour débogage
      console.error("[Affiliate] ❌ Erreur DB lors de l'enregistrement du clic:", error);
      console.error("[Affiliate] Détails:", { ref_code: ref, formation_id: formationId, error });
      return;
    }

    localStorage.setItem(cooldownKey, String(Date.now()));
    console.log(`[Affiliate] ✅ Clic enregistré — ref_code=${ref} formation=${formationId}`);
  } catch (err) {
    console.error("[Affiliate] ❌ Exception enregistrement clic:", err);
  }
}

// ─── Tracking des ventes ────────────────────────────────────────────────────

/**
 * Enregistre une vente affiliée dans affiliate_sales.
 * À appeler APRÈS confirmation du paiement.
 *
 * @param formationId      - ID de la formation achetée
 * @param commissionAmount - Montant de la commission (ex: 0.30 * prix)
 * @param buyerUserId      - (optionnel) ID de l'acheteur
 */
export async function trackAffiliateSale(
  formationId: string,
  commissionAmount: number,
  buyerUserId?: string
): Promise<void> {
  const ref = getStoredAffiliateRef();
  if (!ref) {
    console.log("[Affiliate] Aucun ref actif, vente non attribuée.");
    return;
  }

  try {
    const { error } = await (supabase as any)
      .from("affiliate_sales")
      .insert({
        affiliate_ref:     ref,
        formation_id:      formationId,
        commission_amount: commissionAmount,
        buyer_user_id:     buyerUserId ?? null,
        created_at:        new Date().toISOString(),
      });

    if (error) {
      console.error("[Affiliate] ❌ Erreur DB lors de l'enregistrement de la vente:", error);
      return;
    }

    console.log(`[Affiliate] ✅ Vente enregistrée — ref=${ref} commission=${commissionAmount}`);
  } catch (err) {
    console.error("[Affiliate] ❌ Exception enregistrement vente:", err);
  }
}
