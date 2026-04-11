import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addToCart, clearCart, readCart, saveCart, type ShopCartItem } from "@/lib/shop-cart";
import { initTheme } from "@/lib/theme";
import {
  ShoppingCart, Plus, Minus, X, Phone, MessageCircle,
  Search, Star, Tag, Package
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────
interface Boutique {
  id: string;
  nom: string;
  slug: string;
  description: string;
  logo_url: string;
  banniere_url: string;
  whatsapp: string;
  telephone: string;
  pays: string;
  ville: string;
  devise: string;
  pixel_facebook_id: string;
  pixel_actif: boolean;
}

interface PaiementProduit {
  reseau: string;
  numero: string;
  nom_titulaire: string;
}

interface Produit {
  id: string;
  nom: string;
  description: string;
  prix: number;
  prix_promo: number | null;
  type: string;
  categorie: string;
  stock: number;
  stock_illimite: boolean;
  photos: string[];
  fichier_url: string | null;
  vedette: boolean;
  paiement_reception: boolean;
  paiement_lien: string | null;
  moyens_paiement: PaiementProduit[];
}

// ─── Helpers ──────────────────────────────────────────────
function formatPrix(prix: number, devise: string = "XOF"): string {
  if (devise === "USD") return `$${prix.toFixed(2)}`;
  return Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + devise;
}

function calcPct(prix: number, promo: number): number {
  return Math.round(((prix - promo) / prix) * 100);
}

function genNumeroCommande(): string {
  return `CMD-${Date.now().toString(36).toUpperCase()}`;
}

function fbTrack(boutique: Boutique | null, event: string, params?: any) {
  if (!boutique?.pixel_actif || !boutique?.pixel_facebook_id) return;
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, params);
  }
}

