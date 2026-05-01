import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import ThemeVitrineConfig from "@/components/ThemeVitrineConfig";
import PixelFacebookTab, { type PixelConfig } from "@/components/PixelFacebookTab";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  Store, Globe, Facebook, Bell, Save,
  Eye, EyeOff, Image, Phone, Palette, ExternalLink, CheckCircle2
} from "lucide-react";

const PAYS = [
  "Bénin", "Togo", "Côte d'Ivoire", "Sénégal", "Mali",
  "Burkina Faso", "Niger", "Guinée", "Cameroun", "Ghana",
  "Nigeria", "France", "États-Unis", "Canada", "Autre"
];

const DEVISES = [
  { code: "XOF", symbole: "FCFA",  label: "XOF — Franc CFA (UEMOA)" },
  { code: "XAF", symbole: "FCFA",  label: "XAF — Franc CFA (CEMAC)" },
  { code: "GHS", symbole: "₵",     label: "GHS — Cédi ghanéen" },
  { code: "NGN", symbole: "₦",     label: "NGN — Naira nigérian" },
  { code: "KES", symbole: "KSh",   label: "KES — Shilling kényan" },
  { code: "TZS", symbole: "TSh",   label: "TZS — Shilling tanzanien" },
  { code: "UGX", symbole: "USh",   label: "UGX — Shilling ougandais" },
  { code: "RWF", symbole: "RF",    label: "RWF — Franc rwandais" },
  { code: "GNF", symbole: "GNF",   label: "GNF — Franc guinéen" },
  { code: "CDF", symbole: "FC",    label: "CDF — Franc congolais" },
  { code: "MAD", symbole: "MAD",   label: "MAD — Dirham marocain" },
  { code: "GMD", symbole: "GMD",   label: "GMD — Dalasi gambien" },
  { code: "SLL", symbole: "SLL",   label: "SLL — Leone sierra-léonais" },
  { code: "LRD", symbole: "L$",    label: "LRD — Dollar libérien" },
  { code: "MZN", symbole: "MT",    label: "MZN — Metical mozambicain" },
  { code: "ZMW", symbole: "ZMW",   label: "ZMW — Kwacha zambien" },
  { code: "USD", symbole: "$",     label: "USD — Dollar américain" },
  { code: "EUR", symbole: "€",     label: "EUR — Euro" },
];

const TABS = [
  { id: "general",       label: "Général",         icon: Store    },
  { id: "apparence",     label: "Apparence",       icon: Palette  },
  { id: "pixel",         label: "Facebook Pixel",  icon: Facebook },
  { id: "notifications", label: "Notifications",   icon: Bell     },
];

interface Boutique {
  id?: string; user_id?: string;
  nom: string; slug: string; description: string;
  logo_url: string; banniere_url: string;
  email: string; whatsapp: string; telephone: string;
  adresse: string; pays: string; ville: string; devise: string;
  pixel_facebook_id: string; pixel_actif: boolean;
  pixels_config?: PixelConfig[] | null;
  api_conversion_token: string; api_conversion_actif: boolean;
  domaine_personnalise: string; domaine_actif: boolean;
  notifications_actives: boolean; actif: boolean;
  theme_couleur_principale: string; theme_couleur_secondaire: string;
  theme_style: string; theme_fond: string; theme_police: string;
}

const defaultBoutique: Boutique = {
  nom: "", slug: "", description: "",
  logo_url: "", banniere_url: "",
  email: "", whatsapp: "", telephone: "",
  adresse: "", pays: "Bénin", ville: "", devise: "XOF",
  pixel_facebook_id: "", pixel_actif: false,
  pixels_config: [],
  api_conversion_token: "", api_conversion_actif: false,
  domaine_personnalise: "", domaine_actif: false,
  notifications_actives: true, actif: true,
    theme_couleur_principale: "#FF1A00", theme_couleur_secondaire: "#305CDE",
    theme_style: "moderne", theme_fond: "blanc", theme_police: "inter",
};

// Classes communes réutilisables
const inputCls = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
const selectCls = "w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm";
const cardCls = "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm space-y-5";
const labelCls = "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5";
const sectionTitleCls = "font-bold text-sm text-[#FF1A00] dark:text-[#FF1A00] uppercase tracking-wide pb-1 border-b border-[#FF1A00] dark:border-[#FF1A00]/50";

