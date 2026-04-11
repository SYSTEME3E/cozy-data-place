// ─────────────────────────────────────────────────────────────────────────────
// lib/devise-context.tsx — Système de devise global NEXORA
// • Persiste dans localStorage (survit aux rechargements / changements de page)
// • Taux de change live via exchangerate-api (fallback sur taux internes)
// • useDevise() utilisable sur toutes les pages
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";

// ─── Liste des devises supportées ─────────────────────────────────────────────
export const DEVISES_LISTE = [
  { code: "XOF", label: "XOF — Franc CFA UEMOA",  symbole: "FCFA", pays: ["BJ","CI","TG","SN","ML","BF","NE","GW"] },
  { code: "XAF", label: "XAF — Franc CFA CEMAC",  symbole: "FCFA", pays: ["CM","GA","CG","CD","CF","TD"] },
  { code: "USD", label: "USD — Dollar américain",  symbole: "$",    pays: [] },
  { code: "EUR", label: "EUR — Euro",              symbole: "€",    pays: [] },
  { code: "GNF", label: "GNF — Franc guinéen",     symbole: "GNF",  pays: ["GN"] },
  { code: "GHS", label: "GHS — Cédi ghanéen",      symbole: "₵",    pays: ["GH"] },
  { code: "NGN", label: "NGN — Naira nigérian",    symbole: "₦",    pays: ["NG"] },
  { code: "KES", label: "KES — Shilling kényan",   symbole: "KSh",  pays: ["KE"] },
  { code: "TZS", label: "TZS — Shilling tanzanien",symbole: "TSh",  pays: ["TZ"] },
  { code: "UGX", label: "UGX — Shilling ougandais",symbole: "USh",  pays: ["UG"] },
  { code: "RWF", label: "RWF — Franc rwandais",    symbole: "RF",   pays: ["RW"] },
  { code: "MAD", label: "MAD — Dirham marocain",   symbole: "MAD",  pays: ["MA"] },
  { code: "GBP", label: "GBP — Livre sterling",    symbole: "£",    pays: [] },
  { code: "GMD", label: "GMD — Dalasi gambien",    symbole: "GMD",  pays: ["GM"] },
  { code: "SLL", label: "SLL — Leone sierra-léon.",symbole: "SLL",  pays: ["SL"] },
  { code: "ZMW", label: "ZMW — Kwacha zambien",    symbole: "ZMW",  pays: ["ZM"] },
  { code: "CDF", label: "CDF — Franc congolais",   symbole: "FC",   pays: ["CD"] },
  { code: "MZN", label: "MZN — Metical mozamb.",   symbole: "MT",   pays: ["MZ"] },
] as const;

export type DeviseCode = typeof DEVISES_LISTE[number]["code"];

// ─── Taux de fallback (XOF → devise) ──────────────────────────────────────────
// Utilisés si l'API est indisponible
const FALLBACK_RATES_FROM_XOF: Record<string, number> = {
  XOF: 1,
  XAF: 1,        // parité fixe 1:1
  USD: 0.00163,
  EUR: 0.00152,
  GNF: 14.8,
  GHS: 0.024,
  NGN: 2.55,
  KES: 0.21,
  TZS: 4.32,
  UGX: 6.12,
  RWF: 1.92,
  MAD: 0.016,
  GBP: 0.00128,
  GMD: 0.109,
  SLL: 22.5,
  ZMW: 0.044,
  CDF: 4.6,
  MZN: 0.104,
};

const STORAGE_KEY      = "nexora-devise";
const RATES_CACHE_KEY  = "nexora-rates-cache";
const RATES_TTL_MS     = 60 * 60 * 1000; // 1h entre deux appels API

// ─── Contexte ─────────────────────────────────────────────────────────────────
interface DeviseContextValue {
  devise: DeviseCode;
  setDevise: (d: DeviseCode) => void;
  /** Convertit un montant XOF vers la devise active */
  fromXOF: (montantXOF: number) => number;
  /** Formate un montant XOF en devise active avec symbole */
  fmtXOF: (montantXOF: number) => string;
  /** Formate un montant déjà dans une devise donnée */
  fmtRaw: (montant: number, code: DeviseCode) => string;
  /** Symbole de la devise active */
  symbole: string;
  /** Taux XOF → devise active */
  taux: number;
  ratesLoading: boolean;
  ratesFresh: boolean; // true = taux live, false = taux fallback
  lastUpdated: Date | null;
}

const DeviseContext = createContext<DeviseContextValue | null>(null);

// ─── Helpers formatage ────────────────────────────────────────────────────────
function getSymbole(code: DeviseCode): string {
  return DEVISES_LISTE.find(d => d.code === code)?.symbole ?? code;
}

