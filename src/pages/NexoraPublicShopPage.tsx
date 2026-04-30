/**
 * NEXORA SHOP — Marketplace Publique (Redesign)
 * Route : /nexora-shop
 *
 * MODIFICATIONS :
 * - Bouton "Inscription" supprimé
 * - "Connexion" remplacé par "Mon compte"
 * - Header non sticky → barre de recherche fixe
 * - Section YUPI en carousel horizontal automatique (6s, loop, swipe)
 * - Section promo santé SUPPRIMÉE
 * - Boutons "Voir produit" en orange sur toutes les cartes produits
 * - Badge "Sponsorisée" ajouté sous "Produits santé certifiés"
 * - Annonces immobilières mélangées dans la grille principale avec score SEO
 * - Header "Immobilier séparé" SUPPRIMÉ
 * - Badges Disponible/Maison réduits sur ImmoCard
 * - Bouton "Voir produit" orange uniforme sur ImmoCard (plus de WhatsApp/Appeler)
 * - Toggle mode clair / sombre (bleu nuit) dans le header
 * - ImmoCard : note + badge confiance identiques aux ProductCard
 * - Bannière stats : compteur annonces immo supprimé
 * - Mode sombre : ProductCard fond blanc forcé (comme ImmoCard)
 */


import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import {
  Search, SlidersHorizontal, Grid3X3, List, ChevronDown,
  Store, Star, Package, X, Shield, Zap, Globe,
  CheckCircle, Tag, Clock, TrendingUp, BarChart2,
  Sparkles, ArrowRight, ShoppingBag, ChevronRight,
  AlertCircle, Heart, Eye, Flame, Sun, Moon,
  MapPin, Home, MessageCircle, Phone, Building2
} from "lucide-react";
import { formatPrix } from "@/lib/devise-utils";

const LOGO = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";

/* ─── Theme toggle (clair / sombre bleu nuit) ────────── */
function useTheme() {
  const [dark, setDark] = useState<boolean>(() => {
    try { return localStorage.getItem("nexora-theme") === "dark"; } catch { return false; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("nexora-theme", "dark"); }
    else       { root.classList.remove("dark"); localStorage.setItem("nexora-theme", "light"); }
  }, [dark]);
  return { dark, toggle: () => setDark(d => !d) };
}

function ThemeToggleBtn({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label={dark ? "Mode clair" : "Mode sombre"}
      title={dark ? "Passer en mode clair" : "Passer en mode sombre (bleu nuit)"}
      style={{
        width: 26, height: 26, borderRadius: "50%", border: "none", cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        background: dark ? "#1e3a5f" : "#f1f5f9",
        color: dark ? "#93c5fd" : "#64748b",
        transition: "all .25s",
        boxShadow: dark ? "0 0 0 1px #2563eb55" : "0 0 0 1px #cbd5e1",
      }}
    >
      {dark
        ? <Sun size={12} style={{ color: "#fbbf24" }} />
        : <Moon size={12} style={{ color: "#1e3a5f" }} />}
    </button>
  );
}

/* ─── Types ─────────────────────────────────────────── */
interface ProduitPublic {
  id: string;
  nom: string;
  description: string;
  prix: number;
  prix_promo: number | null;
  photos: string[];
  categorie: string | null;
  tags: string[];
  stock: number;
  stock_illimite: boolean;
  vedette: boolean;
  boutique_id: string;
  boutique_nom: string;
  boutique_slug: string;
  boutique_logo: string | null;
  total_avis: number;
  note_moyenne: number;
  avis_positifs: number;
  produit_slug: string;
  est_yupi: boolean;
  total_commandes?: number;
}

/* ─── Type Annonce Immobilière (enrichi avec avis) ───── */
interface AnnonceImmo {
  id: string;
  titre: string;
  prix: number;
  devise?: string;
  type: "maison" | "terrain" | "appartement" | "boutique";
  statut: "disponible" | "vendu" | "loue";
  ville: string;
  quartier?: string;
  images: string[];
  contact?: string;
  whatsapp?: string;
  auteur_nom?: string;
  description?: string;
  created_at: string;
  total_avis: number;
  note_moyenne: number;
  avis_positifs: number;
}

/* ─── Type unifié pour la grille mixte ───────────────── */
type MixedItem =
  | { kind: "produit"; data: ProduitPublic; score: number }
  | { kind: "immo";    data: AnnonceImmo;   score: number };

