import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import {
  MapPin, Home, Zap, Lock, Plus, X, Search,
  Heart, Phone, MessageCircle, Trash2, Edit2,
  Filter, Image, ExternalLink,
  Share2, User, ChevronDown, ChevronUp,
  BedDouble, Bath, Maximize2, Building2, TreePine, ShoppingBag,
  Tag, Eye, SlidersHorizontal, TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";

type TypeBien = "maison" | "terrain" | "appartement" | "boutique";
type Statut = "vendre" | "louer";
type Devise = "XOF"|"XAF"|"GHS"|"NGN"|"KES"|"TZS"|"UGX"|"RWF"|"GNF"|"CDF"|"MAD"|"GMD"|"SLL"|"LRD"|"MZN"|"ZMW"|"USD"|"EUR";

const DEVISES_IMMO: { code: Devise; label: string; symbole: string }[] = [
  { code: "XOF", label: "Franc CFA UEMOA (XOF)", symbole: "FCFA" },
  { code: "XAF", label: "Franc CFA CEMAC (XAF)", symbole: "FCFA" },
  { code: "GHS", label: "Cédi ghanéen (GHS)",    symbole: "₵"    },
  { code: "NGN", label: "Naira nigérian (NGN)",   symbole: "₦"    },
  { code: "KES", label: "Shilling kényan (KES)",  symbole: "KSh"  },
  { code: "TZS", label: "Shilling tanzanien (TZS)",symbole: "TSh" },
  { code: "UGX", label: "Shilling ougandais (UGX)",symbole: "USh" },
  { code: "RWF", label: "Franc rwandais (RWF)",   symbole: "RF"   },
  { code: "GNF", label: "Franc guinéen (GNF)",    symbole: "GNF"  },
  { code: "CDF", label: "Franc congolais (CDF)",  symbole: "FC"   },
  { code: "MAD", label: "Dirham marocain (MAD)",  symbole: "MAD"  },
  { code: "GMD", label: "Dalasi gambien (GMD)",   symbole: "GMD"  },
  { code: "SLL", label: "Leone sierra-léon. (SLL)",symbole: "SLL" },
  { code: "LRD", label: "Dollar libérien (LRD)",  symbole: "L$"   },
  { code: "MZN", label: "Metical mozamb. (MZN)",  symbole: "MT"   },
  { code: "ZMW", label: "Kwacha zambien (ZMW)",   symbole: "ZMW"  },
  { code: "USD", label: "Dollar américain (USD)", symbole: "$"    },
  { code: "EUR", label: "Euro (EUR)",             symbole: "€"    },
];

function getSymboleImmo(devise?: string): string {
  return DEVISES_IMMO.find(d => d.code === devise)?.symbole ?? "FCFA";
}

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
  devise: Devise;
  favoris: string[];
  created_at: string;
  superficie?: string;
  nb_chambres?: string;
  nb_salles_bain?: string;
}

