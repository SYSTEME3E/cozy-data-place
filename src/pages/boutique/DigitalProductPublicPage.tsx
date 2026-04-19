import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrix } from "@/lib/devise-utils";
import SectionAvis from "@/pages/boutique/SectionAvis";
import {
  ArrowLeft, BookOpen, Video, Code2, Palette, File, Key, Zap,
  Tag, Star, Share2, CheckCircle, ExternalLink, Phone,
  ShoppingBag, ChevronDown, ChevronUp, Globe, Hash,
  Wallet, AlertTriangle, Package, Copy, Check,
  Download, Shield, Clock, Infinity
} from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentMethod { reseau: string; numero: string; nom_titulaire: string; instructions?: string; }
interface BoutiqueInfo { id: string; nom: string; slug: string; devise: string; logo?: string; description?: string; }
interface ProduitDigital {
  id: string; boutique_id: string; nom: string; description: string | null;
  prix: number; prix_promo: number | null; type: string; type_digital: string | null;
  categorie: string | null; tags: string[] | null; photos: string[] | null;
  vedette: boolean; paiement_lien: string | null; payment_mode: string | null;
  nexora_paylink_id: string | null; nexora_paylink_url: string | null;
  moyens_paiement: PaymentMethod[]; instructions_achat: string | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: any; label: string; emoji: string; color: string; bgColor: string; features: string[] }> = {
  ebook: {
    icon: BookOpen, label: "Ebook / Document PDF", emoji: "📚",
    color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200",
    features: ["Format PDF", "Accès immédiat", "Compatible tous appareils", "Contenu exclusif"],
  },
  formation: {
    icon: Video, label: "Formation en ligne", emoji: "🎓",
    color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200",
    features: ["Accès à vie", "Support inclus", "Mises à jour gratuites", "Certificat disponible"],
  },
  logiciel: {
    icon: Code2, label: "Logiciel / Application", emoji: "💻",
    color: "text-green-700", bgColor: "bg-green-50 border-green-200",
    features: ["Licence permanente", "Mises à jour incluses", "Support technique", "Installation guidée"],
  },
  template: {
    icon: Palette, label: "Template / Design", emoji: "🎨",
    color: "text-pink-700", bgColor: "bg-pink-50 border-pink-200",
    features: ["Fichiers sources inclus", "Entièrement modifiable", "Utilisation commerciale", "Documentation"],
  },
  fichier: {
    icon: File, label: "Fichier téléchargeable", emoji: "📁",
    color: "text-orange-700", bgColor: "bg-orange-50 border-orange-200",
    features: ["Téléchargement direct", "Haute qualité", "Accès permanent", "Support inclus"],
  },
  licence: {
    icon: Key, label: "Licence numérique", emoji: "🔑",
    color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200",
    features: ["Clé d'activation", "Utilisation légale", "Garantie authenticité", "Support activé"],
  },
  autre: {
    icon: Zap, label: "Produit digital", emoji: "⚡",
    color: "text-gray-700", bgColor: "bg-gray-50 border-gray-200",
    features: ["Produit numérique", "Livraison rapide", "Accès garanti", "Support disponible"],
  },
};

const DEFAULT_CONFIG = TYPE_CONFIG.autre;

// ─── FAQ statique ─────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: "Comment vais-je recevoir mon produit ?", a: "Après confirmation du paiement, le vendeur vous enverra les instructions d'accès via WhatsApp ou email selon les instructions indiquées." },
  { q: "Est-ce que c'est un produit physique ?", a: "Non. Il s'agit d'un produit 100% numérique. Aucun envoi physique n'est effectué." },
  { q: "Puis-je obtenir un remboursement ?", a: "Contactez directement le vendeur pour toute demande de remboursement. Chaque vendeur a sa propre politique." },
  { q: "Le paiement est-il sécurisé ?", a: "Oui, les paiements via Mobile Money (MTN, Moov, Wave, etc.) sont sécurisés par les opérateurs." },
];

