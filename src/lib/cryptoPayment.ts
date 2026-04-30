/**
 * cryptoPayment.ts — Service NOWPayments
 * Réseaux acceptés : USDT-TRC20 (usdttrc20) & BNB (bnbbsc)
 */

const NOW_API_KEY = import.meta.env.VITE_NOWPAYMENTS_API_KEY || "23831S9-20P4KTB-Q1K33G7-EK133TJ";
const BASE = "https://api.nowpayments.io/v1";

// ─── Types ────────────────────────────────────────────────────────────────────
export type CryptoCurrency = "usdttrc20" | "bnbbsc";

export interface NowPayment {
  payment_id:     string;
  payment_status: PaymentStatus;
  pay_address:    string;
  pay_amount:     number;
  pay_currency:   string;
  price_amount:   number;
  price_currency: string;
  order_id:       string;
}

export type PaymentStatus =
  | "waiting"
  | "confirming"
  | "confirmed"
  | "sending"
  | "partially_paid"
  | "finished"
  | "failed"
  | "refunded"
  | "expired";

// ─── Config réseau ─────────────────────────────────────────────────────────────
export const CRYPTO_NETWORKS: Record<CryptoCurrency, {
  label:    string;
  symbol:   string;
  network:  string;
  color:    string;
  bgColor:  string;
}> = {
  usdttrc20: {
    label:   "USDT TRC-20",
    symbol:  "USDT",
    network: "Réseau TRON (TRC-20)",
    color:   "#26A17B",
    bgColor: "#E8F8F3",
  },
  bnbbsc: {
    label:   "BNB",
    symbol:  "BNB",
    network: "BNB Smart Chain (BSC)",
    color:   "#F3BA2F",
    bgColor: "#FEF9E7",
  },
};

// ─── API ───────────────────────────────────────────────────────────────────────

/** Crée un paiement NOWPayments et retourne l'adresse de dépôt. */
export async function createCryptoPayment(params: {
  price_amount:      number;
  price_currency:    string;
  pay_currency:      CryptoCurrency;
  order_id:          string;
  order_description: string;
}): Promise<NowPayment> {
  const res = await fetch(`${BASE}/payment`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": NOW_API_KEY,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as any).message || `Erreur NOWPayments (${res.status})`
    );
  }
  return res.json();
}

/** Vérifie le statut d'un paiement. */
export async function getPaymentStatus(paymentId: string): Promise<{
  payment_id:     string;
  payment_status: PaymentStatus;
  pay_address:    string;
  pay_amount:     number;
  actually_paid:  number;
}> {
  const res = await fetch(`${BASE}/payment/${paymentId}`, {
    headers: { "x-api-key": NOW_API_KEY },
  });
  if (!res.ok) throw new Error("Erreur lors de la vérification du paiement.");
  return res.json();
}

/** Helpers statut */
export const isComplete = (s: PaymentStatus) =>
  ["finished", "confirmed"].includes(s);

export const isFailed = (s: PaymentStatus) =>
  ["failed", "expired", "refunded"].includes(s);

export const isPending = (s: PaymentStatus) =>
  ["waiting", "confirming", "sending", "partially_paid"].includes(s);

/** Extrait les wallets crypto depuis moyens_paiement d'un produit */
export interface CryptoWallet {
  reseau:     CryptoCurrency;
  adresse:    string;
  prix_usdt:  number;
}

export function getCryptoWallets(moyensPaiement: any[]): CryptoWallet[] {
  if (!Array.isArray(moyensPaiement)) return [];
  return moyensPaiement
    .filter((m) => m.reseau === "USDT-TRC20" || m.reseau === "BNB")
    .map((m) => ({
      reseau:    m.reseau === "USDT-TRC20" ? "usdttrc20" : "bnbbsc",
      adresse:   m.numero || "",
      prix_usdt: parseFloat(m.instructions || "0") || 0,
    }));
}

/** Vérifie si les paiements crypto sont activés */
export function hasCryptoEnabled(moyensPaiement: any[]): boolean {
  return getCryptoWallets(moyensPaiement).length > 0;
}
