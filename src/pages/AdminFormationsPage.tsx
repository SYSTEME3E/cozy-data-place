/**
 * NEXORA Admin — Gestion des Formations
 * ✅ Créer / Modifier / Supprimer des formations
 * ✅ Modules & sous-modules (leçons)
 * ✅ Vidéo depuis galerie (upload Supabase Storage) OU lien externe
 * ✅ Durée par leçon (MM:SS) → durée totale auto-calculée
 * ✅ RLS + SQL : voir nexora_formations_v2.sql
 */


import { useEffect, useState, useRef, useCallback } from "react";
import {
  BookOpen, Plus, Edit2, Trash2, Eye, EyeOff, Loader2, X,
  Save, Image as ImageIcon, Play, FileText, AlertTriangle, ArrowLeft,
  ChevronDown, ChevronUp, Lock, Clock, Upload, Video, Link as LinkIcon,
  GraduationCap, CheckCircle, MoreVertical
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMontant } from "@/lib/mlm-utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Lecon {
  id?: string;
  tempId: string;
  titre: string;
  type: "video" | "pdf" | "lien";
  url: string;
  urlSource: "externe" | "upload";
  duree_secondes: number;
  dureeInput: string; // "MM:SS" affiché dans l'input
  ordre: number;
  est_preview: boolean;
  uploadFile?: File | null;
  uploadProgress?: number;
}

interface Module {
  id?: string;
  tempId: string;
  titre: string;
  description: string;
  ordre: number;
  expanded: boolean;
  lecons: Lecon[];
}

interface Formation {
  id: string;
  titre: string;
  description: string | null;
  prix: number;
  prix_promo: number | null;
  image_url: string | null;
  contenu_type: string;
  contenu_url: string | null;
  actif: boolean;
  niveau: string | null;
  categorie: string | null;
  duree_totale: number | null;
  created_at: string;
  nb_modules?: number;
  nb_achats?: number;
}

