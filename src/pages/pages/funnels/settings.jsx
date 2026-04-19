import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Save, Globe, Search, Palette,
  Link2, ArrowRight, Trash2, AlertTriangle,
  CheckCircle2, Eye, EyeOff, Facebook
} from "lucide-react";

const sectionClass = "bg-white rounded-2xl border border-gray-100 p-5 space-y-4";
const labelClass = "text-xs font-bold text-gray-500 mb-1.5 block";
const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition-colors";

export default function FunnelSettings() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [saved, setSaved] = useState(false);
  const [showDangerZone, setShowDangerZone] = useState(false);

  const [form, setForm] = useState({
    pageName: "Formation Dropshipping",
    pageUrl: "formation-dropshipping",
    domain: "nexorapage.vercel.app",
    customDomain: "",
    seoTitle: "Formation Dropshipping 2025 — Gagnez depuis l'Afrique",
    seoDesc: "Apprenez le dropshipping et construisez votre business en ligne depuis le Bénin, le Sénégal ou la Côte d'Ivoire.",
    seoKeywords: "dropshipping, formation, afrique, business en ligne",
    bgColor: "#ffffff",
    redirectAfterPayment: "",
    facebookPixel: "",
    googleAnalytics: "",
    isPublished: true,
    showNexoraBadge: true,
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    // → Supabase update ici
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/funnels/editor/${id}`)}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Paramètres</h1>
              <p className="text-xs text-gray-400">{form.pageName}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            className={`flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all ${
              saved ? "bg-emerald-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700"
            }`}
          >
            {saved ? <><CheckCircle2 className="w-4 h-4" /> Sauvegardé</> : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* ── Publication ── */}
        <div className={sectionClass}>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Eye className="w-4 h-4 text-violet-600" /> Publication
          </h2>
          <div className="flex items-center justify-between py-2">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Page publiée</div>
              <div className="text-xs text-gray-400 mt-0.5">Visible par les visiteurs</div>
            </div>
            <button
              onClick={() => update("isPublished", !form.isPublished)}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.isPublished ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.isPublished ? "left-7" : "left-1"}`} />
            </button>
          </div>
          {form.isPublished && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <a
                href={`https://${form.domain}/${form.pageUrl}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-700 font-mono font-semibold truncate"
              >
                {form.domain}/{form.pageUrl}
              </a>
            </div>
          )}
        </div>

        {/* ── Infos générales ── */}
        <div className={sectionClass}>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-600" /> Informations générales
          </h2>
          <div>
            <label className={labelClass}>Nom de la page</label>
            <input value={form.pageName} onChange={e => update("pageName", e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>URL de la page</label>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-400 font-mono bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 whitespace-nowrap">
                {form.domain}/
              </div>
              <input
                value={form.pageUrl}
                onChange={e => update("pageUrl", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                className={inputClass}
                placeholder="mon-url"
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Couleur de fond</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.bgColor} onChange={e => update("bgColor", e.target.value)} className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer" />
              <div className="flex gap-2 flex-wrap">
                {["#ffffff","#f9fafb","#1a1a2e","#fdf4ff","#f0fdf4","#fff7ed"].map(c => (
                  <button key={c} onClick={() => update("bgColor", c)} className="w-8 h-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200" style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEO ── */}
        <div className={sectionClass}>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Search className="w-4 h-4 text-violet-600" /> SEO (Google)
          </h2>
          <div>
            <label className={labelClass}>Titre SEO</label>
            <input value={form.seoTitle} onChange={e => update("seoTitle", e.target.value)} className={inputClass} />
            <div className="text-xs text-gray-400 mt-1">{form.seoTitle.length} / 60 caractères</div>
          </div>
          <div>
            <label className={labelClass}>Description SEO</label>
            <textarea rows={3} value={form.seoDesc} onChange={e => update("seoDesc", e.target.value)} className={inputClass + " resize-none"} />
            <div className="text-xs text-gray-400 mt-1">{form.seoDesc.length} / 160 caractères</div>
          </div>
          <div>
            <label className={labelClass}>Mots-clés</label>
            <input value={form.seoKeywords} onChange={e => update("seoKeywords", e.target.value)} className={inputClass} placeholder="mot1, mot2, mot3" />
          </div>

          {/* Aperçu Google */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="text-xs text-gray-400 mb-2 font-semibold">Aperçu dans Google</div>
            <div className="text-blue-700 text-sm font-semibold truncate">{form.seoTitle}</div>
            <div className="text-xs text-green-700 font-mono">https://{form.domain}/{form.pageUrl}</div>
            <div className="text-xs text-gray-600 mt-0.5 line-clamp-2">{form.seoDesc}</div>
          </div>
        </div>

        {/* ── Redirection ── */}
        <div className={sectionClass}>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <ArrowRight className="w-4 h-4 text-violet-600" /> Redirection après paiement
          </h2>
          <div>
            <label className={labelClass}>URL de redirection</label>
            <input
              value={form.redirectAfterPayment}
              onChange={e => update("redirectAfterPayment", e.target.value)}
              className={inputClass}
              placeholder="https://... ou /merci"
            />
            <div className="text-xs text-gray-400 mt-1">
              Laissez vide pour utiliser la page "Merci" de votre tunnel.
            </div>
          </div>
        </div>

        {/* ── Tracking ── */}
        <div className={sectionClass}>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <Facebook className="w-4 h-4 text-violet-600" /> Tracking & Analytics
          </h2>
          <div>
            <label className={labelClass}>Facebook Pixel ID</label>
            <input
              value={form.facebookPixel}
              onChange={e => update("facebookPixel", e.target.value)}
              className={inputClass}
              placeholder="123456789012345"
            />
          </div>
          <div>
            <label className={labelClass}>Google Analytics (GA4)</label>
            <input
              value={form.googleAnalytics}
              onChange={e => update("googleAnalytics", e.target.value)}
              className={inputClass}
              placeholder="G-XXXXXXXXXX"
            />
          </div>
        </div>

        {/* ── Badge Nexora ── */}
        <div className={sectionClass}>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-black text-gray-900 text-sm">Badge "Nexora Pages"</div>
              <div className="text-xs text-gray-400 mt-0.5">Afficher le logo Nexora en bas de page</div>
            </div>
            <button
              onClick={() => update("showNexoraBadge", !form.showNexoraBadge)}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.showNexoraBadge ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.showNexoraBadge ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>

        {/* ── Zone de danger ── */}
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <button
            onClick={() => setShowDangerZone(!showDangerZone)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span className="font-black text-red-700 text-sm">Zone de danger</span>
            </div>
            <span className="text-xs text-red-400">{showDangerZone ? "▲" : "▼"}</span>
          </button>
          {showDangerZone && (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-red-600">Ces actions sont irréversibles. Soyez prudent.</p>
              <button className="w-full flex items-center justify-center gap-2 bg-red-500 text-white font-bold py-3 rounded-xl text-sm hover:bg-red-600 transition-colors">
                <Trash2 className="w-4 h-4" /> Supprimer cette page
              </button>
            </div>
          )}
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
