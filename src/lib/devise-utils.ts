// ─── Utilitaires de formatage de devise ───────────────────────────────────────
// Utilisé dans toutes les pages produit de la boutique

export const DEVISES_SYMBOLES: Record<string, string> = {
  XOF: "FCFA",
  XAF: "FCFA",
  GHS: "₵",
  NGN: "₦",
  KES: "KSh",
  TZS: "TSh",
  UGX: "USh",
  RWF: "RF",
  GNF: "GNF",
  CDF: "FC",
  MAD: "MAD",
  GMD: "GMD",
  SLL: "SLL",
  LRD: "L$",
  MZN: "MT",
  ZMW: "ZMW",
  USD: "$",
  EUR: "€",
};

/** Retourne le symbole d'une devise à partir de son code ISO */
export function getSymboleDevise(code: string): string {
  return DEVISES_SYMBOLES[code] ?? code;
}

/**
 * Formate un prix avec le bon symbole de devise.
 * - USD / LRD : symbole AVANT  ($12.50, L$500)
 * - EUR       : symbole APRÈS  (12,50 €)
 * - Autres    : symbole APRÈS  (1 500 FCFA, 200 ₦, …)
 */
export function formatPrix(prix: number, deviseCode: string = "XOF"): string {
  const symbole = getSymboleDevise(deviseCode);

  if (["USD", "LRD"].includes(deviseCode)) {
    return `${symbole}${prix.toFixed(2)}`;
  }
  if (deviseCode === "EUR") {
    return `${new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(prix)} €`;
  }
  // Toutes les devises africaines : entier + symbole
  const entier = Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
  return `${entier} ${symbole}`;
}
