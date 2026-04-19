import { useState, useEffect, useCallback, useRef } from "react";
import AppLayout from "@/components/AppLayout";
import {
  Link2, Plus, ChevronDown, Copy, Check, X, Download,
  Loader2, AlertCircle, Search, Globe,
  BadgeCheck, Phone, User, RefreshCw, Wallet, TrendingUp,
  Trash2, Share2, Eye, MoreVertical, Clock,
  CheckCircle2, XCircle, Banknote, Bold,
  Zap, QrCode, Calendar, ArrowLeft,
  ChevronRight, Info, ShieldCheck, ImageIcon,
  ExternalLink, Sparkles, BarChart3,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

const LOGO_URL = "https://i.postimg.cc/c1QgbZsG/ei_1773937801458_removebg_preview.png";
const APP_URL = window.location.origin;

// ─── Pays & réseaux ──────────────────────────────────────────────
const COUNTRIES = [
  { code: "BJ", flag: "🇧🇯", name: "Bénin",         currency: "XOF", networks: ["MTN MoMo", "Moov Money"] },
  { code: "CI", flag: "🇨🇮", name: "Côte d'Ivoire", currency: "XOF", networks: ["Orange Money", "MTN MoMo", "Wave", "Moov Money"] },
  { code: "TG", flag: "🇹🇬", name: "Togo",           currency: "XOF", networks: ["Flooz", "T-Money"] },
  { code: "SN", flag: "🇸🇳", name: "Sénégal",        currency: "XOF", networks: ["Orange Money", "Wave", "Free Money"] },
  { code: "NE", flag: "🇳🇪", name: "Niger",          currency: "XOF", networks: ["Airtel Money", "Moov Money"] },
  { code: "ML", flag: "🇲🇱", name: "Mali",           currency: "XOF", networks: ["Orange Money", "Moov Money", "Wave"] },
  { code: "BF", flag: "🇧🇫", name: "Burkina Faso",   currency: "XOF", networks: ["Orange Money", "Moov Money"] },
  { code: "GN", flag: "🇬🇳", name: "Guinée",         currency: "GNF", networks: ["Orange Money", "MTN MoMo"] },
  { code: "CM", flag: "🇨🇲", name: "Cameroun",       currency: "XAF", networks: ["MTN MoMo", "Orange Money"] },
  { code: "CD", flag: "🇨🇩", name: "RD Congo",       currency: "CDF", networks: ["Vodacom", "Airtel Money"] },
  { code: "GA", flag: "🇬🇦", name: "Gabon",          currency: "XAF", networks: ["Airtel Money", "MTN MoMo"] },
  { code: "CG", flag: "🇨🇬", name: "Congo",          currency: "XAF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "GH", flag: "🇬🇭", name: "Ghana",          currency: "GHS", networks: ["MTN MoMo", "Vodafone Cash", "AirtelTigo Money"] },
  { code: "NG", flag: "🇳🇬", name: "Nigéria",        currency: "NGN", networks: ["MTN MoMo", "Airtel Money", "Glo Pay"] },
  { code: "KE", flag: "🇰🇪", name: "Kenya",          currency: "KES", networks: ["M-Pesa", "Airtel Money"] },
  { code: "TZ", flag: "🇹🇿", name: "Tanzanie",       currency: "TZS", networks: ["M-Pesa", "Tigo Pesa", "Airtel Money"] },
  { code: "UG", flag: "🇺🇬", name: "Ouganda",        currency: "UGX", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "RW", flag: "🇷🇼", name: "Rwanda",         currency: "RWF", networks: ["MTN MoMo", "Airtel Money"] },
  { code: "MA", flag: "🇲🇦", name: "Maroc",          currency: "MAD", networks: ["Orange Money", "Maroc Telecom"] },
  { code: "GM", flag: "🇬🇲", name: "Gambie",         currency: "GMD", networks: ["Africell Money", "QCell"] },
  { code: "SL", flag: "🇸🇱", name: "Sierra Leone",   currency: "SLL", networks: ["Orange Money", "Africell Money"] },
  { code: "LR", flag: "🇱🇷", name: "Liberia",        currency: "LRD", networks: ["MTN MoMo", "Lonestar Money"] },
  { code: "MZ", flag: "🇲🇿", name: "Mozambique",     currency: "MZN", networks: ["M-Pesa", "Airtel Money"] },
  { code: "ZM", flag: "🇿🇲", name: "Zambie",         currency: "ZMW", networks: ["MTN MoMo", "Airtel Money"] },
];

const CURRENCIES = ["XOF", "XAF", "EUR", "USD", "GBP", "GHS", "NGN", "KES", "MAD"];
const FRAIS_RETRAIT = 0.07;

// ─── Utilitaires sécurisés ────────────────────────────────────────
const fmtNum = (n: number, currency = "FCFA") =>
  new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " " + currency;

function genSlug(name: string): string {
  return name.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function genId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function sanitizeHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/<iframe[\s\S]*?>/gi, "")
    .trim();
}

function isValidHttpsUrl(url: string): boolean {
  if (!url) return false;
  try { return new URL(url).protocol === "https:"; }
  catch { return false; }
}

// ─── Types ────────────────────────────────────────────────────────
type PayLink = {
  id: string; slug: string; nom_produit: string; montant: number;
  devise: string; description: string; image_url?: string;
  accept_mobile_money: boolean; accept_carte: boolean; url: string;
  created_at: string; total_collected: number; payment_count: number;
  statut: "actif" | "inactif"; redirect_url?: string;
  redirect_url_failed?: string; montant_modifiable?: boolean;
  expiration_date?: string;
};

type Payment = {
  id: string; paylink_id: string; paylink_nom: string; client_nom: string;
  client_telephone: string; pays: string; pays_flag: string; reseau: string;
  montant: number; devise: string; statut: "success" | "pending" | "failed";
  created_at: string; reference: string;
};

type Withdrawal = {
  id: string; montant: number; frais: number; montant_net: number;
  nom: string; pays: string; reseau: string; telephone: string;
  statut: "pending" | "completed" | "failed"; created_at: string;
};

// ─── CountrySelector ─────────────────────────────────────────────
function CountrySelector({ selected, onSelect }: {
  selected: typeof COUNTRIES[0] | null;
  onSelect: (c: typeof COUNTRIES[0]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = COUNTRIES.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-muted/60 border border-border rounded-xl hover:border-violet-400 transition-colors text-left">
        {selected
          ? <><span className="text-xl">{selected.flag}</span><span className="font-semibold text-sm flex-1">{selected.name}</span></>
          : <span className="text-muted-foreground text-sm flex-1">Sélectionner un pays...</span>}
        <ChevronDown className="w-4 h-4 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un pays..."
                className="w-full pl-9 pr-3 py-2 bg-muted rounded-lg text-sm outline-none" autoFocus />
            </div>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-4">Aucun résultat</p>
              : filtered.map(c => (
                <button key={c.code} type="button"
                  onClick={() => { onSelect(c); setOpen(false); setSearch(""); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/70 transition-colors text-left">
                  <span className="text-xl">{c.flag}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.networks.join(" · ")}</p>
                  </div>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Éditeur texte riche — Gras uniquement ───────────────────────
function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [showPreview, setShowPreview] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (ref.current && !initialized.current) {
      ref.current.innerHTML = value;
      initialized.current = true;
    }
  }, []);

  const exec = (cmd: string, val?: string) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val ?? undefined);
    if (ref.current) onChange(sanitizeHtml(ref.current.innerHTML));
  };

  return (
    <div className="space-y-1.5">
      <div className="border border-border rounded-xl overflow-hidden focus-within:border-violet-400 transition-colors">
        {/* Toolbar — Gras uniquement */}
        <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/40">
          <button type="button"
            onMouseDown={e => { e.preventDefault(); exec("bold"); }}
            title="Gras"
            className="w-7 h-7 flex items-center justify-center rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground">
            <Bold className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-border mx-1" />
          <button type="button"
            onMouseDown={e => { e.preventDefault(); exec("removeFormat"); }}
            className="text-[10px] font-bold px-2 h-6 rounded hover:bg-accent transition-colors text-muted-foreground">
            Aa
          </button>
          <div className="flex-1" />
          <button type="button" onClick={() => setShowPreview(v => !v)}
            className={`text-[10px] font-bold px-2 h-6 rounded transition-colors ${showPreview ? "bg-violet-500/20 text-violet-500" : "hover:bg-accent text-muted-foreground"}`}>
            {showPreview ? "Éditer" : "Aperçu"}
          </button>
        </div>

        {showPreview
          ? <div className="min-h-[90px] px-4 py-3 text-sm text-foreground bg-muted/20"
              style={{ direction: "ltr", textAlign: "left" }}
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }} />
          : <div ref={ref} contentEditable suppressContentEditableWarning
              onInput={() => ref.current && onChange(sanitizeHtml(ref.current.innerHTML))}
              dir="ltr"
              className="min-h-[90px] px-4 py-3 text-sm text-foreground outline-none"
              style={{ direction: "ltr", unicodeBidi: "plaintext", textAlign: "left" }} />
        }
      </div>
      <p className="text-[10px] text-muted-foreground">
        Gras disponible · Cliquez "Aperçu" pour voir le rendu final
      </p>
    </div>
  );
}

