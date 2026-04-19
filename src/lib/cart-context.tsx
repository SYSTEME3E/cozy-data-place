/**
 * NEXORA Smart Cart — Context global du panier
 * Gère l'état, la persistance localStorage et les événements inter-composants
 */


import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { readCart, saveCart, addToCart as addToCartLib, type ShopCartItem, type ShopCartProduct } from "@/lib/shop-cart";

interface CartContextValue {
  items: ShopCartItem[];
  isOpen: boolean;
  slug: string | null;
  itemCount: number;
  subtotal: number;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  addItem: (slug: string, item: ShopCartItem) => void;
  removeItem: (produitId: string, variations: Record<string, string>) => void;
  updateQuantity: (produitId: string, variations: Record<string, string>, qty: number) => void;
  clearCartItems: () => void;
  setSlug: (slug: string) => void;
}



const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [slug, setSlugState] = useState<string | null>(null);
  const slugRef = useRef<string | null>(null);

  const setSlug = useCallback((s: string) => {
    slugRef.current = s;
    setSlugState(s);
    const loaded = readCart(s);
    setItems(loaded);
  }, []);

  // Sync depuis localStorage quand le slug change
  useEffect(() => {
    if (!slug) return;
    const loaded = readCart(slug);
    setItems(loaded);
  }, [slug]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);
  const toggleCart = useCallback(() => setIsOpen(prev => !prev), []);

  const addItem = useCallback((cartSlug: string, item: ShopCartItem) => {
    const next = addToCartLib(cartSlug, item);
    setItems(next);
    if (slugRef.current !== cartSlug) {
      slugRef.current = cartSlug;
      setSlugState(cartSlug);
    }
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((produitId: string, variations: Record<string, string>) => {
    if (!slugRef.current) return;
    const varKey = JSON.stringify(variations || {});
    const next = items.filter(it =>
      !(it.produit.id === produitId && JSON.stringify(it.variations_choisies || {}) === varKey)
    );
    setItems(next);
    saveCart(slugRef.current, next);
  }, [items]);

  const updateQuantity = useCallback((produitId: string, variations: Record<string, string>, qty: number) => {
    if (!slugRef.current) return;
    const varKey = JSON.stringify(variations || {});
    let next: ShopCartItem[];
    if (qty <= 0) {
      next = items.filter(it =>
        !(it.produit.id === produitId && JSON.stringify(it.variations_choisies || {}) === varKey)
      );
    } else {
      next = items.map(it =>
        it.produit.id === produitId && JSON.stringify(it.variations_choisies || {}) === varKey
          ? { ...it, quantite: qty }
          : it
      );
    }
    setItems(next);
    saveCart(slugRef.current, next);
  }, [items]);

  const clearCartItems = useCallback(() => {
    if (!slugRef.current) return;
    setItems([]);
    saveCart(slugRef.current, []);
  }, []);

  const itemCount = items.reduce((sum, it) => sum + it.quantite, 0);
  const subtotal = items.reduce((sum, it) => {
    const prix = it.produit.prix_promo ?? it.produit.prix;
    return sum + prix * it.quantite;
  }, 0);

  return (
    <CartContext.Provider value={{
      items, isOpen, slug, itemCount, subtotal,
      openCart, closeCart, toggleCart,
      addItem, removeItem, updateQuantity, clearCartItems, setSlug,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
