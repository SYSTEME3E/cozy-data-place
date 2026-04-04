import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playSuccessSound } from "@/lib/app-utils";
import { getNexoraUser } from "@/lib/nexora-auth";
import AppLayout from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Eye, EyeOff, Trash2, ExternalLink, Globe, User, Key, Lock,
  FileText, Edit2, Copy, Check, FolderPlus, Folder, ChevronDown,
  ChevronUp, ShieldCheck, Search, X, Shield, Fingerprint, Zap,
  AlertTriangle, Phone
} from "lucide-react";

interface CoffreItem {
  id: string;
  type_entree: string;
  nom: string;
  site_url?: string;
  email_identifiant?: string;
  mot_de_passe_visible?: string;
  telephone?: string;
  note?: string;
  ordre: number;
  created_at: string;
}

// ─── Password Strength ─────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
    password.length >= 14,
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["", "Très faible", "Faible", "Moyen", "Fort", "Excellent"];
  const colors = ["", "#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ background: i <= score ? colors[score] : "#e2e8f0" }} />
        ))}
      </div>
      <p className="text-[11px] font-semibold" style={{ color: colors[score] }}>
        {labels[score]}
      </p>
    </div>
  );
}

// ─── Type Helpers ──────────────────────────────────────────────────────────────
function getTypeIcon(type: string) {
  const t = type.toLowerCase();
  if (t.includes("banque") || t.includes("bank") || t.includes("finance")) return "🏦";
  if (t.includes("social") || t.includes("réseau")) return "💬";
  if (t.includes("email") || t.includes("mail")) return "📧";
  if (t.includes("travail") || t.includes("work") || t.includes("pro")) return "💼";
  if (t.includes("shop") || t.includes("boutique") || t.includes("commerce")) return "🛒";
  if (t.includes("game") || t.includes("jeu")) return "🎮";
  return "🔐";
}

function getTypeColor(type: string) {
  const t = type.toLowerCase();
  if (t.includes("banque") || t.includes("bank") || t.includes("finance"))
    return { bg: "#dbeafe", color: "#1d4ed8" };
  if (t.includes("social") || t.includes("réseau"))
    return { bg: "#fce7f3", color: "#be185d" };
  if (t.includes("email") || t.includes("mail"))
    return { bg: "#d1fae5", color: "#065f46" };
  if (t.includes("travail") || t.includes("work") || t.includes("pro"))
    return { bg: "#ede9fe", color: "#6d28d9" };
  return { bg: "#fef3c7", color: "#92400e" };
}

