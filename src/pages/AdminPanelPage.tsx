import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AdminWalletManager from "@/components/AdminWalletManager";
import {
  Users, Crown, ShieldCheck, Ban, Activity, BarChart3,
  Store, RefreshCw, Search, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle,
  Trash2, Menu, X, ArrowLeft,
  UserCheck, UserX, Clock, Calendar, DollarSign,
  Unlock, BadgeCheck, Bell,
  Package, ShoppingCart, AlertOctagon,
  TrendingUp, Percent, Key, Lock,
  MinusCircle, ArrowRightLeft, Link2,
  BookOpen, GitBranch, Download, Eye,
  CreditCard, Wallet, BarChart2, Filter,
  ChevronRight, Globe, Zap, AlertCircle,
  Send, RefreshCcw, TrendingDown, Award
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import AdminPinManager from "@/components/AdminPinManager";

// ── Types ──────────────────────────────────────────────────
interface NexoraUser {
  id: string;
  nom_prenom: string;
  username: string;
  email: string;
  avatar_url: string | null;
  is_admin: boolean;
  plan: "gratuit" | "boss" | "roi" | "admin";
  badge_premium: boolean;
  is_active: boolean;
  status: "actif" | "suspendu" | "bloque";
  suspended_reason: string | null;
  blocked_reason: string | null;
  last_login: string | null;
  premium_since: string | null;
  premium_expires_at: string | null;
  created_at: string;
  dette_cachee?: number;
  dette_active?: boolean;
  admin_features?: string[];
  admin_password?: string | null;
  password_plain?: string | null;
  balance?: number;
  mlm_total_earned?: number;
  total_filleuls?: number;
  role?: string;
}

interface Boutique {
  id: string; nom: string; slug: string;
  description: string | null; actif: boolean;
  created_at: string; user_id: string;
  total_revenue?: number; total_visits?: number;
}

interface Produit {
  id: string; boutique_id: string; nom: string;
  description: string | null; prix: number;
  prix_promo: number | null; categorie: string | null;
  stock: number; stock_illimite: boolean; photos: any;
  actif: boolean; created_at: string; type?: string;
}

interface Commande {
  id: string; boutique_id: string; numero: string;
  client_nom: string; total: number; devise: string;
  statut: string; statut_paiement: string; created_at: string;
}

interface Abonnement {
  id: string; user_id: string | null; plan: string;
  montant: number; devise: string; statut: string;
  created_at: string; date_debut: string; date_fin: string | null;
}

interface PayLink {
  id: string; user_id: string; title: string;
  amount: number; devise: string; total_paid: number;
  total_tx: number; success_url: string | null;
  is_active: boolean; created_at: string;
}

interface Transaction {
  id: string; user_id: string; amount: number;
  frais: number; devise: string; type: string;
  status: string; created_at: string; reference?: string;
}

interface Withdrawal {
  id: string; user_id: string; amount: number;
  frais: number; devise: string; reseau?: string;
  telephone?: string; nom_beneficiaire?: string;
  status: string; admin_note?: string; created_at: string;
}

interface MlmRelation {
  id: string; user_id: string; referrer_id: string;
  level: number; created_at: string;
}

interface MlmEarning {
  id: string; user_id: string; amount: number;
  level: number; status: string; created_at: string;
}

interface Formation {
  id: string; user_id?: string; title: string;
  price: number; devise: string; is_active: boolean;
  total_sales: number; total_revenue: number; created_at: string;
}

interface FormationSale {
  id: string; user_id: string; formation_id: string;
  amount: number; devise: string; created_at: string;
}

interface TrafficStat {
  id: string; user_id?: string; shop_id?: string;
  visits: number; clicks: number;
  conversions?: number; date: string;
}

interface AdminNotif {
  id: string; type: string; titre: string;
  message?: string; user_id?: string;
  severity: string; lu: boolean; created_at: string;
}

type AdminTab = "stats" | "users" | "boutiques" | "paylinks" | "transactions" |
  "retraits" | "mlm" | "formations" | "trafic" | "abonnements" | "logs" | "notifs";

// ── Helpers ────────────────────────────────────────────────
const fmtDate = (d: string | null) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  : "—";
const fmtDatetime = (d: string | null) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";
const fmtMoney = (n: number | undefined | null, devise = "FCFA") =>
  `${(n || 0).toLocaleString("fr-FR")} ${devise}`;

const STATUS_CONFIG = {
  actif:    { label: "Actif",    color: "text-green-700",  bg: "bg-green-100",  icon: CheckCircle   },
  suspendu: { label: "Suspendu", color: "text-yellow-700", bg: "bg-yellow-100", icon: AlertTriangle },
  bloque:   { label: "Bloqué",   color: "text-red-700",    bg: "bg-red-100",    icon: XCircle       },
};
const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  gratuit: { label: "Gratuit", color: "text-gray-600",   bg: "bg-gray-100"   },
  boss:    { label: "Boss",    color: "text-blue-700",   bg: "bg-blue-100"   },
  roi:     { label: "Roi",     color: "text-violet-700", bg: "bg-violet-100" },
  admin:   { label: "Admin",   color: "text-amber-700",  bg: "bg-amber-100"  },
};
const TX_STATUS = {
  success: { label: "Succès",   color: "text-green-700",  bg: "bg-green-100"  },
  pending: { label: "En cours", color: "text-yellow-700", bg: "bg-yellow-100" },
  failed:  { label: "Échoué",   color: "text-red-700",    bg: "bg-red-100"    },
  refunded:{ label: "Remboursé",color: "text-blue-700",   bg: "bg-blue-100"   },
};
const WD_STATUS = {
  pending:    { label: "En attente",  color: "text-yellow-700", bg: "bg-yellow-100" },
  approved:   { label: "Approuvé",    color: "text-green-700",  bg: "bg-green-100"  },
  rejected:   { label: "Refusé",      color: "text-red-700",    bg: "bg-red-100"    },
  processing: { label: "Traitement",  color: "text-blue-700",   bg: "bg-blue-100"   },
};
const ALL_ADMIN_FEATURES = [
  { key: "stats",          label: "Statistiques générales"     },
  { key: "users_view",     label: "Voir les utilisateurs"      },
  { key: "users_edit",     label: "Modifier les utilisateurs"  },
  { key: "view_passwords", label: "Voir les mots de passe"     },
  { key: "boutiques",      label: "Gérer les boutiques"        },
  { key: "produits",       label: "Gérer les produits"         },
  { key: "abonnements",    label: "Voir les abonnements"       },
  { key: "logs",           label: "Voir les logs"              },
  { key: "transferts",     label: "Gestion transferts / dettes"},
  { key: "paylinks",       label: "Gérer PayLinks"             },
  { key: "formations",     label: "Gérer les Formations"       },
  { key: "mlm",            label: "Voir MLM"                   },
  { key: "retraits",       label: "Gérer les retraits"         },
];
const ADMIN_CODE = "ERIC";