interface BasicForm {
  titre: string;
  description: string;
  prix: number;
  prix_promo: number;
  image_url: string;
  niveau: string;
  categorie: string;
  actif: boolean;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const NIVEAUX = ["Débutant", "Intermédiaire", "Avancé", "Expert"];
const CATEGORIES = [
  "Marketing Digital", "Finance & Business", "Développement personnel",
  "Technologie", "Entrepreneuriat", "MLM & Affiliation", "Autre"
];
const EMPTY_BASIC: BasicForm = {
  titre: "", description: "", prix: 0, prix_promo: 0,
  image_url: "", niveau: "", categorie: "", actif: true,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

const parseMMSS = (str: string): number => {
  const parts = str.split(":").map(s => parseInt(s) || 0);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 60;
};

const toMMSS = (sec: number): string => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDureeTotale = (sec: number): string => {
  if (!sec || sec === 0) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
};

const newLecon = (ordre: number): Lecon => ({
  tempId: uid(), titre: "", type: "video", url: "",
  urlSource: "externe", duree_secondes: 0, dureeInput: "0:00",
  ordre, est_preview: false,
});

const newModule = (ordre: number): Module => ({
  tempId: uid(), titre: "", description: "",
  ordre, expanded: true, lecons: [newLecon(0)],
});

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AdminFormationsPage() {
  const { toast } = useToast();

  // Vue principale
  const [view, setView] = useState<"list" | "editor">("list");

  // Liste
  const [formations, setFormations] = useState<Formation[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Éditeur
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [basicForm, setBasicForm] = useState<BasicForm>({ ...EMPTY_BASIC });
  const [modules, setModules] = useState<Module[]>([newModule(0)]);
  const [imagePreview, setImagePreview] = useState("");

  // Durée totale calculée en temps réel
  const totalSeconds = modules
    .flatMap(m => m.lecons)
    .reduce((sum, l) => sum + (l.duree_secondes || 0), 0);

  // ── Chargement liste ────────────────────────────────────────────────────────
  const loadFormations = async () => {
    setLoadingList(true);
    const { data } = await (supabase as any)
      .from("formations")
      .select(`*, formation_modules(id), formation_purchases(id)`)
      .order("created_at", { ascending: false });

    const enriched = (data || []).map((f: any) => ({
      ...f,
      nb_modules: Array.isArray(f.formation_modules) ? f.formation_modules.length : 0,
      nb_achats: Array.isArray(f.formation_purchases)
        ? f.formation_purchases.length : 0,
    }));
    setFormations(enriched);
    setLoadingList(false);
  };

  useEffect(() => { loadFormations(); }, []);

  // ── Ouvrir éditeur ──────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditingId(null);
    setBasicForm({ ...EMPTY_BASIC });
    setModules([newModule(0)]);
    setImagePreview("");
    setView("editor");
  };

  const openEdit = async (f: Formation) => {
    setEditingId(f.id);
    setBasicForm({
      titre: f.titre,
      description: f.description || "",
      prix: f.prix,
      prix_promo: f.prix_promo || 0,
      image_url: f.image_url || "",
      niveau: f.niveau || "",
      categorie: f.categorie || "",
      actif: f.actif,
    });
    setImagePreview(f.image_url || "");

    // Charger modules + leçons (deux requêtes séparées pour éviter problèmes RLS)
    const { data: modsData, error: modsErr } = await (supabase as any)
      .from("formation_modules")
      .select("*")
      .eq("formation_id", f.id)
      .order("ordre", { ascending: true });

    if (modsErr) {
      console.error("Erreur chargement modules:", modsErr);
    }

    if (modsData && modsData.length > 0) {
      // Charger les leçons pour chaque module
      const modIds = modsData.map((m: any) => m.id);
      const { data: leconsData } = await (supabase as any)
        .from("formation_lecons")
        .select("*")
        .in("module_id", modIds)
        .order("ordre", { ascending: true });

      const leconsByModule: Record<string, any[]> = {};
      (leconsData || []).forEach((l: any) => {
        if (!leconsByModule[l.module_id]) leconsByModule[l.module_id] = [];
        leconsByModule[l.module_id].push(l);
      });

      const loadedModules: Module[] = modsData.map((m: any) => ({
        id: m.id,
        tempId: uid(),
        titre: m.titre,
        description: m.description || "",
        ordre: m.ordre,
        expanded: false,
        lecons: (leconsByModule[m.id] || [])
          .sort((a: any, b: any) => a.ordre - b.ordre)
          .map((l: any): Lecon => ({
            id: l.id,
            tempId: uid(),
            titre: l.titre,
            type: l.type || "video",
            url: l.url || "",
            urlSource: "externe",
            duree_secondes: l.duree_secondes || 0,
            dureeInput: toMMSS(l.duree_secondes || 0),
            ordre: l.ordre,
            est_preview: l.est_preview || false,
          })),
      }));
      setModules(loadedModules);
    } else {
      setModules([newModule(0)]);
    }

    setView("editor");
  };

  // ── Sauvegarde ─────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!basicForm.titre.trim()) {
      toast({ title: "Le titre est requis", variant: "destructive" }); return;
    }
    setSaving(true);

    try {
      // 1. Sauvegarder les infos de base
      const payload: any = {
        titre: basicForm.titre.trim(),
        description: basicForm.description.trim() || null,
        prix: Number(basicForm.prix) || 0,
        prix_promo: Number(basicForm.prix_promo) > 0 ? Number(basicForm.prix_promo) : null,
        image_url: basicForm.image_url.trim() || null,
        niveau: basicForm.niveau || null,
        categorie: basicForm.categorie || null,
        actif: basicForm.actif,
        contenu_type: "modules",
        duree_totale: totalSeconds ?? 0,
        updated_at: new Date().toISOString(),
      };

      let formationId: string | null = editingId;

      if (editingId) {
        const { error } = await (supabase as any)
          .from("formations").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from("formations").insert({ ...payload, created_at: new Date().toISOString() })
          .select("id").single();
        if (error) throw error;
        if (!data || !data.id) throw new Error("Impossible de récupérer l'ID de la formation créée.");
        formationId = data.id;
      }

      if (!formationId) throw new Error("ID de formation manquant.");

      // 2. Récupérer les modules existants pour savoir quoi supprimer
      const { data: existingMods } = await (supabase as any)
        .from("formation_modules").select("id").eq("formation_id", formationId);
      const existingModIds = new Set((existingMods || []).map((m: any) => m.id));
      const keptModIds = new Set(modules.filter(m => m.id).map(m => m.id!));
      const modsToDelete = [...existingModIds].filter(id => !keptModIds.has(id));

      if (modsToDelete.length > 0) {
        await (supabase as any).from("formation_modules").delete().in("id", modsToDelete);
      }

      // 3. Upsert modules et leurs leçons
      for (let mi = 0; mi < modules.length; mi++) {
        const mod = modules[mi];

        // Upload vidéos si nécessaire
        const leconsSaved = await Promise.all(
          mod.lecons.map(async (lecon, li) => {
            let finalUrl = lecon.url;

            // Upload fichier vers Supabase Storage
            if (lecon.uploadFile && lecon.urlSource === "upload") {
              const ext = lecon.uploadFile.name.split(".").pop() || "mp4";
              const path = `${formationId}/${uid()}.${ext}`;
              const { error: upErr } = await (supabase as any).storage
                .from("formation-videos")
                .upload(path, lecon.uploadFile, { contentType: lecon.uploadFile.type, upsert: false });

              if (upErr) throw new Error(`Upload échoué : ${upErr.message}`);

              const { data: urlData } = (supabase as any).storage
                .from("formation-videos").getPublicUrl(path);
              finalUrl = urlData.publicUrl;
            }

            return { ...lecon, url: finalUrl, ordre: li };
          })
        );

        let moduleId = mod.id;

        if (mod.id) {
          // Update module
          await (supabase as any).from("formation_modules").update({
            titre: mod.titre,
            description: mod.description || null,
            ordre: mi,
          }).eq("id", mod.id);
        } else {
          // Insert module
          const { data: newMod, error: modErr } = await (supabase as any)
            .from("formation_modules").insert({
              formation_id: formationId,
              titre: mod.titre,
              description: mod.description || null,
              ordre: mi,
              created_at: new Date().toISOString(),
            }).select().maybeSingle();
          if (modErr) throw modErr;
          moduleId = newMod.id;
        }

        // Récupérer leçons existantes
        const { data: existingLecons } = await (supabase as any)
          .from("formation_lecons").select("id").eq("module_id", moduleId);
        const existingLeconIds = new Set((existingLecons || []).map((l: any) => l.id));
        const keptLeconIds = new Set(leconsSaved.filter(l => l.id).map(l => l.id!));
        const leconsToDelete = [...existingLeconIds].filter(id => !keptLeconIds.has(id));
        if (leconsToDelete.length > 0) {
          await (supabase as any).from("formation_lecons").delete().in("id", leconsToDelete);
        }

        // Upsert leçons
        for (let li = 0; li < leconsSaved.length; li++) {
          const lecon = leconsSaved[li];
          if (lecon.id) {
            await (supabase as any).from("formation_lecons").update({
              titre: lecon.titre,
              type: lecon.type,
              url: lecon.url || null,
              duree_secondes: lecon.duree_secondes,
              ordre: li,
              est_preview: lecon.est_preview,
            }).eq("id", lecon.id);
          } else {
            await (supabase as any).from("formation_lecons").insert({
              module_id: moduleId,
              titre: lecon.titre,
              type: lecon.type,
              url: lecon.url || null,
              duree_secondes: lecon.duree_secondes,
              ordre: li,
              est_preview: lecon.est_preview,
              created_at: new Date().toISOString(),
            });
          }
        }
      }

      toast({ title: editingId ? "Formation mise à jour ✅" : "Formation créée ✅" });
      setView("list");
      loadFormations();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erreur", description: err?.message || "Vérifiez la console.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Toggle actif ────────────────────────────────────────────────────────────
  const handleToggleActif = async (f: Formation) => {
    await (supabase as any).from("formations").update({ actif: !f.actif }).eq("id", f.id);
    loadFormations();
  };

  // ── Suppression ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    await (supabase as any).from("formations").delete().eq("id", deleteId);
    toast({ title: "Formation supprimée" });
    setDeleteId(null);
    loadFormations();
  };

  // ── Helpers modules ─────────────────────────────────────────────────────────
  const addModule = () => {
    setModules(prev => [...prev, newModule(prev.length)]);
  };

  const removeModule = (tempId: string) => {
    setModules(prev => prev.filter(m => m.tempId !== tempId));
  };

  const updateModule = (tempId: string, patch: Partial<Module>) => {
    setModules(prev => prev.map(m => m.tempId === tempId ? { ...m, ...patch } : m));
  };

  const toggleModule = (tempId: string) => {
    setModules(prev => prev.map(m => m.tempId === tempId ? { ...m, expanded: !m.expanded } : m));
  };

  const moveModule = (tempId: string, dir: -1 | 1) => {
    setModules(prev => {
      const idx = prev.findIndex(m => m.tempId === tempId);
      if (idx + dir < 0 || idx + dir >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[idx + dir]] = [next[idx + dir], next[idx]];
      return next.map((m, i) => ({ ...m, ordre: i }));
    });
  };

  // ── Helpers leçons ──────────────────────────────────────────────────────────
  const addLecon = (moduleTempId: string) => {
    setModules(prev => prev.map(m =>
      m.tempId === moduleTempId
        ? { ...m, lecons: [...m.lecons, newLecon(m.lecons.length)] }
        : m
    ));
  };

  const removeLecon = (moduleTempId: string, leconTempId: string) => {
    setModules(prev => prev.map(m =>
      m.tempId === moduleTempId
        ? { ...m, lecons: m.lecons.filter(l => l.tempId !== leconTempId) }
        : m
    ));
  };

  const updateLecon = (moduleTempId: string, leconTempId: string, patch: Partial<Lecon>) => {
    setModules(prev => prev.map(m =>
      m.tempId !== moduleTempId ? m : {
        ...m,
        lecons: m.lecons.map(l =>
          l.tempId !== leconTempId ? l : { ...l, ...patch }
        )
      }
    ));
  };

  const handleLeconDureeChange = (moduleTempId: string, leconTempId: string, val: string) => {
    // Accepter saisie libre, parser seulement quand perd focus
    updateLecon(moduleTempId, leconTempId, { dureeInput: val });
  };

  const handleLeconDureeBlur = (moduleTempId: string, leconTempId: string, val: string) => {
    const seconds = parseMMSS(val);
    updateLecon(moduleTempId, leconTempId, {
      duree_secondes: seconds,
      dureeInput: toMMSS(seconds),
    });
  };

  const handleFileChange = (moduleTempId: string, leconTempId: string, file: File | null) => {
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    updateLecon(moduleTempId, leconTempId, {
      uploadFile: file,
      url: objectUrl, // preview local
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDU
  // ─────────────────────────────────────────────────────────────────────────

  // ── Vue LISTE ───────────────────────────────────────────────────────────────
  if (view === "list") {
    return (
      <AppLayout>
        <div className="max-w-6xl mx-auto space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-black text-foreground flex items-center gap-2" >
                <GraduationCap className="w-6 h-6 text-amber-400" /> Gestion des Formations
              </h1>
              <p className="text-sm text-muted-foreground">
                {formations.length} formation{formations.length > 1 ? "s" : ""}
              </p>
            </div>
            <button onClick={openCreate}
              className="flex items-center gap-2 px-5 h-11 rounded-2xl bg-primary text-white font-bold text-sm hover:bg-primary/90 active:scale-95 transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Nouvelle formation
            </button>
          </div>

          {loadingList ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-7 h-7 animate-spin text-primary" />
            </div>
          ) : formations.length === 0 ? (
            <div className="text-center py-20">
              <BookOpen className="w-14 h-14 mx-auto mb-3 text-muted-foreground/30" />
              <p className="font-black text-lg text-foreground">Aucune formation</p>
              <p className="text-sm text-muted-foreground mt-1">Créez votre première formation.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {formations.map((f) => (
                <div key={f.id}
                  className={`bg-card border rounded-2xl p-4 flex items-center gap-4 transition-all ${f.actif ? "border-border" : "border-border/40 opacity-55"}`}>
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                    {f.image_url
                      ? <img src={f.image_url} alt={f.titre} className="w-full h-full object-cover" />
                      : <BookOpen className="w-7 h-7 text-muted-foreground" />}
                  </div>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-black text-red-600 dark:text-red-500 truncate">{f.titre}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.actif ? "bg-emerald-500/15 text-emerald-500" : "bg-red-500/15 text-red-400"}`}>
                        {f.actif ? "Actif" : "Inactif"}
                      </span>
                      {f.niveau && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400">
                          {f.niveau}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-muted-foreground">
                      <span className="font-black text-primary text-sm">{formatMontant(f.prix_promo && f.prix_promo < f.prix ? f.prix_promo : f.prix)}</span>
                      {f.nb_modules !== undefined && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {f.nb_modules} module{f.nb_modules !== 1 ? "s" : ""}
                        </span>
                      )}
                      {f.duree_totale != null && f.duree_totale > 0 && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDureeTotale(f.duree_totale)}
                        </span>
                      )}
                      {f.nb_achats !== undefined && (
                        <span className="text-emerald-600 font-semibold">
                          {f.nb_achats} achat{f.nb_achats !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => handleToggleActif(f)} title={f.actif ? "Désactiver" : "Activer"}
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      {f.actif ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-emerald-500" />}
                    </button>
                    <button onClick={() => openEdit(f)} title="Modifier"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                      <Edit2 className="w-4 h-4 text-blue-400" />
                    </button>
                    <button onClick={() => setDeleteId(f.id)} title="Supprimer"
                      className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/10 transition-colors">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal suppression */}
        {deleteId && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
            <div className="bg-card rounded-3xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h2 className="font-black text-center text-foreground">Supprimer cette formation ?</h2>
              <p className="text-sm text-center text-muted-foreground">Les modules et leçons seront supprimés. Les achats existants sont conservés.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteId(null)} className="flex-1 h-10 rounded-xl border border-border font-bold text-sm">Annuler</button>
                <button onClick={handleDelete} className="flex-1 h-10 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600">Supprimer</button>
              </div>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  // ── Vue ÉDITEUR ─────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8 pb-28">

        {/* Header éditeur */}
        <div className="flex items-center gap-3">
          <button onClick={() => setView("list")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-black text-red-600 dark:text-red-500">
              {editingId ? "Modifier la formation" : "Nouvelle formation"}
            </h1>
            {totalSeconds > 0 && (
              <p className="text-xs text-emerald-500 font-bold flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" /> Durée totale calculée : {formatDureeTotale(totalSeconds)}
              </p>
            )}
          </div>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-5 h-10 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Enregistrer
          </button>
        </div>

        {/* ── Section 1 : Infos de base ───────────────────────────────────── */}
        <section className="bg-card border border-border rounded-3xl p-7 space-y-5">
          <h2 className="font-black text-foreground text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-amber-400" /> Informations générales
          </h2>

          {/* Titre */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Titre *</label>
            <input value={basicForm.titre}
              onChange={e => setBasicForm(p => ({ ...p, titre: e.target.value }))}
              placeholder="Ex: Maîtriser le Marketing Digital en 30 jours"
              className="w-full h-11 px-4 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary font-medium" />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 block">Description</label>
            <textarea value={basicForm.description}
              onChange={e => setBasicForm(p => ({ ...p, description: e.target.value }))}
              placeholder="Décrivez ce que l'apprenant va apprendre, ce qu'il saura faire après cette formation, les prérequis..."
              rows={6}
              className="w-full px-4 py-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary resize-none" />
          </div>

          {/* Niveau + Catégorie */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Niveau</label>
              <select value={basicForm.niveau}
                onChange={e => setBasicForm(p => ({ ...p, niveau: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary">
                <option value="">— Choisir —</option>
                {NIVEAUX.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Catégorie</label>
              <select value={basicForm.categorie}
                onChange={e => setBasicForm(p => ({ ...p, categorie: e.target.value }))}
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary">
                <option value="">— Choisir —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Prix */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">Prix (FCFA) *</label>
              <input type="number" value={basicForm.prix}
                onChange={e => setBasicForm(p => ({ ...p, prix: Number(e.target.value) }))}
                placeholder="5000"
                className="w-full h-10 px-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">
                Prix promo <span className="text-emerald-500 font-normal">(optionnel)</span>
              </label>
              <input type="number" value={basicForm.prix_promo}
                onChange={e => setBasicForm(p => ({ ...p, prix_promo: Number(e.target.value) }))}
                placeholder="0 = sans promo"
                className="w-full h-10 px-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 text-sm focus:outline-none focus:border-emerald-500" />
              {Number(basicForm.prix_promo) > 0 && Number(basicForm.prix_promo) < Number(basicForm.prix) && (
                <p className="text-xs text-emerald-500 mt-1 font-semibold">
                  ✅ -{Math.round(((basicForm.prix - basicForm.prix_promo) / basicForm.prix) * 100)}% de réduction
                </p>
              )}
            </div>
          </div>

          {/* Image */}
          <div>
            <label className="text-xs font-bold text-muted-foreground mb-1 flex items-center gap-1 block">
              <ImageIcon className="w-3 h-3" /> URL de l'image de couverture
            </label>
            <input value={basicForm.image_url}
              onChange={e => {
                setBasicForm(p => ({ ...p, image_url: e.target.value }));
                setImagePreview(e.target.value);
              }}
              placeholder="https://i.postimg.cc/... ou autre CDN d'images"
              className="w-full h-10 px-3 rounded-xl border border-border bg-muted/20 text-sm focus:outline-none focus:border-primary" />
            {imagePreview && imagePreview.startsWith("http") && (
              <img src={imagePreview} alt="Aperçu"
                className="mt-2 w-full max-h-48 object-cover rounded-xl border border-border"
                onError={e => (e.target as HTMLImageElement).style.display = "none"}
                onLoad={e => (e.target as HTMLImageElement).style.display = "block"} />
            )}
          </div>

          {/* Actif */}
          <div className="flex items-center justify-between p-3 bg-muted/20 rounded-xl">
            <div>
              <p className="text-sm font-bold text-foreground">Formation active</p>
              <p className="text-xs text-muted-foreground">Visible par les utilisateurs</p>
            </div>
            <button onClick={() => setBasicForm(p => ({ ...p, actif: !p.actif }))}
              className={`w-12 h-6 rounded-full relative transition-colors ${basicForm.actif ? "bg-emerald-500" : "bg-muted"}`}>
              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all shadow ${basicForm.actif ? "right-0.5" : "left-0.5"}`} />
            </button>
          </div>
        </section>

        {/* ── Section 2 : Modules & Leçons ────────────────────────────────── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-red-600 dark:text-red-500 text-base flex items-center gap-2">
              <Play className="w-4 h-4 text-red-500" />
              Modules & Leçons
              <span className="text-xs font-normal text-muted-foreground ml-1">
                ({modules.length} module{modules.length > 1 ? "s" : ""} · {modules.flatMap(m => m.lecons).length} leçon{modules.flatMap(m => m.lecons).length > 1 ? "s" : ""})
              </span>
            </h2>
            {totalSeconds > 0 && (
              <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full flex items-center gap-1">
                <Clock className="w-3 h-3" /> {formatDureeTotale(totalSeconds)}
              </span>
            )}
          </div>

          {modules.map((mod, mi) => (
            <ModuleCard
              key={mod.tempId}
              mod={mod}
              index={mi}
              totalModules={modules.length}
              onToggle={() => toggleModule(mod.tempId)}
              onRemove={() => removeModule(mod.tempId)}
              onMoveUp={() => moveModule(mod.tempId, -1)}
              onMoveDown={() => moveModule(mod.tempId, 1)}
              onUpdate={patch => updateModule(mod.tempId, patch)}
              onAddLecon={() => addLecon(mod.tempId)}
              onRemoveLecon={leconTempId => removeLecon(mod.tempId, leconTempId)}
              onUpdateLecon={(lTempId, patch) => updateLecon(mod.tempId, lTempId, patch)}
              onLeconDureeChange={(lTempId, val) => handleLeconDureeChange(mod.tempId, lTempId, val)}
              onLeconDureeBlur={(lTempId, val) => handleLeconDureeBlur(mod.tempId, lTempId, val)}
              onFileChange={(lTempId, file) => handleFileChange(mod.tempId, lTempId, file)}
            />
          ))}

          <button onClick={addModule}
            className="w-full h-12 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary font-bold text-sm flex items-center justify-center gap-2 transition-all">
            <Plus className="w-4 h-4" /> Ajouter un module
          </button>
        </section>

        {/* Bouton save bas de page */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur border-t border-border z-20 flex gap-3 justify-end max-w-5xl mx-auto">
          <button onClick={() => setView("list")}
            className="px-5 h-11 rounded-xl border border-border font-bold text-sm text-muted-foreground hover:text-foreground transition-colors">
            Annuler
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-6 h-11 rounded-xl bg-primary text-white font-bold text-sm hover:bg-primary/90 disabled:opacity-60 transition-all shadow-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {saving ? "Enregistrement…" : (editingId ? "Sauvegarder" : "Créer la formation")}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

// ─── Sous-composant : Module Card ─────────────────────────────────────────────

interface ModuleCardProps {
  mod: Module;
  index: number;
  totalModules: number;
  onToggle: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onUpdate: (patch: Partial<Module>) => void;
  onAddLecon: () => void;
  onRemoveLecon: (leconTempId: string) => void;
  onUpdateLecon: (leconTempId: string, patch: Partial<Lecon>) => void;
  onLeconDureeChange: (leconTempId: string, val: string) => void;
  onLeconDureeBlur: (leconTempId: string, val: string) => void;
  onFileChange: (leconTempId: string, file: File | null) => void;
}

function ModuleCard({
  mod, index, totalModules, onToggle, onRemove, onMoveUp, onMoveDown,
  onUpdate, onAddLecon, onRemoveLecon, onUpdateLecon,
  onLeconDureeChange, onLeconDureeBlur, onFileChange,
}: ModuleCardProps) {
  const moduleDuree = mod.lecons.reduce((s, l) => s + (l.duree_secondes || 0), 0);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header module */}
      <div className="flex items-center gap-2 p-3 bg-violet-500/8 dark:bg-violet-500/10 border-b border-violet-200/30 dark:border-violet-500/20">
        <div className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-black flex items-center justify-center flex-shrink-0">
          {index + 1}
        </div>
        <input
          value={mod.titre}
          onChange={e => onUpdate({ titre: e.target.value })}
          placeholder={`Module ${index + 1} — ex: Introduction`}
          className="flex-1 bg-transparent text-sm font-black text-violet-700 dark:text-violet-300 placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
        />
        {moduleDuree > 0 && (
          <span className="text-xs text-muted-foreground flex-shrink-0 flex items-center gap-1">
            <Clock className="w-3 h-3" />{toMMSS(moduleDuree).replace(":","min ")}s
          </span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {index > 0 && (
            <button onClick={onMoveUp} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          {index < totalModules - 1 && (
            <button onClick={onMoveDown} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
          <button onClick={onToggle} className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors">
            {mod.expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button onClick={onRemove} className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500/10 transition-colors">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
          </button>
        </div>
      </div>

      {/* Corps module (expandable) */}
      {mod.expanded && (
        <div className="p-3 space-y-2">
          {/* Description module optionnelle */}
          <input
            value={mod.description}
            onChange={e => onUpdate({ description: e.target.value })}
            placeholder="Description du module (optionnel)"
            className="w-full h-9 px-3 rounded-xl border border-border/50 bg-muted/10 text-xs text-muted-foreground focus:outline-none focus:border-primary/50"
          />

          {/* Leçons */}
          <div className="space-y-2">
            {mod.lecons.map((lecon, li) => (
              <LeconRow
                key={lecon.tempId}
                lecon={lecon}
                index={li}
                onRemove={() => onRemoveLecon(lecon.tempId)}
                onUpdate={patch => onUpdateLecon(lecon.tempId, patch)}
                onDureeChange={val => onLeconDureeChange(lecon.tempId, val)}
                onDureeBlur={val => onLeconDureeBlur(lecon.tempId, val)}
                onFileChange={file => onFileChange(lecon.tempId, file)}
              />
            ))}
          </div>

          <button onClick={onAddLecon}
            className="w-full h-9 rounded-xl border border-dashed border-border/60 hover:border-primary/40 text-xs font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-1.5 transition-all">
            <Plus className="w-3.5 h-3.5" /> Ajouter une leçon
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Sous-composant : Leçon Row ───────────────────────────────────────────────

interface LeconRowProps {
  lecon: Lecon;
  index: number;
  onRemove: () => void;
  onUpdate: (patch: Partial<Lecon>) => void;
  onDureeChange: (val: string) => void;
  onDureeBlur: (val: string) => void;
  onFileChange: (file: File | null) => void;
}

function LeconRow({ lecon, index, onRemove, onUpdate, onDureeChange, onDureeBlur, onFileChange }: LeconRowProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const typeIcons: Record<string, React.ReactNode> = {
    video: <Video className="w-3.5 h-3.5" />,
    pdf: <FileText className="w-3.5 h-3.5" />,
    lien: <LinkIcon className="w-3.5 h-3.5" />,
  };

  return (
    <div className="bg-muted/10 border border-border/40 rounded-xl p-3 space-y-2.5">
      {/* Ligne 1 : numéro + titre + durée + suppr */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground font-bold w-5 flex-shrink-0">{index + 1}.</span>
        <input
          value={lecon.titre}
          onChange={e => onUpdate({ titre: e.target.value })}
          placeholder="Titre de la leçon"
          className="flex-1 bg-transparent text-xs font-medium text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
        />
        {/* Durée MM:SS */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <input
            value={lecon.dureeInput}
            onChange={e => onDureeChange(e.target.value)}
            onBlur={e => onDureeBlur(e.target.value)}
            placeholder="0:00"
            className="w-14 h-6 text-center text-xs bg-muted/40 rounded-lg border border-border/50 focus:outline-none focus:border-primary/50 font-mono"
            title="Durée MM:SS (ex: 12:30)"
          />
        </div>
        <button onClick={onRemove}
          className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded hover:bg-red-500/10 transition-colors">
          <X className="w-3 h-3 text-red-400" />
        </button>
      </div>

      {/* Ligne 2 : Type + source */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Type */}
        <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs flex-shrink-0">
          {(["video", "pdf", "lien"] as const).map(t => (
            <button key={t} onClick={() => onUpdate({ type: t })}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition-colors ${lecon.type === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              {typeIcons[t]} {t === "video" ? "Vidéo" : t === "pdf" ? "PDF" : "Lien"}
            </button>
          ))}
        </div>

        {/* Source (upload vs externe) — seulement pour vidéo et PDF */}
        {(lecon.type === "video" || lecon.type === "pdf") && (
          <div className="flex rounded-lg border border-border/50 overflow-hidden text-xs flex-shrink-0">
            <button onClick={() => onUpdate({ urlSource: "externe" })}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition-colors ${lecon.urlSource === "externe" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <LinkIcon className="w-3 h-3" /> Lien externe
            </button>
            <button onClick={() => onUpdate({ urlSource: "upload" })}
              className={`flex items-center gap-1 px-2.5 py-1.5 font-bold transition-colors ${lecon.urlSource === "upload" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              <Upload className="w-3 h-3" /> Upload
            </button>
          </div>
        )}

        {/* Aperçu gratuit */}
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer ml-auto">
          <input type="checkbox" checked={lecon.est_preview}
            onChange={e => onUpdate({ est_preview: e.target.checked })}
            className="rounded border-border" />
          Aperçu gratuit
        </label>
      </div>

      {/* Ligne 3 : URL ou Upload */}
      {lecon.urlSource === "externe" || lecon.type === "lien" ? (
        <input
          value={lecon.url}
          onChange={e => onUpdate({ url: e.target.value })}
          placeholder={
            lecon.type === "video" ? "https://youtube.com/watch?v=..." :
            lecon.type === "pdf" ? "https://drive.google.com/..." :
            "https://..."
          }
          className="w-full h-8 px-3 rounded-lg border border-border/50 bg-muted/20 text-xs focus:outline-none focus:border-primary/50"
        />
      ) : (
        <div>
          <input type="file" ref={fileRef} style={{ display: "none" }}
            accept={lecon.type === "video" ? "video/*" : "application/pdf"}
            onChange={e => onFileChange(e.target.files?.[0] || null)} />
          <button onClick={() => fileRef.current?.click()}
            className="w-full h-9 rounded-lg border-2 border-dashed border-border/50 hover:border-primary/40 text-xs font-bold text-muted-foreground hover:text-primary flex items-center justify-center gap-2 transition-all">
            <Upload className="w-3.5 h-3.5" />
            {lecon.uploadFile ? lecon.uploadFile.name : (lecon.type === "video" ? "Choisir une vidéo depuis la galerie" : "Choisir un PDF")}
          </button>
          {lecon.uploadFile && (
            <p className="text-xs text-emerald-500 mt-1 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> {lecon.uploadFile.name} — sera uploadé à la sauvegarde
            </p>
          )}
        </div>
      )}
    </div>
  );
}
