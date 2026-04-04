import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Home, Zap, Lock, Plus, X, Search,
  Heart, Phone, MessageCircle, Trash2, Edit2,
  Filter, Image, Copy, CheckCircle2, ExternalLink,
  Share2, User, ChevronDown, ChevronUp
} from "lucide-react";
import { Link } from "react-router-dom";

type TypeBien = "maison" | "terrain" | "appartement" | "boutique";
type Statut = "disponible" | "vendu" | "loue";

interface Annonce {
  id: string;
  user_id: string;
  auteur_nom: string;
  titre: string;
  description: string;
  prix: number;
  type: TypeBien;
  ville: string;
  quartier: string;
  images: string[];
  contact: string;
  whatsapp: string;
  statut: Statut;
  favoris: string[];
  created_at: string;
}

const TYPES = [
  { value: "maison" as TypeBien,      label: "Maison",      emoji: "🏠", bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  { value: "terrain" as TypeBien,     label: "Terrain",     emoji: "🌿", bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  { value: "appartement" as TypeBien, label: "Appart.",     emoji: "🏢", bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  { value: "boutique" as TypeBien,    label: "Boutique",    emoji: "🏪", bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" },
];

const STATUTS = [
  { value: "disponible" as Statut, label: "Disponible", bg: "#22c55e" },
  { value: "vendu" as Statut,      label: "Vendu",      bg: "#ef4444" },
  { value: "loue" as Statut,       label: "Loué",       bg: "#eab308" },
];

function formatPrix(prix: number) {
  return prix.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ flexShrink: 0, padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, border: "none", cursor: "pointer", background: copied ? "#22c55e" : "#ede9fe", color: copied ? "#fff" : "#6d28d9", whiteSpace: "nowrap" }}>
      {copied ? "✓ Copié" : "📋 Copier"}
    </button>
  );
}

function AnnonceCard({ annonce, userId, onFavori, onEdit, onDelete, isOwner }: {
  annonce: Annonce; userId: string;
  onFavori: (id: string) => void; onEdit: (a: Annonce) => void;
  onDelete: (id: string) => void; isOwner: boolean;
}) {
  const [showLinks, setShowLinks] = useState(false);
  const typeInfo   = TYPES.find(t => t.value === annonce.type) || TYPES[0];
  const statutInfo = STATUTS.find(s => s.value === annonce.statut) || STATUTS[0];
  const isFavori   = userId !== "guest" && annonce.favoris?.includes(userId);
  const photo      = annonce.images?.[0];
  const annonceUrl = `${window.location.origin}/immobilier/annonce/${annonce.id}`;
  const vendeurUrl = `${window.location.origin}/immobilier/vendeur/${annonce.user_id}`;

  return (
    <div style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", display: "flex", flexDirection: "column", width: "100%", boxSizing: "border-box", marginBottom: "4px" }}>

      {/* Image */}
      <div style={{ position: "relative", width: "100%", height: "200px", background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
        {photo
          ? <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "60px" }}>{typeInfo.emoji}</div>
        }
        <div style={{ position: "absolute", top: 10, left: 10, background: statutInfo.bg, color: "#fff", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "999px" }}>
          {statutInfo.label}
        </div>
        {/* Favoris uniquement si connecté */}
        {userId !== "guest" && (
          <button onClick={() => onFavori(annonce.id)}
            style={{ position: "absolute", top: 10, right: 10, width: 38, height: 38, borderRadius: "999px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: isFavori ? "#ef4444" : "rgba(255,255,255,0.9)", boxShadow: "0 2px 6px rgba(0,0,0,0.15)" }}>
            <Heart style={{ width: 18, height: 18, color: isFavori ? "#fff" : "#6b7280", fill: isFavori ? "#fff" : "none" }} />
          </button>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", flex: 1, gap: "10px" }}>

        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "999px", alignSelf: "flex-start", background: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.border}` }}>
          {typeInfo.emoji} {typeInfo.label}
        </span>

        <div style={{ fontWeight: 800, fontSize: "16px", color: "#111827", cursor: "pointer", lineHeight: 1.3 }}
          onClick={() => window.location.href = `/immobilier/annonce/${annonce.id}`}>
          {annonce.titre}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "5px", color: "#6b7280" }}>
          <MapPin style={{ width: 14, height: 14, flexShrink: 0 }} />
          <span style={{ fontSize: "13px" }}>
            {annonce.quartier ? `${annonce.quartier}, ` : ""}{annonce.ville}
          </span>
        </div>

        <div style={{ fontWeight: 900, fontSize: "22px", color: "#7c3aed" }}>
          {formatPrix(annonce.prix)}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontSize: "12px", color: "#9ca3af" }}>Par {annonce.auteur_nom}</span>
          <Link to={`/immobilier/vendeur/${annonce.user_id}`}
            style={{ fontSize: "12px", color: "#7c3aed", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", background: "#f5f3ff", padding: "4px 10px", borderRadius: "8px" }}>
            <User style={{ width: 12, height: 12 }} /> Voir boutique
          </Link>
        </div>

        {/* Liens collapsible */}
        <button onClick={() => setShowLinks(!showLinks)}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "10px", background: "#f8fafc", border: "1px solid #e2e8f0", fontSize: "13px", fontWeight: 600, color: "#4b5563", cursor: "pointer" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "5px" }}>
            <Share2 style={{ width: 14, height: 14, color: "#7c3aed" }} /> Partager les liens
          </span>
          {showLinks ? <ChevronUp style={{ width: 14, height: 14 }} /> : <ChevronDown style={{ width: 14, height: 14 }} />}
        </button>

        {showLinks && (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f5f3ff", borderRadius: "10px", padding: "8px 12px", border: "1px solid #ede9fe" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: "#7c3aed", fontWeight: 700, marginBottom: "2px" }}>🔗 Lien annonce</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{annonceUrl.replace("https://", "").substring(0, 30)}...</div>
              </div>
              <CopyBtn text={annonceUrl} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#eff6ff", borderRadius: "10px", padding: "8px 12px", border: "1px solid #dbeafe" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "12px", color: "#2563eb", fontWeight: 700, marginBottom: "2px" }}>🏪 Lien boutique</div>
                <div style={{ fontSize: "11px", color: "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace" }}>{vendeurUrl.replace("https://", "").substring(0, 30)}...</div>
              </div>
              <CopyBtn text={vendeurUrl} />
            </div>
          </div>
        )}

        {/* Boutons contact */}
        <div style={{ display: "flex", gap: "8px" }}>
          {annonce.whatsapp && (
            <a href={`https://wa.me/${annonce.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, annonce: ${annonce.titre}`}
              target="_blank" rel="noopener noreferrer"
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px", borderRadius: "12px", background: "#25D366", color: "#fff", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
              <MessageCircle style={{ width: 16, height: 16 }} /> WhatsApp
            </a>
          )}
          <a href={`tel:${annonce.contact}`}
            style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "12px", borderRadius: "12px", background: "#f1f5f9", color: "#374151", fontSize: "13px", fontWeight: 700, textDecoration: "none" }}>
            <Phone style={{ width: 16, height: 16 }} /> Appeler
          </a>
        </div>

        {isOwner && (
          <div style={{ display: "flex", gap: "8px", paddingTop: "8px", borderTop: "1px solid #f1f5f9" }}>
            <button onClick={() => onEdit(annonce)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "10px", borderRadius: "10px", background: "#f5f3ff", color: "#6d28d9", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}>
              <Edit2 style={{ width: 14, height: 14 }} /> Modifier
            </button>
            <button onClick={() => onDelete(annonce.id)}
              style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px", padding: "10px", borderRadius: "10px", background: "#fef2f2", color: "#ef4444", fontSize: "13px", fontWeight: 700, border: "none", cursor: "pointer" }}>
              <Trash2 style={{ width: 14, height: 14 }} /> Supprimer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ImmobilierPage() {
  const user = getNexoraUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Un utilisateur non connecté peut voir les annonces (userId = "guest")
  const hasPremium = user?.plan === "boss" || user?.plan === "roi" || user?.plan === "admin";
  const userId = user?.id || "guest";

  const [annonces, setAnnonces] = useState<Annonce[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showFiltres, setShowFiltres] = useState(false);
  const [copiedProfil, setCopiedProfil] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [filterType, setFilterType] = useState<TypeBien | "">("");
  const [filterVille, setFilterVille] = useState("");
  const [filterPrixMax, setFilterPrixMax] = useState("");
  const [filterStatut, setFilterStatut] = useState<Statut | "">("");

  const emptyForm = { titre: "", description: "", prix: "", type: "maison" as TypeBien, ville: "", quartier: "", contact: "", whatsapp: "", statut: "disponible" as Statut, images: [] as string[] };
  const [form, setForm] = useState(emptyForm);
  const monProfilUrl = `${window.location.origin}/immobilier/vendeur/${userId}`;

  const loadAnnonces = async () => {
    setLoading(true);
    const { data } = await supabase.from("nexora_annonces_immo" as any).select("*").order("created_at", { ascending: false });
    setAnnonces((data || []) as unknown as Annonce[]);
    setLoading(false);
  };
  useEffect(() => { loadAnnonces(); }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + form.images.length > 6) { toast({ title: "Maximum 6 photos", variant: "destructive" }); return; }
    setUploadingPhoto(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const path = `immobilier/${Date.now()}_${file.name}`;
        const { error } = await supabase.storage.from("mes-secrets-media").upload(path, file, { upsert: true });
        if (error) throw error;
        const { data: u } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
        urls.push(u.publicUrl);
      }
      setForm(prev => ({ ...prev, images: [...prev.images, ...urls] }));
      toast({ title: `✅ ${urls.length} photo(s) ajoutée(s)` });
    } catch (err: any) { toast({ title: "Erreur upload", description: err.message, variant: "destructive" }); }
    setUploadingPhoto(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre || !form.prix || !form.ville || !form.contact) { toast({ title: "Remplissez tous les champs obligatoires", variant: "destructive" }); return; }
    setSaving(true);
    const payload = { user_id: userId, auteur_nom: user?.nom_prenom || "Utilisateur", titre: form.titre, description: form.description || null, prix: parseFloat(form.prix), type: form.type, ville: form.ville, quartier: form.quartier || null, contact: form.contact, whatsapp: form.whatsapp || null, statut: form.statut, images: form.images, favoris: [] };
    let error;
    if (editingId) { ({ error } = await supabase.from("nexora_annonces_immo" as any).update(payload).eq("id", editingId)); }
    else { ({ error } = await supabase.from("nexora_annonces_immo" as any).insert(payload)); }
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: `✅ Annonce ${editingId ? "modifiée" : "publiée"} !` }); setForm(emptyForm); setEditingId(null); setShowForm(false); loadAnnonces(); }
    setSaving(false);
  };

  const handleEdit = (a: Annonce) => { setForm({ titre: a.titre, description: a.description || "", prix: String(a.prix), type: a.type, ville: a.ville, quartier: a.quartier || "", contact: a.contact, whatsapp: a.whatsapp || "", statut: a.statut, images: a.images || [] }); setEditingId(a.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleDelete = async (id: string) => { if (!confirm("Supprimer ?")) return; await supabase.from("nexora_annonces_immo" as any).delete().eq("id", id); toast({ title: "Annonce supprimée" }); loadAnnonces(); };
  const handleFavori = async (id: string) => {
    if (userId === "guest") return; // Non connecté = pas de favori
    const a = annonces.find(x => x.id === id); if (!a) return;
    const f = a.favoris || [];
    const nf = f.includes(userId) ? f.filter(x => x !== userId) : [...f, userId];
    await supabase.from("nexora_annonces_immo" as any).update({ favoris: nf }).eq("id", id);
    setAnnonces(prev => prev.map(x => x.id === id ? { ...x, favoris: nf } : x));
  };

  const filtered = annonces.filter(a => {
    const ms = !searchQ || a.titre.toLowerCase().includes(searchQ.toLowerCase()) || a.ville.toLowerCase().includes(searchQ.toLowerCase());
    const mt = !filterType || a.type === filterType;
    const mv = !filterVille || a.ville.toLowerCase().includes(filterVille.toLowerCase());
    const mp = !filterPrixMax || a.prix <= parseFloat(filterPrixMax);
    const mst = !filterStatut || a.statut === filterStatut;
    return ms && mt && mv && mp && mst;
  });

  const hasFilters = filterType || filterVille || filterPrixMax || filterStatut;
  const mesAnnonces = annonces.filter(a => a.user_id === userId);

  const inputStyle: React.CSSProperties = { width: "100%", height: "42px", padding: "0 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none", boxSizing: "border-box", background: "#fff" };

  return (
    <AppLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ width: "100%", maxWidth: "600px", margin: "0 auto", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* ══ HERO ══ */}
        <div style={{ position: "relative", overflow: "hidden", borderRadius: "16px", padding: "18px 20px", boxSizing: "border-box" }} className="bg-primary text-primary-foreground">
          <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "5px" }}>
                <MapPin style={{ width: 20, height: 20, color: "#fbbf24", flexShrink: 0 }} />
                <span style={{ fontWeight: 900, fontSize: "18px" }}>Marché Immobilier</span>
              </div>
              <p style={{ fontSize: "13px", opacity: 0.8, margin: 0 }}>
                {annonces.length} annonce{annonces.length > 1 ? "s" : ""} disponible{annonces.length > 1 ? "s" : ""}
              </p>
            </div>
            {/* Bouton Publier : visible uniquement si Premium */}
            {hasPremium ? (
              <button onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm); }}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", background: "#facc15", color: "#1c1917", fontWeight: 800, padding: "10px 18px", borderRadius: "12px", fontSize: "14px", border: "none", cursor: "pointer", whiteSpace: "nowrap", boxShadow: "0 2px 8px rgba(250,204,21,0.4)" }}>
                <Plus style={{ width: 16, height: 16 }} /> Publier
              </button>
            ) : (
              /* Si pas Premium ou non connecté : bouton "Publier" redirige vers abonnement */
              <Link to="/abonnement"
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "6px", background: "#facc15", color: "#1c1917", fontWeight: 800, padding: "10px 18px", borderRadius: "12px", fontSize: "14px", textDecoration: "none", whiteSpace: "nowrap" }}>
                <Lock style={{ width: 16, height: 16 }} /> Publier
              </Link>
            )}
          </div>
        </div>

        {/* ══ BANNIÈRE PROFIL (Premium connecté uniquement) ══ */}
        {hasPremium && userId !== "guest" && (
          <div style={{ background: "linear-gradient(to right, #eff6ff, #f5f3ff)", border: "1px solid #bfdbfe", borderRadius: "14px", padding: "14px 16px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ width: 40, height: 40, background: "#dbeafe", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Share2 style={{ width: 18, height: 18, color: "#2563eb" }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: "#1f2937" }}>🏪 Votre boutique</span>
                  <span style={{ fontSize: "11px", background: "#3b82f6", color: "#fff", padding: "2px 8px", borderRadius: "999px" }}>{mesAnnonces.length} annonce{mesAnnonces.length > 1 ? "s" : ""}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "#fff", borderRadius: "9px", padding: "6px 10px", border: "1px solid #dbeafe" }}>
                  <span style={{ fontSize: "11px", color: "#7c3aed", fontFamily: "monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{monProfilUrl.replace("https://", "")}</span>
                  <button onClick={() => { navigator.clipboard.writeText(monProfilUrl); setCopiedProfil(true); setTimeout(() => setCopiedProfil(false), 2500); }}
                    style={{ flexShrink: 0, padding: "4px 10px", borderRadius: "7px", fontSize: "12px", fontWeight: 700, background: copiedProfil ? "#22c55e" : "#7c3aed", color: "#fff", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                    {copiedProfil ? "✓ Copié" : "Copier"}
                  </button>
                </div>
              </div>
              <Link to={`/immobilier/vendeur/${userId}`}
                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "4px", padding: "8px 12px", borderRadius: "10px", background: "#7c3aed", color: "#fff", fontSize: "12px", fontWeight: 700, textDecoration: "none" }}>
                <ExternalLink style={{ width: 13, height: 13 }} /> Voir
              </Link>
            </div>
          </div>
        )}

        {/* ══ BANNIÈRE INCITATION (non premium / non connecté) ══ */}
        {!hasPremium && (
          <div style={{ background: "linear-gradient(135deg, #f5f3ff, #eef2ff)", border: "1px solid #c4b5fd", borderRadius: "14px", padding: "16px 18px", display: "flex", alignItems: "center", gap: "14px", boxSizing: "border-box" }}>
            <div style={{ width: 44, height: 44, background: "#ede9fe", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Zap style={{ width: 22, height: 22, color: "#7c3aed" }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: "14px", color: "#111827", marginBottom: "3px" }}>Publiez vos annonces</div>
              <p style={{ fontSize: "12px", color: "#6b7280", margin: 0 }}>Passez Premium pour publier. La consultation est 100% gratuite.</p>
            </div>
            <Link to="/abonnement"
              style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: "5px", background: "#7c3aed", color: "#fff", fontWeight: 700, padding: "9px 14px", borderRadius: "10px", fontSize: "12px", textDecoration: "none", whiteSpace: "nowrap" }}>
              <Zap style={{ width: 13, height: 13 }} /> 10$/mois
            </Link>
          </div>
        )}

        {/* ══ FORMULAIRE (Premium seulement) ══ */}
        {showForm && hasPremium && (
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", overflow: "hidden", boxSizing: "border-box" }}>
            <div style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 900, fontSize: "16px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                <Home style={{ width: 18, height: 18, color: "#7c3aed" }} />
                {editingId ? "Modifier l'annonce" : "Publier une annonce"}
              </span>
              <button onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                style={{ width: 32, height: 32, borderRadius: "999px", background: "#e5e7eb", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X style={{ width: 15, height: 15 }} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px" }}>

              {/* Type */}
              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "8px" }}>Type de bien *</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {TYPES.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                      style={{ padding: "12px 8px", borderRadius: "12px", fontSize: "13px", fontWeight: 600, border: form.type === t.value ? `2px solid #7c3aed` : "2px solid #e5e7eb", background: form.type === t.value ? "#f5f3ff" : "#fff", color: form.type === t.value ? "#7c3aed" : "#4b5563", cursor: "pointer", textAlign: "center" }}>
                      <div style={{ fontSize: "22px", marginBottom: "4px" }}>{t.emoji}</div>{t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Titre *</label>
                <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Belle villa 4 chambres" style={inputStyle} />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre bien..."
                  style={{ ...inputStyle, height: "90px", padding: "10px 14px", resize: "none" }} />
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Prix (FCFA) *</label>
                <input type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} placeholder="Ex: 25000000" style={inputStyle} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Ville *</label>
                  <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Cotonou" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Quartier</label>
                  <input value={form.quartier} onChange={e => setForm({ ...form, quartier: e.target.value })} placeholder="Cadjehoun" style={inputStyle} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>Téléphone *</label>
                  <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="+229..." style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "5px" }}>WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+229..." style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "8px" }}>Statut</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {STATUTS.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm({ ...form, statut: s.value })}
                      style={{ flex: 1, padding: "10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700, cursor: "pointer", border: "2px solid transparent", background: form.statut === s.value ? s.bg : "#f9fafb", color: form.statut === s.value ? "#fff" : "#6b7280" }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: "13px", fontWeight: 700, color: "#374151", display: "block", marginBottom: "8px" }}>Photos ({form.images.length}/6)</label>
                {form.images.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "7px", marginBottom: "10px" }}>
                    {form.images.map((url, i) => (
                      <div key={i} style={{ position: "relative", aspectRatio: "1" }}>
                        <img src={url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "9px" }} />
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))}
                          style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: "999px", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto || form.images.length >= 6}
                  style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "2px dashed #d1d5db", background: "#fff", color: "#6b7280", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", cursor: "pointer", boxSizing: "border-box" }}>
                  <Image style={{ width: 16, height: 16 }} />
                  {uploadingPhoto ? "Upload en cours..." : "Ajouter des photos"}
                </button>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                  style={{ flex: 1, padding: "13px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", color: "#4b5563", fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  style={{ flex: 1, padding: "13px", borderRadius: "12px", background: saving ? "#fde68a" : "#facc15", color: "#1c1917", fontSize: "14px", fontWeight: 800, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px" }}>
                  {saving && <div style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid #1c1917", borderRadius: "999px", animation: "spin 0.8s linear infinite" }} />}
                  {saving ? "Publication..." : editingId ? "✅ Modifier" : "✅ Publier"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ RECHERCHE & FILTRES ══ */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", boxSizing: "border-box" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
              <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#9ca3af" }} />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Rechercher une annonce..."
                style={{ width: "100%", paddingLeft: "38px", paddingRight: "12px", height: "44px", borderRadius: "12px", border: "1px solid #e5e7eb", background: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <button onClick={() => setShowFiltres(!showFiltres)}
              style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 16px", height: "44px", borderRadius: "12px", fontSize: "14px", fontWeight: 700, flexShrink: 0, border: hasFilters ? "none" : "1px solid #e5e7eb", background: hasFilters ? "#7c3aed" : "#fff", color: hasFilters ? "#fff" : "#4b5563", cursor: "pointer" }}>
              <Filter style={{ width: 15, height: 15 }} /> Filtres
            </button>
          </div>

          {/* Types rapides */}
          <div style={{ display: "flex", gap: "6px", overflowX: "auto", paddingBottom: "2px" }}>
            <button onClick={() => setFilterType("")}
              style={{ flexShrink: 0, padding: "6px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 700, cursor: "pointer", border: "none", background: !filterType ? "#7c3aed" : "#f1f5f9", color: !filterType ? "#fff" : "#4b5563" }}>
              🏘️ Tout ({annonces.length})
            </button>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => setFilterType(filterType === t.value ? "" : t.value)}
                style={{ flexShrink: 0, padding: "6px 14px", borderRadius: "999px", fontSize: "13px", fontWeight: 700, cursor: "pointer", border: "none", background: filterType === t.value ? "#7c3aed" : "#f1f5f9", color: filterType === t.value ? "#fff" : "#4b5563" }}>
                {t.emoji} {t.label}
              </button>
            ))}
          </div>

          {/* Filtres avancés */}
          {showFiltres && (
            <div style={{ background: "#fff", borderRadius: "12px", border: "1px solid #e5e7eb", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "10px", boxSizing: "border-box" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", display: "block", marginBottom: "4px" }}>Ville</label>
                  <input value={filterVille} onChange={e => setFilterVille(e.target.value)} placeholder="Cotonou" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", display: "block", marginBottom: "4px" }}>Prix max (FCFA)</label>
                  <input type="number" value={filterPrixMax} onChange={e => setFilterPrixMax(e.target.value)} placeholder="50000000" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: "12px", fontWeight: 700, color: "#6b7280", display: "block", marginBottom: "4px" }}>Statut</label>
                <select value={filterStatut} onChange={e => setFilterStatut(e.target.value as Statut | "")}
                  style={{ ...inputStyle, padding: "0 12px" }}>
                  <option value="">Tous</option>
                  {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {hasFilters && (
                <button onClick={() => { setFilterType(""); setFilterVille(""); setFilterPrixMax(""); setFilterStatut(""); }}
                  style={{ padding: "10px", borderRadius: "10px", border: "1px solid #fecaca", background: "#fff", color: "#ef4444", fontSize: "13px", fontWeight: 700, cursor: "pointer" }}>
                  ✕ Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ LISTE ANNONCES ══ */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[...Array(3)].map((_, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "16px", overflow: "hidden", border: "1px solid #f1f5f9" }}>
                <div style={{ height: "200px", background: "#e5e7eb" }} />
                <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ height: "14px", background: "#e5e7eb", borderRadius: "6px", width: "75%" }} />
                  <div style={{ height: "14px", background: "#e5e7eb", borderRadius: "6px", width: "50%" }} />
                  <div style={{ height: "20px", background: "#e5e7eb", borderRadius: "6px", width: "40%" }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🏘️</div>
            <div style={{ fontWeight: 700, fontSize: "16px", color: "#374151" }}>{annonces.length === 0 ? "Aucune annonce publiée" : "Aucun résultat"}</div>
            <div style={{ fontSize: "13px", color: "#9ca3af", marginTop: "5px" }}>{annonces.length === 0 ? "Les annonces apparaîtront ici." : "Modifiez vos filtres."}</div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: "13px", color: "#6b7280", fontWeight: 600, margin: 0 }}>
              {filtered.length} annonce{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {filtered.map(annonce => (
                <AnnonceCard key={annonce.id} annonce={annonce} userId={userId} onFavori={handleFavori} onEdit={handleEdit} onDelete={handleDelete} isOwner={annonce.user_id === userId} />
              ))}
            </div>
          </>
        )}

      </div>
    </AppLayout>
  );
}
