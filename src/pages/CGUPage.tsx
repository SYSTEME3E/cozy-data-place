import { FileText } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";


const SECTIONS = [
  {
    num: "01", title: "Définitions",
    items: [
      { sub: "NEXORA", text: "Désigne la plateforme en ligne accessible à l'adresse nexora.africa, éditée et exploitée par NEXORA SAS, société spécialisée dans les services financiers numériques pour l'Afrique." },
      { sub: "Utilisateur", text: "Désigne toute personne physique ou morale qui crée un compte et utilise les services proposés par NEXORA, qu'il soit en version gratuite ou premium." },
      { sub: "Services", text: "Désigne l'ensemble des modules et fonctionnalités actifs sur NEXORA : gestion financière, facturation PDF, boutique e-commerce (Nexora Shop), marché immobilier, coffre-fort digital, transfert d'argent Mobile Money, PayLink, formations, Nexora Academy, contacts WhatsApp, abonnements, liens courts et assistant IA Nexora." },
      { sub: "Compte", text: "Désigne l'espace personnel sécurisé créé par l'Utilisateur après inscription, protégé par un identifiant, un mot de passe et optionnellement un code PIN." },
      { sub: "Plan Premium", text: "Désigne les plans payants (Boss, Roi) donnant accès à des fonctionnalités avancées de la plateforme, souscrits via paiement Mobile Money." },
    ]
  },
  {
    num: "02", title: "Accès aux services",
    items: [
      { sub: "Conditions d'accès", text: "L'accès à NEXORA est réservé aux personnes majeures (18 ans ou plus). En vous inscrivant, vous déclarez avoir la capacité juridique pour accepter ces CGU et contracter des engagements valides." },
      { sub: "Inscription", text: "L'inscription nécessite la fourniture d'un nom, prénom, numéro de téléphone et mot de passe. Vous êtes responsable de la confidentialité de vos identifiants. Toute activité sur votre compte reste sous votre entière responsabilité." },
      { sub: "Compte gratuit", text: "NEXORA propose un accès gratuit à ses fonctionnalités de base : tableau de bord financier, facturation, boutique, transfert, PayLink et immobilier. Des fonctionnalités avancées nécessitent un plan Premium." },
      { sub: "Code PIN", text: "Certaines fonctionnalités sensibles (coffre-fort, transferts) sont protégées par un code PIN personnel. NEXORA ne peut pas le récupérer en cas de perte. Vous en êtes seul responsable." },
      { sub: "Résiliation", text: "Vous pouvez clore votre compte à tout moment depuis les paramètres de votre profil. NEXORA se réserve le droit de suspendre ou supprimer tout compte en cas de violation des présentes CGU." },
    ]
  },
  {
    num: "03", title: "Fonctionnalités actives",
    items: [
      { sub: "Gestion financière", text: "Suivi des entrées/dépenses, rapports financiers, visualisation de votre évolution. Ces données sont stockées de manière sécurisée et ne sont pas partagées avec des tiers sans votre consentement." },
      { sub: "Facturation professionnelle", text: "Création, envoi et archivage de factures PDF professionnelles. L'Utilisateur est seul responsable de la conformité fiscale de ses factures selon la législation de son pays." },
      { sub: "Nexora Shop (Boutique E-commerce)", text: "Vitrine publique personnalisée, gestion des stocks, commandes, produits physiques et digitaux. L'Utilisateur est responsable de la légalité des produits mis en vente et du traitement des commandes." },
      { sub: "Nexora PayLink", text: "Création de liens de paiement Mobile Money partageables. Les paiements sont traités par l'opérateur Mobile Money partenaire. Des délais de traitement peuvent s'appliquer." },
      { sub: "Transfert d'argent Africa", text: "Transferts vers 24 pays actifs via Mobile Money. Frais : 100 FCFA au rechargement du solde + 3% sur chaque transfert sortant. Les délais dépendent des opérateurs partenaires." },
      { sub: "Marché immobilier", text: "Les annonces immobilières publiées sont sous la responsabilité exclusive de leurs auteurs. NEXORA ne garantit pas l'exactitude des informations et ne saurait être tenu responsable des transactions entre particuliers." },
      { sub: "Coffre-Fort Digital", text: "Chiffrement AES-256. NEXORA n'a pas accès au contenu de votre coffre-fort. En cas de perte de votre PIN, la récupération des données ne peut être garantie." },
      { sub: "Formations & Nexora Academy", text: "Accès conditionné à votre statut d'abonnement. Les contenus sont protégés par le droit d'auteur et ne peuvent être redistribués ou partagés sans autorisation expresse." },
      { sub: "Contacts WhatsApp", text: "Export des contacts membres vérifiés au format .vcf. Réservé aux membres Premium. L'utilisation de ces contacts à des fins de spam est strictement interdite et entraîne la suspension du compte." },
      { sub: "Assistant IA Nexora", text: "Fourni à titre d'aide uniquement. Les réponses générées sont informatives et ne constituent pas des conseils financiers, juridiques ou médicaux. NEXORA ne garantit pas leur exactitude." },
    ]
  },
  {
    num: "04", title: "Obligations de l'Utilisateur",
    items: [
      { sub: "Usage licite", text: "Vous vous engagez à utiliser NEXORA uniquement à des fins légales et conformément aux lois et réglementations en vigueur dans votre pays de résidence, notamment en matière de transactions financières et de commerce électronique." },
      { sub: "Exactitude des informations", text: "Vous vous engagez à fournir des informations exactes et à les maintenir à jour. Toute information fausse ou trompeuse peut entraîner la suspension immédiate de votre compte sans remboursement d'abonnement en cours." },
      { sub: "Sécurité", text: "Vous êtes responsable de la sécurité de votre mot de passe et de votre code PIN. En cas d'utilisation non autorisée détectée, informez-nous immédiatement à support@nexora.africa." },
      { sub: "Interdictions", text: "Il est strictement interdit : d'utiliser NEXORA à des fins frauduleuses ou de blanchiment d'argent ; de tenter de compromettre la sécurité de la plateforme ; de revendre ou céder l'accès à votre compte ; de publier des contenus illicites, offensants ou portant atteinte aux droits de tiers." },
    ]
  },
  {
    num: "05", title: "Responsabilité et garanties",
    items: [
      { sub: "Disponibilité", text: "NEXORA s'efforce de maintenir une disponibilité de 99.9% de ses services. Des interruptions temporaires pour maintenance peuvent survenir. NEXORA ne saurait être tenu responsable des dommages résultant d'une indisponibilité." },
      { sub: "Limitation de responsabilité", text: "NEXORA ne peut être tenu responsable des décisions financières, commerciales ou immobilières prises par les Utilisateurs, ni des litiges entre acheteurs et vendeurs sur la boutique ou le marché immobilier." },
      { sub: "Transactions Mobile Money", text: "NEXORA n'est pas responsable des délais, erreurs ou échecs de transactions imputables aux opérateurs partenaires (MTN, Orange, Moov, Wave, etc.). En cas de litige, NEXORA accompagne l'Utilisateur dans ses démarches auprès de l'opérateur." },
      { sub: "Force majeure", text: "NEXORA ne saurait être tenu responsable des manquements causés par : défaillance des opérateurs télécom, coupures internet, catastrophes naturelles, décisions gouvernementales ou perturbations des réseaux africains." },
    ]
  },
  {
    num: "06", title: "Propriété intellectuelle",
    items: [
      { sub: "Droits NEXORA", text: "L'ensemble du contenu de la plateforme NEXORA (logo, design, textes, fonctionnalités, code source, contenus de formation) est protégé par le droit de la propriété intellectuelle et appartient exclusivement à NEXORA SAS." },
      { sub: "Droits Utilisateur", text: "Les données et contenus créés par l'Utilisateur (factures, produits, annonces, données financières) restent sa propriété exclusive. L'Utilisateur accorde à NEXORA une licence limitée et non exclusive pour traiter ces contenus dans le cadre des services." },
    ]
  },
  {
    num: "07", title: "Données personnelles",
    items: [
      { sub: "Traitement des données", text: "Le traitement de vos données personnelles est régi par notre Politique de Confidentialité disponible à nexora.africa/confidentialite. En acceptant ces CGU, vous reconnaissez avoir pris connaissance de cette politique." },
      { sub: "Droits de l'Utilisateur", text: "Vous disposez d'un droit d'accès, de rectification et de suppression de vos données personnelles. Pour exercer ces droits, contactez-nous à : support@nexora.africa" },
    ]
  },
  {
    num: "08", title: "Modification et résiliation",
    items: [
      { sub: "Modification des CGU", text: "NEXORA se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs seront notifiés au moins 15 jours avant l'entrée en vigueur des modifications. La poursuite de l'utilisation vaut acceptation des nouvelles CGU." },
      { sub: "Résiliation par NEXORA", text: "NEXORA peut résilier ou suspendre votre accès sans préavis en cas de violation grave des CGU, d'activité frauduleuse, ou de comportement portant préjudice à la plateforme ou à d'autres utilisateurs." },
    ]
  },
  {
    num: "09", title: "Droit applicable et contact",
    items: [
      { sub: "Droit applicable", text: "Les présentes CGU sont régies par le droit applicable dans la juridiction du siège social de NEXORA SAS. Tout litige sera soumis aux tribunaux compétents de cette juridiction, après tentative de résolution amiable." },
      { sub: "Contact", text: "Pour toute question : support@nexora.africa — Réponse garantie sous 72 heures ouvrées." },
    ]
  },
];

