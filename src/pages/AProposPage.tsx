import AppLayout from "@/components/AppLayout";
import { ChevronLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  {
    emoji: "🏦",
    title: "Qu'est-ce que Nexora ?",
    content: `Nexora est une plateforme financière et commerciale africaine tout-en-un. Elle permet à ses utilisateurs de gérer leur argent, envoyer des fonds, vendre des produits, accéder à des formations et bien plus encore — le tout depuis une seule application.

Nexora est conçu pour les entrepreneurs, commerçants, freelances et particuliers qui souhaitent tirer le meilleur parti du digital en Afrique.`,
  },
  {
    emoji: "💸",
    title: "Nexora Transfert — Envoi & Réception d'argent",
    content: `Nexora Transfert vous permet d'envoyer et de recevoir de l'argent facilement via Mobile Money ou entre comptes Nexora.

Frais de service :
• Recharge de compte (dépôt) : Gratuit
• Transfert vers un autre compte Nexora : 1% du montant envoyé (minimum 50 FCFA)
• Transfert Mobile Money (MTN, Moov, etc.) : 2% du montant envoyé
• Retrait Mobile Money : Variable selon l'opérateur

Les transferts sont traités en temps réel, 7j/7.`,
  },
  {
    emoji: "🔗",
    title: "Nexora PayLink — Collecte de paiement",
    content: `PayLink vous permet de créer des liens de paiement personnalisés pour recevoir de l'argent de vos clients, sans avoir besoin d'une boutique.

Idéal pour : freelances, prestataires de services, ventes ponctuelles.

Frais de service :
• Création de PayLink : Gratuit
• Commission par transaction reçue : 2% du montant collecté
• Retrait des fonds collectés : selon les frais standard de transfert`,
  },
  {
    emoji: "🛒",
    title: "Nexora Shop — Boutique en ligne",
    content: `Nexora Shop vous permet d'ouvrir votre propre boutique en ligne et de vendre vos produits (physiques ou numériques) à travers votre vitrine personnalisée.

Fonctionnalités incluses :
• Vitrine personnalisable avec votre logo et couleurs
• Gestion des produits physiques et numériques
• Suivi des commandes et livraisons
• Factures automatiques
• Campagnes marketing

Frais de service :
• Ouverture de boutique : Gratuit
• Commission par vente de produit physique : 3% du montant
• Commission par vente de produit numérique : 2% du montant
• Fonctionnalités avancées (campagnes, analytics) : inclus dans les plans Premium`,
  },
  {
    emoji: "🎓",
    title: "Nexora Academy — Formations",
    content: `Nexora Academy est la plateforme de formation intégrée à Nexora. Elle propose des cours en vidéo sur l'entrepreneuriat, le digital, la finance et les compétences professionnelles.

Fonctionnalités :
• Accès à des formations créées par des experts
• Suivi de progression par chapitre
• Certificat de complétion

Frais d'accès :
• Navigation et aperçu des formations : Gratuit
• Achat d'une formation individuelle : Prix fixé par le formateur
• Accès illimité : via un abonnement Premium Nexora`,
  },
  {
    emoji: "🏠",
    title: "Nexora Immobilier",
    content: `La section Immobilier de Nexora vous permet de publier et consulter des annonces immobilières (vente, location, terrain) en Afrique de l'Ouest.

Fonctionnalités :
• Publication d'annonces avec photos
• Recherche par localisation et type de bien
• Prise de contact directe avec les vendeurs

Frais de service :
• Consultation des annonces : Gratuit
• Publication d'annonce : Gratuit (nombre limité selon le plan)
• Mise en avant d'annonce : disponible via les plans Premium`,
  },
  {
    emoji: "👑",
    title: "Plans et Abonnements",
    content: `Nexora propose différents niveaux d'accès :

• Plan Gratuit : accès aux fonctionnalités de base (transfert, boutique simple, formations payantes à l'unité)

• Plan Boss : accès à des fonctionnalités avancées, limites de transactions plus élevées, boutique améliorée

• Plan Roi : accès complet à toutes les fonctionnalités, priorité support, Analytics avancés, contacts WhatsApp illimités

Les tarifs des abonnements sont affichés sur la page Abonnement de l'application.`,
  },
  {
    emoji: "🔒",
    title: "Sécurité et confidentialité",
    content: `Nexora prend la sécurité de vos données et de votre argent très au sérieux.

• Authentification sécurisée avec mot de passe chiffré
• Code PIN obligatoire pour les opérations financières sensibles
• Chiffrement des données en transit (HTTPS)
• Aucun partage de vos données personnelles à des tiers sans votre consentement

Pour en savoir plus, consultez notre Politique de confidentialité.`,
  },
  {
    emoji: "📞",
    title: "Comment contacter le support ?",
    content: `Notre équipe support est disponible tous les jours de 08h à 13h et de 15h à 20h.

• WhatsApp : +229 01 55 23 76 85
• Appel direct : +229 01 51 76 23 41

Vous pouvez également accéder au support depuis votre profil → Support.`,
  },
];

export default function AProposPage() {
  const navigate = useNavigate();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#EEF2FF] dark:bg-background flex flex-col pb-10">
        {/* Header */}
        <div className="flex items-center px-4 pt-6 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-card shadow-sm mr-3"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">À propos</h1>
        </div>

        {/* Logo & intro */}
        <div className="flex flex-col items-center mt-6 mb-6 px-6 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg mb-4">
            <span className="text-white font-black text-3xl">N</span>
          </div>
          <h2 className="text-2xl font-extrabold text-foreground">Nexora</h2>
          <p className="text-sm text-muted-foreground mt-1">Plateforme financière & commerciale africaine</p>
        </div>

        {/* FAQ Accordion */}
        <div className="px-4 flex flex-col gap-3">
          {sections.map((section, i) => (
            <div
              key={i}
              className="bg-white dark:bg-card rounded-2xl shadow-sm overflow-hidden"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-4 text-left"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.emoji}</span>
                  <span className="font-bold text-sm text-foreground">{section.title}</span>
                </div>
                {openIndex === i
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
              </button>
              {openIndex === i && (
                <div className="px-5 pb-4">
                  <div className="h-px bg-border mb-3" />
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                    {section.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Legal links */}
        <div className="px-4 mt-6">
          <div className="bg-white dark:bg-card rounded-2xl shadow-sm p-4">
            <h3 className="font-bold text-sm text-foreground mb-3">Pages légales</h3>
            <div className="flex flex-col gap-2">
              {[
                { label: "Conditions Générales d'Utilisation (CGU)", href: "/cgu" },
                { label: "Conditions Générales de Vente (CGV)", href: "/cgv" },
                { label: "Politique de confidentialité", href: "/confidentialite" },
                { label: "Politique de cookies", href: "/cookies" },
                { label: "Mentions légales", href: "/mentions-legales" },
              ].map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0"
                >
                  <span className="text-sm text-foreground">{item.label}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 Nexora Africa. Tous droits réservés.
        </p>
      </div>
    </AppLayout>
  );
}
