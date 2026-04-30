import { Cookie } from "lucide-react";
import LegalLayout from "@/components/LegalLayout";

const SECTIONS = [
  {
    num: "01", title: "Qu'est-ce qu'un cookie ?",
    items: [
      { sub: "Définition", text: "Un cookie est un petit fichier texte déposé sur votre appareil (ordinateur, smartphone, tablette) lors de votre visite sur un site web ou une application. Les cookies permettent au site de reconnaître votre appareil lors de vos visites ultérieures et de mémoriser certaines de vos préférences." },
      { sub: "Stockage local", text: "En complément des cookies, NEXORA utilise le stockage local du navigateur (localStorage) pour mémoriser certaines préférences utilisateur (thème clair/sombre, paramètres d'affichage). Ces données restent exclusivement sur votre appareil." },
    ]
  },
  {
    num: "02", title: "Cookies utilisés par NEXORA",
    items: [
      { sub: "Cookies d'authentification (essentiels)", text: "Ces cookies sont indispensables au fonctionnement de la plateforme. Ils maintiennent votre session active, vérifient votre identité et sécurisent votre connexion. Sans ces cookies, vous ne pouvez pas accéder à votre compte NEXORA. Ces cookies ne peuvent pas être désactivés." },
      { sub: "Cookies de préférences (fonctionnels)", text: "Ces cookies mémorisent vos préférences sur la plateforme : choix du thème (mode clair/sombre), langue préférée, paramètres d'affichage de la sidebar. Ils améliorent votre expérience sans collecter de données personnelles." },
      { sub: "Cookies de sécurité (essentiels)", text: "Ces cookies permettent de détecter et prévenir les tentatives de connexion frauduleuses, les attaques CSRF et autres activités malveillantes. Ils sont essentiels à la sécurité de votre compte et de la plateforme." },
      { sub: "Cookies de performance (analytiques)", text: "NEXORA peut utiliser des cookies analytiques pour mesurer l'utilisation de la plateforme (pages visitées, fonctionnalités utilisées, durée de session) de manière agrégée et anonyme. Ces données nous permettent d'améliorer nos services. Aucune donnée personnelle identifiable n'est collectée." },
    ]
  },
  {
    num: "03", title: "Cookies tiers",
    items: [
      { sub: "Supabase (infrastructure)", text: "Notre fournisseur d'infrastructure Supabase peut déposer des cookies techniques liés à la gestion des sessions et de la base de données. Ces cookies sont strictement nécessaires au fonctionnement du service." },
      { sub: "Opérateurs Mobile Money", text: "Lors des processus de paiement via Mobile Money (MTN, Orange, Moov, Wave, etc.), les pages de paiement de ces opérateurs peuvent déposer leurs propres cookies. NEXORA n'a pas de contrôle sur ces cookies tiers et vous recommande de consulter les politiques de confidentialité de ces opérateurs." },
      { sub: "Aucune publicité", text: "NEXORA n'utilise aucun cookie publicitaire ou de tracking à des fins de ciblage publicitaire. Nous ne partageons pas de données de navigation avec des régies publicitaires. Les produits NEXORA sont entièrement exempts de publicité." },
    ]
  },
  {
    num: "04", title: "Durée de conservation",
    items: [
      { sub: "Cookies de session", text: "Les cookies de session sont temporaires et sont automatiquement supprimés à la fermeture de votre navigateur ou à votre déconnexion de NEXORA." },
      { sub: "Cookies persistants", text: "Les cookies de préférences sont conservés pendant une durée maximale de 12 mois sur votre appareil. Au-delà de cette durée, ils sont automatiquement supprimés et recréés lors de votre prochaine visite." },
      { sub: "Stockage local", text: "Les données du stockage local (localStorage) n'ont pas de date d'expiration automatique. Elles persistent jusqu'à ce que vous les supprimiez manuellement ou que vous effaciez les données de votre navigateur." },
    ]
  },
  {
    num: "05", title: "Gestion et contrôle",
    items: [
      { sub: "Via votre navigateur", text: "Vous pouvez contrôler et supprimer les cookies via les paramètres de votre navigateur. La procédure varie selon le navigateur : dans Chrome, accédez à Paramètres > Confidentialité et sécurité > Cookies. Dans Firefox : Paramètres > Vie privée et sécurité > Cookies. Dans Safari : Préférences > Confidentialité." },
      { sub: "Conséquences de la désactivation", text: "La désactivation des cookies essentiels (authentification, sécurité) empêchera le bon fonctionnement de NEXORA. Vous ne pourrez pas vous connecter à votre compte ni utiliser la plupart des fonctionnalités de la plateforme." },
      { sub: "Applications mobiles", text: "Sur l'application mobile NEXORA (Android via Capacitor), les préférences sont stockées dans le stockage local de l'application et non dans des cookies de navigateur. Vous pouvez effacer ces données via les paramètres de votre appareil (Paramètres > Applications > NEXORA > Effacer les données)." },
    ]
  },
  {
    num: "06", title: "Mise à jour de cette politique",
    items: [
      { sub: "Évolution", text: "Cette Politique de Cookies peut être mise à jour pour refléter les évolutions techniques de la plateforme ou les changements réglementaires. Toute modification significative sera notifiée via la plateforme ou par e-mail." },
      { sub: "Contact", text: "Pour toute question relative à notre utilisation des cookies : support@nexora.africa" },
    ]
  },
];

