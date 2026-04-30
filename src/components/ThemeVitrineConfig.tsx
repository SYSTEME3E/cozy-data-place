// src/components/ThemeVitrineConfig.tsx
// ─────────────────────────────────────────────────────────────────
// Panneau de personnalisation visuelle de la vitrine
// À intégrer dans ParametresPage.tsx comme nouvel onglet "Apparence"
//
// Usage :
//   <ThemeVitrineConfig boutique={boutique} onChange={setBoutique} />
// ─────────────────────────────────────────────────────────────────

import { Palette, Sun, Moon, Type, Layout } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────
export type ThemeStyle  = "moderne" | "classique" | "luxe" | "marche";
export type ThemeFond   = "blanc" | "sombre" | "creme" | "couleur";
export type ThemePolice = "inter" | "poppins" | "playfair" | "montserrat";

export interface ThemeBoutique {
  theme_couleur_principale: string;
  theme_couleur_secondaire: string;
  theme_style:  ThemeStyle;
  theme_fond:   ThemeFond;
  theme_police: ThemePolice;
}

// ── Palettes prédéfinies ──────────────────────────────────────────
// Couleurs officielles Nexora
export const NEXORA_VERT    = "#008000";
export const NEXORA_BLEU    = "#305CDE";
export const NEXORA_ROUGE   = "#FF1A00";
export const NEXORA_NOIR    = "#000000";
export const NEXORA_BLANC   = "#ffffff";

const PALETTES = [
  // Nexora (marque officielle)
  { label: "Nexora",        principale: NEXORA_VERT,  secondaire: NEXORA_BLEU,  badge: "Nexora" },
  { label: "Soldes",        principale: NEXORA_BLEU,  secondaire: NEXORA_VERT,  badge: "Nexora" },
  { label: "Alerte",        principale: NEXORA_ROUGE, secondaire: NEXORA_BLEU,  badge: "Nexora" },
  // Neutres
  { label: "Noir & Blanc",  principale: NEXORA_NOIR,  secondaire: NEXORA_BLANC },
  { label: "Blanc & Gris",  principale: "#f9fafb",    secondaire: "#6b7280" },
  // Classiques
  { label: "Bleu & Cyan",   principale: "#3b82f6",    secondaire: "#06b6d4" },
  { label: "Or & Marron",   principale: "#f59e0b",    secondaire: "#92400e" },
  { label: "Rose & Violet", principale: "#ec4899",    secondaire: "#a855f7" },
  { label: "Orange & Rouge",principale: "#f97316",    secondaire: "#ef4444" },
];

const STYLES: { id: ThemeStyle; label: string; emoji: string; desc: string }[] = [
  { id: "moderne",   label: "Moderne",   emoji: "✨", desc: "Épuré, arrondi, tendance" },
  { id: "classique", label: "Classique", emoji: "🏛️", desc: "Sobre et professionnel" },
  { id: "luxe",      label: "Luxe",      emoji: "💎", desc: "Premium, sombre, élégant" },
  { id: "marche",    label: "Marché",    emoji: "🛍️", desc: "Coloré, vivant, populaire" },
];

const FONDS: { id: ThemeFond; label: string; bg: string; text: string }[] = [
  { id: "blanc",   label: "Blanc",   bg: "#ffffff", text: "#111827" },
  { id: "creme",   label: "Crème",   bg: "#fdf6e3", text: "#3d2b1f" },
  { id: "sombre",  label: "Sombre",  bg: "#111827", text: "#f9fafb" },
  { id: "couleur", label: "Coloré",  bg: "gradient", text: "#ffffff" },
];

const POLICES: { id: ThemePolice; label: string; family: string }[] = [
  { id: "inter",       label: "Inter",       family: "Inter, sans-serif" },
  { id: "poppins",     label: "Poppins",     family: "Poppins, sans-serif" },
  { id: "playfair",    label: "Playfair",    family: "Playfair Display, serif" },
  { id: "montserrat",  label: "Montserrat",  family: "Montserrat, sans-serif" },
];

// ── Composant principal ────────────────────────────────────────────
interface ThemeVitrineConfigProps {
  boutique: ThemeBoutique & { nom?: string };
  onChange: (updates: Partial<ThemeBoutique>) => void;
  cardCls?: string;
  labelCls?: string;
}

