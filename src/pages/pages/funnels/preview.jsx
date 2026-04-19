import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Smartphone, Tablet, Monitor,
  Share2, ExternalLink, Eye
} from "lucide-react";

// Simulation de contenu de page
const demoPage = {
  title: "Formation Dropshipping 2025",
  url: "votre-page.nexora.app",
  elements: [
    { id: "1", type: "heading", content: "Apprenez le Dropshipping et Gagnez depuis l'Afrique 🚀", style: { fontSize: "28px", align: "center", color: "#111827" } },
    { id: "2", type: "text", content: "Plus de 1 200 entrepreneurs africains ont déjà transformé leur vie grâce à cette méthode.", style: { align: "center", color: "#6B7280" } },
    { id: "3", type: "image" },
    { id: "4", type: "product" },
    { id: "5", type: "text", content: "✅ Accès à vie   ✅ Support WhatsApp   ✅ Certificat inclus", style: { align: "center", color: "#059669" } },
  ],
};

function PreviewElement({ el }) {
  if (el.type === "heading") return (
    <h2 style={{ fontSize: el.style?.fontSize || "24px", color: el.style?.color || "#111827", textAlign: el.style?.align || "left", fontWeight: "800", lineHeight: "1.2" }}>
      {el.content}
    </h2>
  );

  if (el.type === "text") return (
    <p style={{ fontSize: el.style?.fontSize || "15px", color: el.style?.color || "#4B5563", textAlign: el.style?.align || "left", lineHeight: "1.7" }}>
      {el.content}
    </p>
  );

  if (el.type === "button") return (
    <div style={{ textAlign: el.style?.align || "center" }}>
      <button style={{ background: el.style?.bgColor || "#7C3AED", color: "#fff", borderRadius: "12px", padding: "14px 28px", fontWeight: "800", fontSize: "16px", width: "100%" }}>
        {el.content}
      </button>
    </div>
  );

  if (el.type === "image") return (
    <div className="bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center h-44">
      <div className="text-center">
        <div className="text-4xl mb-2">📦</div>
        <div className="text-sm text-violet-500 font-semibold">Votre image ici</div>
      </div>
    </div>
  );

  if (el.type === "product") return (
    <div className="border-2 border-violet-200 rounded-2xl p-5 bg-violet-50 text-center">
      <div className="text-xs font-bold text-violet-500 uppercase tracking-widest mb-2">Offre spéciale</div>
      <div className="text-gray-400 text-sm line-through mb-1">10 000 FCFA</div>
      <div className="text-4xl font-black text-gray-900 mb-1">5 000 <span className="text-xl text-gray-500">FCFA</span></div>
      <div className="text-xs text-emerald-600 font-bold mb-4">🔥 -50% — Offre limitée</div>
      <button className="w-full bg-amber-500 text-white font-black py-4 rounded-xl text-lg shadow-lg shadow-amber-200">
        📱 Payer avec MTN MoMo
      </button>
      <div className="mt-2 text-xs text-gray-400">Paiement 100% sécurisé</div>
    </div>
  );

  if (el.type === "countdown") return (
    <div className="bg-gray-900 rounded-xl p-4 text-center">
      <div className="text-xs text-yellow-400 mb-2 font-bold">⏰ Offre expire dans</div>
      <div className="flex justify-center gap-3">
        {[{ v: "01", l: "Jour" }, { v: "23", l: "Heures" }, { v: "47", l: "Min" }, { v: "12", l: "Sec" }].map(t => (
          <div key={t.l}>
            <div className="bg-violet-600 text-white font-black text-xl w-12 h-12 rounded-xl flex items-center justify-center">{t.v}</div>
            <div className="text-xs text-gray-400 mt-1">{t.l}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return null;
}

export default function FunnelPreview() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [viewport, setViewport] = useState("mobile");

  const containerClass = {
    mobile: "max-w-sm",
    tablet: "max-w-md",
    desktop: "max-w-2xl",
  };

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Top bar */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        <button
          onClick={() => navigate(`/funnels/editor/${id}`)}
          className="flex items-center gap-2 text-sm text-gray-300 font-semibold hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Retour éditeur
        </button>

        {/* Viewport selector */}
        <div className="flex items-center gap-1 bg-gray-700 rounded-xl p-1">
          {[
            { id: "mobile", icon: Smartphone, label: "Mobile" },
            { id: "tablet", icon: Tablet, label: "Tablette" },
            { id: "desktop", icon: Monitor, label: "Desktop" },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => setViewport(v.id)}
              title={v.label}
              className={`w-9 h-8 rounded-lg flex items-center justify-center transition-colors ${
                viewport === v.id ? "bg-violet-600 text-white" : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <v.icon className="w-4 h-4" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 text-xs bg-gray-700 text-gray-200 font-bold px-3 py-2 rounded-xl hover:bg-gray-600 transition-colors">
            <Share2 className="w-3 h-3" /> Partager
          </button>
          <button className="flex items-center gap-1.5 text-xs bg-violet-600 text-white font-bold px-3 py-2 rounded-xl hover:bg-violet-700 transition-colors">
            <ExternalLink className="w-3 h-3" /> Ouvrir
          </button>
        </div>
      </div>

      {/* URL bar */}
      <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
        <Eye className="w-4 h-4 text-gray-500" />
        <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 font-mono flex items-center justify-between">
          <span>https://{demoPage.url}</span>
          <div className="w-2 h-2 bg-emerald-400 rounded-full ml-2 flex-shrink-0" title="Page active" />
        </div>
      </div>

      {/* Preview area */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div className={`w-full ${containerClass[viewport]} transition-all duration-300`}>
          {/* Browser chrome */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <div className="w-3 h-3 bg-yellow-400 rounded-full" />
                <div className="w-3 h-3 bg-green-400 rounded-full" />
              </div>
              <div className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-1 text-xs text-gray-500 font-mono">
                {demoPage.url}
              </div>
            </div>

            {/* Page */}
            <div className="p-5 space-y-4 min-h-96">
              {demoPage.elements.map(el => (
                <PreviewElement key={el.id} el={el} />
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-center">
              <div className="text-xs text-gray-300">Propulsé par Nexora Pages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2 flex items-center justify-center gap-6">
        {[
          { label: "Vues", value: "1 240" },
          { label: "Taux conv.", value: "7%" },
          { label: "Revenus", value: "435K FCFA" },
        ].map(s => (
          <div key={s.label} className="text-center">
            <div className="text-sm font-black text-white">{s.value}</div>
            <div className="text-xs text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
