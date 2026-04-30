/**
 * NEXORA — ProduitDetailPage (v2 — slug SEO)
 */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Package, ShoppingCart, Tag, Star, Minus, Plus, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast }  from '@/hooks/use-toast';
import { useCart }   from '@/lib/cart-context';
import ProductActionButtons from '@/components/ProductActionButtons';
import SectionAvis from '@/pages/boutique/SectionAvis';
import { formatPrix } from '@/lib/devise-utils';
import { useCampagneTracker } from '@/lib/campagneTracker';
import { isUUID, buildAcheterUrl } from '@/lib/slugUtils';
import VideoAutoplay from '@/components/VideoAutoplay';
import { CountdownDisplay, CountdownConfig } from '@/components/ProductCountdown';

interface Variation { nom: string; valeurs: string[]; }


interface ReseauxSociaux {
  instagram?: string;
  tiktok?: string;
  facebook?: string;
  youtube?: string;
  whatsapp?: string;
  site_web?: string;
}

interface ProduitDetail {
  id: string; boutique_id: string; nom: string; slug: string;
  description: string | null; prix: number; prix_promo: number | null;
  type: string; categorie: string | null; photos: string[] | null;
  stock: number; stock_illimite: boolean; vedette: boolean;
  poids: string | null; dimensions: string | null; sku: string | null;
  politique_remboursement: string | null; politique_confidentialite: string | null;
  paiement_reception: boolean; paiement_lien: string | null;
  moyens_paiement: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
  type_digital: string | null; variations_produit?: Variation[];
  reseaux_sociaux?: ReseauxSociaux | null;
}

interface BoutiqueInfo { id: string; nom: string; slug: string; devise: string; }

// ─── SVG Icons des réseaux sociaux ───────────────────────────────────────────
const InstagramIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <defs>
      <radialGradient id="ig2-grad" cx="30%" cy="107%" r="150%">
        <stop offset="0%" stopColor="#fdf497"/>
        <stop offset="5%" stopColor="#fdf497"/>
        <stop offset="45%" stopColor="#fd5949"/>
        <stop offset="60%" stopColor="#d6249f"/>
        <stop offset="90%" stopColor="#285AEB"/>
      </radialGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5.5" fill="url(#ig2-grad)"/>
    <circle cx="12" cy="12" r="4.5" stroke="white" strokeWidth="1.8" fill="none"/>
    <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
  </svg>
);

const TikTokIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5.5" fill="#010101"/>
    <path d="M17.5 7.5C16.3 7.1 15.4 6.1 15.1 4.8H13V15.6C13 16.7 12.1 17.6 11 17.6C9.9 17.6 9 16.7 9 15.6C9 14.5 9.9 13.6 11 13.6V11.5C8.8 11.5 7 13.3 7 15.6C7 17.9 8.8 19.6 11 19.6C13.2 19.6 15 17.8 15 15.6V10.1C15.9 10.8 17 11.2 18.2 11.2V9.2C17.9 9.2 17.7 9.1 17.5 7.5Z" fill="#69C9D0"/>
    <path d="M17.5 7.5C16.3 7.1 15.4 6.1 15.1 4.8H13V15.6C13 16.7 12.1 17.6 11 17.6C9.9 17.6 9 16.7 9 15.6C9 14.5 9.9 13.6 11 13.6V11.5C8.8 11.5 7 13.3 7 15.6C7 17.9 8.8 19.6 11 19.6C13.2 19.6 15 17.8 15 15.6V10.1C15.9 10.8 17 11.2 18.2 11.2V9.2C17.9 9.2 17.7 9.1 17.5 7.5Z" fill="#EE1D52" fillOpacity="0.6" style={{ mixBlendMode: 'screen' }}/>
  </svg>
);

const FacebookIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5.5" fill="#1877F2"/>
    <path d="M13.2 19.8V13.2H15.3L15.6 10.8H13.2V9.3C13.2 8.6 13.4 8.1 14.4 8.1H15.7V5.9C15.5 5.9 14.7 5.8 13.8 5.8C11.9 5.8 10.6 6.9 10.6 9.1V10.8H8.5V13.2H10.6V19.8H13.2Z" fill="white"/>
  </svg>
);

const YouTubeIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5.5" fill="#FF0000"/>
    <path d="M19.6 8.2C19.4 7.4 18.8 6.8 18 6.6C16.6 6.2 12 6.2 12 6.2C12 6.2 7.4 6.2 6 6.6C5.2 6.8 4.6 7.4 4.4 8.2C4 9.6 4 12 4 12C4 12 4 14.4 4.4 15.8C4.6 16.6 5.2 17.2 6 17.4C7.4 17.8 12 17.8 12 17.8C12 17.8 16.6 17.8 18 17.4C18.8 17.2 19.4 16.6 19.6 15.8C20 14.4 20 12 20 12C20 12 20 9.6 19.6 8.2Z" fill="white"/>
    <path d="M10.2 14.4L14.4 12L10.2 9.6V14.4Z" fill="#FF0000"/>
  </svg>
);

const WhatsAppIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5.5" fill="#25D366"/>
    <path d="M12 4.5C7.9 4.5 4.5 7.9 4.5 12C4.5 13.4 4.9 14.7 5.6 15.8L4.5 19.5L8.3 18.4C9.4 19 10.7 19.4 12 19.4C16.1 19.4 19.5 16 19.5 12C19.5 7.9 16.1 4.5 12 4.5Z" fill="white"/>
    <path d="M9.1 8.5C8.9 8.5 8.6 8.6 8.4 8.8C8.2 9 7.6 9.6 7.6 10.8C7.6 12 8.5 13.2 8.6 13.4C8.7 13.6 10.4 16.2 13 17.2C15.1 18 15.5 17.8 16 17.8C16.5 17.7 17.5 17.1 17.7 16.5C17.9 15.9 17.9 15.4 17.8 15.3C17.7 15.2 17.5 15.1 17.2 15C16.9 14.9 15.7 14.3 15.5 14.2C15.3 14.1 15.1 14.1 14.9 14.3C14.7 14.5 14.2 15.1 14.1 15.3C14 15.5 13.8 15.5 13.6 15.4C13.4 15.3 12.7 15.1 11.8 14.3C11.1 13.6 10.6 12.8 10.5 12.6C10.4 12.4 10.5 12.2 10.6 12.1L11 11.6C11.1 11.5 11.2 11.3 11.3 11.1C11.4 11 11.3 10.8 11.3 10.7C11.2 10.6 10.7 9.4 10.5 8.9C10.3 8.6 10.1 8.5 9.9 8.5H9.1Z" fill="#25D366"/>
  </svg>
);

const WebsiteIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="5.5" fill="#6366F1"/>
    <circle cx="12" cy="12" r="7" stroke="white" strokeWidth="1.5" fill="none"/>
    <path d="M12 5C12 5 9.5 8 9.5 12C9.5 16 12 19 12 19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M12 5C12 5 14.5 8 14.5 12C14.5 16 12 19 12 19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 12H19" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.8 8.5H18.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M5.8 15.5H18.2" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
);

// Config des réseaux pour l'affichage
const RESEAUX_CONFIG = [
  { key: "instagram", label: "Instagram", Icon: InstagramIcon, bg: "bg-gradient-to-br from-[#305CDE] via-[#FF1A00] to-orange-400" },
  { key: "tiktok",    label: "TikTok",    Icon: TikTokIcon,    bg: "bg-black" },
  { key: "facebook",  label: "Facebook",  Icon: FacebookIcon,  bg: "bg-[#1877F2]" },
  { key: "youtube",   label: "YouTube",   Icon: YouTubeIcon,   bg: "bg-[#FF0000]" },
  { key: "whatsapp",  label: "WhatsApp",  Icon: WhatsAppIcon,  bg: "bg-[#25D366]" },
  { key: "site_web",  label: "Site web",  Icon: WebsiteIcon,   bg: "bg-[#6366F1]" },
];

