/**
 * ProductActionButtons — Boutons d'action produit
 *
 * DIGITAL  → UN seul bouton KKiaPay (couleur + texte définis par le vendeur)
 *            Redirige vers /shop/:slug/acheter/:produitSlug
 * PHYSIQUE → Ajouter au panier + Finaliser
 */

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { ShopCartItem, ShopCartProduct } from "@/lib/shop-cart";

interface ProductActionButtonsProps {
  slug?: string;
  produit: {
    id: string;
    nom: string;
    description?: string | null;
    prix: number;
    prix_promo?: number | null;
    type: string;
    categorie?: string | null;
    stock: number;
    stock_illimite: boolean;
    photos?: string[] | null;
    paiement_reception?: boolean;
    paiement_lien?: string | null;
    moyens_paiement?: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
    bouton_texte?: string | null;
    bouton_couleur?: string | null;
    slug?: string;
  };
  boutique?: {
    id?: string; nom?: string; slug?: string; devise?: string;
    pixel_actif?: boolean; pixel_facebook_id?: string;
  } | null;
  quantite: number;
  selectedVariations?: Record<string, string>;
  disabled?: boolean;
  enRupture?: boolean;
  onAcheter?: () => void;
}

function fbTrack(boutique: ProductActionButtonsProps["boutique"], event: string, params?: Record<string, unknown>) {
  if (!boutique?.pixel_actif || !boutique?.pixel_facebook_id) return;
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, params);
  }
}

export default function ProductActionButtons({
  slug: slugProp,
  produit,
  boutique,
  quantite,
  selectedVariations = {},
  disabled = false,
  enRupture = false,
  onAcheter,
}: ProductActionButtonsProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { addItem } = useCart();
  const [hasAdded, setHasAdded] = useState(false);

  const slug = slugProp
    || boutique?.slug
    || location.pathname.match(/\/shop\/([^/]+)/)?.[1]
    || "";

  const isDisabled = disabled || enRupture;
  const isDigital = produit.type === "numerique";

  const boutonCouleur = produit.bouton_couleur || "#7c3aed";
  const boutonTexte   = produit.bouton_texte   || "Payer maintenant";

  const handleDigitalPay = () => {
    if (isDisabled) return;
    fbTrack(boutique, "InitiateCheckout", {
      content_name: produit.nom,
      content_ids: [produit.id],
      content_type: "product",
      value: produit.prix_promo || produit.prix,
      currency: boutique?.devise || "XOF",
    });
    if (onAcheter) { onAcheter(); return; }
    const produitSlug = (produit as any).slug || produit.id;
    navigate(`/shop/${slug}/acheter/${produitSlug}`);
  };

  // ── DIGITAL : bouton unique KKiaPay
  if (isDigital) {
    return (
      <button
        onClick={handleDigitalPay}
        disabled={isDisabled}
        className="w-full h-14 rounded-2xl font-black text-lg text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          backgroundColor: boutonCouleur,
          boxShadow: `0 6px 20px ${boutonCouleur}50`,
        }}
      >
        <Zap className="w-5 h-5" />
        {boutonTexte} ⚡
      </button>
    );
  }

  // ── PHYSIQUE : panier + finaliser
  const shopProduct: ShopCartProduct = {
    id: produit.id,
    nom: produit.nom,
    description: produit.description,
    prix: produit.prix,
    prix_promo: produit.prix_promo,
    type: produit.type,
    categorie: produit.categorie,
    stock: produit.stock,
    stock_illimite: produit.stock_illimite,
    photos: produit.photos || [],
    paiement_lien: produit.paiement_lien,
    paiement_reception: produit.paiement_reception,
    moyens_paiement: produit.moyens_paiement || [],
  };

  const handleAddToCart = () => {
    if (isDisabled) return;
    const item: ShopCartItem = { produit: shopProduct, quantite, variations_choisies: selectedVariations };
    addItem(slug, item);
    fbTrack(boutique, "AddToCart", {
      content_name: produit.nom, content_ids: [produit.id], content_type: "product",
      value: (produit.prix_promo || produit.prix) * quantite,
      currency: boutique?.devise || "XOF", num_items: quantite,
    });
    setHasAdded(true);
  };

  return (
    <div className="grid gap-3">
      <button
        onClick={handleAddToCart}
        disabled={isDisabled}
        className="h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={
          hasAdded
            ? { background: "#16a34a", color: "#fff", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }
            : { background: "#111827", color: "#fff" }
        }
      >
        {hasAdded ? <><Check className="w-4 h-4" />Ajouter encore</> : <><ShoppingCart className="w-4 h-4" />Ajouter au panier</>}
      </button>
      {hasAdded && (
        <button
          onClick={() => navigate(`/shop/${slug}/checkout`)}
          disabled={isDisabled}
          className="h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all animate-in fade-in zoom-in duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)", boxShadow: "0 4px 20px rgba(244,63,94,0.25)" }}
        >
          <Zap className="w-4 h-4" />Finaliser la commande maintenant !
        </button>
      )}
    </div>
  );
}
