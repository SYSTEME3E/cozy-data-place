import { Building2 } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";

const SECTIONS = [
  {
    num: "01", title: "Éditeur de la plateforme",
    items: [
      { sub: "Dénomination sociale", text: "NEXORA SAS — Société par Actions Simplifiée spécialisée dans les services financiers numériques pour l'Afrique." },
      { sub: "Siège social", text: "Cotonou, République du Bénin, Afrique de l'Ouest." },
      { sub: "Contact", text: "Email : support@nexora.africa — Notre équipe répond dans un délai de 72 heures ouvrées." },
      { sub: "Directeur de la publication", text: "Le directeur de la publication est le représentant légal de NEXORA SAS." },
    ]
  },
  {
    num: "02", title: "Hébergement",
    items: [
      { sub: "Infrastructure principale", text: "La plateforme NEXORA est hébergée sur Supabase, solution cloud sécurisée fournissant base de données PostgreSQL, authentification et stockage de fichiers. Les serveurs sont localisés dans des datacenters certifiés ISO 27001." },
      { sub: "Supabase Inc.", text: "970 Toa Payoh North #07-04, Singapore 318992. Site : supabase.com — Supabase agit en qualité de sous-traitant de données pour le compte de NEXORA SAS." },
      { sub: "Déploiement web", text: "L'application web NEXORA est déployée via Vercel Inc., 340 Pine Street Suite 701, San Francisco, CA 94104, États-Unis. Site : vercel.com" },
      { sub: "Application mobile", text: "L'application mobile Android est distribuée et hébergée par Google LLC via le Google Play Store. Site : play.google.com" },
    ]
  },
  {
    num: "03", title: "Propriété intellectuelle",
    items: [
      { sub: "Droits d'auteur", text: "L'ensemble des éléments constituant la plateforme NEXORA (textes, images, logos, icônes, fonctionnalités, code source, architecture technique, contenus de formation) sont protégés par le droit de la propriété intellectuelle et appartiennent exclusivement à NEXORA SAS." },
      { sub: "Marque NEXORA", text: "La dénomination 'NEXORA', le logo NEXORA et tous les signes distinctifs associés constituent des marques de NEXORA SAS. Toute reproduction, représentation, utilisation ou adaptation, sous quelque forme que ce soit, sans l'accord préalable et écrit de NEXORA SAS, est strictement interdite." },
      { sub: "Contenus utilisateurs", text: "Les contenus créés par les utilisateurs sur la plateforme (factures, produits, annonces, données financières) restent la propriété exclusive de leurs auteurs. NEXORA n'acquiert aucun droit de propriété sur ces contenus." },
      { sub: "Technologies utilisées", text: "NEXORA utilise des technologies open source (React, TypeScript, Tailwind CSS, Supabase) soumises à leurs licences respectives. Ces technologies ne sont pas la propriété de NEXORA SAS mais sont utilisées conformément à leurs conditions d'utilisation." },
    ]
  },
  {
    num: "04", title: "Données personnelles",
    items: [
      { sub: "Responsable de traitement", text: "NEXORA SAS est responsable du traitement de vos données personnelles collectées via la plateforme nexora.africa et l'application mobile NEXORA." },
      { sub: "Politique de confidentialité", text: "Le traitement de vos données personnelles est détaillé dans notre Politique de Confidentialité, accessible à l'adresse nexora.africa/confidentialite." },
      { sub: "Droits des utilisateurs", text: "Conformément aux réglementations applicables en matière de protection des données, vous disposez d'un droit d'accès, de rectification, d'effacement, de portabilité et d'opposition sur vos données personnelles. Pour exercer ces droits : support@nexora.africa" },
    ]
  },
  {
    num: "05", title: "Services financiers et réglementaires",
    items: [
      { sub: "Nature des services", text: "NEXORA est une plateforme d'outils de gestion financière et de mise en relation. NEXORA n'est pas un établissement de crédit, une banque, un organisme de paiement agréé ou un conseiller financier réglementé. Les services de transfert d'argent sont fournis par des opérateurs Mobile Money partenaires agréés." },
      { sub: "Transferts Mobile Money", text: "Les transferts d'argent effectués via NEXORA sont traités par des opérateurs de mobile money agréés par les autorités compétentes de leurs pays respectifs. NEXORA agit en qualité d'intermédiaire technique et non d'établissement de paiement." },
      { sub: "Transactions commerciales", text: "Les transactions entre acheteurs et vendeurs sur Nexora Shop sont des transactions de gré à gré entre particuliers ou professionnels. NEXORA n'est pas partie à ces transactions et n'en garantit pas l'exécution." },
      { sub: "Conseils financiers", text: "Les informations et outils disponibles sur NEXORA sont fournis à titre indicatif uniquement. Ils ne constituent pas des conseils financiers, fiscaux ou juridiques. Pour toute décision importante, consultez un professionnel qualifié." },
    ]
  },
  {
    num: "06", title: "Limitation de responsabilité",
    items: [
      { sub: "Exactitude des informations", text: "NEXORA s'efforce d'assurer l'exactitude et la mise à jour des informations diffusées sur la plateforme. Toutefois, NEXORA ne peut garantir l'exactitude, la complétude ou l'actualité de toutes les informations disponibles." },
      { sub: "Liens hypertextes", text: "La plateforme NEXORA peut contenir des liens vers des sites ou services tiers (opérateurs Mobile Money, partenaires). NEXORA n'a aucun contrôle sur le contenu de ces sites et décline toute responsabilité quant aux informations qui y sont diffusées." },
      { sub: "Disponibilité du service", text: "NEXORA s'efforce de maintenir un accès permanent à la plateforme mais ne peut garantir la continuité du service en cas de force majeure, de maintenance nécessaire ou de défaillance technique indépendante de sa volonté." },
    ]
  },
  {
    num: "07", title: "Cookies et traceurs",
    items: [
      { sub: "Information", text: "La plateforme NEXORA utilise des cookies techniques essentiels au fonctionnement du service et des cookies de préférences pour mémoriser vos paramètres." },
      { sub: "Politique complète", text: "La description détaillée des cookies utilisés et les modalités de gestion sont disponibles dans notre Politique de Cookies : nexora.africa/cookies" },
    ]
  },
  {
    num: "08", title: "Droit applicable",
    items: [
      { sub: "Juridiction", text: "Les présentes Mentions Légales et l'ensemble des relations juridiques entre NEXORA et ses utilisateurs sont régies par le droit applicable dans la République du Bénin et les traités internationaux applicables." },
      { sub: "Résolution des litiges", text: "Tout litige relatif à l'utilisation de la plateforme NEXORA sera soumis, après tentative de résolution amiable, à la juridiction compétente du lieu du siège social de NEXORA SAS." },
      { sub: "Contact", text: "Pour toute question relative aux présentes mentions légales : support@nexora.africa" },
    ]
  },
];

export default function MentionsLegalesPage() {
  return (
    <LegalLayout
      title="Mentions Légales"
      subtitle="Informations légales relatives à l'éditeur et à l'hébergement de NEXORA"
      icon={Building2}
      iconColor="#8b5cf6"
      updatedAt="28 avril 2026"
    >
      <div className="bg-violet-50 border border-violet-100 rounded-3xl p-8 mb-14">
        <p className="text-gray-700 leading-relaxed text-base">
          Conformément aux dispositions légales en vigueur, vous trouverez ci-dessous toutes les informations légales relatives à <strong>NEXORA</strong>, à son éditeur, à son hébergeur et à la réglementation applicable à la plateforme.
        </p>
      </div>

      <div className="space-y-14">
        {SECTIONS.map((section) => (
          <div key={section.num}>
            <div className="flex items-center gap-4 mb-6">
              <span className="legal-section-num text-gray-100 leading-none select-none">{section.num}</span>
              <h2 className="legal-section-title text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-violet-100">
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
