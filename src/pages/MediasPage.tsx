import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playSuccessSound } from "@/lib/app-utils";
import { getNexoraUser } from "@/lib/nexora-auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Image, Film, FileText, Link2, Trash2, Download, ExternalLink, Upload, Eye, X } from "lucide-react";

type TypeMedia = "photo" | "video" | "document" | "lien";
interface Media { id: string; nom: string; type_media: TypeMedia; url: string; taille_bytes?: number; description?: string; created_at: string; }

const TYPE_ICONS: Record<TypeMedia, any> = { photo: Image, video: Film, document: FileText, lien: Link2 };
const TYPE_COLORS: Record<TypeMedia, string> = { photo: "text-blue-600 bg-blue-50", video: "text-purple-600 bg-purple-50", document: "text-orange-600 bg-orange-50", lien: "text-green-600 bg-green-50" };
const TYPE_LABELS: Record<TypeMedia, string> = { photo: "Photo", video: "Vidéo", document: "Document", lien: "Lien" };

export default function MediasPage() {
  const [medias, setMedias] = useState<Media[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<TypeMedia | "">("");
  const [showForm, setShowForm] = useState(false);
  const [preview, setPreview] = useState<Media | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const user = getNexoraUser();
  const userId = user?.id;

  const [form, setForm] = useState({ type_media: "photo" as TypeMedia, nom: "", url: "", description: "" });
  const [uploadMode, setUploadMode] = useState<"url" | "upload">("upload");

  useEffect(() => { if (userId) loadMedias(); }, [userId]);

  const loadMedias = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("medias").select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setMedias((data || []) as Media[]);
    setLoading(false);
  };

  const filtered = medias.filter(m => {
    const q = search.toLowerCase();
    const matchSearch = m.nom.toLowerCase().includes(q) || (m.description || "").toLowerCase().includes(q);
    const matchType = filterType ? m.type_media === filterType : true;
    return matchSearch && matchType;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("mes-secrets-media").upload(path, file);
    if (error) { toast({ title: "Erreur upload", description: error.message, variant: "destructive" }); setUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("mes-secrets-media").getPublicUrl(path);
    setForm(f => ({ ...f, url: publicUrl, nom: f.nom || file.name, type_media: file.type.startsWith("image") ? "photo" : file.type.startsWith("video") ? "video" : "document" }));
    setUploading(false);
    toast({ title: "✅ Fichier téléversé !" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.url || !userId) return;
    const { error } = await supabase.from("medias").insert([{
      nom: form.nom, type_media: form.type_media, url: form.url, description: form.description || null, user_id: userId,
    }]);
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { playSuccessSound(); toast({ title: "✅ Média enregistré." }); setForm({ type_media: "photo", nom: "", url: "", description: "" }); setShowForm(false); loadMedias(); }
  };

  const handleDelete = async (m: Media) => {
    if (!userId) return;
    if (m.url.includes("mes-secrets-media")) { const path = m.url.split("/mes-secrets-media/")[1]; if (path) await supabase.storage.from("mes-secrets-media").remove([path]); }
    await supabase.from("medias").delete().eq("id", m.id).eq("user_id", userId);
    toast({ title: "Supprimé" }); loadMedias();
  };

  const isImage = (url: string) => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(url);
  const isVideo = (url: string) => /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);

  return (
    <AppLayout searchQuery={search} onSearchChange={setSearch}>
      <div className="space-y-5 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl flex items-center gap-2"><Image className="w-6 h-6 text-primary" /> Médias</h1>
            <p className="text-sm text-muted-foreground">Photos, vidéos, documents et liens</p>
          </div>
          <Button onClick={() => setShowForm(!showForm)} size="sm" className="gap-1.5 bg-primary text-primary-foreground"><Plus className="w-4 h-4" /> Ajouter</Button>
        </div>

        {showForm && (
          <div className="bg-card border border-primary/20 rounded-xl p-5 shadow-brand animate-fade-in-up">
            <h3 className="font-display font-bold mb-4 text-primary flex items-center gap-2"><Upload className="w-4 h-4" /> Ajouter un média</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex gap-2 flex-wrap">
                {(["photo", "video", "document", "lien"] as TypeMedia[]).map(t => {
                  const Icon = TYPE_ICONS[t];
                  return (<button key={t} type="button" onClick={() => setForm(f => ({ ...f, type_media: t }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all ${form.type_media === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}><Icon className="w-3.5 h-3.5" /> {TYPE_LABELS[t]}</button>);
                })}
              </div>
              <Input placeholder="Nom *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required className="sm:col-span-2" />
              {form.type_media !== "lien" ? (
                <div className="sm:col-span-2 space-y-2">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setUploadMode("upload")} className={`px-3 py-1 rounded-full text-xs font-medium ${uploadMode === "upload" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>📁 Téléverser</button>
                    <button type="button" onClick={() => setUploadMode("url")} className={`px-3 py-1 rounded-full text-xs font-medium ${uploadMode === "url" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>🔗 Par lien</button>
                  </div>
                  {uploadMode === "upload" ? (
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input type="file" id="file-upload" className="hidden" accept={form.type_media === "photo" ? "image/*" : form.type_media === "video" ? "video/*" : "*"} onChange={handleFileUpload} />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {uploading ? (<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />Téléversement...</div>) : (<><Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Cliquez pour sélectionner</p></>)}
                      </label>
                      {form.url && <p className="text-xs text-green-600 mt-2 truncate">✅ {form.url.split("/").pop()}</p>}
                    </div>
                  ) : (<Input placeholder="URL du fichier" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />)}
                </div>
              ) : (<Input placeholder="URL du lien *" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} required className="sm:col-span-2" />)}
              <Input placeholder="Description (optionnel)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="sm:col-span-2" />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
                <Button type="submit" disabled={!form.url} className="bg-primary text-primary-foreground">✅ Enregistrer</Button>
              </div>
            </form>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilterType("")} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${!filterType ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>Tout ({medias.length})</button>
          {(["photo", "video", "document", "lien"] as TypeMedia[]).map(t => {
            const Icon = TYPE_ICONS[t]; const count = medias.filter(m => m.type_media === t).length;
            return (<button key={t} onClick={() => setFilterType(t === filterType ? "" : t)} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold ${filterType === t ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-primary/10"}`}><Icon className="w-3.5 h-3.5" /> {TYPE_LABELS[t]} ({count})</button>);
          })}
        </div>

        {loading ? (<div className="p-8 text-center text-muted-foreground">Chargement...</div>) : filtered.length === 0 ? (
          <div className="p-8 text-center"><Image className="w-10 h-10 text-muted-foreground mx-auto mb-2" /><p className="text-muted-foreground">Aucun média enregistré</p></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.map(m => {
              const Icon = TYPE_ICONS[m.type_media]; const color = TYPE_COLORS[m.type_media];
              return (
                <div key={m.id} className="bg-card border border-border rounded-xl overflow-hidden card-hover group">
                  <div className="aspect-video bg-muted relative overflow-hidden cursor-pointer" onClick={() => setPreview(m)}>
                    {m.type_media === "photo" && isImage(m.url) ? (<img src={m.url} alt={m.nom} className="w-full h-full object-cover" />) : m.type_media === "video" && isVideo(m.url) ? (<video src={m.url} className="w-full h-full object-cover" muted />) : (<div className={`w-full h-full flex items-center justify-center ${color}`}><Icon className="w-10 h-10" /></div>)}
                    <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/20 transition-all flex items-center justify-center"><Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-all" /></div>
                  </div>
                  <div className="p-2.5">
                    <div className="font-medium text-xs truncate">{m.nom}</div>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs font-medium ${color} px-1.5 py-0.5 rounded-full`}>{TYPE_LABELS[m.type_media]}</span>
                      <div className="flex gap-1 ml-auto">
                        <a href={m.url} download target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-3.5 h-3.5" /></a>
                        <button onClick={() => handleDelete(m)} className="p-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preview && (
        <div className="fixed inset-0 bg-foreground/80 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setPreview(null)} className="absolute -top-10 right-0 text-white hover:text-accent"><X className="w-8 h-8" /></button>
            <div className="bg-card rounded-2xl overflow-hidden">
              {preview.type_media === "photo" && isImage(preview.url) ? (<img src={preview.url} alt={preview.nom} className="max-h-[80vh] w-full object-contain" />) : preview.type_media === "video" && isVideo(preview.url) ? (<video src={preview.url} controls className="max-h-[80vh] w-full" />) : (<div className="p-8 text-center"><a href={preview.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-primary hover:underline font-medium"><ExternalLink className="w-5 h-5" /> Ouvrir {preview.nom}</a></div>)}
              <div className="p-4 flex items-center justify-between">
                <div><div className="font-semibold">{preview.nom}</div>{preview.description && <div className="text-sm text-muted-foreground">{preview.description}</div>}</div>
                <a href={preview.url} download target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium"><Download className="w-4 h-4" /> Télécharger</a>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}