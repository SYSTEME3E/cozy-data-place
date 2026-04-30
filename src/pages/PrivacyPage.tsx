import { Shield } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";

const SECTIONS = [
  {
    num: "01", title: "Données collectées",
    items: [
      { sub: "Données d'inscription", text: "Lors de votre inscription sur NEXORA, nous collectons : votre nom et prénom, votre numéro de téléphone mobile (utilisé comme identifiant principal), votre adresse e-mail (optionnelle), et un mot de passe haché (jamais stocké en clair)." },
      { sub: "Données financières", text: "Les données financières que vous saisissez (entrées d'argent, dépenses, catégories, notes) sont stockées de manière sécurisée sur nos serveurs Supabase et ne sont accessibles que par vous via votre compte authentifié." },
      { sub: "Données de la boutique", text: "Les informations relatives à votre boutique (nom, description, produits, prix, images, commandes, clients) sont collectées pour le fonctionnement du service Nexora Shop. Les données clients de votre boutique restent votre propriété exclusive." },
      { sub: "Données de transactions", text: "Pour les services de transfert d'argent et PayLink, nous collectons les informations de transaction nécessaires au traitement (montant, opérateur, numéro de téléphone du destinataire, statut). Ces données sont transmises aux opérateurs Mobile Money partenaires." },
      { sub: "Données de navigation", text: "Nous collectons automatiquement des données techniques : adresse IP, type de navigateur, pages visitées, durée de session. Ces données nous permettent d'améliorer la performance et la sécurité de la plateforme." },
    ]
  },
  {
    num: "02", title: "Utilisation des données",
    items: [
      { sub: "Fonctionnement du service", text: "Vos données sont utilisées uniquement pour le fonctionnement de NEXORA : gestion de votre compte, exécution des transactions, génération de factures, suivi financier, fonctionnement de la boutique, des transferts et du PayLink." },
      { sub: "Amélioration de la plateforme", text: "Nous utilisons des données agrégées et anonymisées pour analyser l'utilisation de la plateforme, identifier les bugs et améliorer nos services. Ces données ne permettent jamais d'identifier un utilisateur individuel." },
      { sub: "Communications", text: "Nous pouvons vous envoyer des notifications relatives à votre compte, vos transactions, vos abonnements et les mises à jour importantes de la plateforme. Vous pouvez gérer vos préférences de notification dans votre profil." },
      { sub: "Conformité légale", text: "Nous pouvons être amenés à traiter vos données pour respecter nos obligations légales et réglementaires, notamment en matière de lutte contre le blanchiment d'argent et le financement du terrorisme." },
    ]
  },
  {
    num: "03", title: "Protection et sécurité",
    items: [
      { sub: "Chiffrement en transit", text: "Toutes les communications entre votre appareil et nos serveurs sont chiffrées via le protocole TLS/HTTPS. Aucune donnée sensible ne transite en clair sur le réseau." },
      { sub: "Chiffrement au repos", text: "Vos données financières et personnelles sont chiffrées au repos sur nos serveurs Supabase. Les mots de passe sont hachés avec des algorithmes sécurisés et ne sont jamais stockés en clair." },
      { sub: "Coffre-Fort Digital", text: "Les données de votre coffre-fort numérique bénéficient d'un chiffrement de bout en bout avec AES-256. NEXORA n'a techniquement pas accès au contenu de votre coffre-fort. Seul votre code PIN personnel permet le déchiffrement." },
      { sub: "Accès aux données", text: "L'accès à vos données est strictement limité aux membres de l'équipe NEXORA qui en ont besoin pour des raisons techniques ou de support. Tout accès est journalisé et auditable." },
    ]
  },
  {
    num: "04", title: "Partage des données",
    items: [
      { sub: "Principe de non-vente", text: "NEXORA ne vend, ne loue et ne partage jamais vos données personnelles avec des tiers à des fins commerciales ou publicitaires. Nous n'avons pas de modèle de revenus basé sur la monétisation de vos données." },
      { sub: "Opérateurs de paiement", text: "Les données nécessaires au traitement des paiements Mobile Money sont transmises aux opérateurs partenaires agréés (MTN, Orange, Moov, Wave et autres). Ces transferts sont indispensables au fonctionnement des services de paiement." },
      { sub: "Infrastructure technique", text: "Nos données sont hébergées sur Supabase (infrastructure cloud sécurisée). Supabase agit en qualité de sous-traitant et est soumis à des obligations contractuelles de confidentialité et de sécurité." },
      { sub: "Obligations légales", text: "NEXORA peut être contraint de divulguer des données sur demande d'autorités judiciaires ou administratives compétentes, dans le strict respect des procédures légales applicables." },
    ]
  },
  {
    num: "05", title: "Vos droits",
    items: [
      { sub: "Droit d'accès", text: "Vous avez le droit d'accéder à l'ensemble des données personnelles que NEXORA détient sur vous. Vous pouvez consulter la majorité de ces données directement depuis votre tableau de bord." },
      { sub: "Droit de rectification", text: "Vous pouvez modifier vos informations personnelles (nom, numéro de téléphone, avatar) à tout moment depuis les paramètres de votre profil." },
      { sub: "Droit à l'effacement", text: "Vous pouvez demander la suppression de votre compte et de l'ensemble de vos données personnelles. Certaines données peuvent être conservées pour des raisons légales (archives de transactions) pour une durée minimale de 5 ans." },
      { sub: "Droit à la portabilité", text: "Sur demande, NEXORA peut vous fournir un export de vos données personnelles dans un format structuré et lisible. Contactez-nous à support@nexora.africa pour exercer ce droit." },
      { sub: "Droit d'opposition", text: "Vous pouvez vous opposer à tout moment au traitement de vos données à des fins de communications marketing non essentielles via les paramètres de votre compte ou en contactant notre support." },
    ]
  },
  {
    num: "06", title: "Conservation des données",
    items: [
      { sub: "Durée de conservation", text: "Vos données personnelles sont conservées pendant toute la durée d'activité de votre compte. En cas de clôture de compte, les données personnelles identifiantes sont supprimées dans un délai de 30 jours." },
      { sub: "Archives légales", text: "Les données liées aux transactions financières (transferts, paiements, abonnements) peuvent être conservées pendant 5 à 10 ans pour répondre aux obligations légales en matière comptable et fiscale." },
      { sub: "Données anonymisées", text: "Des données agrégées et anonymisées peuvent être conservées indéfiniment à des fins statistiques. Ces données ne permettent pas d'identifier un utilisateur individuel." },
    ]
  },
  {
    num: "07", title: "Cookies et traceurs",
    items: [
      { sub: "Utilisation des cookies", text: "NEXORA utilise des cookies techniques essentiels au fonctionnement de la plateforme (authentification, préférences de thème, session). Ces cookies ne peuvent pas être désactivés sans affecter le fonctionnement du service." },
      { sub: "Politique complète", text: "Pour une information complète sur notre utilisation des cookies, consultez notre Politique de Cookies disponible à l'adresse nexora.africa/cookies." },
    ]
  },
  {
    num: "08", title: "Contact et DPO",
    items: [
      { sub: "Contact", text: "Pour toute question relative à la protection de vos données personnelles, pour exercer vos droits ou signaler un incident de sécurité, contactez-nous à : support@nexora.africa" },
      { sub: "Délai de réponse", text: "Nous nous engageons à répondre à toute demande relative à vos données personnelles dans un délai maximum de 30 jours calendaires à compter de la réception de votre demande." },
    ]
  },
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      title="Politique de Confidentialité"
      subtitle="Comment NEXORA collecte, utilise et protège vos données personnelles"
      icon={Shield}
      iconColor="#3b82f6"
      updatedAt="28 avril 2026"
    >
      <div className="bg-blue-50 border border-blue-100 rounded-3xl p-8 mb-14">
        <p className="text-gray-700 leading-relaxed text-base">
          La protection de vos données personnelles est une priorité absolue pour <strong>NEXORA</strong>. Cette politique décrit de manière transparente quelles données nous collectons, comment nous les utilisons et quels sont vos droits. NEXORA ne vend jamais vos données à des tiers.
        </p>
      </div>

      <div className="space-y-14">
        {SECTIONS.map((section) => (
          <div key={section.num}>
            <div className="flex items-center gap-4 mb-6">
              <span className="legal-section-num text-gray-100 leading-none select-none">{section.num}</span>
              <h2 className="legal-section-title text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-blue-100">
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
