/**
 * NEXORA Dashboard — Tableau de bord MLM
 * + Sélecteur devise global (convertit Transfert, PayLink, Historique, etc.)
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, Users, BookOpen, TrendingUp, DollarSign,
  ChevronRight, ArrowUpRight, Network, Calendar, Zap,
  Crown, Loader2, ChevronDown, RefreshCw, Globe, Leaf
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { formatMontant } from "@/lib/mlm-utils";
import { useDevise, DEVISES_LISTE, DeviseCode } from "@/lib/devise-context";

interface DashStats {
  solde: number;
  gainsAbonnement: number;
  gainsFormation: number;
  gainsJour: number;
  totalFilleuls: number;
  level1: number; level2: number; level3: number;
  totalVentes: number;
  totalAbonnementsGeneres: number;
  recentCommissions: any[];
}

const PRODUITS_COUNT = 17;

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5) return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export default function DashboardPage() {
  const user = getNexoraUser();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Devise ───────────────────────────────────────────────────────────────────
  const {
    devise, setDevise,
    fmtXOF, symbole,
    ratesLoading, ratesFresh, lastUpdated,
  } = useDevise();
  const [deviseOpen, setDeviseOpen] = useState(false);

  useEffect(() => { if (user) loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const { data: userData } = await (supabase as any)
      .from("nexora_users").select("solde_commissions").eq("id", user!.id).maybeSingle();

    const { data: commData } = await (supabase as any)
      .from("mlm_commissions")
      .select("amount, type, created_at, level, currency, from_user:from_user_id(nom_prenom, username)")
      .eq("to_user_id", user!.id)
      .order("created_at", { ascending: false });

    const comms = commData || [];
    const today = new Date().toDateString();
    const gainsJour = comms.filter((c: any) => new Date(c.created_at).toDateString() === today).reduce((s: number, c: any) => s + c.amount, 0);
    const gainsAbonnement = comms.filter((c: any) => c.type === "subscription").reduce((s: number, c: any) => s + c.amount, 0);
    const gainsFormation  = comms.filter((c: any) => c.type === "formation").reduce((s: number, c: any) => s + c.amount, 0);

    const { data: l1 } = await (supabase as any).from("nexora_users").select("id").eq("referrer_id", user!.id);
    const l1Ids = (l1 || []).map((m: any) => m.id);
    let l2Count = 0, l3Count = 0;
    if (l1Ids.length > 0) {
      const { data: l2 } = await (supabase as any).from("nexora_users").select("id").in("referrer_id", l1Ids);
      const l2Members = l2 || [];
      l2Count = l2Members.length;
      const l2Ids = l2Members.map((m: any) => m.id);
      if (l2Ids.length > 0) {
        const { data: l3 } = await (supabase as any).from("nexora_users").select("id").in("referrer_id", l2Ids);
        l3Count = (l3 || []).length;
      }
    }

    setStats({
      solde: userData?.solde_commissions || 0,
      gainsAbonnement, gainsFormation, gainsJour,
      totalFilleuls: l1Ids.length + l2Count + l3Count,
      level1: l1Ids.length, level2: l2Count, level3: l3Count,
      totalVentes: comms.filter((c: any) => c.type === "formation").length,
      totalAbonnementsGeneres: comms.filter((c: any) => c.type === "subscription").length,
      recentCommissions: comms.slice(0, 5),
    });
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const planLabel = user?.plan === "boss" ? "Boss" : user?.plan === "roi" ? "Roi" : null;
  const currentDevise = DEVISES_LISTE.find(d => d.code === devise);

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">

        {/* ── Header + sélecteur devise ───────────────────────────────────────── */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground">{getGreeting()},</p>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              {user?.nom_prenom?.split(" ")[0]}
              {planLabel && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-400 flex items-center gap-1">
                  <Crown className="w-3.5 h-3.5" />{planLabel}
                </span>
              )}
            </h1>
          </div>

          {/* Sélecteur de devise global */}
          <div className="relative">
            <button
              onClick={() => setDeviseOpen(!deviseOpen)}
              className="flex items-center gap-2 bg-card border border-border hover:border-primary/50 rounded-2xl px-4 py-2.5 transition-all shadow-sm"
            >
              <Globe className="w-4 h-4 text-primary" />
              <div className="text-left">
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Devise</p>
                <p className="text-sm font-black text-foreground leading-none">{devise} <span className="text-muted-foreground font-normal">{symbole}</span></p>
              </div>
              {ratesLoading
                ? <RefreshCw className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
                : <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${deviseOpen ? "rotate-180" : ""}`} />}
            </button>

            {deviseOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-2xl shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Choisir une devise</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {ratesFresh && lastUpdated
                      ? `Taux live • ${lastUpdated.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`
                      : "Taux de fallback"}
                  </p>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-border/30">
                  {DEVISES_LISTE.map(d => (
                    <button
                      key={d.code}
                      onClick={() => { setDevise(d.code as DeviseCode); setDeviseOpen(false); }}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors ${d.code === devise ? "bg-primary/10" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0 ${d.code === devise ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        {d.symbole.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{d.code}</p>
                        <p className="text-xs text-muted-foreground truncate">{d.label.split(" — ")[1]}</p>
                      </div>
                      {d.code === devise && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                <div className="p-3 border-t border-border bg-muted/30">
                  <p className="text-[10px] text-muted-foreground text-center">
                    🌍 S'applique à toutes les pages : Transfert, PayLink, Historique…
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Clique ailleurs pour fermer */}
        {deviseOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setDeviseOpen(false)} />
        )}

        {/* ── Gains du jour ──────────────────────────────────────────────────── */}
        {stats.gainsJour > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-400" />
              <p className="text-sm text-muted-foreground">Gains aujourd'hui</p>
            </div>
            <p className="text-xl font-black text-emerald-400">+{fmtXOF(stats.gainsJour)}</p>
          </div>
        )}

        {/* ── Solde hero ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl p-6 text-white"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 opacity-80" />
              <p className="text-sm font-semibold opacity-80">Solde des commissions</p>
              <span className="text-xs opacity-60 bg-white/10 px-2 py-0.5 rounded-full">{devise}</span>
            </div>
            <p className="text-4xl font-black">{fmtXOF(stats.solde)}</p>
            <div className="flex gap-3 mt-3">
              <Link to="/commissions"
                className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors">
                Voir commissions <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
          <div className="absolute right-0 bottom-0 w-32 h-32 rounded-full bg-white/5 -translate-x-4 translate-y-4" />
        </div>

        {/* ── Revenus ────────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" /> Revenus <span className="font-normal normal-case text-muted-foreground/60">({devise})</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total", value: stats.solde,            color: "text-foreground",    icon: <Wallet className="w-4 h-4 text-primary" /> },
              { label: "Abonnements", value: stats.gainsAbonnement, color: "text-blue-400",     icon: <Users className="w-4 h-4 text-blue-400" /> },
              { label: "Formations", value: stats.gainsFormation,  color: "text-amber-400",    icon: <BookOpen className="w-4 h-4 text-amber-400" /> },
              { label: "Aujourd'hui", value: stats.gainsJour,      color: "text-emerald-400",  icon: <Calendar className="w-4 h-4 text-emerald-400" /> },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">{s.icon}
                  <p className="text-xs text-muted-foreground font-semibold">{s.label}</p>
                </div>
                <p className={`text-xl font-black ${s.color}`}>{fmtXOF(s.value)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Réseau ─────────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
              <Network className="w-3.5 h-3.5" /> Mon Réseau
            </h2>
            <Link to="/reseau" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
              Voir tout <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Total membres", value: stats.totalFilleuls, color: "text-foreground" },
              { label: "Niveau 1 (30%)", value: stats.level1, color: "text-emerald-400" },
              { label: "Niveau 2 (10%)", value: stats.level2, color: "text-blue-400" },
              { label: "Niveau 3 (5%)",  value: stats.level3, color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-card border border-border rounded-2xl p-4 text-center">
                <p className={`text-3xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Activité ───────────────────────────────────────────────────────── */}
        <div>
          <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
            <Zap className="w-3.5 h-3.5" /> Activité
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{stats.totalVentes}</p>
                <p className="text-xs text-muted-foreground">Ventes formations</p>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-400/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{stats.totalAbonnementsGeneres}</p>
                <p className="text-xs text-muted-foreground">Abonnements générés</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Commissions récentes ───────────────────────────────────────────── */}
        {stats.recentCommissions.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5" /> Commissions récentes
              </h2>
              <Link to="/commissions" className="text-xs text-primary font-bold flex items-center gap-1 hover:underline">
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="bg-card border border-border rounded-2xl divide-y divide-border/50">
              {stats.recentCommissions.map((c: any) => (
                <div key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.type === "subscription" ? "bg-blue-400/10" : "bg-amber-400/10"}`}>
                      {c.type === "subscription" ? <Users className="w-4 h-4 text-blue-400" /> : <BookOpen className="w-4 h-4 text-amber-400" />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-foreground">
                        {c.type === "subscription" ? "Abonnement" : "Formation"}
                        <span className="text-xs text-muted-foreground font-normal ml-1">
                          {c.level === 0 ? "Affilié" : `Niv. ${c.level}`}
                        </span>
                      </p>
                      {c.from_user && <p className="text-xs text-muted-foreground">De : {c.from_user.nom_prenom}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-emerald-400 text-sm">+{fmtXOF(c.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Raccourcis ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: "/formations", icon: <BookOpen className="w-5 h-5 text-amber-400" />, bg: "bg-amber-400/10", label: "Formations", sub: "Acheter & revendre" },
            { to: "/reseau",     icon: <Network className="w-5 h-5 text-primary" />,    bg: "bg-primary/10",   label: "Mon Réseau",  sub: `${stats.totalFilleuls} membres` },
          ].map((item) => (
            <Link key={item.to} to={item.to}
              className="bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-primary/5 transition-all group flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center flex-shrink-0`}>{item.icon}</div>
              <div className="min-w-0">
                <p className="font-black text-sm text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.sub}</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>

        {/* ── BIEN-ÊTRE YUPI ─────────────────────────────────────────────── */}
        <div className="space-y-2">
          <Link
            to="/yupi-shop"
            className="group relative overflow-hidden rounded-3xl flex items-center gap-4 p-5 hover:opacity-95 transition-all shadow-lg"
            style={{ background: "linear-gradient(135deg, #0f172a 0%, #3730a3 40%, #059669 100%)" }}
          >
            <div className="absolute right-0 top-0 w-32 h-32 rounded-full bg-green-400/20 translate-x-8 -translate-y-8" />
            <div className="absolute right-10 bottom-0 w-20 h-20 rounded-full bg-yellow-400/10 translate-y-6" />
            <div className="relative z-10 w-12 h-12 rounded-2xl overflow-hidden border-2 border-white/20 flex-shrink-0 shadow">
              <img src="https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png" alt="BIEN-ÊTRE YUPI" className="w-full h-full object-cover" />
            </div>
            <div className="relative z-10 flex-1 min-w-0">
              <p className="font-black text-white text-base leading-tight">BIEN-ÊTRE YUPI 🌿</p>
              <p className="text-indigo-200 text-xs mt-0.5">{PRODUITS_COUNT} produits · Santé naturelle</p>
            </div>
            <ChevronRight className="relative z-10 w-5 h-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all flex-shrink-0" />
          </Link>

          {/* Lien public de la boutique — visible et copiable */}
          <div className="bg-card border border-green-500/30 rounded-2xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-4 h-4 text-green-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-muted-foreground mb-0.5">🔗 Lien public de votre boutique</p>
              <p className="text-xs font-mono text-green-500 truncate">{typeof window !== "undefined" ? window.location.origin : ""}/bien-etre-yupi</p>
            </div>
            <button
              onClick={() => {
                const url = `${window.location.origin}/bien-etre-yupi`;
                navigator.clipboard.writeText(url).then(() => alert("✅ Lien copié ! Partagez-le avec vos clients."));
              }}
              className="flex-shrink-0 text-xs bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-xl transition-colors"
            >
              Copier
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
