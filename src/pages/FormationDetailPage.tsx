/**
 * NEXORA — Page Détail Formation
 * ✅ Ajouts affiliation :
 *   - saveAffiliateRef() au chargement pour persister le ?ref= à vie
 *   - QuickSignupModal au lieu de rediriger vers /login
 *   - trackAffiliateClick() pour comptabiliser les visites affiliées
 */

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen, Play, FileText, ShoppingCart,
  Share2, Copy, CheckCheck, Loader2, ArrowLeft, Award,
  TrendingUp, Check, ExternalLink, Tag, Clock, Lock
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { distributeFormationCommissions, formatMontant } from "@/lib/mlm-utils";
import { useToast } from "@/hooks/use-toast";
import { initPayment } from "@/lib/Moneroo";
import { saveAffiliateRef, trackAffiliateClick } from "@/lib/affiliateService";
import QuickSignupModal from "@/components/QuickSignupModal";

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
  niveau?: string | null;
  duree?: string | null;
  duree_totale?: number | null;
  categorie?: string | null;
  created_at: string;
}

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

const NIVEAU_COLORS: Record<string, string> = {
  "debutant":      "bg-blue-500/90 text-white",
  "intermediaire": "bg-amber-500/90 text-white",
  "avance":        "bg-red-600/90 text-white",
  "expert":        "bg-purple-600/90 text-white",
};

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