export default function BoutiqueParametresPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileLogoRef     = useRef<HTMLInputElement>(null);
  const fileBanniereRef = useRef<HTMLInputElement>(null);

  const [boutique, setBoutique]               = useState<Boutique>(defaultBoutique);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [activeTab, setActiveTab]             = useState("general");
  const [showToken, setShowToken]             = useState(false);
  const [uploadingLogo, setUploadingLogo]     = useState(false);
  const [uploadingBanniere, setUploadingBanniere] = useState(false);
  const [justCreated, setJustCreated]         = useState(false);

  const currentUser = getNexoraUser();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("boutiques" as any).select("*")
      .eq("user_id", currentUser?.id).limit(1).maybeSingle();
    if (data) setBoutique({ ...defaultBoutique, ...(data as any) });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const genSlug = (nom: string) =>
    nom.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const handleUpload = async (
    file: File,
    field: "logo_url" | "banniere_url",
    setUploading: (v: boolean) => void
  ) => {
    setUploading(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `boutique/${field}_${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("mes-secrets-media").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
      setBoutique(prev => ({ ...prev, [field]: urlData.publicUrl }));
      toast({ title: "Image uploadée !" });
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const handleSave = async () => {
    if (!boutique.nom || !boutique.email) {
      toast({ title: "Nom et email obligatoires", variant: "destructive" }); return;
    }
    if (!currentUser?.id) {
      toast({ title: "Utilisateur non connecté", variant: "destructive" }); return;
    }
    setSaving(true);
    const isCreation = !boutique.id;
    const payload = { ...boutique, user_id: currentUser.id, slug: boutique.slug || genSlug(boutique.nom) };
    let error;
    if (boutique.id) {
      ({ error } = await supabase.from("boutiques" as any).update(payload).eq("id", boutique.id));
    } else {
      const { error: err, data } = await supabase.from("boutiques" as any).insert(payload).select().single();
      error = err;
      if (data) setBoutique({ ...boutique, id: (data as any).id, user_id: currentUser.id });
    }
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      if (isCreation) {
        // Nouvelle boutique — afficher la bannière de succès avec lien
        setJustCreated(true);
        toast({ title: "Boutique créée avec succès ! 🎉" });
      } else {
        toast({ title: "Boutique sauvegardée !" });
      }
      load();
    }
    setSaving(false);
  };

  if (loading) return (
    <BoutiqueLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#FF1A00] border-t-transparent rounded-full animate-spin" />
      </div>
    </BoutiqueLayout>
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom || "Ma Boutique"} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* ── Bannière succès création ── */}
        {justCreated && boutique.slug && (
          <div className="rounded-2xl bg-gradient-to-r from-[#008000] to-[#305CDE] p-5 text-white shadow-lg flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
              <div>
                <p className="font-bold text-base">Boutique créée avec succès 🎉</p>
                <p className="text-sm text-[#008000] mt-0.5">Votre boutique est en ligne et prête à recevoir des commandes.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate(`/shop/${boutique.slug}`)}
                className="flex-1 bg-white text-[#008000] hover:bg-green-50 font-bold gap-2 h-10"
              >
                <ExternalLink className="w-4 h-4" />
                Voir ma boutique
              </Button>
              <button
                onClick={() => setJustCreated(false)}
                className="px-4 py-2 rounded-xl border border-white/40 text-sm text-white hover:bg-white/10 transition"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Paramètres</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configurez votre boutique</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}
              className="bg-[#FF1A00] hover:bg-[#FF1A00] text-white gap-1">
              <Save className="w-4 h-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Statut boutique */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${boutique.actif ? "bg-[#008000]" : "bg-red-400"}`} />
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Boutique {boutique.actif ? "active" : "inactive"}
            </span>
          </div>
          <button onClick={() => setBoutique(prev => ({ ...prev, actif: !prev.actif }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${boutique.actif ? "bg-[#008000]" : "bg-gray-300 dark:bg-gray-600"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.actif ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-[#1D4ED8] text-white shadow"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-[#1D4ED8] dark:hover:border-[#1D4ED8]"
              }`}>
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB Général ── */}
        {activeTab === "general" && (
          <div className="space-y-4">
            <div className={cardCls}>
              <p className={sectionTitleCls}>Informations générales</p>
              <div>
                <label className={labelCls}>Nom de la boutique *</label>
                <Input value={boutique.nom}
                  onChange={e => setBoutique(prev => ({ ...prev, nom: e.target.value, slug: genSlug(e.target.value) }))}
                  placeholder="Ma Super Boutique" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>URL de la boutique</label>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-2 rounded-md whitespace-nowrap">/shop/</span>
                  <Input value={boutique.slug}
                    onChange={e => setBoutique(prev => ({ ...prev, slug: genSlug(e.target.value) }))}
                    placeholder="ma-boutique" className={`flex-1 ${inputCls}`} />
                </div>
                {boutique.slug && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Votre vitrine : <span className="text-[#FF1A00] font-medium">/shop/{boutique.slug}</span>
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea value={boutique.description}
                  onChange={e => setBoutique(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Décrivez votre boutique..."
                  className={`mt-1 w-full h-20 px-3 py-2 rounded-md border text-sm resize-none ${inputCls}`} />
              </div>
              <div>
                <label className={labelCls}>Devise</label>
                <select value={boutique.devise}
                  onChange={e => setBoutique(prev => ({ ...prev, devise: e.target.value }))}
                  className={selectCls}>
                  {DEVISES.map(d => <option key={d.code} value={d.code}>{d.label} ({d.symbole})</option>)}
                </select>
              </div>
            </div>

            {/* Images */}
            <div className={cardCls}>
              <p className={sectionTitleCls}>Images</p>
              <div>
                <label className={labelCls}>Logo de la boutique</label>
                <div className="mt-2 flex items-center gap-3">
                  {boutique.logo_url ? (
                    <img src={boutique.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-cover border border-gray-200 dark:border-gray-700" />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <Store className="w-6 h-6 text-gray-300 dark:text-gray-500" />
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <input ref={fileLogoRef} type="file" accept="image/*" className="hidden"
                      onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "logo_url", setUploadingLogo)} />
                    <Button type="button" variant="outline" size="sm"
                      onClick={() => fileLogoRef.current?.click()}
                      disabled={uploadingLogo}
                      className="w-full gap-1 border-[#1D4ED8] text-[#1D4ED8] dark:border-[#1D4ED8] dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600">
                      <Image className="w-3 h-3" />
                      {uploadingLogo ? "Upload..." : "Choisir logo"}
                    </Button>
                    <Input value={boutique.logo_url}
                      onChange={e => setBoutique(prev => ({ ...prev, logo_url: e.target.value }))}
                      placeholder="ou URL du logo" className={`text-xs h-8 ${inputCls}`} />
                  </div>
                </div>
              </div>
              <div>
                <label className={labelCls}>Bannière</label>
                <div className="mt-2 space-y-2">
                  {boutique.banniere_url && (
                    <img src={boutique.banniere_url} alt="Bannière" className="w-full h-24 object-cover rounded-xl border border-gray-200 dark:border-gray-700" />
                  )}
                  <input ref={fileBanniereRef} type="file" accept="image/*" className="hidden"
                    onChange={e => e.target.files?.[0] && handleUpload(e.target.files[0], "banniere_url", setUploadingBanniere)} />
                  <Button type="button" variant="outline" size="sm"
                    onClick={() => fileBanniereRef.current?.click()}
                    disabled={uploadingBanniere}
                    className="w-full gap-1 border-[#1D4ED8] text-[#1D4ED8] dark:border-[#1D4ED8] dark:bg-gray-700 dark:text-blue-300 dark:hover:bg-gray-600">
                    <Image className="w-3 h-3" />
                    {uploadingBanniere ? "Upload..." : "Choisir bannière"}
                  </Button>
                  <Input value={boutique.banniere_url}
                    onChange={e => setBoutique(prev => ({ ...prev, banniere_url: e.target.value }))}
                    placeholder="ou URL de la bannière" className={`text-xs h-8 ${inputCls}`} />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className={cardCls}>
              <p className={sectionTitleCls}>Contact vendeur</p>
              <div>
                <label className={labelCls}>Email *</label>
                <Input type="email" value={boutique.email}
                  onChange={e => setBoutique(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@maboutique.com" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>WhatsApp</label>
                  <div className="flex gap-1 mt-1">
                    <Phone className="w-4 h-4 text-gray-400 mt-2.5 flex-shrink-0" />
                    <Input value={boutique.whatsapp}
                      onChange={e => setBoutique(prev => ({ ...prev, whatsapp: e.target.value }))}
                      placeholder="+229..." className={inputCls} />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Téléphone</label>
                  <div className="flex gap-1 mt-1">
                    <Phone className="w-4 h-4 text-gray-400 mt-2.5 flex-shrink-0" />
                    <Input value={boutique.telephone}
                      onChange={e => setBoutique(prev => ({ ...prev, telephone: e.target.value }))}
                      placeholder="+229..." className={inputCls} />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Pays</label>
                  <select value={boutique.pays}
                    onChange={e => setBoutique(prev => ({ ...prev, pays: e.target.value }))}
                    className={selectCls}>
                    {PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Ville</label>
                  <Input value={boutique.ville}
                    onChange={e => setBoutique(prev => ({ ...prev, ville: e.target.value }))}
                    placeholder="Cotonou" className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <Input value={boutique.adresse}
                  onChange={e => setBoutique(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Adresse complète" className={inputCls} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB Pixel Facebook ── */}
        {activeTab === "pixel" && (
          <PixelFacebookTab
            boutiqueId={boutique.id}
            initialPixels={(boutique as any).pixels_config || []}
            onChange={(pixels) => setBoutique(prev => ({ ...prev, pixels_config: pixels } as any))}
          />
        )}

        {/* ── TAB Domaine ── */}
        {activeTab === "domaine" && (
          <div className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#FF1A00]" />
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Domaine personnalisé</p>
              </div>
              <div className="bg-[#FF1A00]/5 dark:bg-[#FF1A00]/20 border border-[#FF1A00] dark:border-[#FF1A00] rounded-xl p-3">
                <p className="text-xs font-semibold text-[#FF1A00] dark:text-[#FF1A00] mb-1">URL actuelle :</p>
                <p className="text-sm font-mono text-[#FF1A00] dark:text-[#FF1A00] break-all">
                  https://budget-and-vault.vercel.app/shop/{boutique.slug || "votre-slug"}
                </p>
              </div>
              <div>
                <label className={labelCls}>Votre domaine</label>
                <Input value={boutique.domaine_personnalise}
                  onChange={e => setBoutique(prev => ({ ...prev, domaine_personnalise: e.target.value }))}
                  placeholder="www.maboutique.com" className={`font-mono ${inputCls}`} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Activer le domaine</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Après configuration DNS</p>
                </div>
                <button onClick={() => setBoutique(prev => ({ ...prev, domaine_actif: !prev.domaine_actif }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.domaine_actif ? "bg-[#008000]" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.domaine_actif ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">Configuration DNS :</p>
                <ol className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Achetez votre domaine (Namecheap, GoDaddy...)</li>
                  <li>Allez dans la gestion DNS</li>
                  <li>Ajoutez un enregistrement CNAME :</li>
                </ol>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 font-mono text-xs space-y-0.5">
                  <p><span className="text-[#FF1A00]">Type :</span> <span className="text-gray-700 dark:text-gray-200">CNAME</span></p>
                  <p><span className="text-[#FF1A00]">Nom :</span> <span className="text-gray-700 dark:text-gray-200">www</span></p>
                  <p><span className="text-[#FF1A00]">Valeur :</span> <span className="text-gray-700 dark:text-gray-200">cname.vercel-dns.com</span></p>
                  <p><span className="text-[#FF1A00]">TTL :</span> <span className="text-gray-700 dark:text-gray-200">Auto</span></p>
                </div>
                <ol start={4} className="text-xs text-gray-500 dark:text-gray-400 space-y-1 list-decimal list-inside">
                  <li>Ajoutez le domaine dans Vercel → Settings → Domains</li>
                  <li>Activez ici et sauvegardez</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB Notifications ── */}
        {activeTab === "notifications" && (
          <div className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-[#FF1A00]" />
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Notifications Push</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Recevez une notification sur votre téléphone dès qu'une commande arrive.
              </p>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Activer les notifications</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Nouvelles commandes en temps réel</p>
                </div>
                <button onClick={() => setBoutique(prev => ({ ...prev, notifications_actives: !prev.notifications_actives }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.notifications_actives ? "bg-[#008000]" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.notifications_actives ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <Button className="w-full bg-[#1D4ED8] hover:bg-[#1B44B8] text-white gap-2"
                onClick={async () => {
                  try {
                    const permission = await Notification.requestPermission();
                    if (permission === "granted") {
                      toast({ title: "Notifications activées !" });
                    } else {
                      toast({ title: "Permission refusée", variant: "destructive" });
                    }
                  } catch {
                    toast({ title: "Non supporté sur cet appareil", variant: "destructive" });
                  }
                }}>
                <Bell className="w-4 h-4" />
                Activer sur cet appareil
              </Button>
              <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Sur mobile :</p>
                <ol className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1 list-decimal list-inside">
                  <li>Ouvrez la boutique dans Chrome</li>
                  <li>Cliquez "Ajouter à l'écran d'accueil"</li>
                  <li>Cliquez le bouton ci-dessus</li>
                  <li>Vous recevrez les alertes même écran fermé</li>
                </ol>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB Apparence ── */}
        {activeTab === "apparence" && (
          <ThemeVitrineConfig
            boutique={boutique}
            onChange={(updates) => setBoutique(prev => ({ ...prev, ...updates }))}
          />
        )}

        {/* Bouton sauvegarder bas */}
        <Button onClick={handleSave} disabled={saving}
          className="w-full bg-[#1D4ED8] hover:bg-[#1B44B8] text-white py-3 text-base font-bold gap-2">
          <Save className="w-5 h-5" />
          {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
        </Button>

      </div>
    </BoutiqueLayout>
  );
}