const TYPES = [
  { value: "maison" as TypeBien,      label: "Maison",      icon: Home,       badgeCls: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800" },
  { value: "terrain" as TypeBien,     label: "Terrain",     icon: TreePine,   badgeCls: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800"     },
  { value: "appartement" as TypeBien, label: "Appart.",     icon: Building2,  badgeCls: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"           },
  { value: "boutique" as TypeBien,    label: "Boutique",    icon: ShoppingBag,badgeCls: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
];

const STATUTS = [
  { value: "vendre" as Statut, label: "À vendre", bg: "#22c55e", light: "#dcfce7", dark: "#166534" },
  { value: "louer"  as Statut, label: "À louer",  bg: "#3b82f6", light: "#dbeafe", dark: "#1e3a8a" },
];

function formatPrix(prix: number, devise?: string) {
  const symbole = getSymboleImmo(devise);
  const isDecimal = ["USD", "EUR", "GHS", "MAD"].includes(devise ?? "");
  const rounded = isDecimal ? Number(prix.toFixed(2)) : Math.round(prix);
  const formatted = new Intl.NumberFormat("fr-FR").format(rounded);
  if (devise === "USD") return `$${formatted}`;
  if (devise === "EUR") return `${formatted} €`;
  return `${formatted} ${symbole}`;
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-all ${copied ? "bg-green-500 text-white scale-95" : "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300 hover:bg-violet-200"}`}
    >
      {copied ? "✓ Copié" : "Copier"}
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
  const TypeIcon   = typeInfo.icon;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col w-full shadow-sm hover:shadow-md transition-shadow">

      {/* ── Image ── */}
      <div className="relative w-full bg-muted overflow-hidden flex-shrink-0" style={{ height: 210 }}>
        {photo
          ? <img src={photo} alt={annonce.titre} className="w-full h-full object-cover" />
          : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-muted/50">
              <TypeIcon className="w-12 h-12 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/60 font-medium">Aucune photo</span>
            </div>
          )
        }

        {/* Badges overlay */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span className="text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-sm" style={{ background: statutInfo.bg }}>
            {statutInfo.label}
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${typeInfo.badgeCls} backdrop-blur-sm`}>
            <TypeIcon className="w-3 h-3 inline mr-1" />{typeInfo.label}
          </span>
        </div>

        {/* Favori */}
        {userId !== "guest" && (
          <button
            onClick={() => onFavori(annonce.id)}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full border-none cursor-pointer flex items-center justify-center shadow-md transition-all active:scale-90 ${isFavori ? "bg-red-500" : "bg-white/90 dark:bg-black/60 backdrop-blur-sm"}`}
          >
            <Heart style={{ width: 16, height: 16, color: isFavori ? "#fff" : "#6b7280", fill: isFavori ? "#fff" : "none" }} />
          </button>
        )}

        {/* Image count */}
        {annonce.images?.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1">
            <Image className="w-3 h-3" /> {annonce.images.length}
          </div>
        )}
      </div>

      {/* ── Contenu ── */}
      <div className="p-4 flex flex-col flex-1 gap-3">

        {/* Titre cliquable */}
        <div
          className="font-extrabold text-base text-foreground cursor-pointer leading-snug hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          onClick={() => window.location.href = `/immobilier/annonce/${annonce.id}`}
        >
          {annonce.titre}
        </div>

        {/* Localisation */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 flex-shrink-0 text-violet-500" />
          <span className="text-sm">{annonce.quartier ? `${annonce.quartier}, ` : ""}{annonce.ville}</span>
        </div>

        {/* Caractéristiques */}
        {(annonce.superficie || annonce.nb_chambres || annonce.nb_salles_bain) && (
          <div className="flex flex-wrap gap-2">
            {annonce.superficie && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-lg px-2.5 py-1.5 font-semibold">
                <Maximize2 className="w-3 h-3" /> {annonce.superficie} m²
              </span>
            )}
            {annonce.nb_chambres && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-lg px-2.5 py-1.5 font-semibold">
                <BedDouble className="w-3 h-3" /> {annonce.nb_chambres} ch.
              </span>
            )}
            {annonce.nb_salles_bain && (
              <span className="inline-flex items-center gap-1 text-xs bg-muted text-muted-foreground rounded-lg px-2.5 py-1.5 font-semibold">
                <Bath className="w-3 h-3" /> {annonce.nb_salles_bain} SDB
              </span>
            )}
          </div>
        )}

        {/* Séparateur + Prix */}
        <div className="flex items-center justify-between pt-1 border-t border-border">
          <div className="font-black text-xl text-violet-600 dark:text-violet-400 leading-none">
            {formatPrix(annonce.prix, annonce.devise)}
          </div>
          <Link
            to={`/immobilier/vendeur/${annonce.user_id}`}
            className="flex items-center gap-1.5 text-xs text-muted-foreground no-underline hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
              <User className="w-3 h-3" />
            </div>
            <span className="font-medium">{annonce.auteur_nom}</span>
          </Link>
        </div>

        {/* Boutons contact */}
        <div className="flex gap-2">
          {annonce.whatsapp && (
            <a
              href={`https://wa.me/${annonce.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, annonce: ${annonce.titre}`}
              target="_blank" rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold no-underline text-white transition-opacity hover:opacity-90"
              style={{ background: "#25D366" }}
            >
              <MessageCircle className="w-4 h-4" /> WhatsApp
            </a>
          )}
          <a
            href={`tel:${annonce.contact}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-foreground text-sm font-bold no-underline hover:bg-accent transition-colors"
          >
            <Phone className="w-4 h-4" /> Appeler
          </a>
          <button
            onClick={() => window.location.href = `/immobilier/annonce/${annonce.id}`}
            className="w-11 flex items-center justify-center rounded-xl border border-border bg-background hover:bg-accent transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Partager les liens - collapsible */}
        <button
          onClick={() => setShowLinks(!showLinks)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-xs font-semibold text-muted-foreground cursor-pointer hover:bg-muted transition-colors"
        >
          <span className="flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-violet-500" /> Partager
          </span>
          {showLinks ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showLinks && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 border border-violet-200 dark:border-violet-800">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-violet-700 dark:text-violet-400 font-bold mb-0.5">Lien annonce</div>
                <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap font-mono">{annonceUrl.replace("https://", "").substring(0, 28)}…</div>
              </div>
              <CopyBtn text={annonceUrl} />
            </div>
            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 border border-blue-200 dark:border-blue-800">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-blue-700 dark:text-blue-400 font-bold mb-0.5">Lien boutique</div>
                <div className="text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-nowrap font-mono">{vendeurUrl.replace("https://", "").substring(0, 28)}…</div>
              </div>
              <CopyBtn text={vendeurUrl} />
            </div>
          </div>
        )}

        {/* Actions propriétaire */}
        {isOwner && (
          <div className="flex gap-2 pt-2 border-t border-border">
            <button
              onClick={() => onEdit(annonce)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-sm font-bold border-none cursor-pointer hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" /> Modifier
            </button>
            <button
              onClick={() => onDelete(annonce.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 text-sm font-bold border-none cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Supprimer
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

  const emptyForm = { titre: "", description: "", prix: "", type: "maison" as TypeBien, ville: "", quartier: "", contact: "", whatsapp: "", statut: "vendre" as Statut, devise: "XOF" as Devise, images: [] as string[], superficie: "", nb_chambres: "", nb_salles_bain: "" };
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
    const payload = { user_id: userId, auteur_nom: user?.nom_prenom || "Utilisateur", titre: form.titre, description: form.description || null, prix: parseFloat(form.prix), type: form.type, ville: form.ville, quartier: form.quartier || null, contact: form.contact, whatsapp: form.whatsapp || null, statut: form.statut, devise: form.devise, images: form.images, favoris: [], superficie: form.superficie || null, nb_chambres: form.nb_chambres || null, nb_salles_bain: form.nb_salles_bain || null };
    let error;
    if (editingId) { ({ error } = await supabase.from("nexora_annonces_immo" as any).update(payload).eq("id", editingId)); }
    else { ({ error } = await supabase.from("nexora_annonces_immo" as any).insert(payload)); }
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { toast({ title: `✅ Annonce ${editingId ? "modifiée" : "publiée"} !` }); setForm(emptyForm); setEditingId(null); setShowForm(false); loadAnnonces(); }
    setSaving(false);
  };

  const handleEdit = (a: Annonce) => { setForm({ titre: a.titre, description: a.description || "", prix: String(a.prix), type: a.type, ville: a.ville, quartier: a.quartier || "", contact: a.contact, whatsapp: a.whatsapp || "", statut: a.statut, devise: a.devise || "XOF", images: a.images || [], superficie: a.superficie || "", nb_chambres: a.nb_chambres || "", nb_salles_bain: a.nb_salles_bain || "" }); setEditingId(a.id); setShowForm(true); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const handleDelete = async (id: string) => { if (!confirm("Supprimer ?")) return; await supabase.from("nexora_annonces_immo" as any).delete().eq("id", id); toast({ title: "Annonce supprimée" }); loadAnnonces(); };
  const handleFavori = async (id: string) => {
    if (userId === "guest") return;
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

  const inputCls = "w-full h-11 px-3.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 placeholder:text-muted-foreground box-border transition-all";

  return (
    <AppLayout>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div className="w-full max-w-xl mx-auto flex flex-col gap-4 pb-6">

        {/* ══ HERO ══ */}
        <div className="relative overflow-hidden rounded-2xl bg-primary text-primary-foreground">
          {/* Décoration */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5" />
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          </div>
          <div className="relative px-5 py-4 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-yellow-400" />
                </div>
                <span className="font-black text-lg leading-tight">Marché Immobilier</span>
              </div>
              <div className="flex items-center gap-2 ml-10">
                <span className="text-sm opacity-75">{annonces.length} annonce{annonces.length > 1 ? "s" : ""} disponible{annonces.length > 1 ? "s" : ""}</span>
                {annonces.length > 0 && (
                  <span className="text-xs bg-white/10 px-2 py-0.5 rounded-full opacity-75 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Actif
                  </span>
                )}
              </div>
            </div>
            {hasPremium ? (
              <button
                onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(!showForm); }}
                className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-400 text-stone-900 font-black px-4 py-2.5 rounded-xl text-sm border-none cursor-pointer whitespace-nowrap hover:bg-yellow-300 active:scale-95 transition-all shadow-lg shadow-yellow-400/30"
              >
                <Plus className="w-4 h-4" /> Publier
              </button>
            ) : (
              <Link to="/abonnement"
                className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-400 text-stone-900 font-black px-4 py-2.5 rounded-xl text-sm no-underline whitespace-nowrap hover:bg-yellow-300 active:scale-95 transition-all shadow-lg shadow-yellow-400/30"
              >
                <Lock className="w-4 h-4" /> Publier
              </Link>
            )}
          </div>
        </div>

        {/* ══ BANNIÈRE BOUTIQUE PREMIUM ══ */}
        {hasPremium && userId !== "guest" && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                  <ShoppingBag className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>
                <span className="font-bold text-sm text-foreground">Votre boutique</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold px-2.5 py-1 rounded-full">
                  {mesAnnonces.length} annonce{mesAnnonces.length > 1 ? "s" : ""}
                </span>
                <Link to={`/immobilier/vendeur/${userId}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 text-white text-xs font-bold no-underline hover:bg-violet-700 active:scale-95 transition-all"
                >
                  <ExternalLink className="w-3 h-3" /> Voir
                </Link>
              </div>
            </div>
            <div className="px-4 py-3">
              <p className="text-xs text-muted-foreground mb-2 font-medium">Lien de votre boutique publique</p>
              <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-3 border border-border/60">
                <Share2 className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                <span className="text-xs text-muted-foreground font-mono overflow-hidden text-ellipsis whitespace-nowrap flex-1 min-w-0">{monProfilUrl.replace("https://", "")}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(monProfilUrl); setCopiedProfil(true); setTimeout(() => setCopiedProfil(false), 2500); }}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border-none cursor-pointer transition-all whitespace-nowrap ${copiedProfil ? "bg-green-500 text-white" : "bg-violet-600 text-white hover:bg-violet-700"}`}
                >
                  {copiedProfil ? "✓ Copié" : "Copier"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ INCITATION NON PREMIUM ══ */}
        {!hasPremium && (
          <div className="bg-card border border-violet-200 dark:border-violet-800 rounded-2xl p-4 flex items-center gap-3.5">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-extrabold text-sm text-foreground">Publiez vos annonces</div>
              <p className="text-xs text-muted-foreground mt-0.5">Passez Premium. Consultation 100% gratuite.</p>
            </div>
            <Link to="/abonnement"
              className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 text-white font-bold px-3.5 py-2 rounded-xl text-xs no-underline hover:bg-violet-700 active:scale-95 transition-all"
            >
              <Zap className="w-3.5 h-3.5" /> 10$/mois
            </Link>
          </div>
        )}

        {/* ══ FORMULAIRE ══ */}
        {showForm && hasPremium && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {/* En-tête formulaire */}
            <div className="bg-gradient-to-r from-violet-600 to-violet-700 px-5 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                  <Home className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-base text-white">
                  {editingId ? "Modifier l'annonce" : "Publier une annonce"}
                </span>
              </div>
              <button
                onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 cursor-pointer flex items-center justify-center transition-colors border-none"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-4">

              {/* Type de bien */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-2">Type de bien *</label>
                <div className="grid grid-cols-4 gap-2">
                  {TYPES.map(t => {
                    const TIcon = t.icon;
                    return (
                      <button key={t.value} type="button" onClick={() => setForm({ ...form, type: t.value })}
                        className={`py-3 px-1 rounded-xl text-xs font-semibold cursor-pointer text-center transition-all flex flex-col items-center gap-1.5 ${form.type === t.value ? "border-2 border-violet-600 bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400" : "border-2 border-border bg-background text-muted-foreground hover:border-violet-300"}`}
                      >
                        <TIcon className="w-5 h-5" />
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Titre */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-1.5">Titre *</label>
                <input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} placeholder="Ex: Belle villa 4 chambres" className={inputCls} />
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Décrivez votre bien..."
                  className={`${inputCls} h-24 py-3 resize-none`} />
              </div>

              {/* Prix */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-1.5">Prix *</label>
                <div className="flex gap-2">
                  <input type="number" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} placeholder="Ex: 25000000"
                    className={`${inputCls} flex-[2]`} />
                  <select value={form.devise} onChange={e => setForm({ ...form, devise: e.target.value as Devise })}
                    className={`${inputCls} flex-1 min-w-0`}>
                    {DEVISES_IMMO.map(d => <option key={d.code} value={d.code}>{d.code}</option>)}
                  </select>
                </div>
                {form.prix && (
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1 font-semibold">
                    = {formatPrix(parseFloat(form.prix) || 0, form.devise)}
                  </p>
                )}
              </div>

              {/* Localisation */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-sm font-bold text-foreground block mb-1.5">Ville *</label>
                  <input value={form.ville} onChange={e => setForm({ ...form, ville: e.target.value })} placeholder="Cotonou" className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground block mb-1.5">Quartier</label>
                  <input value={form.quartier} onChange={e => setForm({ ...form, quartier: e.target.value })} placeholder="Cadjehoun" className={inputCls} />
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-sm font-bold text-foreground block mb-1.5">Téléphone *</label>
                  <input value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} placeholder="+229..." className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-bold text-foreground block mb-1.5">WhatsApp</label>
                  <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="+229..." className={inputCls} />
                </div>
              </div>

              {/* Avertissement indicatif */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3.5 py-3 flex items-start gap-2.5">
                <span className="text-base flex-shrink-0 mt-0.5">⚠️</span>
                <div>
                  <p className="m-0 text-xs text-amber-800 dark:text-amber-300 font-bold leading-relaxed">
                    Indiquez l'indicatif du pays avant le numéro.
                  </p>
                  <p className="m-0 text-xs text-amber-700/70 dark:text-amber-400/70 mt-0.5">
                    Ex : +229 Bénin · +225 Côte d'Ivoire · +221 Sénégal
                  </p>
                </div>
              </div>

              {/* Caractéristiques terrain */}
              {form.type === "terrain" && (
                <div>
                  <label className="text-sm font-bold text-foreground block mb-1.5">Superficie (m²) *</label>
                  <input type="number" value={form.superficie} onChange={e => setForm({ ...form, superficie: e.target.value })} placeholder="Ex: 500" className={inputCls} />
                </div>
              )}

              {/* Caractéristiques maison/appart */}
              {(form.type === "maison" || form.type === "appartement") && (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> Chambres</label>
                      <input type="number" value={form.nb_chambres} onChange={e => setForm({ ...form, nb_chambres: e.target.value })} placeholder="3" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1"><Bath className="w-3.5 h-3.5" /> SDB</label>
                      <input type="number" value={form.nb_salles_bain} onChange={e => setForm({ ...form, nb_salles_bain: e.target.value })} placeholder="2" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-foreground block mb-1.5 flex items-center gap-1"><Maximize2 className="w-3.5 h-3.5" /> m²</label>
                      <input type="number" value={form.superficie} onChange={e => setForm({ ...form, superficie: e.target.value })} placeholder="120" className={inputCls} />
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-2">Transaction *</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUTS.map(s => (
                    <button key={s.value} type="button" onClick={() => setForm({ ...form, statut: s.value })}
                      className={`flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold cursor-pointer border-2 transition-all ${form.statut === s.value ? "text-white border-transparent" : "bg-muted text-muted-foreground border-border hover:border-muted-foreground"}`}
                      style={form.statut === s.value ? { background: s.bg, borderColor: s.bg } : {}}
                    >
                      <Tag className="w-4 h-4" />
                      {s.value === "vendre" ? "À vendre" : "À louer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <label className="text-sm font-bold text-foreground block mb-2 flex items-center justify-between">
                  Photos
                  <span className="text-xs text-muted-foreground font-normal">{form.images.length}/6</span>
                </label>
                {form.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-2.5">
                    {form.images.map((url, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "1" }}>
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setForm(prev => ({ ...prev, images: prev.images.filter((_, j) => j !== i) }))}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500 text-white border-none cursor-pointer text-xs flex items-center justify-center shadow-sm">×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotoUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploadingPhoto || form.images.length >= 6}
                  className="w-full py-4 rounded-xl border-2 border-dashed border-border bg-background text-muted-foreground text-sm flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all disabled:opacity-50">
                  <Image className="w-5 h-5" />
                  <span className="font-medium">{uploadingPhoto ? "Upload en cours…" : "Ajouter des photos"}</span>
                  <span className="text-xs opacity-60">JPG, PNG · Max 6 photos</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-2.5 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(emptyForm); }}
                  className="flex-1 py-3 rounded-xl border border-border bg-background text-muted-foreground text-sm font-semibold cursor-pointer hover:bg-muted transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-[2] py-3 rounded-xl text-stone-900 text-sm font-black border-none cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 transition-all active:scale-95"
                  style={{ background: saving ? "#fde68a" : "#facc15" }}>
                  {saving && <div style={{ width: 14, height: 14, border: "2px solid rgba(0,0,0,0.2)", borderTop: "2px solid #1c1917", borderRadius: "999px", animation: "spin 0.8s linear infinite" }} />}
                  {saving ? "Publication…" : editingId ? "✅ Modifier" : "✅ Publier l'annonce"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ RECHERCHE & FILTRES ══ */}
        <div className="flex flex-col gap-2.5">
          {/* Barre de recherche */}
          <div className="flex gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="Rechercher une annonce, une ville…"
                className="w-full pl-10 pr-3 h-11 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/10 placeholder:text-muted-foreground transition-all"
              />
            </div>
            <button
              onClick={() => setShowFiltres(!showFiltres)}
              className={`flex items-center gap-1.5 px-4 h-11 rounded-xl text-sm font-bold flex-shrink-0 cursor-pointer transition-all border ${hasFilters ? "bg-violet-600 text-white border-violet-600 shadow-sm" : "bg-background text-muted-foreground border-border hover:border-violet-400"}`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              {hasFilters ? "Filtrés" : "Filtres"}
            </button>
          </div>

          {/* Tabs types */}
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
            <button
              onClick={() => setFilterType("")}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${!filterType ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              <Home className="w-3.5 h-3.5" />
              Tout ({annonces.length})
            </button>
            {TYPES.map(t => {
              const TIcon = t.icon;
              const count = annonces.filter(a => a.type === t.value).length;
              return (
                <button key={t.value} onClick={() => setFilterType(filterType === t.value ? "" : t.value)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${filterType === t.value ? "bg-violet-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:bg-accent"}`}
                >
                  <TIcon className="w-3.5 h-3.5" />
                  {t.label} ({count})
                </button>
              );
            })}
          </div>

          {/* Panneau filtres avancés */}
          {showFiltres && (
            <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-2 mb-1">
                <Filter className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-bold text-foreground">Filtres avancés</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Ville</label>
                  <input value={filterVille} onChange={e => setFilterVille(e.target.value)} placeholder="Cotonou" className={inputCls} />
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1.5">Prix max (FCFA)</label>
                  <input type="number" value={filterPrixMax} onChange={e => setFilterPrixMax(e.target.value)} placeholder="50 000 000" className={inputCls} />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground block mb-1.5">Transaction</label>
                <div className="grid grid-cols-3 gap-2">
                  {["", "vendre", "louer"].map(v => (
                    <button key={v} type="button" onClick={() => setFilterStatut(v as Statut | "")}
                      className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer border transition-all ${filterStatut === v ? "bg-violet-600 text-white border-violet-600" : "bg-background text-muted-foreground border-border hover:border-violet-400"}`}
                    >
                      {v === "" ? "Toutes" : v === "vendre" ? "À vendre" : "À louer"}
                    </button>
                  ))}
                </div>
              </div>
              {hasFilters && (
                <button
                  onClick={() => { setFilterType(""); setFilterVille(""); setFilterPrixMax(""); setFilterStatut(""); }}
                  className="py-2.5 rounded-xl border border-red-200 dark:border-red-800 bg-background text-red-500 text-sm font-bold cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" /> Réinitialiser les filtres
                </button>
              )}
            </div>
          )}
        </div>

        {/* ══ LISTE ANNONCES ══ */}
        {loading ? (
          <div className="flex flex-col gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
                <div className="h-52 bg-muted animate-pulse" />
                <div className="p-4 flex flex-col gap-3">
                  <div className="h-4 bg-muted rounded-lg w-3/4 animate-pulse" />
                  <div className="h-3 bg-muted rounded-lg w-1/2 animate-pulse" />
                  <div className="flex gap-2">
                    <div className="h-3 bg-muted rounded-lg w-16 animate-pulse" />
                    <div className="h-3 bg-muted rounded-lg w-16 animate-pulse" />
                  </div>
                  <div className="h-5 bg-muted rounded-lg w-2/5 animate-pulse mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 px-6 bg-card rounded-2xl border border-border">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Home className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div className="font-bold text-base text-foreground mb-1">
              {annonces.length === 0 ? "Aucune annonce publiée" : "Aucun résultat"}
            </div>
            <div className="text-sm text-muted-foreground">
              {annonces.length === 0 ? "Les annonces apparaîtront ici." : "Essayez de modifier vos filtres."}
            </div>
            {hasFilters && (
              <button onClick={() => { setFilterType(""); setFilterVille(""); setFilterPrixMax(""); setFilterStatut(""); }}
                className="mt-4 px-4 py-2 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 text-sm font-bold cursor-pointer border-none hover:bg-violet-100 transition-colors">
                Effacer les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground font-semibold">
                {filtered.length} annonce{filtered.length > 1 ? "s" : ""} trouvée{filtered.length > 1 ? "s" : ""}
              </p>
              {hasFilters && (
                <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 font-bold px-2.5 py-1 rounded-full">
                  Filtres actifs
                </span>
              )}
            </div>
            <div className="flex flex-col gap-4">
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
