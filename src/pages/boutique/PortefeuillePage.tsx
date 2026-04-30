/**
 * PortefeuillePage — Mon Portefeuille vendeur digital
 * Route : /boutique/portefeuille
 *
 * Règles financières :
 * - Commission NEXORA : 6% sur chaque vente digitale (au lieu de 5%)
 * - Frais de retrait  : 0 FCFA (gratuit)
 * - Retrait minimum   : 5 000 FCFA
 * - Paiements via KKiaPay
 */


import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { openKkiapay, onKkiapaySuccess, onKkiapayFailed, removeKkiapayListeners } from "@/lib/kkiapay";
import { useNavigate } from "react-router-dom";
import {
  Wallet, ArrowUpRight, Clock, CheckCircle2,
  XCircle, TrendingUp, Zap, Phone, X,
  RefreshCw, ShoppingBag, Info, BadgeCheck,
  Loader2, Timer, DollarSign, BarChart2,
  Sparkles, ArrowDownRight, Gift,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────

const FRAIS_RETRAIT_XOF  = 0;       // Retrait GRATUIT
const FRAIS_RETRAIT_USD  = 0;       // Retrait GRATUIT
const COMMISSION_VENTE   = 0.06;    // 6% commission NEXORA sur chaque vente
const RETRAIT_MIN_XOF    = 5000;    // Montant minimum de retrait

const PAYS_RESEAUX: Record<string, string[]> = {
  "Bénin":           ["MTN MoMo", "Moov Money"],
  "Togo":            ["Flooz (Moov)", "T-Money"],
  "Côte d'Ivoire":   ["Orange Money", "MTN MoMo", "Wave", "Moov Money"],
  "Sénégal":         ["Orange Money", "Wave", "Free Money"],
  "Mali":            ["Orange Money", "Moov Money"],
  "Burkina Faso":    ["Orange Money", "Moov Money"],
  "Niger":           ["Airtel Money", "Moov Money"],
  "Guinée":          ["Orange Money", "MTN MoMo"],
  "Cameroun":        ["Orange Money", "MTN MoMo"],
  "Ghana":           ["MTN MoMo", "Vodafone Cash"],
  "Nigeria":         ["Opay", "Palmpay", "MTN MoMo"],
  "Kenya":           ["M-Pesa", "Airtel Money"],
  "Rwanda":          ["MTN MoMo", "Airtel Money"],
};

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

interface VenteDigitale {
  id: string;
  numero: string;
  produit_nom: string;
  montant_total: number;
  commission: number;
  net_vendeur: number;
  devise: string;
  statut_paiement: string;
  created_at: string;
}

interface Retrait {
  id: string;
  amount: number;
  amount_net: number;
  frais: number;
  currency: string;
  status: string;
  pays: string | null;
  reseau: string | null;
  numero: string | null;
  nom_beneficiaire: string | null;
  created_at: string;
  completed_at: string | null;
}

interface Portefeuille {
  solde_disponible: number;
  solde_attente: number;
  total_gains: number;
  devise: string;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

const fmt = (n: number, devise = "FCFA") =>
  `${Math.round(n).toLocaleString("fr-FR")} ${devise}`;

const fmtDate = (dt: string) =>
  new Date(dt).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

const STATUT_RETRAIT: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending:    { label: "En attente",  color: "text-amber-700",  bg: "bg-amber-50  border border-amber-200",  icon: Clock },
  processing: { label: "En cours",    color: "text-[#305CDE]",   bg: "bg-blue-50   border border-blue-200",   icon: Loader2 },
  success:    { label: "Reçu ✓",      color: "text-[#008000]", bg: "bg-green-50 border border-green-300", icon: CheckCircle2 },
  failed:     { label: "Refusé",      color: "text-red-700",    bg: "bg-red-50    border border-red-200",    icon: XCircle },
};

// ─────────────────────────────────────────────────────────────
// BADGE RETRAIT GRATUIT
// ─────────────────────────────────────────────────────────────

function BadgeGratuit() {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-green-100 text-[#008000] border border-[#008000]">
      <Gift className="w-3 h-3" />
      GRATUIT
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// MODAL RETRAIT
// ─────────────────────────────────────────────────────────────

function ModalRetrait({
  portefeuille, onClose, onSuccess,
}: {
  portefeuille: Portefeuille;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep]         = useState<1 | 2>(1);
  const [montant, setMontant]   = useState("");
  const [pays, setPays]         = useState("Bénin");
  const [reseau, setReseau]     = useState(PAYS_RESEAUX["Bénin"][0]);
  const [numero, setNumero]     = useState("");
  const [nom, setNom]           = useState("");
  const [loading, setLoading]   = useState(false);

  const montantNum   = parseFloat(montant) || 0;
  const montantNet   = montantNum;
  const totalDebit   = montantNum;
  const insuffisant  = totalDebit > portefeuille.solde_disponible;
  const tropPetit    = montantNum < RETRAIT_MIN_XOF && montantNum > 0;
  const step1Valid   = montantNum >= RETRAIT_MIN_XOF && !insuffisant;
  const step2Valid   = pays && reseau && numero.length >= 8 && nom.trim().length >= 2;
  const valid        = step1Valid && step2Valid;

  const handlePaysChange = (p: string) => {
    setPays(p);
    setReseau(PAYS_RESEAUX[p]?.[0] || "");
  };

  const handleSubmit = async () => {
    if (!valid) return;
    setLoading(true);
    try {
      const user = getNexoraUser();
      if (!user) throw new Error("Non connecté");

      // 1. Créer l'entrée retrait dans nexora_payouts
      const { data: payout, error: createPayoutErr } = await supabase
        .from("nexora_payouts" as any)
        .insert({
          user_id:          user.id,
          type:             "retrait_boutique",
          amount:           totalDebit,
          amount_net:       montantNet,
          frais:            FRAIS_RETRAIT_XOF,
          currency:         portefeuille.devise,
          pays,
          reseau,
          numero:           numero.trim(),
          nom_beneficiaire: nom.trim(),
          status:           "processing",
        })
        .select()
        .single();

      if (createPayoutErr) throw new Error(createPayoutErr.message);

      // 2. Enregistrer la transaction de débit
      await supabase.from("nexora_transactions" as any).insert({
        user_id:    user.id,
        type:       "retrait_boutique",
        amount:     totalDebit,
        amount_net: montantNet,
        frais:      FRAIS_RETRAIT_XOF,
        currency:   portefeuille.devise,
        status:     "processing",
        metadata: {
          payout_id:        payout?.id,
          pays,
          reseau,
          numero,
          nom_beneficiaire: nom.trim(),
        },
      });

      // 3. Déclencher le payout via Edge Function KKiaPay
      const { data: payoutData, error: invokeErr } = await supabase.functions.invoke("kkiapay-payout", {
        body: {
          payout_id:        payout?.id ?? "",
          type:             "retrait_boutique",
          amount:           totalDebit,
          amount_net:       montantNet,
          frais:            FRAIS_RETRAIT_XOF,
          user_id:          user.id,
          user_email:       user.email ?? "",
          user_first_name:  nom.trim().split(" ")[0] ?? "Client",
          user_last_name:   nom.trim().split(" ").slice(1).join(" ") || "NEXORA",
          pays,
          reseau,
          numero_mobile:    numero.trim(),
          metadata: { source: "portefeuille_boutique" },
        },
      });

      if (invokeErr || !payoutData?.success) {
        await supabase.from("nexora_payouts" as any)
          .update({ status: "failed" })
          .eq("id", payout?.id);
        throw new Error(payoutData?.error ?? invokeErr?.message ?? "Erreur API paiement");
      }

      toast({
        title: "✅ Retrait initié !",
        description: `${fmt(montantNum, portefeuille.devise)} en route vers votre ${reseau}. Délai : max 5 min.`,
      });
      onSuccess();
    } catch (e: any) {
      toast({ title: "Erreur retrait", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="relative bg-gradient-to-br from-[#1e3fa8] via-[#305CDE] to-blue-500 p-6 text-white overflow-hidden">
          <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-black/10 blur-2xl pointer-events-none" />
          <div className="relative flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-black tracking-widest opacity-70 uppercase mb-0.5">Mon Portefeuille</p>
              <h3 className="text-2xl font-black">Effectuer un retrait</h3>
            </div>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-white/30 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Solde + badge gratuit */}
          <div className="bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs opacity-70">Solde disponible</p>
              <p className="text-2xl font-black">{fmt(portefeuille.solde_disponible, portefeuille.devise)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-70 mb-1">Frais de retrait</p>
              <BadgeGratuit />
            </div>
          </div>

          {/* Indicateur d'étapes */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`flex items-center gap-2 ${s < 2 ? "flex-1" : ""}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  step >= s ? "bg-white text-[#1e3fa8]" : "bg-white/20 text-white"
                }`}>{s}</div>
                {s === 1 && <div className={`flex-1 h-0.5 rounded-full transition-all ${step >= 2 ? "bg-white" : "bg-white/30"}`} />}
                <span className={`text-xs font-semibold transition-opacity ${step === s ? "opacity-100" : "opacity-50"}`}>
                  {s === 1 ? "Montant" : "Destination"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Corps ── */}
        <div className="p-5 space-y-4 max-h-[55vh] overflow-y-auto">

          {/* ── ÉTAPE 1 : Montant ── */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  Montant à retirer
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={montant}
                    onChange={e => setMontant(e.target.value)}
                    placeholder={`Min. ${fmt(RETRAIT_MIN_XOF, portefeuille.devise)}`}
                    className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#305CDE] transition"
                  />
                </div>
                {tropPetit && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Minimum : {fmt(RETRAIT_MIN_XOF, portefeuille.devise)}
                  </p>
                )}
                {insuffisant && !tropPetit && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <XCircle className="w-3.5 h-3.5" /> Solde insuffisant
                  </p>
                )}
              </div>

              {montantNum > 0 && (
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-[#008000] rounded-2xl p-4 space-y-2.5">
                  <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Montant demandé</span>
                    <span className="font-semibold">{fmt(montantNum, portefeuille.devise)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-[#008000] font-semibold">
                    <span className="flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5" />
                      Frais de retrait
                    </span>
                    <span className="font-black">0 FCFA ✓</span>
                  </div>
                  <div className="flex justify-between font-black text-base text-gray-900 dark:text-white border-t border-green-300 dark:border-[#008000] pt-2.5">
                    <span>Vous recevez</span>
                    <span className="text-[#008000]">{fmt(montantNet, portefeuille.devise)}</span>
                  </div>
                  <p className="text-xs text-[#008000] text-center font-semibold">
                    🎉 Vous recevez 100% de votre montant — aucun frais !
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-[#1e3fa8] to-[#305CDE] hover:from-[#1a3495] hover:to-[#254fc7] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2"
              >
                Continuer → Choisir la destination
              </button>
            </div>
          )}

          {/* ── ÉTAPE 2 : Destination ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 rounded-2xl px-4 py-3">
                <span className="text-sm text-gray-500">Montant à retirer</span>
                <div className="flex items-center gap-2">
                  <span className="font-black text-gray-900 dark:text-white">{fmt(montantNum, portefeuille.devise)}</span>
                  <button onClick={() => setStep(1)} className="text-xs text-[#305CDE] underline font-semibold">
                    Modifier
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Pays</label>
                <select
                  value={pays}
                  onChange={e => handlePaysChange(e.target.value)}
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#305CDE]"
                >
                  {Object.keys(PAYS_RESEAUX).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Réseau Mobile Money</label>
                <div className="grid grid-cols-2 gap-2">
                  {(PAYS_RESEAUX[pays] || []).map(r => (
                    <button
                      key={r}
                      onClick={() => setReseau(r)}
                      className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all ${
                        reseau === r
                          ? "border-[#305CDE] bg-blue-50 dark:bg-blue-950/30 text-[#1e3fa8] dark:text-[#5b7ee5]"
                          : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                  <Phone className="inline w-3.5 h-3.5 mr-1" />Numéro Mobile Money
                </label>
                <input
                  type="tel"
                  value={numero}
                  onChange={e => setNumero(e.target.value)}
                  placeholder="+229 97 XX XX XX"
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#305CDE]"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom du bénéficiaire</label>
                <input
                  type="text"
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Prénom Nom"
                  className="w-full py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-[#305CDE]"
                />
              </div>

              <div className="flex items-start gap-2.5 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-[#305CDE] rounded-xl p-3">
                <Timer className="w-4 h-4 text-[#305CDE] mt-0.5 flex-shrink-0" />
                <p className="text-xs text-[#305CDE] dark:text-[#305CDE]">
                  Traitement en <strong>max 5 minutes</strong>. Vérifiez votre numéro avant de confirmer.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3.5 rounded-2xl border-2 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!valid || loading}
                  className="flex-[2] py-3.5 rounded-2xl bg-gradient-to-r from-[#1e3fa8] to-[#305CDE] hover:from-[#1a3495] hover:to-[#254fc7] disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</>
                    : <><ArrowUpRight className="w-4 h-4" /> Retirer {fmt(montantNum, portefeuille.devise)}</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────

export default function PortefeuillePage() {
  const { toast }  = useToast();
  const navigate   = useNavigate();

  const [loading,      setLoading]      = useState(true);
  const [boutique,     setBoutique]     = useState<any>(null);
  const [ventes,       setVentes]       = useState<VenteDigitale[]>([]);
  const [retraits,     setRetraits]     = useState<Retrait[]>([]);
  const [portefeuille, setPortefeuille] = useState<Portefeuille>({
    solde_disponible: 0, solde_attente: 0, total_gains: 0, devise: "FCFA",
  });
  const [showRetrait, setShowRetrait]   = useState(false);
  const [activeTab,   setActiveTab]     = useState<"ventes" | "retraits">("ventes");
  const [refreshing,  setRefreshing]    = useState(false);

  const load = useCallback(async () => {
    const user = getNexoraUser();
    if (!user) { navigate("/login"); return; }

    setLoading(true);
    try {
      const { data: b } = await supabase
        .from("boutiques" as any).select("*").eq("user_id", user.id).limit(1).maybeSingle();
      if (b) setBoutique(b);

      const devise = (b as any)?.devise || "FCFA";

      // ── Uniquement les commandes digitales confirmées par KKiaPay ──
      // Filtre SQL direct : product_type = "numerique" + paiement confirmé
      const { data: commandes } = await supabase
        .from("commandes" as any)
        .select("id, numero, items, total, devise, statut_paiement, statut, created_at, boutique_id, produit_id")
        .eq("boutique_id", (b as any)?.id)
        .eq("product_type", "numerique")          // uniquement digitaux
        .eq("statut_paiement", "paye")            // uniquement paiements confirmés par KKiaPay
        .eq("statut", "confirmee")                // double sécurité : statut aussi confirmé
        .order("created_at", { ascending: false })
        .limit(100);

      const ventesDigitales: VenteDigitale[] = (commandes as any[] || []).map((cmd: any) => {
        const items: any[] = cmd.items || [];
        // Récupérer le nom du produit depuis items ou fallback
        const produitNom =
          items.find((i: any) => i.type === "numerique" || i.type === "digital")?.nom_produit ||
          items[0]?.nom_produit ||
          "Produit digital";
        const commission = Math.round(cmd.total * COMMISSION_VENTE);
        return {
          id:             cmd.id,
          numero:         cmd.numero,
          produit_nom:    produitNom,
          montant_total:  cmd.total,
          commission,
          net_vendeur:    cmd.total - commission,
          devise:         cmd.devise || devise,
          statut_paiement: cmd.statut_paiement,
          created_at:     cmd.created_at,
        };
      });
      setVentes(ventesDigitales);

      // Retraits de cette boutique uniquement (par user_id + type)
      // Les retraits "failed" sont exclus du calcul du solde mais affichés dans l'historique
      const { data: payouts } = await supabase
        .from("nexora_payouts" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "retrait_boutique")
        .order("created_at", { ascending: false })
        .limit(50);
      setRetraits((payouts as any[] || []) as Retrait[]);

      const totalGains = ventesDigitales.reduce((s, v) => s + v.net_vendeur, 0);
      // Uniquement les retraits réussis réduisent le solde
      const totalRetire = (payouts as any[] || [])
        .filter((p: any) => p.status === "success")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      // Les retraits en cours sont "réservés" (déduits mais pas encore confirmés)
      const enCours = (payouts as any[] || [])
        .filter((p: any) => p.status === "processing" || p.status === "pending")
        .reduce((s: number, p: any) => s + (p.amount || 0), 0);
      // Les retraits échoués (failed) ne sont PAS déduits — l'argent reste disponible

      setPortefeuille({
        solde_disponible: Math.max(0, totalGains - totalRetire - enCours),
        solde_attente:    enCours,
        total_gains:      totalGains,
        devise,
      });
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
    toast({ title: "✅ Portefeuille mis à jour" });
  };

  if (loading) {
    return (
      <BoutiqueLayout boutiqueName="Mon Portefeuille">
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="space-y-3 text-center">
            <div className="w-12 h-12 rounded-full border-4 border-[#305CDE] border-t-transparent animate-spin mx-auto" />
            <p className="text-sm text-gray-500">Chargement du portefeuille…</p>
          </div>
        </div>
      </BoutiqueLayout>
    );
  }

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom || "Mon Portefeuille"} boutiqueSlug={boutique?.slug}>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl flex items-center justify-center">
                <Wallet className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              Mon Portefeuille
            </h1>

          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition font-semibold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>

        {/* ── Cartes solde ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-[#305CDE] to-blue-600 p-6 text-white shadow-xl sm:col-span-1">
            <div className="absolute -top-6 -right-6 w-36 h-36 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 -left-4 w-24 h-24 rounded-full bg-black/15 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-wider opacity-80">Disponible</p>
                </div>
                <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-full opacity-90">
                  Retrait gratuit
                </span>
              </div>
              <p className="text-3xl font-black leading-tight">{fmt(portefeuille.solde_disponible, portefeuille.devise)}</p>
              <p className="text-xs opacity-60 mt-1">Retirable immédiatement</p>
            </div>
            <button
              onClick={() => setShowRetrait(true)}
              disabled={portefeuille.solde_disponible < RETRAIT_MIN_XOF}
              className="mt-5 w-full py-2.5 rounded-xl bg-white/20 hover:bg-white/30 active:bg-white/40 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition flex items-center justify-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" /> Retirer maintenant
            </button>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">En attente</p>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(portefeuille.solde_attente, portefeuille.devise)}</p>
              <p className="text-xs text-gray-400 mt-1">Retraits en cours de traitement</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-amber-600 font-semibold">
              <Loader2 className="w-3 h-3 animate-spin" /> Traitement max 5 min
            </div>
          </div>

          <div className="rounded-3xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-wider">Total gains</p>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(portefeuille.total_gains, portefeuille.devise)}</p>
              <p className="text-xs text-gray-400 mt-1">Net après commission 6%</p>
            </div>
            <div className="mt-4 flex items-center gap-1.5 text-xs text-[#008000] font-semibold">
              <BadgeCheck className="w-3.5 h-3.5" /> {ventes.length} vente{ventes.length > 1 ? "s" : ""} digitale{ventes.length > 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* ── Bandeau info ── */}
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
              <BarChart2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm text-orange-800 dark:text-orange-200">
              <p className="font-black mb-0.5">Commission NEXORA : 6%</p>
              <p className="text-xs opacity-80">Déduite automatiquement sur chaque vente digitale. Vous percevez 94% du montant de vente.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-green-50 dark:bg-green-950/20 border border-green-300 dark:border-[#008000]/50 rounded-2xl p-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0">
              <Gift className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-sm text-[#008000] dark:text-[#008000]">
              <p className="font-black mb-0.5 flex items-center gap-2">
                Retraits gratuits <BadgeGratuit />
              </p>
              <p className="text-xs opacity-80">0 FCFA de frais. Minimum {fmt(RETRAIT_MIN_XOF)}. Délai max 5 min vers votre Mobile Money.</p>
            </div>
          </div>
        </div>

        {/* ── Onglets historique ── */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-800">
            {(["ventes", "retraits"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-4 text-sm font-bold transition-all ${
                  activeTab === tab
                    ? "text-[#305CDE] border-b-2 border-[#305CDE] bg-blue-50/50 dark:bg-blue-950/20"
                    : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                }`}
              >
                {tab === "ventes"
                  ? <><ShoppingBag className="inline w-4 h-4 mr-1.5" />Ventes ({ventes.length})</>
                  : <><ArrowUpRight className="inline w-4 h-4 mr-1.5" />Retraits ({retraits.length})</>}
              </button>
            ))}
          </div>

          {activeTab === "ventes" && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {ventes.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                    <Zap className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">Aucune vente digitale pour l'instant</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600">Vos ventes NEXORA apparaîtront ici automatiquement</p>
                </div>
              ) : (
                ventes.map(v => (
                  <div key={v.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/40 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                        <Zap className="w-5 h-5 text-[#305CDE]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{v.produit_nom}</p>
                        <p className="text-xs text-gray-400">{v.numero} · {fmtDate(v.created_at)}</p>
                        <p className="text-xs text-gray-400">
                          Commission 6% : <span className="text-orange-500">−{fmt(v.commission, v.devise)}</span>
                          {" "}· Total brut : {fmt(v.montant_total, v.devise)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <p className="text-sm font-black text-[#008000]">+{fmt(v.net_vendeur, v.devise)}</p>
                      <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 border border-green-300 text-[#008000]">
                        <CheckCircle2 className="w-3 h-3" /> Payé
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "retraits" && (
            <div className="divide-y divide-gray-50 dark:divide-gray-800">
              {retraits.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-16 h-16 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto">
                    <ArrowUpRight className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  </div>
                  <p className="text-sm font-semibold text-gray-400">Aucun retrait effectué</p>
                  <p className="text-xs text-gray-300 dark:text-gray-600">Vos retraits gratuits apparaîtront ici</p>
                </div>
              ) : (
                retraits.map(r => {
                  const s = STATUT_RETRAIT[r.status] || STATUT_RETRAIT["pending"];
                  const SIcon = s.icon;
                  return (
                    <div key={r.id} className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition">
                          <Phone className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {r.reseau} · {r.numero}
                          </p>
                          <p className="text-xs text-gray-400">{r.nom_beneficiaire} · {fmtDate(r.created_at)}</p>
                          <p className="text-xs text-gray-400">
                            Frais : <span className="text-[#008000] font-semibold">0 FCFA</span>
                            {" "}· Net reçu : <span className="font-semibold">{fmt(r.amount_net, r.currency)}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm font-black text-gray-900 dark:text-white">−{fmt(r.amount, r.currency)}</p>
                        <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.color}`}>
                          <SIcon className={`w-3 h-3 ${r.status === "processing" ? "animate-spin" : ""}`} />
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* ── Stats synthèse ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Ventes",        val: ventes.length,                                                           icon: ShoppingBag,  color: "text-[#305CDE]",   bg: "bg-blue-50 dark:bg-blue-950/30",   sub: "digitales" },
            { label: "Total retraits", val: retraits.length,                                                         icon: ArrowUpRight, color: "text-[#305CDE]", bg: "bg-[#305CDE]/5 dark:bg-[#305CDE]/20", sub: "effectués" },
            { label: "Réussis",        val: retraits.filter(r => r.status === "success").length,                     icon: CheckCircle2, color: "text-[#008000]", bg: "bg-green-50 dark:bg-green-950/30", sub: "complétés" },
            { label: "En cours",       val: retraits.filter(r => r.status === "processing" || r.status === "pending").length, icon: Loader2, color: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30", sub: "en traitement" },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl p-4 ${s.bg} flex flex-col items-center text-center`}>
              <s.icon className={`w-5 h-5 ${s.color} mb-2`} />
              <p className="text-2xl font-black text-gray-900 dark:text-white">{s.val}</p>
              <p className="text-xs font-bold text-gray-500 mt-0.5">{s.label}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>

      </div>

      {showRetrait && (
        <ModalRetrait
          portefeuille={portefeuille}
          onClose={() => setShowRetrait(false)}
          onSuccess={() => { setShowRetrait(false); load(); }}
        />
      )}
    </BoutiqueLayout>
  );
}
