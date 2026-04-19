/**
 * NEXORA — Mes Commissions + Bonus MLM
 * FIX: details_paiement → note_admin string | bouton X toujours visible
 */

import { useEffect, useState } from "react";
import {
  DollarSign, Filter, Loader2, TrendingUp, BookOpen,
  Users, Calendar, ChevronDown, Wallet, Gift,
  ArrowDownToLine, X, CheckCircle, Clock, AlertCircle, Phone, MapPin
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { formatMontant, getLevelLabel, getCommissionTypeLabel } from "@/lib/mlm-utils";
import { useDevise } from "@/lib/devise-context";

// ─── Pays + réseaux Mobile Money ──────────────────────────────────────────────
const PAYOUT_COUNTRIES = [
  { code: "BJ", flag: "🇧🇯", name: "Bénin",         networks: ["MTN MoMo", "Moov Money"] },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", networks: ["Orange Money", "MTN MoMo", "Wave", "Moov Money"] },
  { code: "TG", flag: "🇹🇬", name: "Togo",           networks: ["Flooz", "T-Money"] },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",        networks: ["Orange Money", "Wave", "Free Money"] },
  { code: "NE", flag: "🇳🇪", name: "Niger",          networks: ["Airtel Money", "Moov Money"] },
  { code: "ML", flag: "🇲🇱", name: "Mali",           networks: ["Orange Money", "Moov Money", "Wave"] },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",   networks: ["Orange Money", "Moov Money"] },
  { code: "GN", flag: "🇬🇳", name: "Guinée",         networks: ["Orange Money", "MTN MoMo"] },
  { code: "CM", flag: "🇨🇲", name: "Cameroun",       networks: ["MTN MoMo", "Orange Money"] },
  { code: "CD", flag: "🇨🇩", name: "RD Congo",       networks: ["Vodacom", "Airtel Money"] },
  { code: "GA", flag: "🇬🇦", name: "Gabon",          networks: ["Airtel Money", "MTN MoMo"] },
  { code: "CG", flag: "🇨🇬", name: "Congo",          networks: ["MTN MoMo", "Airtel Money"] },
  { code: "GH", flag: "🇬🇭", name: "Ghana",          networks: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"] },
  { code: "NG", flag: "🇳🇬", name: "Nigéria",        networks: ["MTN MoMo", "Airtel Money", "Glo Pay"] },
  { code: "KE", flag: "🇰🇪", name: "Kenya",          networks: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", flag: "🇹🇿", name: "Tanzanie",       networks: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
  { code: "UG", flag: "🇺🇬", name: "Ouganda",        networks: ["MTN MoMo", "Airtel Money"] },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",         networks: ["MTN MoMo", "Airtel Money"] },
  { code: "MA", flag: "🇲🇦", name: "Maroc",          networks: ["Orange Money", "Maroc Telecom"] },
  { code: "GM", flag: "🇬🇲", name: "Gambie",         networks: ["Africell Money", "QCell"] },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone",   networks: ["Orange Money", "Africell Money"] },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique",     networks: ["M-Pesa", "Airtel Money"] },
  { code: "ZM", flag: "🇿🇲", name: "Zambie",         networks: ["MTN MoMo", "Airtel Money"] },
];

interface Commission {
  id: string; from_user_id: string; to_user_id: string;
  level: number; amount: number; currency: string;
  type: string; status: string; created_at: string;
  from_user?: { nom_prenom: string; username: string };
}
interface Bonus {
  id: string; montant: number; currency: string; type_bonus: string;
  description?: string; status: string; created_at: string;
}
interface Withdrawal {
  id: string; amount: number; currency: string;
  methode: string; status: string; created_at: string;
  note_admin?: string;
}

type MainTab = "commissions" | "bonus" | "retraits";

const MONTANT_MIN_RETRAIT = 2000; // XOF

export default function CommissionsPage() {
  const user = getNexoraUser();
  const { fmtXOF } = useDevise();

  const [mainTab, setMainTab]           = useState<MainTab>("commissions");
  const [commissions, setCommissions]   = useState<Commission[]>([]);
  const [bonus, setBonus]               = useState<Bonus[]>([]);
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [loading, setLoading]           = useState(true);
  const [solde, setSolde]               = useState(0);

  // Filtres commissions
  const [filterType, setFilterType]   = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");

  // Modal retrait
  const [showRetrait, setShowRetrait]         = useState(false);
  const [retraitStep, setRetraitStep]         = useState<"form"|"confirming"|"pending"|"done"|"error">("form");
  const [retraitAmount, setRetraitAmount]     = useState("");
  const [retraitNom, setRetraitNom]           = useState("");
  const [retraitPays, setRetraitPays]         = useState(PAYOUT_COUNTRIES[0].code);
  const [retraitReseau, setRetraitReseau]     = useState(PAYOUT_COUNTRIES[0].networks[0]);
  const [retraitNumero, setRetraitNumero]     = useState("");
  const [retraitError, setRetraitError]       = useState("");
  const [payoutCountdown, setPayoutCountdown] = useState(600);

  useEffect(() => { if (user) loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    const [
      { data: commData },
      { data: userData },
      { data: bonusData },
      { data: wdData },
    ] = await Promise.all([
      (supabase as any).from("mlm_commissions")
        .select("*, from_user:from_user_id(nom_prenom, username)")
        .eq("to_user_id", user!.id)
        .order("created_at", { ascending: false }).limit(300),
      (supabase as any).from("nexora_users")
        .select("solde_commissions").eq("id", user!.id).maybeSingle(),
      (supabase as any).from("historique_bonus")
        .select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(100),
      (supabase as any).from("mlm_withdrawals")
        .select("*").eq("user_id", user!.id)
        .order("created_at", { ascending: false }).limit(50),
    ]);

    setCommissions(commData || []);
    setSolde(userData?.solde_commissions || 0);
    setBonus(bonusData || []);
    setWithdrawals(wdData || []);
    setLoading(false);
  };

  // Commissions filtrées
  const filtered = commissions.filter(c => {
    if (filterType  !== "all" && c.type         !== filterType)         return false;
    if (filterLevel !== "all" && String(c.level) !== filterLevel) return false;
    return true;
  });
  const totalFiltered = filtered.reduce((s, c) => s + c.amount, 0);
  const totalBonus    = bonus.reduce((s, b) => s + b.montant, 0);

  const typeStats = {
    subscription: commissions.filter(c => c.type === "subscription").reduce((s, c) => s + c.amount, 0),
    formation:    commissions.filter(c => c.type === "formation").reduce((s, c) => s + c.amount, 0),
  };

  const getLevelColor = (level: number) => {
    if (level === 0) return "text-amber-400 bg-amber-400/10";
    if (level === 1) return "text-emerald-400 bg-emerald-400/10";
    if (level === 2) return "text-blue-400 bg-blue-400/10";
    return "text-purple-400 bg-purple-400/10";
  };

  const getWdStatusColor = (status: string) => {
    if (status === "paid")     return "bg-emerald-500/10 text-emerald-500";
    if (status === "approved") return "bg-blue-500/10 text-blue-500";
    if (status === "rejected") return "bg-destructive/10 text-destructive";
    return "bg-amber-400/10 text-amber-400";
  };
  const getWdStatusLabel = (status: string) => {
    if (status === "paid")     return "Payé ✓";
    if (status === "approved") return "Approuvé";
    if (status === "rejected") return "Refusé";
    return "En attente";
  };

  const selectedCountry = PAYOUT_COUNTRIES.find(p => p.code === retraitPays) ?? PAYOUT_COUNTRIES[0];

  const handlePaysChange = (code: string) => {
    const country = PAYOUT_COUNTRIES.find(p => p.code === code) ?? PAYOUT_COUNTRIES[0];
    setRetraitPays(code);
    setRetraitReseau(country.networks[0]);
  };

  // ── Retrait ─────────────────────────────────────────────────────────────────
  const handleRetrait = async () => {
    const amount = Number(retraitAmount);
    setRetraitError("");

    if (!amount || amount < MONTANT_MIN_RETRAIT) {
      setRetraitError(`Montant minimum : ${fmtXOF(MONTANT_MIN_RETRAIT)}`);
      return;
    }
    if (amount > solde) {
      setRetraitError("Solde insuffisant.");
      return;
    }
    if (!retraitNumero || !retraitNom) {
      setRetraitError("Veuillez remplir tous les champs.");
      return;
    }

    setRetraitStep("confirming");
    try {
      // ✅ FIX : on stocke les infos de paiement dans note_admin (string)
      // au lieu de details_paiement (colonne inexistante)
      const noteText = `Nom: ${retraitNom} | Pays: ${retraitPays} | Réseau: ${retraitReseau} | Numéro: ${retraitNumero}`;

      const { error } = await (supabase as any).from("mlm_withdrawals").insert({
        user_id:    user!.id,
        amount,
        currency:   "XOF",
        methode:    "mobile_money",
        note_admin: noteText,   // ← stocké ici, lisible par l'admin
        status:     "pending",
      });

      if (error) throw error;

      // Déduire du solde
      await (supabase as any)
        .from("nexora_users")
        .update({ solde_commissions: Math.max(0, solde - amount) })
        .eq("id", user!.id);

      setSolde(prev => Math.max(0, prev - amount));

      // Compte à rebours 10 min
      setRetraitStep("pending");
      setPayoutCountdown(600);
      const interval = setInterval(() => {
        setPayoutCountdown(prev => {
          if (prev <= 1) { clearInterval(interval); setRetraitStep("done"); return 0; }
          return prev - 1;
        });
      }, 1000);

      await loadData();
    } catch (err: any) {
      setRetraitError(err?.message || "Erreur lors de la demande.");
      setRetraitStep("error");
    }
  };

  const resetRetrait = () => {
    setShowRetrait(false);
    setRetraitStep("form");
    setRetraitAmount("");
    setRetraitNom("");
    setRetraitPays(PAYOUT_COUNTRIES[0].code);
    setRetraitReseau(PAYOUT_COUNTRIES[0].networks[0]);
    setRetraitNumero("");
    setRetraitError("");
  };

  const fmtCountdown = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" /> Mes Gains MLM
            </h1>
            <p className="text-sm text-muted-foreground">
              {commissions.length} commission{commissions.length > 1 ? "s" : ""} • {bonus.length} bonus
            </p>
          </div>
        </div>

        {/* Solde + bouton retrait */}
        <div
          className="relative overflow-hidden rounded-3xl p-5 text-white"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="w-4 h-4 opacity-80" />
                <p className="text-sm font-semibold opacity-80">Solde disponible</p>
              </div>
              <p className="text-3xl font-black">{fmtXOF(solde)}</p>
              {solde < MONTANT_MIN_RETRAIT && (
                <p className="text-xs opacity-60 mt-1">Min. retrait : {fmtXOF(MONTANT_MIN_RETRAIT)}</p>
              )}
            </div>
            {solde >= MONTANT_MIN_RETRAIT && (
              <button
                onClick={() => { setShowRetrait(true); setRetraitStep("form"); }}
                className="flex-shrink-0 flex items-center gap-2 bg-white text-primary font-black rounded-2xl px-4 py-2.5 hover:bg-white/90 transition-all shadow-lg text-sm"
              >
                <ArrowDownToLine className="w-4 h-4" />
                Retirer
              </button>
            )}
          </div>
          <div className="absolute right-0 bottom-0 w-28 h-28 rounded-full bg-white/5 -translate-x-4 translate-y-4" />
        </div>

        {/* Résumé */}
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-400" />
              <p className="text-xs font-bold text-muted-foreground">Abonnements</p>
            </div>
            <p className="text-xl font-black">{fmtXOF(typeStats.subscription)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <p className="text-xs font-bold text-muted-foreground">Formations</p>
            </div>
            <p className="text-xl font-black">{fmtXOF(typeStats.formation)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Gift className="w-4 h-4 text-emerald-400" />
              <p className="text-xs font-bold text-muted-foreground">Bonus</p>
            </div>
            <p className="text-xl font-black">{fmtXOF(totalBonus)}</p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-2 flex-wrap">
          {([
            { key: "commissions" as MainTab, label: "Commissions", icon: <DollarSign className="w-3.5 h-3.5" /> },
            { key: "bonus"       as MainTab, label: "Bonus",       icon: <Gift className="w-3.5 h-3.5" /> },
            { key: "retraits"    as MainTab, label: "Retraits",    icon: <ArrowDownToLine className="w-3.5 h-3.5" /> },
          ]).map(t => (
            <button key={t.key} onClick={() => setMainTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${mainTab === t.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ── Commissions ── */}
        {mainTab === "commissions" && (
          <>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 h-9">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select value={filterType} onChange={e => setFilterType(e.target.value)}
                  className="bg-transparent text-sm font-medium outline-none cursor-pointer">
                  <option value="all">Tous types</option>
                  <option value="subscription">Abonnement</option>
                  <option value="formation">Formation</option>
                </select>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </div>
              <div className="flex items-center gap-1 bg-card border border-border rounded-xl px-3 h-9">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                  className="bg-transparent text-sm font-medium outline-none cursor-pointer">
                  <option value="all">Tous niveaux</option>
                  <option value="0">Affilié direct</option>
                  <option value="1">Niveau 1</option>
                  <option value="3">Niveau 3</option>
                </select>
                <ChevronDown className="w-3 h-3 text-muted-foreground" />
              </div>
              {(filterType !== "all" || filterLevel !== "all") && (
                <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 rounded-xl px-3 h-9 text-sm font-bold text-primary">
                  <TrendingUp className="w-3.5 h-3.5" />
                  {fmtXOF(totalFiltered)} filtrés
                </div>
              )}
            </div>

            {filtered.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">Aucune commission</p>
                <p className="text-sm mt-1">Parrainez des membres ou vendez des formations pour gagner</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map((c) => (
                  <div key={c.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${c.type === "subscription" ? "bg-blue-400/10" : "bg-amber-400/10"}`}>
                      {c.type === "subscription"
                        ? <Users className="w-4 h-4 text-blue-400" />
                        : <BookOpen className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-sm">{getCommissionTypeLabel(c.type)}</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getLevelColor(c.level)}`}>
                          {getLevelLabel(c.level)}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.status === "credited" || c.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                          {c.status === "credited" || c.status === "confirmed" ? "Crédité" : c.status}
                        </span>
                      </div>
                      {c.from_user && (
                        <p className="text-xs text-muted-foreground">
                          De : {(c.from_user as any).nom_prenom} (@{(c.from_user as any).username})
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </div>
                    <p className="font-black text-emerald-400 text-sm whitespace-nowrap">+{fmtXOF(c.amount)}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Bonus ── */}
        {mainTab === "bonus" && (
          <div className="space-y-2">
            {bonus.length === 0 ? (
              <div className="text-center py-14 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-semibold">Aucun bonus</p>
                <p className="text-sm mt-1">Les bonus de parrainage, rang et challenge apparaîtront ici</p>
              </div>
            ) : bonus.map(b => (
              <div key={b.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center flex-shrink-0">
                  <Gift className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm capitalize">{b.type_bonus}</p>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.status === "confirmed" ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                      {b.status === "confirmed" ? "Confirmé" : b.status}
                    </span>
                  </div>
                  {b.description && <p className="text-xs text-muted-foreground">{b.description}</p>}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    {new Date(b.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </div>
                </div>
                <p className="font-black text-amber-400 text-sm whitespace-nowrap">+{fmtXOF(b.montant)}</p>
              </div>
            ))}
          </div>
        )}

        {/* ── Retraits ── */}
        {mainTab === "retraits" && (
          <div className="space-y-3">
            {solde >= MONTANT_MIN_RETRAIT && (
              <button
                onClick={() => { setShowRetrait(true); setRetraitStep("form"); }}
                className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold rounded-2xl p-3.5 hover:bg-primary/90 transition-colors shadow-md"
              >
                <ArrowDownToLine className="w-5 h-5" />
                Nouvelle demande de retrait — {fmtXOF(solde)} disponible
              </button>
            )}
            {withdrawals.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <ArrowDownToLine className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Aucun retrait effectué</p>
              </div>
            ) : withdrawals.map(w => (
              <div key={w.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${getWdStatusColor(w.status)}`}>
                  {w.status === "paid"     ? <CheckCircle className="w-5 h-5" /> :
                   w.status === "rejected" ? <AlertCircle className="w-5 h-5" /> :
                   <Clock className="w-5 h-5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm capitalize">{w.methode.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  {w.note_admin && <p className="text-xs text-muted-foreground italic truncate">{w.note_admin}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-black text-foreground text-sm">{fmtXOF(w.amount)}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getWdStatusColor(w.status)}`}>
                    {getWdStatusLabel(w.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Modal Retrait
      ══════════════════════════════════════════════════════════════════════ */}
      {showRetrait && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

            {/* ── Header modal — TOUJOURS VISIBLE ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-2">
                <ArrowDownToLine className="w-5 h-5 text-primary flex-shrink-0" />
                <h2 className="font-black text-base leading-tight">Demande de retrait</h2>
              </div>
              {/* ✅ FIX : bouton X toujours visible (retiré la condition retraitStep !== "confirming") */}
              <button
                onClick={resetRetrait}
                className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 flex-shrink-0 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ── Body scrollable ── */}
            <div className="overflow-y-auto flex-1 p-5">

              {/* ── Formulaire ── */}
              {retraitStep === "form" && (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-4 text-center">
                    <p className="text-xs text-muted-foreground mb-1">Solde disponible</p>
                    <p className="text-2xl font-black text-primary">{fmtXOF(solde)}</p>
                  </div>

                  {/* Montant */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Montant à retirer (XOF) — Min. {fmtXOF(MONTANT_MIN_RETRAIT)}
                    </label>
                    <div className="relative">
                      <input
                        type="number" value={retraitAmount}
                        onChange={e => setRetraitAmount(e.target.value)}
                        placeholder={`Minimum ${MONTANT_MIN_RETRAIT.toLocaleString("fr-FR")}`}
                        className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <button onClick={() => setRetraitAmount(String(solde))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-primary font-bold hover:underline">
                        MAX
                      </button>
                    </div>
                    {retraitAmount && Number(retraitAmount) >= MONTANT_MIN_RETRAIT && (
                      <p className="text-xs text-muted-foreground mt-1">≈ {fmtXOF(Number(retraitAmount))}</p>
                    )}
                  </div>

                  {/* Nom bénéficiaire */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Nom du destinataire
                    </label>
                    <input type="text" value={retraitNom}
                      onChange={e => setRetraitNom(e.target.value)}
                      placeholder="Nom complet du bénéficiaire"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {/* Pays */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Pays
                    </label>
                    <select value={retraitPays} onChange={e => handlePaysChange(e.target.value)}
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm font-medium outline-none">
                      {PAYOUT_COUNTRIES.map(p => (
                        <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Réseau Mobile Money */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Réseau Mobile Money
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedCountry.networks.map(net => (
                        <button key={net} type="button"
                          onClick={() => setRetraitReseau(net)}
                          className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-all text-left ${retraitReseau === net ? "bg-primary/10 border-primary text-primary" : "bg-muted border-border text-muted-foreground hover:border-primary/40"}`}>
                          📱 {net}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Numéro */}
                  <div>
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                      Numéro {retraitReseau}
                    </label>
                    <input type="tel" value={retraitNumero}
                      onChange={e => setRetraitNumero(e.target.value)}
                      placeholder="Ex: 07 XX XX XX XX"
                      className="w-full bg-muted border border-border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  {retraitError && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-3 text-sm text-destructive font-semibold">
                      ⚠️ {retraitError}
                    </div>
                  )}

                  <button onClick={handleRetrait}
                    disabled={!retraitAmount || Number(retraitAmount) < MONTANT_MIN_RETRAIT || !retraitNom || !retraitNumero}
                    className="w-full bg-primary text-primary-foreground font-black py-3.5 rounded-2xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Retirer mes gains
                  </button>

                  <p className="text-xs text-center text-muted-foreground">
                    ⏳ Retrait en attente — Minimum 24h pour la validation
                  </p>
                </div>
              )}

              {/* ── Traitement ── */}
              {retraitStep === "confirming" && (
                <div className="text-center py-8">
                  <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
                  <p className="font-bold">Soumission en cours…</p>
                </div>
              )}

              {/* ── En attente ── */}
              {retraitStep === "pending" && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-amber-400/10 flex items-center justify-center mx-auto">
                    <Clock className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-black">Demande soumise !</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre retrait de <strong>{fmtXOF(Number(retraitAmount))}</strong> via <strong>{retraitReseau}</strong> est en cours de validation.
                  </p>
                  <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-4">
                    <p className="text-xs text-muted-foreground mb-1">Validation du payout dans</p>
                    <p className="text-4xl font-black text-amber-400 font-mono">{fmtCountdown(payoutCountdown)}</p>
                    <p className="text-xs text-muted-foreground mt-1">Le système confirme automatiquement après 10 min</p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-3 text-left space-y-1 text-xs text-muted-foreground">
                    <p>📱 Réseau : <strong className="text-foreground">{retraitReseau}</strong></p>
                    <p>📞 Numéro : <strong className="text-foreground">{retraitNumero}</strong></p>
                    <p>👤 Bénéficiaire : <strong className="text-foreground">{retraitNom}</strong></p>
                    <p>⏰ Paiement effectif : <strong className="text-foreground">sous 24h minimum</strong></p>
                  </div>
                  <button onClick={resetRetrait}
                    className="w-full bg-muted text-foreground font-bold py-3 rounded-2xl hover:bg-muted/80">
                    Fermer
                  </button>
                </div>
              )}

              {/* ── Succès ── */}
              {retraitStep === "done" && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="text-lg font-black">Payout validé ✅</h3>
                  <p className="text-sm text-muted-foreground">
                    Le système a validé votre demande de <strong>{fmtXOF(Number(retraitAmount))}</strong>.<br/>
                    Le paiement sera effectué sous 24h sur <strong>{retraitReseau}</strong>.
                  </p>
                  <button onClick={resetRetrait}
                    className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-2xl mt-2 hover:bg-primary/90">
                    Fermer
                  </button>
                </div>
              )}

              {/* ── Erreur ── */}
              {retraitStep === "error" && (
                <div className="text-center py-6 space-y-3">
                  <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-8 h-8 text-destructive" />
                  </div>
                  <h3 className="text-lg font-black text-destructive">Échec</h3>
                  <p className="text-sm text-muted-foreground">{retraitError}</p>
                  <button onClick={() => setRetraitStep("form")}
                    className="w-full bg-muted text-foreground font-bold py-3 rounded-2xl hover:bg-muted/80">
                    Réessayer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
