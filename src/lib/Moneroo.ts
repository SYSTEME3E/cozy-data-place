// src/lib/Moneroo.ts
// ─────────────────────────────────────────────────────────────────
// Client GeniusPay pour le frontend React
// Appelle les Supabase Edge Functions (jamais l'API GeniusPay directement)
// ─────────────────────────────────────────────────────────────────

import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PaymentType =
  | "abonnement_premium"
  | "recharge_transfert"
  | "depot_epargne";

export type PayoutType =
  | "retrait_epargne"
  | "retrait_transfert"
  | "retrait_boutique";

export interface InitPaymentParams {
  type: PaymentType;
  amount: number;           // En FCFA (aucun frais ajouté)
  currency?: string;
  payment_method?: string;  // "wave" | "orange_money" | "mtn_money" | "moov_money"
  metadata?: Record<string, string>;
}

export interface InitPayoutParams {
  type: PayoutType;
  amount: number;           // Montant brut demandé (les 3% sont calculés ici)
  pays: string;
  reseau: string;           // Code réseau ex: "wave", "orange_money", "mtn_money"
  numero_mobile: string;    // Ex: "+229 97 00 11 22"
  nom_beneficiaire: string;
  metadata?: Record<string, string>;
}

export interface GeniusPayResult {
  success: boolean;
  error?: string;
  payment_url?: string;     // Pour les paiements → redirection
  payment_id?: string;
  payout_id?: string;
  message?: string;
}

// ─────────────────────────────────────────────
// MAPPING RÉSEAU → CODE GENIUSPAY
// ─────────────────────────────────────────────

export const RESEAU_CODES: Record<string, string> = {
  // Codes directs GeniusPay
  "wave":         "wave",
  "orange_money": "orange_money",
  "mtn_money":    "mtn_money",
  "moov_money":   "moov_money",
  // Noms affichés → codes
  "Wave":         "wave",
  "Orange Money": "orange_money",
  "MTN MoMo":     "mtn_money",
  "Moov Money":   "moov_money",
  // Variantes régionales
  "Wave CI":          "wave",
  "Orange Money CI":  "orange_money",
  "MTN MoMo CI":      "mtn_money",
  "Orange Money SN":  "orange_money",
  "Free Money":       "orange_money",
  "Flooz":            "moov_money",
  "T-Money":          "mtn_money",
};

// ─────────────────────────────────────────────
// FRAIS APPLIQUÉS
// Paiement/recharge : GRATUIT (0 FCFA)
// Retrait/transfert : 3% du montant
// ─────────────────────────────────────────────

export const FRAIS_PAIEMENT = 0; // GRATUIT
export const TAUX_RETRAIT   = 0.03; // 3%

export function calcFraisPaiement(_montant: number): number {
  return 0; // Gratuit
}

export function calcFraisRetrait(montant: number): number {
  return Math.round(montant * TAUX_RETRAIT);
}

// ─────────────────────────────────────────────
// INITIALISER UN PAIEMENT
// (recharge, abonnement, dépôt)
// Les 100 FCFA de frais sont ajoutés au montant envoyé à GeniusPay
// ─────────────────────────────────────────────

export async function initPayment(params: InitPaymentParams): Promise<GeniusPayResult> {
  const user = getNexoraUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  // Montant final = montant (recharge gratuite, aucun frais)
  const montantAvecFrais = params.amount;

  try {
    const { data, error } = await supabase.functions.invoke("geniuspay-payment", {
      body: {
        type:           params.type,
        amount:         montantAvecFrais,
        amount_net:     params.amount,
        currency:       params.currency ?? "XOF",
        payment_method: params.payment_method,
        user_id:        user.id,
        user_email:     user.email ?? "",
        user_name:      user.nom_prenom ?? "Client NEXORA",
        user_phone:     "",
        metadata:       params.metadata ?? {},
      },
    });

    if (error) throw error;
    if (!data?.success) return { success: false, error: data?.error ?? "Erreur paiement" };

    return {
      success:     true,
      payment_url: data.payment_url,
      payment_id:  data.payment_id,
    };
  } catch (err: any) {
    console.error("initPayment error:", err);
    return { success: false, error: err.message ?? "Erreur réseau" };
  }
}

// ─────────────────────────────────────────────
// INITIER UN RETRAIT (payout)
// Les 3% de frais sont calculés et déduits du montant reçu
// ─────────────────────────────────────────────

export async function initPayout(params: InitPayoutParams): Promise<GeniusPayResult> {
  const user = getNexoraUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  const frais       = calcFraisRetrait(params.amount);
  const montantNet  = params.amount - frais;

  const parts     = params.nom_beneficiaire.trim().split(" ");
  const firstName = parts[0] ?? "Client";
  const lastName  = parts.slice(1).join(" ") || "NEXORA";

  try {
    const { data, error } = await supabase.functions.invoke("geniuspay-payout", {
      body: {
        type:            params.type,
        amount:          params.amount,
        amount_net:      montantNet,
        frais:           frais,
        user_id:         user.id,
        user_email:      user.email ?? "",
        user_first_name: firstName,
        user_last_name:  lastName,
        pays:            params.pays,
        reseau:          params.reseau,
        numero_mobile:   params.numero_mobile.replace(/[\s\-()+]/g, ""),
        metadata:        params.metadata ?? {},
      },
    });

    if (error) throw error;
    if (!data?.success) return { success: false, error: data?.error ?? "Erreur retrait" };

    return {
      success:   true,
      payout_id: data.payout_id,
      message:   data.message,
    };
  } catch (err: any) {
    console.error("initPayout error:", err);
    return { success: false, error: err.message ?? "Erreur réseau" };
  }
}

// ─────────────────────────────────────────────
// REDIRIGER VERS GENIUSPAY CHECKOUT
// ─────────────────────────────────────────────

export function redirectToCheckout(payment_url: string): void {
  window.open(payment_url, "_blank");
}

// ─────────────────────────────────────────────
// PAIEMENT COMPLET (init + redirect)
// ─────────────────────────────────────────────

export async function payAndRedirect(params: InitPaymentParams): Promise<void> {
  const result = await initPayment(params);
  if (result.success && result.payment_url) {
    redirectToCheckout(result.payment_url);
  } else {
    throw new Error(result.error ?? "Impossible d'initialiser le paiement");
  }
}

// ─────────────────────────────────────────────
// VÉRIFIER UN PAIEMENT APRÈS RETOUR
// Appelé sur la page /payment/callback
// GeniusPay redirige vers success_url ou error_url
// ─────────────────────────────────────────────

export async function verifyPaymentFromCallback(): Promise<{
  status: string;
  paymentId: string | null;
  type: string | null;
}> {
  const params    = new URLSearchParams(window.location.search);
  const reference = params.get("reference") ?? params.get("paymentId") ?? null;
  const type      = params.get("type");
  // GeniusPay redirige vers success_url en cas de succès
  // On détecte le succès via la présence du paramètre "reference" dans l'URL
  const isSuccess = params.get("status") === "success"
    || params.get("paymentStatus") === "completed"
    || (reference !== null && !params.has("error"));

  return {
    status:    isSuccess ? "success" : "failed",
    paymentId: reference,
    type,
  };
}
