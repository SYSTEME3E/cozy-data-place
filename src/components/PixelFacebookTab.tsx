/**
 * PixelFacebookTab — Composant onglet Pixel Facebook
 * Permet d'ajouter PLUSIEURS pixels + API CAPI avec nom,
 * activation individuelle, modification et suppression.
 *
 * INTÉGRATION dans ParametresPage.tsx :
 *  1. Importer ce composant :
 *     import PixelFacebookTab from "@/components/PixelFacebookTab";
 *
 *  2. Dans l'interface Boutique, remplacer les champs pixel par :
 *     pixels_config?: PixelConfig[] | null;
 *     (garder pixel_facebook_id et api_conversion_token pour rétrocompatibilité)
 *
 *  3. Remplacer le bloc {activeTab === "pixel" && (...)} par :
 *     {activeTab === "pixel" && (
 *       <PixelFacebookTab
 *         boutiqueId={boutique.id}
 *         initialPixels={(boutique as any).pixels_config || []}
 *         onChange={(pixels) => setBoutique(prev => ({ ...prev, pixels_config: pixels }))}
 *       />
 *     )}
 *
 *  4. Dans handleSave, le champ pixels_config sera inclus automatiquement
 *     via le spread { ...boutique } dans le payload.
 *
 *  5. Ajouter la colonne dans Supabase :
 *     ALTER TABLE boutiques ADD COLUMN IF NOT EXISTS pixels_config jsonb DEFAULT '[]'::jsonb;
 *
 *  6. Dans VitrinePage.tsx, adapter fbTrack/fbCapi pour lire depuis pixels_config :
 *     boutique.pixels_config?.filter(p => p.actif).forEach(p => { ... fbq('init', p.pixel_id) })
 */

import { useState } from "react";
import { Facebook, Plus, Trash2, Eye, EyeOff, Edit2, Check, X, ChevronDown, ChevronUp, Zap } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface PixelConfig {
  id: string;           // UUID local généré côté client
  nom: string;          // ex: "Boutique Principale", "Campagne Ramadan"
  pixel_id: string;     // ID Facebook Pixel (numérique)
  pixel_actif: boolean;
  capi_token: string;   // Token API Conversions
  capi_actif: boolean;
}

