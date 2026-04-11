import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { initPayment } from "@/lib/Moneroo";
import {
  Crown, Check, X, Zap, Star, Sparkles,
  TrendingUp, Store, ArrowLeftRight,
  BadgeCheck, ChevronDown, ChevronUp, Wallet
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// TAUX DE CHANGE FIXES (ne changent jamais)
// 1 mois = 7 000 XOF = 10,76 USD = 9,88 EUR = 10,64 GBP
// ─────────────────────────────────────────────────────────────────────────────
const TAUX_FIXES: Record<string, number> = {
  XOF: 1,
  XAF: 1,
  USD: 0.001537,   // 7000 XOF → 10.76 USD
  EUR: 0.001411,   // 7000 XOF → 9.88 EUR
  GBP: 0.001520,   // 7000 XOF → 10.64 GBP
  GNF: 14.8,
  GHS: 0.024,
  NGN: 2.55,
  KES: 0.21,
  TZS: 4.32,
  UGX: 6.12,
  RWF: 1.92,
  MAD: 0.016,
  GMD: 0.109,
  SLL: 22.5,
  ZMW: 0.044,
  CDF: 4.6,
  MZN: 0.104,
};

const SYMBOLES: Record<string, string> = {
  XOF: "FCFA", XAF: "FCFA", USD: "$", EUR: "€", GBP: "£",
  GNF: "GNF", GHS: "₵", NGN: "₦", KES: "KSh", TZS: "TSh",
  UGX: "USh", RWF: "RF", MAD: "MAD", GMD: "GMD", SLL: "SLL",
  ZMW: "ZMW", CDF: "FC", MZN: "MT",
};

/** Convertit un montant XOF → devise cible avec taux FIXES */
function convertirXofVers(montantXOF: number, devise: string): number {
  const taux = TAUX_FIXES[devise] ?? 1;
  if (devise === "USD" || devise === "EUR" || devise === "GBP") {
    return Math.round(montantXOF * taux * 100) / 100;
  }
  return Math.round(montantXOF * taux);
}

function formaterMontant(montant: number, devise: string): string {
  const symbole = SYMBOLES[devise] ?? devise;
  const isDecimal = ["USD", "EUR", "GBP"].includes(devise);
  const formatted = isDecimal
    ? montant.toFixed(2).replace(".", ",")
    : new Intl.NumberFormat("fr-FR").format(montant);
  if (["USD", "GBP"].includes(devise)) return `${symbole}${formatted}`;
  if (devise === "EUR") return `${formatted} €`;
  return `${formatted} ${symbole}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DONNÉES
// ─────────────────────────────────────────────────────────────────────────────

const FEATURES_COMPARE = [
  {
    categorie: "Finance personnelle",
    icon: TrendingUp,
    items: [
      { label: "Entrées & Dépenses",   gratuit: "10 / mois",        premium: "Illimité" },
      { label: "Factures",             gratuit: "10 factures",      premium: "Illimité" },
      { label: "Contacts WhatsApp",    gratuit: "0 fichier",        premium: "Illimité" },
    ],
  },
  {
    categorie: "Nexora Shop",
    icon: Store,
    items: [
      { label: "Accès boutique",       gratuit: false,  premium: true },
      { label: "Produits physiques",   gratuit: false,  premium: "Illimité" },
      { label: "Produits digitaux",    gratuit: false,  premium: true },
      { label: "Gestion commandes",    gratuit: false,  premium: true },
      { label: "Facebook Pixel",       gratuit: false,  premium: true },
      { label: "Domaine personnalisé", gratuit: false,  premium: true },
    ],
  },
  {
    categorie: "Nexora Transfert",
    icon: ArrowLeftRight,
    items: [
      { label: "Transfert inter-pays",        gratuit: true, premium: true },
      { label: "24 pays africains",            gratuit: true, premium: true },
      { label: "Tous réseaux Mobile Money",    gratuit: true, premium: true },
      { label: "Factures PDF",                 gratuit: true, premium: true },
    ],
  },
];

const PRIX_MENSUEL_XOF = 7000;

const PLANS_DUREE = [
  { mois: 1,  label: "1 mois", badge: null,       remise: 0 },
  { mois: 3,  label: "3 mois", badge: "-5%",      remise: 5 },
  { mois: 6,  label: "6 mois", badge: "-10%",     remise: 10 },
  { mois: 12, label: "1 an",   badge: "-15% 🔥",  remise: 15 },
  { mois: 24, label: "2 ans",  badge: "-20% 💎",  remise: 20 },
];

function calcMontantXOF(mois: number, remise: number): number {
  return Math.round(PRIX_MENSUEL_XOF * mois * (1 - remise / 100));
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS
// ─────────────────────────────────────────────────────────────────────────────

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true)  return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs font-semibold text-foreground">{value}</span>;
}

function FAQItem({ question, reponse }: { question: string; reponse: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="font-semibold text-sm text-foreground">{question}</span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-border pt-3">
          <p className="text-sm text-muted-foreground leading-relaxed">{reponse}</p>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────────────────────────────────────

export default function AbonnementPage() {
  const navigate    = useNavigate();
  const user        = getNexoraUser();
  const currentPlan = user?.plan || "gratuit";
  const isPremium   = currentPlan !== "gratuit";

  // Lire la devise choisie dans le dashboard (localStorage)
  const deviseLocale = (() => {
    try { return localStorage.getItem("nexora-devise") || "XOF"; } catch { return "XOF"; }
  })();

  const [openCat, setOpenCat]       = useState<string | null>("Finance personnelle");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [dureeIdx, setDureeIdx]     = useState(0);

  const planChoisi   = PLANS_DUREE[dureeIdx];
  const montantXOF   = calcMontantXOF(planChoisi.mois, planChoisi.remise);
  const montantLocal = convertirXofVers(montantXOF, deviseLocale);
  const symboleLocal = SYMBOLES[deviseLocale] ?? deviseLocale;

  // Prix unitaire mensuel en devise locale (pour l'affichage "soit X/mois")
  const prixMensuelXOF   = calcMontantXOF(1, 0); // 7 000 XOF
  const prixMensuelLocal = convertirXofVers(Math.round(montantXOF / planChoisi.mois), deviseLocale);

  // Économie en devise locale
  const prixSansRemise      = PRIX_MENSUEL_XOF * planChoisi.mois;
  const economieXOF         = prixSansRemise - montantXOF;
  const economieLocal       = convertirXofVers(economieXOF, deviseLocale);

  const handleUpgrade = async () => {
    if (!user?.id) { setError("Vous devez être connecté pour souscrire."); return; }
    setLoading(true);
    setError(null);
    try {
      // L'API accepte toujours en XOF
      const result = await initPayment({
        type: "abonnement_premium",
        amount: montantXOF,
        metadata: {
          user_id: user.id,
          type: "abonnement_premium",
          duree_mois: String(planChoisi.mois),
        },
      });
      if (!result.success || !result.payment_url) {
        setError(result.error ?? "Impossible d'initialiser le paiement.");
        setLoading(false);
        return;
      }
      const opened = window.open(result.payment_url, "_blank", "noopener,noreferrer");
      if (!opened) setPaymentUrl(result.payment_url);
    } catch (err: any) {
      setError(err.message ?? "Impossible d'initialiser le paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">

        {/* HERO */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-8 text-white text-center shadow-2xl">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-black uppercase mb-4">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              Nexora Premium
            </div>
            <h1 className="text-4xl font-black mb-3">Passez à la vitesse supérieure</h1>
            <p className="text-white/60 text-sm max-w-sm mx-auto">
              Un seul abonnement pour débloquer l'immobilier, le transfert et la boutique illimitée.
            </p>

            {/* Badge taux fixe */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
              <Check className="w-3 h-3" />
              Taux fixes · 1 mois = {formaterMontant(prixMensuelXOF, "XOF")}
              {deviseLocale !== "XOF" && deviseLocale !== "XAF" && (
                <> = {formaterMontant(convertirXofVers(prixMensuelXOF, deviseLocale), deviseLocale)}</>
              )}
            </div>
          </div>
        </div>

        {/* ERREUR */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 text-sm text-red-400 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* LIEN PAIEMENT POPUP BLOQUÉ */}
        {paymentUrl && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl px-5 py-4 space-y-3">
            <p className="text-sm text-yellow-300 font-semibold">
              🔒 Le paiement a été créé. Cliquez ci-dessous pour accéder à la page de paiement GeniusPay.
            </p>
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 bg-yellow-400 text-black font-black rounded-xl hover:bg-yellow-300 transition-colors text-sm"
            >
              <Zap className="w-4 h-4" /> Ouvrir le paiement
            </a>
            <button
              onClick={() => setPaymentUrl(null)}
              className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
            >
              Annuler
            </button>
          </div>
        )}

        {/* CARTES DE PRIX */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

          {/* Gratuit */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 flex flex-col opacity-80">
            <h3 className="text-lg font-black mb-1 text-foreground">Gratuit</h3>
            <p className="text-xs text-muted-foreground mb-4">Découverte de l'écosystème</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-foreground">0</span>
              <span className="text-sm text-muted-foreground ml-1">FCFA / mois</span>
            </div>
            <button disabled className="w-full py-3 bg-muted text-muted-foreground font-bold rounded-xl text-sm">
              {currentPlan === "gratuit" ? "Plan actuel" : "Inclus par défaut"}
            </button>
          </div>

          {/* Premium */}
          <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 flex flex-col shadow-xl border-2 border-indigo-500/30">
            {planChoisi.badge && (
              <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-md">
                {planChoisi.badge}
              </div>
            )}
            <h3 className="text-lg font-black text-white mb-1">Premium</h3>
            <p className="text-xs text-white/50 mb-3">Puissance & Liberté</p>

            {/* Sélecteur durée */}
            <div className="grid grid-cols-5 gap-1 mb-4">
              {PLANS_DUREE.map((p, i) => (
                <button
                  key={p.mois}
                  onClick={() => setDureeIdx(i)}
                  className={`py-1.5 rounded-lg text-[10px] font-black transition-all ${
                    dureeIdx === i
                      ? "bg-yellow-400 text-black"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Prix en FCFA (toujours affiché) */}
            <div className="mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {new Intl.NumberFormat("fr-FR").format(montantXOF)} FCFA
                </span>
              </div>

              {/* Prix en devise locale si différent de XOF/XAF */}
              {deviseLocale !== "XOF" && deviseLocale !== "XAF" && (
                <p className="text-sm text-yellow-300 font-bold mt-1">
                  ≈ {formaterMontant(montantLocal, deviseLocale)}
                  <span className="text-[10px] text-white/40 ml-1 font-normal">(taux fixe)</span>
                </p>
              )}

              <p className="text-[10px] text-white/40 mt-0.5">
                {planChoisi.mois === 1
                  ? "Paiement mensuel"
                  : `Soit ${new Intl.NumberFormat("fr-FR").format(Math.round(montantXOF / planChoisi.mois))} FCFA/mois · ${planChoisi.label}`}
              </p>

              {planChoisi.remise > 0 && (
                <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
                  Économie : {new Intl.NumberFormat("fr-FR").format(economieXOF)} FCFA
                  {deviseLocale !== "XOF" && deviseLocale !== "XAF" && economieLocal > 0 && (
                    <span className="text-white/50 ml-1">
                      ≈ {formaterMontant(economieLocal, deviseLocale)}
                    </span>
                  )}
                </p>
              )}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isPremium || loading}
              className={`w-full py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 mt-3 ${
                isPremium
                  ? "bg-white/10 text-white/40 cursor-default"
                  : loading
                    ? "bg-white/20 text-white/60 cursor-wait"
                    : "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/20"
              }`}
            >
              {isPremium
                ? <><BadgeCheck className="w-4 h-4" /> Plan Actif</>
                : loading
                  ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Redirection...</>
                  : <><Zap className="w-4 h-4" /> Souscrire — {planChoisi.label}</>
              }
            </button>

            {/* Rappel taux fixe */}
            <p className="text-[10px] text-white/30 text-center mt-2">
              Paiement en FCFA · Taux de conversion indicatifs et fixes
            </p>
          </div>
        </div>

        {/* COMPARAISON */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-center">Ce qui est inclus</h2>
          {FEATURES_COMPARE.map(cat => {
            const Icon = cat.icon;
            const isOpen = openCat === cat.categorie;
            return (
              <div key={cat.categorie} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setOpenCat(isOpen ? null : cat.categorie)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors"
                >
                  <Icon className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-sm flex-1 text-left">{cat.categorie}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/10">
                    <div className="grid grid-cols-3 gap-2 px-5 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider border-b border-border/50">
                      <span>Fonctionnalité</span>
                      <span className="text-center">Gratuit</span>
                      <span className="text-center text-indigo-500">Premium</span>
                    </div>
                    {cat.items.map((item, i) => (
                      <div
                        key={item.label}
                        className={`grid grid-cols-3 gap-2 px-5 py-3 text-xs items-center ${i % 2 === 0 ? "bg-muted/20" : ""}`}
                      >
                        <span className="text-muted-foreground">{item.label}</span>
                        <div className="text-center"><FeatureValue value={item.gratuit} /></div>
                        <div className="text-center font-bold text-indigo-600"><FeatureValue value={item.premium} /></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="pt-8">
          <h2 className="text-xl font-black text-center mb-6">Questions fréquentes</h2>
          <FAQItem
            question="Comment payer l'abonnement ?"
            reponse="Le paiement s'effectue par Mobile Money (MTN, Moov, Orange, Wave). Une fois le paiement validé, votre compte passe Premium instantanément."
          />
          <FAQItem
            question="Quel est le prix en devise locale ?"
            reponse="1 mois = 7 000 FCFA ≈ 10,76 USD ≈ 9,88 EUR. Ces taux sont fixes et indicatifs. Le paiement se fait toujours en FCFA via Mobile Money."
          />
          <FAQItem
            question="Puis-je annuler mon abonnement ?"
            reponse="Oui, Nexora est sans engagement. Vous pouvez arrêter quand vous voulez depuis votre profil."
          />
          <FAQItem
            question="Que se passe-t-il si je ferme la page après le paiement ?"
            reponse="Votre paiement est enregistré côté serveur. Si votre compte n'est pas activé, contactez le support avec votre référence de paiement."
          />
        </div>

      </div>
    </AppLayout>
  );
}