const COOKIE_TABLE = [
  { nom: "nexora-session", type: "Essentiel", durée: "Session", finalité: "Authentification et sécurité de la session" },
  { nom: "nexora-theme", type: "Fonctionnel", durée: "12 mois", finalité: "Mémorisation du thème clair/sombre" },
  { nom: "nexora-pin-set", type: "Fonctionnel", durée: "Persistant", finalité: "Indication de la présence d'un code PIN configuré" },
  { nom: "sb-access-token", type: "Essentiel", durée: "1 heure", finalité: "Token d'accès Supabase (authentification)" },
  { nom: "sb-refresh-token", type: "Essentiel", durée: "30 jours", finalité: "Renouvellement automatique de session" },
];

export default function CookiesPage() {
  return (
    <LegalLayout
      title="Politique de Cookies"
      subtitle="Utilisation des cookies et technologies de stockage sur NEXORA"
      icon={Cookie}
      iconColor="#f59e0b"
      updatedAt="28 avril 2026"
    >
      <div className="bg-amber-50 border border-amber-100 rounded-3xl p-8 mb-14">
        <p className="text-gray-700 leading-relaxed text-base">
          <strong>NEXORA</strong> utilise des cookies et des technologies de stockage local pour assurer le bon fonctionnement de la plateforme, mémoriser vos préférences et sécuriser votre compte. Cette politique vous explique quels cookies nous utilisons et pourquoi.
        </p>
      </div>

      {/* Tableau récapitulatif */}
      <div className="mb-14">
        <h2 className="legal-section-title text-gray-900 mb-4">Tableau récapitulatif des cookies</h2>
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-5 py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Nom du cookie</th>
                <th className="text-left px-5 py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Durée</th>
                <th className="text-left px-5 py-3 font-bold text-gray-700 text-xs uppercase tracking-wider">Finalité</th>
              </tr>
            </thead>
            <tbody>
              {COOKIE_TABLE.map((row, i) => (
                <tr key={i} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-mono text-xs text-gray-600">{row.nom}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${
                      row.type === "Essentiel" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                    }`}>{row.type}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{row.durée}</td>
                  <td className="px-5 py-3 text-xs text-gray-600">{row.finalité}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-14">
        {SECTIONS.map((section) => (
          <div key={section.num}>
            <div className="flex items-center gap-4 mb-6">
              <span className="legal-section-num text-gray-100 leading-none select-none">{section.num}</span>
              <h2 className="legal-section-title text-gray-900">{section.title}</h2>
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-amber-100">
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