// ══════════════════════════════════════════════════════════
export default function AdminPanelPage() {
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [codeInput, setCodeInput]             = useState("");
  const [codeError, setCodeError]             = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [tab, setTab] = useState<AdminTab>(() => {
    try { return (localStorage.getItem("admin_tab") as AdminTab) || "stats"; }
    catch { return "stats"; }
  });
  const [loading, setLoading] = useState(false);

  // ─── Data ───────────────────────────────────────────────
  const [users,          setUsers]          = useState<NexoraUser[]>([]);
  const [boutiques,      setBoutiques]      = useState<Boutique[]>([]);
  const [produits,       setProduits]       = useState<Produit[]>([]);
  const [commandes,      setCommandes]      = useState<Commande[]>([]);
  const [abonnements,    setAbonnements]    = useState<Abonnement[]>([]);
  const [logs,           setLogs]           = useState<any[]>([]);
  const [paylinks,       setPaylinks]       = useState<PayLink[]>([]);
  const [transactions,   setTransactions]   = useState<Transaction[]>([]);
  const [withdrawals,    setWithdrawals]    = useState<Withdrawal[]>([]);
  const [mlmCommissions, setMlmCommissions] = useState<any[]>([]);
  const [formations,     setFormations]     = useState<Formation[]>([]);
  const [formationSales, setFormationSales] = useState<FormationSale[]>([]);
  const [trafficStats,   setTrafficStats]   = useState<TrafficStat[]>([]);
  const [adminNotifs,    setAdminNotifs]    = useState<AdminNotif[]>([]);

  // ─── Stats aggregated ───────────────────────────────────
  const [stats, setStats] = useState({
    totalUsers: 0, premiumUsers: 0, gratuitUsers: 0, adminUsers: 0,
    activeUsers: 0, suspendedUsers: 0, blockedUsers: 0,
    totalBoutiques: 0, boutiquesActives: 0,
    totalProduits: 0, totalCommandes: 0, chiffreAffairesTotal: 0,
    newUsersToday: 0, newPremiumToday: 0,
    caAbonnements: 0, totalAbonnements: 0,
    revenusTransferts: 0, totalTransferts: 0,
    totalPaylinks: 0, caPaylinks: 0,
    totalTransactions: 0, caTransactions: 0,
    pendingWithdrawals: 0, totalWithdrawals: 0, totalWithdrawalAmount: 0,
    totalMlmEarnings: 0, totalFormationRevenue: 0, totalFormationSales: 0,
    totalVisits: 0, totalClicks: 0, unreadNotifs: 0,
  });

  // ─── Filters & UI ───────────────────────────────────────
  const [searchUser,       setSearchUser]       = useState("");
  const [filterPlan,       setFilterPlan]       = useState("");
  const [filterStatus,     setFilterStatus]     = useState("");
  const [searchBoutique,   setSearchBoutique]   = useState("");
  const [expandedBoutique, setExpandedBoutique] = useState<string | null>(null);
  const [filterTxType,     setFilterTxType]     = useState("");
  const [filterTxStatus,   setFilterTxStatus]   = useState("");
  const [filterWdStatus,   setFilterWdStatus]   = useState("");
  const [selectedMlmUser,  setSelectedMlmUser]  = useState<string | null>(null);
  const [expandedUser,     setExpandedUser]      = useState<string | null>(null);

  // ─── Action modal ───────────────────────────────────────
  const [actionModal,  setActionModal]  = useState<{ type: string; target: any; targetType: string } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [premiumDays,  setPremiumDays]  = useState("30");

  // ─── Detail user ────────────────────────────────────────
  const [selectedUser,     setSelectedUser]     = useState<NexoraUser | null>(null);
  const [adminFeatures,    setAdminFeatures]    = useState<string[]>([]);
  const [adminPassword,    setAdminPassword]    = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess,  setPasswordSuccess]  = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);
  const [userTxHistory,    setUserTxHistory]    = useState<any[]>([]);
  const [userTxLoading,    setUserTxLoading]    = useState(false);
  const [userTxTab,        setUserTxTab]        = useState<"all" | "recharges" | "transferts">("all");
  const [detteModal,       setDetteModal]       = useState<NexoraUser | null>(null);
  const [detteMontant,     setDetteMontant]     = useState("");

  // ─── Auth ────────────────────────────────────────────────
  useEffect(() => {
    try { const a = sessionStorage.getItem("nexora_admin_auth"); if (a === "true") setIsAuthenticated(true); } catch {}
  }, []);
  useEffect(() => { try { localStorage.setItem("admin_tab", tab); } catch {} }, [tab]);

  const handleLogin = () => {
    if (codeInput.trim().toUpperCase() === ADMIN_CODE) {
      try { sessionStorage.setItem("nexora_admin_auth", "true"); } catch {}
      setIsAuthenticated(true); setCodeError(false);
    } else { setCodeError(true); setCodeInput(""); }
  };

  // ─── Load All ────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const safe = async (fn: () => Promise<any>): Promise<any[]> => {
        try { const { data, error } = await fn(); if (error) return []; return data || []; }
        catch { return []; }
      };

      const [
        usersD, boutiquesD, produitsD, commandesD, abonnementsD,
        logsD, paylinksD, transactionsD, withdrawalsD,
        mlmCommD, _unused, formationsD, formSalesD, trafficD, adminNotifsD
      ] = await Promise.all([
        safe(() => (supabase.from("nexora_users") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("boutiques") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("produits") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("commandes") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("abonnements") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("nexora_logs") as any).select("*").order("created_at", { ascending: false }).limit(100)),
        safe(() => (supabase.from("paylinks") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("transactions") as any).select("*").order("created_at", { ascending: false }).limit(200)),
        safe(() => (supabase.from("withdrawals") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("mlm_commissions") as any).select("*").order("created_at", { ascending: false })),
        safe(() => Promise.resolve({ data: [], error: null })), // mlm_earnings remplacé par mlm_commissions
        safe(() => (supabase.from("formations") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("formation_sales") as any).select("*").order("created_at", { ascending: false })),
        safe(() => (supabase.from("traffic_stats") as any).select("*").order("date", { ascending: false }).limit(100)),
        safe(() => (supabase.from("admin_notifications") as any).select("*").order("created_at", { ascending: false }).limit(50)),
      ]);

      const u  = usersD        as NexoraUser[];
      const b  = boutiquesD    as Boutique[];
      const p  = produitsD     as Produit[];
      const c  = commandesD    as Commande[];
      const ab = abonnementsD  as Abonnement[];
      const pl = paylinksD     as PayLink[];
      const tx = transactionsD as Transaction[];
      const wd = withdrawalsD  as Withdrawal[];
      const mc = mlmCommD      as any[];
      const fo = formationsD   as Formation[];
      const fs = formSalesD    as FormationSale[];
      const tr = trafficD      as TrafficStat[];
      const an = adminNotifsD  as AdminNotif[];

      setUsers(u); setBoutiques(b); setProduits(p); setCommandes(c);
      setAbonnements(ab); setLogs(logsD); setPaylinks(pl);
      setTransactions(tx); setWithdrawals(wd); setMlmCommissions(mc);
      setFormations(fo); setFormationSales(fs);
      setTrafficStats(tr); setAdminNotifs(an);

      const today      = new Date().toDateString();
      const caComm     = c.reduce((a, x) => a + (Number(x.total) || 0), 0);
      const caAb       = ab.filter(a => a.statut === "actif" || a.statut === "paye").reduce((a, x) => a + (Number(x.montant) || 0), 0);
      const caPaylinks = pl.reduce((a, x) => a + (Number(x.total_paid) || 0), 0);
      const caTx       = tx.filter(x => x.status === "success").reduce((a, x) => a + (Number(x.amount) || 0), 0);
      const caFormSales= fs.reduce((a, x) => a + (Number(x.amount) || 0), 0);
      const totalMlm   = mc.filter(x => x.status === "credited").reduce((a, x) => a + (Number(x.amount) || 0), 0);
      const totalVis   = tr.reduce((a, x) => a + (Number(x.visits) || 0), 0);
      const totalCli   = tr.reduce((a, x) => a + (Number(x.clicks) || 0), 0);

      setStats({
        totalUsers: u.length,
        premiumUsers: u.filter(x => x.plan === "boss" || x.plan === "roi").length,
        gratuitUsers: u.filter(x => x.plan === "gratuit").length,
        adminUsers: u.filter(x => x.is_admin).length,
        activeUsers: u.filter(x => x.status === "actif").length,
        suspendedUsers: u.filter(x => x.status === "suspendu").length,
        blockedUsers: u.filter(x => x.status === "bloque").length,
        totalBoutiques: b.length,
        boutiquesActives: b.filter(x => x.actif).length,
        totalProduits: p.length,
        totalCommandes: c.length,
        chiffreAffairesTotal: caComm,
        newUsersToday: u.filter(x => new Date(x.created_at).toDateString() === today).length,
        newPremiumToday: u.filter(x => (x.plan === "boss" || x.plan === "roi") && x.premium_since && new Date(x.premium_since).toDateString() === today).length,
        caAbonnements: caAb, totalAbonnements: ab.length,
        revenusTransferts: 0, totalTransferts: 0,
        totalPaylinks: pl.length, caPaylinks,
        totalTransactions: tx.length, caTransactions: caTx,
        pendingWithdrawals: wd.filter(x => x.status === "pending").length,
        totalWithdrawals: wd.length,
        totalWithdrawalAmount: wd.filter(x => x.status === "approved").reduce((a, x) => a + (Number(x.amount) || 0), 0),
        totalMlmEarnings: totalMlm,
        totalFormationRevenue: caFormSales,
        totalFormationSales: fs.length,
        totalVisits: totalVis, totalClicks: totalCli,
        unreadNotifs: an.filter(x => !x.lu).length,
      });
    } catch (err) { console.error(err); toast({ title: "Erreur de chargement", variant: "destructive" }); }
    setLoading(false);
  }, [toast]);

  useEffect(() => { if (isAuthenticated) loadAll(); }, [isAuthenticated, loadAll]);

  // ─── Helpers ─────────────────────────────────────────────
  const logAction = async (userId: string | null, action: string, details: string | null) => {
    try { await supabase.from("nexora_logs" as any).insert({ user_id: userId, action, details }); } catch {}
  };
  const sendNotification = async (userId: string, titre: string, message: string, type = "warning") => {
    try { await supabase.from("nexora_notifications" as any).insert({ user_id: userId, titre, message, type, lu: false }); } catch {}
  };
  const pushAdminNotif = async (titre: string, message: string, severity = "info", type = "system") => {
    try { await supabase.from("admin_notifications" as any).insert({ titre, message, severity, type, lu: false }); } catch {}
  };

  const getBoutiquesByUser     = (id: string) => boutiques.filter(b => b.user_id === id);
  const getProduitsByBoutique  = (id: string) => produits.filter(p => p.boutique_id === id);
  const getCommandesByBoutique = (id: string) => commandes.filter(c => c.boutique_id === id);
  const getCaByBoutique        = (id: string) => getCommandesByBoutique(id).reduce((a, c) => a + (Number(c.total) || 0), 0);
  const getCommandesByUser     = (id: string) => getBoutiquesByUser(id).flatMap(b => getCommandesByBoutique(b.id));
  const getCaByUser            = (id: string) => getBoutiquesByUser(id).reduce((a, b) => a + getCaByBoutique(b.id), 0);
  const getUserById            = (id: string) => users.find(u => u.id === id);
  const getMlmFilleuls         = (id: string) => users.filter(u => (u as any).referrer_id === id);
  const getMlmEarningsByUser   = (id: string) => mlmCommissions.filter(c => c.to_user_id === id);
  const getPayLinksByUser      = (id: string) => paylinks.filter(p => p.user_id === id);
  const getFormationSalesByUser= (id: string) => formationSales.filter(f => f.user_id === id);
  const getWithdrawalsByUser   = (id: string) => withdrawals.filter(w => w.user_id === id);

  // ─── CSV Export ──────────────────────────────────────────
  const exportCSV = (data: any[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Actions ─────────────────────────────────────────────
  const openActionModal = (type: string, target: any, targetType: string) => {
    setActionReason(""); setPremiumDays("30");
    setActionModal({ type, target, targetType });
  };

  const handleWithdrawalAction = async (wd: Withdrawal, newStatus: "approved" | "rejected") => {
    try {
      await (supabase.from("withdrawals") as any).update({
        status: newStatus,
        processed_at: new Date().toISOString(),
        admin_note: actionReason || null,
      }).eq("id", wd.id);
      const user = getUserById(wd.user_id);
      if (user) {
        await sendNotification(wd.user_id,
          newStatus === "approved" ? "Retrait approuvé ✅" : "Retrait refusé ❌",
          newStatus === "approved"
            ? `Votre retrait de ${fmtMoney(wd.amount, wd.devise)} a été approuvé.`
            : `Votre retrait de ${fmtMoney(wd.amount, wd.devise)} a été refusé.${actionReason ? " Motif : " + actionReason : ""}`,
          newStatus === "approved" ? "success" : "danger"
        );
      }
      await logAction(wd.user_id, `retrait_${newStatus}`, `${fmtMoney(wd.amount, wd.devise)}`);
      toast({ title: newStatus === "approved" ? "Retrait approuvé" : "Retrait refusé" });
      setActionModal(null); setActionReason(""); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { type, target, targetType } = actionModal;
    try {
      if (targetType === "produit") {
        const boutique = boutiques.find(b => b.id === target.boutique_id);
        const userId   = boutique?.user_id;
        if (type === "supprimer_produit") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("variations_produit" as any).delete().eq("produit_id", target.id);
          await supabase.from("commandes" as any).update({ produit_id: null }).eq("produit_id", target.id);
          await supabase.from("avis_produits" as any).delete().eq("produit_id", target.id);
          await supabase.from("produits" as any).delete().eq("id", target.id);
          if (userId) await sendNotification(userId, "Produit supprimé", `"${target.nom}" supprimé. Motif : ${actionReason}`);
          await logAction(userId ?? null, "produit_supprimé", `${target.nom} | ${actionReason}`);
          toast({ title: "Produit supprimé" });
        }
        if (type === "restreindre_produit") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("produits" as any).update({ actif: false }).eq("id", target.id);
          if (userId) await sendNotification(userId, "Produit restreint", `"${target.nom}" restreint. Motif : ${actionReason}`, "danger");
          await logAction(userId ?? null, "produit_restreint", `${target.nom} | ${actionReason}`);
          toast({ title: "Produit restreint" });
        }
        if (type === "activer_produit") {
          await supabase.from("produits" as any).update({ actif: true }).eq("id", target.id);
          await logAction(null, "produit_activé", target.nom);
          toast({ title: "Produit réactivé" });
        }
      }

      if (targetType === "boutique" && type === "toggle_boutique") {
        const newActif = !target.actif;
        await supabase.from("boutiques" as any).update({ actif: newActif }).eq("id", target.id);
        if (target.user_id) await sendNotification(target.user_id,
          newActif ? "Boutique activée" : "Boutique désactivée",
          newActif ? `"${target.nom}" réactivée.` : `"${target.nom}" désactivée.${actionReason ? " Motif : " + actionReason : ""}`,
          newActif ? "success" : "warning");
        await logAction(target.user_id ?? null, newActif ? "boutique_activée" : "boutique_désactivée", target.nom);
        toast({ title: `Boutique ${newActif ? "activée" : "désactivée"}` });
      }

      if (targetType === "paylink" && type === "toggle_paylink") {
        const newActive = !target.is_active;
        await (supabase.from("paylinks") as any).update({ is_active: newActive }).eq("id", target.id);
        await logAction(target.user_id, newActive ? "paylink_activé" : "paylink_désactivé", target.title);
        toast({ title: `PayLink ${newActive ? "activé" : "désactivé"}` });
      }

      if (targetType === "formation" && type === "toggle_formation") {
        const newActive = !target.is_active;
        await (supabase.from("formations") as any).update({ is_active: newActive }).eq("id", target.id);
        await logAction(null, newActive ? "formation_activée" : "formation_désactivée", target.title);
        toast({ title: `Formation ${newActive ? "activée" : "désactivée"}` });
      }

      if (targetType === "user") {
        if (type === "activer_premium") {
          const days = parseInt(premiumDays) || 30;
          const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
          await supabase.from("nexora_users" as any).update({ plan: "roi", badge_premium: true, premium_since: new Date().toISOString(), premium_expires_at: expiresAt }).eq("id", target.id);
          await sendNotification(target.id, "Premium activé !", `Votre compte est Premium pour ${days} jours.`, "success");
          await logAction(target.id, "premium_activé", `${days} jours`);
          toast({ title: "Premium activé" });
        }
        if (type === "retirer_premium") {
          await supabase.from("nexora_users" as any).update({ plan: "gratuit", badge_premium: false, premium_since: null, premium_expires_at: null }).eq("id", target.id);
          await sendNotification(target.id, "Premium retiré", `Votre abonnement Premium a été retiré.`, "warning");
          await logAction(target.id, "premium_retiré", actionReason || null);
          toast({ title: "Premium retiré" });
        }
        if (type === "suspendre") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("nexora_users" as any).update({ status: "suspendu", is_active: false, suspended_reason: actionReason }).eq("id", target.id);
          await sendNotification(target.id, "Compte suspendu", `Motif : ${actionReason}`, "danger");
          await logAction(target.id, "compte_suspendu", actionReason);
          toast({ title: "Compte suspendu" });
        }
        if (type === "bloquer") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("nexora_users" as any).update({ status: "bloque", is_active: false, blocked_reason: actionReason }).eq("id", target.id);
          await sendNotification(target.id, "Compte bloqué", `Motif : ${actionReason}`, "danger");
          await logAction(target.id, "compte_bloqué", actionReason);
          toast({ title: "Compte bloqué" });
        }
        if (type === "debloquer") {
          await supabase.from("nexora_users" as any).update({ status: "actif", is_active: true, suspended_reason: null, blocked_reason: null }).eq("id", target.id);
          await sendNotification(target.id, "Compte réactivé", "Votre compte a été réactivé.", "success");
          await logAction(target.id, "compte_débloqué", null);
          toast({ title: "Compte débloqué" });
        }
        if (type === "supprimer") {
          await supabase.from("nexora_users" as any).delete().eq("id", target.id);
          await logAction(null, "compte_supprimé", `${target.nom_prenom} (${target.email})`);
          toast({ title: "Compte supprimé" });
          setSelectedUser(null);
        }
        if (selectedUser?.id === target.id) { const nu = { ...selectedUser } as any; setSelectedUser(nu); }
      }
      setActionModal(null); setActionReason(""); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleGrantAdmin = async (user: NexoraUser) => {
    if (!adminPassword.trim()) { toast({ title: "Mot de passe requis", variant: "destructive" }); return; }
    if (adminFeatures.length === 0) { toast({ title: "Sélectionnez au moins une fonctionnalité", variant: "destructive" }); return; }
    try {
      await (supabase as any).from("nexora_users").update({ is_admin: true, admin_features: adminFeatures, admin_password: adminPassword, plan: user.plan === "gratuit" ? "admin" : user.plan }).eq("id", user.id);
      await sendNotification(user.id, "✅ Accès Admin accordé", `Fonctionnalités : ${adminFeatures.map(f => ALL_ADMIN_FEATURES.find(af => af.key === f)?.label).join(", ")}.`, "success");
      await logAction(user.id, "admin_accordé", adminFeatures.join(", "));
      toast({ title: "✅ Accès admin accordé !" });
      setAdminFeatures([]); setAdminPassword(""); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleRevokeAdmin = async (user: NexoraUser) => {
    try {
      await (supabase as any).from("nexora_users").update({ is_admin: false, admin_features: [], admin_password: null }).eq("id", user.id);
      await sendNotification(user.id, "Accès Admin retiré", "Votre accès au Panel Admin a été retiré.", "warning");
      await logAction(user.id, "admin_retiré", null);
      toast({ title: "Accès admin retiré" }); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const loadUserTransactions = async (userId: string) => {
    setUserTxLoading(true); setUserTxHistory([]);
    try {
      const [{ data: txData }, { data: payoutData }] = await Promise.all([
        supabase.from("nexora_transactions" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("nexora_payouts" as any).select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      ]);
      const txRows = (txData ?? []).filter((r: any) => r.type === "recharge_transfert" || r.type === "retrait_transfert" || r.type === "abonnement_premium")
        .map((r: any) => ({
          id: r.id, type: r.type,
          label: r.type === "recharge_transfert" ? "Recharge" : r.type === "abonnement_premium" ? "Abonnement" : "Transfert",
          montant: r.amount ?? 0, frais: r.frais ?? 0,
          statut: r.status === "completed" ? "success" : r.status === "pending" ? "pending" : "failed",
          date: r.created_at, meta: typeof r.metadata === "string" ? JSON.parse(r.metadata) : (r.metadata ?? {}),
        }));
      const payoutRows = (payoutData ?? []).map((p: any) => ({
        id: p.id, type: "retrait_transfert",
        label: `Envoi → ${p.pays ?? ""}`, montant: p.amount ?? 0, frais: p.frais ?? 0,
        statut: p.status === "completed" ? "success" : p.status === "failed" ? "failed" : "pending",
        date: p.created_at, meta: { nom_beneficiaire: p.nom_beneficiaire, reseau: p.reseau, telephone: p.numero },
      }));
      const all = [...payoutRows, ...txRows].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setUserTxHistory(all);
    } catch (e) { console.error(e); }
    setUserTxLoading(false);
  };

  const handleSetDette = async () => {
    if (!detteModal) return;
    const montant = parseFloat(detteMontant);
    if (isNaN(montant) || montant <= 0) { toast({ title: "Montant invalide", variant: "destructive" }); return; }
    try {
      await supabase.from("nexora_users" as any).update({ dette_cachee: montant, dette_active: true }).eq("id", detteModal.id);
      await logAction(detteModal.id, "dette_cachée_appliquée", `${montant} FCFA`);
      toast({ title: "Dette appliquée silencieusement" });
      setDetteModal(null); setDetteMontant(""); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleClearDette = async (user: NexoraUser) => {
    try {
      await supabase.from("nexora_users" as any).update({ dette_cachee: 0, dette_active: false }).eq("id", user.id);
      await logAction(user.id, "dette_effacée", null);
      toast({ title: "Dette effacée" }); loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleChangeUserPassword = async (user: NexoraUser) => {
    if (!newPassword.trim()) { toast({ title: "Mot de passe requis", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Minimum 6 caractères", variant: "destructive" }); return; }
    setChangingPassword(true); setPasswordSuccess(false);
    try {
      const { hashPassword } = await import("@/lib/nexora-auth");
      const newHash = await hashPassword(newPassword);
      const { error } = await (supabase as any).from("nexora_users").update({ password_plain: newPassword, password_hash: newHash }).eq("id", user.id);
      if (error) throw error;
      await logAction(user.id, "mot_de_passe_modifié", "par admin");
      setPasswordSuccess(true);
      toast({ title: "✅ Mot de passe modifié" });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
    finally { setChangingPassword(false); }
  };

  const markAllNotifsRead = async () => {
    try {
      await (supabase.from("admin_notifications") as any).update({ lu: true }).eq("lu", false);
      loadAll();
    } catch {}
  };

  // ─── Filtered data ───────────────────────────────────────
  const filteredUsers = users.filter(u => {
    const q = searchUser.toLowerCase();
    return (u.nom_prenom.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      && (filterPlan ? u.plan === filterPlan : true)
      && (filterStatus ? u.status === filterStatus : true);
  });
  const filteredBoutiques = boutiques.filter(b => b.nom.toLowerCase().includes(searchBoutique.toLowerCase()));
  const filteredTx = transactions.filter(t =>
    (filterTxType ? t.type === filterTxType : true) &&
    (filterTxStatus ? t.status === filterTxStatus : true)
  );
  const filteredWd = withdrawals.filter(w => filterWdStatus ? w.status === filterWdStatus : true);

  const TABS: { id: AdminTab; label: string; icon: any; badge?: number }[] = [
    { id: "stats",        label: "Statistiques",  icon: BarChart3   },
    { id: "users",        label: "Utilisateurs",  icon: Users       },
    { id: "boutiques",    label: "Boutiques",     icon: Store       },
    { id: "paylinks",     label: "PayLinks",      icon: Link2       },
    { id: "transactions", label: "Transactions",  icon: ArrowRightLeft },
    { id: "retraits",     label: "Retraits",      icon: Wallet, badge: stats.pendingWithdrawals },
    { id: "mlm",          label: "MLM",           icon: GitBranch   },
    { id: "formations",   label: "Formations",    icon: BookOpen    },
    { id: "trafic",       label: "Trafic",        icon: Globe       },
    { id: "abonnements",  label: "Abonnements",   icon: Crown       },
    { id: "logs",         label: "Logs",          icon: Activity    },
    { id: "notifs",       label: "Notifications", icon: Bell, badge: stats.unreadNotifs },
  ];

  // ════════════ LOGIN ════════════
  if (!isAuthenticated) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-4">
      <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-900">Espace Admin</h1>
          <p className="text-gray-500 text-sm mt-1">Entrez votre code d'accès</p>
        </div>
        <div className="space-y-3">
          <Input type="password" value={codeInput}
            onChange={e => { setCodeInput(e.target.value); setCodeError(false); }}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            placeholder="Code d'accès"
            className={`text-center text-lg font-bold tracking-widest h-14 rounded-xl ${codeError ? "border-red-500 bg-red-50" : ""}`}
            autoFocus />
          {codeError && <p className="text-red-600 text-sm text-center font-medium">Code incorrect.</p>}
          <Button onClick={handleLogin} className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl text-base">
            Accéder au Panel
          </Button>
        </div>
        <button onClick={() => navigate(-1)} className="w-full flex items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </div>
  );

  // ════════════ PAGE DÉTAIL UTILISATEUR ════════════
  if (selectedUser) {
    const u = selectedUser;
    const userBoutiques = getBoutiquesByUser(u.id);
    const userCommandes = getCommandesByUser(u.id);
    const userCa        = getCaByUser(u.id);
    const userAbo       = abonnements.filter(a => a.user_id === u.id);
    const userPaylinks  = getPayLinksByUser(u.id);
    const userFormSales = getFormationSalesByUser(u.id);
    const userWithdrawals = getWithdrawalsByUser(u.id);
    const userMlmEarnings = getMlmEarningsByUser(u.id);
    const userFilleuls  = getMlmFilleuls(u.id);
    const StatusIcon    = STATUS_CONFIG[u.status]?.icon || CheckCircle;
    const hasDette      = u.dette_active && (u.dette_cachee ?? 0) > 0;

    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => { setSelectedUser(null); setNewPassword(""); setConfirmPassword(""); setPasswordSuccess(false); setShowUserPassword(false); setAdminFeatures([]); setAdminPassword(""); }}
            className="p-2 rounded-xl hover:bg-muted transition-colors"><ArrowLeft className="w-5 h-5" /></button>
          <div className="flex-1 min-w-0">
            <div className="font-black text-base truncate">{u.nom_prenom}</div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${STATUS_CONFIG[u.status]?.bg} ${STATUS_CONFIG[u.status]?.color}`}>
            <StatusIcon className="w-3 h-3" />{STATUS_CONFIG[u.status]?.label}
          </span>
        </div>

        <div className="p-4 max-w-xl mx-auto space-y-4">
          {/* Profile */}
          <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center font-black text-primary text-xl overflow-hidden flex-shrink-0">
              {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.nom_prenom.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-lg">{u.nom_prenom}</span>
                {u.is_admin && <BadgeCheck className="w-5 h-5 text-amber-500" />}
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_CONFIG[u.plan]?.bg} ${PLAN_CONFIG[u.plan]?.color}`}>{PLAN_CONFIG[u.plan]?.label}</span>
              </div>
              <div className="text-sm text-muted-foreground mt-0.5">{u.email}</div>
              <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(u.created_at)}</span>
                <span className="flex items-center gap-1 text-emerald-600 font-bold"><DollarSign className="w-3 h-3" />{fmtMoney(userCa)}</span>
                {(u.balance ?? 0) > 0 && <span className="flex items-center gap-1 text-blue-600 font-bold"><Wallet className="w-3 h-3" />{fmtMoney(u.balance)}</span>}
              </div>
            </div>
          </div>

          {hasDette && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-700">
                <MinusCircle className="w-4 h-4 flex-shrink-0" />
                <div><div className="font-bold text-sm">Dette cachée active</div><div className="text-xs">{fmtMoney(u.dette_cachee ?? 0)}</div></div>
              </div>
              <button onClick={() => handleClearDette(u)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium flex-shrink-0">Effacer</button>
            </div>
          )}

          {/* Quick stats grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "CA Boutiques", value: fmtMoney(userCa), color: "text-emerald-600", icon: Store },
              { label: "Solde", value: fmtMoney(u.balance), color: "text-blue-600", icon: Wallet },
              { label: "Filleuls MLM", value: userFilleuls.length, color: "text-violet-600", icon: GitBranch },
              { label: "Gains MLM", value: fmtMoney(userMlmEarnings.filter(e => e.status === "credited").reduce((a, c) => a + (Number(c.amount) || 0), 0)), color: "text-amber-600", icon: Award },
              { label: "PayLinks", value: userPaylinks.length, color: "text-pink-600", icon: Link2 },
              { label: "Formations vendues", value: userFormSales.length, color: "text-indigo-600", icon: BookOpen },
            ].map(s => { const Icon = s.icon; return (
              <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                <Icon className={`w-5 h-5 ${s.color} flex-shrink-0`} />
                <div className="min-w-0"><div className="text-xs text-muted-foreground truncate">{s.label}</div><div className={`text-sm font-black ${s.color} truncate`}>{String(s.value)}</div></div>
              </div>
            ); })}
          </div>

          {/* MLM */}
          {userFilleuls.length > 0 && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="font-bold text-sm text-violet-700 mb-2 flex items-center gap-2"><GitBranch className="w-4 h-4" /> Arbre MLM ({userFilleuls.length} filleuls directs)</div>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {userFilleuls.map(filleul => (
                  <div key={filleul.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium">{filleul.nom_prenom}</span>
                    <span className="text-violet-500">@{filleul.username}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* PayLinks */}
          {userPaylinks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="font-bold text-sm mb-2 flex items-center gap-2"><Link2 className="w-4 h-4 text-pink-500" /> PayLinks ({userPaylinks.length})</div>
              <div className="space-y-1">
                {userPaylinks.map(pl => (
                  <div key={pl.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                    <span className="font-medium truncate flex-1">{pl.title}</span>
                    <span className="text-emerald-600 font-bold ml-2">{fmtMoney(pl.total_paid, pl.devise)}</span>
                    <span className="ml-2 text-muted-foreground">{pl.total_tx} tx</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retraits */}
          {userWithdrawals.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="font-bold text-sm mb-2 flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-500" /> Retraits ({userWithdrawals.length})</div>
              <div className="space-y-1">
                {userWithdrawals.slice(0, 5).map(w => {
                  const cfg = WD_STATUS[w.status as keyof typeof WD_STATUS] || WD_STATUS.pending;
                  return (
                    <div key={w.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                      <span className="font-medium">{fmtMoney(w.amount, w.devise)}</span>
                      <span className="text-muted-foreground">{fmtDate(w.created_at)}</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Premium */}
          {(u.plan === "boss" || u.plan === "roi") && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-violet-700 font-bold mb-2"><Crown className="w-4 h-4" /> Premium</div>
              <div className="text-xs text-violet-600 space-y-1">
                <div>Depuis : {fmtDate(u.premium_since)}</div>
                <div className={u.premium_expires_at && new Date(u.premium_expires_at) < new Date() ? "text-red-500 font-semibold" : ""}>Expire : {fmtDate(u.premium_expires_at)}</div>
              </div>
            </div>
          )}

          {/* Abonnements */}
          {userAbo.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <div className="font-bold text-sm mb-2 flex items-center gap-2"><Crown className="w-4 h-4 text-violet-500" /> Abonnements ({userAbo.length})</div>
              <div className="space-y-1">
                {userAbo.map(a => (
                  <div key={a.id} className="flex items-center justify-between text-xs bg-muted rounded-lg px-3 py-2">
                    <span className="font-semibold capitalize">{a.plan}</span>
                    <span className="text-emerald-600 font-bold">{fmtMoney(a.montant, a.devise)}</span>
                    <span className={`px-2 py-0.5 rounded-full font-semibold ${a.statut === "actif" || a.statut === "paye" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.statut}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mot de passe */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" /> Mot de passe Nexora
            </div>
            {showUserPassword ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <code className="text-base font-black text-blue-800 font-mono tracking-widest select-all break-all flex-1">
                  {(u.password_plain && u.password_plain.trim() !== "") ? u.password_plain : <span className="text-blue-400 font-normal italic text-sm">Non enregistré en clair</span>}
                </code>
                <button onClick={() => setShowUserPassword(false)} className="text-xs px-3 py-1.5 rounded-lg bg-blue-200 text-blue-800 hover:bg-blue-300 font-semibold flex-shrink-0">
                  <Lock className="w-3.5 h-3.5 inline mr-1" />Masquer
                </button>
              </div>
            ) : (
              <button onClick={() => setShowUserPassword(true)} className="w-full flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold transition-colors border border-blue-200">
                <Unlock className="w-4 h-4" /> Révéler le mot de passe
              </button>
            )}
          </div>

          {/* Actions compte */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Actions compte</div>
            <div className="flex flex-wrap gap-2">
              {u.status === "actif" && !u.is_admin && (<>
                <button onClick={() => openActionModal("suspendre", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-semibold transition-colors"><AlertTriangle className="w-3.5 h-3.5" /> Suspendre</button>
                <button onClick={() => openActionModal("bloquer", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors"><Ban className="w-3.5 h-3.5" /> Bloquer</button>
              </>)}
              {(u.status === "suspendu" || u.status === "bloque") && (
                <button onClick={() => openActionModal("debloquer", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 font-semibold transition-colors"><Unlock className="w-3.5 h-3.5" /> Réactiver</button>
              )}
              {u.plan !== "boss" && u.plan !== "roi" && !u.is_admin && (
                <button onClick={() => openActionModal("activer_premium", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200 font-semibold transition-colors"><Crown className="w-3.5 h-3.5" /> Activer Premium</button>
              )}
              {(u.plan === "boss" || u.plan === "roi") && (
                <button onClick={() => openActionModal("retirer_premium", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors"><UserX className="w-3.5 h-3.5" /> Retirer Premium</button>
              )}
              {!u.is_admin && (
                <button onClick={() => openActionModal("supprimer", u, "user")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-colors"><Trash2 className="w-3.5 h-3.5" /> Supprimer</button>
              )}
            </div>
            {/* Produits utilisateur */}
            {(() => {
              const userProduits = userBoutiques.flatMap(b => getProduitsByBoutique(b.id));
              if (!userProduits.length) return null;
              return (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Produits ({userProduits.length})</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userProduits.map(produit => (
                      <div key={produit.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-xs gap-2">
                        <span className="font-medium flex-1 truncate">{produit.nom}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${produit.actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{produit.actif ? "Actif" : "Restreint"}</span>
                        <div className="flex gap-1 flex-shrink-0">
                          {produit.actif ? (
                            <button onClick={() => openActionModal("restreindre_produit", produit, "produit")} className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium transition-colors">Désact.</button>
                          ) : (
                            <button onClick={() => openActionModal("activer_produit", produit, "produit")} className="px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">Activer</button>
                          )}
                          <button onClick={() => openActionModal("supprimer_produit", produit, "produit")} className="px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Dette cachée */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-red-500" /> Gestion Dette Cachée
            </div>
            <p className="text-xs text-muted-foreground">Mode silencieux — aucune notification.</p>
            {hasDette ? (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3">
                <div><div className="text-sm font-bold text-red-700">Dette : {fmtMoney(u.dette_cachee ?? 0)}</div><div className="text-xs text-red-500">Active</div></div>
                <button onClick={() => handleClearDette(u)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">Effacer</button>
              </div>
            ) : (
              <button onClick={() => setDetteModal(u)} className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors w-full justify-center">
                <MinusCircle className="w-4 h-4" /> Appliquer une dette cachée
              </button>
            )}
          </div>

          {/* Modifier mot de passe */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-500" /> Modifier le mot de passe
            </div>
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2 text-green-700 text-sm font-semibold">
                <CheckCircle className="w-4 h-4 flex-shrink-0" /> Mot de passe mis à jour !
              </div>
            )}
            <div className="space-y-2">
              <Input type="password" placeholder="Nouveau mot de passe (min. 6)..." value={newPassword} onChange={e => { setNewPassword(e.target.value); setPasswordSuccess(false); }} className="rounded-xl" autoComplete="new-password" />
              <Input type="password" placeholder="Confirmer le mot de passe..." value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); setPasswordSuccess(false); }} className="rounded-xl" autoComplete="new-password" />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.</p>
              )}
              <button onClick={() => handleChangeUserPassword(u)}
                disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors w-full justify-center">
                {changingPassword ? <><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Modification...</> : <><Lock className="w-4 h-4" /> Enregistrer le mot de passe</>}
              </button>
            </div>
          </div>

          {/* PIN */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-emerald-500" /> Gestion du PIN
            </div>
            <AdminPinManager targetUserId={u.id} targetUserName={u.nom_prenom} hasPinSet={!!(u as any).has_set_pin} onDone={() => loadAll()} />
          </div>

          {/* Portefeuilles */}
          <AdminWalletManager user={u} onDone={loadAll} />

          {/* Historique transactions */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-500" /> Historique des transactions
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(["all","recharges","transferts"] as const).map(f => (
                <button key={f} onClick={() => setUserTxTab(f)} className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${userTxTab === f ? "bg-indigo-100 text-indigo-700" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>
                  {f === "all" ? "Tout" : f === "recharges" ? "Recharges" : "Transferts"}
                </button>
              ))}
            </div>
            {userTxLoading ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm"><div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Chargement...</div>
            ) : userTxHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground py-3 text-center">Aucune transaction trouvée.</p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {userTxHistory
                  .filter(tx => userTxTab === "all" || (userTxTab === "recharges" && tx.type === "recharge_transfert") || (userTxTab === "transferts" && tx.type === "retrait_transfert"))
                  .map(tx => (
                    <div key={tx.id} className="flex items-center gap-3 px-3 py-2.5 bg-muted/60 rounded-xl text-xs">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${tx.type === "recharge_transfert" ? "bg-yellow-100" : tx.type === "abonnement_premium" ? "bg-violet-100" : "bg-red-100"}`}>
                        {tx.type === "recharge_transfert" ? "⬇️" : tx.type === "abonnement_premium" ? "👑" : "⬆️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-foreground truncate">{tx.label}{tx.meta?.nom_beneficiaire && <span className="text-muted-foreground font-normal"> → {tx.meta.nom_beneficiaire}</span>}</div>
                        <div className="text-muted-foreground">{tx.meta?.reseau && <span>{tx.meta.reseau} · </span>}{new Date(tx.date).toLocaleString("fr-FR")}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-black ${tx.type === "recharge_transfert" ? "text-yellow-600" : "text-red-500"}`}>{tx.type === "recharge_transfert" ? "+" : "−"}{(tx.montant ?? 0).toLocaleString("fr-FR")} FCFA</div>
                        <span className={`px-1.5 py-0.5 rounded-full font-semibold ${tx.statut === "success" ? "bg-green-100 text-green-700" : tx.statut === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{tx.statut === "success" ? "✓" : tx.statut === "pending" ? "⏳" : "✗"}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && setActionModal(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="font-black text-lg">
                {actionModal.type === "activer_premium" && "Activer Premium"}
                {actionModal.type === "retirer_premium" && "Retirer Premium"}
                {actionModal.type === "suspendre" && "Suspendre le compte"}
                {actionModal.type === "bloquer" && "Bloquer le compte"}
                {actionModal.type === "debloquer" && "Débloquer le compte"}
                {actionModal.type === "supprimer" && "Supprimer le compte"}
                {actionModal.type === "supprimer_produit" && "Supprimer le produit"}
                {actionModal.type === "restreindre_produit" && "Restreindre le produit"}
                {actionModal.type === "activer_produit" && "Réactiver le produit"}
              </h3>
              {actionModal.type === "activer_premium" && (
                <div><label className="text-sm font-medium">Durée (jours)</label><Input type="number" value={premiumDays} onChange={e => setPremiumDays(e.target.value)} className="mt-1" placeholder="30" /></div>
              )}
              {["retirer_premium","suspendre","bloquer","supprimer","supprimer_produit","restreindre_produit"].includes(actionModal.type) && (
                <div>
                  <label className="text-sm font-medium mb-1 block">Motif {["supprimer","retirer_premium"].includes(actionModal.type) ? "(optionnel)" : "*"}</label>
                  <textarea value={actionReason} onChange={e => setActionReason(e.target.value)} className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none outline-none focus:border-primary transition-colors" placeholder="Précisez le motif..." autoFocus />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleAction} className={`flex-1 text-white ${["supprimer","bloquer","supprimer_produit"].includes(actionModal.type) ? "bg-red-600 hover:bg-red-700" : ["suspendre","restreindre_produit"].includes(actionModal.type) ? "bg-yellow-600 hover:bg-yellow-700" : ["debloquer","activer_premium","activer_produit"].includes(actionModal.type) ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-700"}`}>Confirmer</Button>
                <Button variant="outline" onClick={() => { setActionModal(null); setActionReason(""); }} className="flex-1">Annuler</Button>
              </div>
            </div>
          </div>
        )}
        {detteModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="font-black text-lg">Dette Cachée — {detteModal.nom_prenom}</h3>
              <Input type="number" value={detteMontant} onChange={e => setDetteMontant(e.target.value)} placeholder="Ex: 25000" autoFocus />
              <div className="flex gap-2">
                <Button onClick={handleSetDette} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Appliquer</Button>
                <Button variant="outline" onClick={() => { setDetteModal(null); setDetteMontant(""); }} className="flex-1">Annuler</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ════════════ PANEL PRINCIPAL ════════════
  return (
    <div className="min-h-screen bg-background">
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)} />}

      {/* Burger menu */}
      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 flex flex-col ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-amber-500" /><span className="font-black text-lg">Panel Admin</span></div>
          <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {TABS.map(t => { const Icon = t.icon; return (
            <button key={t.id} onClick={() => { setTab(t.id); setMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              <Icon className="w-4 h-4" />
              <span className="flex-1 text-left">{t.label}</span>
              {t.badge ? <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{t.badge}</span> : null}
            </button>
          ); })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <button onClick={() => navigate(-1)} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"><ArrowLeft className="w-4 h-4" /> Retour</button>
          <button onClick={() => { try { sessionStorage.removeItem("nexora_admin_auth"); } catch {} setIsAuthenticated(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"><XCircle className="w-4 h-4" /> Déconnexion</button>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors relative">
          <Menu className="w-5 h-5" />
          {stats.unreadNotifs > 0 && <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-red-500 rounded-full" />}
        </button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span className="font-black text-base">{TABS.find(t => t.id === tab)?.label}</span>
          {TABS.find(t => t.id === tab)?.badge ? <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">{TABS.find(t => t.id === tab)?.badge}</span> : null}
        </div>
        <Button onClick={loadAll} disabled={loading} variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Actualiser</span>
        </Button>
      </div>

      <div className="p-4 space-y-5 pb-16 max-w-3xl mx-auto">

        {/* ── STATS ── */}
        {tab === "stats" && (
          <div className="space-y-4">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Utilisateurs</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Total",   value: stats.totalUsers,   icon: Users,       color: "text-blue-600",   bg: "bg-blue-50"   },
                { label: "Premium", value: stats.premiumUsers, icon: Crown,       color: "text-violet-600", bg: "bg-violet-50" },
                { label: "Gratuit", value: stats.gratuitUsers, icon: UserCheck,   color: "text-gray-600",   bg: "bg-gray-50"   },
                { label: "Admins",  value: stats.adminUsers,   icon: ShieldCheck, color: "text-amber-600",  bg: "bg-amber-50"  },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className={`${s.bg} border border-border rounded-2xl p-4 flex items-center gap-3`}>
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0"><Icon className={`w-5 h-5 ${s.color}`} /></div>
                  <div><div className="text-xs text-muted-foreground">{s.label}</div><div className={`text-2xl font-black ${s.color}`}>{s.value}</div></div>
                </div>
              ); })}
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Actifs",    value: stats.activeUsers,    color: "text-green-700",  bg: "bg-green-50"  },
                { label: "Suspendus", value: stats.suspendedUsers, color: "text-yellow-700", bg: "bg-yellow-50" },
                { label: "Bloqués",   value: stats.blockedUsers,   color: "text-red-700",    bg: "bg-red-50"    },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border border-border rounded-xl p-3 text-center`}>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Revenus Nexora</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "CA Boutiques", value: fmtMoney(stats.chiffreAffairesTotal), color: "text-emerald-700", bg: "bg-emerald-50", icon: Store },
                { label: "Abonnements",  value: fmtMoney(stats.caAbonnements),        color: "text-violet-700", bg: "bg-violet-50", icon: Crown },
                { label: "PayLinks",     value: fmtMoney(stats.caPaylinks),           color: "text-pink-700",   bg: "bg-pink-50",   icon: Link2 },
                { label: "Formations",   value: fmtMoney(stats.totalFormationRevenue),color: "text-indigo-700", bg: "bg-indigo-50", icon: BookOpen },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className={`${s.bg} border border-border rounded-xl p-4 flex items-center gap-3`}>
                  <Icon className={`w-6 h-6 ${s.color} flex-shrink-0`} />
                  <div><div className="text-xs text-muted-foreground">{s.label}</div><div className={`text-sm font-black ${s.color}`}>{s.value}</div></div>
                </div>
              ); })}
            </div>

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Commerce & MLM</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Boutiques actives", value: `${stats.boutiquesActives}/${stats.totalBoutiques}`, icon: Store },
                { label: "Produits",          value: stats.totalProduits,   icon: Package },
                { label: "Commandes",         value: stats.totalCommandes,  icon: ShoppingCart },
                { label: "Transactions",      value: stats.totalTransactions, icon: ArrowRightLeft },
                { label: "Retraits en attente", value: stats.pendingWithdrawals, icon: Wallet },
                { label: "Total retraits",    value: fmtMoney(stats.totalWithdrawalAmount), icon: TrendingDown },
                { label: "CA MLM total",      value: fmtMoney(stats.totalMlmEarnings), icon: GitBranch },
                { label: "Visites totales",   value: stats.totalVisits,    icon: Globe },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
                  <Icon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0"><div className="text-xs text-muted-foreground truncate">{s.label}</div><div className="text-sm font-black truncate">{String(s.value)}</div></div>
                </div>
              ); })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div><div className="text-xs text-muted-foreground">Nouveaux aujourd'hui</div><div className="text-2xl font-black text-blue-600">{stats.newUsersToday}</div></div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Crown className="w-8 h-8 text-violet-500" />
                <div><div className="text-xs text-muted-foreground">Nouveaux premium</div><div className="text-2xl font-black text-violet-600">{stats.newPremiumToday}</div></div>
              </div>
            </div>
          </div>
        )}

        {/* ── UTILISATEURS ── */}
        {tab === "users" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => exportCSV(users, "nexora_users.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Nom, username, email..." className="pl-9" />
              </div>
              <select value={filterPlan} onChange={e => setFilterPlan(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Tous les plans</option>
                <option value="gratuit">Gratuit</option>
                <option value="boss">Boss</option>
                <option value="roi">Roi</option>
              </select>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Tous statuts</option>
                <option value="actif">Actif</option>
                <option value="suspendu">Suspendu</option>
                <option value="bloque">Bloqué</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{filteredUsers.length} utilisateur(s)</p>
            <div className="space-y-2">
              {filteredUsers.map(user => {
                const StatusIcon = STATUS_CONFIG[user.status]?.icon || CheckCircle;
                const userCa     = getCaByUser(user.id);
                const hasDette   = user.dette_active && (user.dette_cachee ?? 0) > 0;
                const filleuls   = getMlmFilleuls(user.id).length;
                return (
                  <button key={user.id} onClick={() => { setSelectedUser(user); setNewPassword(""); setConfirmPassword(""); setPasswordSuccess(false); setAdminFeatures([]); setAdminPassword(""); setShowUserPassword(false); setUserTxHistory([]); setUserTxTab("all"); loadUserTransactions(user.id); }}
                    className="w-full text-left bg-card border border-border rounded-2xl p-4 hover:border-primary/40 hover:shadow-sm transition-all">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary text-sm overflow-hidden">
                        {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : user.nom_prenom.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{user.nom_prenom}</span>
                          {user.is_admin && <BadgeCheck className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                          {hasDette && <MinusCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PLAN_CONFIG[user.plan]?.bg} ${PLAN_CONFIG[user.plan]?.color}`}>{PLAN_CONFIG[user.plan]?.label}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 ${STATUS_CONFIG[user.status]?.bg} ${STATUS_CONFIG[user.status]?.color}`}>
                            <StatusIcon className="w-3 h-3" />{STATUS_CONFIG[user.status]?.label}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">@{user.username} · {user.email}</div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{fmtDate(user.created_at)}</span>
                          <span className="flex items-center gap-1 text-emerald-600 font-semibold"><DollarSign className="w-3 h-3" />{fmtMoney(userCa)}</span>
                          {filleuls > 0 && <span className="flex items-center gap-1 text-violet-600 font-semibold"><GitBranch className="w-3 h-3" />{filleuls}</span>}
                          {(user.balance ?? 0) > 0 && <span className="flex items-center gap-1 text-blue-600 font-semibold"><Wallet className="w-3 h-3" />{fmtMoney(user.balance)}</span>}
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BOUTIQUES ── */}
        {tab === "boutiques" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => exportCSV(boutiques, "nexora_boutiques.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchBoutique} onChange={e => setSearchBoutique(e.target.value)} placeholder="Rechercher une boutique..." className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">{filteredBoutiques.length} boutique(s)</p>
            <div className="space-y-3">
              {filteredBoutiques.map(boutique => {
                const isExpanded    = expandedBoutique === boutique.id;
                const produitsBout  = getProduitsByBoutique(boutique.id);
                const commandesBout = getCommandesByBoutique(boutique.id);
                const ca            = getCaByBoutique(boutique.id);
                const owner         = users.find(u => u.id === boutique.user_id);
                return (
                  <div key={boutique.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0"><Store className="w-5 h-5 text-pink-600" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{boutique.nom}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${boutique.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{boutique.actif ? "Active" : "Inactive"}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">/{boutique.slug} · {owner?.nom_prenom || "Inconnu"}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                            <span className="text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" />{produitsBout.length}</span>
                            <span className="text-muted-foreground flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{commandesBout.length}</span>
                            <span className="text-emerald-600 font-bold">{fmtMoney(ca)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button onClick={() => openActionModal("toggle_boutique", boutique, "boutique")}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${boutique.actif ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                            {boutique.actif ? "Désactiver" : "Activer"}
                          </button>
                          <button onClick={() => setExpandedBoutique(isExpanded ? null : boutique.id)} className="p-1.5 rounded-lg hover:bg-muted">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-border bg-muted/30 p-4 space-y-2">
                        {produitsBout.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-2">Aucun produit</p>
                        ) : produitsBout.map(produit => {
                          const photos = produit.photos;
                          const photo  = Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
                          return (
                            <div key={produit.id} className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{produit.nom}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-2">
                                  {fmtMoney(produit.prix)}
                                  {produit.type && <span className={`px-1.5 py-0.5 rounded font-semibold ${produit.type === "digital" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"}`}>{produit.type}</span>}
                                </div>
                              </div>
                              <div className="flex flex-col gap-1.5 flex-shrink-0">
                                {produit.actif ? (
                                  <button onClick={() => openActionModal("restreindre_produit", produit, "produit")} className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium">Restreindre</button>
                                ) : (
                                  <button onClick={() => openActionModal("activer_produit", produit, "produit")} className="text-xs px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">Activer</button>
                                )}
                                <button onClick={() => openActionModal("supprimer_produit", produit, "produit")} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">Supprimer</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PAYLINKS ── */}
        {tab === "paylinks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 flex items-center gap-3 flex-1 mr-3">
                <Link2 className="w-5 h-5 text-pink-600" />
                <div><div className="text-xs text-pink-600 font-semibold">Total généré via PayLinks</div><div className="text-xl font-black text-pink-700">{fmtMoney(stats.caPaylinks)}</div></div>
              </div>
              <button onClick={() => exportCSV(paylinks, "nexora_paylinks.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors h-fit">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <div className="space-y-2">
              {paylinks.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucun PayLink</p>
              ) : paylinks.map(pl => {
                const owner = getUserById(pl.user_id);
                return (
                  <div key={pl.id} className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0"><Link2 className="w-4 h-4 text-pink-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{pl.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${pl.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{pl.is_active ? "Actif" : "Inactif"}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{owner?.nom_prenom || "Inconnu"} · {fmtDate(pl.created_at)}</div>
                        <div className="flex gap-3 mt-1 text-xs flex-wrap">
                          <span className="text-muted-foreground">Montant : <span className="font-semibold text-foreground">{fmtMoney(pl.amount, pl.devise)}</span></span>
                          <span className="text-emerald-600 font-bold">Total encaissé : {fmtMoney(pl.total_paid, pl.devise)}</span>
                          <span className="text-muted-foreground">{pl.total_tx} transactions</span>
                        </div>
                      </div>
                      <button onClick={() => openActionModal("toggle_paylink", pl, "paylink")}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${pl.is_active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {pl.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TRANSACTIONS ── */}
        {tab === "transactions" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <div className="text-xs text-emerald-600 font-semibold">CA Transactions</div>
                <div className="text-xl font-black text-emerald-700">{fmtMoney(stats.caTransactions)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-3">
                <div className="text-xs text-muted-foreground font-semibold">Nombre total</div>
                <div className="text-xl font-black">{stats.totalTransactions}</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={filterTxType} onChange={e => setFilterTxType(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Tous types</option>
                <option value="product">Produit</option>
                <option value="formation">Formation</option>
                <option value="mlm">MLM</option>
                <option value="paylink">PayLink</option>
                <option value="abonnement">Abonnement</option>
                <option value="recharge">Recharge</option>
                <option value="retrait">Retrait</option>
              </select>
              <select value={filterTxStatus} onChange={e => setFilterTxStatus(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Tous statuts</option>
                <option value="success">Succès</option>
                <option value="pending">En cours</option>
                <option value="failed">Échoué</option>
              </select>
              <button onClick={() => exportCSV(filteredTx, "nexora_transactions.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <p className="text-xs text-muted-foreground">{filteredTx.length} transaction(s)</p>
            <div className="space-y-2">
              {filteredTx.slice(0, 50).map(tx => {
                const owner = getUserById(tx.user_id);
                const cfg   = TX_STATUS[tx.status as keyof typeof TX_STATUS] || TX_STATUS.pending;
                return (
                  <div key={tx.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <ArrowRightLeft className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{owner?.nom_prenom || "Inconnu"}</span>
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium capitalize">{tx.type}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">{fmtDatetime(tx.created_at)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-emerald-600">{fmtMoney(tx.amount, tx.devise)}</div>
                      {tx.frais > 0 && <div className="text-xs text-muted-foreground">frais : {fmtMoney(tx.frais, tx.devise)}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── RETRAITS ── */}
        {tab === "retraits" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "En attente", value: stats.pendingWithdrawals, color: "text-yellow-700", bg: "bg-yellow-50" },
                { label: "Total",      value: stats.totalWithdrawals,   color: "text-gray-700",   bg: "bg-gray-50"   },
                { label: "CA retiré",  value: fmtMoney(stats.totalWithdrawalAmount), color: "text-red-700", bg: "bg-red-50" },
              ].map(s => (
                <div key={s.label} className={`${s.bg} border border-border rounded-xl p-3 text-center`}>
                  <div className={`text-lg font-black ${s.color}`}>{String(s.value)}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <select value={filterWdStatus} onChange={e => setFilterWdStatus(e.target.value)} className="h-10 px-3 rounded-md border border-input bg-background text-sm">
                <option value="">Tous statuts</option>
                <option value="pending">En attente</option>
                <option value="approved">Approuvé</option>
                <option value="rejected">Refusé</option>
                <option value="processing">Traitement</option>
              </select>
              <button onClick={() => exportCSV(filteredWd, "nexora_retraits.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <div className="space-y-2">
              {filteredWd.map(wd => {
                const owner = getUserById(wd.user_id);
                const cfg   = WD_STATUS[wd.status as keyof typeof WD_STATUS] || WD_STATUS.pending;
                return (
                  <div key={wd.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><Wallet className="w-5 h-5 text-blue-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{owner?.nom_prenom || "Inconnu"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {wd.reseau && <span>{wd.reseau} · </span>}
                          {wd.telephone && <span>{wd.telephone} · </span>}
                          {fmtDatetime(wd.created_at)}
                        </div>
                        {wd.nom_beneficiaire && <div className="text-xs text-muted-foreground">Bénéficiaire : {wd.nom_beneficiaire}</div>}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-black text-lg text-red-600">{fmtMoney(wd.amount, wd.devise)}</div>
                        {wd.frais > 0 && <div className="text-xs text-muted-foreground">frais : {fmtMoney(wd.frais, wd.devise)}</div>}
                      </div>
                    </div>
                    {wd.status === "pending" && (
                      <div className="mt-3 flex gap-2">
                        <textarea value={actionModal?.target?.id === wd.id ? actionReason : ""}
                          placeholder="Note admin (optionnel)..."
                          onChange={e => { setActionReason(e.target.value); setActionModal({ type: "wd_note", target: wd, targetType: "withdrawal" }); }}
                          className="flex-1 h-8 px-3 py-1 text-xs rounded-lg border border-input bg-background resize-none outline-none focus:border-primary" />
                        <button onClick={() => handleWithdrawalAction(wd, "approved")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-semibold transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Approuver</button>
                        <button onClick={() => handleWithdrawalAction(wd, "rejected")} className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors"><XCircle className="w-3.5 h-3.5" /> Refuser</button>
                      </div>
                    )}
                    {wd.admin_note && <div className="mt-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">Note : {wd.admin_note}</div>}
                  </div>
                );
              })}
              {filteredWd.length === 0 && <p className="text-center text-muted-foreground py-8 text-sm">Aucun retrait</p>}
            </div>
          </div>
        )}

        {/* ── MLM ── */}
        {tab === "mlm" && (
          <div className="space-y-4">
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-violet-700 font-bold mb-2"><GitBranch className="w-5 h-5" /> Réseau MLM</div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div><div className="text-xl font-black text-violet-700">{users.filter(u => (u as any).referrer_id).length}</div><div className="text-xs text-violet-600">Filleuls inscrits</div></div>
                <div><div className="text-xl font-black text-violet-700">{mlmCommissions.length}</div><div className="text-xs text-violet-600">Commissions</div></div>
                <div><div className="text-sm font-black text-violet-700">{fmtMoney(stats.totalMlmEarnings)}</div><div className="text-xs text-violet-600">CA total MLM</div></div>
              </div>
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Top parrains</p>
            <div className="space-y-2">
              {users
                .map(u => ({ user: u, filleuls: getMlmFilleuls(u.id).length, earnings: getMlmEarningsByUser(u.id).filter(c => c.status === "credited").reduce((a, c) => a + (Number(c.amount) || 0), 0) }))
                .filter(x => x.filleuls > 0)
                .sort((a, b) => b.filleuls - a.filleuls)
                .slice(0, 20)
                .map(({ user, filleuls, earnings }) => (
                  <div key={user.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-sm flex-shrink-0 overflow-hidden">
                      {user.avatar_url ? <img src={user.avatar_url} className="w-full h-full object-cover" alt="" /> : user.nom_prenom.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{user.nom_prenom}</div>
                      <div className="text-xs text-muted-foreground">@{user.username}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-violet-600">{filleuls} filleuls</div>
                      <div className="text-xs text-emerald-600 font-semibold">{fmtMoney(earnings)}</div>
                    </div>
                  </div>
                ))}
              {users.every(u => getMlmFilleuls(u.id).length === 0) && (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucune relation MLM enregistrée</p>
              )}
            </div>
            {mlmCommissions.length > 0 && (<>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Derniers gains MLM</p>
              <div className="space-y-2">
                {mlmCommissions.slice(0, 20).map(e => {
                  const earner = getUserById(e.to_user_id);
                  const cfg    = e.status === "credited" ? "bg-green-100 text-green-700" : e.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-gray-100 text-gray-500";
                  return (
                    <div key={e.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                      <Award className="w-5 h-5 text-amber-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm">{earner?.nom_prenom || "Inconnu"}</div>
                        <div className="text-xs text-muted-foreground">{e.type === "subscription" ? "Abonnement" : "Formation"} · Niv. {e.level} · {fmtDatetime(e.created_at)}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-black text-amber-600">{fmtMoney(e.amount)}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg}`}>{e.status}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>)}
          </div>
        )}

        {/* ── FORMATIONS ── */}
        {tab === "formations" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <BookOpen className="w-5 h-5 text-indigo-600 mb-1" />
                <div className="text-xs text-indigo-600 font-semibold">Revenus formations</div>
                <div className="text-xl font-black text-indigo-700">{fmtMoney(stats.totalFormationRevenue)}</div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <ShoppingCart className="w-5 h-5 text-muted-foreground mb-1" />
                <div className="text-xs text-muted-foreground font-semibold">Ventes totales</div>
                <div className="text-xl font-black">{stats.totalFormationSales}</div>
              </div>
            </div>
            <div className="space-y-2">
              {formations.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucune formation</p>
              ) : formations.map(fo => {
                const owner = getUserById(fo.user_id || "");
                const sales = formationSales.filter(s => s.formation_id === fo.id);
                const ca    = sales.reduce((a, s) => a + s.amount, 0);
                return (
                  <div key={fo.id} className="bg-card border border-border rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center flex-shrink-0"><BookOpen className="w-5 h-5 text-indigo-600" /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm truncate">{fo.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${fo.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{fo.is_active ? "Active" : "Inactive"}</span>
                        </div>
                        {owner && <div className="text-xs text-muted-foreground mt-0.5">Par {owner.nom_prenom}</div>}
                        <div className="flex gap-3 mt-1 text-xs">
                          <span className="font-semibold">{fmtMoney(fo.price, fo.devise)}</span>
                          <span className="text-muted-foreground">{sales.length} ventes</span>
                          <span className="text-emerald-600 font-bold">{fmtMoney(ca, fo.devise)}</span>
                        </div>
                      </div>
                      <button onClick={() => openActionModal("toggle_formation", fo, "formation")}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors flex-shrink-0 ${fo.is_active ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}>
                        {fo.is_active ? "Désactiver" : "Activer"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── TRAFIC ── */}
        {tab === "trafic" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Visites",    value: stats.totalVisits,  icon: Eye,         color: "text-blue-600",   bg: "bg-blue-50"   },
                { label: "Clics",      value: stats.totalClicks,  icon: Zap,         color: "text-yellow-600", bg: "bg-yellow-50" },
                { label: "Boutiques",  value: stats.totalBoutiques, icon: Store,     color: "text-pink-600",   bg: "bg-pink-50"   },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className={`${s.bg} border border-border rounded-xl p-3 text-center`}>
                  <Icon className={`w-5 h-5 ${s.color} mx-auto mb-1`} />
                  <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              ); })}
            </div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Statistiques par jour</p>
            <div className="space-y-2">
              {trafficStats.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">Aucune donnée de trafic</p>
              ) : trafficStats.slice(0, 30).map(ts => {
                const boutique = boutiques.find(b => b.id === ts.shop_id);
                const owner    = boutique ? getUserById(boutique.user_id) : null;
                return (
                  <div key={ts.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                    <Globe className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{boutique?.nom || "Boutique inconnue"}</div>
                      <div className="text-xs text-muted-foreground">{owner?.nom_prenom || ""} · {fmtDate(ts.date)}</div>
                    </div>
                    <div className="text-right flex-shrink-0 text-xs space-y-0.5">
                      <div className="flex items-center gap-1 text-blue-600 font-semibold"><Eye className="w-3 h-3" />{ts.visits}</div>
                      <div className="flex items-center gap-1 text-yellow-600 font-semibold"><Zap className="w-3 h-3" />{ts.clicks}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── ABONNEMENTS ── */}
        {tab === "abonnements" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="text-sm font-semibold opacity-80 mb-1">Revenus Abonnements</div>
              <div className="text-3xl font-black">{fmtMoney(stats.caAbonnements)}</div>
              <div className="text-xs opacity-70 mt-1">{stats.totalAbonnements} abonnement(s)</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => exportCSV(abonnements, "nexora_abonnements.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                <Download className="w-3.5 h-3.5" /> CSV
              </button>
            </div>
            <div className="space-y-2">
              {abonnements.map(a => {
                const u = users.find(us => us.id === a.user_id);
                return (
                  <div key={a.id} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-violet-100 flex items-center justify-center font-bold text-violet-700 text-sm flex-shrink-0">
                      {u ? u.nom_prenom.slice(0, 2).toUpperCase() : "?"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm">{u?.nom_prenom || "Inconnu"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{a.plan} · {fmtDate(a.date_debut)}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="font-black text-emerald-600">{fmtMoney(a.montant, a.devise)}</div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.statut === "actif" || a.statut === "paye" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{a.statut}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── LOGS ── */}
        {tab === "logs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{logs.length} entrées</p>
              <div className="flex gap-2">
                <button onClick={() => exportCSV(logs, "nexora_logs.csv")} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-emerald-100 text-emerald-700 hover:bg-emerald-200 font-semibold transition-colors">
                  <Download className="w-3.5 h-3.5" /> CSV
                </button>
                <Button variant="outline" size="sm" onClick={() => {
                  if (window.confirm("Vider tous les logs ?")) {
                    supabase.from("nexora_logs" as any).delete().neq("id", "00000000-0000-0000-0000-000000000000")
                      .then(() => { toast({ title: "Logs vidés" }); loadAll(); });
                  }
                }} className="gap-1 text-xs"><Trash2 className="w-3.5 h-3.5" /> Vider</Button>
              </div>
            </div>
            {logs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5"><Activity className="w-3.5 h-3.5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary">{log.action}</span>
                    {log.nexora_users && <span className="text-xs text-muted-foreground">@{(log.nexora_users as any).username}</span>}
                  </div>
                  {log.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>}
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDatetime(log.created_at)}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── NOTIFICATIONS ADMIN ── */}
        {tab === "notifs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{adminNotifs.length} notification(s) · {stats.unreadNotifs} non lues</p>
              <div className="flex gap-2">
                {stats.unreadNotifs > 0 && (
                  <button onClick={markAllNotifsRead} className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Tout marquer lu
                  </button>
                )}
                <Button variant="outline" size="sm" onClick={() => {
                  if (window.confirm("Vider toutes les notifications admin ?")) {
                    (supabase.from("admin_notifications") as any).delete().neq("id", "00000000-0000-0000-0000-000000000000")
                      .then(() => { toast({ title: "Notifications vidées" }); loadAll(); });
                  }
                }} className="gap-1 text-xs"><Trash2 className="w-3.5 h-3.5" /> Vider</Button>
              </div>
            </div>
            {adminNotifs.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Aucune notification</p>
              </div>
            ) : adminNotifs.map(notif => {
              const severityConfig = {
                info:    { bg: "bg-blue-50",   border: "border-blue-200",   icon: AlertCircle, iconColor: "text-blue-500"  },
                warning: { bg: "bg-yellow-50", border: "border-yellow-200", icon: AlertTriangle, iconColor: "text-yellow-500" },
                danger:  { bg: "bg-red-50",    border: "border-red-200",    icon: AlertOctagon, iconColor: "text-red-500"   },
                success: { bg: "bg-green-50",  border: "border-green-200",  icon: CheckCircle, iconColor: "text-green-500" },
              }[notif.severity] || { bg: "bg-muted", border: "border-border", icon: Bell, iconColor: "text-muted-foreground" };
              const Icon = severityConfig.icon;
              const user = notif.user_id ? getUserById(notif.user_id) : null;
              return (
                <div key={notif.id} className={`${severityConfig.bg} border ${severityConfig.border} rounded-xl p-4 flex items-start gap-3 ${!notif.lu ? "opacity-100" : "opacity-60"}`}>
                  <Icon className={`w-5 h-5 ${severityConfig.iconColor} flex-shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{notif.titre}</span>
                      {!notif.lu && <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                    </div>
                    {notif.message && <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>}
                    {user && <p className="text-xs text-muted-foreground mt-0.5">Utilisateur : {user.nom_prenom}</p>}
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Clock className="w-3 h-3" />{fmtDatetime(notif.created_at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals panel principal */}
      {actionModal && !["wd_note"].includes(actionModal.type) && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && setActionModal(null)}>
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-black text-lg">
              {actionModal.type === "activer_premium"     && "Activer Premium"}
              {actionModal.type === "retirer_premium"     && "Retirer Premium"}
              {actionModal.type === "suspendre"           && "Suspendre"}
              {actionModal.type === "bloquer"             && "Bloquer"}
              {actionModal.type === "debloquer"           && "Débloquer"}
              {actionModal.type === "supprimer"           && "Supprimer le compte"}
              {actionModal.type === "supprimer_produit"   && "Supprimer le produit"}
              {actionModal.type === "restreindre_produit" && "Restreindre le produit"}
              {actionModal.type === "activer_produit"     && "Réactiver le produit"}
              {actionModal.type === "toggle_boutique"     && (actionModal.target.actif ? "Désactiver la boutique" : "Activer la boutique")}
              {actionModal.type === "toggle_paylink"      && (actionModal.target.is_active ? "Désactiver le PayLink" : "Activer le PayLink")}
              {actionModal.type === "toggle_formation"    && (actionModal.target.is_active ? "Désactiver la formation" : "Activer la formation")}
            </h3>
            {actionModal.type === "activer_premium" && (
              <div><label className="text-sm font-medium">Durée (jours)</label><Input type="number" value={premiumDays} onChange={e => setPremiumDays(e.target.value)} className="mt-1" placeholder="30" autoFocus /></div>
            )}
            {["retirer_premium","suspendre","bloquer","supprimer","supprimer_produit","restreindre_produit","toggle_boutique","toggle_paylink"].includes(actionModal.type) && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Motif {["supprimer","toggle_boutique","retirer_premium","toggle_paylink","toggle_formation"].includes(actionModal.type) ? "(optionnel)" : "*"}
                </label>
                <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none outline-none focus:border-primary transition-colors"
                  placeholder="Précisez le motif..." />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAction} className={`flex-1 text-white ${
                ["supprimer","bloquer","supprimer_produit"].includes(actionModal.type) ? "bg-red-600 hover:bg-red-700" :
                ["suspendre","restreindre_produit"].includes(actionModal.type) ? "bg-yellow-600 hover:bg-yellow-700" :
                ["debloquer","activer_premium","activer_produit"].includes(actionModal.type) ? "bg-green-600 hover:bg-green-700" :
                "bg-gray-600 hover:bg-gray-700"
              }`}>Confirmer</Button>
              <Button variant="outline" onClick={() => { setActionModal(null); setActionReason(""); }} className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}

      {detteModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="font-black text-lg">Dette Cachée — {detteModal.nom_prenom}</h3>
            <Input type="number" value={detteMontant} onChange={e => setDetteMontant(e.target.value)} placeholder="Ex: 25000" autoFocus />
            <div className="flex gap-2">
              <Button onClick={handleSetDette} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Appliquer</Button>
              <Button variant="outline" onClick={() => { setDetteModal(null); setDetteMontant(""); }} className="flex-1">Annuler</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