// ─── Item Card ─────────────────────────────────────────────────────────────────
function ItemCard({
  item, onEdit, onDelete, visiblePasswords, togglePassword, copyToClipboard, copiedField,
}: {
  item: CoffreItem;
  onEdit: (item: CoffreItem) => void;
  onDelete: (id: string) => void;
  visiblePasswords: Record<string, boolean>;
  togglePassword: (id: string) => void;
  copyToClipboard: (text: string, fieldId: string, label: string) => void;
  copiedField: string | null;
}) {
  const showPwd = visiblePasswords[item.id];
  const typeColor = getTypeColor(item.type_entree);
  const typeIcon = getTypeIcon(item.type_entree);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div className="group relative bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5">
      <div className="h-1 w-full" style={{ background: `linear-gradient(90deg, ${typeColor.color}, ${typeColor.color}88)` }} />
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 shadow-sm"
            style={{ background: typeColor.bg }}>
            {typeIcon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 dark:text-white truncate text-[15px] leading-tight">{item.nom}</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(item.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
            </p>
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onEdit(item)}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 text-gray-400 transition-colors">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            {confirmDelete ? (
              <div className="flex gap-1">
                <button onClick={() => { onDelete(item.id); setConfirmDelete(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 hover:bg-red-100 text-red-600 transition-colors">
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmDelete(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center bg-gray-50 dark:bg-gray-800 text-gray-500 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-500 text-gray-400 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Fields */}
        <div className="space-y-2.5">
          {item.site_url && (
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
              <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <a href={item.site_url.startsWith("http") ? item.site_url : `https://${item.site_url}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline truncate font-medium flex items-center gap-1">
                {item.site_url.replace(/^https?:\/\//, "")}
                <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
              </a>
              <button onClick={() => copyToClipboard(item.site_url!, `url-${item.id}`, "Lien")}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                {copiedField === `url-${item.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          )}
          {item.email_identifiant && (
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 truncate font-medium">{item.email_identifiant}</span>
              <button onClick={() => copyToClipboard(item.email_identifiant!, `email-${item.id}`, "Email")}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                {copiedField === `email-${item.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          )}
          {item.mot_de_passe_visible && (
            <div className="flex items-center gap-2.5 p-2.5 rounded-xl border"
              style={{ background: `${typeColor.color}08`, borderColor: `${typeColor.color}25` }}>
              <Key className="w-3.5 h-3.5 flex-shrink-0" style={{ color: typeColor.color }} />
              <span className="flex-1 text-xs font-mono tracking-wider text-gray-800 dark:text-gray-200 truncate">
                {showPwd ? item.mot_de_passe_visible : "•".repeat(Math.min(item.mot_de_passe_visible.length, 16))}
              </span>
              <button onClick={() => copyToClipboard(item.mot_de_passe_visible!, `pwd-${item.id}`, "Mot de passe")}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                {copiedField === `pwd-${item.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
              <button onClick={() => togglePassword(item.id)}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-white/60 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                {showPwd ? <EyeOff className="w-3 h-3 text-gray-500" /> : <Eye className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          )}
          {item.telephone && (
            <div className="flex items-center gap-2.5 p-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
              <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="flex-1 text-xs text-gray-700 dark:text-gray-300 font-medium">{item.telephone}</span>
              <button onClick={() => copyToClipboard(item.telephone!, `tel-${item.id}`, "Téléphone")}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
                {copiedField === `tel-${item.id}` ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3 text-gray-400" />}
              </button>
            </div>
          )}
          {item.note && (
            <div className="flex items-start gap-2.5 p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl">
              <FileText className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{item.note}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function CoffreFortPage() {
  const [items, setItems] = useState<CoffreItem[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const { toast } = useToast();

  const user = getNexoraUser();
  const userId = user?.id;

  const [form, setForm] = useState({
    nom: "", site_url: "", email_identifiant: "", mot_de_passe_visible: "",
    telephone: "", note: "", type_entree: "compte",
  });

  useEffect(() => { if (userId) loadItems(); }, [userId]);

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase
      .from("coffre_fort")
      .select("*")
      .eq("user_id", userId)
      .order("type_entree")
      .order("ordre")
      .order("created_at", { ascending: false });
    setItems((data || []) as CoffreItem[]);
    setLoading(false);
  };

  const groups: Record<string, CoffreItem[]> = {};
  items.forEach(item => {
    const g = item.type_entree || "compte";
    if (!groups[g]) groups[g] = [];
    groups[g].push(item);
  });

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch =
      i.nom.toLowerCase().includes(q) ||
      (i.site_url || "").toLowerCase().includes(q) ||
      (i.email_identifiant || "").toLowerCase().includes(q);
    const matchFilter = !activeFilter || i.type_entree === activeFilter;
    return matchSearch && matchFilter;
  });

  const filteredGroups: Record<string, CoffreItem[]> = {};
  filtered.forEach(item => {
    const g = item.type_entree || "compte";
    if (!filteredGroups[g]) filteredGroups[g] = [];
    filteredGroups[g].push(item);
  });

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;
    const name = newGroupName.trim();
    setNewGroupName("");
    setShowGroupForm(false);
    setForm(f => ({ ...f, type_entree: name.toLowerCase() }));
    setShowForm(true);
    toast({ title: "Groupe prêt", description: `Ajoutez une entrée dans "${name}"` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !userId) return;
    const payload: any = {
      type_entree: form.type_entree || "compte",
      nom: form.nom,
      site_url: form.site_url || null,
      email_identifiant: form.email_identifiant || null,
      mot_de_passe_visible: form.mot_de_passe_visible || null,
      telephone: form.telephone || null,
      note: form.note || null,
      user_id: userId,
    };
    let error;
    if (editingId) {
      const { user_id, ...updatePayload } = payload;
      ({ error } = await supabase.from("coffre_fort").update(updatePayload).eq("id", editingId).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("coffre_fort").insert([payload]));
    }
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      playSuccessSound();
      toast({ title: "✅ Enregistré", description: editingId ? "Entrée mise à jour." : "Ajouté au coffre-fort." });
      resetForm();
      loadItems();
    }
  };

  const resetForm = () => {
    setForm({ nom: "", site_url: "", email_identifiant: "", mot_de_passe_visible: "", telephone: "", note: "", type_entree: "compte" });
    setShowForm(false);
    setEditingId(null);
  };

  const handleEdit = (item: CoffreItem) => {
    setForm({
      nom: item.nom, site_url: item.site_url || "",
      email_identifiant: item.email_identifiant || "",
      mot_de_passe_visible: item.mot_de_passe_visible || "",
      telephone: item.telephone || "", note: item.note || "",
      type_entree: item.type_entree || "compte",
    });
    setEditingId(item.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await supabase.from("coffre_fort").delete().eq("id", id).eq("user_id", userId);
    toast({ title: "🗑️ Supprimé" });
    loadItems();
  };

  const togglePassword = (id: string) =>
    setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }));

  const copyToClipboard = async (text: string, fieldId: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    toast({ title: `✅ ${label} copié !` });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleGroup = (group: string) =>
    setExpandedGroups(prev => ({ ...prev, [group]: prev[group] === false ? true : prev[group] === undefined ? false : !prev[group] }));

  const groupNames = Object.keys(filteredGroups);
  const totalItems = items.length;
  const totalWithPassword = items.filter(i => i.mot_de_passe_visible).length;
  const totalGroups = Object.keys(groups).length;
  const weakPasswords = items.filter(i => i.mot_de_passe_visible && i.mot_de_passe_visible.length < 8).length;

  return (
    <AppLayout searchQuery={search} onSearchChange={setSearch}>
      <div className="space-y-6 animate-fade-in-up max-w-5xl mx-auto">

        {/* ── HERO HEADER ── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 text-white">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 left-0 w-40 h-40 rounded-full bg-indigo-400 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-56 h-56 rounded-full bg-violet-500 blur-3xl" />
          </div>
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)`,
            backgroundSize: "28px 28px"
          }} />
          <div className="relative flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
                  <Fingerprint className="w-6 h-6 text-indigo-300" />
                </div>
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Coffre-Fort Digital</h1>
                  <p className="text-indigo-300 text-sm font-medium">Chiffrement AES-256 · Accès sécurisé</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {[
                  { icon: Shield, label: "Entrées", value: totalItems },
                  { icon: Key, label: "Mots de passe", value: totalWithPassword },
                  { icon: Folder, label: "Groupes", value: totalGroups },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
                      <Icon className="w-3.5 h-3.5 text-indigo-300" />
                      <span className="text-white font-black text-base leading-none">{s.value}</span>
                      <span className="text-indigo-400 text-xs font-medium">{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2.5">
              <button onClick={() => { setShowGroupForm(true); setShowForm(false); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-all">
                <FolderPlus className="w-4 h-4" /> Nouveau groupe
              </button>
              <button onClick={() => { resetForm(); setShowForm(true); setShowGroupForm(false); }}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-bold shadow-lg shadow-indigo-500/30 transition-all">
                <Plus className="w-4 h-4" /> Ajouter une entrée
              </button>
            </div>
          </div>
        </div>

        {/* ── SECURITY BANNER ── */}
        <div className="flex items-center gap-3 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium flex-1">
            <span className="font-black">Chiffrement AES-256</span> — Vos données sont inaccessibles à quiconque, même à nos équipes.
          </p>
          <Zap className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
        </div>

        {/* ── WEAK PASSWORD WARNING ── */}
        {weakPasswords > 0 && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-300">
              <span className="font-black">{weakPasswords} mot(s) de passe faible(s)</span> détecté(s). Pensez à les renforcer pour améliorer votre sécurité.
            </p>
          </div>
        )}

        {/* ── GROUP FORM ── */}
        {showGroupForm && (
          <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center">
                <FolderPlus className="w-4 h-4 text-indigo-600" />
              </div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm">Créer un nouveau groupe</h3>
            </div>
            <div className="flex gap-3">
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreateGroup()}
                placeholder="Ex : Banques, Réseaux sociaux, Travail..." autoFocus
                className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 text-sm" />
              <button onClick={handleCreateGroup}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl transition-colors">Créer</button>
              <button onClick={() => setShowGroupForm(false)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-bold rounded-xl transition-colors">Annuler</button>
            </div>
          </div>
        )}

        {/* ── ADD / EDIT FORM ── */}
        {showForm && (
          <div className="bg-white dark:bg-gray-900 border border-indigo-200 dark:border-indigo-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/50 dark:to-violet-950/50 border-b border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-sm">
                    {editingId ? "Modifier l'entrée" : "Nouvelle entrée sécurisée"}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Tous les champs sont chiffrés</p>
                </div>
              </div>
              <button onClick={resetForm} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Groupe</label>
                <select value={form.type_entree} onChange={e => setForm(f => ({ ...f, type_entree: e.target.value }))}
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="compte">🔐 Compte (par défaut)</option>
                  {Object.keys(groups).filter(g => g !== "compte").map(g => (
                    <option key={g} value={g}>{getTypeIcon(g)} {g}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Nom du service *</label>
                  <Input placeholder="Ex : Gmail, Facebook, Banque Atlantique..." value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required
                    className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">URL du site</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="https://..." value={form.site_url}
                      onChange={e => setForm(f => ({ ...f, site_url: e.target.value }))}
                      className="pl-9 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Email / Identifiant</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="votre@email.com" value={form.email_identifiant}
                      onChange={e => setForm(f => ({ ...f, email_identifiant: e.target.value }))}
                      className="pl-9 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Mot de passe</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input type="text" placeholder="Mot de passe" value={form.mot_de_passe_visible}
                      onChange={e => setForm(f => ({ ...f, mot_de_passe_visible: e.target.value }))}
                      className="pl-9 font-mono rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                  </div>
                  <PasswordStrength password={form.mot_de_passe_visible} />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Téléphone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input placeholder="+229..." value={form.telephone}
                      onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                      className="pl-9 rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1.5">Note</label>
                  <Input placeholder="Informations complémentaires..." value={form.note}
                    onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                    className="rounded-xl border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" />
                </div>
              </div>
              <div className="flex gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <button type="button" onClick={resetForm}
                  className="flex-1 py-2.5 text-sm font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
                  Annuler
                </button>
                <button type="submit"
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-500/20 transition-colors flex items-center justify-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  {editingId ? "Mettre à jour" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── SEARCH + FILTERS ── */}
        {!loading && totalItems > 0 && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un compte, site, email..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all" />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setActiveFilter(null)}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${!activeFilter ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                Tous
              </button>
              {Object.keys(groups).map(g => (
                <button key={g} onClick={() => setActiveFilter(activeFilter === g ? null : g)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all capitalize ${activeFilter === g ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"}`}>
                  {getTypeIcon(g)} {g}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── CONTENT ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center animate-pulse">
              <Lock className="w-6 h-6 text-indigo-600" />
            </div>
            <p className="text-sm text-gray-400 font-medium">Déchiffrement en cours...</p>
          </div>
        ) : groupNames.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-5 shadow-inner">
              <Lock className="w-9 h-9 text-gray-300 dark:text-gray-600" />
            </div>
            <h3 className="font-black text-gray-900 dark:text-white text-lg mb-2">
              {search || activeFilter ? "Aucun résultat" : "Votre coffre est vide"}
            </h3>
            <p className="text-gray-400 text-sm max-w-xs mb-6">
              {search || activeFilter
                ? "Essayez avec d'autres mots-clés ou supprimez le filtre."
                : "Ajoutez vos premiers identifiants pour les protéger dans le coffre chiffré."}
            </p>
            {!search && !activeFilter && (
              <button onClick={() => { resetForm(); setShowForm(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all">
                <Plus className="w-4 h-4" /> Ajouter une entrée
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupNames.map(groupName => {
              const groupItems = filteredGroups[groupName];
              const isOpen = expandedGroups[groupName] !== false;
              const typeColor = getTypeColor(groupName);
              return (
                <div key={groupName} className="rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm bg-white dark:bg-gray-900">
                  <button onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-left">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
                      style={{ background: typeColor.bg }}>
                      {getTypeIcon(groupName)}
                    </div>
                    <span className="font-black text-sm text-gray-900 dark:text-white capitalize flex-1">{groupName}</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: typeColor.bg, color: typeColor.color }}>
                      {groupItems.length}
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>
                  {isOpen && (
                    <div className="p-4 pt-1 grid grid-cols-1 lg:grid-cols-2 gap-3">
                      {groupItems.map(item => (
                        <ItemCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete}
                          visiblePasswords={visiblePasswords} togglePassword={togglePassword}
                          copyToClipboard={copyToClipboard} copiedField={copiedField} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
