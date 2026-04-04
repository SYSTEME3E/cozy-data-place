import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, FileText } from "lucide-react";

const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

export default function CGUPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-white text-gray-900" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=Syne:wght@700;800;900&display=swap'); .font-display{font-family:'Syne',sans-serif;}`}</style>
      {/* Header */}
      <div className="bg-gray-950 text-white py-16">
        <div className="max-w-4xl mx-auto px-6">
          <button onClick={() => navigate("/")} className="flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors text-sm font-semibold">
            <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
          </button>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center">
              <FileText className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Légal</p>
              <h1 className="font-display text-3xl font-black">Conditions Générales d'Utilisation</h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm">Dernière mise à jour : 27 mars 2026 · Version 1.0</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-12">

        {/* Intro */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8">
          <p className="text-gray-700 leading-relaxed text-base">
            Bienvenue sur <strong>NEXORA</strong>, la plateforme financière tout-en-un dédiée aux entrepreneurs et particuliers africains. En accédant à nos services, vous acceptez les présentes Conditions Générales d'Utilisation (CGU). Veuillez les lire attentivement avant toute utilisation de la plateforme.
          </p>
        </div>

        {[
          {
            num: "01", title: "Définitions",
            content: [
              { sub: "NEXORA", text: 'Désigne la plateforme en ligne accessible à l\'adresse nexora.africa, éditée et exploitée par NEXORA SAS.' },
              { sub: "Utilisateur", text: "Désigne toute personne physique ou morale qui crée un compte et utilise les services proposés par NEXORA." },
              { sub: "Services", text: "Désigne l'ensemble des modules et fonctionnalités proposés par NEXORA : gestion financière, facturation, boutique e-commerce, marché immobilier, coffre-fort digital, transfert d'argent, prêts entre particuliers et abonnements." },
              { sub: "Compte", text: "Désigne l'espace personnel créé par l'Utilisateur après inscription sur la plateforme." },
            ]
          },
          {
            num: "02", title: "Accès aux services",
            content: [
              { sub: "Conditions d'accès", text: "L'accès à NEXORA est réservé aux personnes majeures (18 ans ou plus) ou aux mineurs dûment autorisés par leurs représentants légaux. En vous inscrivant, vous déclarez avoir la capacité juridique pour accepter ces CGU." },
              { sub: "Inscription", text: "L'inscription nécessite la fourniture d'informations exactes, complètes et à jour. Vous êtes responsable de la confidentialité de vos identifiants de connexion. Toute utilisation de votre compte reste sous votre entière responsabilité." },
              { sub: "Compte gratuit", text: "NEXORA propose un accès gratuit à ses fonctionnalités de base. Des fonctionnalités avancées peuvent nécessiter une souscription à un plan payant (NEXORA Premium)." },
              { sub: "Résiliation", text: "Vous pouvez clore votre compte à tout moment depuis les paramètres de votre profil. NEXORA se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU." },
            ]
          },
          {
            num: "03", title: "Modules et fonctionnalités",
            content: [
              { sub: "Gestion financière", text: "NEXORA vous permet de suivre vos entrées et dépenses, générer des rapports financiers et visualiser votre situation financière. Ces données sont stockées de manière sécurisée et ne sont pas partagées avec des tiers sans votre consentement." },
              { sub: "Facturation", text: "Le module de facturation permet la création, l'envoi et l'archivage de factures PDF professionnelles. L'Utilisateur est seul responsable de la conformité fiscale de ses factures selon la législation de son pays." },
              { sub: "Boutique E-commerce", text: "NEXORA met à disposition un outil de création de boutique en ligne. L'Utilisateur est responsable de la légalité des produits mis en vente, du respect du droit de la consommation et du traitement des commandes." },
              { sub: "Marché Immobilier", text: "Les annonces immobilières publiées sur NEXORA sont sous la responsabilité exclusive de leurs auteurs. NEXORA ne saurait être tenu responsable de l'exactitude des informations publiées." },
              { sub: "Coffre-Fort Digital", text: "Les données stockées dans le coffre-fort sont chiffrées. NEXORA n'a pas accès au contenu de votre coffre-fort. En cas de perte de vos identifiants, la récupération des données ne peut être garantie." },
              { sub: "Transfert d'Argent", text: "Le service de transfert utilise des opérateurs Mobile Money tiers agréés. Les délais et disponibilités dépendent des opérateurs partenaires. Des frais de 3% s'appliquent aux transferts sortants." },
              { sub: "Prêts entre Particuliers", text: "NEXORA facilite la mise en relation entre prêteurs et emprunteurs. NEXORA n'est pas un établissement de crédit et n'intervient pas dans les décisions de prêt. Les utilisateurs sont seuls responsables de leurs engagements financiers." },
            ]
          },
          {
            num: "04", title: "Obligations de l'Utilisateur",
            content: [
              { sub: "Usage licite", text: "Vous vous engagez à utiliser NEXORA uniquement à des fins légales et conformément aux lois et réglementations en vigueur dans votre pays de résidence." },
              { sub: "Exactitude des informations", text: "Vous vous engagez à fournir des informations exactes et à les maintenir à jour. Toute information fausse ou trompeuse peut entraîner la suspension immédiate de votre compte." },
              { sub: "Sécurité", text: "Vous êtes responsable de la sécurité de votre mot de passe et de toutes les activités effectuées depuis votre compte. Vous devez informer NEXORA immédiatement en cas d'utilisation non autorisée." },
              { sub: "Interdictions", text: "Il est strictement interdit : d'utiliser NEXORA à des fins frauduleuses ou illicites, de tenter de compromettre la sécurité de la plateforme, de revendre ou céder l'accès à votre compte, et de porter atteinte aux droits d'autres utilisateurs." },
            ]
          },
          {
            num: "05", title: "Responsabilité et garanties",
            content: [
              { sub: "Disponibilité", text: "NEXORA s'efforce de maintenir une disponibilité de 99.9% de ses services. Cependant, des interruptions temporaires pour maintenance ou raisons techniques peuvent survenir. NEXORA ne saurait être tenu responsable des dommages résultant d'une indisponibilité du service." },
              { sub: "Limitation de responsabilité", text: "NEXORA est une plateforme d'outils. La responsabilité de NEXORA ne peut être engagée pour les décisions financières, commerciales ou immobilières prises par les Utilisateurs sur la base des informations disponibles sur la plateforme." },
              { sub: "Force majeure", text: "NEXORA ne saurait être tenu responsable des manquements à ses obligations en cas de force majeure, notamment en cas de défaillance des opérateurs télécom partenaires, de catastrophes naturelles ou de décisions gouvernementales." },
            ]
          },
          {
            num: "06", title: "Propriété intellectuelle",
            content: [
              { sub: "Droits NEXORA", text: "L'ensemble du contenu de la plateforme NEXORA (logo, design, textes, fonctionnalités, code source) est protégé par le droit de la propriété intellectuelle et appartient exclusivement à NEXORA SAS." },
              { sub: "Droits Utilisateur", text: "Les données et contenus créés par l'Utilisateur (factures, produits, annonces) restent sa propriété. L'Utilisateur accorde à NEXORA une licence limitée pour afficher et traiter ces contenus dans le cadre de la fourniture des services." },
            ]
          },
          {
            num: "07", title: "Modification et résiliation",
            content: [
              { sub: "Modification des CGU", text: "NEXORA se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront notifiés par e-mail ou via la plateforme. La poursuite de l'utilisation des services après notification vaut acceptation des nouvelles CGU." },
              { sub: "Résiliation par NEXORA", text: "NEXORA peut résilier ou suspendre votre accès sans préavis en cas de violation des CGU, d'activité frauduleuse ou de comportement portant préjudice à la plateforme ou à d'autres utilisateurs." },
            ]
          },
          {
            num: "08", title: "Droit applicable",
            content: [
              { sub: "Juridiction", text: "Les présentes CGU sont régies par le droit applicable dans la juridiction du siège social de NEXORA SAS. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de cette juridiction." },
              { sub: "Contact", text: "Pour toute question relative aux présentes CGU, vous pouvez nous contacter à : support@nexora.africa" },
            ]
          },
        ].map((section) => (
          <div key={section.num} className="space-y-6">
            <div className="flex items-center gap-4">
              <span className="font-display text-5xl font-black text-gray-100">{section.num}</span>
              <h2 className="font-display text-2xl font-black text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-gray-100">
              {section.content.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6">
                  <h3 className="font-bold text-gray-900 mb-2">{item.sub}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Footer légal */}
        <div className="bg-gray-950 text-white rounded-3xl p-8 text-center">
          <img src={LOGO} alt="NEXORA" className="w-10 h-10 object-contain mx-auto mb-3" />
          <p className="font-display font-black text-lg mb-2">NEXORA</p>
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} NEXORA SAS. Tous droits réservés.</p>
          <p className="text-gray-500 text-xs mt-2">Pour toute question : support@nexora.africa</p>
        </div>
      </div>
    </div>
  );
}
