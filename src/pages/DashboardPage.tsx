/**
 * NEXORA Dashboard — Nouvelle version
 * Sans MLM/affiliation — Couleur bleu (#305CDE) — Pas de transparence
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Wallet, BookOpen, TrendingUp, ChevronRight,
  ArrowUpRight, Zap, Crown, RefreshCw, Globe,
  ShoppingBag, Link2, Home, Send, ChevronDown,
  ArrowDownRight, Calendar, Sparkles, CreditCard, Receipt,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useDevise, DEVISES_LISTE, DeviseCode } from "@/lib/devise-context";

interface DashStats {
  soldeTransfert: number;
  gainsJour: number;
  ventesCount: number;
  revenusBoutique: number;
  paylinksActifs: number;
  formationsAchetees: number;
  recentActivity: ActivityItem[];
  premiumExpiresAt: string | null;
}

interface ActivityItem {
  id: string;
  type: "vente" | "paylink" | "transfert_recu" | "transfert_envoye" | "formation";
  label: string;
  sublabel: string;
  montant: number;
  signe: "+" | "-";
  date: string;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Bonne nuit";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

function timeAgo(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 2)   return "à l'instant";
  if (mins < 60)  return `il y a ${mins} min`;
  if (hours < 24) return `il y a ${hours}h`;
  if (days === 1) return "hier";
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function daysLeft(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
}

function getPlanLabel(plan: string | undefined): string {
  if (plan === "roi")   return "Roi";
  if (plan === "boss")  return "Boss";
  if (plan === "admin") return "Admin";
  return "Gratuit";
}

function LoadingSpinner() {
  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "#305CDE20" }} />
          <div className="absolute inset-0 rounded-full border-t-2 animate-spin" style={{ borderTopColor: "#305CDE" }} />
        </div>
        <p className="text-sm text-muted-foreground">Chargement...</p>
      </div>
    </AppLayout>
  );
}

export default function DashboardPage() {
  const user = getNexoraUser();
  const [stats, setStats] = useState<DashStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { devise, setDevise, fmtXOF, ratesLoading, ratesFresh, lastUpdated } = useDevise();
  const [deviseOpen, setDeviseOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadStats();

    // ── Écoute en temps réel les changements de solde ──────────────────────
    const channel = (supabase as any)
      .channel("solde-transfert-live")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "nexora_transfert_comptes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: any) => {
          const nouveauSolde = payload.new?.solde;
          if (nouveauSolde !== undefined) {
            setStats(prev => prev ? { ...prev, soldeTransfert: nouveauSolde } : prev);
          }
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  const loadStats = async () => {
    setLoading(true);
    const uid = user!.id;

    const { data: compteData } = await (supabase as any)
      .from("nexora_transfert_comptes").select("solde").eq("user_id", uid).maybeSingle();
    const soldeTransfert: number = compteData?.solde ?? 0;

    const debutMois = new Date();
    debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);

    const { data: boutiqueData } = await (supabase as any)
      .from("boutiques").select("id").eq("user_id", uid).maybeSingle();

    let ventesCount = 0, revenusBoutique = 0;
    if (boutiqueData?.id) {
      const { data: cmds } = await (supabase as any)
        .from("commandes").select("total, created_at, client_nom")
        .eq("boutique_id", boutiqueData.id)
        .gte("created_at", debutMois.toISOString())
        .order("created_at", { ascending: false });
      ventesCount = (cmds || []).length;
      revenusBoutique = (cmds || []).reduce((s: number, c: any) => s + (c.total ?? 0), 0);
    }

    const { data: plData } = await (supabase as any)
      .from("nexora_paylinks").select("id").eq("user_id", uid).eq("statut", "actif");
    const paylinksActifs: number = (plData || []).length;

    const { data: fData } = await (supabase as any)
      .from("formation_achats").select("id").eq("user_id", uid);
    const formationsAchetees: number = (fData || []).length;

    const today = new Date().toDateString();
    const { data: tRecus } = await (supabase as any)
      .from("internal_transfers").select("id, amount, created_at, note")
      .eq("receiver_id", uid).order("created_at", { ascending: false }).limit(5);
    const { data: tEnvoyes } = await (supabase as any)
      .from("internal_transfers").select("id, amount, created_at, note")
      .eq("sender_id", uid).order("created_at", { ascending: false }).limit(5);

    const gainsJour = (tRecus || [])
      .filter((t: any) => new Date(t.created_at).toDateString() === today)
      .reduce((s: number, t: any) => s + t.amount, 0);

    const { data: premiumData } = await (supabase as any)
      .from("nexora_users").select("premium_expires_at").eq("id", uid).maybeSingle();

    const activity: ActivityItem[] = [];

    if (boutiqueData?.id) {
      const { data: recentVentes } = await (supabase as any)
        .from("commandes").select("id, total, created_at, client_nom")
        .eq("boutique_id", boutiqueData.id)
        .order("created_at", { ascending: false }).limit(3);
      (recentVentes || []).forEach((v: any) => {
        activity.push({
          id: `v-${v.id}`, type: "vente",
          label: v.client_nom ? `Vente — ${v.client_nom}` : "Nouvelle commande",
          sublabel: `Boutique · ${timeAgo(v.created_at)}`,
          montant: v.total ?? 0, signe: "+", date: v.created_at,
        });
      });
    }

    (tRecus || []).slice(0, 3).forEach((t: any) => {
      activity.push({
        id: `r-${t.id}`, type: "transfert_recu", label: "Transfert reçu",
        sublabel: `Nexora Pay · ${timeAgo(t.created_at)}`,
        montant: t.amount, signe: "+", date: t.created_at,
      });
    });

    (tEnvoyes || []).slice(0, 2).forEach((t: any) => {
      activity.push({
        id: `e-${t.id}`, type: "transfert_envoye",
        label: t.note ? `Transfert — ${t.note}` : "Transfert envoyé",
        sublabel: `Nexora Pay · ${timeAgo(t.created_at)}`,
        montant: t.amount, signe: "-", date: t.created_at,
      });
    });

    activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setStats({
      soldeTransfert, gainsJour,
      ventesCount, revenusBoutique, paylinksActifs, formationsAchetees,
      recentActivity: activity.slice(0, 5),
      premiumExpiresAt: premiumData?.premium_expires_at ?? null,
    });
    setLoading(false);
  };

  if (loading || !stats) return <LoadingSpinner />;

  const prenom        = user?.nom_prenom?.split(" ")[0] || "Vous";
  const plan          = getPlanLabel(user?.plan);
  const isPremium     = user?.plan !== "gratuit" || user?.is_admin === true;
  const joursRestants = daysLeft(stats.premiumExpiresAt);
  const progressPct   = joursRestants != null ? Math.min(100, Math.round((joursRestants / 30) * 100)) : 0;

  // Couleur primaire — bleu électrique, pas de violet
  const BLUE = "#305CDE";
  const BLUE_DARK = "#1e3fa8";

  const activityMeta = (type: ActivityItem["type"]) => ({
    vente:            { bg: "#00800015", color: "#008000", Icon: TrendingUp },
    paylink:          { bg: "#305CDE15", color: "#305CDE", Icon: Link2 },
    transfert_recu:   { bg: "#305CDE15", color: "#305CDE", Icon: ArrowDownRight },
    transfert_envoye: { bg: "#64748b15", color: "#94a3b8", Icon: Send },
    formation:        { bg: "#f59e0b15", color: "#f59e0b", Icon: BookOpen },
  }[type]);

  return (
    <AppLayout>
      <style>{`
        @keyframes fade-up {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .fi1{animation:fade-up .35s ease both}
        .fi2{animation:fade-up .35s .07s ease both}
        .fi3{animation:fade-up .35s .14s ease both}
        .fi4{animation:fade-up .35s .21s ease both}
        .fi5{animation:fade-up .35s .28s ease both}
        .fi6{animation:fade-up .35s .35s ease both}
        .cl{transition:transform .15s ease}
        .cl:hover{transform:translateY(-2px)}
      `}</style>

      <div className="max-w-2xl mx-auto space-y-5 pb-12 px-1">

        {/* ── HEADER ── */}
        <div className="fi1 flex items-center justify-between pt-1 relative z-[1]">
          <div>
            <p className="text-xs text-muted-foreground font-medium tracking-wide">{getGreeting()},</p>
            <h1 className="text-xl font-black text-foreground flex items-center gap-2 mt-0.5">
              {prenom}
              {isPremium && (
                <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
                  style={{ background:"#f59e0b18", color:"#f59e0b", border:"1px solid #f59e0b35" }}>
                  <Crown className="w-3 h-3" />{plan}
                </span>
              )}
            </h1>
          </div>

          {/* Sélecteur devise */}
          <div className="relative">
            <button onClick={() => setDeviseOpen(!deviseOpen)}
              className="flex items-center gap-2 rounded-2xl px-3 py-2 border transition-all shadow-sm"
              style={{ background:"var(--card)", borderColor: deviseOpen ? BLUE : "var(--border)" }}>
              <Globe className="w-3.5 h-3.5" style={{ color: BLUE }} />
              <span className="text-xs font-black text-foreground">{devise}</span>
              {ratesLoading
                ? <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin" />
                : <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${deviseOpen ? "rotate-180" : ""}`} />}
            </button>
            {deviseOpen && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setDeviseOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border shadow-2xl z-[70] overflow-hidden"
                  style={{ background:"#FFFFFF", borderColor:"#E2E8F0" }}>
                  <div className="p-3 border-b border-slate-100">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Choisir la devise</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {ratesFresh && lastUpdated
                        ? `Live · ${lastUpdated.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })}`
                        : "Taux de change Nexora"}
                    </p>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                    {DEVISES_LISTE.map(d => (
                      <button key={d.code}
                        onClick={() => { setDevise(d.code as DeviseCode); setDeviseOpen(false); }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition-colors">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black flex-shrink-0"
                          style={{ background: d.code===devise ? BLUE : "#F1F5F9", color: d.code===devise ? "#FFF" : "#64748B" }}>
                          {d.symbole.slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900">{d.code}</p>
                          <p className="text-[10px] text-slate-500 truncate">{d.label.split(" — ")[1]}</p>
                        </div>
                        {d.code === devise && <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: BLUE }} />}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── SOLDE HERO ── fond plein, pas de transparence ── */}
        <div className="fi2 relative rounded-3xl overflow-hidden cl"
          style={{ background:`linear-gradient(135deg, ${BLUE_DARK} 0%, ${BLUE} 60%, #5b7ee5 100%)`,
            boxShadow:`0 8px 32px -4px ${BLUE}55` }}>
          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background:"#ffffff25" }}>
                <Wallet className="w-3.5 h-3.5 text-white" />
              </div>
              <p className="text-xs font-bold text-white/80 uppercase tracking-widest">Solde Nexora Pay</p>
            </div>

            <p className="text-5xl font-black tracking-tight leading-none text-white">
              {fmtXOF(stats.soldeTransfert)}
            </p>

            <div className="flex items-center gap-2 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full"
                style={{ background:"#ffffff25", color:"#fff" }}>
                <Globe className="w-3 h-3" /> {devise}
              </span>
            </div>

            {stats.gainsJour > 0 ? (
              <div className="flex items-center gap-2 mt-4 w-fit rounded-xl px-3 py-1.5"
                style={{ background:"#ffffff20" }}>
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                <p className="text-xs font-semibold text-white/80">Aujourd'hui :</p>
                <p className="text-sm font-black text-yellow-300">+{fmtXOF(stats.gainsJour)}</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4 w-fit rounded-xl px-3 py-1.5"
                style={{ background:"#ffffff15" }}>
                <Calendar className="w-3.5 h-3.5 text-white/60" />
                <p className="text-xs text-white/60">Aucun gain aujourd'hui</p>
              </div>
            )}

            <div className="flex gap-2 mt-5">
              <Link to="/transfert"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all text-white"
                style={{ background:"#ffffff25" }}>
                <Send className="w-3 h-3" /> Transférer
              </Link>
              <Link to="/boutique/portefeuille"
                className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-all text-white/80"
                style={{ background:"#ffffff12" }}>
                Portefeuille
              </Link>
            </div>
          </div>
        </div>

        {/* ── ACCÈS RAPIDE ── */}
        <div className="fi3">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-3">Accès rapide</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { to:"/mes-formations",    Icon:BookOpen,  color:"#305CDE", label:"Mes Formations",  sub:"Mes cours achetés"  },
              { to:"/formations",         Icon:ShoppingBag,color:"#f59e0b", label:"Formations",      sub:"Découvrir & acheter" },
              { to:"/boutique/factures",  Icon:Receipt,   color:"#6366f1", label:"Factures",         sub:"Gestion factures"   },
              { to:"/nexora-academy",     Icon:Sparkles,  color:"#a855f7", label:"Nexora Academy",   sub:"Contenu exclusif"   },
            ].map((item) => (
              <Link key={item.to} to={item.to}
                className="rounded-2xl p-4 cl flex flex-col gap-2"
                style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: item.color + "18" }}>
                  <item.Icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div>
                  <p className="text-sm font-black text-foreground">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── KPIs BOUTIQUE ── */}
        <div className="fi4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" /> Performance ce mois
            </p>
            <Link to="/boutique/performance" className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: BLUE }}>
              Détails <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label:"Ventes",   value:String(stats.ventesCount),     color:"#305CDE" },
              { label:"Revenus",  value:fmtXOF(stats.revenusBoutique), color:"#008000" },
              { label:"PayLinks", value:String(stats.paylinksActifs),  color:"#f59e0b" },
            ].map((k, i) => (
              <div key={i} className="rounded-2xl p-3"
                style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase mb-1 truncate">{k.label}</p>
                <p className="text-sm font-black leading-tight" style={{ color:k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── ACTIVITÉ RÉCENTE ── */}
        {stats.recentActivity.length > 0 && (
          <div className="fi5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" /> Activité récente
              </p>
              <Link to="/boutique/commandes" className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: BLUE }}>
                Voir tout <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="rounded-2xl overflow-hidden border divide-y"
              style={{ borderColor:"var(--border)", background:"var(--card)" }}>
              {stats.recentActivity.map((item) => {
                const { bg, color, Icon } = activityMeta(item.type);
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.label}</p>
                      <p className="text-[10px] text-muted-foreground">{item.sublabel}</p>
                    </div>
                    <p className={`text-xs font-black flex-shrink-0 ${item.signe === "+" ? "text-[#008000]" : "text-rose-400"}`}>
                      {item.signe}{fmtXOF(item.montant)}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ABONNEMENT ── */}
        <div className="fi6">
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 mb-3">
            <Crown className="w-3.5 h-3.5" /> Mon abonnement
          </p>
          <div className="rounded-2xl p-5 cl" style={{ background:"var(--card)", border:"1px solid var(--border)" }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-foreground">Plan {plan}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isPremium && joursRestants != null
                    ? joursRestants > 0
                      ? `${joursRestants} jour${joursRestants>1?"s":""} restant${joursRestants>1?"s":""}`
                      : "Expiré"
                    : isPremium ? "Actif" : "Passez au Premium"}
                </p>
              </div>
              <Link to="/abonnement"
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold"
                style={{ background:"#f59e0b15", color:"#f59e0b", border:"1px solid #f59e0b35" }}>
                {isPremium ? "Gérer" : "Upgrade"} <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            {isPremium && joursRestants != null && (
              <>
                <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background:"var(--muted)" }}>
                  <div className="h-full rounded-full"
                    style={{ width:`${progressPct}%`,
                      background: progressPct>40 ? "#008000" : progressPct>20 ? "#f59e0b" : "#ef4444" }} />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">{joursRestants} / 30 jours restants</p>
              </>
            )}
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
