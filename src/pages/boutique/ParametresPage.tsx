import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  Store, Globe, Facebook, Bell, Save,
  Eye, EyeOff, Image, Phone
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
  { id: "pixel",         label: "Facebook Pixel",  icon: Facebook },
  { id: "domaine",       label: "Domaine",         icon: Globe    },
  { id: "notifications", label: "Notifications",   icon: Bell     },
];

interface Boutique {
  id?: string; user_id?: string;
  nom: string; slug: string; description: string;
  logo_url: string; banniere_url: string;
  email: string; whatsapp: string; telephone: string;
  adresse: string; pays: string; ville: string; devise: string;
  pixel_facebook_id: string; pixel_actif: boolean;
  api_conversion_token: string; api_conversion_actif: boolean;
  domaine_personnalise: string; domaine_actif: boolean;
  notifications_actives: boolean; actif: boolean;
}

const defaultBoutique: Boutique = {
  nom: "", slug: "", description: "",
  logo_url: "", banniere_url: "",
  email: "", whatsapp: "", telephone: "",
  adresse: "", pays: "Bénin", ville: "", devise: "XOF",
  pixel_facebook_id: "", pixel_actif: false,
  api_conversion_token: "", api_conversion_actif: false,
  domaine_personnalise: "", domaine_actif: false,
  notifications_actives: true, actif: true,
};

// Classes communes réutilisables
const inputCls = "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
const selectCls = "w-full h-10 px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm";
const cardCls = "bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm space-y-4";
const labelCls = "text-sm font-medium text-gray-700 dark:text-gray-300";

