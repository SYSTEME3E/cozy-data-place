/**
 * CheckoutPage — Panier multi-produits
 * Formulaire adaptatif intelligent :
 * - Panier 100% digital  → formulaire "Informations de contact"
 * - Panier mixte ou physique → formulaire "Informations de livraison" (complet)
 * - Étapes : formulaire → paiement → confirmation
 * - Champs masqués dynamiquement → 0 perte de données
 * - Sauvegarde localStorage automatique
 * - Paiement Mobile Money + Crypto (NOWPayments)
 */

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ShoppingBag, Package, Truck, CheckCircle2,
  User, MessageCircle, MapPin, StickyNote, Zap, Mail,
  Building2, Navigation, Info, CreditCard, ExternalLink,
  MessageSquare
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatPrix } from "@/lib/devise-utils";
import PhoneInputComponent, { COUNTRIES, type CountryOption, getCountryByCode } from "@/components/PhoneInputComponent";
import CryptoPaymentModal from "@/components/CryptoPaymentModal";
import { getCryptoWallets, hasCryptoEnabled } from "@/lib/cryptoPayment";

interface BoutiqueInfo {
  id: string; nom: string; slug: string; devise: string;
  whatsapp?: string; telephone?: string;
}

type Etape = "formulaire" | "paiement" | "confirmation";

const LS_KEY = "nexora_checkout_form";

