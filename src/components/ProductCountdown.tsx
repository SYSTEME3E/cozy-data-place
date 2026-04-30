/**
 * ProductCountdown.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Deux exports :
 *   • CountdownEditor   → section dans l'éditeur vendeur (config + aperçu live)
 *   • CountdownDisplay  → bloc affiché sur la page publique du produit
 */

import { useState, useEffect, useRef } from "react";
import {
  Timer, Palette, Type, Eye, EyeOff, Trash2,
  Calendar, ToggleLeft, ToggleRight, Sparkles,
  AlarmClock, Flame,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CountdownConfig {
  countdown_actif: boolean;
  countdown_fin: string | null;          // ISO string UTC
  countdown_titre: string | null;
  countdown_bg_couleur: string;
  countdown_texte_couleur: string;
  countdown_style: "banner" | "card" | "floating" | "minimal";
  countdown_message_fin: string | null;
}

interface TimeLeft {
  jours: number;
  heures: number;
  minutes: number;
  secondes: number;
  termine: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcTimeLeft(fin: string | null): TimeLeft {
  if (!fin) return { jours: 0, heures: 0, minutes: 0, secondes: 0, termine: true };
  const diff = new Date(fin).getTime() - Date.now();
  if (diff <= 0) return { jours: 0, heures: 0, minutes: 0, secondes: 0, termine: true };
  const jours     = Math.floor(diff / 86_400_000);
  const heures    = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes   = Math.floor((diff % 3_600_000) / 60_000);
  const secondes  = Math.floor((diff % 60_000) / 1_000);
  return { jours, heures, minutes, secondes, termine: false };
}

function pad(n: number) { return String(n).padStart(2, "0"); }

// ─── Bloc horloge (réutilisé dans Display et Editor aperçu) ──────────────────
function ClockBlock({ value, label, textColor }: { value: string; label: string; textColor: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-3xl sm:text-4xl font-black tabular-nums leading-none" style={{ color: textColor }}>
        {value}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-widest mt-1 opacity-80" style={{ color: textColor }}>
        {label}
      </span>
    </div>
  );
}

function Sep({ color }: { color: string }) {
  return <span className="text-2xl font-black pb-3 opacity-60" style={{ color }}>:</span>;
}

// ─── CountdownDisplay (page publique) ────────────────────────────────────────
export function CountdownDisplay({ config }: { config: CountdownConfig }) {
  const [time, setTime] = useState<TimeLeft>(calcTimeLeft(config.countdown_fin));

  useEffect(() => {
    if (!config.countdown_actif || !config.countdown_fin) return;
    const id = setInterval(() => setTime(calcTimeLeft(config.countdown_fin)), 1000);
    return () => clearInterval(id);
  }, [config.countdown_actif, config.countdown_fin]);

  if (!config.countdown_actif || !config.countdown_fin) return null;

  const bg   = config.countdown_bg_couleur   || "#ef4444";
  const fg   = config.countdown_texte_couleur || "#ffffff";
  const titre = config.countdown_titre || "⏰ Offre limitée !";
  const msgFin = config.countdown_message_fin || "Cette offre est terminée.";

  if (time.termine) {
    return (
      <div className="rounded-2xl p-4 text-center font-bold text-sm" style={{ background: bg, color: fg }}>
        {msgFin}
      </div>
    );
  }

  /* ── STYLE : banner ── */
  if (config.countdown_style === "banner") {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ background: bg }}>
        <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: `${fg}20` }}>
          <Flame className="w-4 h-4 flex-shrink-0" style={{ color: fg }} />
          <p className="text-sm font-black tracking-wide" style={{ color: fg }}>{titre}</p>
        </div>
        <div className="flex items-center justify-center gap-3 px-4 py-4">
          <ClockBlock value={pad(time.jours)}    label="Jours"    textColor={fg} />
          <Sep color={fg} />
          <ClockBlock value={pad(time.heures)}   label="Heures"   textColor={fg} />
          <Sep color={fg} />
          <ClockBlock value={pad(time.minutes)}  label="Minutes"  textColor={fg} />
          <Sep color={fg} />
          <ClockBlock value={pad(time.secondes)} label="Secondes" textColor={fg} />
        </div>
      </div>
    );
  }

  /* ── STYLE : card ── */
  if (config.countdown_style === "card") {
    return (
      <div className="rounded-3xl p-5 shadow-xl" style={{ background: bg }}>
        <div className="flex items-center gap-2 mb-4">
          <AlarmClock className="w-5 h-5" style={{ color: fg }} />
          <p className="text-base font-black" style={{ color: fg }}>{titre}</p>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { v: pad(time.jours),    l: "Jours" },
            { v: pad(time.heures),   l: "Heures" },
            { v: pad(time.minutes),  l: "Min" },
            { v: pad(time.secondes), l: "Sec" },
          ].map(({ v, l }) => (
            <div key={l} className="rounded-2xl py-3 text-center" style={{ background: `${fg}18` }}>
              <p className="text-3xl font-black tabular-nums" style={{ color: fg }}>{v}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest mt-1" style={{ color: `${fg}bb` }}>{l}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── STYLE : floating (bandeau collant en haut) ── */
  if (config.countdown_style === "floating") {
    return (
      <div
        className="sticky top-0 z-30 w-full flex flex-wrap items-center justify-center gap-3 px-4 py-2.5 shadow-lg"
        style={{ background: bg }}
      >
        <Flame className="w-4 h-4 flex-shrink-0" style={{ color: fg }} />
        <span className="text-sm font-bold" style={{ color: fg }}>{titre}</span>
        <div className="flex items-center gap-2">
          {[
            { v: pad(time.jours),    l: "j" },
            { v: pad(time.heures),   l: "h" },
            { v: pad(time.minutes),  l: "m" },
            { v: pad(time.secondes), l: "s" },
          ].map(({ v, l }, i, arr) => (
            <span key={l} className="flex items-baseline gap-0.5">
              <span className="text-xl font-black tabular-nums" style={{ color: fg }}>{v}</span>
              <span className="text-xs font-bold" style={{ color: `${fg}99` }}>{l}</span>
              {i < arr.length - 1 && <span className="ml-1 opacity-50" style={{ color: fg }}>·</span>}
            </span>
          ))}
        </div>
      </div>
    );
  }

  /* ── STYLE : minimal ── */
  return (
    <div className="flex items-center gap-3 rounded-xl px-4 py-3 border" style={{ background: `${bg}15`, borderColor: `${bg}40` }}>
      <Timer className="w-4 h-4 flex-shrink-0" style={{ color: bg }} />
      <span className="text-sm font-bold flex-1" style={{ color: bg }}>{titre}</span>
      <span className="font-black tabular-nums text-sm" style={{ color: bg }}>
        {time.jours > 0 && `${pad(time.jours)}j `}
        {pad(time.heures)}:{pad(time.minutes)}:{pad(time.secondes)}
      </span>
    </div>
  );
}

// ─── Presets couleurs ─────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { bg: "#ef4444", fg: "#ffffff", label: "Rouge" },
  { bg: "#f97316", fg: "#ffffff", label: "Orange" },
  { bg: "#eab308", fg: "#000000", label: "Jaune" },
  { bg: "#22c55e", fg: "#ffffff", label: "Vert" },
  { bg: "#3b82f6", fg: "#ffffff", label: "Bleu" },
  { bg: "#8b5cf6", fg: "#ffffff", label: "Violet" },
  { bg: "#ec4899", fg: "#ffffff", label: "Rose" },
  { bg: "#0f172a", fg: "#ffffff", label: "Sombre" },
  { bg: "#ffffff", fg: "#0f172a", label: "Blanc" },
  { bg: "#fef3c7", fg: "#92400e", label: "Doré" },
];

const STYLES = [
  { value: "banner",   label: "Bandeau",  desc: "Classique, compact" },
  { value: "card",     label: "Carte",    desc: "Grande et visible" },
  { value: "floating", label: "Flottant", desc: "Collé en haut de page" },
  { value: "minimal",  label: "Minimal",  desc: "Discret, inline" },
] as const;

// ─── CountdownEditor (section dans l'éditeur vendeur) ─────────────────────────
interface CountdownEditorProps {
  config: CountdownConfig;
  onChange: (c: CountdownConfig) => void;
  /** ID du produit dans Supabase — si fourni, le bouton Sauvegarder persiste directement en base */
  produitId?: string | null;
  /** Callback appelé après une sauvegarde réussie en base */
  onSaved?: () => void;
}

import { supabase } from "@/integrations/supabase/client";

export function CountdownEditor({ config, onChange, produitId, onSaved }: CountdownEditorProps) {
  const [preview, setPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // État local indépendant — initialisé depuis config, ne dépend plus du parent pour chaque frappe
  const [local, setLocal] = useState<CountdownConfig>({ ...config });

  // Resync si le parent change de produit (ex: handleEdit charge un nouveau produit)
  const prevProduitId = useRef(produitId);
  useEffect(() => {
    if (prevProduitId.current !== produitId) {
      setLocal({ ...config });
      prevProduitId.current = produitId;
      setSaved(false);
    }
  }, [produitId, config]);

  const update = (patch: Partial<CountdownConfig>) => {
    const next = { ...local, ...patch };
    setLocal(next);
    onChange(next); // remonte au parent pour que le state React reste synchro
    setSaved(false);
  };

  // Convertit datetime-local (heure locale) → ISO UTC
  const handleDateChange = (val: string) => {
    if (!val) { update({ countdown_fin: null }); return; }
    update({ countdown_fin: new Date(val).toISOString() });
  };

  // Convertit ISO UTC → datetime-local
  const toLocalInput = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    const offset = d.getTimezoneOffset() * 60_000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  };

  // Sauvegarde directe en base
  const handleSave = async () => {
    if (!produitId) return;
    setSaving(true);
    const { error } = await supabase.from("produits" as any).update({
      countdown_actif:        local.countdown_actif,
      countdown_fin:          local.countdown_fin,
      countdown_titre:        local.countdown_titre || null,
      countdown_bg_couleur:   local.countdown_bg_couleur,
      countdown_texte_couleur: local.countdown_texte_couleur,
      countdown_style:        local.countdown_style,
      countdown_message_fin:  local.countdown_message_fin || null,
    }).eq("id", produitId);
    setSaving(false);
    if (!error) {
      setSaved(true);
      onChange(local);
      onSaved?.();
      setTimeout(() => setSaved(false), 3000);
    }
  };

  return (
    <div className="space-y-5">

      {/* Toggle ON/OFF */}
      <div
        className="flex items-center justify-between bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10 cursor-pointer"
        onClick={() => update({ countdown_actif: !local.countdown_actif })}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${local.countdown_actif ? "bg-red-100 dark:bg-red-500/20" : "bg-gray-100 dark:bg-white/5"}`}>
            <Timer className={`w-5 h-5 ${local.countdown_actif ? "text-red-500" : "text-gray-400"}`} />
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">Compte à rebours</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Crée de l'urgence et booste les ventes</p>
          </div>
        </div>
        {local.countdown_actif
          ? <ToggleRight className="w-8 h-8 text-red-500 flex-shrink-0" />
          : <ToggleLeft  className="w-8 h-8 text-gray-300 dark:text-slate-600 flex-shrink-0" />
        }
      </div>

      {local.countdown_actif && (
        <>
          {/* Date de fin */}
          <div className="bg-gray-50 dark:bg-white/5 rounded-2xl p-4 border border-gray-200 dark:border-white/10 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-red-500" />
              <p className="text-sm font-bold text-gray-800 dark:text-white">Date & heure de fin</p>
            </div>
            <input
              type="datetime-local"
              value={toLocalInput(local.countdown_fin)}
              onChange={e => handleDateChange(e.target.value)}
              min={toLocalInput(new Date().toISOString())}
              className="w-full bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
            />
          </div>

          {/* Texte titre */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
              <Type className="w-4 h-4 text-red-500" /> Titre du compte à rebours
            </label>
            <input
              value={local.countdown_titre || ""}
              onChange={e => update({ countdown_titre: e.target.value })}
              placeholder="Ex: ⚡ Offre flash — se termine bientôt !"
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 placeholder-gray-400 dark:placeholder-slate-600"
            />
          </div>

          {/* Message fin */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-700 dark:text-slate-300">
              Message quand terminé
            </label>
            <input
              value={local.countdown_message_fin || ""}
              onChange={e => update({ countdown_message_fin: e.target.value })}
              placeholder="Ex: L'offre est expirée. Contactez-nous pour plus d'infos."
              className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400 placeholder-gray-400 dark:placeholder-slate-600"
            />
          </div>

          {/* Style */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
              <Sparkles className="w-4 h-4 text-red-500" /> Style visuel
            </label>
            <div className="grid grid-cols-2 gap-2">
              {STYLES.map(s => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => update({ countdown_style: s.value })}
                  className={`flex flex-col items-start p-3 rounded-xl border-2 text-left transition-all ${
                    local.countdown_style === s.value
                      ? "border-red-500 bg-red-50 dark:bg-red-500/10"
                      : "border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20"
                  }`}
                >
                  <p className={`text-sm font-bold ${local.countdown_style === s.value ? "text-red-600 dark:text-red-400" : "text-gray-700 dark:text-slate-300"}`}>{s.label}</p>
                  <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs */}
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
              <Palette className="w-4 h-4 text-red-500" /> Couleurs
            </label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  title={p.label}
                  onClick={() => update({ countdown_bg_couleur: p.bg, countdown_texte_couleur: p.fg })}
                  className={`w-8 h-8 rounded-xl border-2 transition-all hover:scale-110 ${
                    local.countdown_bg_couleur === p.bg
                      ? "border-gray-900 dark:border-white scale-110 shadow-lg"
                      : "border-gray-200 dark:border-white/20"
                  }`}
                  style={{ background: p.bg }}
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5 font-medium">Couleur de fond</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
                  <div className="w-6 h-6 rounded-lg border border-white/30 shadow-sm flex-shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: local.countdown_bg_couleur }} />
                    <input
                      type="color"
                      value={local.countdown_bg_couleur}
                      onChange={e => update({ countdown_bg_couleur: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-600 dark:text-slate-400">{local.countdown_bg_couleur}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5 font-medium">Couleur du texte</p>
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2">
                  <div className="w-6 h-6 rounded-lg border border-gray-200 dark:border-white/30 shadow-sm flex-shrink-0 relative overflow-hidden">
                    <div className="absolute inset-0" style={{ background: local.countdown_texte_couleur }} />
                    <input
                      type="color"
                      value={local.countdown_texte_couleur}
                      onChange={e => update({ countdown_texte_couleur: e.target.value })}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                  </div>
                  <span className="text-xs font-mono text-gray-600 dark:text-slate-400">{local.countdown_texte_couleur}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Aperçu */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-slate-300">
                <Eye className="w-4 h-4 text-red-500" /> Aperçu en direct
              </label>
              <button
                type="button"
                onClick={() => setPreview(v => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors flex items-center gap-1"
              >
                {preview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {preview ? "Masquer" : "Afficher"}
              </button>
            </div>
            {preview && local.countdown_fin && (
              <div className="rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/10 p-3 bg-gray-50 dark:bg-white/3">
                <p className="text-[10px] text-gray-400 dark:text-slate-600 font-bold uppercase tracking-widest text-center mb-2">
                  ↓ Aperçu (visible par les clients)
                </p>
                <CountdownDisplay config={local} />
              </div>
            )}
            {preview && !local.countdown_fin && (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 p-3 text-center">
                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">⚠️ Définissez une date de fin pour voir l'aperçu</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Bouton Sauvegarder en base — visible seulement si produitId fourni */}
      {produitId && (
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
            saved
              ? "bg-green-500 text-white"
              : "bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20"
          } disabled:opacity-60`}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
          ) : saved ? (
            <>✅ Sauvegardé !</>
          ) : (
            <><Timer className="w-4 h-4" /> Sauvegarder le compte à rebours</>
          )}
        </button>
      )}

      {/* Reset */}
      <button
        type="button"
        onClick={() => update({
          countdown_actif: false,
          countdown_fin: null,
          countdown_titre: null,
          countdown_message_fin: null,
          countdown_bg_couleur: "#ef4444",
          countdown_texte_couleur: "#ffffff",
          countdown_style: "banner",
        })}
        className="flex items-center gap-2 text-xs text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" /> Réinitialiser le compte à rebours
      </button>
    </div>
  );
}
