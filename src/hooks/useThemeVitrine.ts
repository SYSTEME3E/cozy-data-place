// src/hooks/useThemeVitrine.ts
// ─────────────────────────────────────────────────────────────────
// Applique dynamiquement le thème de la boutique sur la vitrine
// via des CSS variables injectées sur :root
//
// Usage dans VitrinePage.tsx :
//   useThemeVitrine(boutique);
// ─────────────────────────────────────────────────────────────────

import { useEffect } from "react";

interface BoutiqueTheme {
  theme_couleur_principale?: string;
  theme_couleur_secondaire?: string;
  theme_style?:  string;
  theme_fond?:   string;
  theme_police?: string;
}

const GOOGLE_FONTS: Record<string, string> = {
  poppins:    "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;900&display=swap",
  playfair:   "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&display=swap",
  montserrat: "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap",
  inter:      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap",
};

const POLICE_FAMILY: Record<string, string> = {
  inter:      "'Inter', sans-serif",
  poppins:    "'Poppins', sans-serif",
  playfair:   "'Playfair Display', serif",
  montserrat: "'Montserrat', sans-serif",
};

const FOND_BG: Record<string, string> = {
  blanc:   "#ffffff",
  creme:   "#fdf6e3",
  sombre:  "#111827",
  couleur: "var(--shop-gradient-bg)",
};

const FOND_TEXT: Record<string, string> = {
  blanc:   "#111827",
  creme:   "#3d2b1f",
  sombre:  "#f9fafb",
  couleur: "#111827",
};

const RADIUS_MAP: Record<string, string> = {
  moderne:   "1rem",
  classique: "0.25rem",
  luxe:      "0.125rem",
  marche:    "1.5rem",
};

// Éclaircit une couleur hex pour les fonds
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

export function useThemeVitrine(boutique: BoutiqueTheme | null) {
  useEffect(() => {
    if (!boutique) return;

    const principale = boutique.theme_couleur_principale || "#008000"; // Nexora Vert
    const secondaire = boutique.theme_couleur_secondaire || "#305CDE"; // Nexora Bleu Roi
    const style      = boutique.theme_style  || "moderne";
    const fond       = boutique.theme_fond   || "blanc";
    const police     = boutique.theme_police || "inter";

    const rgb = hexToRgb(principale);
    const rgbStr = rgb ? `${rgb.r}, ${rgb.g}, ${rgb.b}` : "0, 128, 0"; // Nexora Vert RGB

    // Injecter la police Google Fonts si pas encore chargée
    const fontUrl = GOOGLE_FONTS[police];
    if (fontUrl) {
      const existingLink = document.querySelector(`link[data-shop-font="${police}"]`);
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = fontUrl;
        link.setAttribute("data-shop-font", police);
        document.head.appendChild(link);
      }
    }

    // Appliquer la police sur le body de la vitrine
    document.body.style.fontFamily = POLICE_FAMILY[police] || "'Inter', sans-serif";

    // Injecter les CSS variables
    const root = document.documentElement;
    root.style.setProperty("--shop-principale",    principale);
    root.style.setProperty("--shop-secondaire",    secondaire);
    root.style.setProperty("--shop-principale-rgb", rgbStr);
    root.style.setProperty("--shop-radius",        RADIUS_MAP[style] || "1rem");
    root.style.setProperty("--shop-font",          POLICE_FAMILY[police] || "'Inter', sans-serif");
    root.style.setProperty("--shop-bg",            FOND_BG[fond] || "#ffffff");
    root.style.setProperty("--shop-text",          FOND_TEXT[fond] || "#111827");
    root.style.setProperty("--shop-gradient-bg",   `linear-gradient(135deg, ${principale}15, ${secondaire}10)`);

    // Mode sombre pour la vitrine
    if (fond === "sombre") {
      document.documentElement.setAttribute("data-shop-dark", "true");
    } else {
      document.documentElement.removeAttribute("data-shop-dark");
    }

    // Nettoyer au démontage
    return () => {
      root.style.removeProperty("--shop-principale");
      root.style.removeProperty("--shop-secondaire");
      root.style.removeProperty("--shop-principale-rgb");
      root.style.removeProperty("--shop-radius");
      root.style.removeProperty("--shop-font");
      root.style.removeProperty("--shop-bg");
      root.style.removeProperty("--shop-text");
      root.style.removeProperty("--shop-gradient-bg");
      document.documentElement.removeAttribute("data-shop-dark");
    };
  }, [
    boutique?.theme_couleur_principale,
    boutique?.theme_couleur_secondaire,
    boutique?.theme_style,
    boutique?.theme_fond,
    boutique?.theme_police,
  ]);
}
