/**
 * useIsNativeApp — Détecte si l'application tourne dans un contexte natif Capacitor
 * (Android / iOS) par opposition à un navigateur web classique.
 *
 * Logique de détection (3 niveaux, du plus fiable au plus général) :
 *
 *  1. window.Capacitor?.isNative  → true uniquement dans l'app native Capacitor
 *  2. window.Capacitor?.platform  → "android" | "ios" dans l'app, "web" dans le browser
 *  3. Fallback URL scheme          → l'app Android utilise "https://localhost" (AndroidScheme)
 *     et iOS utilise "capacitor://localhost" — jamais rencontrés dans un vrai navigateur web.
 *
 * Résultat :
 *  - true  → dans l'app mobile (Android / iOS) → le footer doit être masqué
 *  - false → dans un navigateur web classique → le footer s'affiche normalement
 */

import { useState, useEffect } from "react";

// Typage minimal de l'objet global Capacitor injecté par le runtime natif
declare global {
  interface Window {
    Capacitor?: {
      isNative?: boolean;
      platform?: "android" | "ios" | "web";
      isPluginAvailable?: (name: string) => boolean;
    };
  }
}

/**
 * Retourne true si le code s'exécute à l'intérieur de l'app native Capacitor
 * (build Android / iOS), false dans tous les autres cas (navigateur web, PWA, etc.).
 */
function detectNativeApp(): boolean {
  // ── Niveau 1 : flag natif Capacitor (le plus fiable) ──────────────────────
  if (typeof window !== "undefined" && window.Capacitor) {
    // isNative est true uniquement dans le binaire Android/iOS
    if (window.Capacitor.isNative === true) return true;

    // ── Niveau 2 : platform explicite ─────────────────────────────────────
    const platform = window.Capacitor.platform;
    if (platform === "android" || platform === "ios") return true;
  }

  // ── Niveau 3 : URL scheme spécifique à Capacitor ──────────────────────────
  // Android (androidScheme: "https") → origin = "https://localhost"
  // iOS (par défaut)                  → origin = "capacitor://localhost"
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (
      origin === "https://localhost" ||   // Capacitor Android
      origin === "http://localhost" ||    // Capacitor Android (HTTP fallback)
      origin === "capacitor://localhost"  // Capacitor iOS
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Hook React — expose la valeur de détection de manière réactive.
 *
 * La valeur est calculée une seule fois au montage car l'environnement
 * d'exécution ne change pas en cours de vie du composant.
 */
export function useIsNativeApp(): boolean {
  // Initialisation synchrone pour éviter un flash de rendu
  const [isNative] = useState<boolean>(() => detectNativeApp());
  return isNative;
}

/**
 * Utilitaire non-hook pour les contextes hors composant React
 * (ex : logique métier, guards de route, etc.)
 */
export { detectNativeApp };
