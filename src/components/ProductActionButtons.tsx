import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShoppingCart, Zap, Check } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import type { ShopCartItem, ShopCartProduct } from "@/lib/shop-cart";

interface ProductActionButtonsProps {
  slug: string;
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
  };
  quantite: number;
  selectedVariations?: Record<string, string>;
  disabled?: boolean;
}

export default function ProductActionButtons({
  slug,
  produit,
  quantite,
  selectedVariations = {},
  disabled = false,
}: ProductActionButtonsProps) {
  const navigate = useNavigate();
  const { addItem } = useCart();
  const [hasAdded, setHasAdded] = useState(false);

  const isDigital = produit.type === "numerique";

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

  // ── Ajouter au panier (physique ET digital)
  const handleAddToCart = () => {
    if (disabled) return;
    const item: ShopCartItem = {
      produit: shopProduct,
      quantite,
      variations_choisies: selectedVariations,
    };
    addItem(slug, item);
    setHasAdded(true);
  };

  // ── Finaliser la commande — redirige vers le panier avec la section appropriée
  const handleCheckout = () => {
    if (disabled) return;
    if (isDigital) {
      navigate(`/shop/${slug}?open=checkout-numerique`);
    } else {
      navigate(`/shop/${slug}?open=checkout-physique`);
    }
  };

  // ════════════════════════════════════════════
  // RENDU DIGITAL — panier + finaliser commande
  // ════════════════════════════════════════════
  if (isDigital) {
    return (
      <div className="grid gap-3">
        {/* Bouton 1 : Ajouter au panier */}
        <button
          onClick={handleAddToCart}
          disabled={disabled}
          className="h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          style={
            hasAdded
              ? { background: "#16a34a", color: "#fff", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }
              : {
                  background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  color: "#fff",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
                }
          }
        >
          {hasAdded ? (
            <>
              <Check className="w-4 h-4" />
              Ajouter encore
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              Ajouter au panier
            </>
          )}
        </button>

        {/* Bouton 2 : Finaliser (apparaît après ajout) */}
        {hasAdded && (
          <button
            onClick={handleCheckout}
            disabled={disabled}
            className="h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all animate-in fade-in zoom-in duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
              boxShadow: "0 4px 20px rgba(99,102,241,0.25)",
            }}
          >
            <Zap className="w-4 h-4" />
            Finaliser la commande maintenant !
          </button>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════
  // RENDU PHYSIQUE — panier + finaliser commande
  // ════════════════════════════════════════════
  return (
    <div className="grid gap-3">
      {/* Bouton 1 : Ajouter au panier */}
      <button
        onClick={handleAddToCart}
        disabled={disabled}
        className="h-12 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        style={
          hasAdded
            ? { background: "#16a34a", color: "#fff", boxShadow: "0 4px 20px rgba(22,163,74,0.3)" }
            : { background: "#111827", color: "#fff" }
        }
      >
        {hasAdded ? (
          <>
            <Check className="w-4 h-4" />
            Ajouter encore
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            Ajouter au panier
          </>
        )}
      </button>

      {/* Bouton 2 : Finaliser (apparaît après ajout) */}
      {hasAdded && (
        <button
          onClick={handleCheckout}
          disabled={disabled}
          className="h-12 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all animate-in fade-in zoom-in duration-300 active:scale-95 hover:shadow-lg hover:shadow-rose-200 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
            boxShadow: "0 4px 20px rgba(244,63,94,0.25)",
          }}
        >
          <Zap className="w-4 h-4" />
          Finaliser la commande maintenant !
        </button>
      )}
    </div>
  );
}
