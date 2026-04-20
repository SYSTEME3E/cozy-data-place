/**
 * NEXORA — Mes Formations (v2)
 * ✅ Page sécurisée : seuls acheteurs + admin ont accès au contenu
 * ✅ Les formations s'affichent mais vidéos verrouillées si non acheté
 * ✅ Titres en Rouge Gras, Modules en Violet, autres textes noir/blanc selon mode
 * ✅ Admin : accès libre à tout sans achat
 * ✅ Éditeur de formation lié depuis cette page
 */


import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen, Play, FileText, Loader2, GraduationCap, Lock,
  ExternalLink, ChevronDown, ChevronUp, Check, Star,
  ShoppingCart, Shield, Crown, Settings2
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser, isNexoraAdmin } from "@/lib/nexora-auth";
import { formatMontant } from "@/lib/mlm-utils";

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
}

interface PurchasedFormation {
  id: string;
  formation_id: string;
  amount: number;
  currency: string;
  status: string;
  acces_revoque: boolean;
  revoque_raison: string | null;
  created_at: string;
  formations: Formation | null;
}

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

const getLeconIcon = (type: string, cls = "w-3.5 h-3.5") => {
  if (type === "video") return <Play className={cls} />;
  if (type === "pdf") return <FileText className={cls} />;
  return <ExternalLink className={cls} />;
};

