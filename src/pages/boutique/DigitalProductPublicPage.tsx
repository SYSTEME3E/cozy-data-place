import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatPrix } from "@/lib/devise-utils";
import SectionAvis from "@/pages/boutique/SectionAvis";
import { isUUID } from "@/lib/slugUtils";
import {
  ArrowLeft, BookOpen, Video, Code2, Palette, File, Key, Zap,
  Tag, Star, Share2, CheckCircle, Globe, Hash,
  Wallet, AlertTriangle, Package, Check,
  Shield, Clock, Infinity as InfinityIcon
} from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────
interface PaymentMethod { reseau: string; numero: string; nom_titulaire: string; instructions?: string; }
interface BoutiqueInfo { id: string; nom: string; slug: string; devise: string; logo?: string; description?: string; user_id: string; }
interface ProduitDigital {
  id: string; boutique_id: string; nom: string; description: string | null;
  prix: number; prix_promo: number | null; type: string; type_digital: string | null;
  categorie: string | null; tags: string[] | null; photos: string[] | null;
  vedette: boolean; paiement_lien: string | null; payment_mode: string | null;
  nexora_paylink_id: string | null; nexora_paylink_url: string | null;
  nexora_redirect_url: string | null; fichier_url: string | null;
  moyens_paiement: PaymentMethod[]; instructions_achat: string | null;
  bouton_texte: string | null;
  bouton_couleur: string | null;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: any; label: string; emoji: string; color: string; bgColor: string; features: string[] }> = {
  ebook: {
    icon: BookOpen, label: "Ebook / Document PDF", emoji: "📚",
    color: "text-[#305CDE]", bgColor: "bg-blue-50 border-blue-200",
    features: ["Format PDF", "Accès immédiat", "Compatible tous appareils", "Contenu exclusif"],
  },
  formation: {
    icon: Video, label: "Formation en ligne", emoji: "🎓",
    color: "text-[#305CDE]", bgColor: "bg-[#305CDE]/5 border-[#305CDE]",
    features: ["Accès à vie", "Support inclus", "Mises à jour gratuites", "Certificat disponible"],
  },
  logiciel: {
    icon: Code2, label: "Logiciel / Application", emoji: "💻",
    color: "text-[#008000]", bgColor: "bg-green-50 border-green-200",
    features: ["Licence permanente", "Mises à jour incluses", "Support technique", "Installation guidée"],
  },
  template: {
    icon: Palette, label: "Template / Design", emoji: "🎨",
    color: "text-[#FF1A00]", bgColor: "bg-[#FF1A00]/5 border-[#FF1A00]",
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
  const { slug, produitId: produitSlug } = useParams<{ slug: string; produitId: string }>();
  const navigate = useNavigate();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitDigital | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Force light mode
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitSlug) return;
      setLoading(true);

      const { data: b } = await supabase
        .from("boutiques" as any).select("id,nom,slug,devise,logo,description,user_id")
        .eq("slug", slug).maybeSingle();

      if (!b) { setLoading(false); return; }
      setBoutique(b as unknown as BoutiqueInfo);

      const baseQuery = () => supabase
        .from("produits" as any).select("*")
        .eq("boutique_id", (b as any).id)
        .eq("type", "numerique");

      let p: any = null;

      if (isUUID(produitSlug)) {
        // Recherche directe par UUID → fiable même si slug est null en BDD
        const { data } = await baseQuery().eq("id", produitSlug).maybeSingle();
        p = data;
        // Rediriger vers slug uniquement si le slug BDD est défini ET non-null
        if (p && (p as any).slug) {
          navigate(`/shop/${slug}/digital/${(p as any).slug}`, { replace: true });
          return;
        }
      } else {
        // Recherche par slug SEO
        const { data } = await baseQuery().eq("slug", produitSlug).maybeSingle();
        p = data;
      }

      if (p) {
        setProduit({
          ...(p as any),
          moyens_paiement: (p as any).moyens_paiement || [],
          tags: (p as any).tags || [],
          photos: (p as any).photos || [],
          nexora_paylink_id: (p as any).nexora_paylink_id || null,
          nexora_paylink_url: (p as any).nexora_paylink_url || null,
          nexora_redirect_url: (p as any).nexora_redirect_url || null,
          fichier_url: (p as any).fichier_url || null,
          bouton_texte: (p as any).bouton_texte || "Payer maintenant",
          bouton_couleur: (p as any).bouton_couleur || "#7c3aed",
        });
        // Track vue
        await supabase.from("produits" as any)
          .update({ vues: ((p as any).vues || 0) + 1 })
          .eq("id", (p as any).id);
      }
      setLoading(false);
    };
    load();
  }, [slug, produitSlug]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#305CDE] to-[#305CDE]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#305CDE] border-t-transparent animate-spin mx-auto mb-3" />
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
            className="mt-4 flex items-center gap-2 text-[#305CDE] font-semibold mx-auto">
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
  const lienFichier = produit.nexora_redirect_url || produit.fichier_url || null;
  // Toujours KKiaPay — bouton personnalisé par le vendeur
  const boutonTexte = produit.bouton_texte || "Payer maintenant";
  const boutonCouleur = produit.bouton_couleur || "#7c3aed";

  const [paying, setPaying]               = useState(false);
  const [payError, setPayError]           = useState<string | null>(null);


  // ── Timer expiration 10 min ──
  const [timeLeft, setTimeLeft]           = useState<number>(600);
  const [paymentExpired, setPaymentExpired] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const deadline = Date.now() + 10 * 60 * 1000;
    timerRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(timerRef.current!);
        setPaymentExpired(true);
      }
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);
  const [buyerNom, setBuyerNom]           = useState("");
  const [buyerTel, setBuyerTel]           = useState("");

  // ── Paiement NEXORA (acheteur public, sans compte NEXORA requis) ──────────
  const handleNexoraPay = async () => {
    if (paying) return;
    setPayError(null);
    if (!buyerNom.trim()) { setPayError("Veuillez entrer votre nom complet."); return; }
    if (!buyerTel.trim()) { setPayError("Veuillez entrer votre numéro de téléphone."); return; }

    setPaying(true);
    try {
      // 1. Créer la commande (statut: en_attente)
      const cmdNumero = `DIG-${Date.now().toString().slice(-8)}`;
      const { data: cmd, error: cmdErr } = await supabase
        .from("commandes" as any)
        .insert({
          boutique_id:      boutique.id,
          client_nom:       buyerNom.trim(),
          client_telephone: buyerTel.trim(),
          numero:           cmdNumero,
          total:            prixActuel,
          montant:          prixActuel,
          devise:           boutique.devise || "XOF",
          statut:           "nouvelle",
          statut_paiement:  "en_attente",
          produit_id:       produit.id,
          items: [{
            produit_id:          produit.id,
            nom_produit:         produit.nom,
            prix_unitaire:       prixActuel,
            quantite:            1,
            montant:             prixActuel,
            photo_url:           (produit.photos || [])[0] || null,
            variations_choisies: {},
            type:                "numerique",
          }],
        })
        .select()
        .single();

      if (cmdErr) throw new Error(cmdErr.message);

      // 2. Ouvrir le widget KKiaPay
      const { openKkiapay, onKkiapaySuccess, onKkiapayFailed, removeKkiapayListeners } = await import("@/lib/kkiapay");

      await removeKkiapayListeners();

      await onKkiapaySuccess(async ({ transactionId }) => {
        await removeKkiapayListeners();
        // Sauvegarder le transactionId KKiaPay dans la commande
        await supabase.from("commandes" as any)
          .update({ kkiapay_id: transactionId })
          .eq("id", cmd?.id);
        // Vérifier et créditer le vendeur via Edge Function
        await supabase.functions.invoke("kkiapay-verify", {
          body: {
            transactionId,
            type:           "vente_digitale",
            commande_id:    cmd?.id ?? "",
            produit_id:     produit.id,
            boutique_id:    boutique.id,
            seller_user_id: boutique.user_id,
            lien_produit:   lienFichier ?? "",
          },
        });
        window.location.href = `/boutique/digital-callback?transactionId=${transactionId}&commande_id=${cmd?.id}`;
      });

      await onKkiapayFailed(() => {
        removeKkiapayListeners();
        throw new Error("Le paiement a échoué. Veuillez réessayer.");
      });

      await openKkiapay({
        amount: prixActuel,
        name:   buyerNom.trim(),
        phone:  buyerTel.trim(),
        reason: `Achat : ${produit.nom}`,
        data:   JSON.stringify({
          type_transaction: "vente_digitale",
          commande_id:      cmd?.id ?? "",
          produit_id:       produit.id,
          boutique_id:      boutique.id,
          boutique_slug:    boutique.slug,
          seller_user_id:   boutique.user_id,
        }),
      });

      // 4. Backup localStorage pour le callback
      try {
        localStorage.setItem("nexora_digital_callback", JSON.stringify({
          commande_id:    cmd?.id,
          lien_produit:   lienFichier,
          boutique_slug:  boutique.slug,
          seller_user_id: boutique.user_id,
          montant:        prixActuel,
        }));
      } catch (_) {}

      // 5. Le widget KKiaPay est maintenant ouvert (géré par les listeners ci-dessus)
    } catch (e: any) {
      setPayError(e.message || "Erreur lors du paiement. Réessayez.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Navbar minimal ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate(`/shop/${slug}`)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-[#305CDE] transition-colors">
            <ArrowLeft className="w-4 h-4" /> {boutique.nom}
          </button>
          <div className="flex items-center gap-2">
            <button onClick={copyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 transition-colors">
              {copied ? <Check className="w-3.5 h-3.5 text-[#008000]" /> : <Share2 className="w-3.5 h-3.5" />}
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
                  <div className="aspect-video bg-gradient-to-br from-[#305CDE] to-[#305CDE] relative overflow-hidden">
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
                          className={`rounded-xl overflow-hidden border-2 transition-all ${selectedImage === i ? "border-[#305CDE] scale-95" : "border-gray-200"}`}>
                          <img src={img} alt="" className="w-full aspect-square object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="aspect-video bg-gradient-to-br from-[#305CDE] to-[#305CDE] flex items-center justify-center relative">
                  <div className="text-center">
                    <span className="text-7xl">{typeConfig.emoji}</span>
                    <p className="text-[#305CDE] font-medium mt-2">{typeConfig.label}</p>
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
                  <span className="w-1 h-5 bg-gradient-to-b from-[#305CDE] to-[#305CDE] rounded-full" />
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
                <span className="w-1 h-5 bg-gradient-to-b from-[#305CDE] to-[#305CDE] rounded-full" />
                Ce que vous recevez
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {typeConfig.features.map((feat, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-3 rounded-2xl bg-gray-50">
                    <div className="w-7 h-7 rounded-xl bg-gradient-to-br from-[#305CDE] to-[#305CDE] flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-sm font-medium text-gray-700">{feat}</p>
                  </div>
                ))}
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-green-50">
                  <div className="w-7 h-7 rounded-xl bg-[#008000] flex items-center justify-center flex-shrink-0">
                    <InfinityIcon className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-700">Stock illimité</p>
                </div>
              </div>
            </div>

            {/* Instructions après achat */}
            {produit.instructions_achat && (
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-1 h-5 bg-gradient-to-b from-[#008000] to-[#305CDE] rounded-full" />
                  Après votre achat
                </h2>
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <p className="text-sm text-[#008000] leading-relaxed whitespace-pre-line">{produit.instructions_achat}</p>
                </div>
              </div>
            )}

            {/* FAQ */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-1 h-5 bg-gradient-to-b from-blue-400 to-[#305CDE] rounded-full" />
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
                  <span className="text-sm text-[#008000] font-semibold">Économisez {formatPrix(produit.prix - (produit.prix_promo || 0), boutique.devise)}</span>
                </div>
              )}
            </div>

            {/* Card 3 — CTA KKiaPay unique (bouton personnalisé par le vendeur) */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-md p-5 space-y-4">

              {/* ── Timer / Expiration ── */}
              {paymentExpired ? (
                <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-700 text-sm">Session expirée</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Ce paiement a expiré après 10 minutes. Rechargez la page pour recommencer.
                    </p>
                    <button
                      onClick={() => window.location.reload()}
                      className="mt-2 text-xs font-bold text-red-700 underline"
                    >
                      ↺ Recharger la page
                    </button>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 border ${
                  timeLeft <= 60 ? "bg-red-50 border-red-200"
                  : timeLeft <= 180 ? "bg-amber-50 border-amber-200"
                  : "bg-gray-50 border-gray-200"
                }`}>
                  <Clock className={`w-4 h-4 flex-shrink-0 ${
                    timeLeft <= 60 ? "text-red-500" : timeLeft <= 180 ? "text-amber-500" : "text-gray-400"
                  }`} />
                  <p className={`text-xs font-semibold ${
                    timeLeft <= 60 ? "text-red-600" : timeLeft <= 180 ? "text-amber-600" : "text-gray-500"
                  }`}>
                    Session expire dans{" "}
                    <span className="font-black tabular-nums">
                      {String(Math.floor(timeLeft / 60)).padStart(2, "0")}:{String(timeLeft % 60).padStart(2, "0")}
                    </span>
                    {timeLeft <= 60 && " — Dépêchez-vous !"}
                  </p>
                </div>
              )}

              {/* Avantages rapides */}
              <div className="space-y-2">
                {[
                  { icon: InfinityIcon, text: "Stock illimité — disponible maintenant", color: "text-[#305CDE]" },
                  { icon: Shield,       text: "Paiement sécurisé via KKiaPay",          color: "text-[#008000]" },
                  { icon: Zap,          text: "Accès immédiat après paiement réussi",   color: "text-[#305CDE]" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                    <p className="text-xs text-gray-600">{item.text}</p>
                  </div>
                ))}
              </div>

              {/* Formulaire acheteur */}
              <div className="space-y-2.5 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Vos informations</p>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom complet *</label>
                  <input
                    type="text"
                    value={buyerNom}
                    onChange={e => setBuyerNom(e.target.value)}
                    placeholder="Ex: Jean Dupont"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                    style={{ ["--tw-ring-color" as any]: boutonCouleur }}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Téléphone (Mobile Money) *</label>
                  <input
                    type="tel"
                    value={buyerTel}
                    onChange={e => setBuyerTel(e.target.value)}
                    placeholder="Ex: +229 97 00 00 00"
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition"
                  />
                </div>
              </div>

              {/* Message d'erreur */}
              {payError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700 font-medium">{payError}</p>
                </div>
              )}

              {/* Bouton Mobile Money (KKiaPay) */}
              <button
                onClick={handleNexoraPay}
                disabled={paying || paymentExpired}
                className="w-full h-14 rounded-2xl disabled:opacity-70 disabled:cursor-not-allowed text-white font-black text-base shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: boutonCouleur,
                  boxShadow: `0 8px 24px ${boutonCouleur}40`,
                }}
              >
                {paying
                  ? <><span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Redirection…</>
                  : <><Zap className="w-5 h-5" /> {boutonTexte} — {formatPrix(prixActuel, boutique.devise)}</>}
              </button>



              {/* Badge sécurité */}
              <div className="flex items-center justify-center gap-2 text-xs font-semibold" style={{ color: boutonCouleur }}>
                <Shield className="w-3.5 h-3.5" />
                Paiement sécurisé — KKiaPay
              </div>
            </div>

            {/* Vendeur */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">Vendu par</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#305CDE] to-[#305CDE] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                  {boutique.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{boutique.nom}</p>
                  {boutique.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{boutique.description}</p>}
                </div>
              </div>
              <button onClick={() => navigate(`/shop/${slug}`)}
                className="mt-3 w-full text-center text-xs text-[#305CDE] font-semibold hover:text-[#305CDE] transition-colors">
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
                { icon: Shield, text: "Paiements via KKiaPay certifié", color: "text-[#008000]" },
                { icon: Globe, text: "Vendeur vérifié sur NEXORA", color: "text-[#305CDE]" },
                { icon: CheckCircle, text: "Support disponible après achat", color: "text-[#305CDE]" },
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
