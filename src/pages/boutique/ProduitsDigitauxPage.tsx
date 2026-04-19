import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser, hasNexoraPremium } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import { formatPrix } from "@/lib/devise-utils";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Package,
  Star, Edit2, Eye, EyeOff, Copy, FileText, Video, Code2, Palette, File, Key,
  Zap, ExternalLink, CreditCard, Wallet,
  Bold, Italic, Underline, AlignLeft, AlignCenter,
  AlignRight, List, Type, Minus, BarChart2,
  TrendingUp, AlertTriangle, CheckCircle,
  Globe, Hash, BookOpen, ChevronRight, ArrowLeft,
  Save, Send, ImagePlus, Truck, Search,
  Layers, DollarSign, BarChart, Strikethrough, AlignJustify, ListOrdered, CheckSquare,
  Code, Quote, Film, Baseline, LayoutGrid, X,
  Upload, Share2, Crown, Image
} from "lucide-react";

interface ProduitDigital {
  id: string; boutique_id: string; nom: string; description: string;
  prix: number; prix_promo: number | null; type: "numerique";
  type_digital: string | null; categorie: string | null;
  tags: string[]; photos: string[]; actif: boolean; vedette: boolean;
  paiement_lien: string | null;
  payment_mode: "external" | null;
  instructions_achat: string | null; created_at: string;
}

type ProductStatus = "draft" | "ready" | "published";
type SectionKey = "description" | "images" | "prix" | "seo" | "paiement" | "variantes" | "livraison" | "stock" | "visibilite" | "apercu";

const TYPES_DIGITAL = [
  { value: "ebook", label: "Ebook / PDF", emoji: "📚", color: "bg-blue-100 text-blue-700" },
  { value: "formation", label: "Formation", emoji: "🎓", color: "bg-purple-100 text-purple-700" },
  { value: "logiciel", label: "Logiciel", emoji: "💻", color: "bg-green-100 text-green-700" },
  { value: "template", label: "Template", emoji: "🎨", color: "bg-pink-100 text-pink-700" },
  { value: "fichier", label: "Fichier", emoji: "📁", color: "bg-orange-100 text-orange-700" },
  { value: "licence", label: "Licence", emoji: "🔑", color: "bg-yellow-100 text-yellow-700" },
  { value: "autre", label: "Autre", emoji: "⚡", color: "bg-gray-100 text-gray-700" },
];

const CATEGORIES_DIGITAL = [
  "Business & Marketing", "Développement web", "Design graphique", "Photographie",
  "Musique & Audio", "Vidéo & Cinéma", "Finance & Investissement", "Santé & Bien-être",
  "Éducation", "Productivité", "Réseaux sociaux", "E-commerce", "Autre"
];

const SECTION_CARDS = [
  { key: "description" as SectionKey, label: "Description", emoji: "📝", description: "Titre, contenu riche, type", gradient: "from-violet-600/20 to-purple-600/10", dot: "bg-violet-400" },
  { key: "images" as SectionKey, label: "Images", emoji: "🖼️", description: "Photos & galerie produit", gradient: "from-blue-600/20 to-cyan-600/10", dot: "bg-blue-400" },
  { key: "prix" as SectionKey, label: "Prix", emoji: "💰", description: "Prix normal & promotionnel", gradient: "from-emerald-600/20 to-green-600/10", dot: "bg-emerald-400" },
  { key: "seo" as SectionKey, label: "SEO", emoji: "🔍", description: "Référencement & meta", gradient: "from-amber-600/20 to-yellow-600/10", dot: "bg-amber-400" },
  { key: "paiement" as SectionKey, label: "Paiement", emoji: "💳", description: "Mode & liens de paiement", gradient: "from-orange-600/20 to-red-600/10", dot: "bg-orange-400" },
  { key: "variantes" as SectionKey, label: "Variantes", emoji: "🏷️", description: "Tags, catégorie & type", gradient: "from-pink-600/20 to-rose-600/10", dot: "bg-pink-400" },
  { key: "livraison" as SectionKey, label: "Livraison", emoji: "📦", description: "Instructions après achat", gradient: "from-teal-600/20 to-cyan-600/10", dot: "bg-teal-400" },
  { key: "stock" as SectionKey, label: "Stock", emoji: "📊", description: "Disponibilité illimitée", gradient: "from-indigo-600/20 to-blue-600/10", dot: "bg-indigo-400" },
  { key: "visibilite" as SectionKey, label: "Visibilité", emoji: "👁️", description: "Actif, vedette, statut", gradient: "from-slate-600/20 to-gray-600/10", dot: "bg-slate-400" },
  { key: "apercu" as SectionKey, label: "Aperçu", emoji: "✨", description: "Prévisualisation produit", gradient: "from-fuchsia-600/20 to-purple-600/10", dot: "bg-fuchsia-400" },
];

const DESCRIPTION_STYLES = `
  .nx-ed { font-family: 'DM Sans', system-ui, sans-serif; color: #e2e8f0; line-height: 1.8; min-height: 280px; }
  .nx-ed h1 { font-size: 1.6rem; font-weight: 900; margin: 1.5rem 0 0.75rem; color: #f1f5f9; }
  .nx-ed h2 { font-size: 1.25rem; font-weight: 800; margin: 1.25rem 0 0.6rem; color: #e2e8f0; }
  .nx-ed h3 { font-size: 1.05rem; font-weight: 700; margin: 1rem 0 0.5rem; color: #cbd5e1; }
  .nx-ed p { margin: 0.75rem 0; font-size: 0.95rem; }
  .nx-ed ul, .nx-ed ol { margin: 0.75rem 0 0.75rem 1.5rem; font-size: 0.95rem; }
  .nx-ed li { margin: 0.35rem 0; }
  .nx-ed hr { border: none; border-top: 1px solid #334155; margin: 2rem 0; display: block; }
  .nx-ed img { display: block; max-width: 100%; height: auto; margin: 1.25rem auto; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); }
  .nx-ed strong { font-weight: 700; color: #f1f5f9; }
  .nx-ed em { font-style: italic; color: #94a3b8; }
  .nx-ed u { text-decoration: underline; }
  .nx-ed s { text-decoration: line-through; opacity: 0.6; }
  .nx-ed blockquote { border-left: 3px solid #7c3aed; margin: 1rem 0; padding: 0.75rem 1rem; background: rgba(124,58,237,0.08); border-radius: 0 8px 8px 0; font-style: italic; color: #a78bfa; }
  .nx-ed pre { background: #0f172a; border: 1px solid #1e293b; border-radius: 10px; padding: 1rem; font-family: monospace; font-size: 0.85rem; color: #7dd3fc; margin: 1rem 0; overflow-x: auto; }
  .nx-ed:empty:before { content: attr(data-placeholder); color: #475569; pointer-events: none; }
  .nx-ed:focus { outline: none; }
`;

function RichTextEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [textColor, setTextColor] = useState("#f1f5f9");
  const [bgColor, setBgColor] = useState("#7c3aed");
  const [fontSize, setFontSize] = useState("4");
  const [uploading, setUploading] = useState(false);
  const isInternal = useRef(false);
  const savedRange = useRef<Range | null>(null);

  useEffect(() => {
    if (editorRef.current && !isInternal.current) {
      if (editorRef.current.innerHTML !== value) editorRef.current.innerHTML = value || "";
    }
    isInternal.current = false;
  }, [value]);

  const saveRange = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) savedRange.current = sel.getRangeAt(0).cloneRange();
  };

  const restoreRange = () => {
    if (savedRange.current) {
      editorRef.current?.focus();
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange.current);
    }
  };

  const exec = useCallback((cmd: string, val?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, val);
    if (editorRef.current) { isInternal.current = true; onChange(editorRef.current.innerHTML); }
  }, [onChange]);

  const insertHtml = useCallback((html: string) => {
    editorRef.current?.focus();
    document.execCommand("insertHTML", false, html);
    if (editorRef.current) { isInternal.current = true; onChange(editorRef.current.innerHTML); }
  }, [onChange]);

  const handleImgFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    setUploading(true);
    try {
      const resize = (f: File, maxW: number): Promise<Blob> => new Promise((res, rej) => {
        const img = new window.Image();
        const url = URL.createObjectURL(f);
        img.onload = () => {
          URL.revokeObjectURL(url);
          const r = Math.min(1, maxW / img.width);
          const c = document.createElement("canvas");
          c.width = img.width * r; c.height = img.height * r;
          const ctx = c.getContext("2d");
          if (!ctx) { res(f); return; }
          ctx.drawImage(img, 0, 0, c.width, c.height);
          c.toBlob(b => b ? res(b) : rej(new Error("fail")), f.type, 0.88);
        };
        img.onerror = rej; img.src = url;
      });
      const resized = await resize(file, 1200);
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `description-imgs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error: uploadError } = await supabase.storage.from("mes-secrets-media").upload(path, resized, { contentType: resized.type || file.type, upsert: true });
      if (uploadError || !data) throw new Error(uploadError?.message || "Erreur lors de l'upload");
      const { data: u } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
      restoreRange();
      exec("insertImage", u.publicUrl);
      setTimeout(() => {
        editorRef.current?.querySelectorAll("img").forEach(i => {
          i.style.maxWidth = "100%"; i.style.height = "auto";
          i.style.display = "block"; i.style.margin = "1.25rem auto"; i.style.borderRadius = "12px";
        });
        if (editorRef.current) { isInternal.current = true; onChange(editorRef.current.innerHTML); }
      }, 100);
    } catch (e: any) {
      const d = document.createElement("div");
      d.textContent = "❌ " + (e?.message || "Erreur upload");
      d.style.cssText = "position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#ef4444;color:#fff;padding:10px 20px;border-radius:12px;font-size:13px;font-weight:600;z-index:9999;";
      document.body.appendChild(d); setTimeout(() => document.body.removeChild(d), 4000);
    } finally { setUploading(false); }
  };

  const TB = ({ onClick, title, children }: { onClick: () => void; title: string; children: React.ReactNode }) => (
    <button type="button" onClick={onClick} title={title}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-semibold">
      {children}
    </button>
  );
  const Sep = () => <div className="w-px h-4 bg-white/10 mx-0.5 flex-shrink-0" />;

  return (
    <div className="rounded-2xl overflow-hidden border border-white/10 bg-[#0d1117]">
      <style>{DESCRIPTION_STYLES}</style>
      <div className="bg-[#161b22] border-b border-white/10 px-3 py-2 flex flex-wrap gap-0.5 items-center">
        <TB onClick={() => exec("bold")} title="Gras"><Bold className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("italic")} title="Italique"><Italic className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("underline")} title="Souligné"><Underline className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("strikeThrough")} title="Barré"><Strikethrough className="w-3.5 h-3.5" /></TB>
        <Sep />
        <div className="relative" title="Couleur texte">
          <button type="button" className="w-7 h-7 rounded-lg flex flex-col items-center justify-center hover:bg-white/10 gap-0.5 overflow-hidden">
            <span className="text-xs font-bold text-slate-200">A</span>
            <div className="w-4 h-0.5 rounded-full" style={{ background: textColor }} />
            <input type="color" value={textColor}
              onChange={e => { setTextColor(e.target.value); exec("foreColor", e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
          </button>
        </div>
        <div className="relative" title="Surlignage">
          <button type="button" className="w-7 h-7 rounded-lg flex flex-col items-center justify-center hover:bg-white/10 gap-0.5 overflow-hidden">
            <Baseline className="w-3 h-3 text-slate-400" />
            <div className="w-4 h-0.5 rounded-full" style={{ background: bgColor }} />
            <input type="color" value={bgColor}
              onChange={e => { setBgColor(e.target.value); exec("hiliteColor", e.target.value); }}
              className="absolute inset-0 opacity-0 cursor-pointer" />
          </button>
        </div>
        <Sep />
        <TB onClick={() => exec("formatBlock", "h1")} title="H1"><span className="text-xs font-black">H1</span></TB>
        <TB onClick={() => exec("formatBlock", "h2")} title="H2"><span className="text-xs font-black">H2</span></TB>
        <TB onClick={() => exec("formatBlock", "h3")} title="H3"><span className="text-xs font-black">H3</span></TB>
        <TB onClick={() => exec("formatBlock", "p")} title="Normal"><Type className="w-3.5 h-3.5" /></TB>
        <Sep />
        <TB onClick={() => exec("justifyLeft")} title="Gauche"><AlignLeft className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("justifyCenter")} title="Centre"><AlignCenter className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("justifyRight")} title="Droite"><AlignRight className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("justifyFull")} title="Justifié"><AlignJustify className="w-3.5 h-3.5" /></TB>
        <Sep />
        <TB onClick={() => exec("insertUnorderedList")} title="Liste"><List className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("insertOrderedList")} title="Numérotée"><ListOrdered className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => insertHtml('<ul style="list-style:none"><li>☐ Tâche</li></ul>')} title="Checklist"><CheckSquare className="w-3.5 h-3.5" /></TB>
        <Sep />
        <div className="relative">
          <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden"
            onChange={async e => { const f = e.target.files?.[0]; if (f) await handleImgFile(f); e.target.value = ""; }} />
          <button type="button" title="Image" onClick={() => { saveRange(); imgInputRef.current?.click(); }}
            disabled={uploading}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all disabled:opacity-50">
            {uploading ? <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Image className="w-3.5 h-3.5" />}
          </button>
        </div>
        <TB onClick={() => exec("insertHorizontalRule")} title="Séparateur"><Minus className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("formatBlock", "blockquote")} title="Citation"><Quote className="w-3.5 h-3.5" /></TB>
        <TB onClick={() => exec("formatBlock", "pre")} title="Code"><Code className="w-3.5 h-3.5" /></TB>
        <Sep />
        <select value={fontSize} onChange={e => { setFontSize(e.target.value); exec("fontSize", e.target.value); }}
          className="h-7 text-xs bg-white/5 border border-white/10 rounded-lg px-1.5 text-slate-300 focus:outline-none cursor-pointer">
          {[["1","12px"],["2","13px"],["3","14px"],["4","16px"],["5","18px"],["6","24px"],["7","32px"]].map(([v,l]) =>
            <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="bg-violet-950/20 border-b border-white/5 px-4 py-1.5 flex items-center gap-2">
        <ImagePlus className="w-3 h-3 text-violet-400 flex-shrink-0" />
        <p className="text-xs text-violet-400/70">Bouton <strong className="text-violet-300">🖼</strong> pour uploader. Liens externes interdits.</p>
      </div>
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={async e => {
          e.preventDefault();
          const f = e.dataTransfer.files?.[0];
          if (f?.type.startsWith("image/")) { saveRange(); await handleImgFile(f); }
        }}>
        <div ref={editorRef} contentEditable suppressContentEditableWarning onInput={() => {
          if (editorRef.current) { isInternal.current = true; onChange(editorRef.current.innerHTML); }
        }}
          className="nx-ed p-6 text-sm" dir="ltr" spellCheck={false}
          data-placeholder="Commencez à écrire..." style={{ wordBreak: "break-word" }} />
      </div>
    </div>
  );
}

function SectionEditor({ sectionKey, form, setForm, boutique, onSave, onBack, uploadingPhoto, handlePhotoUpload, fileInputRef }: {
  sectionKey: SectionKey; form: any; setForm: (fn: (p: any) => any) => void; boutique: any;
  onSave: () => void; onBack: () => void; uploadingPhoto: boolean;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const card = SECTION_CARDS.find(c => c.key === sectionKey)!;
  const [newTag, setNewTag] = useState("");

  const pct = form.prix && form.prix_promo
    ? Math.round(((parseFloat(form.prix) - parseFloat(form.prix_promo)) / parseFloat(form.prix)) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e1a] overflow-y-auto">
      <div className="sticky top-0 z-10 bg-[#0d1117]/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-2xl">{card.emoji}</span>
            <div>
              <h2 className="font-bold text-white text-sm leading-tight">{card.label}</h2>
              <p className="text-xs text-slate-500">{card.description}</p>
            </div>
          </div>
          <button onClick={onSave}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/20 active:scale-95">
            <Save className="w-4 h-4" /> Sauvegarder
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {sectionKey === "description" && (
          <>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Nom du produit <span className="text-red-400">*</span></label>
                <input value={form.nom} onChange={e => setForm(p => ({ ...p, nom: e.target.value }))}
                  placeholder="Ex: Formation Marketing Digital 2025"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-semibold focus:outline-none focus:border-violet-500 placeholder-slate-600 transition-colors" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Type <span className="text-red-400">*</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {TYPES_DIGITAL.map(t => (
                    <button key={t.value} type="button" onClick={() => setForm(p => ({ ...p, type_digital: t.value }))}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${
                        form.type_digital === t.value ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10" : "border-white/8 hover:border-white/20"}`}>
                      <span className="text-2xl">{t.emoji}</span>
                      <span className="text-xs font-semibold text-slate-300 text-center leading-tight">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <RichTextEditor value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} />
          </>
        )}

        {sectionKey === "images" && (
          <>
            {form.photos.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-3">Galerie ({form.photos.length})</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {form.photos.map((url: string, i: number) => (
                    <div key={i} className="relative group aspect-square rounded-2xl overflow-hidden border border-white/10">
                      <img src={url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      {i === 0 && <div className="absolute bottom-2 left-2 bg-violet-600 text-white text-xs px-2 py-0.5 rounded-full font-semibold">Principale</div>}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                        <button onClick={() => setForm(p => ({ ...p, photos: p.photos.filter((_: string, j: number) => j !== i) }))}
                          className="opacity-0 group-hover:opacity-100 w-9 h-9 rounded-xl bg-red-500 text-white flex items-center justify-center transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div
              className="border-2 border-dashed border-white/15 rounded-2xl p-12 text-center cursor-pointer hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={async e => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) { const evt = { target: { files: e.dataTransfer.files } } as any; handlePhotoUpload(evt); }
              }}>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              <div className="w-16 h-16 rounded-2xl bg-white/5 group-hover:bg-violet-500/10 flex items-center justify-center mx-auto mb-4 transition-all">
                {uploadingPhoto ? <div className="w-7 h-7 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-7 h-7 text-slate-500 group-hover:text-violet-400 transition-colors" />}
              </div>
              <p className="font-semibold text-slate-400 group-hover:text-white transition-colors">{uploadingPhoto ? "Redimensionnement + envoi…" : "Glissez des images ou cliquez"}</p>
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {([600, 800, 1080] as const).map(s => (
                  <span key={s} className="text-xs font-bold bg-white/8 border border-white/15 text-slate-400 px-2 py-0.5 rounded-full">{s}×{s}px</span>
                ))}
              </div>
              <p className="text-xs text-slate-600 mt-1.5">Ratio 1:1 · <strong className="text-slate-500">Redimensionnement auto</strong> · JPG, PNG, WEBP · max 5MB</p>
            </div>
          </>
        )}

        {sectionKey === "prix" && (
          <div className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { key: "prix", label: "Prix normal *", placeholder: "0", cls: "text-white" },
                { key: "prix_promo", label: "Prix promotionnel", placeholder: "Optionnel", cls: "text-emerald-400" },
              ].map(f => (
                <div key={f.key} className="bg-white/5 rounded-2xl p-5 border border-white/8">
                  <label className="block text-sm font-semibold text-slate-300 mb-2">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">{boutique?.devise || "XOF"}</span>
                    <input type="number" min="0" value={(form as any)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className={`w-full bg-white/5 border border-white/10 rounded-xl pl-16 pr-4 py-3 ${f.cls} text-xl font-bold focus:outline-none focus:border-violet-500 transition-colors`} />
                  </div>
                  {f.key === "prix_promo" && pct > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="bg-red-500/20 text-red-400 text-xs font-black px-2 py-0.5 rounded-full">-{pct}%</span>
                      <span className="text-xs text-emerald-400">Réduction affichée auto</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {pct > 0 && (
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-4 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <p className="text-sm text-emerald-300">Badge <strong>-{pct}%</strong> affiché automatiquement sur la page produit.</p>
              </div>
            )}
            <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-4">
              <p className="text-sm text-violet-300">💡 Produit digital = <strong>stock illimité</strong>. Les clients peuvent acheter sans limite.</p>
            </div>
          </div>
        )}

        {sectionKey === "seo" && (
          <div className="space-y-5">
            <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3">
              <p className="text-xs text-amber-300">🔍 Optimisez votre produit pour Google et attirez du trafic organique gratuit.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8 space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Titre SEO</label>
                  <span className={`text-xs font-mono ${form.seo_titre.length > 55 ? "text-red-400" : "text-slate-500"}`}>{form.seo_titre.length}/60</span>
                </div>
                <input value={form.seo_titre} onChange={e => setForm(p => ({ ...p, seo_titre: e.target.value }))}
                  placeholder={form.nom || "Titre SEO..."}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600" />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <label className="text-sm font-semibold text-slate-300">Meta description</label>
                  <span className={`text-xs font-mono ${form.seo_description.length > 150 ? "text-red-400" : "text-slate-500"}`}>{form.seo_description.length}/160</span>
                </div>
                <textarea value={form.seo_description} onChange={e => setForm(p => ({ ...p, seo_description: e.target.value }))}
                  placeholder="Description pour les moteurs de recherche..." rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-amber-500 transition-colors placeholder-slate-600 resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">Slug URL</label>
                <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                  <span className="text-slate-600 text-sm truncate">{boutique?.slug || "boutique"}.nexora.com/produit/</span>
                  <span className="text-violet-400 text-sm font-medium">{(form.seo_titre || form.nom).toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-") || "produit"}</span>
                </div>
              </div>
            </div>
            {(form.seo_titre || form.nom) && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-3 uppercase tracking-wider">Aperçu Google</p>
                <div className="bg-white rounded-2xl p-4 shadow-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 rounded-sm bg-gradient-to-br from-violet-500 to-indigo-600" />
                    <span className="text-xs text-gray-500">{boutique?.slug || "boutique"}.nexora.com</span>
                  </div>
                  <p className="text-blue-700 text-base font-medium">{form.seo_titre || form.nom}</p>
                  <p className="text-green-700 text-xs mt-0.5">nexora.com › {(form.seo_titre || form.nom).toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, "-")}</p>
                  <p className="text-gray-600 text-xs mt-1 line-clamp-2">{form.seo_description || "Aucune description SEO définie."}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SECTION PAIEMENT — Lien externe uniquement ── */}
        {sectionKey === "paiement" && (
          <div className="space-y-4">

            {/* En-tête fixe : Lien externe (seule option) */}
            <div className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-blue-500 bg-blue-500/10">
              <span className="text-2xl">🔗</span>
              <div className="flex-1">
                <p className="font-semibold text-white text-sm">Lien externe</p>
                <p className="text-xs text-slate-500">Stripe, PayPal, Fedapay, Wave, CinetPay…</p>
              </div>
              <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
            </div>

            {/* Explication */}
            <div className="bg-blue-950/30 border border-blue-800/30 rounded-xl p-3">
              <p className="text-xs text-blue-300">
                🔗 Collez le lien vers votre page de paiement. Le client sera redirigé automatiquement après avoir cliqué sur "Commander".
              </p>
            </div>

            {/* Champ URL */}
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Lien de paiement <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="url"
                  value={form.paiement_lien}
                  onChange={e => setForm((p: any) => ({ ...p, paiement_lien: e.target.value, payment_mode: "external" }))}
                  placeholder="https://buy.stripe.com/..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
                />
              </div>
              {form.paiement_lien && (
                <a
                  href={form.paiement_lien}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" /> Tester le lien
                </a>
              )}
            </div>

            {/* Avertissement */}
            <div className="bg-amber-950/30 border border-amber-800/30 rounded-xl p-3">
              <p className="text-xs text-amber-300">
                ⚠️ Le client sera redirigé vers ce lien dès qu'il confirmera sa commande. Assurez-vous que le montant correspond au prix du produit.
              </p>
            </div>
          </div>
        )}

        {sectionKey === "variantes" && (
          <div className="space-y-5">
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="block text-sm font-semibold text-slate-300 mb-2">Catégorie</label>
              <select value={form.categorie} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                className="w-full bg-[#0d1117] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-violet-500 transition-colors">
                <option value="">-- Sélectionner --</option>
                {CATEGORIES_DIGITAL.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Tags & Mots-clés</label>
              <div className="flex gap-2 mb-3">
                <input value={newTag} onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newTag.trim()) { setForm(p => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(""); } }}
                  placeholder="Nouveau tag..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-violet-500 placeholder-slate-600 transition-colors" />
                <button onClick={() => { if (newTag.trim()) { setForm(p => ({ ...p, tags: [...p.tags, newTag.trim()] })); setNewTag(""); } }}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center transition-all">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              {form.tags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {form.tags.map((t: string, i: number) => (
                    <span key={i} className="flex items-center gap-1.5 bg-violet-500/15 text-violet-300 text-sm px-3 py-1 rounded-full border border-violet-500/30">
                      <Hash className="w-3 h-3" />{t}
                      <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter((_: string, j: number) => j !== i) }))} className="hover:text-red-400 ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-600">Aucun tag. Les tags aident vos clients à trouver votre produit.</p>}
            </div>
          </div>
        )}

        {sectionKey === "livraison" && (
          <div className="space-y-4">
            <div className="bg-teal-950/30 border border-teal-800/30 rounded-xl p-4 flex gap-3">
              <span className="text-xl">📋</span>
              <p className="text-sm text-teal-300">Instructions affichées au client <strong>après l'achat</strong>. Expliquez comment accéder au produit.</p>
            </div>
            <div className="bg-white/5 rounded-2xl p-5 border border-white/8">
              <label className="block text-sm font-semibold text-slate-300 mb-3">Instructions après achat</label>
              <textarea value={form.instructions_achat} onChange={e => setForm(p => ({ ...p, instructions_achat: e.target.value }))}
                placeholder="Ex: Envoyez votre reçu sur WhatsApp +229... Vous recevrez le lien sous 30 minutes." rows={8}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-teal-500 placeholder-slate-600 resize-none transition-colors" />
            </div>
            <div className="bg-yellow-950/30 border border-yellow-800/30 rounded-xl p-3">
              <p className="text-xs text-yellow-300">⚠️ Les fichiers ne sont pas hébergés sur la plateforme. Vous gérez la livraison (WhatsApp, email, Drive...).</p>
            </div>
          </div>
        )}

        {sectionKey === "stock" && (
          <div className="bg-white/5 rounded-2xl p-8 border border-white/8 text-center">
            <span className="text-5xl">♾️</span>
            <h3 className="font-bold text-white text-lg mt-4">Stock illimité activé</h3>
            <p className="text-slate-400 text-sm mt-2">Les produits digitaux ont automatiquement un stock illimité.</p>
            <div className="mt-4 inline-flex items-center gap-2 bg-indigo-500/15 border border-indigo-500/30 rounded-xl px-4 py-2">
              <CheckCircle className="w-4 h-4 text-indigo-400" />
              <span className="text-indigo-300 text-sm font-medium">∞ Illimité</span>
            </div>
          </div>
        )}

        {sectionKey === "visibilite" && (
          <div className="space-y-3">
            {[
              { key: "actif", label: "Produit actif", sub: "Visible en boutique et dans les recherches", grad: "from-emerald-500 to-green-500" },
              { key: "vedette", label: "Vedette", sub: "Mis en avant sur votre page boutique", grad: "from-yellow-400 to-amber-500" },
            ].map(f => (
              <div key={f.key} onClick={() => setForm(p => ({ ...p, [f.key]: !(p as any)[f.key] }))}
                className="flex items-center justify-between bg-white/5 rounded-2xl p-5 border border-white/8 cursor-pointer hover:bg-white/7 transition-all">
                <div>
                  <p className="font-semibold text-white">{f.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{f.sub}</p>
                </div>
                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${(form as any)[f.key] ? `bg-gradient-to-r ${f.grad} shadow-lg` : "bg-white/10"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${(form as any)[f.key] ? "left-6" : "left-0.5"}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        {sectionKey === "apercu" && (
          <div className="bg-white/5 rounded-2xl border border-white/8 overflow-hidden">
            <div className="bg-white/3 border-b border-white/8 px-4 py-2 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/50" />
              </div>
              <span className="text-xs text-slate-500 flex-1 text-center">{boutique?.slug}.nexora.com/produit/...</span>
            </div>
            <div className="p-5">
              {form.photos[0] && <div className="aspect-video rounded-xl overflow-hidden mb-4 bg-white/5"><img src={form.photos[0]} alt="" className="w-full h-full object-cover" /></div>}
              <h3 className="font-bold text-white text-base">{form.nom || "Nom du produit"}</h3>
              <div className="flex items-center gap-2 mt-1">
                {form.prix_promo && parseFloat(form.prix) && parseFloat(form.prix_promo) ? (
                  <>
                    <span className="text-lg font-black text-violet-400">{formatPrix(parseFloat(form.prix_promo), boutique?.devise)}</span>
                    <span className="text-sm text-red-400 line-through">{formatPrix(parseFloat(form.prix), boutique?.devise)}</span>
                  </>
                ) : form.prix ? <span className="text-lg font-black text-violet-400">{formatPrix(parseFloat(form.prix), boutique?.devise)}</span>
                  : <span className="text-sm text-slate-500">— Prix non défini</span>}
              </div>
              {form.tags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mt-3">
                  {form.tags.map((t: string, i: number) => (
                    <span key={i} className="text-xs bg-violet-500/15 text-violet-300 px-2 py-0.5 rounded-full">#{t}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProduitsDigitauxPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPremium = hasNexoraPremium();

  const [boutique, setBoutique] = useState<any>(null);
  const [produits, setProduits] = useState<ProduitDigital[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [productStatus, setProductStatus] = useState<ProductStatus>("draft");

  const emptyForm = {
    nom: "", description: "", prix: "", prix_promo: "", type_digital: "", categorie: "",
    tags: [] as string[], photos: [] as string[], actif: false, vedette: false,
    payment_mode: "external" as "external",
    paiement_lien: "",
    instructions_achat: "", seo_titre: "", seo_description: "",
  };

  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const userId = getNexoraUser()?.id;
    if (!userId) { setLoading(false); return; }
    const { data: b } = await supabase.from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (b) {
      setBoutique(b);
      const { data: prods } = await supabase.from("produits" as any).select("*")
        .eq("boutique_id", (b as any).id).eq("type", "numerique").order("created_at", { ascending: false });
      setProduits((prods as any[] || []).map(p => ({ ...p, tags: p.tags || [], photos: p.photos || [] })));
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (!isPremium) {
    return (
      <BoutiqueLayout boutiqueName="Nexora Shop">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-500 text-sm mb-8 max-w-xs">La vente de produits digitaux est réservée aux membres <span className="font-bold text-yellow-600">Premium</span>.</p>
          <Button onClick={() => navigate("/boutique/parametres")}
            className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white font-bold px-8 py-3 rounded-xl gap-2">
            <Crown className="w-4 h-4" /> Passer à Premium
          </Button>
        </div>
      </BoutiqueLayout>
    );
  }

  const ALLOWED_SIZES = [600, 800, 1080] as const;
  type AllowedSize = typeof ALLOWED_SIZES[number];

  const getBestTargetSize = (w: number, h: number): AllowedSize => {
    const maxDim = Math.max(w, h);
    if (maxDim >= 1080) return 1080;
    if (maxDim >= 800) return 800;
    return 600;
  };

  const resizeToSquare = (file: File, targetSize: AllowedSize): Promise<Blob> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        if (!dataUrl) { reject(new Error("Lecture échouée")); return; }
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          canvas.width = targetSize; canvas.height = targetSize;
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Canvas indisponible")); return; }
          const srcSize = Math.min(img.naturalWidth, img.naturalHeight);
          const sx = (img.naturalWidth - srcSize) / 2;
          const sy = (img.naturalHeight - srcSize) / 2;
          ctx.drawImage(img, sx, sy, srcSize, srcSize, 0, 0, targetSize, targetSize);
          canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas échoué")), "image/jpeg", 0.92);
        };
        img.onerror = () => reject(new Error("Image illisible"));
        img.src = dataUrl;
      };
      reader.onerror = () => reject(new Error("Fichier illisible"));
      reader.readAsDataURL(file);
    });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!["image/jpeg","image/png","image/webp","image/gif"].includes(file.type)) {
      toast({ title: "Format non supporté", description: "JPG, PNG, WEBP ou GIF uniquement.", variant: "destructive" }); return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Fichier trop lourd", description: "Maximum 5 MB.", variant: "destructive" }); return;
    }
    setUploadingPhoto(true);
    try {
      let targetSize: AllowedSize = 800;
      try {
        await new Promise<void>((res) => {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const img = new window.Image();
            img.onload = () => { targetSize = getBestTargetSize(img.naturalWidth, img.naturalHeight); res(); };
            img.onerror = () => res();
            img.src = ev.target?.result as string;
          };
          reader.onerror = () => res();
          reader.readAsDataURL(file);
        });
      } catch { /* fallback 800 */ }
      const blob = await resizeToSquare(file, targetSize);
      const userId = getNexoraUser()?.id ?? "anon";
      const path = `boutique-produits/${userId}/digital/${Date.now()}.jpg`;
      const { error } = await supabase.storage.from("mes-secrets-media").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
      setForm(prev => ({ ...prev, photos: [...prev.photos, urlData.publicUrl] }));
      toast({ title: "✅ Image ajoutée !", description: `Redimensionnée en ${targetSize}×${targetSize}px` });
    } catch (err: any) {
      toast({ title: "Erreur upload", description: err.message, variant: "destructive" });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (status: ProductStatus = productStatus) => {
    if (!boutique) { toast({ title: "Configurez d'abord votre boutique", variant: "destructive" }); return; }
    if (!form.nom || !form.prix) { toast({ title: "Nom et prix obligatoires", variant: "destructive" }); return; }
    if (!form.type_digital) { toast({ title: "Choisissez un type de produit", variant: "destructive" }); return; }
    setSaving(true);
    const payload = {
      boutique_id: boutique.id, type: "numerique", type_digital: form.type_digital,
      nom: form.nom, description: form.description || null,
      prix: parseFloat(form.prix), prix_promo: form.prix_promo ? parseFloat(form.prix_promo) : null,
      categorie: form.categorie || null, tags: form.tags, photos: form.photos,
      actif: status === "published" || form.actif, vedette: form.vedette,
      paiement_lien: form.paiement_lien || null,
      payment_mode: "external",
      paiement_reception: false,
      nexora_paylink_id: null,
      nexora_paylink_url: null,
      stock_illimite: true, stock: 0,
      instructions_achat: form.instructions_achat || null,
      seo_titre: form.seo_titre || null, seo_description: form.seo_description || null,
    };
    let err;
    if (editingId) { ({ error: err } = await supabase.from("produits" as any).update(payload).eq("id", editingId)); }
    else { ({ error: err } = await supabase.from("produits" as any).insert(payload)); }
    if (err) { toast({ title: "Erreur", description: err.message, variant: "destructive" }); setSaving(false); return; }
    toast({ title: `✅ Produit ${status === "published" ? "publié" : "enregistré"} !` });
    resetForm(); setSaving(false); load();
  };

  const handleEdit = (p: ProduitDigital) => {
    setForm({
      nom: p.nom, description: p.description || "", prix: String(p.prix), prix_promo: String(p.prix_promo || ""),
      type_digital: p.type_digital || "", categorie: p.categorie || "", tags: p.tags || [], photos: p.photos || [],
      actif: p.actif, vedette: p.vedette,
      payment_mode: "external",
      paiement_lien: p.paiement_lien || "",
      instructions_achat: (p as any).instructions_achat || "",
      seo_titre: (p as any).seo_titre || "", seo_description: (p as any).seo_description || "",
    });
    setEditingId(p.id); setProductStatus(p.actif ? "published" : "draft");
    setShowBuilder(true); window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return;
    await supabase.from("avis_produits" as any).delete().eq("produit_id", id);
    const { error } = await supabase.from("produits" as any).delete().eq("id", id);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); return; }
    setProduits(prev => prev.filter(p => p.id !== id));
    toast({ title: "Produit supprimé" });
  };

  const toggleField = async (id: string, field: "actif" | "vedette", value: boolean) => {
    await supabase.from("produits" as any).update({ [field]: value }).eq("id", id); load();
  };

  const copyLink = (id: string) => {
    if (!boutique?.slug) { toast({ title: "Configurez d'abord votre boutique", variant: "destructive" }); return; }
    navigator.clipboard.writeText(`${window.location.origin}/shop/${boutique.slug}/produit/${id}`);
    toast({ title: "✅ Lien copié !" });
  };

  const duplicateProduit = async (p: ProduitDigital) => {
    const payload = {
      boutique_id: p.boutique_id, type: "numerique", type_digital: p.type_digital,
      nom: `${p.nom} (copie)`, description: p.description, prix: p.prix,
      prix_promo: p.prix_promo, categorie: p.categorie, tags: p.tags, photos: p.photos,
      actif: false, vedette: false, paiement_lien: p.paiement_lien,
      payment_mode: "external", paiement_reception: false, stock_illimite: true, stock: 0,
      instructions_achat: (p as any).instructions_achat,
      nexora_paylink_id: null, nexora_paylink_url: null,
    };
    const { error } = await supabase.from("produits" as any).insert(payload);
    if (error) { toast({ title: "Erreur duplication", variant: "destructive" }); return; }
    toast({ title: "✅ Produit dupliqué !" }); load();
  };

  const resetForm = () => {
    setShowBuilder(false); setEditingId(null); setForm(emptyForm); setActiveSection(null); setProductStatus("draft");
  };

  const isComplete = (key: SectionKey) => {
    switch (key) {
      case "description": return !!(form.nom && form.type_digital);
      case "images": return form.photos.length > 0;
      case "prix": return !!form.prix;
      case "seo": return !!(form.seo_titre || form.seo_description);
      case "paiement": return !!form.paiement_lien;
      case "variantes": return !!(form.categorie || form.tags.length > 0);
      case "livraison": return !!form.instructions_achat;
      case "stock": return true;
      case "visibilite": return true;
      case "apercu": return !!(form.nom && form.prix);
    }
  };

  const completed = SECTION_CARDS.filter(c => isComplete(c.key)).length;
  const filtered = produits.filter(p => p.nom.toLowerCase().includes(searchQ.toLowerCase()));
  const typeInfo = (t: string) => TYPES_DIGITAL.find(x => x.value === t);

  // Full-screen section editor
  if (activeSection) {
    return (
      <SectionEditor
        sectionKey={activeSection} form={form} setForm={setForm} boutique={boutique}
        onSave={() => { setActiveSection(null); toast({ title: "✅ Section sauvegardée" }); }}
        onBack={() => setActiveSection(null)}
        uploadingPhoto={uploadingPhoto} handlePhotoUpload={handlePhotoUpload} fileInputRef={fileInputRef}
      />
    );
  }

  // Product Builder
  if (showBuilder) {
    return (
      <div className="fixed inset-0 z-40 bg-[#070b14] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-[#070b14]/95 backdrop-blur-xl border-b border-white/8">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={resetForm} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-white text-sm">{editingId ? "Modifier le produit" : "Nouveau produit digital"}</h1>
              <p className="text-xs text-slate-500">{completed}/{SECTION_CARDS.length} sections complétées</p>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border flex-shrink-0 ${
              productStatus === "published" ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" :
              productStatus === "ready" ? "bg-blue-500/15 border-blue-500/30 text-blue-400" : "bg-white/8 border-white/12 text-slate-400"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${productStatus === "published" ? "bg-emerald-400 animate-pulse" : productStatus === "ready" ? "bg-blue-400" : "bg-slate-600"}`} />
              {productStatus === "published" ? "Publié" : productStatus === "ready" ? "Prêt" : "Brouillon"}
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6 space-y-4 pb-36">
          <div className="bg-white/4 rounded-2xl p-4 border border-white/8">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-slate-400">Progression du produit</span>
              <span className="text-xs font-bold text-violet-400">{Math.round((completed / SECTION_CARDS.length) * 100)}%</span>
            </div>
            <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-600 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(completed / SECTION_CARDS.length) * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTION_CARDS.map(card => {
              const done = isComplete(card.key);
              return (
                <button key={card.key} onClick={() => setActiveSection(card.key)}
                  className={`group w-full text-left bg-white/4 hover:bg-white/7 rounded-2xl p-4 border transition-all hover:scale-[1.01] active:scale-[0.99] ${done ? "border-white/12 hover:border-violet-500/25" : "border-white/7 hover:border-white/14"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-lg">{card.emoji}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm">{card.label}</p>
                      <p className="text-xs text-slate-500 truncate">{card.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {done && <div className={`w-2 h-2 rounded-full ${card.dot} shadow-lg`} />}
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#070b14]/95 backdrop-blur-xl border-t border-white/8 px-4 py-4">
          <div className="max-w-2xl mx-auto space-y-3">
            <div className="flex gap-2">
              {(["draft","ready","published"] as ProductStatus[]).map(s => (
                <button key={s} onClick={() => setProductStatus(s)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
                    productStatus === s
                      ? s === "published" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                        : s === "ready" ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                        : "bg-white/15 text-white"
                      : "bg-white/5 text-slate-500 hover:text-slate-300"
                  }`}>
                  {s === "draft" ? "Brouillon" : s === "ready" ? "Prêt" : "Publié"}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleSubmit("draft")} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-white/8 hover:bg-white/12 border border-white/10 text-slate-300 text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Brouillon
              </button>
              <button onClick={() => handleSubmit("published")} disabled={saving}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white text-sm font-bold transition-all disabled:opacity-50 shadow-lg shadow-violet-600/25 flex items-center justify-center gap-2">
                <Send className="w-4 h-4" /> {saving ? "Publication..." : "PUBLIER LE PRODUIT"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Products List
  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-5 pb-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100">Produits Digitaux</h1>
              <span className="bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">PRO</span>
            </div>
            <p className="text-sm text-gray-500">{produits.length} produit{produits.length !== 1 ? "s" : ""}</p>
          </div>
          <button onClick={() => { resetForm(); setShowBuilder(true); }}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 active:scale-95">
            <Plus className="w-4 h-4" /> Nouveau
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Package, label: "Total", value: produits.length, c: "text-violet-600", bg: "bg-violet-50 dark:bg-violet-950/30" },
            { icon: Eye, label: "Actifs", value: produits.filter(p => p.actif).length, c: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-950/30" },
            { icon: Star, label: "Vedettes", value: produits.filter(p => p.vedette).length, c: "text-amber-500", bg: "bg-amber-50 dark:bg-amber-950/30" },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
              <s.icon className={`w-5 h-5 ${s.c} mx-auto mb-1`} />
              <p className={`text-lg font-black ${s.c}`}>{s.value}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Rechercher..." className="pl-9 h-10" />
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700/50 rounded-2xl">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-gray-700 dark:text-gray-300 font-bold text-lg">Aucun produit digital</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Créez votre premier ebook, formation ou template !</p>
            <button onClick={() => { resetForm(); setShowBuilder(true); }}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-violet-500/20 hover:scale-105 active:scale-95">
              <Plus className="w-4 h-4" /> Créer mon premier produit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(produit => {
              const isExp = expandedId === produit.id;
              const photo = produit.photos?.[0];
              const ti = typeInfo(produit.type_digital || "autre");
              const pctP = produit.prix_promo ? Math.round(((produit.prix - produit.prix_promo) / produit.prix) * 100) : 0;
              return (
                <div key={produit.id} className="bg-white dark:bg-gray-800/70 border border-gray-100 dark:border-gray-700/50 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="p-4">
                    <div className="flex gap-3 items-start">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex-shrink-0">
                        {photo ? <img src={photo} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">{ti?.emoji || "📦"}</div>}
                        {pctP > 0 && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-black px-1 py-0.5 rounded-bl-lg">-{pctP}%</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-gray-800 dark:text-gray-100 truncate text-sm">{produit.nom}</span>
                          {produit.vedette && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                          {ti && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ti.color}`}>{ti.emoji} {ti.label}</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${produit.actif ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"}`}>
                            {produit.actif ? "Actif" : "Inactif"}
                          </span>
                          {produit.paiement_lien && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                              🔗 Lien externe
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          {produit.prix_promo ? (
                            <><span className="font-black text-violet-600 dark:text-violet-400 text-sm">{formatPrix(produit.prix_promo, boutique?.devise)}</span>
                            <span className="text-xs text-red-400 line-through">{formatPrix(produit.prix, boutique?.devise)}</span></>
                          ) : <span className="font-black text-violet-600 dark:text-violet-400 text-sm">{formatPrix(produit.prix, boutique?.devise)}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button onClick={() => copyLink(produit.id)} className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-400 transition-colors"><Share2 className="w-4 h-4" /></button>
                        <button onClick={() => handleEdit(produit)} className="p-1.5 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-900/20 text-violet-500 transition-colors"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => duplicateProduit(produit)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"><Copy className="w-4 h-4" /></button>
                        <button onClick={() => setExpandedId(isExp ? null : produit.id)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors">
                          {isExp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(produit.id)} className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-400 hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  </div>
                  {isExp && (
                    <div className="border-t border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-900/30 p-4 space-y-3">
                      <div className="flex gap-2 flex-wrap">
                        <button onClick={() => toggleField(produit.id, "actif", !produit.actif)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${produit.actif ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          {produit.actif ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {produit.actif ? "Désactiver" : "Activer"}
                        </button>
                        <button onClick={() => toggleField(produit.id, "vedette", !produit.vedette)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${produit.vedette ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"}`}>
                          <Star className="w-3.5 h-3.5" /> {produit.vedette ? "Retirer vedette" : "Vedette"}
                        </button>
                        <button onClick={() => window.open(`/shop/${boutique?.slug}/produit/${produit.id}`, "_blank")}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                          <ExternalLink className="w-3.5 h-3.5" /> Voir la page
                        </button>
                      </div>
                      {produit.tags?.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap">
                          {produit.tags.map((t, i) => <span key={i} className="text-xs bg-violet-50 text-violet-600 dark:bg-violet-900/20 dark:text-violet-400 px-2 py-0.5 rounded-full border border-violet-100 dark:border-violet-800/30">#{t}</span>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BoutiqueLayout>
  );
}