function FormationCard({
  formation, purchased, adminAccess, modules, modulesLoading,
  expanded, onToggle, onNavigate,
}: {
  formation: Formation; purchased: boolean; adminAccess: boolean;
  modules: Module[]; modulesLoading: boolean;
  expanded: boolean; onToggle: () => void; onNavigate: () => void;
}) {
  const hasAccess = purchased || adminAccess;
  const totalLecons = modules.flatMap(m => m.formation_lecons).length;
  const totalSec = formation.duree_totale ||
    modules.flatMap(m => m.formation_lecons).reduce((s, l) => s + (l.duree_secondes || 0), 0);
  const prixEffectif = formation.prix_promo && formation.prix_promo < formation.prix
    ? formation.prix_promo : formation.prix;

  return (
    <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all">
      {/* Image */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900" style={{ minHeight: "10rem" }}>
        {formation.image_url ? (
          <img src={formation.image_url} alt={formation.titre} className="w-full h-44 object-cover object-top" />
        ) : (
          <div className="w-full h-44 flex items-center justify-center">
            <BookOpen className="w-14 h-14 text-gray-600/30" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        {adminAccess && !purchased && (
          <div className="absolute top-3 left-3 bg-purple-600 text-white text-xs font-black px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
            <Crown className="w-3 h-3" /> Admin
          </div>
        )}
        {purchased && (
          <div className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full flex items-center gap-1 shadow">
            <Check className="w-3 h-3" /> Acheté
          </div>
        )}
        {formation.niveau && (
          <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs font-bold px-2 py-1 rounded-full">
            {formation.niveau}
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          {totalSec > 0 && (
            <span className="text-white/80 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">{formatDureeTotale(totalSec)}</span>
          )}
          {totalLecons > 0 && (
            <span className="text-white/80 text-xs bg-black/30 backdrop-blur-sm px-2 py-1 rounded-full">{totalLecons} leçon{totalLecons > 1 ? "s" : ""}</span>
          )}
        </div>
      </div>

      {/* Corps */}
      <div className="p-4 space-y-3">
        {/* Titre ROUGE GRAS */}
        <div>
          <h2 className="text-base font-black text-red-600 dark:text-red-500 leading-snug">{formation.titre}</h2>
          {formation.categorie && (
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">{formation.categorie}</span>
          )}
          {formation.description && (
            <p className="text-sm text-foreground dark:text-white/80 mt-1 line-clamp-2 leading-relaxed">{formation.description}</p>
          )}
        </div>

        {/* Contenu legacy débloqué */}
        {hasAccess && formation.contenu_url && formation.contenu_type !== "modules" && (
          <a href={formation.contenu_url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl hover:bg-emerald-500/15 transition-colors group">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 text-emerald-500">
              {getLeconIcon(formation.contenu_type, "w-4 h-4")}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400">Accéder au contenu</p>
              <p className="text-xs text-muted-foreground truncate">{formation.contenu_url}</p>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
        )}

        {/* Toggle modules */}
        {(modules.length > 0 || modulesLoading) && (
          <button onClick={onToggle}
            className="w-full flex items-center justify-between p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl hover:bg-violet-500/15 transition-colors text-left">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center">
                <BookOpen className="w-3 h-3 text-violet-600 dark:text-violet-400" />
              </div>
              <span className="font-bold text-sm text-violet-700 dark:text-violet-300">
                {modulesLoading ? "Chargement…" : `${modules.length} Module${modules.length > 1 ? "s" : ""}`}
              </span>
              {!hasAccess && (
                <span className="text-xs font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Verrouillé
                </span>
              )}
            </div>
            {expanded ? <ChevronUp className="w-4 h-4 text-violet-500" /> : <ChevronDown className="w-4 h-4 text-violet-500" />}
          </button>
        )}

        {/* Modules dépliés */}
        {expanded && !modulesLoading && modules.length > 0 && (
          <div className="space-y-2">
            {modules.map((mod, mi) => {
              const lecons = mod.formation_lecons || [];
              const modDuree = lecons.reduce((s, l) => s + (l.duree_secondes || 0), 0);
              return (
                <div key={mod.id} className="border border-border rounded-2xl overflow-hidden">
                  {/* Header module VIOLET */}
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-500/8 dark:bg-violet-500/10 border-b border-violet-200/30 dark:border-violet-500/20">
                    <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-600 dark:text-violet-400 text-xs font-black flex items-center justify-center flex-shrink-0">
                      {mi + 1}
                    </div>
                    <span className="font-black text-sm text-violet-700 dark:text-violet-300 flex-1 truncate">{mod.titre}</span>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 flex-shrink-0">
                      {lecons.length > 0 && <span>{lecons.length} leçon{lecons.length > 1 ? "s" : ""}</span>}
                      {modDuree > 0 && <span>{formatDureeTotale(modDuree)}</span>}
                    </div>
                  </div>
                  {/* Leçons */}
                  <div className="divide-y divide-border/30">
                    {lecons.map((lecon) => {
                      const unlocked = hasAccess || lecon.est_preview;
                      return (
                        <div key={lecon.id} className={`flex items-center gap-2.5 px-3 py-2 transition-colors ${unlocked ? "hover:bg-muted/10" : "opacity-50"}`}>
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${unlocked ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
                            {unlocked ? getLeconIcon(lecon.type) : <Lock className="w-3 h-3" />}
                          </div>
                          {unlocked && lecon.url ? (
                            <a href={lecon.url} target="_blank" rel="noopener noreferrer"
                              className="flex-1 text-sm font-medium text-foreground hover:text-red-500 transition-colors truncate">
                              {lecon.titre}
                            </a>
                          ) : (
                            <span className="flex-1 text-sm font-medium text-foreground truncate">{lecon.titre}</span>
                          )}
                          <div className="flex items-center gap-1.5 flex-shrink-0">
                            {lecon.est_preview && !hasAccess && (
                              <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">Aperçu</span>
                            )}
                            {!unlocked && <Lock className="w-3 h-3 text-muted-foreground/50" />}
                            {lecon.duree_secondes > 0 && (
                              <span className="text-xs text-muted-foreground font-mono">{formatLeconDuree(lecon.duree_secondes)}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {!hasAccess && (
              <button onClick={onNavigate}
                className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 active:scale-[0.98]">
                <ShoppingCart className="w-4 h-4" />
                Acheter pour débloquer — {formatMontant(prixEffectif)}
              </button>
            )}
          </div>
        )}

        {/* Banner verrouillé */}
        {!hasAccess && (
          <div className="flex items-center gap-2.5 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
            <Lock className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
              Achetez cette formation pour accéder à tout le contenu.
            </p>
          </div>
        )}

        {/* Bouton principal */}
        <button onClick={onNavigate}
          className="w-full h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-sm shadow-red-600/20">
          {hasAccess
            ? <><Play className="w-3.5 h-3.5" /> Voir la formation</>
            : <><ShoppingCart className="w-3.5 h-3.5" /> Acheter — {formatMontant(prixEffectif)}</>}
        </button>
      </div>
    </div>
  );
}

export default function MesFormationsPage() {
  const navigate = useNavigate();
  const user = getNexoraUser();
  const userIsAdmin = isNexoraAdmin();

  const [allFormations, setAllFormations] = useState<Formation[]>([]);
  const [purchases, setPurchases] = useState<PurchasedFormation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modulesMap, setModulesMap] = useState<Record<string, Module[]>>({});
  const [modulesLoading, setModulesLoading] = useState<Record<string, boolean>>({});
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: fData }, { data: pData }] = await Promise.all([
        (supabase as any).from("formations").select("*").eq("actif", true).order("created_at", { ascending: false }),
        (supabase as any).from("formation_purchases").select("*, formations(*)").eq("user_id", user!.id).eq("status", "completed").order("created_at", { ascending: false }),
      ]);
      setAllFormations(fData || []);
      setPurchases(pData || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleModules = async (formationId: string) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(formationId)) { newSet.delete(formationId); setExpandedIds(newSet); return; }
    newSet.add(formationId);
    setExpandedIds(newSet);

    if (!modulesMap[formationId]) {
      setModulesLoading(prev => ({ ...prev, [formationId]: true }));
      const { data } = await (supabase as any)
        .from("formation_modules").select("*, formation_lecons(*)")
        .eq("formation_id", formationId).order("ordre", { ascending: true });
      const mods = (data || []).map((m: any) => ({
        ...m,
        formation_lecons: (m.formation_lecons || []).sort((a: any, b: any) => a.ordre - b.ordre),
      }));
      setModulesMap(prev => ({ ...prev, [formationId]: mods }));
      setModulesLoading(prev => ({ ...prev, [formationId]: false }));
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </AppLayout>
    );
  }

  const purchasedIds   = new Set(purchases.filter(p => !p.acces_revoque).map(p => p.formation_id));
  const revokedPurchases = purchases.filter(p => p.acces_revoque);
  const totalAchats    = purchases.filter(p => !p.acces_revoque).length;
  const nonPurchased   = allFormations.filter(f => !purchasedIds.has(f.id));

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-xl font-black text-foreground">Mes Formations</h1>
              <p className="text-xs text-muted-foreground">
                {userIsAdmin ? "Accès administrateur — toutes formations débloquées" : `${totalAchats} formation${totalAchats !== 1 ? "s" : ""} achetée${totalAchats !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {userIsAdmin && (
              <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold px-3 py-1.5 rounded-full">
                <Crown className="w-3.5 h-3.5" /> Admin
              </div>
            )}
            <div className="flex items-center gap-1.5 bg-muted/50 text-xs font-bold px-3 py-1.5 rounded-full text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              {allFormations.length} formation{allFormations.length !== 1 ? "s" : ""}
            </div>
          </div>
        </div>

        {/* Bandeau admin */}
        {userIsAdmin && (
          <div className="flex items-center gap-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl">
            <Shield className="w-5 h-5 text-purple-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-bold text-purple-700 dark:text-purple-300">Mode Administrateur actif</p>
              <p className="text-xs text-muted-foreground mt-0.5">Vous avez accès à toutes les formations et leur contenu sans restriction.</p>
            </div>
            <button onClick={() => navigate("/admin/formations")}
              className="flex items-center gap-1.5 text-xs font-bold text-purple-600 dark:text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-3 py-2 rounded-xl transition-colors">
              <Settings2 className="w-3.5 h-3.5" /> Gérer
            </button>
          </div>
        )}

        {/* Stats bar */}
        {!userIsAdmin && totalAchats > 0 && (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Achetées", value: totalAchats, icon: <Check className="w-4 h-4" />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
              { label: "Disponibles", value: allFormations.length, icon: <BookOpen className="w-4 h-4" />, color: "text-blue-500", bg: "bg-blue-500/10" },
              { label: "À découvrir", value: nonPurchased.length, icon: <Star className="w-4 h-4" />, color: "text-amber-500", bg: "bg-amber-500/10" },
            ].map(s => (
              <div key={s.label} className={`rounded-2xl p-3 ${s.bg} border border-border/30 text-center`}>
                <div className={`flex justify-center mb-1 ${s.color}`}>{s.icon}</div>
                <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Section formations achetées (user normal) */}
        {!userIsAdmin && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-red-600 dark:text-red-500 flex items-center gap-2">
              <Check className="w-4 h-4" /> Formations achetées
            </h2>

            {purchases.filter(p => !p.acces_revoque).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 bg-muted/20 rounded-3xl border border-border/50">
                <div className="w-16 h-16 rounded-3xl bg-muted/40 flex items-center justify-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground/40" />
                </div>
                <div>
                  <h3 className="font-black text-foreground">Aucun achat pour l'instant</h3>
                  <p className="text-sm text-muted-foreground mt-1">Découvrez nos formations et commencez à apprendre.</p>
                </div>
                <button onClick={() => navigate("/formations")}
                  className="px-6 py-2.5 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors">
                  Voir les formations
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {purchases.filter(p => !p.acces_revoque).map(purchase => {
                  const f = purchase.formations;
                  if (!f) return null;
                  return (
                    <FormationCard key={purchase.id} formation={f} purchased={true} adminAccess={false}
                      modules={modulesMap[f.id] || []} modulesLoading={!!modulesLoading[f.id]}
                      expanded={expandedIds.has(f.id)} onToggle={() => toggleModules(f.id)}
                      onNavigate={() => navigate(`/mes-formations/${f.id}/cours`)} />
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section formations disponibles (verrouillées pour user / toutes pour admin) */}
        {(userIsAdmin ? allFormations : nonPurchased).length > 0 && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-black text-red-600 dark:text-red-500 flex items-center gap-2">
                {userIsAdmin
                  ? <><Crown className="w-4 h-4" /> Toutes les formations</>
                  : <><Lock className="w-4 h-4 text-amber-500" /><span className="text-foreground">Formations disponibles</span></>}
              </h2>
              {!userIsAdmin && (
                <button onClick={() => navigate("/formations")} className="text-xs font-bold text-red-600 hover:text-red-700 transition-colors">
                  Voir tout →
                </button>
              )}
            </div>

            {!userIsAdmin && (
              <div className="flex items-center gap-2 p-3 bg-amber-500/8 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                Les vidéos sont verrouillées. Achetez une formation pour y accéder.
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-4">
              {(userIsAdmin ? allFormations : nonPurchased).map(formation => (
                <FormationCard key={formation.id} formation={formation}
                  purchased={purchasedIds.has(formation.id)} adminAccess={userIsAdmin}
                  modules={modulesMap[formation.id] || []} modulesLoading={!!modulesLoading[formation.id]}
                  expanded={expandedIds.has(formation.id)} onToggle={() => toggleModules(formation.id)}
                  onNavigate={() => navigate(purchasedIds.has(formation.id) || userIsAdmin ? `/mes-formations/${formation.id}/cours` : `/formations/${formation.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* Formations avec accès révoqué */}
        {!userIsAdmin && revokedPurchases.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-base font-black text-red-600 dark:text-red-500 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Accès suspendu
            </h2>
            <div className="space-y-3">
              {revokedPurchases.map(purchase => {
                const f = purchase.formations;
                if (!f) return null;
                return (
                  <div key={purchase.id} className="flex items-center gap-4 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl opacity-75">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-red-700 dark:text-red-400 truncate">{f.titre}</p>
                      <p className="text-xs text-red-500 mt-0.5">Accès révoqué par l'administrateur</p>
                      {purchase.revoque_raison && (
                        <p className="text-xs text-muted-foreground mt-1 bg-red-100 dark:bg-red-900/30 rounded px-2 py-1">
                          Motif : {purchase.revoque_raison}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Aucune formation */}
        {allFormations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="w-20 h-20 rounded-3xl bg-muted/40 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <div>
              <h3 className="font-black text-foreground text-lg">Aucune formation disponible</h3>
              <p className="text-sm text-muted-foreground mt-1">Aucune formation active pour le moment.</p>
            </div>
            {userIsAdmin && (
              <button onClick={() => navigate("/admin/formations")}
                className="px-6 py-2.5 rounded-2xl bg-purple-600 text-white font-bold text-sm hover:bg-purple-700 transition-colors flex items-center gap-2">
                <Settings2 className="w-4 h-4" /> Ajouter une formation
              </button>
            )}
          </div>
        )}

      </div>
    </AppLayout>
  );
}
