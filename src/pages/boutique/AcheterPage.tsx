import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, CheckCircle2, CreditCard, ExternalLink,
  MessageCircle, Package, Phone, Truck
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { initTheme } from "@/lib/theme";


interface ProduitInfo {
  id: string;
  nom: string;
  prix: number;
  prix_promo: number | null;
  photos: string[];
  paiement_lien: string | null;
  paiement_reception: boolean;
  moyens_paiement: Array<{ reseau: string; numero: string; nom_titulaire: string }>;
  type: string;
}

interface BoutiqueInfo {
  id: string;
  nom: string;
  slug: string;
  devise: string;
  whatsapp?: string;
  telephone?: string;
}

interface CommandeCreee {
  id: string;
  numero: string;
  trackingUrl: string;
}

import { formatPrix } from "@/lib/devise-utils";

type Etape = "recap" | "paiement" | "confirmation";

export default function AcheterPage() {
  const { slug, produitId } = useParams<{ slug: string; produitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const qte = parseInt(searchParams.get("qte") || "1", 10);

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [etape, setEtape] = useState<Etape>("recap");
  const [commande, setCommande] = useState<CommandeCreee | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [acheteurNom, setAcheteurNom] = useState("");
  const [acheteurTel, setAcheteurTel] = useState("");

  useEffect(() => { initTheme(); }, []);

  useEffect(() => {
    const load = async () => {
      if (!slug || !produitId) return;
      setLoading(true);
      const { data: b } = await supabase
        .from("boutiques" as any).select("id,nom,slug,devise,whatsapp,telephone")
        .eq("slug", slug).eq("actif", true).maybeSingle();
      if (!b) { setLoading(false); return; }
      setBoutique(b as unknown as BoutiqueInfo);

      const { data: p } = await supabase
        .from("produits" as any)
        .select("id,nom,prix,prix_promo,photos,paiement_lien,paiement_reception,moyens_paiement,type")
        .eq("id", produitId).eq("boutique_id", (b as any).id).eq("actif", true).maybeSingle();

      if (p) {
        setProduit({
          ...(p as any),
          photos: (p as any).photos || [],
          moyens_paiement: (p as any).moyens_paiement || [],
        });
      }
      setLoading(false);
    };
    load();
  }, [slug, produitId]);

  // ── Si pas de lien de paiement → rediriger vers détail ──
  useEffect(() => {
    if (!loading && produit && !produit.paiement_lien && !produit.paiement_reception && produit.moyens_paiement.length === 0) {
      toast({ title: "Paiement non configuré", description: "Le vendeur n'a pas encore configuré le paiement.", variant: "destructive" });
      navigate(`/shop/${slug}/produit/${produitId}`);
    }
  }, [loading, produit]);

  const handleJAiPaye = async () => {
    if (!produit || !boutique) return;
    setEnregistrement(true);

    const ref = `NX-${Date.now().toString(36).toUpperCase()}`;
    const items = [{
      produit_id: produit.id,
      nom: produit.nom,
      prix: prixUnit,
      quantite: qte,
      montant: total,
      type: produit.type,
      paiement_lien: produit.paiement_lien,
    }];

    const { data, error } = await (supabase as any).from("commandes").insert({
      boutique_id: boutique.id,
      produit_id: produit.id,
      items,
      total,
      montant: total,
      devise: boutique.devise || "XOF",
      statut: "en_attente",
      statut_paiement: produit.paiement_lien || produit.moyens_paiement.length > 0 ? "en_attente" : "paye",
      numero: ref,
      client_nom: acheteurNom || "Client",
      client_tel: acheteurTel || null,
      client_email: null,
      client_adresse: null,
    }).select().maybeSingle();

    if (error || !data) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la commande.", variant: "destructive" });
      setEnregistrement(false);
      return;
    }

    setCommande({
      id: (data as any).id,
      numero: (data as any).numero || ref,
      trackingUrl: `${window.location.origin}/commande/${(data as any).id}`,
    });
    setEtape("confirmation");
    setEnregistrement(false);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0f1e]">
      <div className="w-10 h-10 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!produit || !boutique) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0a0f1e] p-8">
      <div className="text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">Produit introuvable</h2>
        <button onClick={() => navigate(slug ? `/shop/${slug}` : "/")}
          className="mt-4 flex items-center gap-2 text-pink-600 font-semibold mx-auto">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </div>
  );

  const prixUnit = produit.prix_promo || produit.prix;
  const total = prixUnit * qte;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 dark:bg-[#0a0f1e]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/shop/${slug}/produit/${produitId}`)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 shadow-sm hover:border-pink-300 transition-all">
            <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{boutique.nom}</p>
            <h1 className="text-lg font-black text-gray-900 dark:text-white">
              {etape === "recap" ? "Récapitulatif" : etape === "paiement" ? "Paiement" : "Commande confirmée"}
            </h1>
          </div>
        </div>

        {/* Étapes */}
        <div className="flex items-center gap-2 mb-6">
          {(["recap", "paiement", "confirmation"] as Etape[]).map((e, i) => (
            <div key={e} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                etape === e ? "bg-pink-500 text-white shadow-lg shadow-pink-300"
                : i < ["recap","paiement","confirmation"].indexOf(etape) ? "bg-green-500 text-white"
                : "bg-gray-200 dark:bg-white/10 text-gray-500 dark:text-gray-400 dark:text-gray-500"
              }`}>
                {i < ["recap","paiement","confirmation"].indexOf(etape) ? "✓" : i + 1}
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 rounded transition-all ${
                i < ["recap","paiement","confirmation"].indexOf(etape) ? "bg-green-500" : "bg-gray-200 dark:bg-white/10"
              }`} />}
            </div>
          ))}
        </div>

        {/* ── ÉTAPE 1 : RÉCAP ── */}
        {etape === "recap" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm overflow-hidden">
              <div className="flex items-start gap-4 p-5">
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                  {produit.photos[0]
                    ? <img src={produit.photos[0]} alt={produit.nom} className="w-full h-full object-cover" />
                    : <Package className="w-8 h-8 text-gray-300 m-auto mt-4" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-gray-900 dark:text-white leading-tight">{produit.nom}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Qté : {qte}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xl font-black text-pink-600">{formatPrix(prixUnit, boutique.devise)}</span>
                    {produit.prix_promo && (
                      <span className="text-sm text-gray-400 line-through">{formatPrix(produit.prix, boutique.devise)}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="border-t border-gray-100 dark:border-white/10 px-5 py-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">Total</span>
                <span className="text-lg font-black text-pink-600">{formatPrix(total, boutique.devise)}</span>
              </div>
            </div>

            {/* Infos acheteur optionnelles */}
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm p-5 space-y-3">
              <p className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Vos informations (optionnel)</p>
              <input
                value={acheteurNom}
                onChange={e => setAcheteurNom(e.target.value)}
                placeholder="Votre nom complet"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-pink-400 transition-colors"
              />
              <input
                value={acheteurTel}
                onChange={e => setAcheteurTel(e.target.value)}
                placeholder="Votre numéro de téléphone"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:border-pink-400 transition-colors"
              />
            </div>

            <button
              onClick={() => setEtape("paiement")}
              className="w-full h-14 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-base transition-all hover:shadow-lg hover:shadow-pink-300/30 active:scale-95 flex items-center justify-center gap-2">
              <CreditCard className="w-5 h-5" /> Continuer vers le paiement
            </button>
          </div>
        )}

        {/* ── ÉTAPE 2 : PAIEMENT ── */}
        {etape === "paiement" && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm p-5 space-y-4">
              <p className="font-black text-gray-900 dark:text-white">
                Montant à payer : <span className="text-pink-600">{formatPrix(total, boutique.devise)}</span>
              </p>

              {/* Lien de paiement externe (Moneroo, CinetPay, etc.) */}
              {produit.paiement_lien && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Cliquez sur le bouton ci-dessous pour payer via la plateforme sécurisée du vendeur :
                  </p>
                  <a
                    href={produit.paiement_lien}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm transition-all active:scale-95">
                    <ExternalLink className="w-4 h-4" /> Payer maintenant
                  </a>
                  <p className="text-xs text-gray-400 text-center">
                    Après avoir payé, revenez ici et cliquez sur « J'ai payé »
                  </p>
                </div>
              )}

              {/* Paiement via Mobile Money manuel */}
              {produit.moyens_paiement.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Effectuez un virement Mobile Money vers :
                  </p>
                  {produit.moyens_paiement.map((mp, i) => (
                    <div key={i}
                      className="flex items-center gap-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                        <Phone className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-900 dark:text-white">{mp.reseau}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{mp.numero}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Au nom de : {mp.nom_titulaire}</p>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 text-center">
                    Après le virement, cliquez sur « J'ai payé »
                  </p>
                </div>
              )}

              {/* Paiement à la réception */}
              {produit.paiement_reception && (
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4">
                  <Truck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-emerald-700 dark:text-emerald-300">Paiement à la livraison</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                      Vous pouvez payer à la réception de votre commande.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bouton J'AI PAYÉ */}
            <button
              onClick={handleJAiPaye}
              disabled={enregistrement}
              className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black text-base transition-all hover:shadow-lg hover:shadow-green-300/30 active:scale-95 flex items-center justify-center gap-2">
              {enregistrement
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><CheckCircle2 className="w-5 h-5" /> J'ai payé — Confirmer</>
              }
            </button>

            <button onClick={() => setEtape("recap")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
              ← Retour au récapitulatif
            </button>
          </div>
        )}

        {/* ── ÉTAPE 3 : CONFIRMATION ── */}
        {etape === "confirmation" && commande && (
          <div className="space-y-4">
            <div className="bg-white dark:bg-white/5 rounded-3xl border border-green-200 dark:border-green-800 shadow-sm p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Commande enregistrée !</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Référence : <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{commande.numero}</span>
                </p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Votre commande a été transmise au vendeur. Vous pouvez suivre son évolution, payer via le lien du vendeur et le contacter directement.
              </p>
            </div>

            <a href={commande.trackingUrl}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
              <Truck className="w-4 h-4" /> Suivre ma commande
            </a>

            {produit.paiement_lien && (
              <a href={produit.paiement_lien} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-pink-600 text-white font-bold text-sm hover:bg-pink-700 transition-all">
                <ExternalLink className="w-4 h-4" /> Payer avec le lien du vendeur
              </a>
            )}

            {/* Contacter le vendeur */}
            {boutique.whatsapp && (
              <a
                href={`https://wa.me/${boutique.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, j'ai passé commande sur votre boutique NEXORA (Réf: ${commande.numero}). Pouvez-vous confirmer la réception de mon paiement ?`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
                style={{ background: "#25D366" }}>
                <MessageCircle className="w-4 h-4" /> Contacter le vendeur sur WhatsApp
              </a>
            )}

            <button onClick={() => navigate(`/shop/${slug}`)}
              className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 font-semibold text-sm hover:border-pink-300 transition-all">
              <ArrowLeft className="w-4 h-4" /> Retour à la boutique
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
