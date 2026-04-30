import { BookOpen } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";

const SECTIONS = [
  {
    num: "01", title: "Champ d'application",
    items: [
      { sub: "Objet", text: "Les présentes Conditions Générales de Vente (CGV) régissent toutes les transactions commerciales réalisées sur la plateforme NEXORA, notamment : les abonnements aux plans Premium (Boss, Roi), les achats de formations, les transactions de transfert d'argent, et les paiements via Nexora PayLink." },
      { sub: "Acceptation", text: "Toute commande ou souscription sur NEXORA implique l'acceptation pleine et entière des présentes CGV. Si vous n'acceptez pas ces conditions, vous ne devez pas procéder à l'achat." },
      { sub: "Vendeur", text: "NEXORA SAS, éditeur et exploitant de la plateforme nexora.africa. Contact commercial : support@nexora.africa" },
    ]
  },
  {
    num: "02", title: "Produits et services proposés",
    items: [
      { sub: "Plans Premium", text: "NEXORA propose des plans d'abonnement payants (Boss, Roi) donnant accès à des fonctionnalités avancées de la plateforme pour une durée définie. Les caractéristiques et tarifs de chaque plan sont détaillés sur la page d'abonnement de la plateforme." },
      { sub: "Formations", text: "NEXORA commercialise des formations vidéo et PDF en accès unique ou illimité. Le contenu exact, la durée d'accès et le prix de chaque formation sont précisés sur la page de description de la formation avant achat." },
      { sub: "Crédit de transfert", text: "Le rechargement du solde de transfert d'argent Africa permet d'envoyer de l'argent dans 24 pays via Mobile Money. Des frais de 100 FCFA s'appliquent au rechargement, plus 3% sur chaque transfert effectué." },
      { sub: "Services PayLink", text: "La création de liens de paiement PayLink est incluse dans l'utilisation de la plateforme. Des frais de traitement peuvent s'appliquer selon les opérateurs Mobile Money partenaires." },
    ]
  },
  {
    num: "03", title: "Prix et paiement",
    items: [
      { sub: "Tarifs", text: "Tous les prix affichés sur NEXORA sont en Francs CFA (FCFA) toutes taxes comprises. NEXORA se réserve le droit de modifier ses tarifs à tout moment. Les nouveaux tarifs s'appliquent aux nouvelles souscriptions à compter de leur publication." },
      { sub: "Moyens de paiement", text: "Les paiements sur NEXORA sont exclusivement réalisés via Mobile Money : MTN Mobile Money, Orange Money, Moov Money, Wave et autres opérateurs partenaires disponibles selon votre pays. Aucun paiement par carte bancaire n'est actuellement proposé." },
      { sub: "Confirmation de paiement", text: "Votre abonnement ou achat est activé dès confirmation du paiement par l'opérateur Mobile Money. Un récapitulatif de votre transaction est disponible dans votre espace compte. En cas de problème de confirmation, contactez support@nexora.africa." },
      { sub: "Sécurité des paiements", text: "Les transactions Mobile Money sont traitées directement par les opérateurs agréés. NEXORA ne stocke jamais vos informations de paiement Mobile Money. Les transactions sont sécurisées selon les standards des opérateurs." },
    ]
  },
  {
    num: "04", title: "Abonnements et renouvellement",
    items: [
      { sub: "Durée et renouvellement", text: "Les abonnements Premium sont souscrits pour une durée déterminée (mensuelle ou annuelle selon les offres disponibles). Ils ne se renouvellent pas automatiquement ; un nouveau paiement est nécessaire pour chaque période." },
      { sub: "Activation", text: "L'abonnement est activé immédiatement après validation du paiement par l'opérateur Mobile Money. Vous recevez une confirmation dans votre espace compte et par notification sur la plateforme." },
      { sub: "Expiration", text: "À l'expiration de votre abonnement, votre compte revient automatiquement en mode gratuit avec accès aux fonctionnalités de base. Vos données restent intégralement conservées." },
      { sub: "Changement de plan", text: "Vous pouvez upgrader votre plan à tout moment depuis la page d'abonnement. Le nouveau plan prend effet immédiatement après validation du paiement." },
    ]
  },
  {
    num: "05", title: "Droit de rétractation et remboursements",
    items: [
      { sub: "Services numériques", text: "Conformément à la réglementation applicable au commerce électronique, le droit de rétractation ne s'applique pas aux abonnements aux services numériques dont l'exécution a commencé avec votre accord avant l'expiration du délai de rétractation." },
      { sub: "Formations", text: "Le droit de rétractation ne s'applique pas aux formations en ligne une fois le contenu accessible (streaming démarré ou fichiers téléchargés). Avant tout accès au contenu, vous disposez d'un délai de 24 heures pour annuler votre commande." },
      { sub: "Remboursement exceptionnel", text: "En cas de défaillance technique imputable à NEXORA empêchant l'accès au service payant pendant plus de 72 heures consécutives, un remboursement prorata temporis ou un crédit équivalent sera proposé. Contactez support@nexora.africa." },
      { sub: "Crédits de transfert", text: "Les crédits de transfert d'argent rechargés et non utilisés ne sont pas remboursables mais restent disponibles sur votre compte sans date d'expiration tant que votre compte est actif." },
    ]
  },
  {
    num: "06", title: "Livraison et accès aux services",
    items: [
      { sub: "Accès immédiat", text: "Les produits numériques (abonnements, formations, crédits) sont mis à disposition immédiatement après validation du paiement par l'opérateur Mobile Money, sans délai de livraison physique." },
      { sub: "Interruption de service", text: "En cas d'interruption planifiée pour maintenance, NEXORA informera les utilisateurs avec un préavis de 24 heures minimum via les notifications de la plateforme. La durée d'abonnement sera prolongée en cas d'interruption dépassant 24 heures." },
    ]
  },
  {
    num: "07", title: "Garanties et responsabilités",
    items: [
      { sub: "Conformité", text: "NEXORA garantit que les services payants correspondent à la description publiée sur la plateforme au moment de la souscription. En cas de non-conformité constatée dans les 48 heures suivant l'achat, contactez notre support." },
      { sub: "Limitation de responsabilité", text: "La responsabilité de NEXORA est limitée au montant des sommes effectivement payées par l'Utilisateur pour le service concerné. NEXORA ne saurait être tenu responsable des dommages indirects, pertes de revenus ou pertes de données résultant de l'utilisation des services." },
      { sub: "Transactions Mobile Money", text: "NEXORA n'est pas responsable des échecs de paiement imputables aux opérateurs Mobile Money, aux limitations de comptes Mobile Money ou à des problèmes de réseau. En cas d'incident, NEXORA facilite la résolution avec l'opérateur concerné." },
    ]
  },
  {
    num: "08", title: "Propriété des contenus",
    items: [
      { sub: "Formations et contenus", text: "L'achat d'une formation NEXORA donne droit à un accès personnel, non transférable et non cessible au contenu. La redistribution, revente, copie ou partage des contenus de formation est strictement interdite et peut faire l'objet de poursuites." },
      { sub: "Données Utilisateur", text: "Les données que vous créez sur NEXORA (factures, produits, données financières) restent votre propriété exclusive. NEXORA ne revendique aucun droit sur vos créations." },
    ]
  },
  {
    num: "09", title: "Droit applicable et litiges",
    items: [
      { sub: "Résolution amiable", text: "En cas de litige relatif à un achat sur NEXORA, nous vous invitons à contacter en premier lieu notre service client à support@nexora.africa. Nous nous engageons à apporter une réponse dans les 72 heures et à rechercher une solution amiable." },
      { sub: "Droit applicable", text: "Les présentes CGV sont régies par le droit applicable dans la juridiction du siège social de NEXORA SAS. À défaut de résolution amiable, tout litige sera porté devant les tribunaux compétents de cette juridiction." },
    ]
  },
];

export default function CGVPage() {
  return (
    <LegalLayout
      title="Conditions Générales de Vente"
      subtitle="Régissant les transactions commerciales réalisées sur la plateforme NEXORA"
      icon={BookOpen}
      iconColor="#10b981"
      updatedAt="28 avril 2026"
    >
      <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 mb-14">
        <p className="text-gray-700 leading-relaxed text-base">
          Les présentes Conditions Générales de Vente (CGV) s'appliquent à tous les achats réalisés sur la plateforme <strong>NEXORA</strong> : abonnements Premium, formations, crédits de transfert et autres services payants. Lisez-les attentivement avant tout achat.
        </p>
      </div>

      <div className="space-y-14">
        {SECTIONS.map((section) => (
          <div key={section.num}>
            <div className="flex items-center gap-4 mb-6">
              <span className="legal-section-num text-gray-100 leading-none select-none">{section.num}</span>
              <h2 className="legal-section-title text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-emerald-100">
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
