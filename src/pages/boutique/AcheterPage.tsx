/**
 * AcheterPage — Commande produit unique
 * Formulaire adaptatif : digital (contact) vs physique (livraison)
 * - Champs masqués dynamiquement (pas supprimés) → 0 perte de données
 * - Sauvegarde auto localStorage
 * - Animation fluide entre états
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft, CheckCircle2, CreditCard, ExternalLink,
  MessageCircle, Package, Truck, Mail, MapPin, User, Zap,
  StickyNote, MessageSquare, Phone, Building2, Navigation,
  Sparkles, Info
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatPrix } from "@/lib/devise-utils";
import PhoneInputComponent, { COUNTRIES, CountryOption, getCountryByCode } from "@/components/PhoneInputComponent";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProduitInfo {
  id: string; nom: string; prix: number; prix_promo: number | null;
  photos: string[]; paiement_lien: string | null; paiement_reception: boolean;
  moyens_paiement: Array<{ reseau: string; numero: string; nom_titulaire: string; instructions?: string }>;
  type: string;
}
interface BoutiqueInfo {
  id: string; nom: string; slug: string; devise: string;
  whatsapp?: string; telephone?: string; vendor_id?: string;
}
interface CommandeCreee { id: string; numero: string; trackingUrl: string; }

type Etape = "formulaire" | "paiement" | "confirmation";

const LS_KEY = "nexora_checkout_form";

// ─── Hook localStorage ────────────────────────────────────────────────────────
function useSavedForm() {
  const load = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); } catch { return {}; }
  };
  const save = (data: Record<string, string>) => {
    try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
  };
  const clear = () => { try { localStorage.removeItem(LS_KEY); } catch {} };
  return { load, save, clear };
}

// ─── Composant champ animé ────────────────────────────────────────────────────
function AnimatedField({
  visible, children
}: { visible: boolean; children: React.ReactNode }) {
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

// ─── Composant principal ──────────────────────────────────────────────────────
export default function AcheterPage() {
  const { slug, produitId } = useParams<{ slug: string; produitId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { load: loadSaved, save: saveDraft, clear: clearDraft } = useSavedForm();
  const qte = parseInt(searchParams.get("qte") || "1", 10);

  const [boutique, setBoutique] = useState<BoutiqueInfo | null>(null);
  const [produit, setProduit] = useState<ProduitInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [etape, setEtape] = useState<Etape>("formulaire");
  const [commande, setCommande] = useState<CommandeCreee | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [selectedReseau, setSelectedReseau] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Champs formulaire ──
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [ville, setVille] = useState("");
  const [adresse, setAdresse] = useState("");
  const [quartier, setQuartier] = useState("");
  const [instructions, setInstructions] = useState("");
  const [notes, setNotes] = useState("");

  const defaultCountry = COUNTRIES.find(c => c.code === "BJ") || COUNTRIES[0];
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(defaultCountry);
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [phoneFull, setPhoneFull] = useState("");
  const [waCountry, setWaCountry] = useState<CountryOption>(defaultCountry);
  const [whatsappDisplay, setWhatsappDisplay] = useState("");
  const [whatsappFull, setWhatsappFull] = useState("");
  const [whatsappError, setWhatsappError] = useState("");

  // ── Désactiver dark mode ──
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  // ── Chargement produit ──
  useEffect(() => {
    const load = async () => {
      if (!slug || !produitId) return;
      setLoading(true);
      const { data: b } = await supabase
        .from("boutiques" as any).select("id,nom,slug,devise,whatsapp,telephone,vendor_id")
        .eq("slug", slug).maybeSingle();
      if (!b) { setLoading(false); return; }
      setBoutique(b as unknown as BoutiqueInfo);

      // Chercher le produit sans filtrer sur actif (actif peut être false ou null)
      const { data: p } = await supabase.from("produits" as any)
        .select("id,nom,prix,prix_promo,photos,paiement_lien,paiement_reception,moyens_paiement,type,actif")
        .eq("id", produitId).eq("boutique_id", (b as any).id).maybeSingle();
      if (p) setProduit({ ...(p as any), photos: (p as any).photos || [], moyens_paiement: (p as any).moyens_paiement || [] });
      setLoading(false);
    };
    load();
  }, [slug, produitId]);

  // ── Auto-remplissage depuis localStorage ──
  useEffect(() => {
    const saved = loadSaved();
    if (saved.nom)     setNom(saved.nom);
    if (saved.email)   setEmail(saved.email);
    if (saved.ville)   setVille(saved.ville);
    if (saved.adresse) setAdresse(saved.adresse);
    if (saved.quartier) setQuartier(saved.quartier);
    if (saved.countryCode) {
      const c = getCountryByCode(saved.countryCode) || defaultCountry;
      setSelectedCountry(c);
      setWaCountry(c);
      // Restaurer le numéro WhatsApp complet
      if (saved.whatsappFull) {
        setWhatsappFull(saved.whatsappFull);
        const local = saved.whatsappFull.replace(c.dialCode, "").trim();
        setWhatsappDisplay(local);
      }
    } else if (saved.whatsappFull) {
      setWhatsappFull(saved.whatsappFull);
      const local = saved.whatsappFull.replace(defaultCountry.dialCode, "").trim();
      setWhatsappDisplay(local);
    }
  }, []);

  // ── Sauvegarde auto en temps réel ──
  useEffect(() => {
    saveDraft({ nom, email, ville, adresse, quartier, countryCode: selectedCountry.code, whatsappFull });
  }, [nom, email, ville, adresse, quartier, selectedCountry.code, whatsappFull]);

  const isDigital = produit?.type === "numerique";
  const prixUnit  = produit ? (produit.prix_promo ?? produit.prix) : 0;
  const total     = prixUnit * qte;

  // ── Validation dynamique selon type ──
  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!nom.trim())        errs.nom     = "Le nom complet est requis";
    if (!whatsappFull)      errs.wa      = "Le numéro WhatsApp est requis";
    if (isDigital) {
      if (!email.trim())    errs.email   = "L'email est requis pour un produit digital";
    } else {
      if (!ville.trim())    errs.ville   = "La ville est requise";
      if (!adresse.trim())  errs.adresse = "L'adresse de livraison est requise";
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

  // ── Effacer erreur quand on tape ──
  const clearError = (key: string) => {
    if (errors[key]) setErrors(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  // ── Confirmer commande ──
  const handleConfirmer = async () => {
    if (!produit || !boutique) return;
    setEnregistrement(true);
    const ref = `NX-${Date.now().toString(36).toUpperCase()}`;
    const items = [{
      produit_id: produit.id, nom_produit: produit.nom,
      prix_unitaire: prixUnit, quantite: qte, montant: total,
      type: produit.type, photo_url: produit.photos?.[0] || null,
      variations_choisies: {},
    }];
    const { data, error } = await (supabase as any).from("commandes").insert({
      boutique_id: boutique.id, produit_id: produit.id, items, total, montant: total,
      devise: boutique.devise || "XOF", statut: "nouvelle", statut_paiement: "en_attente",
      numero: ref,
      client_nom: nom || "Client",
      client_tel: whatsappFull || phoneFull || null,
      client_email: email || null,
      client_adresse: isDigital ? null : [adresse, quartier, ville].filter(Boolean).join(", "),
      notes: [instructions, notes].filter(Boolean).join(" | ") || null,
      product_type: produit.type,
    }).select().maybeSingle();

    if (error || !data) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la commande.", variant: "destructive" });
      setEnregistrement(false); return;
    }

    try {
      await (supabase as any).from("customers").insert({
        vendor_id: boutique.vendor_id || boutique.id,
        full_name: nom, email: email || null,
        country: selectedCountry.code, country_name: selectedCountry.name,
        country_flag: selectedCountry.flag,
        phone_number: phoneFull || null, whatsapp_number: whatsappFull || null,
        address: isDigital ? null : [adresse, quartier, ville].filter(Boolean).join(", "),
        notes: notes || null,
      });
    } catch (_) {}

    clearDraft();
    setCommande({ id: (data as any).id, numero: (data as any).numero || ref, trackingUrl: `${window.location.origin}/commande/${(data as any).id}` });
    setEtape("confirmation");
    setEnregistrement(false);
  };

  // ─── États de chargement et 404 ───────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-10 h-10 rounded-full border-4 border-pink-500 border-t-transparent animate-spin" />
    </div>
  );

  if (!produit || !boutique) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-8">
      <div className="text-center">
        <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-700">Produit introuvable</h2>
        <button onClick={() => navigate(slug ? `/shop/${slug}` : "/")} className="mt-4 flex items-center gap-2 text-pink-600 font-semibold mx-auto">
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      </div>
    </div>
  );

  const etapes: Etape[] = ["formulaire", "paiement", "confirmation"];
  const etapeLabels = ["Informations", "Paiement", "Confirmé"];

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => etape === "formulaire"
              ? navigate(isDigital ? `/shop/${slug}/digital/${produitId}` : `/shop/${slug}/produit/${produitId}`)
              : setEtape(etape === "paiement" ? "formulaire" : "paiement")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-gray-200 shadow-sm hover:border-pink-300 transition-all"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">{boutique.nom}</p>
            <h1 className="text-lg font-black text-gray-900">
              {isDigital ? "Commande digitale" : "Commander"}
            </h1>
          </div>
        </div>

        {/* ── Indicateur d'étapes ── */}
        <div className="flex items-center gap-0 mb-6">
          {etapes.map((e, i) => (
            <div key={e} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300 ${
                  etape === e
                    ? "bg-pink-500 text-white shadow-lg shadow-pink-200 scale-110"
                    : i < etapes.indexOf(etape)
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}>
                  {i < etapes.indexOf(etape) ? "✓" : i + 1}
                </div>
                <span className={`text-[10px] font-semibold whitespace-nowrap ${
                  etape === e ? "text-pink-600" : "text-gray-400"
                }`}>
                  {etapeLabels[i]}
                </span>
              </div>
              {i < 2 && (
                <div className={`flex-1 h-0.5 mb-4 mx-1 rounded transition-colors duration-300 ${
                  i < etapes.indexOf(etape) ? "bg-green-400" : "bg-gray-200"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* ── Résumé produit ── */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden mb-4">
          <div className="flex items-start gap-4 p-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0 flex items-center justify-center">
              {produit.photos[0]
                ? <img src={produit.photos[0]} alt={produit.nom} className="w-full h-full object-cover" />
                : isDigital ? <Zap className="w-6 h-6 text-purple-400" /> : <Package className="w-6 h-6 text-gray-300" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm leading-tight">{produit.nom}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {isDigital ? "Produit digital" : `Quantité : ${qte}`}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-base font-black text-pink-600">{formatPrix(prixUnit, boutique.devise)}</span>
                {produit.prix_promo && <span className="text-xs text-gray-400 line-through">{formatPrix(produit.prix, boutique.devise)}</span>}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Total</p>
              <p className="font-black text-rose-600 text-sm">{formatPrix(total, boutique.devise)}</p>
            </div>
          </div>
        </div>

        {/* ════════════════════════════════════════
            ÉTAPE 1 — FORMULAIRE ADAPTATIF
        ════════════════════════════════════════ */}
        {etape === "formulaire" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">

              {/* ── Titre dynamique selon type ── */}
              <div className="flex items-center gap-2.5 pb-1">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDigital ? "bg-purple-100" : "bg-rose-100"
                }`}>
                  {isDigital
                    ? <Zap className="w-4 h-4 text-purple-600" />
                    : <Truck className="w-4 h-4 text-rose-600" />
                  }
                </div>
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {isDigital ? "Informations de contact" : "Informations de livraison"}
                  </p>
                  <p className="text-xs text-gray-400">
                    {isDigital
                      ? "Le vendeur vous contactera pour livrer votre produit"
                      : "Requis pour organiser la livraison à votre adresse"
                    }
                  </p>
                </div>
              </div>

              {/* ── Bannière info type ── */}
              <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-2xl text-xs font-medium ${
                isDigital
                  ? "bg-purple-50 border border-purple-100 text-purple-700"
                  : "bg-amber-50 border border-amber-100 text-amber-700"
              }`}>
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                {isDigital
                  ? "Produit digital — Aucune adresse physique nécessaire"
                  : "Produit physique — Livraison à domicile requise"
                }
              </div>

              {/* ══ NOM — toujours visible ══ */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Nom complet <span className="text-pink-500">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    value={nom}
                    onChange={e => { setNom(e.target.value); clearError("nom"); }}
                    placeholder="Votre nom complet"
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                      errors.nom ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-pink-200 focus:border-pink-400"
                    }`}
                  />
                </div>
                {errors.nom && <p className="text-xs text-red-500 mt-1 pl-1">{errors.nom}</p>}
              </div>

              {/* ══ EMAIL — obligatoire digital, optionnel physique ══ */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Email
                  {isDigital
                    ? <span className="text-pink-500 ml-1">*</span>
                    : <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                  }
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError("email"); }}
                    placeholder="votre@email.com"
                    className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                      errors.email ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-pink-200 focus:border-pink-400"
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 pl-1">{errors.email}</p>}
              </div>

              {/* ══ PAYS — toujours visible ══ */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Pays <span className="text-pink-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={selectedCountry.code}
                    onChange={e => {
                      const c = getCountryByCode(e.target.value) || COUNTRIES[0];
                      setSelectedCountry(c);
                      setWaCountry(c);
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all appearance-none cursor-pointer"
                  >
                    {COUNTRIES.map(c => (
                      <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dialCode})</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* ══ WHATSAPP — toujours visible ══ */}
              <div>
                <PhoneInputComponent
                  label="Numéro WhatsApp"
                  required
                  value={whatsappDisplay}
                  onChange={(full, local) => {
                    setWhatsappFull(full);
                    setWhatsappDisplay(local);
                    if (full) { setWhatsappError(""); clearError("wa"); }
                  }}
                  selectedCountry={waCountry}
                  onCountryChange={c => setWaCountry(c)}
                  placeholder="XX XX XX XX"
                  error={whatsappError}
                />
              </div>

              {/* ══ TÉLÉPHONE — toujours visible ══ */}
              <div>
                <PhoneInputComponent
                  label="Téléphone"
                  value={phoneDisplay}
                  onChange={(full, local) => { setPhoneFull(full); setPhoneDisplay(local); }}
                  selectedCountry={selectedCountry}
                  onCountryChange={setSelectedCountry}
                  placeholder="XX XX XX XX (optionnel)"
                />
              </div>

              {/* ══ VILLE — masquée pour digital ══ */}
              <AnimatedField visible={!isDigital}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Ville <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={ville}
                      onChange={e => { setVille(e.target.value); clearError("ville"); }}
                      placeholder="Ex : Cotonou"
                      tabIndex={isDigital ? -1 : 0}
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all ${
                        errors.ville ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-pink-200 focus:border-pink-400"
                      }`}
                    />
                  </div>
                  {errors.ville && <p className="text-xs text-red-500 mt-1 pl-1">{errors.ville}</p>}
                </div>
              </AnimatedField>

              {/* ══ ADRESSE — masquée pour digital ══ */}
              <AnimatedField visible={!isDigital}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Adresse de livraison <span className="text-pink-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea
                      value={adresse}
                      onChange={e => { setAdresse(e.target.value); clearError("adresse"); }}
                      placeholder="Numéro, rue, description précise..."
                      rows={2}
                      tabIndex={isDigital ? -1 : 0}
                      className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 transition-all resize-none ${
                        errors.adresse ? "border-red-300 bg-red-50 focus:ring-red-200" : "border-gray-200 bg-gray-50 focus:ring-pink-200 focus:border-pink-400"
                      }`}
                    />
                  </div>
                  {errors.adresse && <p className="text-xs text-red-500 mt-1 pl-1">{errors.adresse}</p>}
                </div>
              </AnimatedField>

              {/* ══ QUARTIER — masqué pour digital ══ */}
              <AnimatedField visible={!isDigital}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Quartier / Zone
                    <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <Navigation className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={quartier}
                      onChange={e => setQuartier(e.target.value)}
                      placeholder="Ex : Akpakpa, Fidjrossè..."
                      tabIndex={isDigital ? -1 : 0}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all"
                    />
                  </div>
                </div>
              </AnimatedField>

              {/* ══ INSTRUCTIONS LIVRAISON — masquées pour digital ══ */}
              <AnimatedField visible={!isDigital}>
                <div className="pb-0.5">
                  <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                    Instructions de livraison
                    <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                  </label>
                  <div className="relative">
                    <StickyNote className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                    <textarea
                      value={instructions}
                      onChange={e => setInstructions(e.target.value)}
                      placeholder="Ex : Appeler avant d'arriver, maison rouge au fond..."
                      rows={2}
                      tabIndex={isDigital ? -1 : 0}
                      className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all resize-none"
                    />
                  </div>
                </div>
              </AnimatedField>

              {/* ══ NOTES — toujours visible ══ */}
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">
                  Notes
                  <span className="text-gray-400 font-normal ml-1">(optionnel)</span>
                </label>
                <div className="relative">
                  <MessageCircle className="absolute left-3 top-3.5 w-4 h-4 text-gray-400" />
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Précision sur votre commande..."
                    rows={2}
                    className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-900 placeholder-gray-400 outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-400 transition-all resize-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => { if (validate()) setEtape("paiement"); }}
              className="w-full h-14 rounded-2xl bg-pink-500 hover:bg-pink-600 text-white font-black text-base transition-all hover:shadow-lg hover:shadow-pink-300/30 active:scale-95 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-5 h-5" /> Continuer vers le paiement
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
            ÉTAPE 2 — PAIEMENT
        ════════════════════════════════════════ */}
        {etape === "paiement" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-5 space-y-4">
              <p className="font-black text-gray-900">
                À payer : <span className="text-pink-600">{formatPrix(total, boutique.devise)}</span>
              </p>

              {produit.paiement_lien && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Payer via le lien sécurisé :</p>
                  <a
                    href={produit.paiement_lien} target="_blank" rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 text-white font-bold text-sm transition-all active:scale-95"
                  >
                    <ExternalLink className="w-4 h-4" /> Procéder au paiement en ligne
                  </a>
                  <p className="text-xs text-gray-400 text-center">Après avoir payé, revenez ici et cliquez sur « J'ai payé »</p>
                </div>
              )}

              {produit.moyens_paiement.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-gray-700">Mobile Money :</p>
                  {produit.moyens_paiement.map((mp, i) => (
                    <button key={i} type="button" onClick={() => setSelectedReseau(selectedReseau === i ? null : i)}
                      className={`w-full flex items-start gap-3 p-4 rounded-2xl border-2 text-left transition-all ${
                        selectedReseau === i ? "border-orange-400 bg-orange-50" : "border-gray-200 bg-gray-50 hover:border-orange-200"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedReseau === i ? "bg-orange-500" : "bg-gray-200"}`}>
                        <MessageSquare className={`w-5 h-5 ${selectedReseau === i ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-sm text-gray-900">{mp.reseau}</p>
                        <p className="text-sm text-gray-600 font-mono mt-0.5">{mp.numero}</p>
                        <p className="text-xs text-gray-400">Au nom de : {mp.nom_titulaire}</p>
                        {selectedReseau === i && (
                          <div className="mt-2 pt-2 border-t border-orange-200">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-500">Montant</span>
                              <span className="font-black text-orange-600">{formatPrix(total, boutique.devise)}</span>
                            </div>
                            {mp.instructions && (
                              <p className="text-xs text-orange-700 bg-orange-100 rounded-xl p-2 mt-2">💬 {mp.instructions}</p>
                            )}
                          </div>
                        )}
                      </div>
                      {selectedReseau === i && <CheckCircle2 className="w-4 h-4 text-orange-500 flex-shrink-0 mt-1" />}
                    </button>
                  ))}
                </div>
              )}

              {produit.paiement_reception && (
                <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                  <Truck className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-emerald-700">Paiement à la livraison</p>
                    <p className="text-xs text-emerald-600 mt-0.5">Vous payez à la réception de votre commande.</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleConfirmer}
              disabled={enregistrement}
              className="w-full h-14 rounded-2xl bg-green-500 hover:bg-green-600 disabled:opacity-60 text-white font-black text-base transition-all hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
            >
              {enregistrement
                ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><CheckCircle2 className="w-5 h-5" /> J'ai payé — Confirmer</>
              }
            </button>
            <button onClick={() => setEtape("formulaire")} className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Retour aux informations
            </button>
          </div>
        )}

        {/* ════════════════════════════════════════
            ÉTAPE 3 — CONFIRMATION
        ════════════════════════════════════════ */}
        {etape === "confirmation" && commande && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl border border-green-200 shadow-sm p-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-9 h-9 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Commande enregistrée !</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Réf : <span className="font-mono font-bold text-gray-700">{commande.numero}</span>
                </p>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                {isDigital
                  ? "Le vendeur va vous contacter pour vous livrer votre produit digital."
                  : "Votre commande a été transmise au vendeur. Vous serez contacté pour la livraison."
                }
              </p>
            </div>

            
            <a href={commande.trackingUrl} className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all">
              <Truck className="w-4 h-4" /> Suivre ma commande
            </a>
            {boutique.whatsapp && (
              <a
                href={`https://wa.me/${boutique.whatsapp.replace(/[^0-9]/g, "")}?text=Bonjour, j'ai passé commande (Réf: ${commande.numero}). Merci de confirmer.`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl font-bold text-white text-sm transition-all active:scale-95"
                style={{ background: "#25D366" }}
              >
                <MessageCircle className="w-4 h-4" /> Contacter le vendeur sur WhatsApp
              </a>
            )}
            <button onClick={() => navigate(`/shop/${slug}`)} className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl border border-gray-200 text-gray-600 font-semibold text-sm hover:border-pink-300 transition-all">
              <ArrowLeft className="w-4 h-4" /> Retour à la boutique
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