export default function ThemeVitrineConfig({
  boutique,
  onChange,
  cardCls = "bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 space-y-4",
  labelCls = "text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider",
}: ThemeVitrineConfigProps) {

  const principale = boutique.theme_couleur_principale || NEXORA_VERT;
  const secondaire = boutique.theme_couleur_secondaire || NEXORA_BLEU;

  return (
    <div className="space-y-4">

      {/* ── Aperçu mini-vitrine ───────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <Layout className="w-4 h-4" style={{ color: NEXORA_ROUGE }} />
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Aperçu de la vitrine</p>
        </div>
        <MiniPreview boutique={boutique} />
      </div>

      {/* ── Palettes de couleurs ──────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <Palette className="w-4 h-4" style={{ color: NEXORA_VERT }} />
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Couleurs</p>
        </div>

        {/* Palettes rapides */}
        <div>
          <p className={labelCls + " mb-2"}>Palettes rapides</p>
          <div className="grid grid-cols-3 gap-2">
            {PALETTES.map((p) => {
              const active = p.principale === principale && p.secondaire === secondaire;
              const isNexora = !!(p as any).badge;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange({ theme_couleur_principale: p.principale, theme_couleur_secondaire: p.secondaire })}
                  className={`flex flex-col items-start gap-1 p-2 rounded-xl border-2 transition-all relative ${
                    active
                      ? "border-gray-800 dark:border-gray-100 shadow-md"
                      : isNexora
                        ? "border-[#305CDE]/30 dark:border-[#305CDE]/40 hover:border-[#305CDE]"
                        : "border-gray-100 dark:border-gray-700 hover:border-gray-300"
                  }`}
                >
                  {isNexora && (
                    <span className="absolute -top-1.5 -right-1 text-[8px] font-black px-1.5 py-0.5 rounded-full"
                      style={{ background: "#305CDE", color: "#fff", letterSpacing: "0.05em" }}>
                      N
                    </span>
                  )}
                  <div className="flex gap-1 flex-shrink-0">
                    <div className="w-4 h-4 rounded-full border border-white/30" style={{ background: p.principale }} />
                    <div className="w-4 h-4 rounded-full border border-white/30" style={{ background: p.secondaire }} />
                  </div>
                  <span className={`text-[10px] font-semibold truncate ${isNexora ? "text-[#305CDE] dark:text-[#305CDE]" : "text-gray-600 dark:text-gray-300"}`}>
                    {p.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Couleurs personnalisées */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelCls + " mb-1.5"}>Couleur principale</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={principale}
                onChange={(e) => onChange({ theme_couleur_principale: e.target.value })}
                className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white flex-shrink-0" style={{ WebkitAppearance: "none", appearance: "none" }}
              />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{principale}</span>
            </div>
          </div>
          <div>
            <p className={labelCls + " mb-1.5"}>Couleur secondaire</p>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={secondaire}
                onChange={(e) => onChange({ theme_couleur_secondaire: e.target.value })}
                className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5 bg-white flex-shrink-0" style={{ WebkitAppearance: "none", appearance: "none" }}
              />
              <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{secondaire}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Style général ─────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <Sun className="w-4 h-4" style={{ color: NEXORA_BLEU }} />
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Style général</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onChange({ theme_style: s.id })}
              className={`flex items-start gap-2 p-3 rounded-xl border-2 text-left transition-all ${
                boutique.theme_style === s.id
                  ? "border-pink-400 bg-pink-50 dark:bg-pink-950/40 shadow-sm"
                  : "border-gray-100 dark:border-gray-700 hover:border-[#305CDE]/40"
              }`}
            >
              <span className="text-lg flex-shrink-0">{s.emoji}</span>
              <div>
                <p className={`text-xs font-bold ${boutique.theme_style === s.id ? "text-pink-600 dark:text-pink-400" : "text-gray-700 dark:text-gray-300"}`}>
                  {s.label}
                </p>
                <p className="text-[10px] text-gray-400">{s.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Fond ──────────────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <Moon className="w-4 h-4" style={{ color: NEXORA_BLEU }} />
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Fond de la vitrine</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {FONDS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => onChange({ theme_fond: f.id })}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                boutique.theme_fond === f.id
                  ? "border-pink-400 shadow-sm"
                  : "border-gray-100 dark:border-gray-700 hover:border-[#305CDE]/40"
              }`}
            >
              <div
                className="w-8 h-8 rounded-lg border border-gray-200 flex-shrink-0"
                style={{
                  background: f.id === "couleur"
                    ? `linear-gradient(135deg, ${principale}, ${secondaire})`
                    : f.bg,
                }}
              />
              <span className={`text-xs font-bold ${boutique.theme_fond === f.id ? "text-pink-600 dark:text-pink-400" : "text-gray-700 dark:text-gray-300"}`}>
                {f.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Police ────────────────────────────────────────────── */}
      <div className={cardCls}>
        <div className="flex items-center gap-2 mb-1">
          <Type className="w-4 h-4" style={{ color: NEXORA_BLEU }} />
          <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Police de caractères</p>
        </div>
        <div className="space-y-2">
          {POLICES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange({ theme_police: p.id })}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all ${
                boutique.theme_police === p.id
                  ? "border-[#305CDE] bg-[#305CDE]/5 dark:bg-[#305CDE]/20"
                  : "border-gray-100 dark:border-gray-700 hover:border-[#305CDE]/40"
              }`}
            >
              <span
                className={`text-base font-semibold ${boutique.theme_police === p.id ? "text-[#305CDE] dark:text-[#305CDE]" : "text-gray-700 dark:text-gray-300"}`}
                style={{ fontFamily: p.family }}
              >
                {p.label}
              </span>
              <span className="text-xs text-gray-400" style={{ fontFamily: p.family }}>
                Abc 123
              </span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Mini aperçu vitrine ────────────────────────────────────────────
function MiniPreview({ boutique }: { boutique: ThemeBoutique & { nom?: string } }) {
  const principale = boutique.theme_couleur_principale || NEXORA_VERT;
  const secondaire = boutique.theme_couleur_secondaire || NEXORA_BLEU;

  const fondMap: Record<ThemeFond, string> = {
    blanc:   "#ffffff",
    creme:   "#fdf6e3",
    sombre:  "#111827",
    couleur: `linear-gradient(135deg, ${principale}15, ${secondaire}10)`,
  };
  const textMap: Record<ThemeFond, string> = {
    blanc:   "#111827",
    creme:   "#3d2b1f",
    sombre:  "#f9fafb",
    couleur: "#111827",
  };

  const fond = fondMap[boutique.theme_fond || "blanc"];
  const textColor = textMap[boutique.theme_fond || "blanc"];

  const policeMap: Record<ThemePolice, string> = {
    inter:      "Inter, sans-serif",
    poppins:    "Poppins, sans-serif",
    playfair:   "Playfair Display, serif",
    montserrat: "Montserrat, sans-serif",
  };
  const fontFamily = policeMap[boutique.theme_police || "inter"];

  const radiusMap: Record<ThemeStyle, string> = {
    moderne:   "12px",
    classique: "4px",
    luxe:      "2px",
    marche:    "20px",
  };
  const radius = radiusMap[boutique.theme_style || "moderne"];

  return (
    <div
      className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 relative"
      style={{ fontFamily, background: fond.startsWith("linear") ? undefined : fond, isolation: "isolate" }}
    >
      {fond.startsWith("linear") && (
        <div style={{ background: fond, position: "absolute", inset: 0, borderRadius: 16, zIndex: 0, pointerEvents: "none" }} />
      )}

      {/* Header */}
      <div
        className="h-12 flex items-center px-3 gap-2"
        style={{ background: `linear-gradient(135deg, ${principale}, ${secondaire})` }}
      >
        <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
          <span className="text-white font-black text-xs">{(boutique.nom || "B")[0]}</span>
        </div>
        <span className="text-white font-bold text-xs truncate">{boutique.nom || "Ma Boutique"}</span>
      </div>

      {/* Search bar */}
      <div className="px-3 py-2" style={{ background: fond.startsWith("linear") ? "white" : fond }}>
        <div
          className="h-7 flex items-center px-3 gap-2"
          style={{ background: boutique.theme_fond === "sombre" ? "#1f2937" : "#f3f4f6", borderRadius: radius }}
        >
          <div className="w-3 h-3 rounded-full bg-gray-300" />
          <div className="h-2 flex-1 rounded-full bg-gray-200" />
        </div>
      </div>

      {/* Filtres */}
      <div className="px-3 pb-2 flex gap-1.5" style={{ background: fond.startsWith("linear") ? "white" : fond }}>
        {["Tout", "📦", "💻"].map((f, i) => (
          <div
            key={f}
            className="px-2 py-0.5 text-[9px] font-bold"
            style={{
              borderRadius: radius,
              background: i === 0 ? principale : boutique.theme_fond === "sombre" ? "#1f2937" : "#f3f4f6",
              color: i === 0 ? "white" : textColor,
            }}
          >
            {f}
          </div>
        ))}
      </div>

      {/* Grille produits */}
      <div className="grid grid-cols-3 gap-1.5 px-3 pb-3" style={{ background: fond.startsWith("linear") ? "white" : fond }}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="overflow-hidden"
            style={{
              borderRadius: radius,
              border: `1px solid ${boutique.theme_fond === "sombre" ? "#374151" : "#e5e7eb"}`,
              background: boutique.theme_fond === "sombre" ? "#1f2937" : "white",
            }}
          >
            <div className="h-10" style={{ background: `linear-gradient(135deg, ${principale}30, ${secondaire}20)` }} />
            <div className="p-1">
              <div className="h-1.5 rounded-full bg-gray-200 mb-1" />
              <div className="h-2 rounded-full w-2/3" style={{ background: principale + "80" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
