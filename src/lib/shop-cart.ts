export interface ShopCartProduct {
  id: string;
  nom: string;
  description?: string | null;
  prix: number;
  prix_promo?: number | null;
  type: string;
  categorie?: string | null;
  stock?: number;
  stock_illimite?: boolean;
  photos?: string[];
  paiement_reception?: boolean;
  paiement_lien?: string | null;
  moyens_paiement?: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
}

export interface ShopCartItem {
  produit: ShopCartProduct;
  quantite: number;
  variations_choisies: Record<string, string>;
}

const CART_KEY_PREFIX = "nexora_shop_cart_";

function getCartKey(slug: string) {
  return `${CART_KEY_PREFIX}${slug}`;
}

function isBrowser() {
  return typeof window !== "undefined";
}

export function readCart(slug?: string): ShopCartItem[] {
  if (!isBrowser() || !slug) return [];

  try {
    const raw = window.localStorage.getItem(getCartKey(slug));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCart(slug: string, cart: ShopCartItem[]) {
  if (!isBrowser() || !slug) return;
  window.localStorage.setItem(getCartKey(slug), JSON.stringify(cart));
}

export function clearCart(slug: string) {
  if (!isBrowser() || !slug) return;
  window.localStorage.removeItem(getCartKey(slug));
}

export function addToCart(slug: string, item: ShopCartItem): ShopCartItem[] {
  const current = readCart(slug);
  const itemKey = JSON.stringify(item.variations_choisies || {});

  const existingIndex = current.findIndex((entry) => {
    return entry.produit.id === item.produit.id && JSON.stringify(entry.variations_choisies || {}) === itemKey;
  });

  const next = [...current];

  if (existingIndex >= 0) {
    next[existingIndex] = {
      ...next[existingIndex],
      quantite: next[existingIndex].quantite + item.quantite,
    };
  } else {
    next.push(item);
  }

  saveCart(slug, next);
  return next;
}