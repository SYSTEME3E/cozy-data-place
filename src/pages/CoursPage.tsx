/**
 * NEXORA — Page Cours (modules + leçons d'une formation)
 * ✅ Accessible uniquement si l'utilisateur a acheté la formation ou est admin
 * ✅ Progression séquentielle obligatoire (vidéo précédente terminée avant la suivante)
 * ✅ Barre de progression globale en %
 * ✅ Indicateurs visuels : 🔒 verrouillé, ✅ terminé, ▶ disponible
 */

import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  BookOpen, Play, FileText, ExternalLink, Lock, Check,
  ChevronDown, ChevronUp, Loader2, GraduationCap,
  ArrowLeft, Crown, AlertTriangle,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser, isNexoraAdmin } from "@/lib/nexora-auth";

interface Lecon {
  id: string;
  titre: string;
  type: "video" | "pdf" | "lien";
  url: string | null;
  duree_secondes: number;
  ordre: number;
  est_preview: boolean;
}

interface Module {
  id: string;
  titre: string;
  description: string | null;
  ordre: number;
  formation_lecons: Lecon[];
}

interface Formation {
  id: string;
  titre: string;
  description: string | null;
  image_url: string | null;
  niveau: string | null;
  categorie: string | null;
  duree_totale: number | null;
}

type VideoStatus = "locked" | "unlocked" | "completed";

const formatLeconDuree = (sec: number): string => {
  if (!sec || sec === 0) return "";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m === 0 ? `${s}s` : `${m}:${s.toString().padStart(2, "0")}`;
};