export default function CGUPage() {
  return (
    <LegalLayout
      title="Conditions Générales d'Utilisation"
      subtitle="Régissant l'accès et l'utilisation de la plateforme NEXORA"
      icon={FileText}
      iconColor="#6366f1"
      updatedAt="28 avril 2026"
    >
      <div className="bg-indigo-50 border border-indigo-100 rounded-3xl p-8 mb-14">
        <p className="text-gray-700 leading-relaxed text-base">
          Bienvenue sur <strong>NEXORA</strong>, la plateforme financière tout-en-un dédiée aux entrepreneurs et particuliers africains. En accédant à nos services, vous acceptez les présentes Conditions Générales d'Utilisation (CGU). Veuillez les lire attentivement avant toute utilisation de la plateforme.
        </p>
      </div>

      <div className="space-y-14">
        {SECTIONS.map((section) => (
          <div key={section.num}>
            <div className="flex items-center gap-4 mb-6">
              <span className="legal-section-num text-gray-100 leading-none select-none">{section.num}</span>
              <h2 className="legal-section-title text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-gray-100">
              {section.items.map((item, i) => (
                <div key={i} className="bg-gray-50 rounded-2xl p-6">
                  <h3 style={{ fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif", fontWeight: 700, fontSize: "0.875rem", color: "#111827", marginBottom: "0.4rem" }}>{item.sub}</h3>
                  <p style={{ fontFamily: "'Source Sans 3', 'Source Sans Pro', sans-serif", fontSize: "0.875rem", color: "#4b5563", lineHeight: 1.7 }}>{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LegalLayout>
  );
}
