/**
 * NEXORA — Utilitaires Slug (Frontend)
 *
 * Miroir côté client de la logique PostgreSQL.
 * Utilisé pour :
 *   - Prévisualisation du slug en temps réel dans NouveauProduitPage
 *   - Construction des liens produits / campagnes
 *   - Détection UUID (pour les redirections 301)
 */

// ─── 1. Génération de slug ───────────────────────────────────────────────────

const ACCENT_MAP: Record<string, string> = {
  à: 'a', á: 'a', â: 'a', ã: 'a', ä: 'a', å: 'a', æ: 'ae',
  è: 'e', é: 'e', ê: 'e', ë: 'e',
  ì: 'i', í: 'i', î: 'i', ï: 'i',
  ò: 'o', ó: 'o', ô: 'o', õ: 'o', ö: 'o', ø: 'o',
  ù: 'u', ú: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  ç: 'c', ñ: 'n', ð: 'd', þ: 'th', œ: 'oe', š: 's', ž: 'z', ß: 'ss',
};

/**
 * Convertit un texte quelconque en slug URL-safe.
 * "Chaussure Nike Air Max 90 !" → "chaussure-nike-air-max-90"
 */
export function generateSlug(text: string): string {
  if (!text || text.trim() === '') return '';

  return text
    .toLowerCase()
    // Translittération
    .replace(/[àáâãäåæèéêëìíîïòóôõöøùúûüýÿçñðþœšžß]/g, (c) => ACCENT_MAP[c] ?? c)
    // Supprimer les caractères non-alphanumériques (hors tiret/espace)
    .replace(/[^a-z0-9\s-]/g, '')
    // Espaces/tirets multiples → 1 tiret
    .replace(/[\s-]+/g, '-')
    // Trim tirets en début/fin
    .replace(/^-+|-+$/g, '');
}

// ─── 2. Détection d'UUID ─────────────────────────────────────────────────────

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Retourne true si la chaîne est un UUID v4. */
export function isUUID(value: string): boolean {
  return UUID_RE.test(value);
}

// ─── 3. Construction des URLs produits ───────────────────────────────────────

/**
 * Construit le chemin public d'un produit physique.
 * @param boutiqueSlug  slug de la boutique (ex: "ma-boutique")
 * @param produitSlug   slug du produit     (ex: "chaussure-nike-air-max")
 */
export function buildProduitUrl(boutiqueSlug: string, produitSlug: string): string {
  return `/shop/${boutiqueSlug}/produit/${produitSlug}`;
}

/**
 * Construit le chemin public d'un produit digital.
 */
export function buildDigitalUrl(boutiqueSlug: string, produitSlug: string): string {
  return `/shop/${boutiqueSlug}/digital/${produitSlug}`;
}

/**
 * Construit le chemin de la page d'achat.
 */
export function buildAcheterUrl(boutiqueSlug: string, produitSlug: string): string {
  return `/shop/${boutiqueSlug}/acheter/${produitSlug}`;
}

// ─── 4. Construction des liens de campagne (sans ?cid=) ──────────────────────

/**
 * Construit l'URL de partage d'une campagne.
 * Le tracking est fait via sessionStorage + path, plus via ?cid= en query string.
 *
 * Format : /shop/:boutiqueSlug/produit/:produitSlug?cid=:campagneId
 *
 * NOTE : le ?cid= est CONSERVÉ uniquement dans les liens de campagne générés
 * pour le partage (WhatsApp, email, etc.). Il est retiré de l'URL publique
 * dès que le visiteur arrive (voir campagneTracker.ts).
 */
export function buildCampagneLink(
  boutiqueSlug: string,
  produitSlug: string,
  campagneId: string,
  origin = typeof window !== 'undefined' ? window.location.origin : ''
): string {
  const path = buildProduitUrl(boutiqueSlug, produitSlug);
  return `${origin}${path}?cid=${campagneId}`;
}

// ─── 5. Résolution hybride (slug ou UUID legacy) ──────────────────────────────

/**
 * Extrait le slug "propre" à partir d'un paramètre de route qui peut être
 * soit un slug SEO, soit un UUID legacy (pour la compatibilité).
 *
 * Retourne { type: 'slug', value } ou { type: 'uuid', value }.
 */
export function parseRouteParam(param: string): { type: 'slug' | 'uuid'; value: string } {
  if (isUUID(param)) return { type: 'uuid', value: param };
  return { type: 'slug', value: param };
}
