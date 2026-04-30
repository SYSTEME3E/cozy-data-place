import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { getNexoraUser, refreshNexoraSession, NEXORA_USER_KEY, NEXORA_SESSION_KEY } from "@/lib/nexora-auth";
import { supabase } from "@/integrations/supabase/client";
import { openKkiapay, onKkiapaySuccess, onKkiapayFailed, removeKkiapayListeners } from "@/lib/kkiapay";
import {
  Crown, Check, X, Zap, Star, Sparkles,
  TrendingUp, Store,
  BadgeCheck, ChevronDown, ChevronUp, RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// ─────────────────────────────────────────────────────────────────────────────
// TAUX DE CHANGE FIXES
// ─────────────────────────────────────────────────────────────────────────────
const TAUX_FIXES: Record<string, number> = {
  XOF: 1, XAF: 1,
  USD: 0.001538, EUR: 0.001415, GBP: 0.001231,
  GNF: 14.8, GHS: 0.024, NGN: 2.55, KES: 0.21, TZS: 4.32,
  UGX: 6.12, RWF: 1.92, MAD: 0.016, GMD: 0.109, SLL: 22.5,
  ZMW: 0.044, CDF: 4.6, MZN: 0.104,
};
const SYMBOLES: Record<string, string> = {
  XOF: "FCFA", XAF: "FCFA", USD: "$", EUR: "€", GBP: "£",
  GNF: "GNF", GHS: "₵", NGN: "₦", KES: "KSh", TZS: "TSh",
  UGX: "USh", RWF: "RF", MAD: "MAD", GMD: "GMD", SLL: "SLL",
  ZMW: "ZMW", CDF: "FC", MZN: "MT",
};

function convertirXofVers(montantXOF: number, devise: string): number {
  const taux = TAUX_FIXES[devise] ?? 1;
  if (["USD", "EUR", "GBP"].includes(devise)) return Math.round(montantXOF * taux * 100) / 100;
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
    categorie: "Fonctionnalités gratuites",
    icon: TrendingUp,
    items: [
      { label: "Tableau de bord",        gratuit: true,  premium: true },
      { label: "Nexora Transfert",       gratuit: true,  premium: true },
      { label: "Historique transactions",gratuit: true,  premium: true },
      { label: "Produits digitaux",      gratuit: true,  premium: true },
      { label: "Nexora Academy",         gratuit: true,  premium: true },
      { label: "Entrées & Dépenses",     gratuit: true,  premium: true },
      { label: "Contacts WhatsApp",      gratuit: true,  premium: true },
    ],
  },
  {
    categorie: "Fonctionnalités Premium uniquement",
    icon: Store,
    items: [
      { label: "Marché Immobilier (publication)", gratuit: false, premium: true },
      { label: "Boutique — Produits physiques",   gratuit: false, premium: true },
      { label: "Factures",                        gratuit: false, premium: true },
    ],
  },
];