// ─── Composant SectionReseauxSociaux ─────────────────────────────────────────
function SectionReseauxSociaux({ reseaux }: { reseaux: ReseauxSociaux }) {
  const liens = RESEAUX_CONFIG.filter((r) => !!(reseaux as any)[r.key]?.trim());
  if (liens.length === 0) return null;

  return (
    <div className="mx-3 mt-2 bg-white rounded-2xl p-4 shadow-sm">
      <p className="text-sm font-bold text-gray-700 mb-3">Retrouvez le vendeur sur</p>
      <div className="flex flex-wrap gap-2.5">
        {liens.map(({ key, label, Icon, bg }) => {
          const url = (reseaux as any)[key] as string;
          // WhatsApp : numéro → construire le lien wa.me
          const href = key === "whatsapp"
            ? `https://wa.me/${url.replace(/\D/g, "")}`
            : url;

          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-gray-100 active:scale-95 transition-all shadow-sm"
            >
              <Icon size={22} />
              <span className="text-sm font-semibold text-gray-800">{label}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function ProduitDetailPage() {
  const { slug, produitSlug } = useParams<{ slug: string; produitSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setSlug: setCartSlug } = useCart();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit,  setProduit]  = useState<ProduitDetail | null>(null);

  useCampagneTracker(boutique?.id ?? undefined);
  const [loading, setLoading] = useState(true);
  const [selectedImage,    setSelectedImage]    = useState(0);
  const [quantite,         setQuantite]         = useState(1);
  const [selectedVariations, setSelectedVariations] = useState<Record<string, string>>({});

  useEffect(() => { document.documentElement.classList.remove('dark'); }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitSlug) return;
      setLoading(true);

      const { data: boutiqueData } = await (supabase as any)
        .from('boutiques').select('id, nom, slug, devise')
        .eq('slug', slug).or('actif.eq.true,actif.is.null').maybeSingle();

      if (!boutiqueData) { setLoading(false); return; }
      setBoutique(boutiqueData as BoutiqueInfo);
      if (slug) setCartSlug(slug);

      let produitData: any = null;

      if (isUUID(produitSlug)) {
        const { data } = await (supabase as any)
          .from('produits').select('*, variations_produit(*)')
          .eq('id', produitSlug)
          .eq('boutique_id', boutiqueData.id)
          .or('actif.eq.true,actif.is.null').maybeSingle();

        // Rediriger vers slug uniquement s'il est défini en BDD
        if (data?.slug) {
          navigate(`/shop/${slug}/produit/${data.slug}`, { replace: true });
          return;
        }
        produitData = data;
      } else {
        const { data } = await (supabase as any)
          .from('produits').select('*, variations_produit(*)')
          .eq('slug', produitSlug)
          .eq('boutique_id', boutiqueData.id)
          .or('actif.eq.true,actif.is.null').maybeSingle();
        produitData = data;
      }

      if (produitData) {
        setProduit({
          ...(produitData as any),
          moyens_paiement:    (produitData as any).moyens_paiement || [],
          variations_produit: (produitData as any).variations_produit || [],
          photos:             (produitData as any).photos || [],
          reseaux_sociaux:    (produitData as any).reseaux_sociaux || null,
        });
      }
      setLoading(false);
    };
    load();
  }, [slug, produitSlug, navigate]);

  useEffect(() => {
    if (!produit?.variations_produit?.length) return;
    const defaults = produit.variations_produit.reduce<Record<string, string>>((acc, v) => {
      acc[v.nom] = v.valeurs?.[0] || ''; return acc;
    }, {});
    setSelectedVariations(defaults);
  }, [produit]);

  const images     = useMemo(() => produit?.photos?.length ? produit.photos : [], [produit]);
  const prixActuel = produit?.prix_promo ?? produit?.prix ?? 0;
  const enRupture  = !!produit && !produit.stock_illimite && produit.type === 'physique' && produit.stock <= 0;
  const pctPromo   = produit?.prix_promo
    ? Math.round(((produit.prix - produit.prix_promo) / produit.prix) * 100)
    : 0;
  const typeLabel  = produit?.type === 'numerique' ? 'Produit digital'
    : produit?.type === 'service' ? 'Service' : 'Produit physique';

  const handleAcheter = () => {
    if (!produit || !slug) return;
    // Utiliser le slug SEO si disponible, sinon fallback sur l'UUID
    const produitIdentifiant = produit.slug || produit.id;
    navigate(buildAcheterUrl(slug, produitIdentifiant));
  };

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

  if (!produit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-gray-500">
        <Package size={40} className="text-gray-300" />
        <p className="font-semibold">Produit introuvable</p>
        <button
          onClick={() => navigate(`/shop/${slug ?? ''}`)}
          className="px-4 py-2 rounded-xl bg-[#FF1A00] text-white text-sm font-semibold"
        >
          Retour à la boutique
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      {/* En-tête */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-full hover:bg-gray-100 transition">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <h1 className="flex-1 font-bold text-gray-800 truncate">{produit.nom}</h1>
      </div>

      {/* Images + Vidéo */}
      {(images.length > 0 || (produit as any).video_url) && (
        <div className="bg-white">
          {(produit as any).video_url && (
            <div className="relative">
              <VideoAutoplay
                videoUrl={(produit as any).video_url}
                poster={images[0]}
                mode="fiche"
                className="w-full"
                aspectRatio="video"
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-full backdrop-blur-sm">
                🎥 Démonstration
              </div>
            </div>
          )}
          {images.length > 0 && (
            <>
              {!(produit as any).video_url && (
                <img
                  src={images[selectedImage]}
                  alt={produit.nom}
                  className="w-full max-h-80 object-cover"
                />
              )}
              {images.length > 1 && (
                <div className="flex gap-2 p-3 overflow-x-auto">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition ${
                        i === selectedImage ? 'border-rose-500' : 'border-gray-200'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Compte à rebours */}
      {produit.countdown_actif && produit.countdown_fin && (() => {
        const cdConfig: CountdownConfig = {
          countdown_actif: produit.countdown_actif,
          countdown_fin: produit.countdown_fin,
          countdown_titre: produit.countdown_titre ?? null,
          countdown_bg_couleur: produit.countdown_bg_couleur ?? "#ef4444",
          countdown_texte_couleur: produit.countdown_texte_couleur ?? "#ffffff",
          countdown_style: produit.countdown_style ?? "banner",
          countdown_message_fin: produit.countdown_message_fin ?? null,
        };
        return (
          <div className="mx-3 mt-2">
            <CountdownDisplay config={cdConfig} />
          </div>
        );
      })()}

      {/* Infos produit */}
      <div className="p-4 bg-white mt-2 rounded-2xl mx-3 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-xl font-bold text-gray-900 flex-1">{produit.nom}</h2>
          {produit.vedette && (
            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
              <Sparkles size={12} /> Vedette
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-2">
          <span className="text-2xl font-extrabold text-[#FF1A00]">
            {formatPrix(prixActuel, boutique?.devise)}
          </span>
          {produit.prix_promo && (
            <>
              <span className="text-sm text-gray-400 line-through">
                {formatPrix(produit.prix, boutique?.devise)}
              </span>
              <span className="text-xs font-bold text-[#008000] bg-emerald-50 px-2 py-0.5 rounded-full">
                -{pctPromo}%
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 mt-2">
          <Tag size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">{typeLabel}</span>
          {produit.categorie && (
            <span className="text-xs text-gray-400">· {produit.categorie}</span>
          )}
        </div>

        {produit.description && (
          <div
            className="mt-3 text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: produit.description }}
          />
        )}
      </div>

      {/* Variations */}
      {produit.variations_produit && produit.variations_produit.length > 0 && (
        <div className="mx-3 mt-2 bg-white rounded-2xl p-4 shadow-sm">
          {produit.variations_produit.map((variation) => (
            <div key={variation.nom} className="mb-3 last:mb-0">
              <p className="text-sm font-semibold text-gray-700 mb-2">{variation.nom}</p>
              <div className="flex flex-wrap gap-2">
                {variation.valeurs.map((valeur) => (
                  <button
                    key={valeur}
                    onClick={() =>
                      setSelectedVariations((prev) => ({ ...prev, [variation.nom]: valeur }))
                    }
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition ${
                      selectedVariations[variation.nom] === valeur
                        ? 'bg-[#FF1A00] text-white border-rose-500'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-rose-300'
                    }`}
                  >
                    {valeur}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quantité + bouton achat */}
      {produit.type === 'physique' && (
        <div className="mx-3 mt-2 bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-700">Quantité</span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQuantite((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"
            >
              <Minus size={14} />
            </button>
            <span className="font-bold text-lg w-6 text-center">{quantite}</span>
            <button
              onClick={() => setQuantite((q) => q + 1)}
              className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Actions (partage, paiement…) */}
      <div className="mx-3 mt-2">
        <ProductActionButtons
          produit={produit as any}
          boutique={boutique as any}
          quantite={quantite}
          selectedVariations={selectedVariations}
          enRupture={enRupture}
          onAcheter={handleAcheter}
        />
      </div>

      {/* ── Réseaux sociaux du vendeur ── */}
      {produit.reseaux_sociaux && (
        <SectionReseauxSociaux reseaux={produit.reseaux_sociaux} />
      )}

      {/* Avis */}
      <div className="mx-3 mt-2 mb-8">
        <SectionAvis produitId={produit.id} />
      </div>
    </div>
  );
}
