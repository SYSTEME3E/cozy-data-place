import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Star, Tag, Download, Lock, Zap, BookOpen,
  FileText, Key, Package2, Briefcase, Package,
  ExternalLink, Phone, Share2, ArrowLeft
} from "lucide-react";

type TypeDigital = "fichier" | "formation" | "licence" | "bundle" | "service";

const TYPES_DIGITAL: Record<TypeDigital, { label: string; icon: any; color: string }> = {
  fichier:   { label: "Fichier",   icon: FileText,  color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  formation: { label: "Formation", icon: BookOpen,  color: "bg-blue-100 text-blue-700 border-blue-200" },
  licence:   { label: "Licence",   icon: Key,       color: "bg-purple-100 text-purple-700 border-purple-200" },
  bundle:    { label: "Bundle",    icon: Package2,  color: "bg-green-100 text-green-700 border-green-200" },
  service:   { label: "Service",   icon: Briefcase, color: "bg-pink-100 text-pink-700 border-pink-200" },
};

function formatPrix(prix: number, devise: string = "XOF"): string {
  if (devise === "USD") return `$${prix.toFixed(2)}`;
  return Math.round(prix).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + devise;
}

export default function ProductPublicPage() {
  const { slug, produitId } = useParams();
  const [produit, setProduit] = useState<any>(null);
  const [boutique, setBoutique] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: b } = await supabase
        .from("boutiques" as any).select("*")
        .eq("slug", slug).maybeSingle();
      if (!b) { setLoading(false); return; }
      setBoutique(b);

      const { data: p } = await supabase
        .from("produits" as any).select("*, variations_produit(*)")
        .eq("id", produitId).maybeSingle();
      setProduit(p);
      setLoading(false);
    };
    load();
  }, [slug, produitId]);

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!produit || !boutique) return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 text-center px-6">
      <Package className="w-14 h-14 text-gray-300 mb-4" />
      <h2 className="text-xl font-black text-gray-700">Produit introuvable</h2>
      <p className="text-gray-400 text-sm mt-1">Ce lien est invalide ou le produit a été supprimé.</p>
    </div>
  );

  const isDigital = produit.type === "numerique";
  const typeInfo = isDigital ? TYPES_DIGITAL[produit.type_digital as TypeDigital] : null;
  const TypeIcon = typeInfo?.icon || Package;
  const pct = produit.prix_promo ? Math.round(((produit.prix - produit.prix_promo) / produit.prix) * 100) : 0;
  const photos = produit.photos || [];
  const modules = produit.modules || [];
  const tags = produit.tags || [];
  const moyens = produit.moyens_paiement || [];
  const variations = produit.variations_produit || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header boutique */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <a href={`/shop/${slug}`} className="flex items-center gap-2 text-gray-600 hover:text-pink-500 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <div className="w-7 h-7 rounded-lg bg-pink-500 flex items-center justify-center">
              <span className="text-white text-xs font-black">{boutique.nom?.charAt(0)}</span>
            </div>
            <span className="font-bold text-sm truncate max-w-[140px]">{boutique.nom}</span>
          </a>
          <button
            onClick={copyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${copied ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600 hover:bg-pink-50 hover:text-pink-600"}`}
          >
            <Share2 className="w-3.5 h-3.5" />
            {copied ? "Copié !" : "Partager"}
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Photo principale */}
        <div className="w-full rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm">
          {photos[0] ? (
            <img src={photos[0]} alt={produit.nom} className="w-full h-64 object-cover" />
          ) : (
            <div className={`w-full h-48 flex items-center justify-center ${typeInfo?.color || "bg-gray-100"}`}>
              <TypeIcon className="w-16 h-16 opacity-40" />
            </div>
          )}
        </div>

        {/* Photos supplémentaires */}
        {photos.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photos.slice(1).map((url: string, i: number) => (
              <img key={i} src={url} alt="" className="w-20 h-20 object-cover rounded-xl border border-gray-100 flex-shrink-0" />
            ))}
          </div>
        )}

        {/* Infos principales */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                {produit.vedette && <span className="flex items-center gap-1 text-xs bg-yellow-50 text-yellow-600 border border-yellow-200 px-2 py-0.5 rounded-full font-semibold"><Star className="w-3 h-3 fill-yellow-400" /> Vedette</span>}
                {typeInfo && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${typeInfo.color}`}>
                    {typeInfo.label}
                  </span>
                )}
                {!isDigital && produit.categorie && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{produit.categorie}</span>
                )}
              </div>
              <h1 className="text-xl font-black text-gray-800 leading-tight">{produit.nom}</h1>
            </div>
            <div className="text-right flex-shrink-0">
              {produit.prix_promo ? (
                <>
                  <p className="text-2xl font-black text-pink-600">{formatPrix(produit.prix_promo, boutique.devise)}</p>
                  <p className="text-sm text-red-400 line-through font-bold">{formatPrix(produit.prix, boutique.devise)}</p>
                  <span className="inline-block bg-red-500 text-white text-xs font-black px-2 py-0.5 rounded-full mt-0.5">-{pct}%</span>
                </>
              ) : (
                <p className="text-2xl font-black text-pink-600">{formatPrix(produit.prix, boutique.devise)}</p>
              )}
            </div>
          </div>

          {produit.description && (
            <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{produit.description}</p>
          )}

          {tags.length > 0 && (
            <div className="flex gap-1.5 flex-wrap pt-1">
              {tags.map((tag: string, i: number) => (
                <span key={i} className="flex items-center gap-1 text-xs bg-pink-50 text-pink-600 border border-pink-100 px-2 py-0.5 rounded-full">
                  <Tag className="w-3 h-3" /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Variations (physique) */}
        {variations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-800">Options disponibles</h2>
            {variations.map((v: any, i: number) => (
              <div key={i}>
                <p className="text-sm font-semibold text-gray-600 mb-1.5">{v.nom}</p>
                <div className="flex gap-2 flex-wrap">
                  {(v.valeurs || []).map((val: string, j: number) => (
                    <span key={j} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-700 bg-gray-50 font-medium">{val}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stock (physique) */}
        {!isDigital && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
            <Package className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-gray-700">
                {produit.stock_illimite ? "Stock illimité" : produit.stock > 0 ? `${produit.stock} en stock` : "Rupture de stock"}
              </p>
              {produit.sku && <p className="text-xs text-gray-400">SKU : {produit.sku}</p>}
              {produit.poids && <p className="text-xs text-gray-400">Poids : {produit.poids}</p>}
            </div>
          </div>
        )}

        {/* Modules (formation) */}
        {isDigital && modules.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-500" /> Programme ({modules.length} modules)
            </h2>
            <div className="space-y-2">
              {modules.map((m: any, i: number) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-6 h-6 rounded-full bg-pink-500 text-white text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-700">{m.titre}</p>
                    {m.description && <p className="text-xs text-gray-400 mt-0.5">{m.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Options digital */}
        {isDigital && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex gap-3 flex-wrap">
            {produit.protection_antipiratage && (
              <span className="flex items-center gap-1.5 text-xs bg-purple-50 text-purple-700 px-3 py-1.5 rounded-lg font-medium border border-purple-100">
                <Lock className="w-3.5 h-3.5" /> Lien sécurisé
              </span>
            )}
            {produit.livraison_automatique && (
              <span className="flex items-center gap-1.5 text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-lg font-medium border border-green-100">
                <Zap className="w-3.5 h-3.5" /> Livraison instantanée
              </span>
            )}
            {produit.nb_telechargements && (
              <span className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-medium border border-blue-100">
                <Download className="w-3.5 h-3.5" /> Max {produit.nb_telechargements} téléchargements
              </span>
            )}
          </div>
        )}

        {/* Paiement */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="font-bold text-gray-800">Comment acheter ?</h2>

          {produit.paiement_lien && (
            <a href={produit.paiement_lien} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-pink-500 hover:bg-pink-600 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm">
              <ExternalLink className="w-4 h-4" /> Payer maintenant
            </a>
          )}

          {produit.paiement_reception && !isDigital && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
              <span className="text-green-600 text-sm font-medium">✅ Paiement accepté à la livraison</span>
            </div>
          )}

          {moyens.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile Money</p>
              {moyens.map((mp: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-700">{mp.reseau}</p>
                    <p className="text-xs text-gray-500">{mp.nom_titulaire} — <span className="font-mono">{mp.numero}</span></p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Politiques */}
        {(produit.politique_remboursement || produit.politique_confidentialite) && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
            {produit.politique_remboursement && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Politique de remboursement</p>
                <p className="text-sm text-gray-600">{produit.politique_remboursement}</p>
              </div>
            )}
            {produit.politique_confidentialite && (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-1">Confidentialité</p>
                <p className="text-sm text-gray-600">{produit.politique_confidentialite}</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 pb-4">
          Propulsé par <span className="font-bold text-pink-500">Nexora Shop</span>
        </p>
      </div>
    </div>
  );
}
