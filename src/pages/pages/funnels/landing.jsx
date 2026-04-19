import { useNavigate } from "react-router-dom";
import { ArrowLeft, Edit3, Eye, Settings, ArrowRight } from "lucide-react";

export default function StepLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={() => navigate("/funnels")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="font-black text-gray-900">Landing Page</h1>
            <p className="text-xs text-gray-400">Étape 1 du tunnel</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Infos */}
        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4">
          <div className="font-black text-violet-900 mb-1">📄 C'est quoi une Landing Page ?</div>
          <div className="text-sm text-violet-700">
            La landing page est la première page que voit votre visiteur. Son but : convaincre de passer à l'action (acheter, s'inscrire, contacter).
          </div>
        </div>

        {/* Conseils */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900">✅ Éléments essentiels</h2>
          {[
            { title: "Titre accrocheur", desc: "Parlez du bénéfice principal, pas du produit." },
            { title: "Sous-titre clair", desc: "Expliquez en 1 phrase ce que vous offrez." },
            { title: "Image ou vidéo", desc: "Montrez le produit ou le résultat." },
            { title: "Preuves sociales", desc: "Témoignages, avis, nombre de clients." },
            { title: "Bouton CTA fort", desc: "\"Je veux ma formation\", \"Commencer maintenant\"" },
          ].map((item, i) => (
            <div key={i} className="flex gap-3">
              <div className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </div>
              <div>
                <div className="font-bold text-gray-800 text-sm">{item.title}</div>
                <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Prochaine étape */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h2 className="font-black text-gray-900 mb-3">🔀 Prochaine étape du tunnel</h2>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-violet-50 text-violet-700 text-sm font-bold px-3 py-2.5 rounded-xl text-center">
              Landing Page (ici)
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <div className="flex-1 bg-gray-100 text-gray-500 text-sm font-bold px-3 py-2.5 rounded-xl text-center">
              Checkout
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => navigate("/funnels/editor/1")}
            className="flex flex-col items-center gap-2 bg-violet-600 text-white font-bold py-4 rounded-2xl"
          >
            <Edit3 className="w-5 h-5" />
            <span className="text-xs">Éditer</span>
          </button>
          <button
            onClick={() => navigate("/funnels/preview/1")}
            className="flex flex-col items-center gap-2 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl"
          >
            <Eye className="w-5 h-5" />
            <span className="text-xs">Aperçu</span>
          </button>
          <button
            onClick={() => navigate("/funnels/settings/1")}
            className="flex flex-col items-center gap-2 bg-white border border-gray-200 text-gray-600 font-bold py-4 rounded-2xl"
          >
            <Settings className="w-5 h-5" />
            <span className="text-xs">Paramètres</span>
          </button>
        </div>
      </div>
    </div>
  );
}