export default function BoutiqueParametresPage() {
  const { toast } = useToast();
  const fileLogoRef     = useRef<HTMLInputElement>(null);
  const fileBanniereRef = useRef<HTMLInputElement>(null);

  const [boutique, setBoutique]               = useState<Boutique>(defaultBoutique);
  const [loading, setLoading]                 = useState(true);
  const [saving, setSaving]                   = useState(false);
  const [activeTab, setActiveTab]             = useState("general");
  const [showToken, setShowToken]             = useState(false);
  const [uploadingLogo, setUploadingLogo]     = useState(false);
  const [uploadingBanniere, setUploadingBanniere] = useState(false);

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
      toast({ title: "Boutique sauvegardée !" });
      load();
    }
    setSaving(false);
  };

  if (loading) return (
    <BoutiqueLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </BoutiqueLayout>
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom || "Ma Boutique"} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Paramètres</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Configurez votre boutique</p>
          </div>
          <div className="flex gap-2">
            {boutique.slug && (
              <a href={`/shop/${boutique.slug}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <Eye className="w-4 h-4" /> Voir
              </a>
            )}
            <Button onClick={handleSave} disabled={saving}
              className="bg-pink-500 hover:bg-pink-600 text-white gap-1">
              <Save className="w-4 h-4" />
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
          </div>
        </div>

        {/* Statut boutique */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${boutique.actif ? "bg-green-500" : "bg-red-400"}`} />
            <span className="font-medium text-sm text-gray-700 dark:text-gray-300">
              Boutique {boutique.actif ? "active" : "inactive"}
            </span>
          </div>
          <button onClick={() => setBoutique(prev => ({ ...prev, actif: !prev.actif }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${boutique.actif ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.actif ? "left-7" : "left-1"}`} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                activeTab === tab.id
                  ? "bg-pink-500 text-white shadow"
                  : "bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-pink-300 dark:hover:border-pink-600"
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
              <p className="font-semibold text-sm text-pink-600 dark:text-pink-400">Informations générales</p>
              <div>
                <label className={labelCls}>Nom de la boutique *</label>
                <Input value={boutique.nom}
                  onChange={e => setBoutique(prev => ({ ...prev, nom: e.target.value, slug: genSlug(e.target.value) }))}
                  placeholder="Ma Super Boutique" className={`mt-1 ${inputCls}`} />
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
                    Votre vitrine : <span className="text-pink-500 font-medium">/shop/{boutique.slug}</span>
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
                  className={`mt-1 ${selectCls}`}>
                  {DEVISES.map(d => <option key={d.code} value={d.code}>{d.label} ({d.symbole})</option>)}
                </select>
              </div>
            </div>

            {/* Images */}
            <div className={cardCls}>
              <p className="font-semibold text-sm text-pink-600 dark:text-pink-400">Images</p>
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
                      className="w-full gap-1 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
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
                    className="w-full gap-1 border-gray-200 dark:border-gray-700 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
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
              <p className="font-semibold text-sm text-pink-600 dark:text-pink-400">Contact vendeur</p>
              <div>
                <label className={labelCls}>Email *</label>
                <Input type="email" value={boutique.email}
                  onChange={e => setBoutique(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="contact@maboutique.com" className={`mt-1 ${inputCls}`} />
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
                    className={`mt-1 ${selectCls}`}>
                    {PAYS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Ville</label>
                  <Input value={boutique.ville}
                    onChange={e => setBoutique(prev => ({ ...prev, ville: e.target.value }))}
                    placeholder="Cotonou" className={`mt-1 ${inputCls}`} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Adresse</label>
                <Input value={boutique.adresse}
                  onChange={e => setBoutique(prev => ({ ...prev, adresse: e.target.value }))}
                  placeholder="Adresse complète" className={`mt-1 ${inputCls}`} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB Pixel Facebook ── */}
        {activeTab === "pixel" && (
          <div className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-2">
                <Facebook className="w-5 h-5 text-blue-600" />
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Pixel Facebook</p>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Suivez les visites, ajouts au panier et achats sur votre boutique.</p>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Activer le Pixel</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Tracking navigateur</p>
                </div>
                <button onClick={() => setBoutique(prev => ({ ...prev, pixel_actif: !prev.pixel_actif }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.pixel_actif ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.pixel_actif ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div>
                <label className={labelCls}>ID Pixel Facebook</label>
                <Input value={boutique.pixel_facebook_id}
                  onChange={e => setBoutique(prev => ({ ...prev, pixel_facebook_id: e.target.value }))}
                  placeholder="123456789012345" className={`mt-1 font-mono ${inputCls}`} />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Trouvez-le dans Facebook Events Manager</p>
              </div>
            </div>

            <div className={cardCls}>
              <p className="font-semibold text-sm text-blue-700 dark:text-blue-400">API Conversions</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Plus fiable que le Pixel — contourne les bloqueurs de publicité.</p>
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Activer l'API Conversions</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Tracking serveur</p>
                </div>
                <button onClick={() => setBoutique(prev => ({ ...prev, api_conversion_actif: !prev.api_conversion_actif }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.api_conversion_actif ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.api_conversion_actif ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <div>
                <label className={labelCls}>Token d'accès API</label>
                <div className="flex gap-2 mt-1">
                  <Input type={showToken ? "text" : "password"}
                    value={boutique.api_conversion_token}
                    onChange={e => setBoutique(prev => ({ ...prev, api_conversion_token: e.target.value }))}
                    placeholder="EAAxxxxxxxx..." className={`font-mono flex-1 ${inputCls}`} />
                  <button onClick={() => setShowToken(!showToken)}
                    className="px-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-950/40 border border-yellow-200 dark:border-yellow-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-300 mb-1">Événements trackés :</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-0.5">
                  <li>• <strong>PageView</strong> — visite boutique</li>
                  <li>• <strong>ViewContent</strong> — vue produit</li>
                  <li>• <strong>AddToCart</strong> — ajout panier</li>
                  <li>• <strong>InitiateCheckout</strong> — début commande</li>
                  <li>• <strong>Purchase</strong> — commande confirmée</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB Domaine ── */}
        {activeTab === "domaine" && (
          <div className="space-y-4">
            <div className={cardCls}>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-pink-500" />
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-100">Domaine personnalisé</p>
              </div>
              <div className="bg-pink-50 dark:bg-pink-950/40 border border-pink-100 dark:border-pink-900 rounded-xl p-3">
                <p className="text-xs font-semibold text-pink-700 dark:text-pink-400 mb-1">URL actuelle :</p>
                <p className="text-sm font-mono text-pink-600 dark:text-pink-400 break-all">
                  https://budget-and-vault.vercel.app/shop/{boutique.slug || "votre-slug"}
                </p>
              </div>
              <div>
                <label className={labelCls}>Votre domaine</label>
                <Input value={boutique.domaine_personnalise}
                  onChange={e => setBoutique(prev => ({ ...prev, domaine_personnalise: e.target.value }))}
                  placeholder="www.maboutique.com" className={`mt-1 font-mono ${inputCls}`} />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div>
                  <p className="font-medium text-sm text-gray-800 dark:text-gray-100">Activer le domaine</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Après configuration DNS</p>
                </div>
                <button onClick={() => setBoutique(prev => ({ ...prev, domaine_actif: !prev.domaine_actif }))}
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.domaine_actif ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
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
                  <p><span className="text-pink-500">Type :</span> <span className="text-gray-700 dark:text-gray-200">CNAME</span></p>
                  <p><span className="text-pink-500">Nom :</span> <span className="text-gray-700 dark:text-gray-200">www</span></p>
                  <p><span className="text-pink-500">Valeur :</span> <span className="text-gray-700 dark:text-gray-200">cname.vercel-dns.com</span></p>
                  <p><span className="text-pink-500">TTL :</span> <span className="text-gray-700 dark:text-gray-200">Auto</span></p>
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
                <Bell className="w-5 h-5 text-pink-500" />
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
                  className={`relative w-12 h-6 rounded-full transition-colors ${boutique.notifications_actives ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"}`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${boutique.notifications_actives ? "left-7" : "left-1"}`} />
                </button>
              </div>
              <Button className="w-full bg-pink-500 hover:bg-pink-600 text-white gap-2"
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

        {/* Bouton sauvegarder bas */}
        <Button onClick={handleSave} disabled={saving}
          className="w-full bg-pink-500 hover:bg-pink-600 text-white py-3 text-base font-bold gap-2">
          <Save className="w-5 h-5" />
          {saving ? "Sauvegarde..." : "Sauvegarder les paramètres"}
        </Button>

      </div>
    </BoutiqueLayout>
  );
}
