// src/lib/kkiapay.ts
// ─────────────────────────────────────────────────────────────────
// Service KKiaPay — remplace GeniusPay/Moneroo
// Widget popup côté client — mode LIVE
// ─────────────────────────────────────────────────────────────────

export const KKIAPAY_PUBLIC_KEY = import.meta.env.VITE_KKIAPAY_PUBLIC_KEY ?? "f19f84bbf2bbe4249947974bc0929691d3afd5ae";
export const KKIAPAY_SANDBOX    = import.meta.env.VITE_KKIAPAY_SANDBOX === "true"; // false en prod, true en dev

// ─────────────────────────────────────────────
// FRAIS & TAUX
// ─────────────────────────────────────────────
export const FRAIS_PAIEMENT  = 100;
export const TAUX_RETRAIT    = 0.07; // 7%

export function calcFraisPaiement(_montant: number): number {
  return FRAIS_PAIEMENT;
}
export function calcFraisRetrait(montant: number): number {
  return Math.round(montant * TAUX_RETRAIT);
}

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────
export interface KkiapayWidgetOptions {
  amount: number;
  name?: string;
  phone?: string;
  email?: string;
  data?: string;       // metadata stringify
  callback?: string;   // URL de redirection après succès
  reason?: string;     // description du paiement
}

export type KkiapaySuccessResponse = {
  transactionId: string;
};

// ─────────────────────────────────────────────
// LOADER DU SCRIPT CDN (idempotent)
// ─────────────────────────────────────────────
let scriptLoaded = false;

export function loadKkiapayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptLoaded || typeof (window as any).openKkiapayWidget === "function") {
      scriptLoaded = true;
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://cdn.kkiapay.me/k.js"]');
    if (existing) {
      existing.addEventListener("load", () => { scriptLoaded = true; resolve(); });
      existing.addEventListener("error", reject);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.kkiapay.me/k.js";
    script.async = true;
    script.onload  = () => { scriptLoaded = true; resolve(); };
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

// ─────────────────────────────────────────────
// OUVRIR LE WIDGET
// ─────────────────────────────────────────────
export async function openKkiapay(options: KkiapayWidgetOptions): Promise<void> {
  await loadKkiapayScript();
  const open = (window as any).openKkiapayWidget;
  if (typeof open !== "function") throw new Error("KKiaPay widget non disponible");
  open({
    amount:   options.amount,
    key:      KKIAPAY_PUBLIC_KEY,
    sandbox:  KKIAPAY_SANDBOX,
    name:     options.name     ?? "",
    phone:    options.phone    ?? "",
    email:    options.email    ?? "",
    data:     options.data     ?? "",
    callback: options.callback ?? "",
    reason:   options.reason   ?? "Paiement NEXORA",
  });
}

// ─────────────────────────────────────────────
// LISTENERS (wrappent les fonctions globales du CDN)
// ─────────────────────────────────────────────
export async function onKkiapaySuccess(
  cb: (res: KkiapaySuccessResponse) => void
): Promise<void> {
  await loadKkiapayScript();
  const addSuccess = (window as any).addSuccessListener;
  if (typeof addSuccess === "function") addSuccess(cb);
}

export async function onKkiapayFailed(
  cb: (err: any) => void
): Promise<void> {
  await loadKkiapayScript();
  const addFailed = (window as any).addFailedListener;
  if (typeof addFailed === "function") addFailed(cb);
}

export async function removeKkiapayListeners(): Promise<void> {
  await loadKkiapayScript();
  const remove = (window as any).removeKkiapayListener;
  if (typeof remove === "function") {
    remove("success");
    remove("failed");
  }
}
