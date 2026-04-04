import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield } from "lucide-react";

const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

export default function PrivacyPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap'); .font-display{font-family:'Syne',sans-serif;}`}</style>

      {/* Header */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <img src={LOGO} alt="NEXORA" className="w-8 h-8 object-contain" />
            <span className="font-display text-lg font-black">NEXORA</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-5 py-12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <Shield className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-black">Politique de Confidentialité</h1>
            <p className="text-sm text-gray-500">Dernière mise à jour : Mars 2026</p>
          </div>
        </div>

        <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed text-gray-600">
          <h2 className="font-display text-lg font-black text-gray-900">1. Collecte des données</h2>
          <p>NEXORA collecte les informations que vous fournissez lors de votre inscription : nom, prénom, adresse e-mail et nom d'utilisateur. Les données financières (entrées, dépenses, factures) sont stockées de manière sécurisée et ne sont accessibles que par vous.</p>

          <h2 className="font-display text-lg font-black text-gray-900">2. Utilisation des données</h2>
          <p>Vos données sont utilisées uniquement pour le fonctionnement de la plateforme NEXORA : gestion de votre compte, génération de factures, suivi financier, fonctionnement de la boutique et des transferts d'argent.</p>

          <h2 className="font-display text-lg font-black text-gray-900">3. Protection des données</h2>
          <p>Toutes les données sont chiffrées en transit et au repos. Les mots de passe sont hachés et ne sont jamais stockés en clair. Le coffre-fort numérique utilise un chiffrement de bout en bout.</p>

          <h2 className="font-display text-lg font-black text-gray-900">4. Partage des données</h2>
          <p>NEXORA ne vend, ne loue et ne partage jamais vos données personnelles avec des tiers à des fins commerciales. Les données de paiement sont traitées par nos partenaires de paiement certifiés.</p>

          <h2 className="font-display text-lg font-black text-gray-900">5. Cookies</h2>
          <p>NEXORA utilise des cookies essentiels pour le fonctionnement de la plateforme (session, authentification). Aucun cookie publicitaire ou de tracking n'est utilisé.</p>

          <h2 className="font-display text-lg font-black text-gray-900">6. Vos droits</h2>
          <p>Vous avez le droit d'accéder, de modifier et de supprimer vos données personnelles à tout moment depuis votre profil. Pour toute demande, contactez-nous à support@nexora.africa.</p>

          <h2 className="font-display text-lg font-black text-gray-900">7. Contact</h2>
          <p>Pour toute question relative à la confidentialité, écrivez-nous à : <strong>support@nexora.africa</strong></p>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} NEXORA. Tous droits réservés.
      </div>
    </div>
  );
}
