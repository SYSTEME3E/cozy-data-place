import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, ShoppingCart, Tag, Star, Minus, Plus, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/lib/cart-context";
import ProductActionButtons from "@/components/ProductActionButtons";
import SectionAvis from "@/pages/boutique/SectionAvis";
import { formatPrix } from "@/lib/devise-utils";

interface Variation { nom: string; valeurs: string[]; }

interface ProduitDetail {
  id: string; boutique_id: string; nom: string;
  description: string | null; prix: number; prix_promo: number | null;
  type: string; categorie: string | null; photos: string[] | null;
  stock: number; stock_illimite: boolean; vedette: boolean;
  poids: string | null; dimensions: string | null; sku: string | null;
  politique_remboursement: string | null; politique_confidentialite: string | null;
  paiement_reception: boolean; paiement_lien: string | null;
  moyens_paiement: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
  type_digital: string | null; variations_produit?: Variation[];
}

interface BoutiqueInfo { id: string; nom: string; slug: string; devise: string; }

export default function ProduitDetailPage() {
  const { slug, produitId } = useParams<{ slug: string; produitId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSlug: setCartSlug } = useCart();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitId) return;
      setLoading(true);
      const { data: boutiqueData } = await supabase
        .from("boutiques" as any).select("id, nom, slug, devise")
        .eq("slug", slug).or("actif.eq.true,actif.is.null").maybeSingle();
      if (!boutiqueData) { setLoading(false); return; }
      setBoutique(boutiqueData as unknown as BoutiqueInfo);
      if (slug) setCartSlug(slug);
      const { data: produitData } = await supabase
        .from("produits" as any).select("*, variations_produit(*)")
        .eq("id", produitId).eq("boutique_id", (boutiqueData as any).id)
        .or("actif.eq.true,actif.is.null").maybeSingle();
      if (produitData) {
        setProduit({
          ...(produitData as any),
          moyens_paiement: (produitData as any).moyens_paiement || [],
          variations_produit: (produitData as any).variations_produit || [],
          photos: (produitData as any).photos || [],
        });
      }
      setLoading(false);
    };
    load();
  }, [slug, produitId]);

  useEffect(() => {
    if (!produit?.variations_produit?.length) return;
    const defaults = produit.variations_produit.reduce<Record<string, string>>((acc, v) => {
      acc[v.nom] = v.valeurs?.[0] || ""; return acc;
    }, {});
    setSelectedVariations(defaults);
  }, [produit]);

  const images = useMemo(() => produit?.photos?.length ? produit.photos : [], [produit]);
  const prixActuel = produit?.prix_promo ?? produit?.prix ?? 0;
  const enRupture = !!produit && !produit.stock_illimite && produit.type === "physique" && produit.stock <= 0;
  const pctPromo = produit?.prix_promo
    ? Math.round(((produit.prix - produit.prix_promo) / produit.prix) * 100)
    : 0;
  const typeLabel = produit?.type === "numerique" ? "Produit digital"
    : produit?.type === "service" ? "Service" : "Produit physique";

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f7f8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-400 font-medium">Chargement du produit…</p>
        </div>
      </div>
    );
  }

  /* ── 404 ── */
  if (!produit || !boutique) {
    return (
      <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center p-6">
        <div className="text-center w-full max-w-sm mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center mx-auto mb-5">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-xl font-black text-gray-700">Produit introuvable</h2>
          <p className="text-gray-400 mt-2 text-sm">Ce produit n'est plus disponible ou a été retiré.</p>
          <button
            onClick={() => navigate(slug ? `/shop/${slug}` : "/")}
            className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-500 text-white px-5 py-3 rounded-2xl text-sm font-semibold hover:bg-rose-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {/* ── Conteneur principal — mobile-first, max-w-md centré sur mobile, max-w-5xl sur desktop ── */}
      <div className="w-full max-w-md mx-auto px-4 py-5 sm:max-w-5xl sm:px-6 md:py-10">

        {/* ── Retour ── */}
        <button
          onClick={() => navigate(`/shop/${slug}`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-rose-500 transition-colors mb-5"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la boutique
        </button>

        {/* ══════════════════════════════════════════════
            HEADER MOBILE — Nom + Badges (visible uniquement sur mobile)
            Apparaît AU-DESSUS de l'image sur mobile
        ══════════════════════════════════════════════ */}
        <div className="sm:hidden mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {produit.categorie && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 border border-rose-100">
                <Tag className="w-3 h-3" /> {produit.categorie}
              </span>
            )}
            <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
              {typeLabel}
            </span>
            {produit.vedette && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-100">
                <Star className="w-3 h-3 fill-amber-400" /> Vedette
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-gray-900 leading-tight">{produit.nom}</h1>
        </div>

        {/* ══════════════════════════════════════════════
            GRILLE PRINCIPALE
            - mobile : flex-col (une colonne)
            - desktop (sm+) : grid 2 colonnes
        ══════════════════════════════════════════════ */}
        <div className="flex flex-col gap-4 sm:grid sm:grid-cols-[1.1fr_0.9fr] sm:gap-5 sm:items-start">

          {/* ────────────────────────────────────
              COLONNE GAUCHE — Image + Miniatures
          ──────────────────────────────────── */}
          <div className="space-y-3 w-full overflow-hidden">
            {/* Image principale — aspect-ratio 1:1, taille fixe, object-cover */}
            <div className="relative w-full overflow-hidden rounded-3xl bg-white shadow-sm border border-gray-100 aspect-square">
              {images[selectedImage] ? (
                <img
                  src={images[selectedImage]}
                  alt={produit.nom}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50 gap-3">
                  <Package className="w-16 h-16 text-gray-200" />
                  <p className="text-xs text-gray-300 font-medium">Aucune photo</p>
                </div>
              )}

              {/* Badge promo sur l'image */}
              {pctPromo > 0 && (
                <div className="absolute top-3 left-3 bg-rose-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                  -{pctPromo}% 🔥
                </div>
              )}

              {/* Badge rupture de stock */}
              {enRupture && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-3xl">
                  <span className="bg-white text-red-600 font-black px-4 py-2 rounded-2xl text-sm shadow-lg">
                    Rupture de stock
                  </span>
                </div>
              )}
            </div>

            {/* Miniatures — grid 4 colonnes, images carrées */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2 w-full">
                {images.map((img, i) => (
                  <button
                    key={img + i}
                    onClick={() => setSelectedImage(i)}
                    className={`rounded-2xl overflow-hidden border-2 transition-all aspect-square ${
                      selectedImage === i
                        ? "border-rose-500 scale-95 shadow-md"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ────────────────────────────────────
              COLONNE DROITE — Infos + Actions
          ──────────────────────────────────── */}
          <div className="space-y-4 w-full overflow-hidden">

            {/* ═══ CARD 1 — Nom + Badges (desktop uniquement) ═══ */}
            <div className="hidden sm:block bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {produit.categorie && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-600 border border-rose-100">
                    <Tag className="w-3 h-3" /> {produit.categorie}
                  </span>
                )}
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600">
                  {typeLabel}
                </span>
                {produit.vedette && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-100">
                    <Star className="w-3 h-3 fill-amber-400" /> Vedette
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-black text-gray-900 leading-tight">{produit.nom}</h1>
            </div>

            {/* ═══ CARD 2 — PRIX ═══ */}
            <div className="bg-gray-100/80 rounded-3xl border border-gray-200 shadow-sm p-5">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Prix</p>

              {/* Les deux prix sur la même ligne, wrappés proprement */}
              <div className="flex items-center flex-wrap gap-3">
                <span className="text-[28px] font-black text-rose-500 whitespace-nowrap leading-none">
                  {formatPrix(prixActuel, boutique.devise)}
                </span>
                {produit.prix_promo && (
                  <span className="text-[22px] font-black text-red-400 line-through whitespace-nowrap leading-none opacity-80">
                    {formatPrix(produit.prix, boutique.devise)}
                  </span>
                )}
              </div>

              {pctPromo > 0 && (
                <div className="mt-3 inline-flex items-center gap-1.5 bg-green-50 border border-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Vous économisez {pctPromo}% !
                </div>
              )}

              {enRupture && (
                <p className="text-xs font-bold text-red-500 mt-3 flex items-center gap-1.5">
                  ⚠️ Ce produit est actuellement en rupture de stock.
                </p>
              )}
            </div>

            {/* ═══ CARD 3 — DESCRIPTION ═══ */}
            {produit.description && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 overflow-hidden">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Description</p>
                <div
                  className="
                    text-sm text-gray-700 leading-7 overflow-hidden
                    [&>h1]:text-xl [&>h1]:font-black [&>h1]:text-gray-900 [&>h1]:mt-4 [&>h1]:mb-2
                    [&>h2]:text-lg [&>h2]:font-bold [&>h2]:text-gray-800 [&>h2]:mt-3 [&>h2]:mb-2
                    [&>h3]:text-base [&>h3]:font-semibold [&>h3]:text-gray-700 [&>h3]:mt-2 [&>h3]:mb-1
                    [&>p]:mb-3 [&>p]:leading-7
                    [&>ul]:my-3 [&>ul]:pl-5 [&>ul>li]:mb-1.5 [&>ul>li]:list-disc
                    [&>ol]:my-3 [&>ol]:pl-5 [&>ol>li]:mb-1.5 [&>ol>li]:list-decimal
                    [&>hr]:my-4 [&>hr]:border-0 [&>hr]:border-t [&>hr]:border-gray-100
                    [&>strong]:font-bold [&>strong]:text-gray-900
                    [&>blockquote]:border-l-4 [&>blockquote]:border-rose-200 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-gray-500
                    [&_*]:!bg-transparent [&_span]:!bg-transparent [&_p]:!bg-transparent
                    [&_*]:max-w-full
                    [&_img]:block [&_img]:w-full [&_img]:max-w-full [&_img]:h-auto
                    [&_img]:rounded-2xl [&_img]:my-4 [&_img]:object-cover
                    [&_table]:w-full [&_table]:block [&_table]:overflow-x-auto
                    [&_pre]:overflow-x-auto [&_pre]:max-w-full
                    [&_iframe]:max-w-full [&_video]:max-w-full [&_video]:h-auto
                  "
                  dangerouslySetInnerHTML={{ __html: produit.description }}
                />
              </div>
            )}

            {/* ═══ CARD 4 — INFORMATIONS + VARIATIONS + QUANTITÉ + BOUTONS ═══ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4 overflow-hidden">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Informations</p>

              {/* Stock + Référence */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 p-3">
                  <p className="text-xs text-gray-400 mb-1">Stock</p>
                  <p className="text-sm font-bold text-gray-800">
                    {produit.stock_illimite
                      ? "Illimité ∞"
                      : produit.stock > 0
                      ? `${produit.stock} dispo${produit.stock > 1 ? "s" : ""}`
                      : "Rupture de stock"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-3 overflow-hidden">
                  <p className="text-xs text-gray-400 mb-1">Référence</p>
                  <p className="text-sm font-bold text-gray-800 truncate">{produit.sku || "NEXORA-PROD"}</p>
                </div>
              </div>

              {/* Infos physiques */}
              {(produit.poids || produit.dimensions || produit.type_digital) && (
                <div className="space-y-1.5 text-sm text-gray-600 border-t border-gray-100 pt-3">
                  {produit.poids && (
                    <p><span className="font-semibold text-gray-700">Poids :</span> {produit.poids}</p>
                  )}
                  {produit.dimensions && (
                    <p><span className="font-semibold text-gray-700">Dimensions :</span> {produit.dimensions}</p>
                  )}
                  {produit.type_digital && (
                    <p><span className="font-semibold text-gray-700">Type digital :</span> {produit.type_digital}</p>
                  )}
                </div>
              )}

              {/* Politiques */}
              {(produit.politique_remboursement || produit.politique_confidentialite) && (
                <div className="space-y-1.5 text-xs text-gray-500 border-t border-gray-100 pt-3">
                  {produit.politique_remboursement && (
                    <p>
                      <span className="font-semibold text-gray-600">Remboursement : </span>
                      {produit.politique_remboursement}
                    </p>
                  )}
                  {produit.politique_confidentialite && (
                    <p>
                      <span className="font-semibold text-gray-600">Confidentialité : </span>
                      {produit.politique_confidentialite}
                    </p>
                  )}
                </div>
              )}

              {/* Variations */}
              {!!produit.variations_produit?.length && (
                <div className="space-y-3 border-t border-gray-100 pt-3">
                  {produit.variations_produit.map((variation) => (
                    <div key={variation.nom}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{variation.nom}</p>
                      <div className="flex flex-wrap gap-2">
                        {variation.valeurs.map((valeur) => {
                          const active = selectedVariations[variation.nom] === valeur;
                          return (
                            <button
                              key={valeur}
                              onClick={() =>
                                setSelectedVariations((prev) => ({ ...prev, [variation.nom]: valeur }))
                              }
                              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                                active
                                  ? "bg-rose-500 text-white shadow-sm shadow-rose-200"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}
                            >
                              {valeur}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Quantité (produits physiques en stock seulement) */}
              {produit.type === "physique" && !produit.stock_illimite && produit.stock > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Quantité</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setQuantite((p) => Math.max(1, p - 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="w-12 text-center font-black text-lg text-gray-900">{quantite}</span>
                    <button
                      onClick={() => setQuantite((p) => Math.min(produit.stock, p + 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="text-xs text-gray-400 ml-1">/ {produit.stock} max</span>
                  </div>
                </div>
              )}

              {/* ── Boutons d'action — full width sur mobile ── */}
              <div className="border-t border-gray-100 pt-4 w-full">
                <ProductActionButtons
                  slug={slug!}
                  produit={produit}
                  quantite={quantite}
                  selectedVariations={selectedVariations}
                  disabled={enRupture}
                />
              </div>
            </div>

          </div>{/* fin colonne droite */}
        </div>{/* fin grille */}

        {/* ── Section Avis ── */}
        <div className="mt-8">
          <SectionAvis produitId={produit.id} nomItem={produit.nom} />
        </div>

      </div>
    </div>
  );
}
