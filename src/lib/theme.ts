// ─────────────────────────────────────────────────────────────────────────────
// lib/theme.ts — Système de thème global NEXORA
// Persiste dans localStorage, s'applique à TOUTES les pages automatiquement.
// Usage : importez initTheme() dans chaque layout/page pour appliquer le thème.
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_KEY = "nexora-theme";
export type NexoraTheme = "light" | "dark";

/** Lit le thème depuis localStorage (ou préférence système en fallback) */
export function getTheme(): NexoraTheme {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
    return "dark";
  } catch {}
  return "dark";
}

/** Applique le thème sur <html> et le persiste en localStorage */
export function applyTheme(theme: NexoraTheme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

/** Toggle le thème et retourne le nouveau */
export function toggleTheme(): NexoraTheme {
  const next: NexoraTheme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

/**
 * À appeler au montage de chaque layout/page pour appliquer le thème sauvegardé.
 * S'applique automatiquement à toutes les pages qui utilisent AppLayout, BoutiqueLayout ou LandingPage.
 */
export function initTheme() {
  applyTheme(getTheme());
}
