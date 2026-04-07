import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Users, Crown, ShieldCheck, Ban, Activity, BarChart3,
  Store, RefreshCw, Search, ChevronDown, ChevronUp,
  CheckCircle, XCircle, AlertTriangle,
  Trash2, Menu, X, ArrowLeft,
  UserCheck, UserX, Clock, Calendar, DollarSign,
  Unlock, BadgeCheck, Bell,
  Package, ShoppingCart, AlertOctagon,
  Send,
  TrendingUp, Percent, Key, Lock,
  MinusCircle,
  ArrowRightLeft
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


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
}

interface Boutique {
  id: string;
  nom: string;
  slug: string;
  description: string | null;
  actif: boolean;
  created_at: string;
  user_id: string;
}

interface Produit {
  id: string;
  boutique_id: string;
  nom: string;
  description: string | null;
  prix: number;
  prix_promo: number | null;
  categorie: string | null;
  stock: number;
  stock_illimite: boolean;
  photos: any;
  actif: boolean;
  created_at: string;
}

interface Commande {
  id: string;
  boutique_id: string;
  numero: string;
  client_nom: string;
  total: number;
  devise: string;
  statut: string;
  statut_paiement: string;
  created_at: string;
}

interface Abonnement {
  id: string;
  user_id: string | null;
  plan: string;
  montant: number;
  devise: string;
  statut: string;
  created_at: string;
  date_debut: string;
  date_fin: string | null;
}

interface Transfert {
  id: string;
  user_id: string;
  montant: number;
  frais: number;
  devise: string;
  created_at: string;
  statut: string;
}

type AdminTab = "stats" | "users" | "boutiques" | "abonnements" | "logs";

// ── Helpers ────────────────────────────────────────────────
const fmtDate = (d: string | null) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })
  : "—";

const fmtDatetime = (d: string | null) => d
  ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
  : "—";

const fmtMoney = (n: number, devise = "FCFA") =>
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

const ALL_ADMIN_FEATURES = [
  { key: "stats",          label: "Statistiques générales"  },
  { key: "users_view",     label: "Voir les utilisateurs"   },
  { key: "users_edit",     label: "Modifier les utilisateurs" },
  { key: "view_passwords", label: "Voir les mots de passe"  },
  { key: "boutiques",      label: "Gérer les boutiques"     },
  { key: "produits",       label: "Gérer les produits"      },
  { key: "abonnements",    label: "Voir les abonnements"    },
  { key: "logs",           label: "Voir les logs"           },
  { key: "transferts",     label: "Gestion transferts / dettes" },
  
];

const ADMIN_CODE = "ERIC";

