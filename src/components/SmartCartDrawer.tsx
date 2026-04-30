/**
 * NEXORA Smart Cart — Panier latéral (SlideCart Drawer)
 * Design moderne, animations fluides, upsell automatique
 */


import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  X, Minus, Plus, Trash2, ShoppingBag, ArrowRight,
  Sparkles, Package, Tag, ChevronRight, Zap
} from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { formatPrix } from "@/lib/devise-utils";
import { supabase } from "@/integrations/supabase/client";
import type { ShopCartItem } from "@/lib/shop-cart";

interface SuggestedProduct {
  id: string;
  nom: string;
  prix: number;
  prix_promo: number | null;
  photos: string[];
  categorie: string | null;
}

export default function SmartCartDrawer() {
  const navigate = useNavigate();
  const location = useLocation();
  const { items, isOpen, closeCart, removeItem, updateQuantity, subtotal, itemCount, slug, setSlug: setCartSlug } = useCart();

  // Fallback: extraire le slug depuis l'URL courante si le contexte ne l'a pas
  const slugFromUrl = location.pathname.match(/\/shop\/([^/]+)/)?.[1] ?? null;
  const effectiveSlug = slug || slugFromUrl;

  // S'assurer que le cart-context connaît le slug (cas où on arrive directement sur /shop/:slug)
  useEffect(() => {
    if (!slug && slugFromUrl) {
      setCartSlug(slugFromUrl);
    }
  }, [slug, slugFromUrl]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = useState<SuggestedProduct[]>([]);
  const [loadingSug, setLoadingSug] = useState(false);

  
  // Bloquer le scroll body quand ouvert
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Charger les suggestions basées sur les catégories du panier
  useEffect(() => {
    if (!isOpen || !slug || items.length === 0) return;
    const cats = [...new Set(items.map(it => it.produit.categorie).filter(Boolean))];
    const ids = items.map(it => it.produit.id);

    const load = async () => {
      setLoadingSug(true);
      const query = supabase
        .from("produits" as any)
        .select("id,nom,prix,prix_promo,photos,categorie")
        .or("actif.eq.true,actif.is.null")
        .not("id", "in", `(${ids.join(",")})`)
        .limit(4);

      if (cats.length > 0) {
        // @ts-ignore
        query.in("categorie", cats);
      }

      const { data } = await query;
      if (data) setSuggestions(data as SuggestedProduct[]);
      setLoadingSug(false);
    };
    load();
  }, [isOpen, slug, items.length]);

  const handleCheckout = () => {
    closeCart();
    if (effectiveSlug) navigate(`/shop/${effectiveSlug}/checkout`);
  };

  const handleContinue = () => closeCart();

  const devise = "XOF"; // sera surchargé par contexte boutique si disponible

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        onClick={closeCart}
        className="fixed inset-0 z-[998] bg-black/40 backdrop-blur-sm"
        style={{ animation: "fadeIn 0.2s ease" }}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full z-[999] flex flex-col"
        style={{
          width: "min(440px, 100vw)",
          background: "linear-gradient(160deg, #ffffff 0%, #fafafa 100%)",
          boxShadow: "-8px 0 60px rgba(0,0,0,0.18)",
          animation: "slideInRight 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500 flex items-center justify-center shadow-lg shadow-rose-200">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">Mon Panier</h2>
              <p className="text-xs text-gray-400 font-medium">
                {itemCount === 0 ? "Vide" : `${itemCount} article${itemCount > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <button
            onClick={closeCart}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <EmptyCart onContinue={handleContinue} />
          ) : (
            <div className="p-4 space-y-3">
              {items.map((item, idx) => (
                <CartItemRow
                  key={`${item.produit.id}-${JSON.stringify(item.variations_choisies)}-${idx}`}
                  item={item}
                  devise={devise}
                  onRemove={() => removeItem(item.produit.id, item.variations_choisies)}
                  onQtyChange={(q) => updateQuantity(item.produit.id, item.variations_choisies, q)}
                />
              ))}

              {/* Suggestions Upsell */}
              {suggestions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black text-gray-700 uppercase tracking-widest">
                      Souvent achetés ensemble
                    </span>
                  </div>
                  <div className="space-y-2">
                    {suggestions.map(sug => (
                      <SuggestionRow
                        key={sug.id}
                        product={sug}
                        devise={devise}
                        slug={effectiveSlug || ""}
                        onView={() => {
                          closeCart();
                          navigate(`/shop/${effectiveSlug}/produit/${sug.id}`);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer — récapitulatif + boutons */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 bg-white p-5 space-y-4">
            {/* Totaux */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Sous-total</span>
                <span className="font-semibold text-gray-700">{formatPrix(subtotal, devise)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Livraison</span>
                <span className="text-green-600 font-semibold">À définir</span>
              </div>
              <div className="h-px bg-gray-100" />
              <div className="flex justify-between">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-xl text-rose-600">{formatPrix(subtotal, devise)}</span>
              </div>
            </div>

            {/* CTA Commander */}
            <button
              onClick={handleCheckout}
              className="w-full h-14 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-xl"
              style={{
                background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                boxShadow: "0 8px 30px rgba(244,63,94,0.35)",
              }}
            >
              <Zap className="w-5 h-5" />
              Commander maintenant
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Continuer */}
            <button
              onClick={handleContinue}
              className="w-full h-10 rounded-xl text-sm font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            >
              Continuer mes achats
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0 } to { opacity: 1 }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%) }
          to   { transform: translateX(0) }
        }
        @keyframes popIn {
          0%   { transform: scale(0.8); opacity: 0 }
          70%  { transform: scale(1.05) }
          100% { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </>
  );
}

// ─── Ligne article ─────────────────────────────────────────────────────────

function CartItemRow({
  item, devise, onRemove, onQtyChange
}: {
  item: ShopCartItem;
  devise: string;
  onRemove: () => void;
  onQtyChange: (q: number) => void;
}) {
  const prix = item.produit.prix_promo ?? item.produit.prix;
  const photo = item.produit.photos?.[0];
  const variations = Object.entries(item.variations_choisies || {});

  return (
    <div className="flex gap-3 p-3 rounded-2xl bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
        {photo
          ? <img src={photo} alt={item.produit.nom} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
        }
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{item.produit.nom}</p>
        {variations.length > 0 && (
          <p className="text-xs text-gray-400 mt-0.5">
            {variations.map(([k, v]) => `${k}: ${v}`).join(" • ")}
          </p>
        )}
        <p className="text-sm font-black text-rose-600 mt-1">{formatPrix(prix * item.quantite, devise)}</p>

        {/* Contrôle quantité */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => onQtyChange(item.quantite - 1)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Minus className="w-3 h-3 text-gray-600" />
          </button>
          <span className="text-sm font-black w-5 text-center text-gray-800">{item.quantite}</span>
          <button
            onClick={() => onQtyChange(item.quantite + 1)}
            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          >
            <Plus className="w-3 h-3 text-gray-600" />
          </button>

          <button
            onClick={onRemove}
            className="ml-auto w-7 h-7 rounded-lg bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors"
          >
            <Trash2 className="w-3 h-3 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Panier vide ────────────────────────────────────────────────────────────

function EmptyCart({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center min-h-[300px]">
      <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mb-4">
        <ShoppingBag className="w-10 h-10 text-gray-300" />
      </div>
      <h3 className="text-lg font-black text-gray-800">Panier vide</h3>
      <p className="text-sm text-gray-400 mt-1 mb-6">Ajoutez des produits pour commencer</p>
      <button
        onClick={onContinue}
        className="px-6 py-3 rounded-2xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
      >
        Découvrir les produits
      </button>
    </div>
  );
}

// ─── Suggestion upsell ──────────────────────────────────────────────────────

function SuggestionRow({
  product, devise, onView
}: {
  product: SuggestedProduct;
  devise: string;
  slug: string;
  onView: () => void;
}) {
  const prix = product.prix_promo ?? product.prix;
  const photo = product.photos?.[0];

  return (
    <button
      onClick={onView}
      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-100 transition-colors text-left"
    >
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white flex-shrink-0">
        {photo
          ? <img src={photo} alt={product.nom} className="w-full h-full object-cover" />
          : <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-300" /></div>
        }
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800 truncate">{product.nom}</p>
        <p className="text-xs text-rose-600 font-black">{formatPrix(prix, devise)}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-amber-400 flex-shrink-0" />
    </button>
  );
}
