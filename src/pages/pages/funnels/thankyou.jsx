import { useNavigate } from "react-router-dom";
import { CheckCircle2, Download, MessageCircle, Share2, ArrowRight } from "lucide-react";

export default function StepThankYou() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-lg mx-auto w-full px-4 py-10 space-y-6 flex-1 flex flex-col items-center justify-center">

        {/* Icône succès animée */}
        <div className="relative">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center shadow-xl shadow-emerald-200 animate-bounce">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -top-1 -right-1 text-3xl animate-spin" style={{ animationDuration: "3s" }}>✨</div>
        </div>

        {/* Message */}
        <div className="text-center">
          <h1 className="font-black text-2xl text-gray-900">Paiement confirmé ! 🎉</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Merci pour votre achat. Votre commande a été traitée avec succès.
          </p>
        </div>

        {/* Détails commande */}
        <div className="w-full bg-white rounded-2xl border border-emerald-100 p-5 space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center text-2xl">📦</div>
            <div>
              <div className="font-black text-gray-900">Formation Dropshipping 2025</div>
              <div className="text-xs text-emerald-600 font-bold mt-0.5">✅ Accès activé</div>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Montant payé</span>
              <span className="font-black text-gray-900">5 000 FCFA</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Méthode</span>
              <span className="font-semibold text-gray-700">📱 MTN MoMo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Référence</span>
              <span className="font-mono text-xs text-gray-500">NXR-{Date.now().toString().slice(-8)}</span>
            </div>
          </div>
        </div>

        {/* Étapes suivantes */}
        <div className="w-full bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="font-black text-gray-900 text-sm">🚀 Prochaines étapes</h3>
          {[
            { icon: "📧", title: "Vérifiez votre email", desc: "Un email de confirmation vous a été envoyé." },
            { icon: "📱", title: "Rejoignez le groupe WhatsApp", desc: "Le lien est dans votre email de confirmation." },
            { icon: "🎓", title: "Commencez votre formation", desc: "Accédez à votre espace membre dès maintenant." },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="text-xl flex-shrink-0">{step.icon}</div>
              <div>
                <div className="font-bold text-gray-800 text-sm">{step.title}</div>
                <div className="text-xs text-gray-400 mt-0.5">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="w-full space-y-2">
          <button className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-violet-200">
            <Download className="w-5 h-5" /> Télécharger ma facture
          </button>
          <button className="w-full flex items-center justify-center gap-2 bg-emerald-500 text-white font-bold py-3.5 rounded-2xl">
            <MessageCircle className="w-4 h-4" /> Rejoindre le groupe WhatsApp
          </button>
          <button
            onClick={() => navigate("/funnels")}
            className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-500 font-bold py-3 rounded-2xl text-sm hover:bg-gray-50"
          >
            Retour au dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Share */}
        <div className="text-center">
          <p className="text-xs text-gray-400 mb-2">Partagez votre succès avec vos amis !</p>
          <button className="flex items-center gap-2 text-violet-600 font-bold text-sm mx-auto">
            <Share2 className="w-4 h-4" /> Partager sur WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