const formatDureeTotale = (sec: number): string => {
  if (!sec || sec === 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
};

// Calcule les statuts séquentiellement : une vidéo n'est débloquée que si la précédente est terminée
const computeStatuses = (
  mods: Module[],
  savedProgress: Record<string, VideoStatus>,
  isAdmin: boolean
): Record<string, VideoStatus> => {
  const statuses: Record<string, VideoStatus> = {};
  const allLecons = mods.flatMap((m) => m.formation_lecons);

  allLecons.forEach((lecon, index) => {
    if (isAdmin) {
      statuses[lecon.id] = savedProgress[lecon.id] === "completed" ? "completed" : "unlocked";
      return;
    }
    if (index === 0) {
      statuses[lecon.id] = savedProgress[lecon.id] === "completed" ? "completed" : "unlocked";
    } else {
      const prev = allLecons[index - 1];
      const prevStatus = statuses[prev.id];
      if (prevStatus === "completed") {
        statuses[lecon.id] = savedProgress[lecon.id] === "completed" ? "completed" : "unlocked";
      } else {
        statuses[lecon.id] = "locked";
      }
    }
  });
  return statuses;
};

export default function CoursPage() {
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ✅ FIX : on lit user et adminAccess une seule fois via ref pour éviter
  // que useEffect se re-déclenche en boucle si getNexoraUser() crée un nouvel objet à chaque appel
  const userRef = useRef(getNexoraUser());
  const adminRef = useRef(isNexoraAdmin());
  const user = userRef.current;
  const adminAccess = adminRef.current;

  const [formation, setFormation] = useState<Formation | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [videoStatuses, setVideoStatuses] = useState<Record<string, VideoStatus>>({});
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    if (!user || !courseId) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        // Charger la formation
        const { data: fData } = await (supabase as any)
          .from("formations").select("*").eq("id", courseId).single();
        if (!fData) { navigate("/mes-formations"); return; }
        setFormation(fData);

        // Vérifier l'accès (achat ou admin)
        if (!adminAccess) {
          const { data: purchase } = await (supabase as any)
            .from("formation_purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("formation_id", courseId)
            .eq("status", "completed")
            .maybeSingle();
          if (!purchase) {
            setAccessDenied(true);
            setLoading(false);
            return;
          }
        }

        // Charger les modules + leçons
        const { data: mData } = await (supabase as any)
          .from("formation_modules")
          .select("*, formation_lecons(*)")
          .eq("formation_id", courseId)
          .order("ordre", { ascending: true });

        const sortedModules: Module[] = (mData || []).map((m: any) => ({
          ...m,
          formation_lecons: (m.formation_lecons || []).sort(
            (a: any, b: any) => a.ordre - b.ordre
          ),
        }));
        setModules(sortedModules);

        // ✅ FIX : ouvrir TOUS les modules par défaut (pas seulement le premier)
        // L'utilisateur peut ensuite fermer ceux qu'il ne veut pas
        if (sortedModules.length > 0) {
          setExpandedModules(new Set(sortedModules.map((m) => m.id)));
        }

        // Charger la progression existante
        const allLeconIds = sortedModules.flatMap((m) =>
          m.formation_lecons.map((l) => l.id)
        );

        const progMap: Record<string, VideoStatus> = {};
        if (allLeconIds.length > 0) {
          const { data: progData } = await (supabase as any)
            .from("video_progress")
            .select("video_id, status")
            .eq("user_id", user.id)
            .eq("course_id", courseId);

          (progData || []).forEach((p: any) => {
            progMap[p.video_id] = p.status;
          });
        }

        // Calculer les statuts en respectant la progression séquentielle
        const computedStatuses = computeStatuses(sortedModules, progMap, adminAccess);
        setVideoStatuses(computedStatuses);

      } catch (err) {
        console.error("Erreur chargement CoursPage:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // ✅ FIX : on ne met que courseId dans les dépendances (user et adminAccess sont stables via ref)
  }, [courseId]);

  const allLecons = modules.flatMap((m) => m.formation_lecons);
  const totalLecons = allLecons.length;
  const completedCount = Object.values(videoStatuses).filter((s) => s === "completed").length;
  const progressPct = totalLecons > 0 ? Math.round((completedCount / totalLecons) * 100) : 0;

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) { next.delete(modId); } else { next.add(modId); }
      return next;
    });
  };

  const handleClickLecon = (lecon: Lecon) => {
    const status = videoStatuses[lecon.id];
    if (status === "locked") return;

    if (lecon.type === "video") {
      navigate(`/mes-formations/${courseId}/video/${lecon.id}`);
    } else if (lecon.type === "pdf" && lecon.url) {
      window.open(lecon.url, "_blank", "noopener,noreferrer");
    } else if (lecon.type === "lien" && lecon.url) {
      window.open(lecon.url, "_blank", "noopener,noreferrer");
    }
  };

  const getLeconIcon = (lecon: Lecon, status: VideoStatus) => {
    if (status === "locked") return <Lock className="w-3.5 h-3.5 text-muted-foreground" />;
    if (status === "completed") return <Check className="w-3.5 h-3.5 text-emerald-500" />;
    if (lecon.type === "video") return <Play className="w-3.5 h-3.5 text-red-500" />;
    if (lecon.type === "pdf") return <FileText className="w-3.5 h-3.5 text-blue-500" />;
    return <ExternalLink className="w-3.5 h-3.5 text-violet-500" />;
  };

  // ─── États de chargement / accès ──────────────────────────────────────────

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </AppLayout>
    );
  }

  if (accessDenied) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 px-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-xl font-black text-foreground">Accès refusé</h2>
          <p className="text-sm text-muted-foreground max-w-xs">
            Vous n'avez pas acheté cette formation ou votre paiement n'est pas confirmé.
          </p>
          <button
            onClick={() => navigate("/mes-formations")}
            className="px-6 py-2.5 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Retour à mes formations
          </button>
        </div>
      </AppLayout>
    );
  }

  // ─── Rendu principal ───────────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5 pb-10">

        {/* Header + retour */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/mes-formations")}
            className="w-9 h-9 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-red-600 dark:text-red-500 truncate leading-tight">
              {formation?.titre || "Formation"}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              {formation?.categorie && (
                <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                  {formation.categorie}
                </span>
              )}
              {adminAccess && (
                <span className="flex items-center gap-1 text-xs font-bold text-purple-600 bg-purple-500/10 px-2 py-0.5 rounded-full">
                  <Crown className="w-3 h-3" /> Admin
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-muted/40 px-3 py-1.5 rounded-xl flex-shrink-0">
            <GraduationCap className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-bold text-muted-foreground">
              {modules.length} module{modules.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Barre de progression globale */}
        {totalLecons > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">Progression globale</span>
              <span className="text-sm font-black text-red-600 dark:text-red-500">{progressPct}%</span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-red-600 rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedCount} / {totalLecons} leçon{totalLecons > 1 ? "s" : ""} terminée{completedCount > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {/* Image formation */}
        {formation?.image_url && (
          <div className="rounded-2xl overflow-hidden h-36 relative">
            <img
              src={formation.image_url}
              alt={formation.titre}
              className="w-full h-full object-cover object-top"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            {formation.duree_totale && (
              <span className="absolute bottom-3 right-3 text-white/80 text-xs bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full">
                {formatDureeTotale(formation.duree_totale)}
              </span>
            )}
          </div>
        )}

        {/* Modules */}
        {modules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 bg-muted/20 rounded-3xl border border-border/50">
            <BookOpen className="w-10 h-10 text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">Aucun module disponible</p>
          </div>
        ) : (
          <div className="space-y-3">
            {modules.map((mod, mi) => {
              const lecons = mod.formation_lecons;
              const isExpanded = expandedModules.has(mod.id);
              const modCompleted = lecons.filter((l) => videoStatuses[l.id] === "completed").length;
              const modTotal = lecons.length;

              return (
                <div key={mod.id} className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

                  {/* Header module */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/20 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-violet-500/15 text-violet-600 dark:text-violet-400 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {mi + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-violet-700 dark:text-violet-300 truncate">{mod.titre}</p>
                      {mod.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{mod.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {modTotal > 0 && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {modCompleted}/{modTotal}
                        </span>
                      )}
                      {isExpanded
                        ? <ChevronUp className="w-4 h-4 text-violet-400" />
                        : <ChevronDown className="w-4 h-4 text-violet-400" />}
                    </div>
                  </button>

                  {/* Mini barre de progression module */}
                  {modTotal > 0 && (
                    <div className="px-4 pb-1">
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-500 rounded-full transition-all duration-300"
                          style={{ width: `${Math.round((modCompleted / modTotal) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Leçons */}
                  {isExpanded && (
                    <div className="divide-y divide-border/30 border-t border-border/30">
                      {lecons.length === 0 ? (
                        <p className="px-4 py-3 text-xs text-muted-foreground italic">
                          Aucune leçon dans ce module.
                        </p>
                      ) : (
                        lecons.map((lecon) => {
                          // ✅ FIX : si videoStatuses pas encore calculé, on met "unlocked" par défaut
                          // pour ne pas bloquer l'affichage
                          const status = videoStatuses[lecon.id] ?? "unlocked";
                          const isLocked = status === "locked";
                          const isCompleted = status === "completed";

                          return (
                            <button
                              key={lecon.id}
                              onClick={() => handleClickLecon(lecon)}
                              disabled={isLocked}
                              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                isLocked
                                  ? "opacity-50 cursor-not-allowed"
                                  : isCompleted
                                  ? "hover:bg-emerald-500/5 cursor-pointer"
                                  : "hover:bg-red-500/5 cursor-pointer"
                              }`}
                            >
                              {/* Icône statut */}
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isLocked
                                  ? "bg-muted"
                                  : isCompleted
                                  ? "bg-emerald-500/15"
                                  : lecon.type === "video"
                                  ? "bg-red-500/10"
                                  : "bg-blue-500/10"
                              }`}>
                                {getLeconIcon(lecon, status)}
                              </div>

                              {/* Titre */}
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${
                                  isLocked
                                    ? "text-muted-foreground"
                                    : isCompleted
                                    ? "text-emerald-600 dark:text-emerald-400 line-through decoration-emerald-400/50"
                                    : "text-foreground"
                                }`}>
                                  {lecon.titre}
                                </p>
                                {lecon.type !== "video" && (
                                  <p className="text-xs text-muted-foreground capitalize">{lecon.type}</p>
                                )}
                              </div>

                              {/* Méta droite */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {lecon.est_preview && isLocked && (
                                  <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                                    Aperçu
                                  </span>
                                )}
                                {lecon.duree_secondes > 0 && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    {formatLeconDuree(lecon.duree_secondes)}
                                  </span>
                                )}
                                {isLocked && <Lock className="w-3 h-3 text-muted-foreground/40" />}
                                {isCompleted && <Check className="w-3 h-3 text-emerald-500" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Félicitations si terminé */}
        {progressPct === 100 && totalLecons > 0 && (
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
            <Check className="w-6 h-6 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">Formation terminée !</p>
              <p className="text-xs text-muted-foreground mt-0.5">Félicitations, vous avez complété toutes les leçons.</p>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