const PRIX_MENSUEL_XOF = 3250;
const PLANS_DUREE = [
  { mois: 1,  label: "1 mois", badge: null,      remise: 0  },
  { mois: 3,  label: "3 mois", badge: "-5%",     remise: 5  },
  { mois: 6,  label: "6 mois", badge: "-10%",    remise: 10 },
  { mois: 12, label: "1 an",   badge: "-15% 🔥", remise: 15 },
  { mois: 24, label: "2 ans",  badge: "-20% 💎", remise: 20 },
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
  const navigate = useNavigate();

  // ✅ FIX 1 : plan chargé depuis la DB — pas uniquement depuis le localStorage
  const [planReel, setPlanReel]         = useState<string | null>(null); // null = chargement en cours
  const [abonnementInfo, setAbonnementInfo] = useState<{
    date_fin: string | null;
    duree_mois: number | null;
  } | null>(null);
  const [checkingPlan, setCheckingPlan] = useState(true);

  const [openCat, setOpenCat]   = useState<string | null>("Finance personnelle");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [dureeIdx, setDureeIdx] = useState(0);

  const deviseLocale = (() => {
    try { return localStorage.getItem("nexora-devise") || "XOF"; } catch { return "XOF"; }
  })();

  // ✅ FIX 2 : Au montage, on lit le plan DEPUIS LA BASE DE DONNÉES
  // Le localStorage peut être désynchronisé — la DB est la source de vérité
  useEffect(() => {
    async function chargerPlanReel() {
      setCheckingPlan(true);
      try {
        // D'abord rafraîchir la session (met à jour le localStorage depuis la DB)
        await refreshNexoraSession();

        const user = getNexoraUser();
        if (!user) {
          setPlanReel("gratuit");
          setCheckingPlan(false);
          return;
        }

        // Lire le plan directement en DB pour être sûr
        const { data: userData } = await supabase
          .from("nexora_users" as any)
          .select("plan, badge_premium")
          .eq("id", user.id)
          .maybeSingle();

        const planDB = (userData as any)?.plan ?? "gratuit";
        setPlanReel(planDB);

        // ✅ FIX 3 : Mettre à jour le localStorage avec le vrai plan DB
        const storage = localStorage.getItem(NEXORA_SESSION_KEY) ? localStorage : sessionStorage;
        const rawUser = storage.getItem(NEXORA_USER_KEY);
        if (rawUser) {
          const parsed = JSON.parse(rawUser);
          parsed.plan = planDB;
          parsed.badge_premium = (userData as any)?.badge_premium ?? false;
          storage.setItem(NEXORA_USER_KEY, JSON.stringify(parsed));
        }

        // Charger les infos de l'abonnement actif si premium
        if (planDB !== "gratuit") {
          const { data: abo } = await supabase
            .from("nexora_abonnements" as any)
            .select("date_fin, duree_mois")
            .eq("user_id", user.id)
            .eq("statut", "actif")
            .order("date_fin", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (abo) {
            setAbonnementInfo({
              date_fin: (abo as any).date_fin,
              duree_mois: (abo as any).duree_mois,
            });
          }
        }
      } catch (e) {
        console.error("Erreur chargement plan:", e);
        // Fallback sur le localStorage en cas d'erreur réseau
        const user = getNexoraUser();
        setPlanReel(user?.plan ?? "gratuit");
      } finally {
        setCheckingPlan(false);
      }
    }

    chargerPlanReel();
  }, []);

  // ✅ isPremium basé sur le plan DB — pas le plan localStorage figé
  const isPremium = planReel !== null && planReel !== "gratuit";

  const planChoisi    = PLANS_DUREE[dureeIdx];
  const montantXOF    = calcMontantXOF(planChoisi.mois, planChoisi.remise);
  const montantLocal  = convertirXofVers(montantXOF, deviseLocale);
  const prixSansRemise = PRIX_MENSUEL_XOF * planChoisi.mois;
  const economieXOF   = prixSansRemise - montantXOF;
  const economieLocal = convertirXofVers(economieXOF, deviseLocale);

  const handleUpgrade = async () => {
    const user = getNexoraUser();
    if (!user?.id) { setError("Vous devez être connecté pour souscrire."); return; }
    setLoading(true);
    setError(null);

    try {
      await removeKkiapayListeners();

      await onKkiapaySuccess(async ({ transactionId }) => {
        await removeKkiapayListeners();
        // ⏳ Attendre 2s pour laisser KKiaPay finaliser la transaction côté API
        await new Promise(resolve => setTimeout(resolve, 2000));

        // ✅ FIX 4 : Appel vers la fonction edge qui enregistre l'abonnement en DB
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke("kkiapay-verify", {
          body: {
            transactionId,
            type:       "abonnement_premium",
            user_id:    user.id,
            duree_mois: planChoisi.mois,
            montant_xof: montantXOF,
          },
        });

        if (verifyError || !verifyData?.success) {
          setError("Paiement reçu mais activation échouée. Contactez le support avec votre référence : " + transactionId);
          setLoading(false);
          return;
        }

        // ✅ FIX 5 : Rafraîchir la session depuis la DB avant la redirection
        // → le localStorage aura le bon plan "boss" ou "roi"
        await refreshNexoraSession();

        window.location.href = "/dashboard?abonnement=success";
      });

      await onKkiapayFailed(() => {
        removeKkiapayListeners();
        setError("Le paiement a échoué. Veuillez réessayer.");
        setLoading(false);
      });

      await openKkiapay({
        amount: montantXOF,
        name:   user.nom_prenom ?? "Client NEXORA",
        email:  user.email ?? "",
        reason: `Abonnement NEXORA Premium — ${planChoisi.mois} mois`,
        data:   JSON.stringify({ type: "abonnement_premium", user_id: user.id, duree_mois: planChoisi.mois }),
      });
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
              Un seul abonnement pour vendre des <span className="text-yellow-300 font-bold">produits physiques</span>. Les produits digitaux sont accessibles gratuitement.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] font-bold text-emerald-300">
              <Check className="w-3 h-3" />
              5$ / mois · {formaterMontant(PRIX_MENSUEL_XOF, "XOF")}
              {deviseLocale !== "XOF" && deviseLocale !== "XAF" && (
                <> = {formaterMontant(convertirXofVers(PRIX_MENSUEL_XOF, deviseLocale), deviseLocale)}</>
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

        {/* ✅ BANNER PLAN ACTIF — affiché seulement si vraiment premium en DB */}
        {!checkingPlan && isPremium && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl px-5 py-4 flex items-start gap-4">
            <BadgeCheck className="w-6 h-6 text-emerald-400 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-black text-emerald-400 uppercase">Abonnement actif ✅</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Votre plan <span className="font-bold capitalize">{planReel}</span> est actif.
                {abonnementInfo?.date_fin && (
                  <> Expire le{" "}
                    <span className="font-bold">
                      {new Date(abonnementInfo.date_fin).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}
                    </span>.
                  </>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Indicateur de chargement du plan */}
        {checkingPlan && (
          <div className="flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Vérification de votre abonnement...
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
              {!isPremium ? "Plan actuel" : "Inclus par défaut"}
            </button>
          </div>

          {/* Premium */}
          <div className="relative bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 flex flex-col shadow-xl border-2 border-indigo-500/30">
            {planChoisi.badge && !isPremium && (
              <div className="absolute top-4 right-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 rounded-md">
                {planChoisi.badge}
              </div>
            )}
            <h3 className="text-lg font-black text-white mb-1">Premium</h3>
            <p className="text-xs text-white/50 mb-3">Puissance & Liberté</p>

            {/* Sélecteur durée — masqué si déjà premium */}
            {!isPremium && (
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
            )}

            {/* Prix */}
            <div className="mb-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-white">
                  {new Intl.NumberFormat("fr-FR").format(montantXOF)} FCFA
                </span>
              </div>
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
              {planChoisi.remise > 0 && !isPremium && (
                <p className="text-[10px] text-yellow-400 font-bold mt-0.5">
                  Économie : {new Intl.NumberFormat("fr-FR").format(economieXOF)} FCFA
                  {deviseLocale !== "XOF" && deviseLocale !== "XAF" && economieLocal > 0 && (
                    <span className="text-white/50 ml-1">≈ {formaterMontant(economieLocal, deviseLocale)}</span>
                  )}
                </p>
              )}
            </div>

            {/* ✅ BOUTON — état basé sur planReel (DB), pas localStorage */}
            <button
              onClick={handleUpgrade}
              disabled={isPremium || loading || checkingPlan}
              className={`w-full py-4 font-black rounded-xl transition-all flex items-center justify-center gap-2 mt-3 ${
                checkingPlan
                  ? "bg-white/10 text-white/40 cursor-wait"
                  : isPremium
                    ? "bg-emerald-500/20 text-emerald-300 cursor-default border border-emerald-500/30"
                    : loading
                      ? "bg-white/20 text-white/60 cursor-wait"
                      : "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-[1.02] shadow-lg shadow-orange-500/20"
              }`}
            >
              {checkingPlan
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Vérification...</>
                : isPremium
                  ? <><BadgeCheck className="w-4 h-4" /> Abonnement Actif</>
                  : loading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Paiement en cours...</>
                    : <><Zap className="w-4 h-4" /> Souscrire — {planChoisi.label}</>
              }
            </button>

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
            reponse="1 mois = 3 250 FCFA ≈ 5,00 USD ≈ 4,60 EUR. Ces taux sont fixes et indicatifs. Le paiement se fait toujours en FCFA via Mobile Money."
          />
          <FAQItem
            question="Puis-je annuler mon abonnement ?"
            reponse="Oui, Nexora est sans engagement. Vous pouvez arrêter quand vous voulez depuis votre profil."
          />
          <FAQItem
            question="Que se passe-t-il si je ferme la page après le paiement ?"
            reponse="Votre paiement est enregistré côté serveur. Si votre compte n'est pas activé, contactez le support avec votre référence de paiement."
          />
          <FAQItem
            question="Pourquoi le bouton affiche encore 'Souscrire' après paiement ?"
            reponse="La page vérifie votre statut directement en base de données à chaque ouverture. Si vous venez de payer, patientez quelques secondes et rechargez la page."
          />
        </div>

      </div>
    </AppLayout>
  );
}
