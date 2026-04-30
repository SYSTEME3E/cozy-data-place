/**
 * AIDescriptionHelper — Assistant IA pour rédiger les descriptions produit
 * Intégration : NouveauProduitPage.tsx ET ProduitsDigitauxPage.tsx
 *
 * Usage :
 *   <AIDescriptionHelper
 *     nomProduit={form.nom}
 *     categorie={form.categorie}
 *     prix={form.prix}
 *     onDescriptionGenerated={(desc) => setForm({ ...form, description: desc, description_ia: true })}
 *   />
 */

import { useState } from "react";
import { Sparkles, ChevronDown, ChevronUp, RefreshCw, Copy, Check, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface AIDescriptionHelperProps {
  nomProduit: string;
  categorie?: string;
  prix?: string;
  onDescriptionGenerated: (description: string) => void;
}

type Tone = "professionnel" | "chaleureux" | "luxe" | "simple";

const TONES: { id: Tone; label: string; emoji: string; desc: string }[] = [
  { id: "professionnel", label: "Professionnel", emoji: "💼", desc: "Sérieux et factuel" },
  { id: "chaleureux",    label: "Chaleureux",    emoji: "🤝", desc: "Proche du client" },
  { id: "luxe",          label: "Prestige",      emoji: "✨", desc: "Haut de gamme" },
  { id: "simple",        label: "Direct",        emoji: "⚡", desc: "Court et efficace" },
];

export default function AIDescriptionHelper({
  nomProduit,
  categorie,
  prix,
  onDescriptionGenerated,
}: AIDescriptionHelperProps) {
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState<Tone>("chaleureux");
  const [keywords, setKeywords] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  const canGenerate = nomProduit.trim().length >= 2;

  const generate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError("");
    setGenerated("");

    try {
      // ✅ Appel via Supabase Edge Function (la clé API reste côté serveur)
      const { data, error } = await (supabase as any).functions.invoke("generate-description-ia", {
        body: {
          nom:      nomProduit,
          categorie: categorie || undefined,
          prix:     prix || undefined,
          keywords: keywords || undefined,
          tone,
        },
      });

      if (error) throw new Error(error.message);
      if (!data?.description) throw new Error("Réponse vide");

      setGenerated(data.description);
    } catch (err: any) {
      setError("Erreur lors de la génération. Réessayez dans quelques secondes.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyDescription = () => {
    if (generated) {
      onDescriptionGenerated(generated);
    }
  };

  const copyToClipboard = async () => {
    if (!generated) return;
    await navigator.clipboard.writeText(generated);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-2 rounded-2xl border border-pink-100 bg-gradient-to-br from-pink-50/60 to-purple-50/40 overflow-hidden">
      {/* Header toggle */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-pink-50/60 transition-colors"
      >
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-700">
            Assistant IA — Rédaction automatique
          </p>
          <p className="text-[10px] text-gray-400 font-medium">
            Génère une description professionnelle en 5 secondes
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-400">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-pink-100">

          {/* Tone selector */}
          <div className="pt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Ton de la description
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTone(t.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    tone === t.id
                      ? "border-pink-400 bg-pink-50 shadow-sm"
                      : "border-gray-200 bg-white hover:border-pink-200"
                  }`}
                >
                  <span className="text-base">{t.emoji}</span>
                  <div>
                    <p className={`text-xs font-bold ${tone === t.id ? "text-pink-600" : "text-gray-700"}`}>
                      {t.label}
                    </p>
                    <p className="text-[10px] text-gray-400">{t.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Keywords */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Caractéristiques clés <span className="text-gray-400 normal-case font-normal">(optionnel)</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="ex: coton bio, livraison rapide, taille unique..."
              className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 bg-white transition placeholder:text-gray-300"
            />
          </div>

          {/* Warning if no product name */}
          {!canGenerate && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
              ⚠️ Saisissez d'abord le nom du produit pour générer une description.
            </p>
          )}

          {/* Generate button */}
          <button
            type="button"
            onClick={generate}
            disabled={!canGenerate || loading}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${
              canGenerate && !loading
                ? "bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:opacity-90 shadow-md shadow-pink-200"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Génération en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Générer la description
              </>
            )}
          </button>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              {error}
            </p>
          )}

          {/* Generated result */}
          {generated && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Description générée
                </p>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={generate}
                    title="Régénérer"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-pink-100 text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    title="Copier"
                    className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-pink-100 text-gray-400 hover:text-pink-500 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="bg-white border border-pink-100 rounded-xl p-3 text-sm text-gray-700 leading-relaxed">
                {generated}
              </div>

              <button
                type="button"
                onClick={applyDescription}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white font-bold text-sm transition-colors shadow-sm shadow-green-200"
              >
                <Check className="w-4 h-4" />
                Utiliser cette description
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