// ─── Champ image + aide Postimages ───────────────────────────────
function ImageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [imgState, setImgState] = useState<"idle" | "loading" | "ok" | "error">("idle");

  const checkImage = (url: string) => {
    if (!url) { setImgState("idle"); return; }
    setImgState("loading");
    const img = new Image();
    img.onload = () => setImgState("ok");
    img.onerror = () => setImgState("error");
    img.src = url;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-foreground flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-violet-400" />
        Image du produit
        <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-normal">optionnel</span>
      </label>

      <div className="bg-gradient-to-r from-violet-500/5 to-indigo-500/5 border border-violet-500/20 rounded-xl p-3 space-y-1">
        <p className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
          <Sparkles className="w-3 h-3" /> Hébergez votre image gratuitement
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Allez sur{" "}
          <a href="https://postimages.org/fr/" target="_blank" rel="noopener noreferrer"
            className="text-violet-400 hover:text-violet-300 font-semibold underline inline-flex items-center gap-0.5">
            postimages.org <ExternalLink className="w-3 h-3" />
          </a>
          {" "}→ Créez un compte → Téléversez → Copiez le <strong>lien direct</strong> ci-dessous.
        </p>
      </div>

      <div className="relative">
        <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={value}
          onChange={e => {
            const v = e.target.value.trim().slice(0, 500);
            onChange(v);
            clearTimeout((window as any).__imgTimer);
            (window as any).__imgTimer = setTimeout(() => checkImage(v), 700);
          }}
          placeholder="https://i.postimg.cc/votre-image.jpg"
          className={`w-full pl-10 pr-10 py-3 bg-muted/60 border rounded-xl outline-none focus:border-violet-400 transition-colors text-sm font-mono
            ${imgState === "ok" ? "border-emerald-400" : imgState === "error" ? "border-amber-400" : "border-border"}`} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {imgState === "loading" && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          {imgState === "ok" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {imgState === "error" && <AlertCircle className="w-4 h-4 text-amber-400" />}
        </div>
      </div>

      {imgState === "error" && (
        <p className="text-xs text-amber-500 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Image introuvable. Vérifiez que c'est un lien direct (.jpg .png .webp).
        </p>
      )}

      {value && imgState === "ok" && (
        <div className="relative rounded-xl overflow-hidden border border-emerald-400/40">
          <img src={value} alt="Aperçu" className="w-full h-36 object-cover" />
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
            <Check className="w-3 h-3" /> Image valide
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Champ URL avec validation live ──────────────────────────────
function UrlField({ value, onChange, label, placeholder, helper, error, required = false }: {
  value: string; onChange: (v: string) => void; label: string;
  placeholder: string; helper?: string; error?: string; required?: boolean;
}) {
  const isValid = value ? isValidHttpsUrl(value) : null;
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-semibold text-foreground flex items-center gap-1.5">
        <Globe className="w-3.5 h-3.5 text-violet-400" />
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <div className="relative">
        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={value}
          onChange={e => onChange(e.target.value.trim().slice(0, 300))}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-3 bg-muted/60 border rounded-xl outline-none focus:border-violet-400 transition-colors text-sm
            ${error ? "border-destructive" : isValid === true ? "border-emerald-400" : isValid === false && value ? "border-red-400" : "border-border"}`} />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {isValid === true && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          {isValid === false && value && <XCircle className="w-4 h-4 text-red-400" />}
        </div>
      </div>
      {error && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</p>}
      {isValid === false && value && !error && (
        <p className="text-xs text-red-400 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> Doit commencer par <strong>https://</strong>
        </p>
      )}
      {helper && <p className="text-[10px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────
function Toggle({ checked, onChange, label, sub, icon: Icon }: {
  checked: boolean; onChange: (v: boolean) => void;
  label: string; sub: string; icon: any;
}) {
  return (
    <div onClick={() => onChange(!checked)}
      className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all cursor-pointer select-none
        ${checked ? "border-violet-400 bg-violet-500/5" : "border-border bg-muted/40 hover:border-violet-300/50"}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${checked ? "bg-violet-500/15" : "bg-muted"}`}>
        <Icon className={`w-4 h-4 ${checked ? "text-violet-500" : "text-muted-foreground"}`} />
      </div>
      <div className="flex-1">
        <p className="font-bold text-sm text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <div className={`w-11 h-6 rounded-full transition-all relative shrink-0 ${checked ? "bg-violet-500" : "bg-muted"}`}>
        <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow-md ${checked ? "left-5" : "left-0.5"}`} />
      </div>
    </div>
  );
}

// ─── MODAL CRÉATION PAYLINK ───────────────────────────────────────
function ModalCreatePayLink({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: (pl: PayLink) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [nomProduit, setNomProduit] = useState("");
  const [montant, setMontant] = useState("");
  const [devise, setDevise] = useState("XOF");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [acceptMM, setAcceptMM] = useState(true);
  const [acceptCard, setAcceptCard] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [redirectUrlFailed, setRedirectUrlFailed] = useState("");
  const [montantModifiable, setMontantModifiable] = useState(false);
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const montantNum = parseFloat(montant.replace(/\s/g, "")) || 0;
  const previewUrl = `${APP_URL}/pay/${genSlug(nomProduit || "votre-produit")}-XXXXXX`;

  const maxDateStr = (() => { const d = new Date(); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split("T")[0]; })();
  const minDateStr = new Date(Date.now() + 86400000).toISOString().split("T")[0];

  const clearErr = (k: string) => setErrors(prev => { const e = { ...prev }; delete e[k]; return e; });

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (nomProduit.trim().length < 2) e.nomProduit = "Au moins 2 caractères requis";
    if (nomProduit.trim().length > 100) e.nomProduit = "Maximum 100 caractères";
    if (montantNum < 100) e.montant = "Montant minimum : 100";
    if (montantNum > 10_000_000) e.montant = "Montant maximum : 10 000 000";
    setErrors(e); return !Object.keys(e).length;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!acceptMM && !acceptCard) e.payment = "Sélectionnez au moins un mode de paiement";
    setErrors(e); return !Object.keys(e).length;
  };

  const validateStep3 = () => {
    const e: Record<string, string> = {};
    if (!redirectUrl) e.redirectUrl = "Ce champ est obligatoire";
    else if (!isValidHttpsUrl(redirectUrl)) e.redirectUrl = "URL invalide — doit commencer par https://";
    if (redirectUrlFailed && !isValidHttpsUrl(redirectUrlFailed)) e.redirectUrlFailed = "URL invalide — doit commencer par https://";
    if (hasExpiry && !expiryDate) e.expiryDate = "Veuillez sélectionner une date";
    if (hasExpiry && expiryDate) {
      const exp = new Date(expiryDate), now = new Date(), max = new Date();
      max.setFullYear(max.getFullYear() + 1);
      if (exp <= now) e.expiryDate = "La date doit être dans le futur";
      if (exp > max) e.expiryDate = "Maximum 1 an à partir d'aujourd'hui";
    }
    setErrors(e); return !Object.keys(e).length;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  const handleCreate = async () => {
    if (!validateStep3()) return;
    setLoading(true); setErrors({});
    try {
      const user = getNexoraUser();
      if (!user?.id) throw new Error("Non connecté. Veuillez vous reconnecter.");
      const uniqueId = genId();
      const slug = `${genSlug(nomProduit.trim())}-${uniqueId}`;
      const url = `${APP_URL}/pay/${slug}`;
      const cleanDesc = sanitizeHtml(description);
      const cleanNom = nomProduit.trim().slice(0, 100);

      const { data, error: dbErr } = await supabase
        .from("nexora_paylinks" as any)
        .insert({
          user_id: user.id, slug, nom_produit: cleanNom, montant: montantNum,
          devise, description: cleanDesc, image_url: imageUrl || null,
          accept_mobile_money: acceptMM, accept_carte: acceptCard, url,
          statut: "actif", redirect_url: redirectUrl,
          redirect_url_failed: redirectUrlFailed || null,
          montant_modifiable: montantModifiable,
          expiration_date: hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : null,
        })
        .select().single();

      if (dbErr) throw new Error(dbErr.message);

      onSuccess({
        id: (data as any).id, slug, nom_produit: cleanNom, montant: montantNum,
        devise, description: cleanDesc, image_url: imageUrl || undefined,
        accept_mobile_money: acceptMM, accept_carte: acceptCard, url,
        created_at: new Date().toISOString(), total_collected: 0,
        payment_count: 0, statut: "actif", redirect_url: redirectUrl,
        redirect_url_failed: redirectUrlFailed || undefined,
        montant_modifiable: montantModifiable,
        expiration_date: hasExpiry && expiryDate ? new Date(expiryDate).toISOString() : undefined,
      });
      onClose();
    } catch (err: any) {
      setErrors({ global: err.message ?? "Erreur lors de la création. Réessayez." });
    } finally { setLoading(false); }
  };

  const STEPS = ["Produit", "Paiement", "Options"];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[96vh] flex flex-col border border-border/40">

        {/* Header */}
        <div className="bg-gradient-to-r from-violet-600 via-violet-500 to-indigo-600 p-5 flex items-center gap-4 shrink-0">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Link2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-black text-white">Créer un PayLink</h2>
            <p className="text-xs text-violet-200/80 mt-0.5">Étape {step}/3 — {STEPS[step - 1]}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center px-5 py-3 bg-muted/30 border-b border-border shrink-0">
          {STEPS.map((label, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black transition-all
                  ${step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-violet-500 text-white ring-4 ring-violet-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                  {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                </div>
                <span className={`hidden sm:block text-[11px] font-bold ${step >= i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full transition-all ${step > i + 1 ? "bg-emerald-500" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-5 space-y-5">

            {/* ══ ÉTAPE 1 ══ */}
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground flex items-center justify-between">
                    <span>Nom du produit <span className="text-destructive">*</span></span>
                    <span className={`text-[10px] font-normal ${nomProduit.length > 90 ? "text-amber-500" : "text-muted-foreground"}`}>{nomProduit.length}/100</span>
                  </label>
                  <input value={nomProduit}
                    onChange={e => { setNomProduit(e.target.value.slice(0, 100)); clearErr("nomProduit"); }}
                    placeholder="Ex : Formation Excel, iPhone 15 Pro…"
                    autoFocus maxLength={100}
                    className={`w-full px-4 py-3 bg-muted/60 border rounded-xl outline-none focus:border-violet-400 transition-colors text-sm font-semibold
                      ${errors.nomProduit ? "border-destructive" : "border-border"}`} />
                  {errors.nomProduit && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.nomProduit}</p>}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Montant <span className="text-destructive">*</span></label>
                    <input type="number" value={montant}
                      onChange={e => { setMontant(e.target.value); clearErr("montant"); }}
                      placeholder="10 000" min={100}
                      className={`w-full px-4 py-3 bg-muted/60 border rounded-xl outline-none focus:border-violet-400 transition-colors text-xl font-black
                        ${errors.montant ? "border-destructive" : "border-border"}`} />
                    {errors.montant && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.montant}</p>}
                    {montantNum >= 100 && !errors.montant && (
                      <p className="text-[10px] text-emerald-500 font-semibold">
                        Vous recevrez ≈ {fmtNum(montantNum * 0.985, devise)} (après 1.5%)
                      </p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-foreground">Devise</label>
                    <select value={devise} onChange={e => setDevise(e.target.value)}
                      className="w-full px-3 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-violet-400 transition-colors text-sm font-bold h-[50px]">
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-foreground">Description</label>
                  <RichTextEditor value={description} onChange={setDescription} />
                </div>

                <ImageField value={imageUrl} onChange={setImageUrl} />

                <button onClick={handleNext}
                  className="w-full py-3.5 bg-violet-500 hover:bg-violet-600 active:scale-95 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                  Continuer <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            {/* ══ ÉTAPE 2 ══ */}
            {step === 2 && (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Modes de paiement <span className="text-destructive">*</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5">Au moins un mode requis</p>
                  </div>
                  {[
                    { key: "mm", label: "Mobile Money", sub: "MTN · Orange · Wave · M-Pesa — 24 pays africains", icon: Phone, checked: acceptMM, set: setAcceptMM },
                    { key: "card", label: "Carte bancaire", sub: "Visa · Mastercard · Cartes prépayées", icon: Banknote, checked: acceptCard, set: setAcceptCard },
                  ].map(({ key, label, sub, icon: Icon, checked, set }) => (
                    <button key={key} type="button" onClick={() => { set(!checked); clearErr("payment"); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left
                        ${checked ? "border-violet-400 bg-violet-500/5" : "border-border bg-muted/40 hover:border-violet-300/50"}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${checked ? "bg-violet-500/15" : "bg-muted"}`}>
                        <Icon className={`w-5 h-5 ${checked ? "text-violet-500" : "text-muted-foreground"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? "border-violet-500 bg-violet-500" : "border-border"}`}>
                        {checked && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </button>
                  ))}
                  {errors.payment && <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.payment}</p>}
                </div>

                {/* Aperçu lien */}
                <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-bold text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5" /> Aperçu de votre lien
                  </p>
                  <p className="text-xs font-mono text-foreground break-all">{previewUrl}</p>
                  <p className="text-[10px] text-muted-foreground">WhatsApp · Instagram · Site web · Email</p>
                </div>

                {/* Récap */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-2 border border-border/50">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Récapitulatif</p>
                  {[
                    ["Produit", nomProduit || "—"],
                    ["Montant", fmtNum(montantNum, devise)],
                    ["Commission Nexora", "1.5%"],
                    ["Vous recevez", fmtNum(montantNum * 0.985, devise)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-muted-foreground text-xs">{label}</span>
                      <span className="font-bold text-xs text-foreground">{value}</span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 py-3 px-4 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </button>
                  <button onClick={handleNext}
                    className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 active:scale-95 text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                    Continuer <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* ══ ÉTAPE 3 ══ */}
            {step === 3 && (
              <>
                {/* Redirections */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-violet-500 rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <p className="text-sm font-black text-foreground">Redirection après paiement</p>
                    <span className="text-[10px] bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-full font-bold">OBLIGATOIRE</span>
                  </div>

                  <UrlField value={redirectUrl}
                    onChange={v => { setRedirectUrl(v); clearErr("redirectUrl"); }}
                    label="URL de succès — après paiement réussi"
                    placeholder="https://votre-site.com/merci"
                    helper="Le client sera redirigé automatiquement ici après confirmation du paiement."
                    error={errors.redirectUrl} required />

                  <UrlField value={redirectUrlFailed}
                    onChange={v => { setRedirectUrlFailed(v); clearErr("redirectUrlFailed"); }}
                    label="URL d'échec — après paiement échoué"
                    placeholder="https://votre-site.com/echec"
                    helper="Optionnel — si vide, le client verra un message d'erreur standard."
                    error={errors.redirectUrlFailed} />

                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-xl p-3">
                    <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-1.5">
                      <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                      Pas de site web ? Utilisez un lien WhatsApp : <strong>https://wa.me/229XXXXXXXX</strong>
                    </p>
                  </div>
                </div>

                <div className="border-t border-border/50 pt-4 space-y-3">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Options avancées</p>
                  <Toggle checked={montantModifiable} onChange={setMontantModifiable}
                    label="Montant libre" sub="Le client peut modifier le montant avant de payer" icon={Banknote} />
                  <Toggle checked={hasExpiry}
                    onChange={v => { setHasExpiry(v); if (!v) { setExpiryDate(""); clearErr("expiryDate"); } }}
                    label="Date d'expiration" sub="Le lien se désactivera automatiquement à cette date" icon={Calendar} />
                  {hasExpiry && (
                    <div className="space-y-1">
                      <input type="date" value={expiryDate}
                        onChange={e => { setExpiryDate(e.target.value); clearErr("expiryDate"); }}
                        min={minDateStr} max={maxDateStr}
                        className={`w-full px-4 py-3 bg-muted/60 border rounded-xl outline-none focus:border-violet-400 transition-colors text-sm
                          ${errors.expiryDate ? "border-destructive" : "border-border"}`} />
                      {errors.expiryDate
                        ? <p className="text-xs text-destructive flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.expiryDate}</p>
                        : <p className="text-[10px] text-muted-foreground">Maximum 1 an à partir d'aujourd'hui</p>}
                    </div>
                  )}
                </div>

                {/* Sécurité */}
                <div className="flex items-start gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-emerald-700 dark:text-emerald-400">
                    Toutes les données sont validées et nettoyées. Protection XSS active, URLs vérifiées.
                  </p>
                </div>

                {errors.global && (
                  <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p>{errors.global}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={() => setStep(2)}
                    className="flex items-center gap-1.5 py-3 px-4 border border-border rounded-xl font-bold text-sm hover:bg-muted transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Retour
                  </button>
                  <button onClick={handleCreate} disabled={loading}
                    className="flex-1 py-3 bg-violet-500 hover:bg-violet-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25">
                    {loading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Création…</>
                      : <><Zap className="w-4 h-4" /> Générer le PayLink</>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL RETRAIT ────────────────────────────────────────────────
function ModalRetrait({ onClose, onSuccess, solde }: {
  onClose: () => void; onSuccess: () => void; solde: number;
}) {
  const [nomComplet, setNomComplet] = useState("");
  const [pays, setPays] = useState<typeof COUNTRIES[0] | null>(null);
  const [reseau, setReseau] = useState("");
  const [telephone, setTelephone] = useState("");
  const [montant, setMontant] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const montantNum = parseFloat(montant) || 0;
  const frais = Math.round(montantNum * FRAIS_RETRAIT);
  const montantNet = montantNum - frais;
  const valid = nomComplet.trim().length >= 3 && pays !== null && reseau !== "" &&
    telephone.replace(/\s/g, "").length >= 8 && montantNum >= 1000 && montantNum <= solde;

  const handleSubmit = async () => {
    if (!valid || !pays) return;
    setLoading(true); setError(null);
    try {
      const user = getNexoraUser();
      if (!user?.id) throw new Error("Non connecté");
      const { error: dbErr } = await supabase
        .from("nexora_paylink_withdrawals" as any)
        .insert({
          user_id: user.id, montant: montantNum, frais, montant_net: montantNet,
          nom: nomComplet.trim(), pays: pays.name, pays_code: pays.code,
          reseau, telephone: telephone.trim(), statut: "pending",
        });
      if (dbErr) throw new Error(dbErr.message);
      onSuccess(); onClose();
    } catch (err: any) {
      setError(err.message ?? "Erreur lors de la demande.");
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto border border-border/40">
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Wallet className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-black text-white">Demande de retrait</h2>
            <p className="text-xs text-emerald-100/80">Commission 7% · Traitement 12–24h</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between p-3.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <span className="text-sm text-muted-foreground font-semibold">Solde disponible</span>
            <span className="font-black text-foreground text-lg">{fmtNum(solde)}</span>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={nomComplet} onChange={e => setNomComplet(e.target.value.slice(0, 80))}
                placeholder="Prénom Nom"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-emerald-400 transition-colors text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Pays de réception</label>
            <CountrySelector selected={pays} onSelect={p => { setPays(p); setReseau(p.networks[0]); }} />
          </div>

          {pays && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">Réseau Mobile Money</label>
              <div className="grid grid-cols-2 gap-2">
                {pays.networks.map(n => (
                  <button key={n} type="button" onClick={() => setReseau(n)}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold border transition-all
                      ${reseau === n ? "border-emerald-400 bg-emerald-400/10 text-emerald-500" : "border-border bg-muted/60 hover:border-emerald-300/50"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">Numéro Mobile Money</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="tel" value={telephone} onChange={e => setTelephone(e.target.value.slice(0, 20))}
                placeholder="+229 97 00 00 00"
                className="w-full pl-10 pr-4 py-3 bg-muted/60 border border-border rounded-xl outline-none focus:border-emerald-400 transition-colors text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-foreground">
              Montant à retirer <span className="text-muted-foreground font-normal text-xs">(min 1 000)</span>
            </label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)}
              placeholder="Ex : 50 000"
              className={`w-full px-4 py-3 bg-muted/60 border rounded-xl text-xl font-black outline-none transition-colors
                ${montantNum > solde && montantNum > 0 ? "border-destructive" : "border-border focus:border-emerald-400"}`} />
            {montantNum >= 1000 && montantNum <= solde && (
              <div className="bg-muted/50 rounded-xl p-3 space-y-1.5 text-sm border border-border/50">
                <div className="flex justify-between text-muted-foreground">
                  <span className="text-xs">Commission 7%</span>
                  <span className="text-xs font-semibold">− {fmtNum(frais)}</span>
                </div>
                <div className="flex justify-between font-black text-foreground border-t border-border pt-1.5">
                  <span className="text-sm">Vous recevrez</span>
                  <span className="text-emerald-500 text-sm">{fmtNum(montantNet)}</span>
                </div>
              </div>
            )}
            {montantNum > solde && montantNum > 0 && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Solde insuffisant
              </p>
            )}
          </div>

          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 text-xs rounded-xl">
            <Clock className="w-4 h-4 mt-0.5 shrink-0 text-amber-500" />
            <p className="text-amber-700 dark:text-amber-400">
              Traitement sous <strong>12 à 24h ouvrables</strong>. Une notification sera envoyée à la confirmation.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-xs text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-xl">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /><p>{error}</p>
            </div>
          )}

          <button onClick={handleSubmit} disabled={!valid || loading}
            className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25">
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Traitement…</> : <><Wallet className="w-4 h-4" /> Lancer le retrait</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reçu HTML ────────────────────────────────────────────────────
function generatePaymentReceipt(p: Payment) {
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/><title>Reçu ${p.reference}</title>
<style>*{margin:0;padding:0;box-sizing:border-box;}body{font-family:'Segoe UI',sans-serif;background:#f8fafc;color:#1e293b;}
.page{max-width:640px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,.12);}
.header{background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:36px 40px;display:flex;align-items:center;justify-content:space-between;}
.logo-area{display:flex;align-items:center;gap:14px;}.logo-area img{width:52px;height:52px;object-fit:contain;}
.brand h1{font-size:22px;font-weight:900;letter-spacing:3px;color:#fff;}.brand p{font-size:11px;color:rgba(255,255,255,.45);}
.badge{background:rgba(255,255,255,0.2);color:#fff;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:8px 18px;font-size:12px;font-weight:700;}
.body{padding:40px;}.ref-row{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:20px;border-bottom:1px solid #e2e8f0;}
.section-title{font-size:10px;font-weight:700;letter-spacing:2px;color:#94a3b8;text-transform:uppercase;margin-bottom:14px;}
.row{display:flex;justify-content:space-between;padding:11px 0;border-bottom:1px dashed #e2e8f0;}
.row .label{color:#64748b;font-size:13px;}.row .value{font-weight:600;color:#1e293b;font-size:13px;}
.amount-box{background:linear-gradient(135deg,#f5f3ff,#ede9fe);border:2px solid #7c3aed;border-radius:12px;padding:20px 24px;margin:24px 0;text-align:center;}
.amount-box .amount{font-size:32px;font-weight:900;color:#7c3aed;}
.success{display:inline-block;background:#dcfce7;color:#16a34a;padding:6px 16px;border-radius:999px;font-weight:700;font-size:12px;margin-top:8px;}
.footer{background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e2e8f0;}
.footer p{font-size:11px;color:#94a3b8;line-height:1.8;}</style></head><body>
<div class="page"><div class="header"><div class="logo-area"><img src="${LOGO_URL}" alt="Logo"/>
<div class="brand"><h1>NEXORA</h1><p>PAYLINK</p></div></div><div class="badge">REÇU DE PAIEMENT</div></div>
<div class="body"><div class="ref-row">
<div><span style="font-size:11px;color:#64748b;display:block">Référence</span><strong style="font-size:18px;font-weight:900;color:#0f172a">${p.reference}</strong></div>
<div style="text-align:right"><span style="font-size:11px;color:#64748b;display:block">Date</span><strong style="font-size:13px;font-weight:700">${new Date(p.created_at).toLocaleString("fr-FR")}</strong></div>
</div><div class="amount-box"><div class="amount">${fmtNum(p.montant, p.devise)}</div><div class="success">✓ Paiement confirmé</div></div>
<div class="section-title">Informations client</div>
<div class="row"><span class="label">Nom</span><span class="value">${p.client_nom}</span></div>
<div class="row"><span class="label">Téléphone</span><span class="value">${p.client_telephone}</span></div>
<div class="row"><span class="label">Pays</span><span class="value">${p.pays_flag} ${p.pays}</span></div>
<div class="row"><span class="label">Réseau</span><span class="value">${p.reseau}</span></div>
<div class="section-title" style="margin-top:20px">Produit</div>
<div class="row"><span class="label">Nom</span><span class="value">${p.paylink_nom}</span></div>
<div class="row"><span class="label">Référence</span><span class="value" style="font-family:monospace;font-size:12px">${p.reference}</span></div></div>
<div class="footer"><p>Reçu généré par <strong style="color:#7c3aed">NEXORA PAYLINK</strong><br/>support@nexora.africa · © ${new Date().getFullYear()} NEXORA</p></div>
</div></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `Recu-${p.reference}.html`;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

// ─── Carte PayLink ────────────────────────────────────────────────
function PayLinkCard({ pl, onCopy, onShare, onDelete }: {
  pl: PayLink; onCopy: () => void; onShare: () => void; onDelete: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(pl.url);
    setCopied(true); setTimeout(() => setCopied(false), 2000); onCopy();
  };

  return (
    <div className="bg-card border border-border/60 rounded-2xl p-4 space-y-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start gap-3">
        {pl.image_url
          ? <img src={pl.image_url} alt={pl.nom_produit} className="w-12 h-12 rounded-xl object-cover border border-border shrink-0" />
          : <div className="w-12 h-12 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0"><Link2 className="w-5 h-5 text-violet-500" /></div>
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-black text-sm text-foreground truncate">{pl.nom_produit}</h3>
              <p className="text-base font-black text-violet-500 mt-0.5">{fmtNum(pl.montant, pl.devise)}</p>
            </div>
            <div className="relative shrink-0">
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground">
                <MoreVertical className="w-4 h-4" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden min-w-[150px]">
                  {[
                    { label: "Partager", icon: Share2, color: "text-violet-500", action: () => { onShare(); setMenuOpen(false); } },
                    { label: "Aperçu", icon: Eye, color: "text-blue-500", action: () => { window.open(pl.url, "_blank"); setMenuOpen(false); } },
                    { label: "Supprimer", icon: Trash2, color: "text-destructive", action: () => { onDelete(); setMenuOpen(false); } },
                  ].map(({ label, icon: Icon, color, action }) => (
                    <button key={label} onClick={action}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-semibold hover:bg-muted transition-colors">
                      <Icon className={`w-4 h-4 ${color}`} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/60 rounded-xl p-2.5 text-center">
          <p className="text-sm font-black text-emerald-500">{fmtNum(pl.total_collected)}</p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Collecté</p>
        </div>
        <div className="bg-muted/60 rounded-xl p-2.5 text-center">
          <p className="text-sm font-black text-foreground">{pl.payment_count}</p>
          <p className="text-[10px] text-muted-foreground font-semibold mt-0.5">Paiements</p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-1.5">
        {pl.accept_mobile_money && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Phone className="w-2.5 h-2.5" /> Mobile Money</span>}
        {pl.accept_carte && <span className="text-[10px] bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Banknote className="w-2.5 h-2.5" /> Carte</span>}
        {pl.montant_modifiable && <span className="text-[10px] bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full font-bold">Montant libre</span>}
        {pl.expiration_date && <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Calendar className="w-2.5 h-2.5" /> Expire {new Date(pl.expiration_date).toLocaleDateString("fr-FR")}</span>}
      </div>

      {/* URL */}
      <div className="flex items-center gap-2 p-2.5 bg-muted/60 rounded-xl">
        <p className="text-xs font-mono text-muted-foreground flex-1 truncate">{pl.url}</p>
        <button onClick={handleCopy}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 transition-colors shrink-0">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <button onClick={handleCopy}
          className="flex-1 py-2 bg-violet-500/10 hover:bg-violet-500/20 text-violet-500 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5">
          <Copy className="w-3.5 h-3.5" /> Copier
        </button>
        <button onClick={onShare}
          className="flex-1 py-2 bg-muted hover:bg-accent text-foreground font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5">
          <Share2 className="w-3.5 h-3.5" /> Partager
        </button>
      </div>
    </div>
  );
}

// ─── PAGE PRINCIPALE ──────────────────────────────────────────────
export default function PayLinkPage() {
  const [tab, setTab] = useState<"liens" | "paiements" | "retraits">("liens");
  const [paylinks, setPaylinks] = useState<PayLink[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showRetrait, setShowRetrait] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [visiblePayments, setVisiblePayments] = useState(5);
  const [filterPmt, setFilterPmt] = useState<"all" | "success" | "pending" | "failed">("all");
  const [shareLink, setShareLink] = useState<string | null>(null);

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 5000); };
  const showError = (msg: string) => { setErrorMsg(msg); setTimeout(() => setErrorMsg(null), 5000); };

  const totalCollected = payments.filter(p => p.statut === "success").reduce((s, p) => s + p.montant, 0);
  const totalPending = payments.filter(p => p.statut === "pending").reduce((s, p) => s + p.montant, 0);
  const totalWithdrawn = withdrawals.filter(w => w.statut !== "failed").reduce((s, w) => s + w.montant, 0);
  const soldeDisponible = Math.max(0, totalCollected - totalWithdrawn);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const user = getNexoraUser();
      if (!user?.id) return;

      const { data: plData } = await supabase
        .from("nexora_paylinks" as any).select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });

      const plList: PayLink[] = (plData ?? []).map((row: any) => ({
        id: row.id, slug: row.slug, nom_produit: row.nom_produit,
        montant: row.montant, devise: row.devise, description: row.description ?? "",
        image_url: row.image_url, accept_mobile_money: row.accept_mobile_money,
        accept_carte: row.accept_carte, url: row.url, created_at: row.created_at,
        total_collected: row.total_collected ?? 0, payment_count: row.payment_count ?? 0,
        statut: row.statut ?? "actif", redirect_url: row.redirect_url,
        redirect_url_failed: row.redirect_url_failed,
        montant_modifiable: row.montant_modifiable, expiration_date: row.expiration_date,
      }));
      setPaylinks(plList);

      const plIds = plList.map(p => p.id);
      if (plIds.length > 0) {
        const { data: pmtData } = await supabase
          .from("nexora_paylink_payments" as any).select("*")
          .in("paylink_id", plIds).order("created_at", { ascending: false });
        setPayments((pmtData ?? []).map((row: any) => ({
          id: row.id, paylink_id: row.paylink_id,
          paylink_nom: plList.find(p => p.id === row.paylink_id)?.nom_produit ?? "—",
          client_nom: row.client_nom, client_telephone: row.client_telephone,
          pays: row.pays, pays_flag: row.pays_flag ?? "", reseau: row.reseau,
          montant: row.montant, devise: row.devise ?? "XOF", statut: row.statut,
          created_at: row.created_at, reference: row.reference ?? row.id?.slice(0, 8).toUpperCase(),
        })));
      }

      const { data: wdData } = await supabase
        .from("nexora_paylink_withdrawals" as any).select("*")
        .eq("user_id", user.id).order("created_at", { ascending: false });
      setWithdrawals((wdData ?? []).map((row: any) => ({
        id: row.id, montant: row.montant, frais: row.frais, montant_net: row.montant_net,
        nom: row.nom, pays: row.pays, reseau: row.reseau, telephone: row.telephone,
        statut: row.statut, created_at: row.created_at,
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("nexora_paylinks" as any).delete().eq("id", id);
    if (!error) { setPaylinks(prev => prev.filter(p => p.id !== id)); showSuccess("PayLink supprimé."); }
    else showError("Impossible de supprimer ce PayLink.");
  };

  const handleShare = (url: string) => {
    if (navigator.share) navigator.share({ title: "Nexora PayLink", url }).catch(() => {});
    else setShareLink(url);
  };

  const filteredPayments = payments.filter(p => filterPmt === "all" || p.statut === filterPmt);

  const TABS = [
    { key: "liens",     label: "Mes PayLinks", count: paylinks.length,    icon: Link2 },
    { key: "paiements", label: "Paiements",    count: payments.length,    icon: BarChart3 },
    { key: "retraits",  label: "Retraits",     count: withdrawals.length, icon: Wallet },
  ] as const;

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Toasts */}
        {successMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-emerald-500 text-white px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 max-w-sm">
            <CheckCircle2 className="w-4 h-4 shrink-0" /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-destructive text-destructive-foreground px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-2 animate-in slide-in-from-top-4 max-w-sm">
            <AlertCircle className="w-4 h-4 shrink-0" /> {errorMsg}
          </div>
        )}

        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-violet-950 via-indigo-900 to-slate-900 p-5 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(139,92,246,0.3),transparent_60%)]" />
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={LOGO_URL} alt="Nexora" className="w-9 h-9 object-contain" />
                <div>
                  <h1 className="text-white font-black text-base tracking-widest">NEXORA</h1>
                  <p className="text-violet-400/60 text-[9px] font-black tracking-[4px] uppercase">PAYLINK</p>
                </div>
              </div>
              <button onClick={fetchData} disabled={loading} title="Actualiser"
                className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 text-white ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[
                { label: "Collecté", value: fmtNum(totalCollected), color: "text-emerald-400", sub: `${payments.filter(p => p.statut === "success").length} pmt` },
                { label: "En attente", value: fmtNum(totalPending), color: "text-amber-400", sub: `${payments.filter(p => p.statut === "pending").length} en cours` },
                { label: "Disponible", value: fmtNum(soldeDisponible), color: "text-violet-300", sub: "Retirable" },
              ].map(({ label, value, color, sub }) => (
                <div key={label} className="bg-white/5 rounded-xl p-3 border border-white/5">
                  <p className="text-slate-400 text-[9px] font-bold uppercase tracking-wider">{label}</p>
                  <p className={`font-black text-sm ${color} mt-1 leading-none`}>{value}</p>
                  <p className="text-slate-600 text-[9px] mt-1">{sub}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setShowCreate(true)}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-500 hover:bg-violet-400 active:scale-95 text-white font-black rounded-xl transition-all text-sm shadow-lg shadow-violet-500/30">
                <Plus className="w-4 h-4" /> Nouveau PayLink
              </button>
              <button onClick={() => setShowRetrait(true)} disabled={soldeDisponible < 1000}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl transition-all text-sm shadow-lg shadow-emerald-500/30">
                <Wallet className="w-4 h-4" /> Retirer
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 p-1 bg-muted/70 rounded-2xl">
          {TABS.map(({ key, label, count, icon: Icon }) => (
            <button key={key} onClick={() => setTab(key as any)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-200
                ${tab === key ? "bg-card text-foreground shadow-sm scale-[1.02]" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{label.split(" ")[label.split(" ").length - 1]}</span>
              {count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black min-w-[18px] text-center
                  ${tab === key ? "bg-violet-500 text-white" : "bg-border text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Contenu */}
        {loading ? (
          <div className="flex flex-col items-center py-20 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm text-muted-foreground font-semibold">Chargement…</p>
          </div>
        ) : (
          <>
            {/* Tab : PayLinks */}
            {tab === "liens" && (
              <div className="space-y-4">
                {paylinks.length === 0 ? (
                  <div className="flex flex-col items-center py-16 space-y-4 text-center">
                    <div className="w-20 h-20 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <Link2 className="w-9 h-9 text-violet-500" />
                    </div>
                    <div>
                      <p className="font-black text-foreground text-base">Aucun PayLink créé</p>
                      <p className="text-sm text-muted-foreground mt-1">Créez votre premier lien en moins de 2 minutes</p>
                    </div>
                    <button onClick={() => setShowCreate(true)}
                      className="px-6 py-3 bg-violet-500 hover:bg-violet-600 active:scale-95 text-white font-black rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25">
                      <Plus className="w-4 h-4" /> Créer mon premier PayLink
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4">
                    {paylinks.map(pl => (
                      <PayLinkCard key={pl.id} pl={pl}
                        onCopy={() => showSuccess("✓ Lien copié !")}
                        onShare={() => handleShare(pl.url)}
                        onDelete={() => handleDelete(pl.id)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab : Paiements */}
            {tab === "paiements" && (
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1 p-1 bg-muted/70 rounded-2xl">
                    {(["all", "success", "pending", "failed"] as const).map(f => (
                      <button key={f} onClick={() => { setFilterPmt(f); setVisiblePayments(5); }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all
                          ${filterPmt === f ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                        {f === "all" ? "Tous" : f === "success" ? "✅ Réussis" : f === "pending" ? "⏳ En cours" : "❌ Échoués"}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="flex flex-col items-center py-14 space-y-3 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <TrendingUp className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-foreground text-sm">Aucun paiement trouvé</p>
                    <p className="text-xs text-muted-foreground">Les paiements apparaîtront ici dès qu'un client utilisera votre PayLink</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredPayments.slice(0, visiblePayments).map(p => (
                      <div key={p.id}
                        className="flex items-center gap-3 sm:gap-4 p-4 bg-card border border-border/60 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0
                          ${p.statut === "success" ? "bg-emerald-500/10" : p.statut === "pending" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                          {p.statut === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            : p.statut === "pending" ? <Clock className="w-5 h-5 text-amber-500" />
                            : <XCircle className="w-5 h-5 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-foreground truncate">{p.client_nom}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                              ${p.statut === "success" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : p.statut === "pending" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                              {p.statut === "success" ? "Réussi" : p.statut === "pending" ? "En cours" : "Échoué"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{p.pays_flag} {p.pays} · {p.reseau}</p>
                          <p className="text-[10px] text-muted-foreground/60">{new Date(p.created_at).toLocaleString("fr-FR")}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="font-black text-sm text-emerald-500">+{fmtNum(p.montant, p.devise)}</p>
                          {p.statut === "success" && (
                            <button onClick={() => generatePaymentReceipt(p)} title="Télécharger reçu"
                              className="w-8 h-8 flex items-center justify-center rounded-xl bg-muted hover:bg-accent transition-colors text-muted-foreground border border-border">
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {visiblePayments < filteredPayments.length && (
                      <button onClick={() => setVisiblePayments(v => v + 5)}
                        className="w-full py-3 rounded-2xl border border-dashed border-border text-sm font-bold text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:bg-muted/40 transition-all flex items-center justify-center gap-2">
                        <ChevronDown className="w-4 h-4" />
                        Voir plus · {filteredPayments.length - visiblePayments} restant{filteredPayments.length - visiblePayments > 1 ? "s" : ""}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab : Retraits */}
            {tab === "retraits" && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground font-semibold">Solde disponible</p>
                    <p className="text-2xl font-black text-foreground mt-0.5">{fmtNum(soldeDisponible)}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Commission retrait : {FRAIS_RETRAIT * 100}%</p>
                  </div>
                  <button onClick={() => setShowRetrait(true)} disabled={soldeDisponible < 1000}
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-40 disabled:pointer-events-none text-white font-black rounded-xl transition-all flex items-center gap-2 text-sm shadow-md shadow-emerald-500/25">
                    <Wallet className="w-4 h-4" /> Retirer
                  </button>
                </div>

                {withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center py-14 space-y-3 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <p className="font-bold text-sm text-foreground">Aucun retrait effectué</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {withdrawals.map(w => (
                      <div key={w.id}
                        className="flex items-center gap-4 p-4 bg-card border border-border/60 rounded-2xl shadow-sm">
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0
                          ${w.statut === "completed" ? "bg-emerald-500/10" : w.statut === "pending" ? "bg-amber-500/10" : "bg-red-500/10"}`}>
                          <Wallet className={`w-5 h-5 ${w.statut === "completed" ? "text-emerald-500" : w.statut === "pending" ? "text-amber-500" : "text-red-500"}`} />
                        </div>
                        <div className="flex-1 min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">{w.nom}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0
                              ${w.statut === "completed" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : w.statut === "pending" ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"}`}>
                              {w.statut === "completed" ? "✅ Effectué" : w.statut === "pending" ? "⏳ En attente" : "❌ Échoué"}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground">{w.reseau} · {w.telephone}</p>
                          <p className="text-[10px] text-muted-foreground/60">{new Date(w.created_at).toLocaleString("fr-FR")}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-sm text-foreground">−{fmtNum(w.montant)}</p>
                          <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Reçu : {fmtNum(w.montant_net)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Footer */}
        <div className="flex items-start gap-3 p-4 bg-muted/40 rounded-xl text-xs text-muted-foreground border border-border/40">
          <BadgeCheck className="w-4 h-4 mt-0.5 shrink-0 text-violet-500" />
          <div className="space-y-1 leading-relaxed">
            <p><strong className="text-violet-500">Nexora PayLink</strong> — Liens de paiement partageables sur WhatsApp, Instagram, site web et email.</p>
            <p>Transaction : <strong>1.5%</strong> · Retrait : <strong>7%</strong> · Délai : <strong>12–24h</strong> · <strong>24 pays</strong> africains.</p>
          </div>
        </div>

        {/* Modals */}
        {showCreate && (
          <ModalCreatePayLink onClose={() => setShowCreate(false)}
            onSuccess={pl => { setPaylinks(prev => [pl, ...prev]); showSuccess(`✓ PayLink "${pl.nom_produit}" créé !`); }} />
        )}
        {showRetrait && (
          <ModalRetrait onClose={() => setShowRetrait(false)} solde={soldeDisponible}
            onSuccess={() => { fetchData(); showSuccess("✓ Demande de retrait envoyée. Traitement 12–24h."); }} />
        )}

        {/* Modal partage */}
        {shareLink && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-md" onClick={() => setShareLink(null)}>
            <div className="w-full max-w-md bg-card rounded-t-3xl p-6 space-y-4 shadow-2xl border-t border-border/50"
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center"><div className="w-10 h-1 rounded-full bg-border" /></div>
              <h3 className="font-black text-lg text-center">Partager le PayLink</h3>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-xl border border-border/50">
                <p className="text-xs font-mono text-muted-foreground flex-1 truncate">{shareLink}</p>
                <button onClick={() => { navigator.clipboard.writeText(shareLink); showSuccess("Copié !"); setShareLink(null); }}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 transition-colors">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "WhatsApp", emoji: "💬", color: "bg-green-500/10 text-green-600 hover:bg-green-500/20", href: `https://wa.me/?text=${encodeURIComponent("Voici le lien pour payer : " + shareLink)}` },
                  { label: "Ouvrir", emoji: "🔗", color: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/20", href: shareLink },
                  { label: "Copier", emoji: "📋", color: "bg-violet-500/10 text-violet-600 hover:bg-violet-500/20", href: "#" },
                ].map(({ label, emoji, color, href }) => (
                  <a key={label} href={href === "#" ? undefined : href}
                    target={href === "#" ? undefined : "_blank"} rel="noopener noreferrer"
                    onClick={href === "#" ? (e) => { e.preventDefault(); navigator.clipboard.writeText(shareLink); showSuccess("Copié !"); setShareLink(null); } : undefined}
                    className={`flex flex-col items-center gap-2 py-3.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${color}`}>
                    <span className="text-2xl">{emoji}</span>{label}
                  </a>
                ))}
              </div>
              <button onClick={() => setShareLink(null)}
                className="w-full py-3 rounded-xl border border-border font-bold text-sm hover:bg-muted transition-colors">
                Fermer
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