// ─── Composant principal ──────────────────────────────────
export default function VitrinePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();

  const [boutique, setBoutique] = useState<Boutique | null>(null);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [filterCateg, setFilterCateg] = useState("");
  const [filterType, setFilterType] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  const [panier, setPanier] = useState<ShopCartItem[]>([]);
  const [showPanier, setShowPanier] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [commandeSuccess, setCommandeSuccess] = useState(false);
  const [commandeNumero, setCommandeNumero] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [checkoutForm, setCheckoutForm] = useState({
    nom: "", telephone: "", email: "",
    adresse: "", ville: "", pays: "Bénin",
    note: "",
  });

  // ── Chargement
  useEffect(() => {
    initTheme();
    const load = async () => {
      setLoading(true);
      const { data: b, error: boutiqueError } = await supabase
        .from("boutiques" as any)
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      // Accepte si actif est true OU null/undefined (non configuré)
      if (!b || boutiqueError || b.actif === false) { setNotFound(true); setLoading(false); return; }
      setBoutique(b as any);

      const { data: prods } = await supabase
        .from("produits" as any)
        .select("*")
        .eq("boutique_id", (b as any).id)
        .neq("actif", false)
        .order("vedette", { ascending: false });

      const list = (prods as any[] || []).map(p => ({
        ...p,
        moyens_paiement: p.moyens_paiement || [],
      }));
      setProduits(list);

      const cats = [...new Set(list.map((p: any) => p.categorie).filter(Boolean))] as string[];
      setCategories(cats);

      // Pixel Facebook
      if ((b as any).pixel_actif && (b as any).pixel_facebook_id) {
        const script = document.createElement("script");
        script.innerHTML = `
          !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
          n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
          document,'script','https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${(b as any).pixel_facebook_id}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
      }

      setLoading(false);
    };
    if (slug) load();
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    setPanier(readCart(slug));
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    saveCart(slug, panier);
  }, [slug, panier]);

  useEffect(() => {
    const open = searchParams.get("open");
    setShowPanier(open === "cart");
    setShowCheckout(open === "checkout");
  }, [searchParams]);

  // ── Panier
  const totalPanier = panier.reduce((sum, item) => {
    const prix = item.produit.prix_promo || item.produit.prix;
    return sum + prix * item.quantite;
  }, 0);
  const nbArticles = panier.reduce((sum, item) => sum + item.quantite, 0);

  const removeFromCart = (idx: number) => setPanier(prev => prev.filter((_, i) => i !== idx));

  const updateQte = (idx: number, delta: number) => {
    setPanier(prev => {
      const updated = [...prev];
      updated[idx].quantite = Math.max(1, updated[idx].quantite + delta);
      return updated;
    });
  };

  const categoryCounts = useMemo(() => {
    return produits.reduce<Record<string, number>>((acc, produit) => {
      if (!produit.categorie) return acc;
      acc[produit.categorie] = (acc[produit.categorie] || 0) + 1;
      return acc;
    }, {});
  }, [produits]);

  const addProductToCart = (produit: Produit) => {
    if (!slug) return;

    const nextCart = addToCart(slug, {
      produit,
      quantite: 1,
      variations_choisies: {},
    });

    setPanier(nextCart);
    setShowPanier(true);
    setShowCheckout(false);
    setSearchParams({ open: "cart" });

    fbTrack(boutique, "AddToCart", {
      value: produit.prix_promo || produit.prix,
      currency: boutique?.devise,
      content_name: produit.nom,
    });
  };

  // ── Checkout
  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boutique) return;
    if (!checkoutForm.nom || !checkoutForm.telephone || !checkoutForm.adresse || !checkoutForm.ville) {
      alert("Veuillez remplir tous les champs obligatoires"); return;
    }

    setSubmitting(true);
    fbTrack(boutique, "InitiateCheckout", {
      value: totalPanier, currency: boutique.devise, num_items: nbArticles,
    });

    const numero = genNumeroCommande();

    const items = panier.map(item => ({
      produit_id: item.produit.id,
      nom_produit: item.produit.nom,
      categorie: item.produit.categorie || null,
      type: item.produit.type,
      prix_unitaire: item.produit.prix_promo || item.produit.prix,
      quantite: item.quantite,
      montant: (item.produit.prix_promo || item.produit.prix) * item.quantite,
      variations_choisies: item.variations_choisies,
      photo_url: item.produit.photos?.[0] || null,
    }));

    const { data: cmd, error } = await supabase.from("commandes" as any).insert({
      boutique_id: boutique.id,
      numero,
      client_nom: checkoutForm.nom,
      client_tel: checkoutForm.telephone,
      client_email: checkoutForm.email || null,
      client_adresse: checkoutForm.adresse,
      items,
      montant: totalPanier,
      total: totalPanier,
      devise: boutique.devise,
      statut_paiement: "en_attente",
      statut: "nouvelle",
      produit_id: panier.length === 1 ? panier[0].produit.id : null,
    }).select().single();

    if (!error && cmd) {
      const createdCmd = cmd as any;
      for (const item of panier) {
        if (!item.produit.stock_illimite && item.produit.type === "physique") {
          await supabase.from("produits" as any)
            .update({ stock: Math.max(0, item.produit.stock - item.quantite) })
            .eq("id", item.produit.id);
        }
      }

      fbTrack(boutique, "Purchase", {
        value: totalPanier, currency: boutique.devise, num_items: nbArticles,
      });

      setPanier([]);
      if (slug) clearCart(slug);
      setShowCheckout(false);
      setSearchParams({});

      // Redirect to tracking page
      navigate(`/commande/${createdCmd.id}`);
    } else if (error) {
      toast({ title: "Commande impossible", description: error.message, variant: "destructive" });
    }
    setSubmitting(false);
  };

  const filteredProduits = produits.filter(p => {
    const matchSearch = p.nom.toLowerCase().includes(searchQ.toLowerCase());
    const matchCateg = filterCateg ? p.categorie === filterCateg : true;
    const matchType = filterType ? p.type === filterType : true;
    return matchSearch && matchCateg && matchType;
  });

  // ── Page non trouvée
  if (notFound) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center px-4">
        <p className="text-6xl mb-4">🏪</p>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Boutique introuvable</h1>
        <p className="text-gray-500 mt-2">Cette boutique n'existe pas ou n'est plus active.</p>
      </div>
    </div>
  );

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  // ── Commande réussie
  if (commandeSuccess) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-gray-100">Commande envoyée !</h2>
        <p className="text-gray-500 mt-2">
          Votre commande <strong className="text-pink-600">{commandeNumero}</strong> a été reçue.
        </p>
        <p className="text-gray-400 text-sm mt-1">Le vendeur vous contactera bientôt.</p>
        {boutique?.whatsapp && (
          <a href={`https://wa.me/${boutique.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, j'ai passé la commande ${commandeNumero}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-4 flex items-center justify-center gap-2 bg-[#25D366] text-white rounded-xl py-3 font-semibold w-full">
            <MessageCircle className="w-5 h-5" /> Contacter via WhatsApp
          </a>
        )}
        <button onClick={() => setCommandeSuccess(false)}
          className="mt-3 w-full py-3 rounded-xl border border-gray-200 text-gray-600 font-medium">
          Continuer les achats
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">

      {/* ── Header boutique ── */}
      <div className="bg-white border-b border-gray-100 dark:border-gray-700">
        {boutique?.banniere_url && (
          <div className="w-full h-32 overflow-hidden">
            <img src={boutique.banniere_url} alt="" className="w-full h-full object-cover" />
          </div>
        )}
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            {boutique?.logo_url ? (
              <img src={boutique.logo_url} alt={boutique?.nom}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-pink-100 shadow-sm flex-shrink-0" />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-pink-100 flex items-center justify-center flex-shrink-0">
                <span className="text-pink-500 text-2xl font-black">{boutique?.nom?.[0]}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-black text-gray-800 truncate">{boutique?.nom}</h1>
              {boutique?.description && (
                <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{boutique.description}</p>
              )}
              {(boutique?.ville || boutique?.pays) && (
                <p className="text-xs text-gray-400 mt-0.5">
                  📍 {boutique?.ville}{boutique?.ville && boutique?.pays ? ", " : ""}{boutique?.pays}
                </p>
              )}
            </div>
            {boutique?.whatsapp && (
              <a href={`https://wa.me/${boutique.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#25D366] flex items-center justify-center shadow-sm">
                <MessageCircle className="w-5 h-5 text-white" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Barre sticky recherche + panier ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full pl-9 pr-4 h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:border-pink-300 focus:bg-white transition-colors" />
            </div>
            <button onClick={() => setShowPanier(true)}
              className="relative w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <ShoppingCart className="w-5 h-5" />
              {nbArticles > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {nbArticles}
                </span>
              )}
            </button>
          </div>

          {/* Filtres */}
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
                <button onClick={() => { setFilterCateg(""); setFilterType(""); }}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                !filterCateg && !filterType ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>Tout</button>
            <button onClick={() => setFilterType(filterType === "physique" ? "" : "physique")}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === "physique" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 dark:text-gray-300"
              }`}>📦 Physique</button>
            <button onClick={() => setFilterType(filterType === "numerique" ? "" : "numerique")}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterType === "numerique" ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 dark:text-gray-300"
              }`}>💻 Numérique</button>
            {categories.map(cat => (
              <button key={cat} onClick={() => setFilterCateg(filterCateg === cat ? "" : cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filterCateg === cat ? "bg-pink-500 text-white" : "bg-gray-100 text-gray-600 dark:text-gray-300"
                }`}>{cat} ({categoryCounts[cat] || 0})</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Grille produits ── */}
      <div className="max-w-2xl mx-auto px-4 py-4">
        {filteredProduits.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🛍️</p>
            <p className="text-gray-500 font-medium">Aucun produit disponible</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProduits.map(produit => {
              const prix = produit.prix_promo || produit.prix;
              const photo = produit.photos?.[0];
              const enRupture = !produit.stock_illimite && produit.type === "physique" && produit.stock <= 0;
              const pct = produit.prix_promo ? calcPct(produit.prix, produit.prix_promo) : 0;

              return (
                <div key={produit.id}
                  onClick={() => !enRupture && navigate(`/shop/${slug}/produit/${produit.id}`)}
                  className={`bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm transition-transform ${
                    enRupture ? "opacity-60" : "cursor-pointer active:scale-95"
                  }`}>

                  <div className="relative w-full h-40 bg-gray-100 dark:bg-gray-700">
                    {photo ? (
                      <img src={photo} alt={produit.nom} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                    {pct > 0 && (
                      <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full">
                        -{pct}%
                      </div>
                    )}
                    {produit.vedette && (
                      <div className="absolute top-2 right-2 bg-yellow-400 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                      </div>
                    )}
                    <div className={`absolute bottom-2 left-2 text-xs font-medium px-2 py-0.5 rounded-full ${
                      produit.type === "numerique" ? "bg-blue-500 text-white" : "bg-gray-800/70 text-white"
                    }`}>
                      {produit.type === "numerique" ? "💻 Digital" : "📦 Physique"}
                    </div>
                    {enRupture && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-white text-gray-800 text-xs font-bold px-3 py-1 rounded-full">Rupture de stock</span>
                      </div>
                    )}
                  </div>

                  <div className="p-3">
                    <p className="font-semibold text-gray-800 text-sm line-clamp-2">{produit.nom}</p>
                    {produit.categorie && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Tag className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                        <span className="text-xs text-gray-400 dark:text-gray-500">{produit.categorie}</span>
                      </div>
                    )}
                    <div className="mt-1">
                      <span className="font-black text-pink-600 text-sm">{formatPrix(prix, boutique?.devise)}</span>
                      {produit.prix_promo && (
                        <span className="text-xs text-red-400 line-through font-bold ml-1">{formatPrix(produit.prix, boutique?.devise)}</span>
                      )}
                    </div>
                    {!enRupture && (
                      <button
                        onClick={e => { e.stopPropagation(); addProductToCart(produit); }}
                        className="mt-2 w-full py-2 rounded-xl bg-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1 active:bg-pink-600">
                        <ShoppingCart className="w-3 h-3" /> Ajouter
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal Panier ── */}
      {showPanier && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-black text-lg text-gray-800 dark:text-gray-100">Mon panier ({nbArticles})</h2>
              <button onClick={() => { setShowPanier(false); setSearchParams({}); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {panier.length === 0 ? (
                <div className="text-center py-10">
                  <ShoppingCart className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 dark:text-gray-500">Votre panier est vide</p>
                </div>
              ) : (
                panier.map((item, i) => (
                  <div key={i} className="flex gap-3 items-center bg-gray-50 rounded-xl p-3">
                    {item.produit.photos?.[0] && (
                      <img src={item.produit.photos[0]} alt="" className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-800 truncate">{item.produit.nom}</p>
                      {Object.keys(item.variations_choisies).length > 0 && (
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {Object.entries(item.variations_choisies).map(([k, v]) => `${k}: ${v}`).join(", ")}
                        </p>
                      )}
                      <p className="text-sm font-black text-pink-600 mt-0.5">
                        {formatPrix((item.produit.prix_promo || item.produit.prix) * item.quantite, boutique?.devise)}
                      </p>
                    </div>
                    {item.produit.type === "physique" && (
                      <div className="flex items-center gap-1">
                        <button onClick={() => updateQte(i, -1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-sm w-5 text-center">{item.quantite}</span>
                        <button onClick={() => updateQte(i, 1)} className="w-7 h-7 rounded-lg bg-gray-200 flex items-center justify-center">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <button onClick={() => removeFromCart(i)} className="w-7 h-7 rounded-lg bg-red-100 text-red-500 flex items-center justify-center ml-1">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
            {panier.length > 0 && (
              <div className="p-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between font-black text-lg">
                  <span className="text-gray-800 dark:text-gray-100">Total</span>
                  <span className="text-pink-600">{formatPrix(totalPanier, boutique?.devise)}</span>
                </div>
                <button onClick={() => { setShowPanier(false); setShowCheckout(true); setSearchParams({ open: "checkout" }); }}
                  className="w-full py-4 rounded-2xl bg-pink-500 text-white font-black text-base active:bg-pink-600">
                  Commander maintenant
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal Checkout ── */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center">
          <div className="bg-white w-full max-w-lg rounded-t-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-black text-lg text-gray-800 dark:text-gray-100">Finaliser la commande</h2>
              <button onClick={() => { setShowCheckout(false); setSearchParams({}); }} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCheckout} className="p-4 space-y-4">
              <p className="font-semibold text-sm text-pink-600">Vos informations</p>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Nom complet *</label>
                <input value={checkoutForm.nom} onChange={e => setCheckoutForm({ ...checkoutForm, nom: e.target.value })}
                  placeholder="Votre nom" required className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Téléphone *</label>
                <input value={checkoutForm.telephone} onChange={e => setCheckoutForm({ ...checkoutForm, telephone: e.target.value })}
                  placeholder="+229..." required className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Email (optionnel)</label>
                <input type="email" value={checkoutForm.email} onChange={e => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                  placeholder="email@exemple.com" className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Adresse de livraison *</label>
                <input value={checkoutForm.adresse} onChange={e => setCheckoutForm({ ...checkoutForm, adresse: e.target.value })}
                  placeholder="Adresse complète" required className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Ville *</label>
                  <input value={checkoutForm.ville} onChange={e => setCheckoutForm({ ...checkoutForm, ville: e.target.value })}
                    placeholder="Cotonou" required className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Pays</label>
                  <input value={checkoutForm.pays} onChange={e => setCheckoutForm({ ...checkoutForm, pays: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-pink-300" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Note (optionnel)</label>
                <textarea value={checkoutForm.note} onChange={e => setCheckoutForm({ ...checkoutForm, note: e.target.value })}
                  placeholder="Instructions spéciales..."
                  className="mt-1 w-full h-20 px-3 py-2 rounded-xl border border-gray-200 text-sm resize-none focus:outline-none focus:border-pink-300" />
              </div>
              <div className="bg-gray-50 rounded-xl p-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 dark:text-gray-500">
                  <span>{nbArticles} article{nbArticles > 1 ? "s" : ""}</span>
                  <span>{formatPrix(totalPanier, boutique?.devise)}</span>
                </div>
                <div className="flex justify-between font-black text-base border-t border-gray-200 pt-1">
                  <span className="text-gray-800 dark:text-gray-100">Total</span>
                  <span className="text-pink-600">{formatPrix(totalPanier, boutique?.devise)}</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">💡 Le vendeur vous contactera pour confirmer le mode de paiement</p>
              </div>
              <button type="submit" disabled={submitting}
                className="w-full py-4 rounded-2xl bg-pink-500 text-white font-black text-base active:bg-pink-600 disabled:opacity-50">
                {submitting ? "Envoi en cours..." : "Confirmer la commande"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="text-center py-8 px-4 border-t border-gray-100 mt-6">
        {boutique?.telephone && (
          <a href={`tel:${boutique.telephone}`} className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-3 hover:text-gray-700 dark:text-gray-200">
            <Phone className="w-4 h-4" /> {boutique.telephone}
          </a>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Boutique créée avec <span className="text-pink-500 font-semibold">MES SECRETS</span>
        </p>
      </div>
    </div>
  );
}
