import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AppLayout from "@/components/AppLayout";
import {
  ArrowLeft, MapPin, Phone, MessageCircle, Heart, User,
  Share2, Copy, CheckCircle2, Home, Calendar, Tag, Eye
} from "lucide-react";
import SectionAvis from "@/pages/boutique/SectionAvis";

interface Annonce {
  id: string;
  user_id: string;
  auteur_nom: string;
  titre: string;
  description: string;
  prix: number;
  type: string;
  ville: string;
  quartier: string;
  images: string[];
  contact: string;
  whatsapp: string;
  statut: string;
  favoris?: string[];
  created_at: string;
}

const TYPE_LABELS: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  maison:      { label: "Maison",      emoji: "🏠", color: "#c2410c", bg: "#fff7ed" },
  terrain:     { label: "Terrain",     emoji: "🌿", color: "#15803d", bg: "#f0fdf4" },
  appartement: { label: "Appartement", emoji: "🏢", color: "#1d4ed8", bg: "#eff6ff" },
  boutique:    { label: "Boutique",    emoji: "🏪", color: "#7e22ce", bg: "#faf5ff" },
};

const STATUT_INFO: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#22c55e" },
  vendu:      { label: "Vendu",      color: "#ef4444" },
  loue:       { label: "Loué",       color: "#eab308" },
};

function formatPrix(prix: number) {
  return prix.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " FCFA";
}