const IMMO_TYPES: Record<string, { emoji: string; color: string; bg: string; border: string }> = {
  maison:      { emoji: "🏠", color: "#c2410c", bg: "#fff7ed", border: "#fed7aa" },
  terrain:     { emoji: "🌿", color: "#15803d", bg: "#f0fdf4", border: "#bbf7d0" },
  appartement: { emoji: "🏢", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  boutique:    { emoji: "🏪", color: "#7e22ce", bg: "#faf5ff", border: "#e9d5ff" },
};

const IMMO_STATUTS: Record<string, { label: string; color: string }> = {
  disponible: { label: "Disponible", color: "#22c55e" },
  vendu:      { label: "Vendu",      color: "#ef4444" },
  loue:       { label: "Loué",       color: "#eab308" },
};

const DEVISES_SYMBOLES: Record<string, string> = {
  XOF:"FCFA", XAF:"FCFA", GHS:"₵", NGN:"₦", KES:"KSh", TZS:"TSh",
  UGX:"USh", RWF:"RF", GNF:"GNF", CDF:"FC", MAD:"MAD", GMD:"GMD",
  USD:"$", EUR:"€",
};

function formatPrixImmo(prix: number, devise?: string): string {
  const s = DEVISES_SYMBOLES[devise ?? "XOF"] ?? "FCFA";
  const fmt = new Intl.NumberFormat("fr-FR").format(Math.round(prix));
  if (devise === "USD") return `$${fmt}`;
  if (devise === "EUR") return `${fmt} €`;
  return `${fmt} ${s}`;
}

/* ─── Constantes ─────────────────────────────────────── */
const CATEGORIES = [
  "Tous", "Vêtements", "Beauté", "Électronique", "Alimentation",
  "Santé", "Maison", "Sport", "Services", "Autre"
];

const SORTS = [
  { value: "avis",      label: "Meilleurs avis",  icon: Star },
  { value: "recent",    label: "Plus récents",     icon: Clock },
  { value: "prix_asc",  label: "Prix ↑",           icon: TrendingUp },
  { value: "prix_desc", label: "Prix ↓",           icon: BarChart2 },
];

/* ─── Produits statiques BIEN-ÊTRE YUPI ──────────────── */
const YUPI_PRODUITS_STATIQUES: ProduitPublic[] = [
  { id:"yupi-1",  nom:"ALKA PLUS",             prix:18750, prix_promo:null, photos:["https://i.postimg.cc/zfXPnf3Z/1769666515980.jpg"],        categorie:"Santé", tags:["santé","bien-être"], stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:12, note_moyenne:4.8, avis_positifs:11, produit_slug:"alka-plus",       est_yupi:true, description:"Équilibre pH naturel du corps.", total_commandes:47 },
  { id:"yupi-2",  nom:"DÉTOX (60 caps)",        prix:18750, prix_promo:null, photos:["https://i.postimg.cc/mZcJXhw3/detox-health30.jpg"],        categorie:"Santé", tags:["santé","détox"],    stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:15, note_moyenne:4.9, avis_positifs:14, produit_slug:"detox-60",        est_yupi:true, description:"Détox profonde du foie et de l'organisme.", total_commandes:62 },
  { id:"yupi-3",  nom:"IMMUNO BOOST (60 caps)", prix:18750, prix_promo:null, photos:["https://i.imgur.com/eHXzZbx.jpeg"],                        categorie:"Santé", tags:["santé","immunité"], stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:18, note_moyenne:4.9, avis_positifs:17, produit_slug:"immuno-boost-60", est_yupi:true, description:"Renforcement maximum du système immunitaire." },
  { id:"yupi-4",  nom:"PAIN AND COLD BALM",     prix:2500,  prix_promo:null, photos:["https://i.imgur.com/DtFNIaI.jpeg"],                        categorie:"Santé", tags:["santé","douleur"],  stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:10, note_moyenne:4.7, avis_positifs:9,  produit_slug:"pain-cold-balm",  est_yupi:true, description:"Baume anti-douleur et anti-froid naturel." },
  { id:"yupi-5",  nom:"GOLDEN PAIN OIL",        prix:8750,  prix_promo:null, photos:["https://i.postimg.cc/j5ST3zZc/IMG-20260201-WA0009.jpg"],   categorie:"Santé", tags:["santé","huile"],    stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:8,  note_moyenne:4.6, avis_positifs:7,  produit_slug:"golden-pain-oil", est_yupi:true, description:"Huile thérapeutique pour douleurs articulaires." },
  { id:"yupi-6",  nom:"COSTI AWAY",             prix:13125, prix_promo:9500, photos:["https://i.postimg.cc/JhQXVNNK/58516261-Nj-Iw-LTgy-Ny1k-Yz-Q4OWRj-Ym.webp"], categorie:"Santé", tags:["santé","antiparasites"], stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:7,  note_moyenne:4.5, avis_positifs:6,  produit_slug:"costi-away",      est_yupi:true, description:"Anti-parasites et assainissement du côlon." },
  { id:"yupi-7",  nom:"WOMEN CARE",             prix:15625, prix_promo:null, photos:["https://i.postimg.cc/sfJQtyvB/Whats-App-Image-2025-01-18-at-1-22-20-PM-4.jpg"], categorie:"Santé", tags:["santé","femme"],    stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:20, note_moyenne:4.9, avis_positifs:19, produit_slug:"women-care",      est_yupi:true, description:"Santé hormonale et bien-être féminin naturel." },
  { id:"yupi-8",  nom:"MEN POWER OIL",          prix:6250,  prix_promo:null, photos:["https://i.postimg.cc/zf1qzbQK/men-power-oil-1.jpg"],        categorie:"Santé", tags:["santé","homme"],    stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:9,  note_moyenne:4.6, avis_positifs:8,  produit_slug:"men-power-oil",   est_yupi:true, description:"Huile de virilité masculine naturelle." },
  { id:"yupi-9",  nom:"SEA BUCKTHORN JUICE",    prix:18750, prix_promo:null, photos:["https://i.imgur.com/dCulCdA.jpeg"],                         categorie:"Santé", tags:["santé","antioxydant"], stock:99, stock_illimite:true, vedette:true, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:22, note_moyenne:5.0, avis_positifs:22, produit_slug:"sea-buckthorn-juice", est_yupi:true, description:"Jus antioxydant puissant riche en Oméga 7." },
  { id:"yupi-10", nom:"DIABO CARE",             prix:15625, prix_promo:11000, photos:["https://i.postimg.cc/sXsxjQKz/IMG-20260201-WA0003.jpg"],  categorie:"Santé", tags:["santé","diabète"],  stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:16, note_moyenne:4.8, avis_positifs:15, produit_slug:"diabo-care",      est_yupi:true, description:"Régulation naturelle de la glycémie." },
  { id:"yupi-11", nom:"DIABO CARE SPRAY",       prix:8750,  prix_promo:6500, photos:["https://i.postimg.cc/pT6pRqpQ/dd11f0fc-4b49-4537-aba5-28b18d5f9d34.jpg"], categorie:"Santé", tags:["santé","diabète"], stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:6,  note_moyenne:4.5, avis_positifs:5,  produit_slug:"diabo-care-spray",est_yupi:true, description:"Spray pour plaies et ulcères diabétiques." },
  { id:"yupi-12", nom:"DÉTOX HEATH (30 caps)",  prix:9325,  prix_promo:7000, photos:["https://i.postimg.cc/mZcJXhw3/detox-health30.jpg"],        categorie:"Santé", tags:["santé","détox"],    stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:5,  note_moyenne:4.4, avis_positifs:4,  produit_slug:"detox-heath-30",  est_yupi:true, description:"Cure légère de détox sur 30 jours." },
  { id:"yupi-13", nom:"PILON CARE",             prix:15625, prix_promo:null, photos:["https://i.postimg.cc/tgg2VDwm/Pilon-care.png"],             categorie:"Santé", tags:["santé"],            stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:7,  note_moyenne:4.5, avis_positifs:6,  produit_slug:"pilon-care",      est_yupi:true, description:"Traitement naturel des hémorroïdes." },
  { id:"yupi-14", nom:"MEN POWER MALT",         prix:18750, prix_promo:null, photos:["https://i.imgur.com/psVzO57.jpeg"],                         categorie:"Santé", tags:["santé","homme"],    stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:14, note_moyenne:4.8, avis_positifs:13, produit_slug:"men-power-malt",  est_yupi:true, description:"Boisson maltée pour virilité et performance masculine." },
  { id:"yupi-15", nom:"IMMUNO BOOST (30 caps)", prix:9375,  prix_promo:null, photos:["https://i.imgur.com/eHXzZbx.jpeg"],                         categorie:"Santé", tags:["santé","immunité"], stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:8,  note_moyenne:4.6, avis_positifs:7,  produit_slug:"immuno-boost-30", est_yupi:true, description:"Boost immunitaire format 30 jours." },
  { id:"yupi-16", nom:"DENTAL DROP",            prix:2500,  prix_promo:null, photos:["https://i.postimg.cc/jqGF1Hjf/IMG-20260201-WA0013.jpg"],   categorie:"Santé", tags:["santé","dentaire"],  stock:99, stock_illimite:true, vedette:false, boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:5,  note_moyenne:4.4, avis_positifs:4,  produit_slug:"dental-drop",     est_yupi:true, description:"Soin naturel pour la santé bucco-dentaire." },
  { id:"yupi-17", nom:"YUPI DRINK (CAFÉ)",      prix:12500, prix_promo:null, photos:["https://i.postimg.cc/FsR5NgsZ/yupi-drink-coffee-1.png"],    categorie:"Santé", tags:["santé","énergie"],  stock:99, stock_illimite:true, vedette:true,  boutique_id:"yupi", boutique_nom:"BIEN-ÊTRE YUPI", boutique_slug:"bien-etre-yupi", boutique_logo:"https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png", total_avis:25, note_moyenne:5.0, avis_positifs:25, produit_slug:"yupi-drink-cafe", est_yupi:true, description:"Café thérapeutique énergie, mémoire et bien-être global." },
];

/* ─── Badge confiance ─────────────────────────────────── */
function badgeConfiance(avisPositifs: number, totalAvis: number): {
  label: string; color: string; bg: string; border: string;
} {
  if (totalAvis === 0)
    return { label: "Nouveau vendeur", color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
  if (avisPositifs >= 10)
    return { label: "Très fiable",     color: "#15803d", bg: "#dcfce7", border: "#86efac" };
  if (avisPositifs >= 4)
    return { label: "Fiable",          color: "#065f46", bg: "#d1fae5", border: "#6ee7b7" };
  if (avisPositifs >= 1)
    return { label: "Moyen",           color: "#b45309", bg: "#fef3c7", border: "#fcd34d" };
  return   { label: "Peu d'avis",     color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
}

/* ─── Carte Annonce Immobilière (avec carousel d'images) ─ */
function ImmoCard({ a }: { a: AnnonceImmo }) {
  const navigate = useNavigate();
  const typeInfo   = IMMO_TYPES[a.type]   ?? IMMO_TYPES.maison;
  const statutInfo = IMMO_STATUTS[a.statut] ?? IMMO_STATUTS.disponible;
  const badge      = badgeConfiance(a.avis_positifs ?? 0, a.total_avis ?? 0);
  const images     = (a.images ?? []).filter(Boolean);

  /* Carousel d'images toutes les 6s */
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    if (images.length <= 1) return;
    const t = setInterval(() => setImgIdx(i => (i + 1) % images.length), 6000);
    return () => clearInterval(t);
  }, [images.length]);

  const currentImg = images[imgIdx];

  return (
    <div
      onClick={() => navigate(`/immobilier/annonce/${a.id}`)}
      style={{
        background: "#fff", borderRadius: 16, overflow: "hidden",
        border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        display: "flex", flexDirection: "column", cursor: "pointer",
        transition: "box-shadow .2s, border-color .2s",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#305CDE";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 20px rgba(48,92,222,0.15)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "#e5e7eb";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 8px rgba(0,0,0,0.07)";
      }}
    >
      {/* Zone image avec carousel */}
      <div style={{ position: "relative", height: 180, background: "#f1f5f9", overflow: "hidden", flexShrink: 0 }}>
        {currentImg ? (
          <img
            key={imgIdx}
            src={currentImg}
            alt={a.titre}
            style={{
              width: "100%", height: "100%", objectFit: "cover",
              animation: "imgFadeIn .5s ease",
            }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, background: typeInfo.bg }}>
            {typeInfo.emoji}
          </div>
        )}

        {/* Indicateurs de photos si plusieurs */}
        {images.length > 1 && (
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4 }}>
            {images.map((_, i) => (
              <div key={i} style={{
                width: i === imgIdx ? 14 : 5, height: 5, borderRadius: 999,
                background: i === imgIdx ? "#305CDE" : "rgba(255,255,255,0.7)",
                transition: "all .3s",
              }} />
            ))}
          </div>
        )}

        {/* Badge statut */}
        <div style={{
          position: "absolute", top: 8, left: 8,
          background: statutInfo.color, color: "#fff",
          fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
        }}>
          {statutInfo.label}
        </div>

        {/* Badge type */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: typeInfo.bg, color: typeInfo.color,
          fontSize: 8, fontWeight: 700, padding: "2px 6px", borderRadius: 999,
          border: `1px solid ${typeInfo.border}`,
        }}>
          {typeInfo.emoji} {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
        </div>

        {/* Badge nombre de photos */}
        {images.length > 1 && (
          <div style={{
            position: "absolute", bottom: 6, right: 8,
            background: "rgba(0,0,0,0.55)", color: "#fff",
            fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8,
            display: "flex", alignItems: "center", gap: 3,
          }}>
            📷 {images.length}
          </div>
        )}
      </div>

      {/* Contenu */}
      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        <div style={{
          fontWeight: 800, fontSize: 14, color: "#111827", lineHeight: 1.3,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
        }}>
          {a.titre}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "#6b7280", fontSize: 12 }}>
          <MapPin size={12} style={{ flexShrink: 0 }} />
          {a.quartier ? `${a.quartier}, ` : ""}{a.ville}
        </div>

        {/* Prix en Bleu Roi */}
        <div style={{ fontWeight: 900, fontSize: 18, color: "#305CDE" }}>
          {formatPrixImmo(a.prix, a.devise)}
        </div>

        {/* Badge confiance + note */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`,
          }}>
            ● {badge.label}
          </span>
          {(a.total_avis ?? 0) > 0 ? (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: 10, color: "#f59e0b", fontWeight: 600 }}>
              <Star size={11} style={{ fill: "#fbbf24", color: "#fbbf24" }} />
              {(a.note_moyenne ?? 0).toFixed(1)}
              <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: 9 }}>({a.total_avis})</span>
            </span>
          ) : (
            <span style={{ fontSize: 10, color: "#d1d5db" }}>Aucun avis</span>
          )}
        </div>

        {a.auteur_nom && (
          <div style={{ fontSize: 11, color: "#9ca3af" }}>Par {a.auteur_nom}</div>
        )}

        {/* Bouton Voir — Bleu Roi */}
        <button
          onClick={e => { e.stopPropagation(); navigate(`/immobilier/annonce/${a.id}`); }}
          style={{
            width: "100%", marginTop: "auto", padding: "9px 0", borderRadius: 10,
            border: "none", cursor: "pointer",
            background: "linear-gradient(90deg,#305CDE,#4a73e8)",
            color: "#fff", fontSize: 12, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
          }}
        >
          Voir annonce <ArrowRight size={12} />
        </button>
      </div>
    </div>
  );
}

/* ─── CAROUSEL YUPI ──────────────────────────────────── */
function YupiCarousel({ produits }: { produits: ProduitPublic[] }) {
  const navigate = useNavigate();
  const [cur, setCur] = useState(0);
  const [paused, setPaused] = useState(false);
  const startXRef = useRef(0);
  const diffXRef = useRef(0);

  const yupiProds = produits.filter(p => p.est_yupi);

  const pairs: ProduitPublic[][] = [];
  for (let i = 0; i < yupiProds.length; i += 2)
    pairs.push([yupiProds[i], yupiProds[i + 1] || yupiProds[0]]);

  const total = pairs.length;
  const goTo = (n: number) => setCur(((n % total) + total) % total);

  useEffect(() => {
    const t = setInterval(() => { if (!paused) goTo(cur + 1); }, 6000);
    return () => clearInterval(t);
  }, [cur, paused, total]);

  if (total === 0) return null;

  return (
    <div className="mb-5">
      {/* En-tête section YUPI */}
      <div className="flex items-center justify-between mb-3 px-0.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-lexend font-black text-sm text-purple-900">Bien-être YUPI</p>
            <div className="flex flex-col items-start gap-1">
              <p className="text-[10px] text-purple-500 font-semibold leading-tight">
                Produits santé certifiés
              </p>
              <span className="text-[9px] font-black text-black bg-gray-100 border border-gray-300 rounded px-1.5 py-0.5 leading-tight">
                Sponsorisée
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => navigate("/bien-etre-yupi")}
          className="text-xs font-bold text-purple-700 border-[1.5px] border-purple-300 rounded-full px-3.5 py-1.5 bg-purple-50 hover:bg-purple-100 transition-colors whitespace-nowrap flex-shrink-0"
        >
          Voir tous →
        </button>
      </div>

      {/* Carousel */}
      <div
        className="relative overflow-hidden rounded-2xl border border-purple-200 p-3"
        style={{ background: "linear-gradient(135deg,#f5f3ff 0%,#faf5ff 60%,#ede9fe 100%)" }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onTouchStart={e => { startXRef.current = e.touches[0].clientX; setPaused(true); }}
        onTouchMove={e => { diffXRef.current = e.touches[0].clientX - startXRef.current; }}
        onTouchEnd={() => {
          if (Math.abs(diffXRef.current) > 40)
            diffXRef.current < 0 ? goTo(cur + 1) : goTo(cur - 1);
          diffXRef.current = 0;
          setTimeout(() => setPaused(false), 1200);
        }}
      >
        <div className="overflow-hidden">
          <div
            className="flex gap-2.5 transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(calc(-${cur} * (100% + 10px)))` }}
          >
            {pairs.map((pair, slideIdx) => (
              <div key={slideIdx} className="flex gap-2.5 flex-shrink-0 w-full">
                {pair.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate("/bien-etre-yupi")}
                    className="flex-1 bg-white rounded-xl border border-purple-100 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div className="relative aspect-square overflow-hidden bg-purple-50">
                      <img
                        src={p.photos?.[0]}
                        alt={p.nom}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400"
                      />
                      <span className="absolute top-2 right-2 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
                        <Sparkles className="w-2.5 h-2.5" />YUPI
                      </span>
                    </div>
                    <div className="p-2">
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          Stock illimité
                        </span>
                        {p.total_avis > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-500">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {p.note_moyenne.toFixed(1)}
                            <span className="text-gray-400 font-normal text-[9px]">({p.total_avis})</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-1.5 mt-2.5">
          {pairs.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === cur ? "w-5 bg-purple-600" : "w-1.5 bg-purple-300 hover:bg-purple-400"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Carte produit (style Alibaba) ──────────────────── */
function ProductCard({ p, view }: { p: ProduitPublic; view: "grid" | "list" }) {
  const navigate = useNavigate();
  const pct = p.prix_promo ? Math.round(((p.prix - p.prix_promo) / p.prix) * 100) : 0;
  const photos = (p.photos ?? []).filter(Boolean);
  const prix_affiche = p.prix_promo ?? p.prix;
  const badge = badgeConfiance(p.avis_positifs, p.total_avis);

  /* Carousel images auto 6s */
  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    if (photos.length <= 1) return;
    const t = setInterval(() => setImgIdx(i => (i + 1) % photos.length), 6000);
    return () => clearInterval(t);
  }, [photos.length]);
  const currentPhoto = photos[imgIdx] || "https://via.placeholder.com/400x400?text=Produit";

  const goTo = () => p.est_yupi && p.boutique_id === "yupi"
    ? navigate("/bien-etre-yupi")
    : navigate(`/shop/${p.boutique_slug}/produit/${p.produit_slug}`);

  /* VUE LISTE */
  if (view === "list") {
    return (
      <div
        onClick={goTo}
        style={{ background: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        className="flex gap-4 border border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all duration-200 group"
        onMouseEnter={e => (e.currentTarget.style.borderColor = "#008000")}
        onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
      >
        <div className="relative flex-shrink-0 w-28 h-28 rounded-lg overflow-hidden bg-gray-50">
          <img key={imgIdx} src={currentPhoto} alt={p.nom} loading="lazy" style={{ animation: "imgFadeIn .5s ease" }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          {pct > 0 && (
            <span className="absolute top-1 left-1 text-white text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "#FF1A00" }}>-{pct}%</span>
          )}
          {p.est_yupi && (
            <span className="absolute bottom-1 left-1 bg-purple-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Sparkles className="w-2 h-2" />YUPI
            </span>
          )}
          {photos.length > 1 && (
            <div className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">📷{photos.length}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800 line-clamp-2 leading-snug mb-1">{p.nom}</p>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl font-black" style={{ color: "#008000" }}>{formatPrix(prix_affiche)}</span>
            {p.prix_promo && <span className="text-xs line-through font-semibold" style={{ color: "#FF1A00" }}>{formatPrix(p.prix)}</span>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}>
              ● {badge.label}
            </span>
            {p.total_avis > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {p.note_moyenne.toFixed(1)} ({p.total_avis})
              </span>
            )}
            <span className="text-[10px] text-gray-400">
              {p.stock_illimite ? "Stock illimité" : `${p.stock} dispo`}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1.5">
            {p.boutique_logo
              ? <img src={p.boutique_logo} alt="" className="w-4 h-4 rounded-full object-cover" />
              : <Store className="w-3 h-3 text-gray-400" />}
            <span className="text-[11px] text-gray-500">{p.boutique_nom}</span>
            {(p.total_commandes ?? 0) > 0 && (
              <span className="ml-2 flex items-center gap-0.5 text-[10px] font-semibold text-orange-500">
                <ShoppingBag className="w-3 h-3" />
                {p.total_commandes! >= 1000
                  ? `${(p.total_commandes! / 1000).toFixed(1)}k`
                  : p.total_commandes} commande{p.total_commandes! > 1 ? "s" : ""}
              </span>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(); }}
            className="mt-2.5 text-[11px] font-bold text-white rounded-lg py-1.5 px-4 flex items-center gap-1 transition-opacity hover:opacity-90 self-start"
            style={{ background: "linear-gradient(90deg,#008000,#22a022)" }}
          >
            Voir produit <ArrowRight className="w-2.5 h-2.5" />
          </button>
        </div>
      </div>
    );
  }

  /* VUE GRILLE */
  return (
    <div
      onClick={goTo}
      style={{ background: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 group flex flex-col"
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#008000")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "#e5e7eb")}
    >
      <div className="relative overflow-hidden bg-gray-50 aspect-square">
        <img key={imgIdx} src={currentPhoto} alt={p.nom} loading="lazy" style={{ animation: "imgFadeIn .5s ease" }} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-400" />
        {pct > 0 && (
          <span className="absolute top-2 left-2 text-white text-[10px] font-black px-2 py-0.5 rounded shadow" style={{ background: "#FF1A00" }}>-{pct}%</span>
        )}
        {p.est_yupi && (
          <span className="absolute top-2 right-2 bg-purple-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
            <Sparkles className="w-2.5 h-2.5" />YUPI
          </span>
        )}
        {p.vedette && !p.est_yupi && (
          <span className="absolute top-2 right-2 text-white text-[9px] font-black px-2 py-0.5 rounded shadow" style={{ background: "#FF1A00" }}>★ TOP</span>
        )}
        {/* Indicateurs photos */}
        {photos.length > 1 && (
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3 }}>
            {photos.map((_, i) => (
              <div key={i} style={{
                width: i === imgIdx ? 12 : 4, height: 4, borderRadius: 999,
                background: i === imgIdx ? "#008000" : "rgba(255,255,255,0.7)",
                transition: "all .3s",
              }} />
            ))}
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-1.5">
        <p className="text-sm text-gray-800 font-semibold line-clamp-2 leading-snug">{p.nom}</p>

        <div className="flex items-baseline gap-1.5">
          <span className="text-base font-black" style={{ color: "#008000" }}>{formatPrix(prix_affiche)}</span>
          {p.prix_promo && <span className="text-xs line-through font-semibold" style={{ color: "#FF1A00" }}>{formatPrix(p.prix)}</span>}
        </div>

        <p className="text-[10px] text-gray-400 font-medium">
          {p.stock_illimite
            ? "Stock illimité"
            : p.stock > 0
              ? `${p.stock} disponible${p.stock > 1 ? "s" : ""}`
              : <span style={{ color: "#FF1A00" }}>Rupture</span>}
        </p>

        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}>
            ● {badge.label}
          </span>
          {p.total_avis > 0 ? (
            <span className="flex items-center gap-0.5 text-[10px] text-amber-500 font-semibold">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {p.note_moyenne.toFixed(1)} ({p.total_avis})
            </span>
          ) : <span className="text-[10px] text-gray-300">Aucun avis</span>}
        </div>

        <div className="flex items-center gap-1">
          {p.boutique_logo
            ? <img src={p.boutique_logo} alt="" className="w-3 h-3 rounded-full object-cover flex-shrink-0" />
            : <Store className="w-3 h-3 text-gray-400 flex-shrink-0" />}
          <span className="text-[10px] text-gray-400 truncate">{p.boutique_nom}</span>
        </div>

        {/* Nombre de commandes */}
        {(p.total_commandes ?? 0) > 0 && (
          <div className="flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-orange-500 flex-shrink-0" />
            <span className="text-[10px] font-semibold text-orange-500">
              {p.total_commandes! >= 1000
                ? `${(p.total_commandes! / 1000).toFixed(1)}k`
                : p.total_commandes} commande{p.total_commandes! > 1 ? "s" : ""}
            </span>
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); goTo(); }}
          className="w-full text-[11px] font-bold text-white rounded-lg py-1.5 flex items-center justify-center gap-1 transition-opacity hover:opacity-90"
          style={{ background: "linear-gradient(90deg,#008000,#22a022)" }}
        >
          Voir produit <ArrowRight className="w-2.5 h-2.5" />
        </button>
      </div>
    </div>
  );
}

/* ─── Suggestions de produits similaires ─────────────── */
function SimilarSuggestions({
  search,
  produits,
  annonces,
  onSelect,
  onClose,
  dark,
}: {
  search: string;
  produits: ProduitPublic[];
  annonces: AnnonceImmo[];
  onSelect: (term: string) => void;
  onClose: () => void;
  dark: boolean;
}) {
  if (!search.trim()) return null;

  const q = search.toLowerCase().trim();

  // Générer des suggestions depuis les catégories, tags et mots-clés des noms
  const suggestions: Array<{ label: string; photo?: string; type: "produit" | "categorie" | "immo" }> = [];
  const seen = new Set<string>();

  // 1. Suggestions depuis les catégories
  const cats = ["Vêtements", "Beauté", "Électronique", "Alimentation", "Santé", "Maison", "Sport", "Services"];
  cats.forEach(cat => {
    if (cat.toLowerCase().includes(q) && !seen.has(cat.toLowerCase())) {
      suggestions.push({ label: cat, type: "categorie" });
      seen.add(cat.toLowerCase());
    }
  });

  // 2. Suggestions depuis les noms de produits (mots partiels)
  produits.forEach(p => {
    const words = p.nom.split(/\s+/);
    words.forEach(word => {
      const w = word.toLowerCase();
      if (w.length > 3 && w.includes(q) && w !== q && !seen.has(w)) {
        const label = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        suggestions.push({ label, photo: p.photos?.[0], type: "produit" });
        seen.add(w);
      }
    });
    // Nom complet si correspond
    if (p.nom.toLowerCase().includes(q) && !seen.has(p.nom.toLowerCase())) {
      suggestions.push({ label: p.nom, photo: p.photos?.[0], type: "produit" });
      seen.add(p.nom.toLowerCase());
    }
  });

  // 3. Suggestions depuis les annonces immo
  annonces.forEach(a => {
    const words = a.titre.split(/\s+/);
    words.forEach(word => {
      const w = word.toLowerCase();
      if (w.length > 3 && w.includes(q) && !seen.has(w)) {
        suggestions.push({ label: word, type: "immo" });
        seen.add(w);
      }
    });
  });

  // 4. Tags
  produits.forEach(p => {
    (p.tags || []).forEach(tag => {
      if (tag.toLowerCase().includes(q) && !seen.has(tag.toLowerCase())) {
        suggestions.push({ label: tag, photo: p.photos?.[0], type: "produit" });
        seen.add(tag.toLowerCase());
      }
    });
  });

  const top = suggestions.slice(0, 6);
  if (top.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 4px)",
        left: 0,
        right: 0,
        zIndex: 999,
        background: dark ? "#1a2d45" : "#fff",
        border: dark ? "1px solid #2563eb55" : "1px solid #e5e7eb",
        borderRadius: 12,
        boxShadow: "0 8px 30px rgba(0,0,0,0.15)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "8px 12px 4px",
        fontSize: 10, fontWeight: 700,
        color: dark ? "#6b9fd4" : "#9ca3af",
        textTransform: "uppercase", letterSpacing: "0.05em",
        borderBottom: dark ? "1px solid #1e3a5f" : "1px solid #f3f4f6",
      }}>
        Recherches similaires
        <button
          onClick={onClose}
          style={{ float: "right", background: "none", border: "none", cursor: "pointer", color: dark ? "#6b9fd4" : "#9ca3af", lineHeight: 1, padding: 0 }}
        >
          ✕
        </button>
      </div>
      {top.map((s, i) => {
        const emoji = s.type === "immo" ? "🏠" : s.type === "categorie" ? "🏷️" : "🔍";
        return (
          <button
            key={i}
            onClick={() => onSelect(s.label)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "8px 12px", background: "transparent", border: "none",
              cursor: "pointer", textAlign: "left",
              borderBottom: i < top.length - 1 ? (dark ? "1px solid #1e3a5f22" : "1px solid #f9fafb") : "none",
              transition: "background .15s",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = dark ? "#1e3a5f" : "#f9fafb")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            {s.photo ? (
              <img src={s.photo} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "cover", flexShrink: 0, border: "1px solid #e5e7eb" }} />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: dark ? "#1e3a5f" : "#f3f4f6",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
              }}>
                {emoji}
              </div>
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: dark ? "#e8f0fe" : "#374151" }}>
              {s.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Page principale ─────────────────────────────────── */
export default function NexoraPublicShopPage() {
  const navigate = useNavigate();
  const [produits, setProduits] = useState<ProduitPublic[]>([]);
  const [annonces, setAnnonces] = useState<AnnonceImmo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categorie, setCategorie] = useState("Tous");
  const [sort, setSort] = useState("avis");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [page, setPage] = useState(1);
  const [user, setUser] = useState<any>(null);
  const { dark, toggle: toggleTheme } = useTheme();

  /**
   * Détection app native Capacitor (Android / iOS)
   * → true  : on supprime le footer (version app mobile)
   * → false : on affiche le footer (version navigateur web)
   */
  const isNativeApp = useIsNativeApp();

  const PER_PAGE = 32;

  /* SEO */
  useEffect(() => {
    document.title = "Nexora Shop — Marketplace Africaine · Produits vérifiés";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Achetez les meilleurs produits africains vérifiés sur Nexora Shop.");
    return () => { document.title = "NEXORA"; };
  }, []);

  /* Auth check */
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  /* Chargement annonces immobilières avec avis */
  useEffect(() => {
    (async () => {
      const { data: immos } = await (supabase as any)
        .from("nexora_annonces_immo")
        .select("id, titre, prix, devise, type, statut, ville, quartier, images, contact, whatsapp, auteur_nom, description, created_at")
        .order("created_at", { ascending: false })
        .limit(50);

      if (!immos || immos.length === 0) { setAnnonces([]); return; }

      const ids = immos.map((a: any) => a.id);

      // Avis immo : table avis_produits, colonne annonce_id
      let avisImmoMap: Record<string, { total: number; somme: number; positifs: number }> = {};
      try {
        const { data: avisImmo } = await (supabase as any)
          .from("avis_produits")
          .select("annonce_id, note")
          .in("annonce_id", ids);

        for (const av of (avisImmo || [])) {
          if (!av.annonce_id) continue;
          if (!avisImmoMap[av.annonce_id]) avisImmoMap[av.annonce_id] = { total: 0, somme: 0, positifs: 0 };
          avisImmoMap[av.annonce_id].total++;
          avisImmoMap[av.annonce_id].somme += av.note;
          if (av.note >= 4) avisImmoMap[av.annonce_id].positifs++;
        }
      } catch {
        // silencieux
      }

      const enriched: AnnonceImmo[] = immos.map((a: any) => {
        const av = avisImmoMap[a.id] || { total: 0, somme: 0, positifs: 0 };
        return {
          ...a,
          total_avis:    av.total,
          note_moyenne:  av.total > 0 ? av.somme / av.total : 0,
          avis_positifs: av.positifs,
        };
      });

      setAnnonces(enriched);
    })();
  }, []);

  /* Chargement produits */
  useEffect(() => { loadProduits(); }, []);

  const loadProduits = async () => {
    setLoading(true);
    try {
      const { data: prods } = await (supabase as any)
        .from("produits")
        .select(`
          id, nom, description, prix, prix_promo, photos, categorie, tags,
          stock, stock_illimite, vedette, boutique_id, actif, slug,
          boutiques(id, nom, slug, logo_url, actif)
        `)
        .eq("actif", true)
        .eq("type", "physique")
        .order("created_at", { ascending: false })
        .limit(600);

      if (!prods) { setLoading(false); return; }

      const filteredProds = prods.filter((p: any) => p.boutiques?.actif !== false);
      const ids = filteredProds.map((p: any) => p.id);

      const { data: avis } = await (supabase as any)
        .from("avis_produits")
        .select("produit_id, note")
        .in("produit_id", ids);

      const avisMap: Record<string, { total: number; somme: number; positifs: number }> = {};
      for (const a of avis || []) {
        if (!avisMap[a.produit_id]) avisMap[a.produit_id] = { total: 0, somme: 0, positifs: 0 };
        avisMap[a.produit_id].total++;
        avisMap[a.produit_id].somme += a.note;
        if (a.note >= 4) avisMap[a.produit_id].positifs++;
      }

      // Commandes par boutique
      const boutiqueIds = [...new Set(filteredProds.map((p: any) => p.boutique_id).filter(Boolean))];
      const commandesMap: Record<string, number> = {};
      try {
        const { data: commandes } = await (supabase as any)
          .from("commandes")
          .select("boutique_id")
          .in("boutique_id", boutiqueIds);
        for (const c of commandes || []) {
          if (!c.boutique_id) continue;
          commandesMap[c.boutique_id] = (commandesMap[c.boutique_id] || 0) + 1;
        }
      } catch { /* silencieux */ }

      const YUPI_KEYWORDS = ["yupi", "santé", "bien-être", "bienetre", "health", "wellness"];
      const isYupi = (p: any) => {
        const nomBoutique = (p.boutiques?.nom || "").toLowerCase();
        const slugBoutique = (p.boutiques?.slug || "").toLowerCase();
        const cat = (p.categorie || "").toLowerCase();
        return YUPI_KEYWORDS.some(k => nomBoutique.includes(k) || slugBoutique.includes(k) || cat.includes(k));
      };

      const mapped: ProduitPublic[] = filteredProds.map((p: any) => {
        const av = avisMap[p.id] || { total: 0, somme: 0, positifs: 0 };
        return {
          id: p.id,
          nom: p.nom || "",
          description: p.description || "",
          prix: p.prix || 0,
          prix_promo: p.prix_promo || null,
          photos: p.photos || [],
          categorie: p.categorie || null,
          tags: p.tags || [],
          stock: p.stock || 0,
          stock_illimite: p.stock_illimite || false,
          vedette: p.vedette || false,
          boutique_id: p.boutique_id,
          boutique_nom: p.boutiques?.nom || "Boutique",
          boutique_slug: p.boutiques?.slug || p.boutique_id,
          boutique_logo: p.boutiques?.logo_url || null,
          total_avis: av.total,
          note_moyenne: av.total > 0 ? av.somme / av.total : 0,
          avis_positifs: av.positifs,
          produit_slug: p.slug || p.id,
          est_yupi: isYupi(p),
          total_commandes: commandesMap[p.boutique_id] || 0,
        };
      });

      setProduits([...YUPI_PRODUITS_STATIQUES, ...mapped.filter(p => !p.est_yupi)]);
    } catch (e) {
      console.error("Erreur marketplace:", e);
    }
    setLoading(false);
  };

  /* ─── Filtrage produits (hors YUPI — gérés par le carousel) ─── */
  const filtered = produits
    .filter(p => !p.est_yupi)
    .filter((p) => {
      const q = search.toLowerCase();
      const matchSearch = !q
        || p.nom.toLowerCase().includes(q)
        || (p.description || "").toLowerCase().includes(q)
        || p.boutique_nom.toLowerCase().includes(q);
      const matchCat = categorie === "Tous" || p.categorie === categorie;
      return matchSearch && matchCat;
    });

  /* Si la recherche contient "yupi" / "santé" / catégorie Santé → inclure aussi les YUPI */
  const filteredAvecYupi = (() => {
    const q = search.toLowerCase();
    const yupiDansRecherche = q.includes("yupi") || q.includes("santé") || q.includes("bien") || categorie === "Santé";
    if (!yupiDansRecherche) return filtered;
    const yupiFiltered = YUPI_PRODUITS_STATIQUES.filter(p => {
      const matchSearch = !q || p.nom.toLowerCase().includes(q) || (p.description||"").toLowerCase().includes(q);
      const matchCat = categorie === "Tous" || p.categorie === categorie;
      return matchSearch && matchCat;
    });
    return [...yupiFiltered, ...filtered];
  })();

  /* ─── Annonces immo filtrées ─── */
  const filteredAnnonces = annonces.filter(a => {
    if (categorie !== "Tous" && categorie !== "Immobilier" && categorie !== "Maison") return false;
    const q = search.toLowerCase();
    if (!q) return true;
    return a.titre?.toLowerCase().includes(q)
      || a.ville?.toLowerCase().includes(q)
      || a.quartier?.toLowerCase().includes(q)
      || a.type?.toLowerCase().includes(q)
      || a.description?.toLowerCase().includes(q);
  });

  /* ─── Score SEO pour tri mixte produits + immo ─── */
  const scoreImmo = (a: AnnonceImmo, q: string): number => {
    let score = 0;
    const haystack = `${a.titre} ${a.ville} ${a.quartier ?? ""} ${a.description ?? ""}`.toLowerCase();
    if (q && haystack.includes(q)) score += 20;
    if (a.statut === "disponible") score += 10;
    const ageJours = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
    score += Math.max(0, 15 - ageJours * 0.5);
    return score;
  };

  const scoreProduit = (p: ProduitPublic): number => {
    if (sort === "avis")      return p.avis_positifs * 2 + p.note_moyenne;
    if (sort === "prix_asc")  return -(p.prix_promo || p.prix);
    if (sort === "prix_desc") return  (p.prix_promo || p.prix);
    return 0;
  };

  /* ─── Grille unifiée : produits + immo mélangés et triés ─── */
  const q = search.toLowerCase();

  const produitItems: MixedItem[] = filteredAvecYupi.map(p => ({
    kind: "produit",
    data: p,
    score: scoreProduit(p),
  }));

  const immoItems: MixedItem[] = (categorie === "Tous" || categorie === "Immobilier")
    ? filteredAnnonces.map(a => ({ kind: "immo", data: a, score: scoreImmo(a, q) + 5 }))
    : [];

  const allItems = [...produitItems, ...immoItems].sort((a, b) => b.score - a.score);
  const paginated = allItems.slice(0, page * PER_PAGE);
  const hasMore = paginated.length < allItems.length;
  const totalResultats = allItems.length;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: dark ? "#0a1628" : undefined }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=Lexend+Deca:wght@400;600;700;800&display=swap');
        .font-lexend { font-family: 'Lexend Deca', sans-serif; }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .fade-in { animation: fadeIn .35s ease forwards; }
        @keyframes pulse-skeleton { 0%,100%{opacity:1;} 50%{opacity:.45;} }
        @keyframes imgFadeIn { from { opacity:0; } to { opacity:1; } }
        .skel { animation: pulse-skeleton 1.6s ease infinite; background: linear-gradient(90deg,#f0f0f0 25%,#f9f9f9 50%,#f0f0f0 75%); background-size:200%; }
        .skel-dark { animation: pulse-skeleton 1.6s ease infinite; background: linear-gradient(90deg,#1e3a5f 25%,#243f6a 50%,#1e3a5f 75%); background-size:200%; }
        .scrollbar-hide::-webkit-scrollbar{display:none;}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}
      `}</style>

      {/* ── HEADER ─────────────────────────────── */}
      <header style={{ background: dark ? "#0d1b2a" : "#fff", borderBottom: dark ? "1px solid #1e3a5f" : "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.07)" }}>
        {/* Top bar */}
        <div className="text-white text-[11px] py-1.5 px-4 md:px-8 flex items-center justify-between gap-4" style={{ background: "#305CDE" }}>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> Protection acheteur</span>
            <span className="hidden md:flex items-center gap-1"><Zap className="w-3 h-3" /> Paiement Mobile Money</span>
            <span className="hidden md:flex items-center gap-1"><Globe className="w-3 h-3" /> Livraison toute l'Afrique</span>
          </div>
          <button
            onClick={() => navigate(user ? "/dashboard" : "/login")}
            className="flex items-center gap-1 hover:underline font-semibold"
          >
            Mon compte <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        {/* Main header — Logo + Toggle */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pt-2 pb-1 flex items-center gap-3">
          <div className="flex-1" />

          <button
            onClick={() => navigate("/login")}
            className="hidden md:flex items-center gap-1.5 border-2 text-xs font-bold px-4 py-2 rounded-lg transition-colors whitespace-nowrap flex-shrink-0" style={{ borderColor: "#FF1A00", color: "#FF1A00" }}
          >
            <Store className="w-3.5 h-3.5" /> Ma boutique
          </button>
        </div>

        {/* Barre de recherche */}
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-2">
          <div className="flex rounded-lg overflow-hidden border-2 border-purple-400 focus-within:border-purple-600">
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Rechercher produits, boutiques, immobilier..."
              style={{ background: dark ? "#1a2d45" : "#fff", color: dark ? "#e8f0fe" : "#111827" }}
              className="flex-1 min-w-0 px-3 py-2.5 text-sm outline-none placeholder:text-gray-400"
            />
            {search && (
              <button onClick={() => setSearch("")} style={{ background: dark ? "#1a2d45" : "#fff" }} className="px-2 flex-shrink-0">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
            <button className="px-4 flex-shrink-0 flex items-center text-white transition-colors" style={{ background: "#008000" }}>
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Catégories */}
        <div style={{ background: dark ? "#0d1b2a" : "#fff", borderTop: dark ? "1px solid #1e3a5f" : "1px solid #f3f4f6" }}>
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => { setCategorie(cat); setPage(1); }}
                style={categorie === cat ? { background: "#305CDE", color: "#fff" } : { color: dark ? "#93c5fd" : "#4b5563" }}
                className={`flex-shrink-0 text-xs font-semibold px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap ${
                  categorie === cat ? "text-white" : "hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ── BANNIÈRE STATS (compteur immo supprimé) ── */}
      <div style={{ background: dark ? "#0d1b2a" : "#fff", borderBottom: dark ? "1px solid #1e3a5f" : "1px solid #f3f4f6" }} className="py-2">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-6 flex-wrap text-xs text-gray-500">
          <span className="flex items-center gap-1.5 text-green-500 font-semibold">
            <CheckCircle className="w-3.5 h-3.5" /> Vendeurs vérifiés NEXORA
          </span>
        </div>
      </div>

      {/* ── TRI & VUE ────────────────────────────── */}
      <div style={{ background: dark ? "#0d1b2a" : "#fff", borderBottom: dark ? "1px solid #1e3a5f" : "1px solid #e5e7eb" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-2 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
            <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mr-1" />
            {SORTS.map((s) => (
              <button
                key={s.value}
                onClick={() => setSort(s.value)}
                style={sort === s.value ? { color: "#305CDE" } : { color: dark ? "#93c5fd" : "#6b7280" }}
                className={`flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  sort === s.value
                    ? "bg-blue-50 text-blue-700 border border-blue-300"
                    : "hover:bg-gray-50"
                }`}
              >
                <s.icon className="w-3 h-3" />{s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-gray-400 hidden md:block">{totalResultats} résultat{totalResultats > 1 ? "s" : ""}</span>
            <div style={{ background: dark ? "#1a2d45" : "#f3f4f6" }} className="flex rounded-lg p-0.5">
              <button onClick={() => setView("grid")} style={{ background: view === "grid" ? (dark ? "#243f6a" : "#fff") : "transparent" }} className="p-1.5 rounded-md transition-colors">
                <Grid3X3 className="w-3.5 h-3.5 text-gray-400" />
              </button>
              <button onClick={() => setView("list")} style={{ background: view === "list" ? (dark ? "#243f6a" : "#fff") : "transparent" }} className="p-1.5 rounded-md transition-colors">
                <List className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENU ──────────────────────────────── */}
      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6">

        {/* Skeleton */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} style={{ background: dark ? "#0d1b2a" : "#fff" }} className="rounded-lg overflow-hidden border border-gray-100">
                <div className={dark ? "skel-dark aspect-square" : "skel aspect-square"} />
                <div className="p-3 space-y-2">
                  <div className={dark ? "skel-dark h-3 rounded w-3/4" : "skel h-3 rounded w-3/4"} />
                  <div className={dark ? "skel-dark h-4 rounded w-1/2" : "skel h-4 rounded w-1/2"} />
                  <div className={dark ? "skel-dark h-3 rounded w-1/3" : "skel h-3 rounded w-1/3"} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Carousel YUPI — toujours en haut */}
        {!loading && <YupiCarousel produits={produits} />}

        {/* Aucun résultat */}
        {!loading && allItems.length === 0 && (
          <div className="text-center py-20">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-lexend font-black text-lg mb-1" style={{ color: dark ? "#93c5fd" : "#374151" }}>Aucun résultat trouvé</p>
            <p className="text-sm text-gray-400 mb-4">Essayez une autre recherche ou catégorie.</p>
            <button onClick={() => { setSearch(""); setCategorie("Tous"); }} className="text-purple-500 font-bold text-sm hover:underline">
              Réinitialiser les filtres
            </button>
          </div>
        )}

        {/* Grille mixte produits + immobilier */}
        {!loading && allItems.length > 0 && (
          <>
            <div className={view === "grid"
              ? "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 fade-in"
              : "flex flex-col gap-3 fade-in"
            }>
              {paginated.map(item =>
                item.kind === "produit"
                  ? <ProductCard key={item.data.id} p={item.data as ProduitPublic} view={view} />
                  : <ImmoCard    key={item.data.id} a={item.data as AnnonceImmo} />
              )}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <button
                  onClick={() => setPage(prev => prev + 1)}
                  style={{ borderColor: dark ? "#305CDE" : "#305CDE", color: dark ? "#93c5fd" : "#305CDE" }}
                  className="inline-flex items-center gap-2 border-2 hover:border-blue-700 hover:text-blue-700 font-semibold px-8 py-3 rounded-xl transition-all text-sm"
                >
                  <ChevronDown className="w-4 h-4" />
                  Voir plus — {allItems.length - paginated.length} résultats restants
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── FOOTER — masqué dans l'app mobile Capacitor (Android / iOS) ─────── */}
      {/* Web → footer affiché | App native → footer supprimé, espacement préservé */}
      {!isNativeApp ? (
        <footer className="bg-gray-900 text-gray-400 mt-16">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <img src={LOGO} alt="NEXORA" className="w-7 h-7 object-contain" />
              <span className="font-lexend font-black text-white text-base">NEXORA SHOP</span>
            </div>
            <p className="text-xs leading-relaxed text-gray-500">
              La marketplace africaine pour des produits vérifiés, des vendeurs de confiance et des avis clients authentiques.
            </p>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-3">Acheteurs</p>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate("/nexora-shop")} className="hover:text-white transition-colors">Tous les produits</button></li>
              <li><button onClick={() => navigate("/login")} className="hover:text-white transition-colors">Mon compte</button></li>
              <li><button className="hover:text-white transition-colors">Protection acheteur</button></li>
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-3">Vendeurs</p>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate("/login")} className="hover:text-white transition-colors">Ouvrir ma boutique</button></li>
              <li><button className="hover:text-white transition-colors">Guide vendeur</button></li>
              <li><button className="hover:text-white transition-colors">Tarifs & commissions</button></li>
            </ul>
          </div>

          <div>
            <p className="text-white font-bold text-sm mb-3">NEXORA</p>
            <ul className="space-y-2 text-xs">
              <li><button onClick={() => navigate("/")} className="hover:text-white transition-colors">Accueil</button></li>
              <li><button onClick={() => navigate("/cgu")} className="hover:text-white transition-colors">Conditions d'utilisation</button></li>
              <li><button onClick={() => navigate("/confidentialite")} className="hover:text-white transition-colors">Confidentialité</button></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 py-4">
          <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-600">
            <p>© {new Date().getFullYear()} NEXORA. Tous droits réservés. Marketplace Africaine.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-500"><CheckCircle className="w-3 h-3" /> Vendeurs vérifiés</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-purple-400" /> Mobile Money</span>
              <span className="flex items-center gap-1"><Globe className="w-3 h-3 text-blue-400" /> Afrique</span>
            </div>
          </div>
        </div>
        </footer>
      ) : (
        /* En mode app native : padding de bas de page pour compenser le footer supprimé */
        <div className="pb-8" aria-hidden="true" />
      )}
    </div>
  );
}
