import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Package, Upload, CheckCircle2,
  Download, Truck, Tag, DollarSign, FileText, Link2, X
} from "lucide-react";

const payMethods = [
  { id: "mtn", label: "MTN Mobile Money", emoji: "📱" },
  { id: "moov", label: "Moov Money", emoji: "💙" },
  { id: "wave", label: "Wave", emoji: "🌊" },
  { id: "orange", label: "Orange Money", emoji: "🟠" },
  { id: "stripe", label: "Carte bancaire (Stripe)", emoji: "💳" },
];

export default function ProductCreate() {
  const navigate = useNavigate();
  const [saved, setSaved] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    type: "digital",
    price: "",
    originalPrice: "",
    currency: "FCFA",
    downloadUrl: "",
    downloadFile: null,
    deliveryInfo: "",
    acceptedPayments: ["mtn", "moov"],
    thankYouPage: "",
    limitedQty: false,
    qty: "",
    tags: [],
    tagInput: "",
  });

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const togglePayment = (id) => {
    update("acceptedPayments",
      form.acceptedPayments.includes(id)
        ? form.acceptedPayments.filter(p => p !== id)
        : [...form.acceptedPayments, id]
    );
  };

  const addTag = () => {
    if (!form.tagInput.trim()) return;
    update("tags", [...form.tags, form.tagInput.trim()]);
    update("tagInput", "");
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => { setSaved(false); navigate("/funnels/products"); }, 1500);
  };

  const inputClass = "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400 transition-colors";
  const labelClass = "text-xs font-bold text-gray-400 mb-1.5 block";

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/funnels/products")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Nouveau produit</h1>
              <p className="text-xs text-gray-400">Configurez votre produit</p>
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

        {/* Type de produit */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">📦 Type de produit</h2>
          <div className="grid grid-cols-2 gap-2">
            {[
              { id: "digital", icon: Download, label: "Produit digital", desc: "Formation, PDF, template..." },
              { id: "physical", icon: Truck, label: "Produit physique", desc: "Livraison à l'adresse" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => update("type", t.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  form.type === t.id ? "border-violet-500 bg-violet-50" : "border-gray-100 hover:border-violet-200"
                }`}
              >
                <t.icon className="w-5 h-5 text-violet-500 mb-2" />
                <div className="font-bold text-gray-800 text-sm">{t.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Infos générales */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-600" /> Informations
          </h2>
          <div>
            <label className={labelClass}>Nom du produit *</label>
            <input value={form.name} onChange={e => update("name", e.target.value)} className={inputClass} placeholder="Ex: Formation Dropshipping 2025" />
          </div>
          <div>
            <label className={labelClass}>Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={e => update("description", e.target.value)}
              className={inputClass + " resize-none"}
              placeholder="Décrivez votre produit..."
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelClass}>Tags</label>
            <div className="flex gap-2 flex-wrap mb-2">
              {form.tags.map((t, i) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-1 rounded-lg">
                  <Tag className="w-2.5 h-2.5" /> {t}
                  <button onClick={() => update("tags", form.tags.filter((_, idx) => idx !== i))}>
                    <X className="w-2.5 h-2.5 ml-0.5" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={form.tagInput}
                onChange={e => update("tagInput", e.target.value)}
                onKeyDown={e => e.key === "Enter" && addTag()}
                className={inputClass}
                placeholder="formation, dropshipping..."
              />
              <button onClick={addTag} className="px-3 bg-violet-100 text-violet-700 font-bold text-sm rounded-xl">
                + Ajouter
              </button>
            </div>
          </div>
        </div>

        {/* Prix */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-violet-600" /> Prix
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Prix de vente *</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.price}
                  onChange={e => update("price", e.target.value)}
                  className={inputClass + " pr-14"}
                  placeholder="5000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA</span>
              </div>
            </div>
            <div>
              <label className={labelClass}>Prix barré (optionnel)</label>
              <div className="relative">
                <input
                  type="number"
                  value={form.originalPrice}
                  onChange={e => update("originalPrice", e.target.value)}
                  className={inputClass + " pr-14"}
                  placeholder="10000"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">FCFA</span>
              </div>
            </div>
          </div>

          {/* Quantité limitée */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Quantité limitée</div>
              <div className="text-xs text-gray-400">Créer de la rareté</div>
            </div>
            <button
              onClick={() => update("limitedQty", !form.limitedQty)}
              className={`w-12 h-6 rounded-full transition-colors relative ${form.limitedQty ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${form.limitedQty ? "left-7" : "left-1"}`} />
            </button>
          </div>
          {form.limitedQty && (
            <input
              type="number"
              value={form.qty}
              onChange={e => update("qty", e.target.value)}
              className={inputClass}
              placeholder="Nombre d'exemplaires disponibles"
            />
          )}
        </div>

        {/* Livraison produit digital */}
        {form.type === "digital" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Download className="w-4 h-4 text-violet-600" /> Livraison digitale
            </h2>
            <div>
              <label className={labelClass}>Lien de téléchargement</label>
              <input
                value={form.downloadUrl}
                onChange={e => update("downloadUrl", e.target.value)}
                className={inputClass}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-100" />
              <span className="text-xs text-gray-400 font-semibold">ou</span>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <button className="w-full border-2 border-dashed border-gray-200 rounded-xl py-4 text-sm text-gray-400 font-semibold hover:border-violet-300 hover:text-violet-400 transition-colors flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" /> Upload le fichier (max 100MB)
            </button>
          </div>
        )}

        {/* Livraison physique */}
        {form.type === "physical" && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
            <h2 className="font-black text-gray-900 text-sm flex items-center gap-2">
              <Truck className="w-4 h-4 text-violet-600" /> Livraison physique
            </h2>
            <div>
              <label className={labelClass}>Instructions de livraison</label>
              <textarea
                rows={3}
                value={form.deliveryInfo}
                onChange={e => update("deliveryInfo", e.target.value)}
                className={inputClass + " resize-none"}
                placeholder="Ex: Livraison dans 48h à Cotonou. Frais : 1 000 FCFA"
              />
            </div>
          </div>
        )}

        {/* Méthodes de paiement */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">💳 Méthodes de paiement acceptées</h2>
          <div className="space-y-2">
            {payMethods.map(m => (
              <button
                key={m.id}
                onClick={() => togglePayment(m.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                  form.acceptedPayments.includes(m.id)
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-100"
                }`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="font-semibold text-gray-800 text-sm flex-1 text-left">{m.label}</span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                  form.acceptedPayments.includes(m.id) ? "border-violet-500 bg-violet-500" : "border-gray-300"
                }`}>
                  {form.acceptedPayments.includes(m.id) && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Redirection */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm flex items-center gap-2">
            <Link2 className="w-4 h-4 text-violet-600" /> Après paiement
          </h2>
          <div>
            <label className={labelClass}>Rediriger vers (optionnel)</label>
            <input
              value={form.thankYouPage}
              onChange={e => update("thankYouPage", e.target.value)}
              className={inputClass}
              placeholder="/merci ou https://..."
            />
            <p className="text-xs text-gray-400 mt-1">Laissez vide pour utiliser la page "Merci" par défaut.</p>
          </div>
        </div>

        <button
          onClick={handleSave}
          className={`w-full flex items-center justify-center gap-2 font-bold py-4 rounded-2xl text-base transition-all ${
            saved ? "bg-emerald-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700"
          }`}
        >
          {saved ? <><CheckCircle2 className="w-5 h-5" /> Produit sauvegardé !</> : <><Save className="w-5 h-5" /> Enregistrer le produit</>}
        </button>

        <div className="pb-6" />
      </div>
    </div>
  );
}
