/**
 * NouveauProduitPage — Page dédiée à l'ajout et à la modification d'un produit physique
 * Accès : /boutique/produits/nouveau (création) ou /boutique/produits/modifier/:id (édition)
 */

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser, hasNexoraPremium } from "@/lib/nexora-auth";
import { useNavigate, useParams } from "react-router-dom";
import {
  Plus, Trash2, Package, Star,
  Tag, Image, AlertCircle, Crown,
  ArrowLeft, Save, CheckCircle2, ChevronRight
} from "lucide-react";
import { formatPrix } from "@/lib/devise-utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Variation { nom: string; valeurs: string[]; }
interface PaiementProduit { reseau: string; numero: string; nom_titulaire: string; }
interface ReseauxSociaux {
  instagram: string; tiktok: string; facebook: string;
  youtube: string; whatsapp: string; site_web: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const CATEGORIES_PHYSIQUE = [
  "Vêtements", "Chaussures", "Accessoires", "Électronique",
  "Alimentation", "Beauté & Santé", "Maison & Déco",
  "Sport", "Enfants", "Auto & Moto", "Autre",
];

const SECTIONS = [
  { id: "general",    label: "Général",    icon: "📋" },
  { id: "media",      label: "Médias",     icon: "🖼️" },
  { id: "prix",       label: "Prix & Stock", icon: "💰" },
  { id: "variations", label: "Variations", icon: "🎨" },
  { id: "paiement",   label: "Paiement",   icon: "💳" },
  { id: "reseaux",    label: "Réseaux",    icon: "🌐" },
  { id: "politiques", label: "Politiques", icon: "📜" },
  { id: "seo",        label: "SEO",        icon: "🔍" },
];

const RESEAUX_LINKS = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/...",  icon: "📸" },
  { key: "tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@...",    icon: "🎵" },
  { key: "facebook",  label: "Facebook",  placeholder: "https://facebook.com/...",   icon: "👥" },
  { key: "youtube",   label: "YouTube",   placeholder: "https://youtube.com/@...",   icon: "▶️" },
  { key: "whatsapp",  label: "WhatsApp",  placeholder: "+229 XX XX XX XX",           icon: "💬" },
  { key: "site_web",  label: "Site web",  placeholder: "https://votre-site.com",     icon: "🌐" },
];

const EMPTY_RESEAUX: ReseauxSociaux = {
  instagram: "", tiktok: "", facebook: "", youtube: "", whatsapp: "", site_web: "",
};

