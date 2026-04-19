/**
 * NEXORA — AdminWalletManager
 * Composant à intégrer dans AdminPanelPage.tsx dans la fiche utilisateur.
 * Permet à l'admin de créditer / débiter chaque portefeuille d'un utilisateur.
 *
 * INTÉGRATION dans AdminPanelPage.tsx :
 *   1. import AdminWalletManager from "@/components/AdminWalletManager";
 *   2. Dans la fiche utilisateur (selectedUser), ajouter :
 *        <AdminWalletManager user={selectedUser} onDone={loadAll} />
 *
 * TABLES / RPC utilisées (créées par PORTEFEUILLES_ADMIN.sql) :
 *   - admin_adjust_transfert(p_user_id, p_montant, p_note)
 *   - admin_adjust_commissions(p_user_id, p_montant, p_note)
 *   - admin_adjust_bonus(p_user_id, p_montant, p_note)
 *   - admin_adjust_paylink(p_paylink_id, p_montant, p_user_id, p_note)
 *   - admin_wallet_adjustments (journal)
 *   - nexora_transfert_comptes (solde transfert)
 *   - nexora_users.solde_commissions
 *   - nexora_users.solde_bonus
 *   - paylinks (total_paid)
 */

import { useEffect, useState } from "react";
import {
  Wallet, ArrowUpCircle, ArrowDownCircle, RefreshCw,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
  Loader2, History, Link2, Users, Gift, ArrowRightLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ── Types ──────────────────────────────────────────────────────────────────

interface WalletBalance {
  transfert:    number;
  commissions:  number;
  bonus:        number;
  paylinks:     { id: string; title: string; total_paid: number }[];
}

interface AdjustmentLog {
  id: string;
  wallet_type: string;
  operation: string;
  amount: number;
  solde_avant: number;
  solde_apres: number;
  admin_note: string | null;
  created_at: string;
}

interface Props {
  user: { id: string; nom_prenom: string; username: string };
  onDone?: () => void;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString("fr-FR") + " FCFA";

const WALLET_META: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  transfert:   { label: "Transfert",   icon: ArrowRightLeft, color: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200"   },
  commissions: { label: "Commissions", icon: Users,          color: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200" },
  bonus:       { label: "Bonus",       icon: Gift,           color: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200"  },
  paylink:     { label: "PayLink",     icon: Link2,          color: "text-pink-700",   bg: "bg-pink-50",   border: "border-pink-200"   },
};

// ══════════════════════════════════════════════════════════════════════════════
export default function AdminWalletManager({ user, onDone }: Props) {
  const [balances,    setBalances]    = useState<WalletBalance | null>(null);
  const [logs,        setLogs]        = useState<AdjustmentLog[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [showLogs,    setShowLogs]    = useState(false);

  // Formulaire
  const [wallet,      setWallet]      = useState<string>("transfert");
  const [paylinkId,   setPaylinkId]   = useState<string>("");
  const [operation,   setOperation]   = useState<"credit" | "debit">("credit");
  const [amount,      setAmount]      = useState<string>("");
  const [note,        setNote]        = useState<string>("");
  const [saving,      setSaving]      = useState(false);
  const [result,      setResult]      = useState<{ ok: boolean; msg: string } | null>(null);

  // ── Chargement des soldes ──────────────────────────────────────────────

  const loadBalances = async () => {
    setLoading(true);
    try {
      const [
        { data: transfertData },
        { data: userData },
        { data: paylinksData },
        { data: logsData },
      ] = await Promise.all([
        (supabase as any).from("nexora_transfert_comptes")
          .select("solde").eq("user_id", user.id).maybeSingle(),
        (supabase as any).from("nexora_users")
          .select("solde_commissions, solde_bonus").eq("id", user.id).maybeSingle(),
        (supabase as any).from("paylinks")
          .select("id, title, total_paid").eq("user_id", user.id).order("created_at"),
        (supabase as any).from("admin_wallet_adjustments")
          .select("*").eq("user_id", user.id)
          .order("created_at", { ascending: false }).limit(30),
      ]);

      setBalances({
        transfert:   transfertData?.solde          ?? 0,
        commissions: userData?.solde_commissions   ?? 0,
        bonus:       userData?.solde_bonus         ?? 0,
        paylinks:    paylinksData                  ?? [],
      });
      setLogs(logsData ?? []);

      // Pré-sélectionner le premier paylink si wallet = paylink
      if (paylinksData?.length && !paylinkId) {
        setPaylinkId(paylinksData[0].id);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { loadBalances(); }, [user.id]);

  // ── Sélection du solde courant pour affichage ──────────────────────────

  const currentBalance = (() => {
    if (!balances) return 0;
    if (wallet === "transfert")   return balances.transfert;
    if (wallet === "commissions") return balances.commissions;
    if (wallet === "bonus")       return balances.bonus;
    if (wallet === "paylink") {
      const pl = balances.paylinks.find(p => p.id === paylinkId);
      return pl?.total_paid ?? 0;
    }
    return 0;
  })();

  // ── Soumission ─────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const amt = parseFloat(amount.replace(/\s/g, "").replace(",", "."));
    if (!amt || amt <= 0) {
      setResult({ ok: false, msg: "Montant invalide." });
      return;
    }
    if (wallet === "paylink" && !paylinkId) {
      setResult({ ok: false, msg: "Sélectionnez un PayLink." });
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      const signedAmount = operation === "credit" ? amt : -amt;
      let rpcName = "";
      let params: Record<string, any> = {};

      if (wallet === "transfert") {
        rpcName = "admin_adjust_transfert";
        params = { p_user_id: user.id, p_montant: signedAmount, p_note: note || null };
      } else if (wallet === "commissions") {
        rpcName = "admin_adjust_commissions";
        params = { p_user_id: user.id, p_montant: signedAmount, p_note: note || null };
      } else if (wallet === "bonus") {
        rpcName = "admin_adjust_bonus";
        params = { p_user_id: user.id, p_montant: signedAmount, p_note: note || null };
      } else if (wallet === "paylink") {
        rpcName = "admin_adjust_paylink";
        params = { p_paylink_id: paylinkId, p_montant: signedAmount, p_user_id: user.id, p_note: note || null };
      }

      const { data, error } = await (supabase as any).rpc(rpcName, params);

      if (error) throw error;

      const avant = data?.avant ?? 0;
      const apres = data?.apres ?? 0;
      const label = WALLET_META[wallet]?.label ?? wallet;
      setResult({
        ok: true,
        msg: `✅ ${operation === "credit" ? "Crédit" : "Débit"} de ${fmt(amt)} sur ${label}. Solde : ${fmt(avant)} → ${fmt(apres)}`,
      });
      setAmount("");
      setNote("");
      await loadBalances();
      onDone?.();

      // Envoyer une notification à l'utilisateur
      await (supabase as any).from("nexora_notifications").insert({
        user_id: user.id,
        titre: operation === "credit" ? `💰 Crédit sur votre portefeuille ${label}` : `📤 Débit sur votre portefeuille ${label}`,
        message: `${operation === "credit" ? "+" : "-"}${fmt(amt)}${note ? ` — ${note}` : ""}. Nouveau solde : ${fmt(apres)}.`,
        type: operation === "credit" ? "success" : "warning",
        lu: false,
      });

    } catch (err: any) {
      setResult({ ok: false, msg: `❌ Erreur : ${err.message ?? "inconnue"}` });
    }
    setSaving(false);
  };

  // ── Rendu ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Chargement des portefeuilles…
      </div>
    );
  }

  const selectedMeta = WALLET_META[wallet] ?? WALLET_META.transfert;
  const WalletIcon   = selectedMeta.icon;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">

      {/* ── Header ── */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        <Wallet className="w-4 h-4 text-primary" />
        <span className="font-bold text-sm uppercase tracking-wide text-muted-foreground">
          Gestion des Portefeuilles
        </span>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Grille des soldes ── */}
        <div className="grid grid-cols-2 gap-2">
          {/* Transfert */}
          <button
            onClick={() => setWallet("transfert")}
            className={`rounded-xl p-3 border text-left transition-all ${
              wallet === "transfert"
                ? "bg-blue-50 border-blue-400 shadow-sm"
                : "bg-muted border-border hover:border-blue-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
              <span className="text-xs text-muted-foreground font-medium">Transfert</span>
            </div>
            <div className="text-sm font-black text-blue-700">{fmt(balances?.transfert ?? 0)}</div>
          </button>

          {/* Commissions */}
          <button
            onClick={() => setWallet("commissions")}
            className={`rounded-xl p-3 border text-left transition-all ${
              wallet === "commissions"
                ? "bg-violet-50 border-violet-400 shadow-sm"
                : "bg-muted border-border hover:border-violet-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-xs text-muted-foreground font-medium">Commissions</span>
            </div>
            <div className="text-sm font-black text-violet-700">{fmt(balances?.commissions ?? 0)}</div>
          </button>

          {/* Bonus */}
          <button
            onClick={() => setWallet("bonus")}
            className={`rounded-xl p-3 border text-left transition-all ${
              wallet === "bonus"
                ? "bg-amber-50 border-amber-400 shadow-sm"
                : "bg-muted border-border hover:border-amber-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Gift className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs text-muted-foreground font-medium">Bonus</span>
            </div>
            <div className="text-sm font-black text-amber-700">{fmt(balances?.bonus ?? 0)}</div>
          </button>

          {/* PayLinks */}
          <button
            onClick={() => setWallet("paylink")}
            className={`rounded-xl p-3 border text-left transition-all ${
              wallet === "paylink"
                ? "bg-pink-50 border-pink-400 shadow-sm"
                : "bg-muted border-border hover:border-pink-300"
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Link2 className="w-3.5 h-3.5 text-pink-600" />
              <span className="text-xs text-muted-foreground font-medium">PayLinks</span>
            </div>
            <div className="text-sm font-black text-pink-700">
              {balances?.paylinks.length
                ? fmt(balances.paylinks.reduce((a, p) => a + p.total_paid, 0))
                : "Aucun"}
            </div>
          </button>
        </div>

        {/* ── Formulaire d'ajustement ── */}
        <div className={`rounded-xl border p-4 space-y-3 ${selectedMeta.bg} ${selectedMeta.border}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WalletIcon className={`w-4 h-4 ${selectedMeta.color}`} />
              <span className={`font-bold text-sm ${selectedMeta.color}`}>
                {selectedMeta.label}
              </span>
            </div>
            <div className={`text-xs font-black px-2 py-1 rounded-lg bg-white/70 ${selectedMeta.color}`}>
              Solde actuel : {fmt(currentBalance)}
            </div>
          </div>

          {/* Sélecteur PayLink */}
          {wallet === "paylink" && (
            <div>
              {balances?.paylinks.length ? (
                <select
                  value={paylinkId}
                  onChange={e => setPaylinkId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-input bg-white text-sm"
                >
                  {balances.paylinks.map(pl => (
                    <option key={pl.id} value={pl.id}>
                      {pl.title} — {fmt(pl.total_paid)}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Cet utilisateur n'a aucun PayLink.
                </p>
              )}
            </div>
          )}

          {/* Crédit / Débit toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setOperation("credit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                operation === "credit"
                  ? "bg-green-600 text-white shadow"
                  : "bg-white/60 text-green-700 hover:bg-white"
              }`}
            >
              <ArrowUpCircle className="w-4 h-4" />
              Créditer
            </button>
            <button
              onClick={() => setOperation("debit")}
              className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                operation === "debit"
                  ? "bg-red-600 text-white shadow"
                  : "bg-white/60 text-red-700 hover:bg-white"
              }`}
            >
              <ArrowDownCircle className="w-4 h-4" />
              Débiter
            </button>
          </div>

          {/* Montant */}
          <div className="relative">
            <input
              type="number"
              min="1"
              placeholder="Montant en FCFA"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full h-11 px-4 pr-16 rounded-lg border border-input bg-white text-sm font-semibold focus:outline-none focus:border-primary"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold">
              FCFA
            </span>
          </div>

          {/* Aperçu solde après */}
          {amount && parseFloat(amount) > 0 && (
            <div className="text-xs text-center font-medium bg-white/70 rounded-lg px-3 py-2">
              Solde après :{" "}
              <span className={`font-black ${operation === "credit" ? "text-green-700" : "text-red-700"}`}>
                {fmt(Math.max(0, currentBalance + (operation === "credit" ? 1 : -1) * parseFloat(amount)))}
              </span>
            </div>
          )}

          {/* Note */}
          <textarea
            placeholder="Note (optionnelle) — visible dans le journal et notifiée à l'utilisateur"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-input bg-white text-xs resize-none focus:outline-none focus:border-primary"
          />

          {/* Bouton confirmer */}
          <button
            onClick={handleSubmit}
            disabled={saving || !amount || (wallet === "paylink" && !paylinkId)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
              operation === "credit"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</>
            ) : (
              <>
                {operation === "credit"
                  ? <ArrowUpCircle className="w-4 h-4" />
                  : <ArrowDownCircle className="w-4 h-4" />}
                Confirmer le {operation === "credit" ? "crédit" : "débit"}
                {amount && parseFloat(amount) > 0 && ` de ${fmt(parseFloat(amount))}`}
              </>
            )}
          </button>

          {/* Résultat */}
          {result && (
            <div className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-xs font-medium ${
              result.ok
                ? "bg-green-100 border border-green-300 text-green-800"
                : "bg-red-100 border border-red-300 text-red-800"
            }`}>
              {result.ok
                ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                : <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
              <span>{result.msg}</span>
            </div>
          )}
        </div>

        {/* ── Journal des ajustements ── */}
        <button
          onClick={() => setShowLogs(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-muted hover:bg-muted/70 transition-colors text-sm font-semibold"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4 text-muted-foreground" />
            Journal des ajustements ({logs.length})
          </span>
          {showLogs ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showLogs && (
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Aucun ajustement enregistré.</p>
            ) : logs.map(log => {
              const meta = WALLET_META[log.wallet_type] ?? WALLET_META.transfert;
              const Icon = meta.icon;
              const isCredit = log.operation === "credit";
              return (
                <div key={log.id} className="flex items-center gap-3 bg-muted/60 rounded-xl px-3 py-2.5 text-xs">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">
                      {meta.label}
                      {log.admin_note && (
                        <span className="ml-1 font-normal text-muted-foreground">— {log.admin_note}</span>
                      )}
                    </div>
                    <div className="text-muted-foreground">
                      {fmt(log.solde_avant)} → {fmt(log.solde_apres)}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-0.5">
                    <div className={`font-black ${isCredit ? "text-green-600" : "text-red-600"}`}>
                      {isCredit ? "+" : "−"}{fmt(log.amount)}
                    </div>
                    <div className="text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString("fr-FR", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bouton refresh */}
        <button
          onClick={loadBalances}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Actualiser les soldes
        </button>
      </div>
    </div>
  );
}