// ─── Champ animé — masqué mais jamais supprimé du DOM ────────────────────────
function AnimatedField({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateRows: visible ? "1fr" : "0fr",
        opacity: visible ? 1 : 0,
        transition: "grid-template-rows 0.28s ease, opacity 0.22s ease",
        overflow: "hidden",
      }}
    >
      <div style={{ overflow: "hidden" }}>{children}</div>
    </div>
  );
}

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { items, subtotal, clearCartItems, setSlug: setCartSlug } = useCart();

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartInitialized, setCartInitialized] = useState(false); // panier lu depuis localStorage

  // ── Lecture synchrone du panier depuis localStorage (évite le flash "panier vide") ──
  const cartFromStorage = (() => {
    if (typeof window === "undefined" || !slug) return [];
    try {
      const raw = window.localStorage.getItem(`nexora_shop_cart_${slug}`);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  })();
  const [saving, setSaving] = useState(false);
  const [etape, setEtape] = useState<Etape>("formulaire");
  const [commandeRef, setCommandeRef] = useState("");
  const [commandeId, setCommandeId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedReseau, setSelectedReseau] = useState<number | null>(null);
  const [savedSubtotal, setSavedSubtotal] = useState<number>(0);

  // ── Crypto payment ──────────────────────────────────────────────────────────
  const [cryptoModalOpen, setCryptoModalOpen] = useState(false);

  // ── Données sauvegardées avant vidage du panier (pour étape paiement) ──
  const [savedHasDigital, setSavedHasDigital] = useState(false);
  const [savedHasPhysical, setSavedHasPhysical] = useState(false);
  const [savedUniqueMoyens, setSavedUniqueMoyens] = useState<Array<{ reseau: string; numero: string; nom_titulaire: string }>>([]);
  const [savedExternalLink, setSavedExternalLink] = useState<string | null>(null);
  const [savedPaiementReception, setSavedPaiementReception] = useState(false);
  const [savedCryptoWallets, setSavedCryptoWallets] = useState<ReturnType<typeof getCryptoWallets>>([]);
  const [savedCryptoEnabled, setSavedCryptoEnabled] = useState(false);

  // ── Champs formulaire ──
  const [nom, setNom]               = useState("");
  const [email, setEmail]           = useState("");
  const [ville, setVille]           = useState("");
  const [adresse, setAdresse]       = useState("");
  const [quartier, setQuartier]     = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes]           = useState("");

  const defaultCountry = COUNTRIES.find(c => c.code === "BJ") || COUNTRIES[0];
  const [waCountry, setWaCountry] = useState<CountryOption>(defaultCountry);
  const [whatsappDisplay, setWhatsappDisplay] = useState("");
  const [whatsappFull, setWhatsappFull] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  // ── Charger boutique ──
  useEffect(() => {
    if (!slug) return;
    setCartSlug(slug); // lit localStorage → items mis à jour
    setCartInitialized(true);
    const load = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("boutiques" as any).select("id,nom,slug,devise,whatsapp,telephone")
        .eq("slug", slug).maybeSingle();
      if (data) setBoutique(data as unknown as BoutiqueInfo);
      setLoading(false);
    };
    load();
  }, [slug]);

  // ── Auto-remplissage localStorage ──
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
      if (saved.nom)      setNom(saved.nom);
      if (saved.email)    setEmail(saved.email);
      if (saved.ville)    setVille(saved.ville);
      if (saved.adresse)  setAdresse(saved.adresse);
      if (saved.quartier) setQuartier(saved.quartier);
      if (saved.countryCode) {
        const c = getCountryByCode(saved.countryCode) || defaultCountry;
        setWaCountry(c);
        // Restaurer le numéro WhatsApp complet
        if (saved.whatsappFull) {
          setWhatsappFull(saved.whatsappFull);
          // Recalculer la partie locale pour l'affichage
          const local = saved.whatsappFull.replace(c.dialCode, "").trim();
          setWhatsappDisplay(local);
        }
      } else if (saved.whatsappFull) {
        setWhatsappFull(saved.whatsappFull);
        const local = saved.whatsappFull.replace(defaultCountry.dialCode, "").trim();
        setWhatsappDisplay(local);
      }
    } catch (e) { console.warn("Erreur ignorée:", e); }
  }, []);

  // ── Sauvegarde auto ──
  useEffect(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({
        nom, email, ville, adresse, quartier, countryCode: waCountry.code,
        whatsappFull,
      }));
    } catch (e) { console.warn("Erreur ignorée:", e); }
  }, [nom, email, ville, adresse, quartier, waCountry.code, whatsappFull]);

  // ── Détection du type de panier ──
  const hasDigital  = items.some(it => it.produit.type === "numerique");
  const hasPhysical = items.some(it => it.produit.type === "physique");
  const needsDelivery = hasPhysical;

  // ── Collecter moyens de paiement uniques du panier ──
  const allMoyensPaiement = items.flatMap(it => it.produit.moyens_paiement || []);
  const uniqueMoyens = allMoyensPaiement.filter(
    (mp, idx, arr) => arr.findIndex(m => m.reseau === mp.reseau && m.numero === mp.numero) === idx
  );

  // ── Paiement Crypto (NOWPayments) — wallets depuis les produits du panier ──
  const allProduitsMoyens = items.flatMap(it => it.produit.moyens_paiement || []);
  const cryptoWallets = getCryptoWallets(allProduitsMoyens);
  const cryptoEnabled = hasCryptoEnabled(allProduitsMoyens);

  // ── NEXORA Pay désactivé — uniquement lien externe ──
  const firstNexoraPaylink = null; // Nexora Pay désactivé

  const firstExternalLink = items.find(
    it => it.produit.paiement_lien
  )?.produit.paiement_lien || null;

  const effectivePaiementLien = firstExternalLink;
  const isNexoraPay    = false; // Nexora Pay désactivé
  const isExternalLink = !!firstExternalLink;
  const hasAutoRedirect = false; // Plus de redirection automatique

  const hasPaiementReception = items.some(it => (it.produit as any).paiement_reception);
  const hasPaiementOptions = !!effectivePaiementLien || uniqueMoyens.length > 0 || hasPaiementReception;

  const clearError = (key: string) => {
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!nom.trim())       errs.nom     = "Le nom complet est requis";
    if (!whatsappFull)     errs.wa      = "Le numéro WhatsApp est requis";
    if (needsDelivery) {
      if (!ville.trim())   errs.ville   = "La ville est requise";
      if (!adresse.trim()) errs.adresse = "L'adresse de livraison est requise";
    } else {
      if (!email.trim())   errs.email   = "L'email est requis pour les produits digitaux";
    }
    setWhatsappError(errs.wa || "");
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.keys(errs)[0];
      toast({ title: errs[first], variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleConfirmer = async () => {
    if (!boutique || (items.length === 0 && cartFromStorage.length === 0)) return;
    setSaving(true);

    const ref = `NX-${Date.now().toString(36).toUpperCase()}`;
    const cartItems = items.map(it => ({
      produit_id: it.produit.id,
      nom_produit: it.produit.nom,
      prix_unitaire: it.produit.prix_promo ?? it.produit.prix,
      quantite: it.quantite,
      montant: (it.produit.prix_promo ?? it.produit.prix) * it.quantite,
      type: it.produit.type,
      photo_url: it.produit.photos?.[0] || null,
      variations_choisies: it.variations_choisies,
    }));

    const adresseFull = needsDelivery
      ? [adresse, quartier, ville].filter(Boolean).join(", ")
      : null;

    const { data, error } = await (supabase as any).from("commandes").insert({
      boutique_id: boutique.id,
      items: cartItems,
      total: subtotal,
      montant: subtotal,
      devise: boutique.devise || "XOF",
      statut: "nouvelle",
      statut_paiement: "en_attente",
      numero: ref,
      client_nom: nom,
      client_tel: whatsappFull,
      client_email: email || null,
      client_adresse: adresseFull,
    }).select().maybeSingle();

    setSaving(false);
    if (error || !data) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la commande.", variant: "destructive" });
      return;
    }

    try { localStorage.removeItem(LS_KEY); } catch (e) { console.warn("Erreur ignorée:", e); }

    // ── Sauvegarder toutes les données du panier avant vidage ──
    setSavedSubtotal(subtotal);
    setSavedHasDigital(hasDigital);
    setSavedHasPhysical(hasPhysical);
    setSavedUniqueMoyens(uniqueMoyens);
    setSavedExternalLink(firstExternalLink);
    setSavedPaiementReception(hasPaiementReception);
    setSavedCryptoWallets(cryptoWallets);
    setSavedCryptoEnabled(cryptoEnabled);

    clearCartItems();
    setCommandeRef(ref);
    setCommandeId((data as any).id || null);
    setEtape("paiement");
  };

  // Utiliser savedSubtotal à l'étape paiement (le panier a été vidé)
  const displaySubtotal        = etape === "paiement" ? savedSubtotal        : subtotal;
  const displayHasDigital      = etape === "paiement" ? savedHasDigital      : hasDigital;
  const displayHasPhysical     = etape === "paiement" ? savedHasPhysical     : hasPhysical;
  const displayUniqueMoyens    = etape === "paiement" ? savedUniqueMoyens    : uniqueMoyens;
  const displayExternalLink    = etape === "paiement" ? savedExternalLink    : firstExternalLink;
  const displayPaiementReception = etape === "paiement" ? savedPaiementReception : hasPaiementReception;
  const displayHasPaiementOptions = !!displayExternalLink || displayUniqueMoyens.length > 0 || displayPaiementReception;
  const displayCryptoWallets = etape === "paiement" ? savedCryptoWallets : cryptoWallets;
  const displayCryptoEnabled = etape === "paiement" ? savedCryptoEnabled : cryptoEnabled;
  const etapes: Etape[] = ["formulaire", "paiement", "confirmation"];
  const etapeLabels = ["Informations", "Paiement", "Confirmé"];

  // ─── Chargement ──────────────────────────────────────────────────────────
  if (loading || !cartInitialized) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 rounded-full border-4 border-rose-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!boutique || (items.length === 0 && cartFromStorage.length === 0 && etape !== "confirmation" && etape !== "paiement")) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Panier vide</h2>
        <p className="text-gray-500 mt-2">Ajoutez des produits avant de commander.</p>
        <button onClick={() => navigate(slug ? `/shop/${slug}` : "/")} className="mt-4 inline-flex items-center gap-2 text-[#FF1A00] font-semibold">
          <ArrowLeft className="w-4 h-4" /> Retour à la boutique
        </button>
      </div>
    </div>
  );

  if (etape === "confirmation") {
    return (
      <ConfirmationPage
        ref_={commandeRef}
        boutique={boutique}
        hasDigital={savedHasDigital}
        hasPhysical={savedHasPhysical}
        onBack={() => navigate(`/shop/${slug}`)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => {
              if (etape === "formulaire") navigate(`/shop/${slug}`);
              else setEtape("formulaire");
            }}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:border-rose-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{boutique?.nom}</p>
            <h1 className="text-lg font-black text-gray-900">Finaliser la commande</h1>
          </div>
        </div>

        {/* ── Indicateur d'étapes ── */}
        <div className="flex items-center gap-0 mb-6">
          {etapes.map((e, i) => (
            <div key={e} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  etape === e
                    ? "bg-[#FF1A00] text-white shadow-lg shadow-rose-200 scale-110"
                    : i < etapes.indexOf(etape)
                    ? "bg-[#008000] text-white"
                    : "bg-gray-200 text-gray-400"
                }`}>
                  {i < etapes.indexOf(etape) ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-semibold whitespace-nowrap ${
                  etape === e ? "text-[#FF1A00]" : "text-gray-400"
                }`}>
                  {etapeLabels[i]}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 rounded transition-colors duration-300 ${
                  i < etapes.indexOf(etape) ? "bg-[#008000]" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ════════════════════════════════════════
            ÉTAPE 1 — FORMULAIRE
        ════════════════════════════════════════ */}
        {etape === "formulaire" && (
          <div className="space-y-5">

            {/* Bannière panier mixte */}
            {hasDigital && hasPhysical && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-700">Panier mixte</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Votre panier contient des produits digitaux <strong>et</strong> physiques.
                    L'adresse de livraison est requise pour les articles physiques.
                  </p>
                </div>
              </div>
            )}

            {/* Bannière lien de paiement externe */}
            {isExternalLink && (
              <div className="flex items-start gap-3 rounded-2xl p-4 border bg-blue-50 border-blue-200">
                <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#305CDE]" />
                <div>
                  <p className="text-xs font-bold text-[#305CDE]">Paiement en ligne 🔗</p>
                  <p className="text-xs mt-0.5 text-[#305CDE]">
                    Un lien de paiement vous sera proposé après confirmation de vos informations.
                  </p>
                </div>
              </div>
            )}

            {/* Récapitulatif articles */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5">
              <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#FF1A00]" /> Votre commande
              </h2>
              <div className="space-y-3">
                {items.map((it, idx) => {
                  const prix = it.produit.prix_promo ?? it.produit.prix;
                  const isD = it.produit.type === "numerique";
                  return (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
                        {it.produit.photos?.[0]
                          ? <img src={it.produit.photos[0]} alt={it.produit.nom} className="w-full h-full object-cover" />
                          : isD ? <Zap className="w-5 h-5 text-[#305CDE]" /> : <Package className="w-5 h-5 text-gray-300" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{it.produit.nom}</p>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isD ? "bg-[#305CDE] text-[#305CDE]" : "bg-blue-100 text-[#305CDE]"
                        }`}>
                          {isD ? "Digital" : `Qté: ${it.quantite}`}
                        </span>
                      </div>
                      <p className="text-sm font-black text-[#FF1A00]">{formatPrix(prix * it.quantite, boutique.devise)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="border-t border-gray-100 mt-4 pt-4 flex justify-between items-center">
                <span className="font-black text-gray-900">Total</span>
                <span className="font-black text-xl text-[#FF1A00]">{formatPrix(subtotal, boutique.devise)}</span>
              </div>
            </div>

            {/* Formulaire */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">

              <div className="flex items-center gap-2.5 pb-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  needsDelivery ? "bg-[#FF1A00]" : "bg-[#305CDE]"
                }`}>
                  {needsDelivery
                    ? <Truck className="w-4 h-4 text-[#FF1A00]" />
                    : <Zap className="w-4 h-4 text-[#305CDE]" />
                  }
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {needsDelivery ? "Informations de livraison" : "Informations de contact"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {needsDelivery
                      ? "Requis pour organiser la livraison à votre adresse"
                      : "Le vendeur vous contactera pour livrer votre commande"
                    }
                  </p>
                </div>
              </div>

              {/* NOM */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Nom complet <span className="text-[#FF1A00]">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={nom}
                    onChange={e => { setNom(e.target.value); clearError("nom"); }}
                    placeholder="Votre nom complet"
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                      errors.nom ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-rose-300 focus:border-rose-400"
                    }`}
                  />
                </div>
                {errors.nom && <p className="text-xs text-red-500 mt-1 pl-1">{errors.nom}</p>}
              </div>

              {/* WHATSAPP */}
              <div>
                <PhoneInputComponent
                  label="Numéro WhatsApp"
                  required
                  selectedCountry={waCountry}
                  onCountryChange={setWaCountry}
                  value={whatsappFull}
                  onChange={(full, local) => {
                    setWhatsappFull(full);
                    setWhatsappDisplay(local);
                    if (full) { setWhatsappError(""); clearError("wa"); }
                  }}
                  error={whatsappError}
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Email
                  {!needsDelivery
                    ? <span className="text-[#FF1A00] ml-1">*</span>
                    : <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                  }
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError("email"); }}
                    placeholder="email@exemple.com"
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                      errors.email ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-rose-300 focus:border-rose-400"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 pl-1">{errors.email}</p>}
              </div>

              {/* VILLE */}
              <AnimatedField visible={needsDelivery}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Ville <span className="text-[#FF1A00]">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={ville}
                      onChange={e => { setVille(e.target.value); clearError("ville"); }}
                      placeholder="Ex : Cotonou"
                      tabIndex={needsDelivery ? 0 : -1}
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                        errors.ville ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-rose-300 focus:border-rose-400"
                      }`}
                    />
                  </div>
                  {errors.ville && <p className="text-xs text-red-500 mt-1 pl-1">{errors.ville}</p>}
                </div>
              </AnimatedField>

              {/* ADRESSE */}
              <AnimatedField visible={needsDelivery}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Adresse de livraison <span className="text-[#FF1A00]">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea
                      value={adresse}
                      onChange={e => { setAdresse(e.target.value); clearError("adresse"); }}
                      placeholder="Numéro, rue, description précise de votre adresse..."
                      rows={2}
                      tabIndex={needsDelivery ? 0 : -1}
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all resize-none ${
                        errors.adresse ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-rose-300 focus:border-rose-400"
                      }`}
                    />
                  </div>
                  {errors.adresse && <p className="text-xs text-red-500 mt-1 pl-1">{errors.adresse}</p>}
                </div>
              </AnimatedField>

              {/* QUARTIER */}
              <AnimatedField visible={needsDelivery}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Quartier / Zone <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={quartier}
                      onChange={e => setQuartier(e.target.value)}
                      placeholder="Ex : Akpakpa, Fidjrossè, Cadjehoun..."
                      tabIndex={needsDelivery ? 0 : -1}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all"
                    />
                  </div>
                </div>
              </AnimatedField>

              {/* INSTRUCTIONS */}
              <AnimatedField visible={needsDelivery}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Instructions de livraison <span className="text-gray-400 font-normal">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Ex : Appeler avant d'arriver, bâtiment rouge..."
                      rows={2}
                      tabIndex={needsDelivery ? 0 : -1}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all resize-none"
                    />
                  </div>
                </div>
              </AnimatedField>

              {/* NOTES */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Notes <span className="text-gray-400 font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Instructions spéciales ou précisions sur votre commande..."
                    rows={2}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Bouton continuer */}
            <button
              onClick={() => {
                if (!validate()) return;
                handleConfirmer();
              }}
              disabled={saving}
              className="w-full h-14 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)",
                boxShadow: "0 8px 30px rgba(244,63,94,0.35)",
              }}
            >
              {saving
                ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : <><CreditCard className="w-5 h-5" /> Commander maintenant</>
              }
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
            ÉTAPE 2 — PAIEMENT
        ════════════════════════════════════════ */}
        {etape === "paiement" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">

              <p className="font-black text-gray-900 text-base">
                À payer : <span className="text-[#FF1A00]">{formatPrix(displaySubtotal, boutique.devise)}</span>
              </p>

              {/* Mobile Money */}
              {displayUniqueMoyens.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Mobile Money :</p>
                  {displayUniqueMoyens.map((mp, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelectedReseau(selectedReseau === i ? null : i)}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedReseau === i
                          ? "border-rose-400 bg-rose-50"
                          : "border-gray-200 bg-gray-50 hover:border-rose-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        selectedReseau === i ? "bg-[#FF1A00]" : "bg-gray-200"
                      }`}>
                        <MessageSquare className={`w-5 h-5 ${selectedReseau === i ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-900">{mp.reseau}</p>
                        <p className="text-sm text-gray-600 font-mono mt-0.5">{mp.numero}</p>
                        <p className="text-xs text-gray-400">Au nom de : {mp.nom_titulaire}</p>
                        {selectedReseau === i && (
                          <div className="mt-2 pt-2 border-t border-rose-200">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Montant à envoyer</span>
                              <span className="font-black text-[#FF1A00]">{formatPrix(displaySubtotal, boutique.devise)}</span>
                            </div>
                          </div>
                        )}
                      </div>
                      {selectedReseau === i && <CheckCircle2 className="w-4 h-4 text-[#FF1A00] flex-shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              )}

              {/* Paiement à la livraison */}
              {displayPaiementReception && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <Truck className="w-5 h-5 text-[#008000] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-[#008000]">Paiement à la livraison</p>
                    <p className="text-xs text-[#008000] mt-0.5">Vous payez à la réception de votre commande.</p>
                  </div>
                </div>
              )}

              {/* ── Paiement Crypto ── */}
              {displayCryptoEnabled && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-700">Cryptomonnaie :</p>
                  <button
                    type="button"
                    onClick={() => setCryptoModalOpen(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-yellow-300 bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100 transition-all text-left shadow-sm"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                      ₿
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-sm text-gray-900">Payer en Crypto</p>
                      <p className="text-xs text-gray-500">USDT TRC-20 · BNB — Via NOWPayments</p>
                    </div>
                    <div className="flex-shrink-0 px-3 py-1 bg-yellow-400 rounded-full">
                      <span className="text-xs font-black text-yellow-900">Payer</span>
                    </div>
                  </button>
                  <p className="text-xs text-gray-400 text-center">
                    ⏱ L'adresse de paiement expire après <strong>10 minutes</strong>
                  </p>
                </div>
              )}

              {/* Aucun moyen configuré */}
              {!displayHasPaiementOptions && !displayCryptoEnabled && (
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-2xl p-4">
                  <Info className="w-4 h-4 text-[#305CDE] mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-[#305CDE]">
                    Le vendeur vous contactera via WhatsApp pour les détails du paiement après confirmation.
                  </p>
                </div>
              )}
            </div>

            {/* ── Modal Paiement Crypto ── */}
            <CryptoPaymentModal
              isOpen={cryptoModalOpen}
              onClose={() => setCryptoModalOpen(false)}
              onSuccess={async (paymentId) => {
                setCryptoModalOpen(false);
                // Mettre à jour le statut de la commande
                if (commandeId) {
                  await (supabase as any)
                    .from("commandes")
                    .update({
                      statut_paiement: "paye",
                      statut: "confirmee",
                      crypto_payment_id: paymentId,
                      moyen_paiement: "crypto",
                    })
                    .eq("id", commandeId);
                }
                setEtape("confirmation");
              }}
              wallets={displayCryptoWallets}
              orderId={commandeRef}
              productName={`Commande ${commandeRef}`}
              priceUSD={displayCryptoWallets[0]?.prix_usdt || 0}
            />

            {/* Bouton confirmer */}
            <button
              onClick={() => {
                if (displayExternalLink) {
                  window.open(displayExternalLink, "_blank", "noopener,noreferrer");
                } else {
                  setEtape("confirmation");
                }
              }}
              disabled={saving}
              className="w-full h-14 rounded-2xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-60"
              style={{
                background: displayExternalLink
                  ? "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)"
                  : "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
                boxShadow: displayExternalLink
                  ? "0 8px 30px rgba(37,99,235,0.35)"
                  : "0 8px 30px rgba(34,197,94,0.3)",
              }}
            >
              {saving
                ? <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                : displayExternalLink
                  ? <><ExternalLink className="w-5 h-5" /> Confirmer ma Commande 🔗</>
                  : <><CheckCircle2 className="w-5 h-5" /> {displayHasPaiementOptions ? "J'ai payé — Confirmer" : "Confirmer la commande"}</>
              }
            </button>

            {displayExternalLink && (
              <p className="text-xs text-center text-gray-400">
                Vous serez redirigé vers la page de paiement sécurisé
              </p>
            )}

            <button
              onClick={() => setEtape("formulaire")}
              className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors text-center py-2"
            >
              ← Retour aux informations
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page de confirmation ─────────────────────────────────────────────────────
function ConfirmationPage({
  ref_, boutique, hasDigital, hasPhysical, onBack
}: {
  ref_: string;
  boutique: BoutiqueInfo;
  hasDigital: boolean;
  hasPhysical: boolean;
  onBack: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#f7f7f8] flex items-center justify-center p-8">
      <div className="bg-white rounded-3xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-[#008000] flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-[#008000]" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Commande confirmée !</h2>
        <p className="text-sm text-gray-500">
          Merci pour votre commande chez <strong>{boutique.nom}</strong>.
        </p>

        {(hasDigital || hasPhysical) && (
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {hasDigital && (
              <span className="inline-flex items-center gap-1.5 bg-[#305CDE] text-[#305CDE] text-xs font-bold px-3 py-1.5 rounded-full">
                <Zap className="w-3 h-3" /> Produits digitaux
              </span>
            )}
            {hasPhysical && (
              <span className="inline-flex items-center gap-1.5 bg-blue-100 text-[#305CDE] text-xs font-bold px-3 py-1.5 rounded-full">
                <Package className="w-3 h-3" /> Produits physiques
              </span>
            )}
          </div>
        )}

        <div className="rounded-2xl bg-gray-50 px-4 py-3">
          <p className="text-xs text-gray-400">Référence</p>
          <p className="text-lg font-black text-gray-900 mt-0.5 font-mono">{ref_}</p>
        </div>
        <p className="text-xs text-gray-400">
          Le vendeur vous contactera sous peu via WhatsApp.
        </p>
        <button
          onClick={onBack}
          className="w-full h-12 rounded-2xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition-colors"
        >
          Retour à la boutique
        </button>
      </div>
    </div>
  );
}
