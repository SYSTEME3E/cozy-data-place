import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShoppingBag, Shield, Check,
  Smartphone, CreditCard, ArrowRight
} from "lucide-react";

const payMethods = [
  { id: "mtn", label: "MTN Mobile Money", emoji: "📱", color: "#FFC107", countries: "🇧🇯🇨🇮🇨🇲" },
  { id: "moov", label: "Moov Money", emoji: "💙", color: "#0099CC", countries: "🇧🇯🇨🇮" },
  { id: "wave", label: "Wave", emoji: "🌊", color: "#1DC9F5", countries: "🇸🇳🇨🇮" },
  { id: "orange", label: "Orange Money", emoji: "🟠", color: "#FF6B00", countries: "🌍" },
];

export default function StepCheckout() {
  const navigate = useNavigate();
  const [payMethod, setPayMethod] = useState("mtn");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePay = () => {
    if (!phone || !name) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigate("/funnels/steps/thankyou");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="font-black text-gray-900">Paiement sécurisé</h1>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="w-3 h-3 text-emerald-500" />
              <p className="text-xs text-emerald-600 font-semibold">SSL — 100% sécurisé</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Résumé commande */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 text-sm mb-3 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-violet-600" /> Votre commande
          </h2>
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">📦</div>
            <div className="flex-1">
              <div className="font-bold text-gray-800">Formation Dropshipping 2025</div>
              <div className="text-xs text-gray-400 mt-0.5">Accès à vie • Support WhatsApp inclus</div>
            </div>
          </div>
          <div className="pt-3 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Prix normal</span>
              <span className="text-gray-400 line-through">10 000 FCFA</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-emerald-600 font-bold">Réduction -50%</span>
              <span className="text-emerald-600 font-bold">-5 000 FCFA</span>
            </div>
            <div className="flex justify-between font-black text-base pt-1 border-t border-gray-100">
              <span>Total à payer</span>
              <span className="text-violet-700">5 000 FCFA</span>
            </div>
          </div>
        </div>

        {/* Infos client */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">Vos informations</h2>
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block">Nom complet *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Jean Dupont"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="jean@gmail.com"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>
        </div>

        {/* Méthode de paiement */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">Mode de paiement</h2>
          <div className="grid grid-cols-2 gap-2">
            {payMethods.map(m => (
              <button
                key={m.id}
                onClick={() => setPayMethod(m.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  payMethod === m.id
                    ? "border-violet-500 bg-violet-50"
                    : "border-gray-100 hover:border-violet-200"
                }`}
              >
                <div className="text-xl mb-1">{m.emoji}</div>
                <div className="text-xs font-bold text-gray-800 leading-tight">{m.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{m.countries}</div>
              </button>
            ))}
          </div>

          {/* Numéro téléphone */}
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1 block">
              Numéro {payMethods.find(m => m.id === payMethod)?.label} *
            </label>
            <div className="flex gap-2">
              <div className="bg-gray-100 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-600 flex-shrink-0">
                +229
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="97 XX XX XX"
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-400"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Vous recevrez une notification de paiement sur ce numéro.
            </p>
          </div>
        </div>

        {/* Garanties */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: "🔒", label: "Paiement sécurisé" },
            { icon: "📱", label: "Mobile Money" },
            { icon: "✅", label: "Accès immédiat" },
          ].map((g, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-2.5 text-center">
              <div className="text-xl mb-1">{g.icon}</div>
              <div className="text-xs text-gray-500 font-semibold leading-tight">{g.label}</div>
            </div>
          ))}
        </div>

        {/* Bouton payer */}
        <button
          onClick={handlePay}
          disabled={!phone || !name || loading}
          className="w-full bg-amber-500 text-white font-black py-4 rounded-2xl text-base disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg shadow-amber-200 hover:bg-amber-600 transition-colors"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Traitement en cours...
            </>
          ) : (
            <>
              <Smartphone className="w-5 h-5" />
              Payer 5 000 FCFA avec {payMethods.find(m => m.id === payMethod)?.label}
            </>
          )}
        </button>

        <div className="text-center text-xs text-gray-400 pb-4">
          En payant, vous acceptez nos <span className="text-violet-600 font-semibold">conditions générales</span>
        </div>
      </div>
    </div>
  );
}