// ══════════════════════════════════════════════════════════
export default function AdminPanelPage() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [codeInput, setCodeInput]             = useState("");
  const [codeError, setCodeError]             = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [menuOpen, setMenuOpen] = useState(false);
  const [tab, setTab] = useState<AdminTab>(() => {
    try { return (localStorage.getItem("admin_tab") as AdminTab) || "stats"; }
    catch { return "stats"; }
  });
  const [loading, setLoading] = useState(false);

  const [stats, setStats] = useState({
    totalUsers: 0, premiumUsers: 0, gratuitUsers: 0, adminUsers: 0,
    activeUsers: 0, suspendedUsers: 0, blockedUsers: 0,
    totalBoutiques: 0, boutiquesActives: 0,
    totalProduits: 0, totalCommandes: 0,
    chiffreAffairesTotal: 0,
    newUsersToday: 0, newPremiumToday: 0,
    caAbonnements: 0, totalAbonnements: 0,
    revenusTransferts: 0,
    totalTransferts: 0,
  });

  const [users,         setUsers]         = useState<NexoraUser[]>([]);
  const [boutiques,     setBoutiques]     = useState<Boutique[]>([]);
  const [produits,      setProduits]      = useState<Produit[]>([]);
  const [commandes,     setCommandes]     = useState<Commande[]>([]);
  const [abonnements,   setAbonnements]   = useState<Abonnement[]>([]);
  const [logs,          setLogs]          = useState<any[]>([]);
  const [transferts,    setTransferts]    = useState<Transfert[]>([]);

  const [searchUser,       setSearchUser]       = useState("");
  const [filterPlan,       setFilterPlan]       = useState("");
  const [filterStatus,     setFilterStatus]     = useState("");
  const [searchBoutique,   setSearchBoutique]   = useState("");
  const [expandedBoutique, setExpandedBoutique] = useState<string | null>(null);

  const [actionModal,  setActionModal]  = useState<{ type: string; target: any; targetType: "user" | "produit" | "boutique" } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [premiumDays,  setPremiumDays]  = useState("30");

  const [selectedUser,     setSelectedUser]     = useState<NexoraUser | null>(null);
  const [adminFeatures,    setAdminFeatures]    = useState<string[]>([]);
  const [adminPassword,    setAdminPassword]    = useState("");
  const [newPassword,      setNewPassword]      = useState("");
  const [confirmPassword,  setConfirmPassword]  = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess,  setPasswordSuccess]  = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  const [detteModal,   setDetteModal]   = useState<NexoraUser | null>(null);
  const [detteMontant, setDetteMontant] = useState("");


  useEffect(() => {
    try {
      const auth = sessionStorage.getItem("nexora_admin_auth");
      if (auth === "true") setIsAuthenticated(true);
    } catch {}
  }, []);

  useEffect(() => {
    try { localStorage.setItem("admin_tab", tab); } catch {}
  }, [tab]);

  const handleLogin = () => {
    if (codeInput.trim().toUpperCase() === ADMIN_CODE) {
      try { sessionStorage.setItem("nexora_admin_auth", "true"); } catch {}
      setIsAuthenticated(true);
      setCodeError(false);
    } else {
      setCodeError(true);
      setCodeInput("");
    }
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const safeQuery = async (fn: () => Promise<any>): Promise<any[]> => {
        try {
          const { data, error } = await fn();
          if (error) { console.warn("Supabase query error:", error.message); return []; }
          return data || [];
        } catch (e) { console.warn("Query failed:", e); return []; }
      };

      const [
        usersData, boutiquesData, produitsData, commandesData,
        abonnementsData, logsData, transfertsData,
      ] = await Promise.all([
        safeQuery(async () => await (supabase.from("nexora_users") as any).select("*").order("created_at", { ascending: false })),
        safeQuery(async () => await (supabase.from("boutiques") as any).select("*").order("created_at", { ascending: false })),
        safeQuery(async () => await (supabase.from("produits") as any).select("*").order("created_at", { ascending: false })),
        safeQuery(async () => await (supabase.from("commandes") as any).select("*").order("created_at", { ascending: false })),
        safeQuery(async () => await (supabase.from("abonnements") as any).select("*").order("created_at", { ascending: false })),
        safeQuery(async () => await (supabase.from("nexora_logs") as any).select("*").order("created_at", { ascending: false }).limit(100)),
        safeQuery(async () => await (supabase.from("nexora_transactions") as any).select("*").order("created_at", { ascending: false })),
      ]);

      const u  = usersData       as NexoraUser[];
      const b  = boutiquesData   as Boutique[];
      const p  = produitsData    as Produit[];
      const c  = commandesData   as Commande[];
      const ab = abonnementsData as Abonnement[];
      const tr = transfertsData  as Transfert[];
      const today = new Date().toDateString();

      setUsers(u); setBoutiques(b); setProduits(p); setCommandes(c);
      setAbonnements(ab); setLogs(logsData); setTransferts(tr);

      const ca   = c.reduce((acc, cmd) => acc + (Number(cmd.total) || 0), 0);
      const caAb = ab.filter(a => a.statut === "actif" || a.statut === "paye").reduce((acc, a) => acc + (Number(a.montant) || 0), 0);
      const revenusTransferts = tr.reduce((acc, t) => {
        const frais = Number(t.frais) || (Number(t.montant) * 0.03);
        return acc + frais;
      }, 0);

      setStats({
        totalUsers:           u.length,
        premiumUsers:         u.filter(x => x.plan === "boss" || x.plan === "roi").length,
        gratuitUsers:         u.filter(x => x.plan === "gratuit").length,
        adminUsers:           u.filter(x => x.is_admin).length,
        activeUsers:          u.filter(x => x.status === "actif").length,
        suspendedUsers:       u.filter(x => x.status === "suspendu").length,
        blockedUsers:         u.filter(x => x.status === "bloque").length,
        totalBoutiques:       b.length,
        boutiquesActives:     b.filter(x => x.actif).length,
        totalProduits:        p.length,
        totalCommandes:       c.length,
        chiffreAffairesTotal: ca,
        newUsersToday:        u.filter(x => new Date(x.created_at).toDateString() === today).length,
        newPremiumToday:      u.filter(x => (x.plan === "boss" || x.plan === "roi") && x.premium_since && new Date(x.premium_since).toDateString() === today).length,
        caAbonnements:        caAb,
        totalAbonnements:     ab.length,
        revenusTransferts,
        totalTransferts:      tr.length,
      });
    } catch (err) {
      console.error("loadAll failed:", err);
      toast({ title: "Erreur de chargement", variant: "destructive" });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (isAuthenticated) loadAll();
  }, [isAuthenticated, loadAll]);

  const logAction = async (userId: string | null, action: string, details: string | null) => {
    try { await supabase.from("nexora_logs" as any).insert({ user_id: userId, action, details }); } catch {}
  };

  const sendNotification = async (userId: string, titre: string, message: string, type = "warning") => {
    try {
      await supabase.from("nexora_notifications" as any).insert({ user_id: userId, titre, message, type, lu: false });
    } catch {}
  };

  const getBoutiquesByUser     = (id: string) => boutiques.filter(b => b.user_id === id);
  const getProduitsByBoutique  = (id: string) => produits.filter(p => p.boutique_id === id);
  const getCommandesByBoutique = (id: string) => commandes.filter(c => c.boutique_id === id);
  const getCaByBoutique        = (id: string) => getCommandesByBoutique(id).reduce((a, c) => a + (Number(c.total) || 0), 0);
  const getCommandesByUser     = (id: string) => getBoutiquesByUser(id).flatMap(b => getCommandesByBoutique(b.id));
  const getCaByUser            = (id: string) => getBoutiquesByUser(id).reduce((a, b) => a + getCaByBoutique(b.id), 0);

  const openActionModal = (type: string, target: any, targetType: "user" | "produit" | "boutique") => {
    setActionReason(""); setPremiumDays("30");
    setActionModal({ type, target, targetType });
  };

  const handleAction = async () => {
    if (!actionModal) return;
    const { type, target, targetType } = actionModal;
    try {
      if (targetType === "produit") {
        const boutique = boutiques.find(b => b.id === target.boutique_id);
        const userId = boutique?.user_id;
        if (type === "supprimer_produit") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          // Supprimer d'abord les dépendances FK
          await supabase.from("variations_produit" as any).delete().eq("produit_id", target.id);
          await supabase.from("commandes" as any).update({ produit_id: null }).eq("produit_id", target.id);
          await supabase.from("avis_produits" as any).delete().eq("produit_id", target.id);
          await supabase.from("produits" as any).delete().eq("id", target.id);
          if (userId) await sendNotification(userId, "Produit supprimé", `Votre produit "${target.nom}" a été supprimé. Motif : ${actionReason}`);
          await logAction(userId ?? null, "produit_supprimé", `${target.nom} | ${actionReason}`);
          toast({ title: "Produit supprimé" });
        }
        if (type === "restreindre_produit") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("produits" as any).update({ actif: false }).eq("id", target.id);
          if (userId) await sendNotification(userId, "Produit restreint", `Votre produit "${target.nom}" a été restreint. Motif : ${actionReason}`, "danger");
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
          newActif ? `Votre boutique "${target.nom}" a été réactivée.`
                   : `Votre boutique "${target.nom}" a été désactivée.${actionReason ? " Motif : " + actionReason : ""}`,
          newActif ? "success" : "warning");
        await logAction(target.user_id ?? null, newActif ? "boutique_activée" : "boutique_désactivée", target.nom);
        toast({ title: `Boutique ${newActif ? "activée" : "désactivée"}` });
      }

      if (targetType === "user") {
        if (type === "activer_premium") {
          const days = parseInt(premiumDays) || 30;
          const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
          await supabase.from("nexora_users" as any).update({ plan: "roi", badge_premium: true, premium_since: new Date().toISOString(), premium_expires_at: expiresAt }).eq("id", target.id);
          await sendNotification(target.id, "Premium activé !", `Félicitations ! Votre compte est Premium pour ${days} jours.`, "success");
          await logAction(target.id, "premium_activé", `${days} jours`);
          toast({ title: "Premium activé" });
          if (selectedUser?.id === target.id) setSelectedUser(prev => prev ? { ...prev, plan: "roi", badge_premium: true } : prev);
        }
        if (type === "retirer_premium") {
          await supabase.from("nexora_users" as any).update({ plan: "gratuit", badge_premium: false, premium_since: null, premium_expires_at: null }).eq("id", target.id);
          await sendNotification(target.id, "Premium retiré", `Votre abonnement Premium a été retiré.${actionReason ? " Motif : " + actionReason : ""}`, "warning");
          await logAction(target.id, "premium_retiré", actionReason || null);
          toast({ title: "Premium retiré" });
          if (selectedUser?.id === target.id) setSelectedUser(prev => prev ? { ...prev, plan: "gratuit", badge_premium: false } : prev);
        }
        if (type === "suspendre") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("nexora_users" as any).update({ status: "suspendu", is_active: false, suspended_reason: actionReason }).eq("id", target.id);
          await sendNotification(target.id, "Compte suspendu", `Votre compte a été suspendu. Motif : ${actionReason}`, "danger");
          await logAction(target.id, "compte_suspendu", actionReason);
          toast({ title: "Compte suspendu" });
          if (selectedUser?.id === target.id) setSelectedUser(prev => prev ? { ...prev, status: "suspendu", is_active: false } : prev);
        }
        if (type === "bloquer") {
          if (!actionReason.trim()) { toast({ title: "Motif obligatoire", variant: "destructive" }); return; }
          await supabase.from("nexora_users" as any).update({ status: "bloque", is_active: false, blocked_reason: actionReason }).eq("id", target.id);
          await sendNotification(target.id, "Compte bloqué", `Votre compte a été bloqué. Motif : ${actionReason}`, "danger");
          await logAction(target.id, "compte_bloqué", actionReason);
          toast({ title: "Compte bloqué" });
          if (selectedUser?.id === target.id) setSelectedUser(prev => prev ? { ...prev, status: "bloque", is_active: false } : prev);
        }
        if (type === "debloquer") {
          await supabase.from("nexora_users" as any).update({ status: "actif", is_active: true, suspended_reason: null, blocked_reason: null }).eq("id", target.id);
          await sendNotification(target.id, "Compte réactivé", "Votre compte a été réactivé. Bienvenue !", "success");
          await logAction(target.id, "compte_débloqué", null);
          toast({ title: "Compte débloqué" });
          if (selectedUser?.id === target.id) setSelectedUser(prev => prev ? { ...prev, status: "actif", is_active: true } : prev);
        }
        if (type === "supprimer") {
          await supabase.from("nexora_users" as any).delete().eq("id", target.id);
          await logAction(null, "compte_supprimé", `${target.nom_prenom} (${target.email})`);
          toast({ title: "Compte supprimé" });
          setSelectedUser(null);
        }
      }

      setActionModal(null); setActionReason(""); loadAll();
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleGrantAdmin = async (user: NexoraUser) => {
    if (!adminPassword.trim()) { toast({ title: "Mot de passe requis", variant: "destructive" }); return; }
    if (adminFeatures.length === 0) { toast({ title: "Sélectionnez au moins une fonctionnalité", variant: "destructive" }); return; }
    try {
      const { error } = await (supabase as any).from("nexora_users").update({
        is_admin: true,
        admin_features: adminFeatures,
        admin_password: adminPassword,
        plan: user.plan === "gratuit" ? "admin" : user.plan,
      }).eq("id", user.id);
      if (error) throw error;
      await sendNotification(user.id, "✅ Accès Administrateur accordé",
        `Vous avez maintenant accès au Panel Administrateur Nexora.\n\nFonctionnalités : ${adminFeatures.map(f => ALL_ADMIN_FEATURES.find(af => af.key === f)?.label).join(", ")}.`,
        "success");
      await logAction(user.id, "admin_accordé", adminFeatures.join(", "));
      toast({ title: "✅ Accès admin accordé !", description: `${user.nom_prenom} peut maintenant accéder au Panel Admin.` });
      setAdminFeatures([]); setAdminPassword("");
      setSelectedUser(prev => prev ? { ...prev, is_admin: true, admin_features: adminFeatures, admin_password: adminPassword } : prev);
      loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleRevokeAdmin = async (user: NexoraUser) => {
    try {
      const { error } = await (supabase as any).from("nexora_users").update({ is_admin: false, admin_features: [], admin_password: null }).eq("id", user.id);
      if (error) throw error;
      await sendNotification(user.id, "Accès Admin retiré", "Votre accès au Panel Administrateur a été retiré.", "warning");
      await logAction(user.id, "admin_retiré", null);
      toast({ title: "Accès admin retiré" });
      setSelectedUser(prev => prev ? { ...prev, is_admin: false, admin_features: [], admin_password: null } : prev);
      loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
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
      toast({ title: "Dette effacée" });
      setSelectedUser(prev => prev ? { ...prev, dette_cachee: 0, dette_active: false } : prev);
      loadAll();
    } catch (err: any) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); }
  };

  const handleChangeUserPassword = async (user: NexoraUser) => {
    if (!newPassword.trim()) { toast({ title: "Mot de passe requis", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Les mots de passe ne correspondent pas", variant: "destructive" }); return; }
    if (newPassword.length < 6) { toast({ title: "Minimum 6 caractères", variant: "destructive" }); return; }
    setChangingPassword(true); setPasswordSuccess(false);
    try {
      // Hash the new password using the same method as registration
      const { hashPassword } = await import("@/lib/nexora-auth");
      const newHash = await hashPassword(newPassword);
      const { error: updateError } = await (supabase as any).from("nexora_users").update({ 
        password_plain: newPassword,
        password_hash: newHash
      }).eq("id", user.id);
      if (updateError) throw updateError;
      await logAction(user.id, "mot_de_passe_modifié", "par admin");
      setPasswordSuccess(true);
      toast({ title: "✅ Mot de passe modifié", description: `Le mot de passe de ${user.nom_prenom} a été mis à jour.` });
      setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Erreur modification mot de passe", description: err.message, variant: "destructive" });
    } finally { setChangingPassword(false); }
  };

  const filteredUsers = users.filter(u => {
    const q = searchUser.toLowerCase();
    return (
      (u.nom_prenom.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (filterPlan ? u.plan === filterPlan : true) &&
      (filterStatus ? u.status === filterStatus : true)
    );
  });

  const filteredBoutiques = boutiques.filter(b => b.nom.toLowerCase().includes(searchBoutique.toLowerCase()));

  const TABS = [
    { id: "stats",       label: "Statistiques", icon: BarChart3        },
    { id: "users",       label: "Utilisateurs",  icon: Users            },
    { id: "boutiques",   label: "Boutiques",     icon: Store            },
    { id: "abonnements", label: "Abonnements",   icon: Crown            },
    { id: "logs",        label: "Logs",          icon: Activity         },
  ];

  // ════════════ LOGIN ════════════
  if (!isAuthenticated) {
    return (
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
              autoFocus
            />
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
  }

  // ════════════ PAGE DÉTAIL UTILISATEUR ════════════
  if (selectedUser) {
    const u = selectedUser;
    const userBoutiques = getBoutiquesByUser(u.id);
    const userCommandes = getCommandesByUser(u.id);
    const userCa        = getCaByUser(u.id);
    const userAbo       = abonnements.filter(a => a.user_id === u.id);
    const StatusIcon    = STATUS_CONFIG[u.status]?.icon || CheckCircle;
    const hasDette      = u.dette_active && (u.dette_cachee ?? 0) > 0;
    const currentFeatures: string[] = u.admin_features || [];

    return (
      <div className="min-h-screen bg-background pb-16">
        <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
          <button onClick={() => {
            setSelectedUser(null);
            setAdminFeatures([]); setAdminPassword("");
            setNewPassword(""); setConfirmPassword("");
            setPasswordSuccess(false); setShowUserPassword(false);
          }} className="p-2 rounded-xl hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="font-black text-base truncate">{u.nom_prenom}</div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
          </div>
          <span className={`text-xs px-2 py-1 rounded-full font-bold flex items-center gap-1 ${STATUS_CONFIG[u.status]?.bg} ${STATUS_CONFIG[u.status]?.color}`}>
            <StatusIcon className="w-3 h-3" />{STATUS_CONFIG[u.status]?.label}
          </span>
        </div>

        <div className="p-4 max-w-xl mx-auto space-y-4">
          {/* Profil */}
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
              </div>
            </div>
          </div>

          {hasDette && (
            <div className="bg-red-50 border border-red-300 rounded-xl p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-red-700">
                <MinusCircle className="w-4 h-4 flex-shrink-0" />
                <div>
                  <div className="font-bold text-sm">Dette cachée active</div>
                  <div className="text-xs">{fmtMoney(u.dette_cachee ?? 0)}</div>
                </div>
              </div>
              <button onClick={() => handleClearDette(u)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium flex-shrink-0">Effacer</button>
            </div>
          )}

          {(u.plan === "boss" || u.plan === "roi") && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-violet-700 font-bold mb-2"><Crown className="w-4 h-4" /> Premium</div>
              <div className="text-xs text-violet-600 space-y-1">
                <div>Depuis : {fmtDate(u.premium_since)}</div>
                <div className={u.premium_expires_at && new Date(u.premium_expires_at) < new Date() ? "text-red-500 font-semibold" : ""}>
                  Expire : {fmtDate(u.premium_expires_at)}
                </div>
              </div>
            </div>
          )}

          {/* Mot de passe connexion Nexora */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-2">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-blue-500" /> Mot de passe Nexora
            </div>
            <p className="text-xs text-muted-foreground">Mot de passe de connexion de cet utilisateur sur Nexora.</p>
            {showUserPassword ? (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                <code className="text-base font-black text-blue-800 font-mono tracking-widest select-all break-all flex-1">
                  {(u.password_plain && u.password_plain.trim() !== "")
                    ? u.password_plain
                    : <span className="text-blue-400 font-normal italic text-sm">Non enregistré en clair</span>
                  }
                </code>
                <button onClick={() => setShowUserPassword(false)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-blue-200 text-blue-800 hover:bg-blue-300 font-semibold flex-shrink-0">
                  <Lock className="w-3.5 h-3.5 inline mr-1" />Masquer
                </button>
              </div>
            ) : (
              <button onClick={() => setShowUserPassword(true)}
                className="w-full flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-xl bg-blue-100 text-blue-700 hover:bg-blue-200 font-semibold transition-colors border border-blue-200">
                <Unlock className="w-4 h-4" /> Révéler le mot de passe
              </button>
            )}
          </div>

          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-emerald-700 font-bold mb-3"><TrendingUp className="w-4 h-4" /> Chiffre d'affaires</div>
            <div className="text-2xl font-black text-emerald-700 mb-2">{fmtMoney(userCa)}</div>
            <div className="text-xs text-emerald-600">{userCommandes.length} commande(s) · {userBoutiques.length} boutique(s)</div>
            {userBoutiques.length > 0 && (
              <div className="mt-3 space-y-1">
                {userBoutiques.map(b => (
                  <div key={b.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
                    <span className="font-medium">{b.nom}</span>
                    <span className="text-emerald-600 font-bold">{fmtMoney(getCaByBoutique(b.id))}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

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

          {/* Actions compte */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Actions compte</div>
            <div className="flex flex-wrap gap-2">
              {u.status === "actif" && !u.is_admin && (
                <>
                  <button onClick={() => openActionModal("suspendre", u, "user")}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-semibold transition-colors">
                    <AlertTriangle className="w-3.5 h-3.5" /> Suspendre
                  </button>
                  <button onClick={() => openActionModal("bloquer", u, "user")}
                    className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors">
                    <Ban className="w-3.5 h-3.5" /> Bloquer
                  </button>
                </>
              )}
              {(u.status === "suspendu" || u.status === "bloque") && (
                <button onClick={() => openActionModal("debloquer", u, "user")}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-green-100 text-green-700 hover:bg-green-200 font-semibold transition-colors">
                  <Unlock className="w-3.5 h-3.5" /> Réactiver
                </button>
              )}
              {u.plan !== "boss" && u.plan !== "roi" && !u.is_admin && (
                <button onClick={() => openActionModal("activer_premium", u, "user")}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-violet-100 text-violet-700 hover:bg-violet-200 font-semibold transition-colors">
                  <Crown className="w-3.5 h-3.5" /> Activer Premium
                </button>
              )}
              {(u.plan === "boss" || u.plan === "roi") && (
                <button onClick={() => openActionModal("retirer_premium", u, "user")}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors">
                  <UserX className="w-3.5 h-3.5" /> Retirer Premium
                </button>
              )}
            </div>

            {(() => {
              const userProduits = userBoutiques.flatMap(b => getProduitsByBoutique(b.id));
              if (userProduits.length === 0) return null;
              return (
                <div>
                  <div className="text-xs font-bold text-muted-foreground uppercase mb-2">Produits boutique ({userProduits.length})</div>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userProduits.map(produit => (
                      <div key={produit.id} className="flex items-center justify-between bg-muted rounded-lg px-3 py-2 text-xs gap-2">
                        <span className="font-medium flex-1 truncate">{produit.nom}</span>
                        <span className={`px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${produit.actif ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {produit.actif ? "Actif" : "Restreint"}
                        </span>
                        <div className="flex gap-1 flex-shrink-0">
                          {produit.actif ? (
                            <button onClick={() => openActionModal("restreindre_produit", produit, "produit")}
                              className="px-2 py-1 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium transition-colors">Désact.</button>
                          ) : (
                            <button onClick={() => openActionModal("activer_produit", produit, "produit")}
                              className="px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium transition-colors">Activer</button>
                          )}
                          <button onClick={() => openActionModal("supprimer_produit", produit, "produit")}
                            className="px-2 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {!u.is_admin && (
              <button onClick={() => openActionModal("supprimer", u, "user")}
                className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-500 hover:text-white font-semibold transition-colors w-full justify-center">
                <Trash2 className="w-3.5 h-3.5" /> Supprimer le compte
              </button>
            )}
          </div>

          {/* Dette cachée */}
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <MinusCircle className="w-4 h-4 text-red-500" /> Gestion Dette Cachée
            </div>
            <p className="text-xs text-muted-foreground">Mode silencieux — aucune notification.</p>
            {hasDette ? (
              <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-xl p-3">
                <div>
                  <div className="text-sm font-bold text-red-700">Dette : {fmtMoney(u.dette_cachee ?? 0)}</div>
                  <div className="text-xs text-red-500">Active</div>
                </div>
                <button onClick={() => handleClearDette(u)} className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">Effacer</button>
              </div>
            ) : (
              <button onClick={() => setDetteModal(u)}
                className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-red-100 text-red-700 hover:bg-red-200 font-semibold transition-colors w-full justify-center">
                <MinusCircle className="w-4 h-4" /> Appliquer une dette cachée
              </button>
            )}
          </div>

          {/* ── Gestion Crypto P2P ── */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="font-bold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
              <ArrowRightLeft className="w-4 h-4 text-amber-500" /> Crypto P2P
            </div>
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="text-2xl">🚀</div>
              <div>
                <div className="text-sm font-bold text-amber-700">Bientôt en ligne</div>
                <div className="text-xs text-amber-600">La gestion crypto P2P sera disponible prochainement.</div>
              </div>
            </div>
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
              <Input type="password" placeholder="Nouveau mot de passe (min. 6 caractères)..." value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordSuccess(false); }} className="rounded-xl" autoComplete="new-password" />
              <Input type="password" placeholder="Confirmer le mot de passe..." value={confirmPassword}
                onChange={e => { setConfirmPassword(e.target.value); setPasswordSuccess(false); }} className="rounded-xl" autoComplete="new-password" />
              {newPassword && confirmPassword && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 flex items-center gap-1"><XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas.</p>
              )}
              <button onClick={() => handleChangeUserPassword(u)}
                disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword || newPassword.length < 6}
                className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-colors w-full justify-center">
                {changingPassword
                  ? <><div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" /> Modification...</>
                  : <><Lock className="w-4 h-4" /> Enregistrer le nouveau mot de passe</>
                }
              </button>
            </div>
          </div>
        </div>

        {/* Modals vue détail */}
        {actionModal && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4" onClick={e => e.target === e.currentTarget && setActionModal(null)}>
            <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
              <h3 className="font-black text-lg">
                {actionModal.type === "activer_premium"     && "Activer Premium"}
                {actionModal.type === "retirer_premium"     && "Retirer Premium"}
                {actionModal.type === "suspendre"           && "Suspendre le compte"}
                {actionModal.type === "bloquer"             && "Bloquer le compte"}
                {actionModal.type === "debloquer"           && "Débloquer le compte"}
                {actionModal.type === "supprimer"           && "Supprimer le compte"}
                {actionModal.type === "supprimer_produit"   && "Supprimer le produit"}
                {actionModal.type === "restreindre_produit" && "Restreindre le produit"}
                {actionModal.type === "activer_produit"     && "Réactiver le produit"}
              </h3>
              {actionModal.type === "activer_premium" && (
                <div>
                  <label className="text-sm font-medium">Durée (jours)</label>
                  <Input type="number" value={premiumDays} onChange={e => setPremiumDays(e.target.value)} className="mt-1" placeholder="30" />
                </div>
              )}
              {["retirer_premium", "suspendre", "bloquer", "supprimer", "supprimer_produit", "restreindre_produit"].includes(actionModal.type) && (
                <div>
                  <label className="text-sm font-medium mb-1 block">
                    Motif {["supprimer", "retirer_premium"].includes(actionModal.type) ? "(optionnel)" : "*"}
                  </label>
                  <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                    className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none outline-none focus:border-primary transition-colors"
                    placeholder="Précisez le motif..." autoFocus />
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleAction} className={`flex-1 text-white ${
                  ["supprimer", "bloquer", "supprimer_produit"].includes(actionModal.type) ? "bg-red-600 hover:bg-red-700" :
                  ["suspendre", "restreindre_produit"].includes(actionModal.type) ? "bg-yellow-600 hover:bg-yellow-700" :
                  ["debloquer", "activer_premium", "activer_produit"].includes(actionModal.type) ? "bg-green-600 hover:bg-green-700" :
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

  // ════════════ RÉINITIALISATION DU CODE PIN ════════════
import { useState } from "react";
import { KeyRound, RotateCcw, ShieldOff, Check, X, AlertTriangle, Lock } from "lucide-react";
import PinInput from "@/components/auth/PinInput";
import { adminResetPin, adminSetPin } from "@/services/pinService";
import { getNexoraUser } from "@/lib/nexora-auth";

interface AdminPinManagerProps {
  targetUserId: string;
  targetUserName: string;
  hasPinSet: boolean;
  onDone?: () => void;
}

type Mode = "idle" | "reset" | "set";

export default function AdminPinManager({
  targetUserId,
  targetUserName,
  hasPinSet,
  onDone,
}: AdminPinManagerProps) {
  const adminUser = getNexoraUser();
  const [mode, setMode] = useState<Mode>("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pinKey, setPinKey] = useState(0);

  const handleReset = async () => {
    if (!adminUser) return;
    setLoading(true);
    setResult(null);
    const res = await adminResetPin(adminUser.id, targetUserId);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? `PIN de ${targetUserName} réinitialisé. L'utilisateur devra en créer un nouveau.`
        : res.error || "Erreur lors de la réinitialisation.",
    });
    if (res.success) {
      setTimeout(() => { setMode("idle"); setResult(null); onDone?.(); }, 2500);
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!adminUser) return;
    setLoading(true);
    setResult(null);
    const res = await adminSetPin(adminUser.id, targetUserId, pin);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? `Nouveau PIN défini pour ${targetUserName}.`
        : res.error || "Erreur lors de la définition du PIN.",
    });
    if (res.success) {
      setTimeout(() => { setMode("idle"); setResult(null); setPinKey((k) => k + 1); onDone?.(); }, 2500);
    }
  };

  return (
    <div style={{
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(0,255,120,0.15)",
      borderRadius: 12,
      padding: "14px 16px",
      marginTop: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <KeyRound className="w-4 h-4" style={{ color: "#00ff78" }} />
        <span style={{ color: "#f0fdf4", fontSize: "0.82rem", fontWeight: 600, fontFamily: "'Courier New', monospace" }}>
          Gestion du PIN
        </span>
        <div style={{
          marginLeft: "auto",
          padding: "2px 8px", borderRadius: 20,
          background: hasPinSet ? "rgba(0,255,120,0.1)" : "rgba(255,165,0,0.1)",
          border: hasPinSet ? "1px solid rgba(0,255,120,0.3)" : "1px solid rgba(255,165,0,0.3)",
          color: hasPinSet ? "#00ff78" : "#ffaa00",
          fontSize: "0.65rem",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.05em",
        }}>
          {hasPinSet ? "PIN DÉFINI" : "PAS DE PIN"}
        </div>
      </div>

      {mode === "idle" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("set")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(0,255,120,0.08)", border: "1px solid rgba(0,255,120,0.25)",
              color: "#00ff78", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,255,120,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,255,120,0.08)"}
          >
            <Lock className="w-3.5 h-3.5" />
            Définir PIN
          </button>
          {hasPinSet && (
            <button
              onClick={() => setMode("reset")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.25)",
                color: "#ffaa00", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,165,0,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,165,0,0.08)"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Set PIN mode */}
      {mode === "set" && !result && (
        <div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: 12, textAlign: "center" }}>
            Définir un nouveau PIN pour <strong style={{ color: "#f0fdf4" }}>{targetUserName}</strong>
          </p>
          <PinInput key={pinKey} onComplete={handleSetPin} disabled={loading} />
          <button
            onClick={() => setMode("idle")}
            style={{
              display: "block", width: "100%", marginTop: 10,
              padding: "6px", background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Reset confirmation mode */}
      {mode === "reset" && !result && (
        <div>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12,
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)",
          }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ffaa00" }} />
            <p style={{ color: "rgba(255,200,0,0.8)", fontSize: "0.75rem", lineHeight: 1.4 }}>
              Cela supprimera le PIN de <strong>{targetUserName}</strong>. L'utilisateur devra en créer un nouveau à sa prochaine connexion.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)",
                color: "#ffaa00", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              {loading ? "..." : "Confirmer"}
            </button>
            <button
              onClick={() => setMode("idle")}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: 8,
          background: result.success ? "rgba(0,255,120,0.08)" : "rgba(255,68,68,0.08)",
          border: result.success ? "1px solid rgba(0,255,120,0.25)" : "1px solid rgba(255,68,68,0.25)",
          color: result.success ? "#00ff78" : "#ff6b6b",
          fontSize: "0.78rem",
        }}>
          {result.success
            ? <Check className="w-4 h-4 flex-shrink-0" />
            : <X className="w-4 h-4 flex-shrink-0" />
          }
          {result.message}
        </div>
      )}
    </div>
  );
}
  
  // ════════════ PANEL PRINCIPAL ════════════
  return (
    <div className="min-h-screen bg-background">
      {menuOpen && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMenuOpen(false)} />}

      {/* Menu burger */}
      <div className={`fixed top-0 left-0 h-full z-50 w-72 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 flex flex-col ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-500" />
            <span className="font-black text-lg">Panel Admin</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="p-1.5 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => { setTab(t.id as AdminTab); setMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${tab === t.id ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <button onClick={() => navigate(-1)} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <button onClick={() => { try { sessionStorage.removeItem("nexora_admin_auth"); } catch {} setIsAuthenticated(false); }}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
            <XCircle className="w-4 h-4" /> Déconnexion admin
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => setMenuOpen(true)} className="p-2 rounded-xl hover:bg-muted transition-colors"><Menu className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 flex-1">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span className="font-black text-base">{TABS.find(t => t.id === tab)?.label}</span>
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
                  <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <Icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  </div>
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

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Boutiques & Commerce</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Boutiques", value: stats.totalBoutiques,  icon: Store,        color: "text-pink-600"   },
                { label: "Actives",   value: stats.boutiquesActives, icon: CheckCircle,  color: "text-green-600"  },
                { label: "Produits",  value: stats.totalProduits,    icon: Package,      color: "text-blue-600"   },
                { label: "Commandes", value: stats.totalCommandes,   icon: ShoppingCart, color: "text-purple-600" },
              ].map(s => { const Icon = s.icon; return (
                <div key={s.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                  <Icon className={`w-6 h-6 ${s.color} flex-shrink-0`} />
                  <div>
                    <div className="text-xs text-muted-foreground">{s.label}</div>
                    <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                  </div>
                </div>
              ); })}
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="text-xs text-emerald-600 font-semibold">CA total Boutiques</div>
                <div className="text-2xl font-black text-emerald-700">{fmtMoney(stats.chiffreAffairesTotal)}</div>
              </div>
            </div>

            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mes revenus Nexora</p>
            <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
              <Crown className="w-5 h-5 text-violet-600 mb-2" />
              <div className="text-xs text-violet-600 font-semibold mb-1">Revenus Abonnements</div>
              <div className="text-2xl font-black text-violet-700">{fmtMoney(stats.caAbonnements)}</div>
              <div className="text-xs text-violet-500 mt-0.5">{stats.totalAbonnements} abonnement(s)</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Calendar className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Nouveaux aujourd'hui</div>
                  <div className="text-2xl font-black text-blue-600">{stats.newUsersToday}</div>
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
                <Crown className="w-8 h-8 text-violet-500" />
                <div>
                  <div className="text-xs text-muted-foreground">Nouveaux premium</div>
                  <div className="text-2xl font-black text-violet-600">{stats.newPremiumToday}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── UTILISATEURS ── */}
        {tab === "users" && (
          <div className="space-y-4">
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
                const userCa = getCaByUser(user.id);
                const hasDette = user.dette_active && (user.dette_cachee ?? 0) > 0;
                return (
                  <button key={user.id} onClick={() => {
                    setSelectedUser(user);
                    setNewPassword(""); setConfirmPassword(""); setPasswordSuccess(false);
                    setAdminFeatures([]); setAdminPassword(""); setShowUserPassword(false);
                  }}
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
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchBoutique} onChange={e => setSearchBoutique(e.target.value)} placeholder="Rechercher une boutique..." className="pl-9" />
            </div>
            <p className="text-xs text-muted-foreground">{filteredBoutiques.length} boutique(s)</p>
            <div className="space-y-3">
              {filteredBoutiques.map(boutique => {
                const isExpanded = expandedBoutique === boutique.id;
                const produitsBoutique = getProduitsByBoutique(boutique.id);
                const commandesBoutique = getCommandesByBoutique(boutique.id);
                const ca = getCaByBoutique(boutique.id);
                const owner = users.find(u => u.id === boutique.user_id);
                return (
                  <div key={boutique.id} className="bg-card border border-border rounded-2xl overflow-hidden">
                    <div className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                          <Store className="w-5 h-5 text-pink-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{boutique.nom}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${boutique.actif ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {boutique.actif ? "Active" : "Inactive"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">/{boutique.slug} · {owner?.nom_prenom || "Inconnu"}</div>
                          <div className="flex items-center gap-3 mt-1 text-xs flex-wrap">
                            <span className="text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" />{produitsBoutique.length}</span>
                            <span className="text-muted-foreground flex items-center gap-1"><ShoppingCart className="w-3 h-3" />{commandesBoutique.length}</span>
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
                      <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                        {produitsBoutique.map(produit => {
                          const photos = produit.photos;
                          const photo = Array.isArray(photos) && photos.length > 0 ? photos[0] : null;
                          return (
                            <div key={produit.id} className="bg-background border border-border rounded-xl p-3 flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0 overflow-hidden">
                                {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground" /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-sm truncate">{produit.nom}</div>
                                <div className="text-xs text-muted-foreground">{fmtMoney(produit.prix)}</div>
                              </div>
                              <div className="flex flex-col gap-1.5 flex-shrink-0">
                                {produit.actif ? (
                                  <button onClick={() => openActionModal("restreindre_produit", produit, "produit")}
                                    className="text-xs px-2.5 py-1.5 rounded-lg bg-yellow-100 text-yellow-700 hover:bg-yellow-200 font-medium">Restreindre</button>
                                ) : (
                                  <button onClick={() => openActionModal("activer_produit", produit, "produit")}
                                    className="text-xs px-2.5 py-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 font-medium">Activer</button>
                                )}
                                <button onClick={() => openActionModal("supprimer_produit", produit, "produit")}
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 font-medium">Supprimer</button>
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

        {/* ── ABONNEMENTS ── */}
        {tab === "abonnements" && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 text-white">
              <div className="text-sm font-semibold opacity-80 mb-1">Revenus Abonnements</div>
              <div className="text-3xl font-black">{fmtMoney(stats.caAbonnements)}</div>
              <div className="text-xs opacity-70 mt-1">{stats.totalAbonnements} abonnement(s)</div>
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

        {tab === "logs" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{logs.length} entrées</p>
              <Button variant="outline" size="sm" onClick={() => {
                if (window.confirm("Vider tous les logs ?")) {
                  supabase.from("nexora_logs" as any).delete()
                    .neq("id", "00000000-0000-0000-0000-000000000000")
                    .then(() => { toast({ title: "Logs vidés" }); loadAll(); });
                }
              }} className="gap-1 text-xs"><Trash2 className="w-3.5 h-3.5" /> Vider</Button>
            </div>
            {logs.map(log => (
              <div key={log.id} className="bg-card border border-border rounded-xl px-4 py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Activity className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-primary">{log.action}</span>
                    {log.nexora_users && <span className="text-xs text-muted-foreground">@{(log.nexora_users as any).username}</span>}
                  </div>
                  {log.details && <p className="text-xs text-muted-foreground mt-0.5 truncate">{log.details}</p>}
                </div>
                <div className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
                  <Clock className="w-3 h-3" />{fmtDatetime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal actions panel principal */}
      {actionModal && (
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
            </h3>
            {actionModal.type === "activer_premium" && (
              <div>
                <label className="text-sm font-medium">Durée (jours)</label>
                <Input type="number" value={premiumDays} onChange={e => setPremiumDays(e.target.value)} className="mt-1" placeholder="30" autoFocus />
              </div>
            )}
            {["retirer_premium", "suspendre", "bloquer", "supprimer", "supprimer_produit", "restreindre_produit", "toggle_boutique"].includes(actionModal.type) && (
              <div>
                <label className="text-sm font-medium mb-1 block">
                  Motif {["supprimer", "toggle_boutique", "retirer_premium"].includes(actionModal.type) ? "(optionnel)" : "*"}
                </label>
                <textarea value={actionReason} onChange={e => setActionReason(e.target.value)}
                  className="w-full min-h-[80px] px-3 py-2 text-sm rounded-xl border border-input bg-background resize-none outline-none focus:border-primary transition-colors"
                  placeholder="Précisez le motif..." />
              </div>
            )}
            <div className="flex gap-2">
              <Button onClick={handleAction} className={`flex-1 text-white ${
                ["supprimer", "bloquer", "supprimer_produit"].includes(actionModal.type) ? "bg-red-600 hover:bg-red-700" :
                ["suspendre", "restreindre_produit"].includes(actionModal.type) ? "bg-yellow-600 hover:bg-yellow-700" :
                ["debloquer", "activer_premium", "activer_produit"].includes(actionModal.type) ? "bg-green-600 hover:bg-green-700" :
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