// ─── Composant principal ───────────────────────────────────────────────────────
export default function DigitalProductPublicPage() {
  const { slug, produitId } = useParams<{ slug: string; produitId: string }>();
  const navigate = useNavigate();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitDigital | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [copied, setCopied] = useState(false);

  // Force light mode
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitId) return;
      setLoading(true);

      const { data: b } = await supabase
        .from("boutiques" as any).select("id,nom,slug,devise,logo,description")
        .eq("slug", slug).maybeSingle();

      if (!b) { setLoading(false); return; }
      setBoutique(b as unknown as BoutiqueInfo);

      const { data: p } = await supabase
        .from("produits" as any).select("*")
        .eq("id", produitId).eq("boutique_id", (b as any).id)
        .eq("type", "numerique").maybeSingle();

      if (p) {
        setProduit({
          ...(p as any),
          moyens_paiement: (p as any).moyens_paiement || [],
          tags: (p as any).tags || [],
          photos: (p as any).photos || [],
          nexora_paylink_id: (p as any).nexora_paylink_id || null,
          nexora_paylink_url: (p as any).nexora_paylink_url || null,
        });
        // Track vue
        await supabase.from("produits" as any)
          .update({ vues: ((p as any).vues || 0) + 1 })
          .eq("id", produitId);
      }
      setLoading(false);
    };
    load();
  }, [slug, produitId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!produit || !boutique) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700">Produit introuvable</h2>
          <p className="text-gray-500 mt-2">Ce produit n'est plus disponible.</p>
          <button onClick={() => navigate(slug ? `/shop/${slug}` : "/")}
            className="mt-4 flex items-center gap-2 text-purple-600 font-semibold mx-auto">
            <ArrowLeft className="w-4 h-4" /> Retour à la boutique
          </button>
        </div>
      </div>
    );
  }

  const typeConfig = TYPE_CONFIG[produit.type_digital || "autre"] || DEFAULT_CONFIG;
  const TypeIcon = typeConfig.icon;
  const photos = produit.photos || [];
  const prixActuel = produit.prix_promo || produit.prix;
  const pct = produit.prix_promo ? Math.round(((produit.prix - produit.prix_promo) / produit.prix) * 100) : 0;
  const paymentUrl = produit.nexora_paylink_url || null;
  const hasPayment = paymentUrl || (produit.moyens_paiement?.length > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar minimal ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(`/shop/${slug}`)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-purple-600 transition-colors">
            <ArrowLeft className="w-4 h-4" /> {boutique.nom}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
              {copied ? "Copié !" : "Partager"}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">

          {/* ── Colonne gauche ── */}
          <div className="space-y-6">
            {/* Image principale */}
            <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
              {photos.length > 0 ? (
                <div>
                  <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 relative overflow-hidden">
                    <img src={photos[selectedImage]} alt={produit.nom} className="w-full h-full object-cover" />
                    {pct > 0 && (
                      <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow">
                        -{pct}% PROMO
                      </div>
                    )}
                  </div>
                  {photos.length > 1 && (
                    <div className="grid grid-cols-5 gap-2 p-3">
                      {photos.map((img, i) => (
                        <button key={i} onClick={() => setSelectedImage(i)}
                          className={`rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? "border-purple-500 scale-95" : "border-gray-200"}`}>
                          <img src={img} alt="" className="w-full aspect-square object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center relative">
                  <div className="text-center">
                    <span className="text-7xl">{typeConfig.emoji}</span>
                    <p className="text-purple-400 font-medium mt-2">{typeConfig.label}</p>
                  </div>
                  {pct > 0 && (
                    <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-black px-3 py-1.5 rounded-xl shadow">
                      -{pct}% PROMO
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Description */}
            {produit.description && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <style>{`
                  .nexora-description { font-family: 'DM Sans', -apple-system, sans-serif; color: #1f2937; line-height: 1.8; }
                  .nexora-description h1 { font-size: 1.5rem; font-weight: 900; margin: 1.5rem 0 0.75rem; color: #111827; }
                  .nexora-description h2 { font-size: 1.2rem; font-weight: 800; margin: 1.25rem 0 0.6rem; color: #1f2937; }
                  .nexora-description h3 { font-size: 1rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #374151; }
                  .nexora-description p  { margin: 0.75rem 0; font-size: 0.9rem; }
                  .nexora-description ul, .nexora-description ol { margin: 0.75rem 0 0.75rem 1.5rem; font-size: 0.9rem; }
                  .nexora-description li { margin: 0.35rem 0; }
                  .nexora-description hr { border: none; border-top: 2px solid #f3f4f6; margin: 1.5rem 0; }
                  .nexora-description img { display: block; max-width: 100%; height: auto; margin: 1.25rem auto; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,0.10); }
                  .nexora-description strong { font-weight: 700; }
                `}</style>
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full" />
                  Description
                </h2>
                <div
                  className="nexora-description"
                  dangerouslySetInnerHTML={{ __html: produit.description }}
                />
              </div>
            )}

            {/* Ce que vous recevez */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-purple-500 to-indigo-500 rounded-full" />
                Ce que vous recevez
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {typeConfig.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{feat}</p>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-green-50">
                  <div className="w-7 h-7 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
                    <Infinity className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Stock illimité</p>
                </div>
              </div>
            </div>

            {/* Instructions après achat */}
            {produit.instructions_achat && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-green-400 to-emerald-500 rounded-full" />
                  Après votre achat
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-green-800 leading-relaxed whitespace-pre-line">{produit.instructions_achat}</p>
                </div>
              </div>
            )}

            {/* FAQ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full" />
                Questions fréquentes
              </h2>
              <div className="space-y-2">
                {FAQ_ITEMS.map((item, i) => (
                  <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                    <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors">
                      <p className="text-sm font-semibold text-gray-800 pr-4">{item.q}</p>
                      {openFaq === i ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>
                    {openFaq === i && (
                      <div className="px-4 pb-4">
                        <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Section avis */}
            <SectionAvis produitId={produit.id} nomItem={produit.nom} />
          </div>

          {/* ── Colonne droite (sticky) ── */}
          <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">

            {/* Card 1 — Identité produit (badge + nom + catégorie) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-3">
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold border ${typeConfig.bgColor} ${typeConfig.color}`}>
                <TypeIcon className="w-4 h-4" />
                {typeConfig.label}
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 leading-tight">{produit.nom}</h1>
                {produit.categorie && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Tag className="w-3.5 h-3.5 text-gray-400" />
                    <p className="text-sm text-gray-500">{produit.categorie}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2 — Prix */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Prix</p>
              <div className="flex items-end gap-3">
                <span className="text-4xl font-black text-gray-900">{formatPrix(prixActuel, boutique.devise)}</span>
                {produit.prix_promo && (
                  <p className="text-lg font-bold text-gray-400 line-through pb-1">{formatPrix(produit.prix, boutique.devise)}</p>
                )}
              </div>
              {pct > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-red-500 text-white text-sm font-black px-3 py-1 rounded-full">-{pct}% 🔥</span>
                  <span className="text-sm text-green-600 font-semibold">Économisez {formatPrix(produit.prix - (produit.prix_promo || 0), boutique.devise)}</span>
                </div>
              )}
            </div>

            {/* Card 3 — CTA + avantages */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-5 space-y-4">
              {/* Avantages rapides */}
              <div className="space-y-2">
                {[
                  { icon: Infinity, text: "Stock illimité — disponible maintenant", color: "text-purple-500" },
                  { icon: Shield, text: "Paiement sécurisé Mobile Money", color: "text-green-500" },
                  { icon: Clock, text: "Livraison rapide après paiement", color: "text-blue-500" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                    <p className="text-xs text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* CTA principal */}
              {hasPayment ? (
                <div className="space-y-3">
                  <button onClick={() => setShowPayment(!showPayment)}
                    className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-lg shadow-lg shadow-purple-200 hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2">
                    <ShoppingBag className="w-5 h-5" />
                    Acheter maintenant
                  </button>

                  {showPayment && (
                    <div className="space-y-3 pt-2">
                      <p className="text-sm font-bold text-gray-700 text-center">— Choisissez votre mode de paiement —</p>

                      {/* NEXORA Pay */}
                      {paymentUrl && (
                        <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 rounded-2xl border-2 border-violet-200 bg-violet-50 hover:bg-violet-100 transition-colors">
                          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0">
                            <Zap className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-violet-800">
                              Payer via NEXORA Pay ⚡
                            </p>
                            <p className="text-xs text-violet-600">Redirection vers la page de paiement</p>
                          </div>
                        </a>
                      )}

                      {/* Mobile money */}
                      {(produit.moyens_paiement || []).map((mp, i) => (
                        <div key={i} className="p-4 rounded-2xl border-2 border-orange-200 bg-orange-50 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center flex-shrink-0">
                              <Phone className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-orange-800">{mp.reseau}</p>
                              <p className="text-xs text-orange-600">Paiement Mobile Money</p>
                            </div>
                          </div>
                          <div className="bg-white rounded-xl p-3 space-y-1.5">
                            <div className="flex justify-between items-center">
                              <p className="text-xs text-gray-500">Numéro</p>
                              <p className="text-sm font-black text-gray-800">{mp.numero}</p>
                            </div>
                            {mp.nom_titulaire && (
                              <div className="flex justify-between items-center">
                                <p className="text-xs text-gray-500">Bénéficiaire</p>
                                <p className="text-sm font-semibold text-gray-700">{mp.nom_titulaire}</p>
                              </div>
                            )}
                            <div className="flex justify-between items-center border-t border-gray-100 pt-1.5">
                              <p className="text-xs text-gray-500">Montant</p>
                              <p className="text-sm font-black text-green-600">{formatPrix(prixActuel, boutique.devise)}</p>
                            </div>
                          </div>
                          {mp.instructions && (
                            <p className="text-xs text-orange-700 bg-orange-100 rounded-xl p-2 leading-relaxed">
                              💬 {mp.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-2xl text-center">
                  <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Paiement non configuré par le vendeur</p>
                </div>
              )}
            </div>

            {/* Vendeur */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Vendu par</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {boutique.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{boutique.nom}</p>
                  {boutique.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{boutique.description}</p>}
                </div>
              </div>
              <button onClick={() => navigate(`/shop/${slug}`)}
                className="mt-3 w-full text-center text-xs text-purple-600 font-semibold hover:text-purple-700 transition-colors">
                Voir tous les produits →
              </button>
            </div>

            {/* Tags */}
            {produit.tags && produit.tags.length > 0 && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
                <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Mots-clés</p>
                <div className="flex flex-wrap gap-2">
                  {produit.tags.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full">
                      <Hash className="w-3 h-3" />{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Sécurité */}
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl p-5 space-y-3">
              <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Achats sécurisés</p>
              {[
                { icon: Shield, text: "Paiements via opérateurs certifiés", color: "text-green-500" },
                { icon: Globe, text: "Vendeur vérifié sur NEXORA", color: "text-blue-500" },
                { icon: CheckCircle, text: "Support disponible après achat", color: "text-purple-500" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                  <p className="text-xs text-gray-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