interface Props {
  boutiqueId?: string;
  initialPixels?: PixelConfig[];
  onChange?: (pixels: PixelConfig[]) => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function genId() {
  return `px_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function emptyPixel(): PixelConfig {
  return {
    id: genId(),
    nom: "",
    pixel_id: "",
    pixel_actif: true,
    capi_token: "",
    capi_actif: false,
  };
}

// ─── Toggle Switch ──────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        value ? "bg-[#305CDE]" : "bg-gray-300 dark:bg-gray-600"
      }`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-200 ${
          value ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

// ─── Carte Pixel ────────────────────────────────────────────────────────────────
function PixelCard({
  pixel,
  index,
  onUpdate,
  onDelete,
}: {
  pixel: PixelConfig;
  index: number;
  onUpdate: (updated: PixelConfig) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState<PixelConfig>(pixel);
  const [showToken, setShowToken] = useState(false);

  const startEdit = () => {
    setDraft({ ...pixel });
    setEditing(true);
    setExpanded(true);
  };

  const saveEdit = () => {
    if (!draft.nom.trim()) return;
    onUpdate(draft);
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft({ ...pixel });
    setEditing(false);
  };

  const p = editing ? draft : pixel;
  const hasCapi = !!pixel.capi_token;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        pixel.pixel_actif
          ? "border-[#305CDE]/30 bg-white dark:bg-gray-800 shadow-sm"
          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 opacity-70"
      }`}
    >
      {/* ── En-tête carte ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Numéro */}
        <div className="w-7 h-7 rounded-lg bg-[#305CDE]/10 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-black text-[#305CDE]">{index + 1}</span>
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              value={draft.nom}
              onChange={e => setDraft(prev => ({ ...prev, nom: e.target.value }))}
              placeholder="Nom du pixel (ex: Boutique Main)"
              className="w-full text-sm font-bold bg-transparent border-b border-[#305CDE] focus:outline-none text-gray-900 dark:text-white pb-0.5"
              autoFocus
            />
          ) : (
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
              {pixel.nom || `Pixel ${index + 1}`}
            </p>
          )}
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">
            {pixel.pixel_id ? `ID: ${pixel.pixel_id}` : "Aucun ID configuré"}
            {hasCapi && <span className="ml-2 text-green-500 font-sans">+ CAPI</span>}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {editing ? (
            <>
              <button
                onClick={saveEdit}
                disabled={!draft.nom.trim()}
                className="p-1.5 rounded-lg bg-[#305CDE] text-white hover:bg-[#305CDE]/90 disabled:opacity-40 transition-colors"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={cancelEdit}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <Toggle
                value={pixel.pixel_actif}
                onChange={v => onUpdate({ ...pixel, pixel_actif: v })}
              />
              <button
                onClick={startEdit}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-[#305CDE] hover:border-[#305CDE]/40 hover:bg-[#305CDE]/5 transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onDelete}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 hover:text-red-500 hover:border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Détails dépliables ── */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">

          {/* ID Pixel */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              ID Pixel Facebook
            </label>
            <input
              value={p.pixel_id}
              onChange={editing ? (e => setDraft(prev => ({ ...prev, pixel_id: e.target.value }))) : undefined}
              readOnly={!editing}
              placeholder="123456789012345"
              className={`w-full px-3 py-2 text-sm font-mono rounded-xl border transition-colors ${
                editing
                  ? "border-[#305CDE]/40 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400"
              } dark:text-white`}
            />
            {editing && (
              <p className="text-xs text-gray-400 mt-1">Trouvez-le dans Facebook Events Manager</p>
            )}
          </div>

          {/* Séparateur CAPI */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 rounded-full">
              <Zap className="w-3 h-3 text-[#305CDE]" />
              <span className="text-[10px] font-bold text-[#305CDE] uppercase tracking-wider">API Conversions (CAPI)</span>
            </div>
            <div className="flex-1 h-px bg-gray-100 dark:bg-gray-700" />
          </div>

          {/* Toggle CAPI */}
          <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-[#305CDE]/30 rounded-xl">
            <div>
              <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Activer l'API Conversions</p>
              <p className="text-xs text-gray-400">Contourne iOS & AdBlock</p>
            </div>
            {editing ? (
              <Toggle value={draft.capi_actif} onChange={v => setDraft(prev => ({ ...prev, capi_actif: v }))} />
            ) : (
              <Toggle value={pixel.capi_actif} onChange={v => onUpdate({ ...pixel, capi_actif: v })} />
            )}
          </div>

          {/* Token CAPI */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
              Token d'accès API
            </label>
            <div className="flex gap-2">
              <input
                type={showToken ? "text" : "password"}
                value={p.capi_token}
                onChange={editing ? (e => setDraft(prev => ({ ...prev, capi_token: e.target.value }))) : undefined}
                readOnly={!editing}
                placeholder="EAAxxxxxxxx..."
                className={`flex-1 px-3 py-2 text-sm font-mono rounded-xl border transition-colors ${
                  editing
                    ? "border-[#305CDE]/40 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30"
                    : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400"
                } dark:text-white`}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Événements trackés */}
          {!editing && pixel.pixel_id && (
            <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-3">
              <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2">Événements trackés :</p>
              <div className="flex flex-wrap gap-1.5">
                {["PageView", "ViewContent", "AddToCart", "InitiateCheckout", "Purchase"].map(ev => (
                  <span key={ev} className="text-[10px] px-2 py-0.5 bg-[#305CDE]/10 text-[#305CDE] rounded-full font-semibold">
                    {ev}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Formulaire ajout nouveau pixel ─────────────────────────────────────────────
function NewPixelForm({ onAdd }: { onAdd: (p: PixelConfig) => void }) {
  const [open, setOpen]         = useState(false);
  const [draft, setDraft]       = useState<PixelConfig>(emptyPixel());
  const [showToken, setShowToken] = useState(false);

  const handleAdd = () => {
    if (!draft.nom.trim() || !draft.pixel_id.trim()) return;
    onAdd({ ...draft, id: genId() });
    setDraft(emptyPixel());
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#305CDE]/30 text-[#305CDE] hover:border-[#305CDE]/60 hover:bg-[#305CDE]/5 transition-all duration-200 font-semibold text-sm"
      >
        <Plus className="w-4 h-4" />
        Ajouter un Pixel
      </button>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-[#305CDE]/40 bg-[#305CDE]/3 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-black text-[#305CDE]">Nouveau Pixel</p>
        <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Nom */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          Nom du pixel *
        </label>
        <input
          value={draft.nom}
          onChange={e => setDraft(prev => ({ ...prev, nom: e.target.value }))}
          placeholder="ex: Boutique Principale, Campagne Ramadan…"
          className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 dark:text-white"
        />
      </div>

      {/* Pixel ID */}
      <div>
        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
          ID Pixel Facebook *
        </label>
        <input
          value={draft.pixel_id}
          onChange={e => setDraft(prev => ({ ...prev, pixel_id: e.target.value.replace(/\D/g, "") }))}
          placeholder="123456789012345"
          className="w-full px-3 py-2.5 text-sm font-mono rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 dark:text-white"
        />
        <p className="text-xs text-gray-400 mt-1">Trouvez-le dans Facebook Events Manager</p>
      </div>

      {/* Toggle CAPI */}
      <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-[#305CDE]/30 rounded-xl">
        <div>
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">Activer l'API Conversions (CAPI)</p>
          <p className="text-xs text-gray-400">Plus fiable — contourne iOS & AdBlock</p>
        </div>
        <Toggle value={draft.capi_actif} onChange={v => setDraft(prev => ({ ...prev, capi_actif: v }))} />
      </div>

      {/* Token CAPI (conditionnel) */}
      {draft.capi_actif && (
        <div>
          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide">
            Token d'accès API
          </label>
          <div className="flex gap-2">
            <input
              type={showToken ? "text" : "password"}
              value={draft.capi_token}
              onChange={e => setDraft(prev => ({ ...prev, capi_token: e.target.value }))}
              placeholder="EAAxxxxxxxx..."
              className="flex-1 px-3 py-2.5 text-sm font-mono rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 dark:text-white"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="px-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500"
            >
              {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Bouton confirmer */}
      <button
        onClick={handleAdd}
        disabled={!draft.nom.trim() || !draft.pixel_id.trim()}
        className="w-full py-2.5 bg-[#305CDE] text-white rounded-xl font-bold text-sm hover:bg-[#305CDE]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        Ajouter ce Pixel
      </button>
    </div>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────────
export default function PixelFacebookTab({ boutiqueId, initialPixels = [], onChange }: Props) {
  const [pixels, setPixels] = useState<PixelConfig[]>(initialPixels);

  const update = (newPixels: PixelConfig[]) => {
    setPixels(newPixels);
    onChange?.(newPixels);
  };

  const handleAdd = (p: PixelConfig) => update([...pixels, p]);

  const handleUpdate = (id: string, updated: PixelConfig) =>
    update(pixels.map(p => p.id === id ? updated : p));

  const handleDelete = (id: string) => {
    if (!confirm("Supprimer ce pixel ?")) return;
    update(pixels.filter(p => p.id !== id));
  };

  const activeCount = pixels.filter(p => p.pixel_actif).length;
  const capiCount   = pixels.filter(p => p.capi_actif && p.capi_token).length;

  return (
    <div className="space-y-4">

      {/* ── En-tête ── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-[#305CDE]/30 flex items-center justify-center">
            <Facebook className="w-5 h-5 text-[#305CDE]" />
          </div>
          <div>
            <p className="font-black text-sm text-gray-900 dark:text-white">Pixels Facebook</p>
            <p className="text-xs text-gray-400">Gérez plusieurs pixels pour vos campagnes</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-gray-900 dark:text-white">{pixels.length}</p>
            <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
          </div>
          <div className="bg-[#305CDE]/5 dark:bg-[#305CDE]/10 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-[#305CDE]">{activeCount}</p>
            <p className="text-[10px] text-[#305CDE] uppercase tracking-wide">Actifs</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-2.5 text-center">
            <p className="text-lg font-black text-green-600">{capiCount}</p>
            <p className="text-[10px] text-green-600 uppercase tracking-wide">+ CAPI</p>
          </div>
        </div>
      </div>

      {/* ── Info sauvegarde ── */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
        <span className="text-amber-500 text-sm mt-0.5">💾</span>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Les modifications sont appliquées localement. Cliquez sur <strong>Enregistrer</strong> en bas de page pour sauvegarder dans Supabase.
        </p>
      </div>

      {/* ── Liste pixels ── */}
      {pixels.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <div className="w-12 h-12 bg-[#305CDE]/10 rounded-2xl flex items-center justify-center mb-3">
            <Facebook className="w-6 h-6 text-[#305CDE]" />
          </div>
          <p className="text-sm font-bold text-gray-600 dark:text-gray-300">Aucun pixel configuré</p>
          <p className="text-xs text-gray-400 mt-1">Ajoutez votre premier pixel ci-dessous</p>
        </div>
      ) : (
        <div className="space-y-3">
          {pixels.map((pixel, index) => (
            <PixelCard
              key={pixel.id}
              pixel={pixel}
              index={index}
              onUpdate={updated => handleUpdate(pixel.id, updated)}
              onDelete={() => handleDelete(pixel.id)}
            />
          ))}
        </div>
      )}

      {/* ── Formulaire ajout ── */}
      <NewPixelForm onAdd={handleAdd} />

      {/* ── Instructions migration ── */}
      <details className="group">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1 select-none">
          <span className="group-open:hidden">▶</span>
          <span className="hidden group-open:inline">▼</span>
          Instructions de migration Supabase
        </summary>
        <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-900/40 rounded-xl text-xs font-mono text-gray-500 dark:text-gray-400 space-y-1">
          <p className="text-gray-400 font-sans font-bold mb-2">SQL à exécuter dans Supabase SQL Editor :</p>
          <p>{"ALTER TABLE boutiques"}</p>
          <p className="pl-4">{"ADD COLUMN IF NOT EXISTS pixels_config jsonb DEFAULT '[]'::jsonb;"}</p>
        </div>
      </details>
    </div>
  );
}
