import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { initPayment } from "@/lib/Moneroo";
import {
  Crown, Check, X, Zap, ShieldCheck, Star, Sparkles,
  TrendingUp, Store, PiggyBank, ArrowLeftRight, Home,
  BadgeCheck, ChevronDown, ChevronUp, Lock, Wallet
} from "lucide-react";
import { useNavigate } from "react-router-dom";


// ─────────────────────────────────────────────
// DONNÉES DE COMPARAISON
// ─────────────────────────────────────────────

const FEATURES_COMPARE = [
  {
    categorie: "Finance personnelle",
    icon: TrendingUp,
    items: [
      { label: "Entrées & Dépenses",     gratuit: "10 / mois",       premium: "Illimité" },
      { label: "Factures",               gratuit: "10 factures",    premium: "Illimité" },
      { label: "Contacts WhatsApp",         gratuit: "0 fichier de contact",  premium: "Illimité" },
    ],
  },
  {
    categorie: "Nexora Shop",
    icon: Store,
    items: [
      { label: "Accès boutique",         gratuit: false,              premium: true },
      { label: "Produits physiques",     gratuit: false,      premium: "Illimité" },
      { label: "Produits digitaux",      gratuit: false,             premium: true },
      { label: "Gestion commandes",      gratuit: false,             premium: true },
      { label: "Facebook Pixel",         gratuit: false,             premium: true },
      { label: "Domaine personnalisé",   gratuit: false,             premium: true },
    ],
  },
  {
    categorie: "Nexora Transfert",
    icon: ArrowLeftRight,
    items: [
      { label: "Transfert inter-pays",   gratuit: true,             premium: true },
      { label: "24 pays africains",      gratuit: true,             premium: true },
      { label: "Tous réseaux Mobile Money", gratuit: true,          premium: true },
      { label: "Factures PDF",           gratuit: true,             premium: true },
    ],
  },
];

// ─────────────────────────────────────────────
// COMPOSANTS INTERNES
// ─────────────────────────────────────────────

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true)  return <Check className="w-5 h-5 text-emerald-500 mx-auto" />;
  if (value === false) return <X className="w-4 h-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs font-semibold text-foreground">{value}</span>;
}