const getLeconIcon = (type: string) => {
  if (type === "video") return <Play className="w-3.5 h-3.5" />;
  if (type === "pdf") return <FileText className="w-3.5 h-3.5" />;
  return <ExternalLink className="w-3.5 h-3.5" />;
};

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formation, setFormation] = useState<Formation | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);
  const [buying, setBuying] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── QuickSignupModal ──
  const [showSignupModal, setShowSignupModal] = useState(false);

  const user = getNexoraUser();
  const affiliateRef = searchParams.get("ref");

  // ── 1. Sauvegarder le ref affilié à vie + tracker le clic ──
  useEffect(() => {
    if (affiliateRef) {
      saveAffiliateRef(affiliateRef);
      if (id) {
        trackAffiliateClick(affiliateRef, id).catch(() => {/* silencieux */});
      }
    }
  }, [affiliateRef, id]);

  useEffect(() => { if (id) loadFormation(); }, [id]);

  const loadFormation = async () => {
    setLoading(true);

    const { data, error } = await (supabase as any)
      .from("formations").select("*").eq("id", id).eq("actif", true).maybeSingle();

    if (error || !data) {
      toast({ title: "Formation introuvable", variant: "destructive" });
      navigate("/formations");
      return;
    }
    setFormation(data);

    const { data: modsData } = await (supabase as any)
      .from("formation_modules")
      .select(`*, formation_lecons(*)`)
      .eq("formation_id", id)
      .order("ordre", { ascending: true });

    if (modsData && modsData.length > 0) {
      setModules(modsData.map((m: any) => ({
        ...m,
        formation_lecons: (m.formation_lecons || []).sort(
          (a: any, b: any) => a.ordre - b.ordre
        ),
      })));
    }

    if (user) {
      const { data: pData } = await (supabase as any)
        .from("formation_purchases").select("id")
        .eq("user_id", user.id).eq("formation_id", id).eq("status", "completed").maybeSingle();
      setPurchased(!!pData);
    }
    setLoading(false);
  };

  const prixEffectif = formation
    ? (formation.prix_promo && formation.prix_promo < formation.prix
        ? formation.prix_promo : formation.prix)
    : 0;

  const hasPromo = formation?.prix_promo && formation.prix_promo < formation.prix;
  const reduction = hasPromo
    ? Math.round(((formation!.prix - formation!.prix_promo!) / formation!.prix) * 100) : 0;

  const totalSeconds = (formation?.duree_totale && formation.duree_totale > 0)
    ? formation.duree_totale
    : modules.flatMap(m => m.formation_lecons).reduce((s, l) => s + (l.duree_secondes || 0), 0);

  const totalLecons = modules.flatMap(m => m.formation_lecons).length;

  const handleBuy = async () => {
    // ── 2. Si non connecté → ouvrir QuickSignupModal (pas redirection) ──
    if (!user) {
      const redirectUrl = `/formations/${id}${affiliateRef ? `?ref=${affiliateRef}` : ""}`;
      sessionStorage.setItem("post_login_redirect", redirectUrl);
      setShowSignupModal(true);
      return;
    }
    if (!formation) return;
    if (purchased) { navigate("/mes-formations"); return; }

    setBuying(true);
    try {
      if (prixEffectif === 0) {
        const { data: purchase, error } = await (supabase as any)
          .from("formation_purchases").insert({
            user_id: user.id, formation_id: formation.id,
            amount: 0, currency: "XOF", status: "completed",
            affiliate_id: affiliateRef || null,
          }).select().maybeSingle();
        if (error) throw error;
        if (purchase && affiliateRef)
          await distributeFormationCommissions(user.id, affiliateRef, 0, purchase.id);
        toast({ title: "✅ Accès accordé !", description: `Bienvenue dans "${formation.titre}"` });
        setPurchased(true);
        setTimeout(() => navigate("/mes-formations"), 1200);
        return;
      }

      const result = await initPayment({
        type_transaction: "product", amount: prixEffectif, currency: "XOF",
        metadata: { formation_id: formation.id, product_name: formation.titre,
          user_id: user.id, affiliate_id: affiliateRef || "" },
      });

      if (result.success && result.payment_url) {
        await (supabase as any).from("formation_purchases").insert({
          user_id: user.id, formation_id: formation.id,
          amount: prixEffectif, currency: "XOF", status: "pending",
          affiliate_id: affiliateRef || null, payment_id: result.payment_id || null,
        });
        toast({ title: "Redirection vers le paiement…" });
        window.location.href = result.payment_url;
      } else {
        toast({ title: "Erreur paiement", description: result.error || "Impossible d'initier.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erreur", description: err?.message || "Une erreur est survenue.", variant: "destructive" });
    } finally { setBuying(false); }
  };

  const handleShare = async () => {
    if (!formation) return;
    let refCode = "public";
    if (user) {
      const { data: ud } = await (supabase as any)
        .from("nexora_users").select("ref_code").eq("id", user.id).maybeSingle();
      refCode = ud?.ref_code || user.id;
    }
    const link = `${window.location.origin}/formations/${formation.id}?ref=${refCode}`;
    const msg = `🎓 *${formation.titre}*\n\n${formation.description || ""}\n\n💰 Prix : ${formatMontant(prixEffectif)}\n\n👆 Voir la formation :\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopy = async () => {
    if (!formation) return;
    let refCode = "public";
    if (user) {
      const { data: ud } = await (supabase as any)
        .from("nexora_users").select("ref_code").eq("id", user.id).maybeSingle();
      refCode = ud?.ref_code || user.id;
    }
    await navigator.clipboard.writeText(
      `${window.location.origin}/formations/${formation.id}?ref=${refCode}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Lien copié ✅" });
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </PublicLayout>
    );
  }

  if (!formation) return null;

  const niveauKey = (formation.niveau || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const niveauColor = NIVEAU_COLORS[niveauKey] || "bg-gray-700/90 text-white";

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto">

        {/* Bouton retour */}
        <button onClick={() => navigate("/formations")}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Retour aux formations
        </button>

        {/* ── TITRE & BADGES au-dessus de l'image ── */}
        <div className="mb-4 px-1">
          <h1 className="text-xl sm:text-2xl font-black text-foreground leading-snug">
            {formation.titre}
          </h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {formation.niveau && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${niveauColor}`}>
                {formation.niveau}
              </span>
            )}
            {totalSeconds > 0 && (
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-full">
                <Clock className="w-3 h-3" /> {formatDureeTotale(totalSeconds)}
              </span>
            )}
            {totalLecons > 0 && (
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1 bg-muted/40 px-3 py-1 rounded-full">
                <Play className="w-3 h-3" /> {totalLecons} leçon{totalLecons > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        {/* ── IMAGE HERO ── */}
        <div className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-red-900/40 via-gray-900 to-gray-800 mb-6 shadow-2xl">
          {formation.image_url ? (
            <img src={formation.image_url} alt={formation.titre}
              className="w-full h-auto block"
              style={{ maxHeight: "480px", objectFit: "cover", objectPosition: "center top" }} />
          ) : (
            <div className="w-full h-52 flex items-center justify-center">
              <BookOpen className="w-20 h-20 text-red-400/30" />
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
          {hasPromo && (
            <div className="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
              -{reduction}%
            </div>
          )}
          {purchased && (
            <div className="absolute bottom-3 right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg">
              <Check className="w-3.5 h-3.5" /> Déjà acheté
            </div>
          )}
        </div>

        {/* Corps */}
        <div className="space-y-5">

          {formation.categorie && (
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                {formation.categorie}
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {formation.duree && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" /> {formation.duree}
              </div>
            )}
            {prixEffectif > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-full">
                <TrendingUp className="w-3.5 h-3.5" />
                +{formatMontant(Math.round(prixEffectif * 0.30))} si revendu (30%)
              </div>
            )}
          </div>

          {/* ─── PRIX ─── */}
          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <div className="flex items-end gap-3 flex-wrap">
              {hasPromo ? (
                <>
                  <span className="text-3xl font-black text-emerald-500">{formatMontant(formation.prix_promo!)}</span>
                  <span className="text-xl font-bold text-red-500 line-through opacity-70">{formatMontant(formation.prix)}</span>
                  <span className="text-xs font-black bg-emerald-500 text-white px-2.5 py-1 rounded-full">-{reduction}% de réduction</span>
                </>
              ) : (
                <span className="text-3xl font-black text-red-500">{formatMontant(formation.prix)}</span>
              )}
            </div>

            <button onClick={handleBuy} disabled={buying}
              className={`w-full py-3.5 rounded-2xl font-black text-base flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg ${
                purchased ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                  : prixEffectif === 0 ? "bg-primary hover:bg-primary/90 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/30"
              }`}>
              {buying ? <Loader2 className="w-5 h-5 animate-spin" />
                : purchased ? <><ExternalLink className="w-5 h-5" /> Accéder à Mes Formations</>
                : prixEffectif === 0 ? <><Check className="w-5 h-5" /> Accès gratuit — S'inscrire</>
                : <><ShoppingCart className="w-5 h-5" /> Acheter — {formatMontant(prixEffectif)}</>}
            </button>

            {!purchased && prixEffectif > 0 && (
              <p className="text-xs text-center text-muted-foreground">
                💡 Revendez et gagnez{" "}
                <span className="text-emerald-500 font-bold">
                  {formatMontant(Math.round(prixEffectif * 0.30))} de commission (30%)
                </span>
              </p>
            )}
          </div>

          {/* ─── DESCRIPTION ─── */}
          {formation.description && (
            <div className="space-y-2">
              <h2 className="font-black text-foreground text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-red-500" /> À propos de cette formation
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {formation.description}
              </p>
            </div>
          )}

          {/* ─── MODULES & LEÇONS ─── */}
          {modules.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-1">
                <h2 className="font-black text-foreground text-base flex items-center gap-2">
                  <Award className="w-4 h-4 text-red-500" /> Contenu de la formation
                </h2>
                <span className="text-xs text-muted-foreground">
                  {modules.length} module{modules.length > 1 ? "s" : ""} · {totalLecons} leçon{totalLecons > 1 ? "s" : ""}
                  {totalSeconds > 0 && ` · ${formatDureeTotale(totalSeconds)}`}
                </span>
              </div>

              {!purchased && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <Lock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                    Achetez la formation pour débloquer toutes les leçons.
                    {modules.flatMap(m => m.formation_lecons).some(l => l.est_preview) &&
                      " Les aperçus gratuits sont libres d'accès."}
                  </p>
                </div>
              )}

              {modules.map((mod, mi) => {
                const lecons = mod.formation_lecons || [];
                const modDuree = lecons.reduce((s, l) => s + (l.duree_secondes || 0), 0);

                return (
                  <div key={mod.id} className="border border-border rounded-2xl overflow-hidden">
                    <div className="flex items-center gap-3 p-3 bg-muted/20 border-b border-border/40">
                      <div className="w-7 h-7 rounded-full bg-red-500/10 text-red-500 text-xs font-black flex items-center justify-center flex-shrink-0">
                        {mi + 1}
                      </div>
                      <span className="font-bold text-sm text-foreground flex-1 truncate">{mod.titre}</span>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                        <span>{lecons.length} leçon{lecons.length > 1 ? "s" : ""}</span>
                        {modDuree > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {formatDureeTotale(modDuree)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="divide-y divide-border/30">
                      {lecons.map((lecon) => {
                        const unlocked = purchased || lecon.est_preview;
                        return (
                          <div key={lecon.id}
                            className={`flex items-center gap-3 px-4 py-3 transition-colors ${unlocked ? "hover:bg-muted/10" : "opacity-55"}`}>
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                              unlocked ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                            }`}>
                              {unlocked ? getLeconIcon(lecon.type) : <Lock className="w-3.5 h-3.5" />}
                            </div>
                            {unlocked && lecon.url ? (
                              <a href={lecon.url} target="_blank" rel="noopener noreferrer"
                                className="flex-1 text-sm font-medium text-foreground hover:text-primary transition-colors truncate">
                                {lecon.titre}
                              </a>
                            ) : (
                              <span className="flex-1 text-sm font-medium text-foreground truncate">{lecon.titre}</span>
                            )}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {lecon.est_preview && !purchased && (
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  Aperçu
                                </span>
                              )}
                              {!unlocked && <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />}
                              {lecon.duree_secondes > 0 && (
                                <span className="text-xs text-muted-foreground font-mono">
                                  {formatLeconDuree(lecon.duree_secondes)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {!purchased && totalLecons > 0 && (
                <button onClick={handleBuy} disabled={buying}
                  className="w-full py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm flex items-center justify-center gap-2 transition-all shadow-md shadow-red-600/20 active:scale-[0.98]">
                  {buying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                  Débloquer toutes les leçons — {formatMontant(prixEffectif)}
                </button>
              )}
            </div>
          )}

          {/* ─── CONTENU legacy ─── */}
          {purchased && formation.contenu_url && formation.contenu_type !== "modules" && (
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                  {formation.contenu_type === "video" ? <Play className="w-5 h-5 text-emerald-500" />
                    : formation.contenu_type === "pdf" ? <FileText className="w-5 h-5 text-emerald-500" />
                    : <ExternalLink className="w-5 h-5 text-emerald-500" />}
                </div>
                <div>
                  <h3 className="font-black text-foreground text-sm">✅ Contenu débloqué</h3>
                  <p className="text-xs text-muted-foreground">Cliquez pour accéder à votre formation</p>
                </div>
              </div>
              <a href={formation.contenu_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-card border border-emerald-500/20 rounded-xl hover:bg-emerald-500/5 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-emerald-500">Accéder au contenu</p>
                  <p className="text-xs text-muted-foreground truncate">{formation.contenu_url}</p>
                </div>
                <ExternalLink className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </a>
            </div>
          )}

          {/* ─── PARTAGE AFFILIÉ ─── */}
          <div className="bg-gradient-to-r from-red-500/10 to-emerald-500/10 border border-red-500/20 rounded-2xl p-4 space-y-3">
            <div>
              <h3 className="font-black text-foreground text-sm">💸 Gagnez en partageant</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Partagez et gagnez{" "}
                <span className="font-bold text-emerald-500">30%</span> sur chaque vente générée.
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={handleShare}
                className="flex-1 h-10 rounded-xl bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-emerald-600 transition-colors">
                <Share2 className="w-3.5 h-3.5" /> Partager WhatsApp
              </button>
              <button onClick={handleCopy}
                className="flex-1 h-10 rounded-xl border border-border text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
                {copied
                  ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Copié !</>
                  : <><Copy className="w-3.5 h-3.5" /> Copier le lien</>}
              </button>
            </div>
          </div>

          {!user && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-muted-foreground">
                🔒 Achetez pour accéder immédiatement. Créez votre compte en quelques secondes.
              </p>
            </div>
          )}

        </div>
      </div>

      
      {/* ── QuickSignupModal ── */}
      <QuickSignupModal
        open={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        affiliateRef={affiliateRef || undefined}
        onSuccess={() => {
          setShowSignupModal(false);
          // Après inscription, on relance l'achat (user sera connecté)
          setTimeout(() => handleBuy(), 300);
        }}
      />
    </PublicLayout>
  );
}
