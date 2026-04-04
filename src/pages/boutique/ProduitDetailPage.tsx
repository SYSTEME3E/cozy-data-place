import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, ShoppingCart, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addToCart } from "@/lib/shop-cart";
import SectionAvis from "@/pages/boutique/SectionAvis";
import { initTheme } from "@/lib/theme";

interface Variation {
  nom: string;
  valeurs: string[];
}


interface ProduitDetail {
  id: string;
  boutique_id: string;
  nom: string;
  description: string | null;
  prix: number;
  prix_promo: number | null;
  type: string;
  categorie: string | null;
  photos: string[] | null;
  stock: number;
  stock_illimite: boolean;
  vedette: boolean;
  poids: string | null;
  dimensions: string | null;
  sku: string | null;
  politique_remboursement: string | null;
  politique_confidentialite: string | null;
  paiement_reception: boolean;
  paiement_lien: string | null;
  moyens_paiement: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
  type_digital: string | null;
  variations_produit?: Variation[];
}

interface BoutiqueInfo {
  id: string;
  nom: string;
  slug: string;
  devise: string;
}

function formatPrix(prix: number, devise: string = "XOF") {
  if (devise === "USD") return `$${prix.toFixed(2)}`;
  return `${Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${devise}`;
}

export default function ProduitDetailPage() {
  const { slug, produitId } = useParams<{ slug: string; produitId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantite, setQuantite] = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitId) return;

      setLoading(true);

      const { data: boutiqueData } = await supabase
        .from("boutiques" as any)
        .select("id, nom, slug, devise")
        .eq("slug", slug)
        .eq("actif", true)
        .maybeSingle();

      if (!boutiqueData) {
        setLoading(false);
        return;
      }

      setBoutique(boutiqueData as unknown as BoutiqueInfo);

      const { data: produitData } = await supabase
        .from("produits" as any)
        .select("*, variations_produit(*)")
        .eq("id", produitId)
        .eq("boutique_id", (boutiqueData as any).id)
        .eq("actif", true)
        .maybeSingle();

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

    const defaults = produit.variations_produit.reduce<Record<string, string>>((acc, variation) => {
      acc[variation.nom] = variation.valeurs?.[0] || "";
      return acc;
    }, {});

    setSelectedVariations(defaults);
  }, [produit]);

  const images = useMemo(() => produit?.photos?.length ? produit.photos : [], [produit]);
  const prixActuel = produit?.prix_promo || produit?.prix || 0;
  const enRupture = !!produit && !produit.stock_illimite && produit.type === "physique" && produit.stock <= 0;

  const handleAddToCart = (goCheckout = false) => {
    if (!slug || !produit || !boutique) return;
    if (enRupture) return;

    const nextCart = addToCart(slug, {
      produit: {
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
      },
      quantite: produit.type === "physique" ? quantite : 1,
      variations_choisies: selectedVariations,
    });

    toast({
      title: goCheckout ? "Produit prêt pour la commande" : "Produit ajouté au panier",
      description: `${nextCart.length} article(s) dans votre panier`,
    });

    navigate(`/shop/${slug}?open=${goCheckout ? "checkout" : "cart"}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!produit || !boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Produit introuvable</h2>
          <p className="text-gray-500 mt-2">Ce produit n'est plus disponible.</p>
          <button onClick={() => navigate(slug ? `/shop/${slug}` : "/")}
            className="mt-4 flex items-center gap-2 text-pink-600 font-semibold mx-auto">
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-10">
        <button
          onClick={() => navigate(`/shop/${slug}`)}
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-pink-600 mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Retour à la boutique
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm aspect-square">
              {images[selectedImage] ? (
                <img src={images[selectedImage]} alt={produit.nom} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <Package className="w-14 h-14 text-gray-300" />
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image, index) => (
                  <button
                    key={image + index}
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-2xl overflow-hidden border ${selectedImage === index ? "border-pink-500" : "border-gray-200"}`}
                  >
                    <img src={image} alt={`${produit.nom} ${index + 1}`} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                {produit.categorie && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">
                    <Tag className="w-3 h-3" /> {produit.categorie}
                  </span>
                )}
                <span className="inline-flex rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                  {produit.type === "numerique" ? "Produit digital" : "Produit physique"}
                </span>
                {produit.vedette && (
                  <span className="inline-flex rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
                    Vedette
                  </span>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-500">{boutique.nom}</p>
                <h1 className="text-3xl font-black text-gray-900 mt-1">{produit.nom}</h1>
              </div>

              <div className="flex items-end gap-3">
                <span className="text-3xl font-black text-pink-600">{formatPrix(prixActuel, boutique.devise)}</span>
                {produit.prix_promo && (
                  <span className="text-lg font-bold text-gray-400 line-through">{formatPrix(produit.prix, boutique.devise)}</span>
                )}
              </div>

              <p className="text-sm leading-7 text-gray-600">{produit.description || "Aucune description disponible pour ce produit."}</p>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-gray-400">Stock</p>
                  <p className="font-bold text-gray-800 mt-1">
                    {produit.stock_illimite ? "Illimité" : produit.stock > 0 ? `${produit.stock} disponible(s)` : "Rupture"}
                  </p>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4">
                  <p className="text-gray-400">Référence</p>
                  <p className="font-bold text-gray-800 mt-1">{produit.sku || "NEXORA-PROD"}</p>
                </div>
              </div>

              {!!produit.variations_produit?.length && (
                <div className="space-y-3">
                  {produit.variations_produit.map((variation) => (
                    <div key={variation.nom}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">{variation.nom}</p>
                      <div className="flex flex-wrap gap-2">
                        {variation.valeurs.map((valeur) => {
                          const active = selectedVariations[variation.nom] === valeur;
                          return (
                            <button
                              key={valeur}
                              onClick={() => setSelectedVariations((prev) => ({ ...prev, [variation.nom]: valeur }))}
                              className={`rounded-full px-3 py-1.5 text-sm font-medium ${active ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-700"}`}
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

              {produit.type === "physique" && !produit.stock_illimite && produit.stock > 0 && (
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">Quantité</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setQuantite((prev) => Math.max(1, prev - 1))} className="w-10 h-10 rounded-xl bg-gray-100 font-bold">-</button>
                    <span className="w-10 text-center font-black text-lg">{quantite}</span>
                    <button onClick={() => setQuantite((prev) => Math.min(produit.stock, prev + 1))} className="w-10 h-10 rounded-xl bg-gray-100 font-bold">+</button>
                  </div>
                </div>
              )}

              {/* ── Boutons d'action ── */}
              <div className="grid gap-3">
                {/* Ajouter au panier toujours visible */}
                <button
                  onClick={() => handleAddToCart(false)}
                  disabled={enRupture}
                  className="h-12 rounded-2xl bg-gray-900 text-white font-bold disabled:opacity-50 hover:bg-gray-800 transition-colors"
                >
                  Ajouter au panier
                </button>

                {/* Commander maintenant — visible si lien paiement OU paiement mobile money OU paiement réception */}
                {(produit.paiement_lien || produit.paiement_reception || produit.moyens_paiement.length > 0) && (
                  <button
                    onClick={() => navigate(`/shop/${slug}/acheter/${produit.id}?qte=${quantite}`)}
                    disabled={enRupture}
                    className="h-12 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-bold disabled:opacity-50 transition-all hover:shadow-lg hover:shadow-pink-200 active:scale-95 flex items-center justify-center gap-2"
                  >
                    Commander maintenant!
                  </button>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-4 text-sm text-gray-600">
              {produit.poids && <p><span className="font-semibold text-gray-800">Poids :</span> {produit.poids}</p>}
              {produit.dimensions && <p><span className="font-semibold text-gray-800">Dimensions :</span> {produit.dimensions}</p>}
              {produit.type_digital && <p><span className="font-semibold text-gray-800">Type digital :</span> {produit.type_digital}</p>}
              {produit.politique_remboursement && <p><span className="font-semibold text-gray-800">Politique de remboursement :</span> {produit.politique_remboursement}</p>}
              {produit.politique_confidentialite && <p><span className="font-semibold text-gray-800">Politique de confidentialité :</span> {produit.politique_confidentialite}</p>}
            </div>
          </div>
        </div>

        {/* Section Avis */}
        <SectionAvis produitId={produit.id} nomItem={produit.nom} />
      </div>
    </div>
  );
}