export default function AnnonceDetailPage() {
  const { id: annonceId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [annonce, setAnnonce] = useState<Annonce | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!annonceId) return;
      const { data } = await supabase
        .from("nexora_annonces_immo" as any)
        .select("*")
        .eq("id", annonceId)
        .maybeSingle();
      if (data) {
        setAnnonce({ ...(data as any), images: (data as any).images || [] });
      }
      setLoading(false);
    };
    load();
  }, [annonceId]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Chargement ──
  if (loading) return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
      </div>
    </AppLayout>
  );

  // ── Annonce introuvable ──
  if (!annonce) return (
    <AppLayout>
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Home className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground">Annonce introuvable</h2>
          <p className="text-muted-foreground mt-2 mb-4">Cette annonce n'existe plus ou a été supprimée.</p>
          <button onClick={() => navigate("/immobilier")}
            className="inline-flex items-center gap-2 text-purple-600 font-semibold hover:underline">
            <ArrowLeft className="w-4 h-4" /> Retour au marché
          </button>
        </div>
      </div>
    </AppLayout>
  );

  const images = annonce.images || [];
  const typeInfo = TYPE_LABELS[annonce.type] || { label: annonce.type, emoji: "🏠", color: "#7c3aed", bg: "#faf5ff" };
  const statutInfo = STATUT_INFO[annonce.statut] || { label: annonce.statut, color: "#6b7280" };
  const whatsappMsg = encodeURIComponent(`Bonjour, je suis intéressé(e) par votre annonce : "${annonce.titre}" sur NEXORA.`);

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button onClick={() => navigate("/immobilier")} className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Marché Immobilier
          </button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{annonce.titre}</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">

          {/* ── Galerie Photos ── */}
          <div className="space-y-3">
            <div className="bg-card rounded-3xl border border-border overflow-hidden shadow-sm"
              style={{ boxShadow: "0 0 0 2px #7c3aed44, 0 4px 24px #7c3aed22" }}>
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={annonce.titre}
                  className="w-full object-cover rounded-3xl"
                  style={{ maxHeight: "480px" }}
                />
              ) : (
                <div className="w-full h-64 flex items-center justify-center text-7xl"
                  style={{ background: typeInfo.bg }}>
                  {typeInfo.emoji}
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImage(i)}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === i
                        ? "border-purple-500 shadow-lg shadow-purple-200 dark:shadow-purple-900"
                        : "border-border"
                    }`}>
                    <img src={img} alt="" className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Infos rapides */}
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <Tag className="w-4 h-4 mx-auto mb-1 text-purple-500" />
                <p className="text-muted-foreground text-xs">Type</p>
                <p className="font-bold text-foreground text-xs mt-0.5">{typeInfo.emoji} {typeInfo.label}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <div className="w-4 h-4 rounded-full mx-auto mb-1" style={{ background: statutInfo.color }} />
                <p className="text-muted-foreground text-xs">Statut</p>
                <p className="font-bold text-xs mt-0.5" style={{ color: statutInfo.color }}>{statutInfo.label}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-3 text-center">
                <Calendar className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                <p className="text-muted-foreground text-xs">Publié</p>
                <p className="font-bold text-foreground text-xs mt-0.5">
                  {new Date(annonce.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })}
                </p>
              </div>
            </div>
          </div>

          {/* ── Détails & Actions ── */}
          <div className="space-y-4">

            {/* Titre & Prix */}
            <div className="bg-card rounded-3xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold"
                  style={{ background: typeInfo.bg, color: typeInfo.color }}>
                  {typeInfo.emoji} {typeInfo.label}
                </span>
                <span className="inline-flex rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ background: statutInfo.color }}>
                  {statutInfo.label}
                </span>
              </div>

              <div>
                <h1 className="text-2xl font-black text-foreground leading-tight">{annonce.titre}</h1>
                <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-2">
                  <MapPin className="w-4 h-4 text-purple-400" />
                  {annonce.quartier ? `${annonce.quartier}, ` : ""}{annonce.ville}
                </div>
              </div>

              <div className="text-3xl font-black" style={{ color: "#7c3aed" }}>
                {formatPrix(annonce.prix)}
              </div>

              {annonce.description && (
                <p className="text-sm text-muted-foreground leading-relaxed border-t border-border pt-4">
                  {annonce.description}
                </p>
              )}

              {/* Vendeur */}
              <div className="flex items-center gap-3 bg-muted/50 rounded-2xl p-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                  <User className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">Publié par</p>
                  <p className="font-bold text-sm text-foreground truncate">{annonce.auteur_nom}</p>
                </div>
                <button
                  onClick={() => navigate(`/immobilier/vendeur/${annonce.user_id}`)}
                  className="text-xs font-bold text-purple-600 hover:underline flex-shrink-0">
                  Voir la boutique →
                </button>
              </div>
            </div>

            {/* Boutons de contact — accessibles sans compte */}
            <div className="bg-card rounded-3xl border border-border shadow-sm p-5 space-y-3">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Contacter le vendeur</p>

              {annonce.whatsapp && (
                <a
                  href={`https://wa.me/${annonce.whatsapp.replace(/[^0-9]/g, "")}?text=${whatsappMsg}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl font-bold text-white text-sm transition-all hover:opacity-90 active:scale-95"
                  style={{ background: "#25D366" }}>
                  <MessageCircle className="w-5 h-5" />
                  Contacter sur WhatsApp
                </a>
              )}

              {annonce.contact && (
                <a
                  href={`tel:${annonce.contact}`}
                  className="w-full flex items-center justify-center gap-2.5 h-12 rounded-2xl font-bold text-foreground text-sm border-2 border-border hover:border-purple-400 transition-all active:scale-95">
                  <Phone className="w-5 h-5 text-purple-500" />
                  Appeler : {annonce.contact}
                </a>
              )}

              {/* Partager */}
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold text-muted-foreground border border-border hover:border-purple-300 transition-all">
                {copied
                  ? <><CheckCircle2 className="w-4 h-4 text-green-500" /> Lien copié !</>
                  : <><Share2 className="w-4 h-4" /> Partager cette annonce</>
                }
              </button>
            </div>

            {/* Avertissement */}
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                ⚠️ Conseil de sécurité : Ne transférez jamais d'argent avant d'avoir visité le bien. NEXORA ne garantit pas les transactions hors plateforme.
              </p>
            </div>
          </div>
        </div>

        {/*
          Section Avis — publique (pas besoin de compte pour lire les avis).
          Pour laisser un avis, SectionAvis doit gérer en interne l'état
          connecté/non-connecté (voir note ci-dessous).
        */}
        <SectionAvis annonceId={annonce.id} nomItem={annonce.titre} />

      </div>
    </AppLayout>
  );
}