function calcPct(prix: number, promo: number): number {
  return Math.round(((prix - promo) / prix) * 100);
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function NouveauProduitPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id: editingId } = useParams<{ id?: string }>();
  const isEditing = !!editingId;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPremium = hasNexoraPremium();

  const [boutique, setBoutique] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState("general");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [variations, setVariations] = useState<Variation[]>([]);
  const [newVarNom, setNewVarNom] = useState("");
  const [newVarValeurs, setNewVarValeurs] = useState("");
  const [newTag, setNewTag] = useState("");
  const [newPaiement, setNewPaiement] = useState<PaiementProduit>({
    reseau: "", numero: "", nom_titulaire: "",
  });

  const emptyForm = {
    nom: "", description: "", prix: "", prix_promo: "",
    categorie: "", tags: [] as string[],
    stock: "0", stock_illimite: false,
    photos: [] as string[], photo_url: "",
    actif: true, vedette: false,
    paiement_reception: true, paiement_lien: "",
    moyens_paiement: [] as PaiementProduit[],
    politique_remboursement: "", politique_confidentialite: "",
    reseaux_sociaux: { ...EMPTY_RESEAUX },
    poids: "", dimensions: "", sku: "",
    seo_titre: "", seo_description: "",
  };

  const [form, setForm] = useState(emptyForm);
  const pct = form.prix && form.prix_promo
    ? calcPct(parseFloat(form.prix), parseFloat(form.prix_promo))
    : 0;

  // ── État pour la modale de confirmation de redimensionnement ──
  const [resizeModal, setResizeModal] = useState<{
    file: File;
    originalW: number;
    originalH: number;
    targetSize: AllowedSize;
    inputRef: React.RefObject<HTMLInputElement>;
  } | null>(null);

  // ── Chargement initial ──
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const userId = getNexoraUser()?.id;
      if (!userId) { setLoading(false); return; }

      const { data: b } = await supabase
        .from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
      if (b) setBoutique(b);

      // Mode édition : charger les données du produit
      if (editingId && b) {
        const { data: p } = await supabase
          .from("produits" as any).select("*, variations_produit(*)")
          .eq("id", editingId).eq("boutique_id", (b as any).id).maybeSingle();
        if (p) {
          setForm({
            nom: (p as any).nom || "",
            description: (p as any).description || "",
            prix: String((p as any).prix || ""),
            prix_promo: String((p as any).prix_promo || ""),
            categorie: (p as any).categorie || "",
            tags: (p as any).tags || [],
            stock: String((p as any).stock || "0"),
            stock_illimite: (p as any).stock_illimite || false,
            photos: (p as any).photos || [],
            photo_url: "",
            actif: (p as any).actif ?? true,
            vedette: (p as any).vedette || false,
            paiement_reception: (p as any).paiement_reception ?? true,
            paiement_lien: (p as any).paiement_lien || "",
            moyens_paiement: (p as any).moyens_paiement || [],
            politique_remboursement: (p as any).politique_remboursement || "",
            politique_confidentialite: (p as any).politique_confidentialite || "",
            reseaux_sociaux: (p as any).reseaux_sociaux || { ...EMPTY_RESEAUX },
            poids: (p as any).poids || "",
            dimensions: (p as any).dimensions || "",
            sku: (p as any).sku || "",
            seo_titre: (p as any).seo_titre || "",
            seo_description: (p as any).seo_description || "",
          });
          setVariations((p as any).variations_produit || []);
        }
      }
      setLoading(false);
    };
    init();
  }, [editingId]);

  // ── Mur premium ──
  if (!isPremium) {
    return (
      <BoutiqueLayout boutiqueName="Nexora Shop">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs">
            La boutique est réservée aux membres <span className="font-bold text-yellow-600">Premium</span>.
          </p>
          <Button
            onClick={() => navigate("/boutique/parametres")}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-8 py-3 rounded-xl gap-2"
          >
            <Crown className="w-4 h-4" /> Passer à Premium
          </Button>
        </div>
      </BoutiqueLayout>
    );
  }

  // ── Constantes dimensions autorisées ──
  const ALLOWED_SIZES = [600, 800, 1080] as const;
  type AllowedSize = typeof ALLOWED_SIZES[number];

  // ── Obtenir les dimensions via FileReader (plus robuste que createObjectURL) ──
  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) { reject(new Error("FileReader vide")); return; }
        const img = new window.Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => reject(new Error("Image invalide ou corrompue"));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("Lecture fichier impossible"));
      reader.readAsDataURL(file);
    });

  // ── Redimensionner une image vers une taille carré cible via canvas ──
  const resizeImage = (file: File, targetSize: AllowedSize): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) { reject(new Error("FileReader vide")); return; }
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas non disponible")); return; }
          const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - srcSize) / 2;
          const sy = (img.naturalHeight - srcSize) / 2;
          ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, targetSize, targetSize);
          canvas.toBlob(
            (blob) => blob ? resolve(blob) : reject(new Error("Échec de la conversion canvas")),
            "image/jpeg", 0.92
          );
        };
        img.onerror = () => reject(new Error("Chargement image échoué"));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("Lecture fichier impossible"));
      reader.readAsDataURL(file);
    });

  // ── Trouver la taille cible la plus proche (inférieure ou égale) ──
  const findBestTargetSize = (w: number, h: number): AllowedSize | null => {
    const maxDim = Math.max(w, h);
    // Taille valide si carré + dimension autorisée
    if (w === h && (ALLOWED_SIZES as readonly number[]).includes(w)) return w as AllowedSize;
    // Sinon on prend la taille autorisée la plus proche inférieure
    const sorted = [...ALLOWED_SIZES].sort((a, b) => b - a);
    return sorted.find((s) => s <= maxDim) ?? ALLOWED_SIZES[0];
  };

  // ── Upload photo — avec validation + redimensionnement intelligent ──
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Type MIME
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Format non supporté", description: "JPG, PNG, WEBP ou GIF uniquement.", variant: "destructive" });
      e.target.value = ""; return;
    }

    // 2. Taille fichier
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "Maximum 5 MB par image.", variant: "destructive" });
      e.target.value = ""; return;
    }

    // 3. Lire les dimensions
    let dims: { width: number; height: number };
    try {
      dims = await getImageDimensions(file);
    } catch {
      toast({ title: "Erreur lecture image", variant: "destructive" });
      e.target.value = ""; return;
    }

    const { width, height } = dims;
    const isSquare = width === height;
    const isAllowedSize = isSquare && (ALLOWED_SIZES as readonly number[]).includes(width);

    // 4a. ✅ Image parfaite — upload direct
    if (isAllowedSize) {
      await doUpload(file);
      e.target.value = "";
      return;
    }

    // 4b. ❌ Non conforme — trouver la meilleure taille cible et afficher la modale
    const targetSize = findBestTargetSize(width, height) ?? 800;
    setResizeModal({ file, originalW: width, originalH: height, targetSize, inputRef: fileInputRef });
    e.target.value = "";
  };

  // ── Upload effectif (fichier déjà validé ou redimensionné) ──
  const doUpload = async (fileOrBlob: File | Blob, forceJpeg = false) => {
    setUploadingPhoto(true);
    try {
      const userId = getNexoraUser()?.id ?? "anonymous";
      const ext = forceJpeg ? "jpg" : ((fileOrBlob as File).name?.split(".").pop()?.toLowerCase() ?? "jpg");
      const contentType = forceJpeg ? "image/jpeg" : (fileOrBlob.type || "image/jpeg");
      const path = `boutique-produits/${userId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("mes-secrets-media").upload(path, fileOrBlob, {
        upsert: true, contentType,
      });
      if (error) throw new Error(error.message);
      const { data: urlData } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
      setForm((prev) => ({ ...prev, photos: [...prev.photos, urlData.publicUrl] }));
      toast({ title: "✅ Photo ajoutée !" });
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // ── Handler : l'utilisateur choisit de redimensionner ──
  const handleConfirmResize = async () => {
    if (!resizeModal) return;
    setResizeModal(null);
    try {
      const blob = await resizeImage(resizeModal.file, resizeModal.targetSize);
      await doUpload(blob, true);
    } catch (err: any) {
      toast({ title: "Erreur redimensionnement", description: err.message, variant: "destructive" });
    }
  };

  // ── Handler : l'utilisateur préfère choisir une autre image ──
  const handleCancelResize = () => {
    setResizeModal(null);
    // Ré-ouvrir le sélecteur de fichiers
    setTimeout(() => fileInputRef.current?.click(), 100);
  };

  const addTag = () => {
    if (!newTag.trim()) return;
    setForm((prev) => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
    setNewTag("");
  };

  const addVariation = () => {
    if (!newVarNom) return;
    const valeurs = newVarValeurs.split(",").map((v) => v.trim()).filter(Boolean);
    if (!valeurs.length) return;
    setVariations((prev) => [...prev, { nom: newVarNom, valeurs }]);
    setNewVarNom(""); setNewVarValeurs("");
  };

  const addPaiement = () => {
    if (!newPaiement.reseau || !newPaiement.numero) {
      toast({ title: "Réseau et numéro requis", variant: "destructive" }); return;
    }
    setForm((prev) => ({ ...prev, moyens_paiement: [...prev.moyens_paiement, { ...newPaiement }] }));
    setNewPaiement({ reseau: "", numero: "", nom_titulaire: "" });
  };

  // ── Soumission ──
  const handleSubmit = async () => {
    if (!boutique) {
      toast({ title: "Boutique introuvable", description: "Configurez d'abord votre boutique.", variant: "destructive" }); return;
    }
    if (!form.nom || !form.prix) {
      toast({ title: "Champs obligatoires", description: "Le nom et le prix sont requis.", variant: "destructive" }); return;
    }
    setSaving(true);
    const payload = {
      boutique_id: boutique.id, type: "physique",
      nom: form.nom,
      description: form.description || null,
      prix: parseFloat(form.prix),
      prix_promo: form.prix_promo ? parseFloat(form.prix_promo) : null,
      categorie: form.categorie || null,
      tags: form.tags,
      stock: form.stock_illimite ? 0 : parseInt(form.stock) || 0,
      stock_illimite: form.stock_illimite,
      photos: form.photos,
      actif: form.actif,
      vedette: form.vedette,
      paiement_reception: form.paiement_reception,
      paiement_lien: form.paiement_lien || null,
      moyens_paiement: form.moyens_paiement,
      politique_remboursement: form.politique_remboursement || null,
      politique_confidentialite: form.politique_confidentialite || null,
      reseaux_sociaux: form.reseaux_sociaux,
      poids: form.poids || null,
      dimensions: form.dimensions || null,
      sku: form.sku || null,
      seo_titre: (form as any).seo_titre || null,
      seo_description: (form as any).seo_description || null,
    };

    let produitId = editingId;

    if (editingId) {
      const { error } = await supabase.from("produits" as any).update(payload).eq("id", editingId);
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setSaving(false); return;
      }
      await supabase.from("variations_produit" as any).delete().eq("produit_id", editingId);
    } else {
      const { data, error } = await supabase.from("produits" as any).insert(payload).select().single();
      if (error) {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
        setSaving(false); return;
      }
      produitId = (data as any).id;
    }

    if (variations.length > 0 && produitId) {
      await supabase.from("variations_produit" as any).insert(
        variations.map((v) => ({ produit_id: produitId, nom: v.nom, valeurs: v.valeurs }))
      );
    }

    setSaved(true);
    toast({ title: `✅ Produit ${editingId ? "modifié" : "créé"} avec succès !` });
    setTimeout(() => {
      setSaving(false);
      navigate("/boutique/produits");
    }, 1200);
  };

  if (loading) {
    return (
      <BoutiqueLayout boutiqueName="">
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </BoutiqueLayout>
    );
  }

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-14 max-w-2xl mx-auto">

        {/* ── Header de la page ── */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/boutique/produits")}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-800 truncate">
              {isEditing ? "Modifier le produit" : "Nouveau produit"}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">Produit physique</p>
          </div>
          {pct > 0 && (
            <span className="bg-red-500 text-white text-sm font-black px-3 py-1 rounded-full flex-shrink-0">
              -{pct}%
            </span>
          )}
        </div>

        {/* ── Navigation sections ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeSection === s.id
                  ? "bg-pink-500 text-white shadow-sm shadow-pink-200"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              <span>{s.icon}</span>
              {s.label}
              {activeSection === s.id && <ChevronRight className="w-3 h-3 opacity-60" />}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════
            SECTIONS DE FORMULAIRE
        ══════════════════════════════════════ */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-5">

          {/* ── Général ── */}
          {activeSection === "general" && (
            <div className="space-y-5">
              <div>
                <label className="text-sm font-semibold text-gray-700">Nom du produit *</label>
                <Input
                  value={form.nom}
                  onChange={(e) => setForm({ ...form, nom: e.target.value })}
                  placeholder="Ex : T-shirt Premium Coton"
                  className="mt-1.5 h-11 rounded-xl"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Décrivez votre produit en détail : matière, utilisation, avantages..."
                  className="mt-1.5 w-full h-36 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
                />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Catégorie</label>
                <select
                  value={form.categorie}
                  onChange={(e) => setForm({ ...form, categorie: e.target.value })}
                  className="mt-1.5 w-full h-11 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
                >
                  <option value="">-- Sélectionner une catégorie --</option>
                  {CATEGORIES_PHYSIQUE.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Tags</label>
                <div className="flex gap-2 mt-1.5">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addTag()}
                    placeholder="Ajouter un tag..."
                    className="flex-1 h-10 rounded-xl"
                  />
                  <Button
                    type="button" size="sm" variant="outline"
                    onClick={addTag}
                    className="rounded-xl h-10 px-3"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2.5">
                    {form.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 bg-pink-50 text-pink-600 text-xs px-3 py-1.5 rounded-full border border-pink-100"
                      >
                        <Tag className="w-3 h-3" /> {tag}
                        <button
                          onClick={() =>
                            setForm((prev) => ({ ...prev, tags: prev.tags.filter((_, j) => j !== i) }))
                          }
                          className="ml-0.5 text-pink-400 hover:text-pink-600"
                        >×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700">SKU / Référence</label>
                  <Input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    placeholder="REF-001"
                    className="mt-1.5 h-10 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Poids</label>
                  <Input
                    value={form.poids}
                    onChange={(e) => setForm({ ...form, poids: e.target.value })}
                    placeholder="Ex : 500g"
                    className="mt-1.5 h-10 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Dimensions</label>
                <Input
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  placeholder="Ex : 30cm × 20cm × 10cm"
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-3.5 cursor-pointer"
                  onClick={() => setForm((prev) => ({ ...prev, actif: !prev.actif }))}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Actif</p>
                    <p className="text-xs text-gray-400">Visible en boutique</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${form.actif ? "bg-green-500" : "bg-gray-300"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.actif ? "left-6" : "left-1"}`} />
                  </div>
                </div>
                <div
                  className="flex items-center justify-between bg-gray-50 rounded-xl p-3.5 cursor-pointer"
                  onClick={() => setForm((prev) => ({ ...prev, vedette: !prev.vedette }))}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Vedette</p>
                    <p className="text-xs text-gray-400">Mis en avant</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${form.vedette ? "bg-amber-400" : "bg-gray-300"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.vedette ? "left-6" : "left-1"}`} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Médias ── */}
          {activeSection === "media" && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Photos du produit
                  <span className="ml-2 text-xs text-gray-400 font-normal">(JPG, PNG, WEBP — max 5 MB)</span>
                </p>
                {form.photos.length > 0 && (
                  <div className="flex gap-3 flex-wrap mb-4">
                    {form.photos.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url} alt=""
                          className="w-24 h-24 object-cover rounded-2xl border-2 border-gray-100 shadow-sm"
                        />
                        {i === 0 && (
                          <span className="absolute bottom-1.5 left-1.5 bg-pink-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                            Principale
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, photos: prev.photos.filter((_, j) => j !== i) }))}
                          className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <Button
                  type="button" variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="w-full h-11 rounded-xl gap-2 border-dashed border-2 border-pink-200 text-pink-600 hover:bg-pink-50"
                >
                  <Image className="w-4 h-4" />
                  {uploadingPhoto ? "Upload en cours…" : "Choisir une photo depuis l'appareil"}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400 font-medium">ou par URL</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="flex gap-2">
                <Input
                  value={form.photo_url}
                  onChange={(e) => setForm({ ...form, photo_url: e.target.value })}
                  placeholder="https://exemple.com/photo.jpg"
                  className="flex-1 h-10 rounded-xl"
                />
                <Button
                  type="button" size="sm" variant="outline"
                  onClick={() => {
                    if (form.photo_url.trim())
                      setForm((prev) => ({
                        ...prev,
                        photos: [...prev.photos, prev.photo_url],
                        photo_url: "",
                      }));
                  }}
                  className="rounded-xl h-10 px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Prix & Stock ── */}
          {activeSection === "prix" && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700">Prix réel *</label>
                  <Input
                    type="number" min="0"
                    value={form.prix}
                    onChange={(e) => setForm({ ...form, prix: e.target.value })}
                    placeholder="0"
                    className="mt-1.5 h-11 rounded-xl text-base font-bold"
                  />
                  {form.prix && (
                    <p className="text-xs text-red-500 font-bold line-through mt-1">
                      {formatPrix(parseFloat(form.prix), boutique?.devise || "XOF")}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700">Prix promotionnel</label>
                  <Input
                    type="number" min="0"
                    value={form.prix_promo}
                    onChange={(e) => setForm({ ...form, prix_promo: e.target.value })}
                    placeholder="0"
                    className="mt-1.5 h-11 rounded-xl text-base font-bold text-rose-500"
                  />
                  {pct > 0 && (
                    <p className="text-xs text-green-600 font-bold mt-1">🎉 Réduction de {pct}%</p>
                  )}
                </div>
              </div>

              {/* Aperçu prix */}
              {form.prix && (
                <div className="bg-gray-50 rounded-2xl p-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Aperçu</p>
                  <div className="flex items-center gap-4 flex-nowrap">
                    <span className="text-2xl font-black text-rose-500 whitespace-nowrap">
                      {formatPrix(
                        form.prix_promo ? parseFloat(form.prix_promo) : parseFloat(form.prix),
                        boutique?.devise || "XOF"
                      )}
                    </span>
                    {form.prix_promo && (
                      <span className="text-2xl font-black text-red-400 line-through whitespace-nowrap opacity-80">
                        {formatPrix(parseFloat(form.prix), boutique?.devise || "XOF")}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-2xl p-4 space-y-4">
                <p className="text-sm font-semibold text-gray-700">Gestion du stock</p>
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setForm((prev) => ({ ...prev, stock_illimite: !prev.stock_illimite }))}
                >
                  <div>
                    <p className="text-sm font-medium text-gray-800">Stock illimité</p>
                    <p className="text-xs text-gray-400">Idéal pour les services ou produits numériques</p>
                  </div>
                  <div className={`relative w-11 h-6 rounded-full transition-colors ${form.stock_illimite ? "bg-green-500" : "bg-gray-300"}`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.stock_illimite ? "left-6" : "left-1"}`} />
                  </div>
                </div>
                {!form.stock_illimite && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Quantité en stock</label>
                    <Input
                      type="number" min="0"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      placeholder="0"
                      className="mt-1.5 h-10 rounded-xl"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Variations ── */}
          {activeSection === "variations" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Définissez les options de votre produit : taille, couleur, matériau…</p>

              {variations.map((v, i) => (
                <div key={i} className="flex items-start justify-between bg-gray-50 rounded-2xl p-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">{v.nom}</p>
                    <div className="flex gap-1.5 flex-wrap mt-2">
                      {v.valeurs.map((val, j) => (
                        <span key={j} className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1 rounded-full">
                          {val}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariations((prev) => prev.filter((_, j) => j !== i))}
                    className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center ml-2 flex-shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="border-2 border-dashed border-pink-200 rounded-2xl p-4 space-y-3 bg-pink-50/30">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Nouvelle variation</p>
                <Input
                  value={newVarNom}
                  onChange={(e) => setNewVarNom(e.target.value)}
                  placeholder="Nom (ex : Taille, Couleur)"
                  className="h-10 rounded-xl"
                />
                <Input
                  value={newVarValeurs}
                  onChange={(e) => setNewVarValeurs(e.target.value)}
                  placeholder="Valeurs séparées par virgule (ex : S, M, L, XL)"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button" size="sm"
                  onClick={addVariation}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter la variation
                </Button>
              </div>
            </div>
          )}

          {/* ── Paiement ── */}
          {activeSection === "paiement" && (
            <div className="space-y-4">
              <div
                className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl cursor-pointer"
                onClick={() => setForm((prev) => ({ ...prev, paiement_reception: !prev.paiement_reception }))}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">Paiement à la réception</p>
                  <p className="text-xs text-gray-400 mt-0.5">Le client paie à la livraison</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${form.paiement_reception ? "bg-green-500" : "bg-gray-300"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${form.paiement_reception ? "left-6" : "left-1"}`} />
                </div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-700">Lien de paiement</label>
                <Input
                  value={form.paiement_lien}
                  onChange={(e) => setForm({ ...form, paiement_lien: e.target.value })}
                  placeholder="https://pay.wave.com/..."
                  className="mt-1.5 h-10 rounded-xl"
                />
              </div>

              {form.moyens_paiement.map((mp, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-50 rounded-2xl p-3.5">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{mp.reseau}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{mp.nom_titulaire} — {mp.numero}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, moyens_paiement: prev.moyens_paiement.filter((_, j) => j !== i) }))}
                    className="w-8 h-8 rounded-xl bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <div className="border-2 border-dashed border-pink-200 rounded-2xl p-4 space-y-3 bg-pink-50/30">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Ajouter Mobile Money</p>
                <Input
                  value={newPaiement.reseau}
                  onChange={(e) => setNewPaiement((prev) => ({ ...prev, reseau: e.target.value }))}
                  placeholder="MTN MoMo, Wave, Orange Money…"
                  className="h-10 rounded-xl"
                />
                <Input
                  value={newPaiement.nom_titulaire}
                  onChange={(e) => setNewPaiement((prev) => ({ ...prev, nom_titulaire: e.target.value }))}
                  placeholder="Nom du titulaire"
                  className="h-10 rounded-xl"
                />
                <Input
                  value={newPaiement.numero}
                  onChange={(e) => setNewPaiement((prev) => ({ ...prev, numero: e.target.value }))}
                  placeholder="Numéro de téléphone"
                  className="h-10 rounded-xl"
                />
                <Button
                  type="button" size="sm"
                  onClick={addPaiement}
                  className="w-full bg-pink-500 hover:bg-pink-600 text-white rounded-xl gap-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Ajouter
                </Button>
              </div>
            </div>
          )}

          {/* ── Réseaux sociaux ── */}
          {activeSection === "reseaux" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Ajoutez vos liens sociaux pour augmenter votre visibilité et créer du lien avec vos clients.
              </p>
              {RESEAUX_LINKS.map((r) => (
                <div key={r.key}>
                  <label className="text-sm font-medium text-gray-700">
                    {r.icon} {r.label}
                  </label>
                  <Input
                    value={(form.reseaux_sociaux as any)[r.key] || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        reseaux_sociaux: { ...prev.reseaux_sociaux, [r.key]: e.target.value },
                      }))
                    }
                    placeholder={r.placeholder}
                    className="mt-1.5 h-10 rounded-xl"
                  />
                </div>
              ))}
            </div>
          )}

          {/* ── Politiques ── */}
          {activeSection === "politiques" && (
            <div className="space-y-5">
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs font-bold text-amber-700">Conseil vendeur</p>
                </div>
                <p className="text-xs text-amber-600">
                  Des politiques claires augmentent la confiance de vos clients et réduisent les litiges.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Politique de remboursement</label>
                <textarea
                  value={form.politique_remboursement}
                  onChange={(e) => setForm({ ...form, politique_remboursement: e.target.value })}
                  placeholder="Ex : Remboursement accepté dans les 7 jours suivant la réception si le produit est défectueux…"
                  className="mt-1.5 w-full h-32 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Politique de confidentialité</label>
                <textarea
                  value={form.politique_confidentialite}
                  onChange={(e) => setForm({ ...form, politique_confidentialite: e.target.value })}
                  placeholder="Ex : Vos données personnelles sont utilisées uniquement pour traiter votre commande…"
                  className="mt-1.5 w-full h-32 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
                />
              </div>
            </div>
          )}

          {/* ── SEO ── */}
          {activeSection === "seo" && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                <p className="text-xs text-blue-700 font-medium">
                  🔍 Optimisez votre fiche produit pour être mieux référencé sur Google.
                </p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Titre SEO</label>
                <Input
                  value={(form as any).seo_titre || ""}
                  onChange={(e) => setForm({ ...form, seo_titre: e.target.value } as any)}
                  placeholder="Titre optimisé pour les moteurs de recherche"
                  className="mt-1.5 h-10 rounded-xl"
                  maxLength={60}
                />
                <p className="text-xs text-gray-400 mt-1">{((form as any).seo_titre || "").length}/60 caractères</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700">Description SEO</label>
                <textarea
                  value={(form as any).seo_description || ""}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value } as any)}
                  placeholder="Description courte et percutante du produit pour Google…"
                  maxLength={160}
                  className="mt-1.5 w-full h-24 px-4 py-3 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-300 transition"
                />
                <p className="text-xs text-gray-400 mt-1">{((form as any).seo_description || "").length}/160 caractères</p>
              </div>

              {((form as any).seo_titre || form.nom) && (
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Aperçu Google</p>
                  <p className="text-blue-600 text-sm font-semibold line-clamp-1">
                    {(form as any).seo_titre || form.nom}
                  </p>
                  <p className="text-green-600 text-xs mt-0.5 line-clamp-1">
                    votre-boutique.com/produits/{form.nom.toLowerCase().replace(/\s+/g, "-")}
                  </p>
                  <p className="text-gray-500 text-xs mt-1 line-clamp-2">
                    {(form as any).seo_description || form.description || "Aucune description SEO définie."}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Barre de progression sections ── */}
        <div className="flex items-center gap-1.5 px-1">
          {SECTIONS.map((s) => (
            <div
              key={s.id}
              className={`flex-1 h-1 rounded-full transition-all ${
                activeSection === s.id ? "bg-pink-500" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

        {/* ── Boutons d'action ── */}
        <div className="flex gap-3 sticky bottom-4">
          <Button
            type="button" variant="outline"
            onClick={() => navigate("/boutique/produits")}
            className="flex-1 h-12 rounded-2xl font-semibold border-gray-200"
          >
            Annuler
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className={`flex-1 h-12 rounded-2xl font-bold gap-2 text-white shadow-lg transition-all ${
              saved
                ? "bg-green-500 hover:bg-green-600 shadow-green-200"
                : "bg-pink-500 hover:bg-pink-600 shadow-pink-200"
            }`}
          >
            {saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Enregistré !</>
            ) : saving ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Sauvegarde…</>
            ) : (
              <><Save className="w-4 h-4" /> {isEditing ? "Enregistrer les modifications" : "Créer le produit"}</>
            )}
          </Button>
        </div>

      </div>

      {/* ════ MODALE — Confirmation redimensionnement image ════ */}
      {resizeModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-6 space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7 text-amber-500" />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-black text-gray-900">Image non conforme</h3>
              <p className="text-sm text-gray-500">
                Votre image fait{" "}
                <span className="font-bold text-gray-700">{resizeModal.originalW} × {resizeModal.originalH} px</span>
                {resizeModal.originalW !== resizeModal.originalH && (
                  <span className="text-red-500"> (non carré ❌)</span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Dimensions autorisées (ratio 1:1)</p>
              <div className="flex gap-2 flex-wrap">
                {ALLOWED_SIZES.map((s) => (
                  <span
                    key={s}
                    className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                      s === resizeModal.targetSize
                        ? "bg-rose-100 text-rose-600 border-rose-200"
                        : "bg-gray-100 text-gray-500 border-gray-200"
                    }`}
                  >
                    {s}×{s}px
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-500 pt-1">
                Sera rognée et redimensionnée en{" "}
                <span className="font-bold text-rose-500">{resizeModal.targetSize}×{resizeModal.targetSize} px</span>.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleConfirmResize}
                disabled={uploadingPhoto}
                className="w-full h-12 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {uploadingPhoto ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Redimensionnement…</>
                ) : (
                  <>✂️ Redimensionner automatiquement</>
                )}
              </button>
              <button
                onClick={handleCancelResize}
                disabled={uploadingPhoto}
                className="w-full h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-2xl transition-colors disabled:opacity-60"
              >
                📁 Choisir une autre image
              </button>
            </div>
          </div>
        </div>
      )}

    </BoutiqueLayout>
  );
}