function formatMontant(montant: number, code: DeviseCode): string {
  const symbole = getSymbole(code);
  const rounded = code === "USD" || code === "EUR" || code === "GBP"
    ? Number(montant.toFixed(2))
    : Math.round(montant);
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded);
  // Symboles avant le montant
  if (["USD", "GBP"].includes(code)) return `${symbole}${formatted}`;
  if (code === "EUR")                 return `${formatted} €`;
  return `${formatted} ${symbole}`;
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function DeviseProvider({ children }: { children: React.ReactNode }) {
  const [devise, setDeviseState] = useState<DeviseCode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as DeviseCode | null;
      if (stored && DEVISES_LISTE.find(d => d.code === stored)) return stored;
    } catch {}
    return "XOF";
  });

  const [rates, setRates]               = useState<Record<string, number>>(FALLBACK_RATES_FROM_XOF);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [ratesFresh, setRatesFresh]     = useState(false);
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const fetchingRef = useRef(false);

  // ── Chargement des taux depuis l'API (avec cache localStorage) ──────────────
  const fetchRates = useCallback(async (force = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setRatesLoading(true);

    try {
      // Vérifier le cache
      if (!force) {
        try {
          const cached = localStorage.getItem(RATES_CACHE_KEY);
          if (cached) {
            const { ts, data } = JSON.parse(cached);
            if (Date.now() - ts < RATES_TTL_MS) {
              setRates(data);
              setRatesFresh(true);
              setLastUpdated(new Date(ts));
              setRatesLoading(false);
              fetchingRef.current = false;
              return;
            }
          }
        } catch {}
      }

      // Appel API exchangerate-api (gratuit, sans clé pour EUR base)
      // On utilise XOF comme base via USD pivot
      const res = await fetch(
        "https://open.er-api.com/v6/latest/XOF",
        { signal: AbortSignal.timeout(8000) }
      );

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.rates) {
        // Construire la table XOF → devise
        const newRates: Record<string, number> = { XOF: 1 };
        for (const d of DEVISES_LISTE) {
          if (d.code === "XOF") continue;
          if (json.rates[d.code] != null) {
            newRates[d.code] = json.rates[d.code];
          } else {
            newRates[d.code] = FALLBACK_RATES_FROM_XOF[d.code] ?? 1;
          }
        }
        // XAF toujours 1:1 avec XOF (parité fixe BEAC/BCEAO)
        newRates["XAF"] = 1;

        setRates(newRates);
        setRatesFresh(true);
        const now = Date.now();
        setLastUpdated(new Date(now));
        try {
          localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ts: now, data: newRates }));
        } catch {}
      }
    } catch (err) {
      console.warn("[Nexora Devise] API indisponible, taux de fallback utilisés.", err);
      setRatesFresh(false);
    } finally {
      setRatesLoading(false);
      fetchingRef.current = false;
    }
  }, []);

  // Chargement initial + rafraîchissement toutes les heures
  useEffect(() => {
    fetchRates();
    const interval = setInterval(() => fetchRates(true), RATES_TTL_MS);
    return () => clearInterval(interval);
  }, [fetchRates]);

  // ── Changement de devise ────────────────────────────────────────────────────
  const setDevise = useCallback((d: DeviseCode) => {
    setDeviseState(d);
    try { localStorage.setItem(STORAGE_KEY, d); } catch {}
  }, []);

  // ── Helpers de conversion ───────────────────────────────────────────────────
  const taux = rates[devise] ?? FALLBACK_RATES_FROM_XOF[devise] ?? 1;

  const fromXOF = useCallback((montantXOF: number) => {
    const t = rates[devise] ?? FALLBACK_RATES_FROM_XOF[devise] ?? 1;
    return montantXOF * t;
  }, [rates, devise]);

  const fmtXOF = useCallback((montantXOF: number) => {
    return formatMontant(fromXOF(montantXOF), devise);
  }, [fromXOF, devise]);

  const fmtRaw = useCallback((montant: number, code: DeviseCode) => {
    return formatMontant(montant, code);
  }, []);

  const symbole = getSymbole(devise);

  return (
    <DeviseContext.Provider value={{
      devise, setDevise,
      fromXOF, fmtXOF, fmtRaw,
      symbole, taux,
      ratesLoading, ratesFresh, lastUpdated,
    }}>
      {children}
    </DeviseContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useDevise(): DeviseContextValue {
  const ctx = useContext(DeviseContext);
  if (!ctx) throw new Error("useDevise() doit être utilisé dans <DeviseProvider>");
  return ctx;
}