function FAQItem({ question, reponse }: { question: string; reponse: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-muted/40 transition-colors">
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

// ─────────────────────────────────────────────
// PAGE PRINCIPALE
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// PLANS DURÉE
// ─────────────────────────────────────────────
const PRIX_MENSUEL = 7000;

const PLANS_DUREE = [
  { mois: 1,  label: "1 mois",  badge: null,          remise: 0 },
  { mois: 3,  label: "3 mois",  badge: "-5%",         remise: 5 },
  { mois: 6,  label: "6 mois",  badge: "-10%",        remise: 10 },
  { mois: 12, label: "1 an",    badge: "-15% 🔥",     remise: 15 },
  { mois: 24, label: "2 ans",   badge: "-20% 💎",     remise: 20 },
];

function calcMontant(mois: number, remise: number): number {
  return Math.round(PRIX_MENSUEL * mois * (1 - remise / 100));
}

export default function AbonnementPage() {
  const navigate    = useNavigate();
  const user        = getNexoraUser();
  const currentPlan = user?.plan || "gratuit";
  const isPremium   = currentPlan !== "gratuit";
  const [openCat, setOpenCat]       = useState<string | null>("Finance personnelle");
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [dureeIdx, setDureeIdx]     = useState(0); // index dans PLANS_DUREE

  const planChoisi = PLANS_DUREE[dureeIdx];
  const montantTotal = calcMontant(planChoisi.mois, planChoisi.remise);

  const handleUpgrade = async () => {
    if (!user?.id) {
      setError("Vous devez être connecté pour souscrire.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await initPayment({
        type: "abonnement_premium",
        amount: montantTotal,
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
      console.error("Erreur paiement:", err);
      setError(err.message ?? "Impossible d'initialiser le paiement. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-8 pb-20">

        {/* HERO SECTION */}
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
          </div>
        </div>

        {/* MESSAGE D'ERREUR */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-5 py-4 text-sm text-red-400 font-medium">
            ⚠️ {error}
          </div>
        )}

        {/* BOUTON MANUEL SI POPUP BLOQUÉ */}
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
          {/* Plan Gratuit */}
          <div className="bg-card border-2 border-border rounded-3xl p-6 flex flex-col opacity-80">
            <h3 className="text-lg font-black mb-1 text-foreground">Gratuit</h3>
            <p className="text-xs text-muted-foreground mb-4">Découverte de l'écosystème</p>
            <div className="mb-6">
              <span className="text-4xl font-black text-foreground">0</span>
              <span className="text-sm text-muted-foreground ml-1">FCFA / mois</span>
            </div>
            <button disabled className="w-full py-3 bg-muted text-muted-foreground font-bold rounded-xl text-sm mb-4">
              {currentPlan === "gratuit" ? "Plan actuel" : "Inclus par défaut"}
            </button>
          </div>

          {/* Plan Premium */}
          <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 flex flex-col shadow-xl border-2 border-indigo-500/30">
            {planChoisi.badge && (
              <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-md">{planChoisi.badge}</div>
            )}
            <h3 className="text-lg font-black text-white mb-1">Premium</h3>
            <p className="text-xs text-white/50 mb-3">Puissance & Liberté</p>

            {/* Sélecteur de durée */}
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

            <div className="mb-2">
              <span className="text-3xl font-black text-white">
                {new Intl.NumberFormat("fr-FR").format(montantTotal)}
              </span>
              <span className="text-sm text-white/50 ml-1">FCFA</span>
              <p className="text-[10px] text-white/40 mt-0.5">
                {planChoisi.mois === 1
                  ? "Paiement mensuel"
                  : `Soit ${new Intl.NumberFormat("fr-FR").format(Math.round(montantTotal / planChoisi.mois))} FCFA/mois · ${planChoisi.label}`}
              </p>
              {planChoisi.remise > 0 && (
                <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
                  Économie : {new Intl.NumberFormat("fr-FR").format(PRIX_MENSUEL * planChoisi.mois - montantTotal)} FCFA
                </p>
              )}
            </div>

            <button
              onClick={handleUpgrade}
              disabled={isPremium || loading}
              className={`w-full py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 mt-2 ${
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
          </div>
        </div>

        {/* COMPARAISON DÉTAILLÉE (ACCORDÉON) */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-center">Ce qui est inclus</h2>
          {FEATURES_COMPARE.map(cat => {
            const Icon = cat.icon;
            const isOpen = openCat === cat.categorie;
            return (
              <div key={cat.categorie} className="bg-card border border-border rounded-2xl overflow-hidden">
                <button onClick={() => setOpenCat(isOpen ? null : cat.categorie)}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted/30 transition-colors">
                  <Icon className="w-5 h-5 text-indigo-500" />
                  <span className="font-bold text-sm flex-1 text-left">{cat.categorie}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {isOpen && (
                  <div className="border-t border-border bg-muted/10">
                    {/* En-tête colonnes */}
                    <div className="grid grid-cols-3 gap-2 px-5 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-wider border-b border-border/50">
                      <span>Fonctionnalité</span>
                      <span className="text-center">Gratuit</span>
                      <span className="text-center text-indigo-500">Premium</span>
                    </div>
                    {cat.items.map((item, i) => (
                      <div key={item.label} className={`grid grid-cols-3 gap-2 px-5 py-3 text-xs items-center ${i % 2 === 0 ? "bg-muted/20" : ""}`}>
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
            reponse="Le paiement s'effectue par Mobile Money (MTN, Moov, Orange, Wave). Une fois le paiement validé sur votre téléphone, votre compte passe Premium instantanément."
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
