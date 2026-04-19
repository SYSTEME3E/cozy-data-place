// src/lib/Moneroo.ts
// ─────────────────────────────────────────────────────────────────
// Client GeniusPay pour le frontend React
// Appelle les Supabase Edge Functions
// ─────────────────────────────────────────────────────────────────

import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

export type PaymentType =
  | "abonnement_premium"
  | "recharge_transfert";

export type PayoutType =
  | "retrait_transfert"
  | "retrait_boutique";

export interface InitPaymentParams {
  type: PaymentType;
  amount: number;
  currency?: string;
  payment_method?: string;
  metadata?: Record<string, string>;
}

export interface InitPayoutParams {
  type: PayoutType;
  amount: number;
  pays: string;
  reseau: string;
  numero_mobile: string;
  nom_beneficiaire: string;
  metadata?: Record<string, string>;
}

export interface GeniusPayResult {
  success: boolean;
  error?: string;
  payment_url?: string;
  payment_id?: string;
  payout_id?: string;
  message?: string;
}

// ─────────────────────────────────────────────
// MAPPING RÉSEAU → CODE GENIUSPAY
// ─────────────────────────────────────────────

export const RESEAU_CODES: Record<string, string> = {
  "wave":            "wave",
  "orange_money":    "orange_money",
  "mtn_money":       "mtn_money",
  "moov_money":      "moov_money",
  "Wave":            "wave",
  "Orange Money":    "orange_money",
  "MTN MoMo":        "mtn_money",
  "Moov Money":      "moov_money",
  "Wave CI":         "wave",
  "Orange Money CI": "orange_money",
  "MTN MoMo CI":     "mtn_money",
  "Orange Money SN": "orange_money",
  "Free Money":      "orange_money",
  "Flooz":           "moov_money",
  "T-Money":         "mtn_money",
};

// ─────────────────────────────────────────────
// FRAIS APPLIQUÉS
// ─────────────────────────────────────────────

export const FRAIS_PAIEMENT = 100;
export const TAUX_RETRAIT   = 0.07; // 7% sur les retraits uniquement (transferts = 0%)

export function calcFraisPaiement(_montant: number): number {
  return FRAIS_PAIEMENT;
}

export function calcFraisRetrait(montant: number): number {
  return Math.round(montant * TAUX_RETRAIT);
}

// ─────────────────────────────────────────────
// HELPER : extraire le vrai message d'erreur
// d'une FunctionsHttpError Supabase
// ─────────────────────────────────────────────

async function extractErrorMessage(error: any): Promise<string> {
  try {
    // FunctionsHttpError a un champ context.body ou context.responseBody
    if (error?.context?.responseBody) {
      const body = await error.context.responseBody.text?.();
      if (body) {
        const parsed = JSON.parse(body);
        // ✅ FIX : on cherche error/message, sinon on affiche le status HTTP, jamais "{}"
        return parsed?.error ?? parsed?.message
          ?? (parsed?.detail ? `Erreur GeniusPay : ${JSON.stringify(parsed.detail)}` : null)
          ?? body;
      }
    }
    if (error?.context?.body) {
      const raw = typeof error.context.body === "string"
        ? error.context.body
        : JSON.stringify(error.context.body);
      try {
        const parsed = JSON.parse(raw);
        // ✅ FIX : si l'objet parsé est vide ou sans message exploitable, on retourne un message générique clair
        if (!parsed || Object.keys(parsed).length === 0) {
          return "Erreur de paiement — vérifiez votre connexion et réessayez.";
        }
        return parsed?.error ?? parsed?.message
          ?? `Erreur GeniusPay (${raw})`;
      } catch {
        return raw || "Erreur inconnue";
      }
    }
  } catch (_) {}
  return error?.message ?? "Erreur inconnue";
}

// ─────────────────────────────────────────────
// INITIALISER UN PAIEMENT
// ─────────────────────────────────────────────

export async function initPayment(params: InitPaymentParams): Promise<GeniusPayResult> {
  const user = getNexoraUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  const frais            = params.type === "recharge_transfert" ? FRAIS_PAIEMENT : 0;
  const montantAvecFrais = params.amount + frais;

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

    if (error) {
      const msg = await extractErrorMessage(error);
      console.error("initPayment error détaillé:", msg);
      return { success: false, error: msg };
    }

    if (!data?.success) {
      return { success: false, error: data?.error ?? "Erreur paiement" };
    }

    return {
      success:     true,
      payment_url: data.payment_url,
      payment_id:  data.payment_id,
    };
  } catch (err: any) {
    const msg = await extractErrorMessage(err);
    console.error("initPayment exception:", msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────
// INITIER UN RETRAIT (payout)
// ─────────────────────────────────────────────

export async function initPayout(params: InitPayoutParams): Promise<GeniusPayResult> {
  const user = getNexoraUser();
  if (!user) return { success: false, error: "Utilisateur non connecté" };

  const frais      = calcFraisRetrait(params.amount);
  const montantNet = params.amount - frais;

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

    if (error) {
      const msg = await extractErrorMessage(error);
      console.error("initPayout error détaillé:", msg);
      return { success: false, error: msg };
    }

    if (!data?.success) {
      return { success: false, error: data?.error ?? "Erreur retrait" };
    }

    return {
      success:   true,
      payout_id: data.payout_id,
      message:   data.message,
    };
  } catch (err: any) {
    const msg = await extractErrorMessage(err);
    console.error("initPayout exception:", msg);
    return { success: false, error: msg };
  }
}

// ─────────────────────────────────────────────
// REDIRIGER VERS GENIUSPAY CHECKOUT
// ─────────────────────────────────────────────

export function redirectToCheckout(payment_url: string): void {
  window.location.href = payment_url;
}

// ─────────────────────────────────────────────
// PAIEMENT COMPLET (init + redirection)
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
// ─────────────────────────────────────────────

export async function verifyPaymentFromCallback(): Promise<{
  status: string;
  paymentId: string | null;
  type: string | null;
}> {
  const params    = new URLSearchParams(window.location.search);
  const reference = params.get("reference") ?? params.get("paymentId") ?? null;
  const type      = params.get("type");

  const isSuccess =
    params.get("status") === "success" ||
    params.get("payStatus") === "completed" ||
    (reference !== null && !params.has("error"));

  return {
    status:    isSuccess ? "success" : "failed",
    paymentId: reference,
    type,
  };
}
