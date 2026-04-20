/**
 * NEXORA — Page Détail Formation
 * ✅ Design premium page de vente
 * ✅ Suppression totale parrainage / commissions / %
 * ✅ Modules et leçons avec titres complets
 */

import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen, Play, FileText, ShoppingCart,
  Loader2, ArrowLeft, Award,
  Check, ExternalLink, Clock, Lock,
  Star, Zap, Shield, ChevronDown, ChevronUp, Link
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { formatMontant } from "@/lib/mlm-utils";
import { useToast } from "@/hooks/use-toast";
import { initPayment } from "@/lib/Moneroo";
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

const NIVEAU_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "debutant":      { label: "Débutant",      color: "#3b82f6", bg: "rgba(59,130,246,0.15)",  border: "rgba(59,130,246,0.3)"  },
  "intermediaire": { label: "Intermédiaire", color: "#f97316", bg: "rgba(249,115,22,0.15)",  border: "rgba(249,115,22,0.3)"  },
  "avance":        { label: "Avancé",        color: "#ef4444", bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.3)"   },
  "expert":        { label: "Expert",        color: "#8b5cf6", bg: "rgba(139,92,246,0.15)",  border: "rgba(139,92,246,0.3)"  },
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

const getLeconIcon = (type: string, size = "w-3 h-3") => {
  if (type === "video") return <Play className={size} />;
  if (type === "pdf")   return <FileText className={size} />;
  return <Link className={size} />;
};

const getLeconIconClass = (type: string) => {
  if (type === "video") return "fd-licon--video";
  if (type === "pdf")   return "fd-licon--pdf";
  return "fd-licon--lien";
};

export default function FormationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [formation, setFormation]   = useState<Formation | null>(null);
  const [modules, setModules]       = useState<Module[]>([]);
  const [loading, setLoading]       = useState(true);
  const [purchased, setPurchased]   = useState(false);
  const [buying, setBuying]         = useState(false);
  const [openMods, setOpenMods]     = useState<Set<string>>(new Set());
  const [showSignup, setShowSignup] = useState(false);

  const user = getNexoraUser();

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

    if (modsData?.length > 0) {
      const sorted = modsData.map((m: any) => ({
        ...m,
        formation_lecons: (m.formation_lecons || []).sort(
          (a: any, b: any) => a.ordre - b.ordre
        ),
      }));
      setModules(sorted);
      if (sorted.length > 0) setOpenMods(new Set([sorted[0].id]));
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
        ? formation.prix_promo : formation.prix) : 0;

  const hasPromo   = !!(formation?.prix_promo && formation.prix_promo < formation.prix);
  const reduction  = hasPromo
    ? Math.round(((formation!.prix - formation!.prix_promo!) / formation!.prix) * 100) : 0;

  const totalSeconds = (formation?.duree_totale && formation.duree_totale > 0)
    ? formation.duree_totale
    : modules.flatMap(m => m.formation_lecons).reduce((s, l) => s + (l.duree_secondes || 0), 0);
  const totalLecons = modules.flatMap(m => m.formation_lecons).length;

  const toggleMod = (modId: string) => {
    setOpenMods(prev => {
      const next = new Set(prev);
      next.has(modId) ? next.delete(modId) : next.add(modId);
      return next;
    });
  };

  const handleBuy = async () => {
    if (!user) {
      const redirectUrl = `/formations/${id}`;
      sessionStorage.setItem("post_login_redirect", redirectUrl);
      setShowSignup(true);
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
          }).select().maybeSingle();
        if (error) throw error;
        toast({ title: "✅ Accès accordé !", description: `Bienvenue dans "${formation.titre}"` });
        setPurchased(true);
        setTimeout(() => navigate("/mes-formations"), 1200);
        return;
      }

      const result = await initPayment({
        type_transaction: "product", amount: prixEffectif, currency: "XOF",
        metadata: {
          formation_id: formation.id,
          product_name: formation.titre,
          user_id: user.id,
        },
      });

      if (result.success && result.payment_url) {
        await (supabase as any).from("formation_purchases").insert({
          user_id: user.id, formation_id: formation.id,
          amount: prixEffectif, currency: "XOF", status: "pending",
          payment_id: result.payment_id || null,
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

  /* ── Loading ── */
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
  const niveauCfg = NIVEAU_CONFIG[niveauKey];

  return (
    <PublicLayout>
      <style>{PAGE_CSS}</style>

      <div className="fd">

        {/* ── RETOUR ── */}
        <button onClick={() => navigate("/formations")} className="fd-back">
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour aux formations
        </button>

        {/* ══════════════════════════
            HERO
        ══════════════════════════ */}
        <div className="fd-hero">
          <div className="fd-hero-img-wrap">
            {formation.image_url ? (
              <img src={formation.image_url} alt={formation.titre} className="fd-hero-img" />
            ) : (
              <div className="fd-hero-placeholder">
                <BookOpen className="w-16 h-16" style={{ color: "rgba(255,255,255,0.15)" }} />
              </div>
            )}
            <div className="fd-hero-gradient" />

            {/* Badges haut */}
            <div className="fd-hero-top">
              {formation.categorie && (
                <span className="fd-cat-badge">{formation.categorie}</span>
              )}
              <div style={{ display: "flex", gap: 8 }}>
                {hasPromo && <span className="fd-promo-badge">-{reduction}%</span>}
                {purchased && (
                  <span className="fd-owned-badge">
                    <Check className="w-3 h-3" /> Déjà acheté
                  </span>
                )}
              </div>
            </div>

            {/* Titre + pills */}
            <div className="fd-hero-bottom">
              <h1 className="fd-hero-title">{formation.titre}</h1>
              <div className="fd-hero-pills">
                {niveauCfg && (
                  <span
                    className="fd-niveau-pill"
                    style={{ color: niveauCfg.color, background: niveauCfg.bg, border: `1px solid ${niveauCfg.border}` }}
                  >
                    {niveauCfg.label}
                  </span>
                )}
                {totalSeconds > 0 && (
                  <span className="fd-pill">
                    <Clock className="w-2.5 h-2.5" /> {formatDureeTotale(totalSeconds)}
                  </span>
                )}
                {totalLecons > 0 && (
                  <span className="fd-pill">
                    <Play className="w-2.5 h-2.5" /> {totalLecons} leçon{totalLecons > 1 ? "s" : ""}
                  </span>
                )}
                {modules.length > 0 && (
                  <span className="fd-pill">
                    <BookOpen className="w-2.5 h-2.5" /> {modules.length} module{modules.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="fd-body">

          {/* Description */}
          {formation.description && (
            <p className="fd-desc">{formation.description}</p>
          )}

         
          {/* ══════════════════════════
              CARTE PRIX + ACHAT
          ══════════════════════════ */}
          <div className="fd-buy-card">
            {hasPromo ? (
              <div className="fd-price-row">
                <span className="fd-price">{formatMontant(formation.prix_promo!)}</span>
                <span className="fd-price-old">{formatMontant(formation.prix)}</span>
                <span className="fd-promo-tag">Offre limitée</span>
              </div>
            ) : (
              <div className="fd-price-row">
                <span className="fd-price">{formatMontant(formation.prix)}</span>
              </div>
            )}

            <p className="fd-price-note">Paiement unique · Accès à vie</p>

            <button
              onClick={handleBuy}
              disabled={buying}
              className={`fd-buy-btn ${purchased ? "fd-buy-btn--owned" : prixEffectif === 0 ? "fd-buy-btn--free" : "fd-buy-btn--paid"}`}
            >
              {buying
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : purchased
                  ? <><ExternalLink className="w-5 h-5" /> Accéder à ma formation</>
                  : prixEffectif === 0
                    ? <><Check className="w-5 h-5" /> S'inscrire gratuitement</>
                    : <>Acheter maintenant</>
              }
            </button>

            <div className="fd-trust">
              <span>🔒 Paiement sécurisé</span>
              <span className="fd-trust-dot">·</span>
              <span>🛡️ Garantie 7 jours</span>
              <span className="fd-trust-dot">·</span>
              <span>⚡ Accès immédiat</span>
            </div>
          </div>

          {/* ══════════════════════════
              MODULES & LEÇONS
          ══════════════════════════ */}
          {modules.length > 0 && (
            <div className="fd-section">
              <div className="fd-section-head">
                <div>
                  <div className="fd-section-label">Programme complet</div>
                  <h2 className="fd-section-title">Contenu de la formation</h2>
                  <p className="fd-section-meta">
                    {modules.length} module{modules.length > 1 ? "s" : ""} · {totalLecons} leçon{totalLecons > 1 ? "s" : ""}
                    {totalSeconds > 0 && ` · ${formatDureeTotale(totalSeconds)}`}
                  </p>
                </div>
              </div>

              {/* ── Lock notice (rouge, sans icône) ── */}
              {!purchased && (
                <div className="fd-lock-notice">
                  <p>
                    Achetez la formation pour débloquer toutes les leçons.
                    {modules.flatMap(m => m.formation_lecons).some(l => l.est_preview) &&
                      " Les aperçus sont accessibles gratuitement."}
                  </p>
                </div>
              )}

              <div className="fd-modules-list">
                {modules.map((mod, mi) => {
                  const lecons = mod.formation_lecons || [];
                  const modDur = lecons.reduce((s, l) => s + (l.duree_secondes || 0), 0);
                  const isOpen = openMods.has(mod.id);

                  return (
                    <div key={mod.id} className="fd-module">
                      {/* En-tête module */}
                      <button className="fd-module-btn" onClick={() => toggleMod(mod.id)}>
                        <span className="fd-mod-num">{String(mi + 1).padStart(2, "0")}</span>
                        <div className="fd-mod-info">
                          <span className="fd-mod-title">{mod.titre}</span>
                          <span className="fd-mod-count">
                            {lecons.length} leçon{lecons.length > 1 ? "s" : ""}
                            {modDur > 0 && ` · ${formatDureeTotale(modDur)}`}
                            {mod.description && ` · ${mod.description}`}
                          </span>
                        </div>
                        {isOpen
                          ? <ChevronUp className="w-3.5 h-3.5 fd-chevron" />
                          : <ChevronDown className="w-3.5 h-3.5 fd-chevron" />}
                      </button>

                      {/* Leçons */}
                      {isOpen && (
                        <div className="fd-lecons">
                          {lecons.map((lecon, li) => {
                            const unlocked = purchased || lecon.est_preview;
                            return (
                              <div key={lecon.id} className={`fd-lecon${!unlocked ? " fd-lecon--locked" : ""}`}>
                                <span className="fd-lecon-num">{li + 1}</span>

                                <div className={`fd-licon ${unlocked ? getLeconIconClass(lecon.type) : "fd-licon--locked"}`}>
                                  {unlocked ? getLeconIcon(lecon.type) : <Lock className="w-2.5 h-2.5" />}
                                </div>

                                <div className="fd-lecon-content">
                                  {unlocked && lecon.url ? (
                                    <a
                                      href={lecon.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="fd-lecon-title fd-lecon-title--link"
                                    >
                                      {lecon.titre}
                                    </a>
                                  ) : (
                                    <span className="fd-lecon-title">{lecon.titre}</span>
                                  )}
                                </div>

                                <div className="fd-lecon-right">
                                  {lecon.est_preview && !purchased && (
                                    <span className="fd-preview-pill">Aperçu</span>
                                  )}
                                  {lecon.duree_secondes > 0 && (
                                    <span className="fd-lecon-dur">{formatLeconDuree(lecon.duree_secondes)}</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* CTA bas de section */}
              {!purchased && totalLecons > 0 && (
                <div className="fd-bottom-buy">
                  <button onClick={handleBuy} disabled={buying} className="fd-buy-btn fd-buy-btn--paid">
                    {buying
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <>Accéder à toutes les leçons — {formatMontant(prixEffectif)}</>
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Contenu legacy (acheté, sans modules) ── */}
          {purchased && formation.contenu_url && formation.contenu_type !== "modules" && (
            <div className="fd-section fd-section--unlocked">
              <div className="fd-section-head">
                <div className="fd-unlocked-icon">
                  {formation.contenu_type === "video"
                    ? <Play className="w-5 h-5" />
                    : formation.contenu_type === "pdf"
                      ? <FileText className="w-5 h-5" />
                      : <ExternalLink className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="fd-section-title">✅ Contenu débloqué</h3>
                  <p className="fd-section-meta">Cliquez pour accéder à votre formation</p>
                </div>
              </div>
              <a
                href={formation.contenu_url}
                target="_blank"
                rel="noopener noreferrer"
                className="fd-content-link"
              >
                <div>
                  <p className="fd-content-link-label">Accéder au contenu</p>
                  <p className="fd-content-link-url">{formation.contenu_url}</p>
                </div>
                <ExternalLink className="w-4 h-4" style={{ color: "#14b8a6", flexShrink: 0 }} />
              </a>
            </div>
          )}

          {/* ── Note connexion ── */}
          {!user && (
            <div className="fd-login-note">
              Créez votre compte en quelques secondes pour accéder immédiatement à la formation.
            </div>
          )}

        </div>
      </div>

      {/* ── QuickSignupModal ── */}
      <QuickSignupModal
        open={showSignup}
        onClose={() => setShowSignup(false)}
        onSuccess={() => {
          setShowSignup(false);
          setTimeout(() => handleBuy(), 300);
        }}
      />
    </PublicLayout>
  );
}

/* ═══════════════════════════════════════════════════════════
   CSS
═══════════════════════════════════════════════════════════ */
const PAGE_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Clash+Display:wght@400;500;600;700&family=Satoshi:wght@400;500;600;700&display=swap');

  .fd {
    max-width: 680px;
    margin: 0 auto;
    font-family: 'Satoshi', sans-serif;
  }

  /* ── Retour ── */
  .fd-back {
    display: inline-flex; align-items: center; gap: 6px;
    font-size: 13px; font-weight: 600; letter-spacing: .3px;
    color: var(--muted-foreground, #888);
    background: none; border: none; cursor: pointer;
    padding: 20px 0 0; margin-bottom: 16px;
    transition: color .2s;
  }
  .fd-back:hover { color: var(--foreground, #111); }

  /* ══════ HERO ══════ */
  .fd-hero {
    border-radius: 20px; overflow: hidden;
    margin-bottom: 20px;
  }
  .fd-hero-img-wrap { position: relative; width: 100%; }
  .fd-hero-img {
    width: 100%; height: 320px; object-fit: cover;
    object-position: center top; display: block;
  }
  .fd-hero-placeholder {
    width: 100%; height: 280px;
    background: linear-gradient(135deg, #1a1030 0%, #0d0820 100%);
    display: flex; align-items: center; justify-content: center;
  }
  .fd-hero-gradient {
    position: absolute; inset: 0;
    background: linear-gradient(to top, rgba(8,5,20,0.88) 0%, rgba(8,5,20,0.35) 55%, transparent 100%);
  }
  .fd-hero-top {
    position: absolute; top: 16px; left: 16px; right: 16px;
    display: flex; justify-content: space-between; align-items: flex-start;
  }
  .fd-cat-badge {
    font-size: 11px; font-weight: 700; letter-spacing: .6px; text-transform: uppercase;
    padding: 5px 12px; border-radius: 100px;
    background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.9);
    border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(8px);
  }
  .fd-promo-badge {
    font-size: 12px; font-weight: 800;
    padding: 5px 12px; border-radius: 100px;
    background: #f97316; color: #fff;
  }
  .fd-owned-badge {
    font-size: 11px; font-weight: 700;
    padding: 5px 12px; border-radius: 100px;
    background: #14b8a6; color: #fff;
    display: flex; align-items: center; gap: 4px;
  }
  .fd-hero-bottom {
    position: absolute; bottom: 0; left: 0; right: 0;
    padding: 20px 20px 22px;
  }
  .fd-hero-title {
    font-family: 'Clash Display', sans-serif;
    font-size: clamp(1.4rem, 4vw, 2rem); font-weight: 700;
    color: #fff; line-height: 1.2; margin-bottom: 10px;
  }
  .fd-hero-pills { display: flex; flex-wrap: wrap; gap: 6px; }
  .fd-pill {
    display: inline-flex; align-items: center; gap: 4px;
    font-size: 11px; font-weight: 600;
    padding: 4px 10px; border-radius: 100px;
    background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.85);
    border: 1px solid rgba(255,255,255,0.15); backdrop-filter: blur(6px);
  }
  .fd-niveau-pill {
    font-family: 'Clash Display', sans-serif; font-weight: 600; font-size: 11px;
    padding: 4px 12px; border-radius: 100px; backdrop-filter: blur(6px);
  }

  /* ══════ BODY ══════ */
  .fd-body {
    display: flex; flex-direction: column; gap: 16px;
    padding-bottom: 64px;
  }
  .fd-desc {
    font-size: 15px; line-height: 1.7;
    color: var(--muted-foreground, #666);
  }

  /* ── Perks ── */
  .fd-perks { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  @media (max-width: 520px) { .fd-perks { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 380px) { .fd-perks { grid-template-columns: 1fr; } }
  .fd-perk {
    background: var(--card, #fff);
    border: 1px solid var(--border, #f0f0f0);
    border-radius: 14px; padding: 14px 12px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .fd-perk-icon {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .fd-perk-name { font-size: 12px; font-weight: 700; color: var(--foreground, #111); margin: 0; }
  .fd-perk-sub  { font-size: 11px; color: var(--muted-foreground, #999); margin: 1px 0 0; }

  /* ══════ BUY CARD ══════ */
  .fd-buy-card {
    background: var(--card, #fff);
    border: 1px solid var(--border, #f0f0f0);
    border-radius: 20px; padding: 22px 20px;
  }
  .fd-price-row {
    display: flex; align-items: baseline; gap: 10px;
    flex-wrap: wrap; margin-bottom: 4px;
  }
  .fd-price {
    font-family: 'Clash Display', sans-serif;
    font-size: 2.6rem; font-weight: 700;
    color: var(--foreground, #111); line-height: 1;
  }
  .fd-price-old {
    font-size: 1.15rem; font-weight: 600;
    color: var(--muted-foreground, #aaa); text-decoration: line-through;
  }
  .fd-promo-tag {
    font-size: 11px; font-weight: 800; letter-spacing: .4px;
    background: #fef3c7; color: #92400e;
    padding: 3px 9px; border-radius: 100px;
  }
  .fd-price-note {
    font-size: 12px; color: var(--muted-foreground, #999);
    margin-bottom: 16px; margin-top: 0;
  }

  .fd-buy-btn {
    width: 100%; padding: 16px 20px; border-radius: 14px;
    font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 1rem;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    border: none; cursor: pointer; letter-spacing: .4px;
    transition: transform .18s, box-shadow .18s;
  }
  .fd-buy-btn:disabled { opacity: .7; cursor: not-allowed; }
  .fd-buy-btn:not(:disabled):hover { transform: translateY(-2px); }

  .fd-buy-btn--paid { background: #ef4444; color: #fff; }
  .fd-buy-btn--paid:not(:disabled):hover { box-shadow: 0 8px 24px rgba(239,68,68,0.35); }

  .fd-buy-btn--owned { background: #14b8a6; color: #fff; }
  .fd-buy-btn--owned:not(:disabled):hover { box-shadow: 0 8px 24px rgba(20,184,166,0.3); }

  .fd-buy-btn--free { background: #3b82f6; color: #fff; }
  .fd-buy-btn--free:not(:disabled):hover { box-shadow: 0 8px 24px rgba(59,130,246,0.3); }

  .fd-trust {
    display: flex; align-items: center; justify-content: center;
    gap: 8px; flex-wrap: wrap; margin-top: 14px;
    font-size: 11px; color: var(--muted-foreground, #aaa);
  }
  .fd-trust-dot { opacity: .35; }

  /* ══════ SECTION ══════ */
  .fd-section {
    background: var(--card, #fff);
    border: 1px solid var(--border, #f0f0f0);
    border-radius: 20px; overflow: hidden;
  }
  .fd-section--unlocked {
    border-color: rgba(20,184,166,0.25);
    background: linear-gradient(135deg, rgba(20,184,166,0.04), rgba(59,130,246,0.04));
  }
  .fd-section-head {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 18px 20px 14px;
    border-bottom: 1px solid var(--border, #f0f0f0);
  }
  .fd-section-label {
    font-size: 10px; font-weight: 700; letter-spacing: .8px;
    text-transform: uppercase; color: #7c3aed; margin-bottom: 4px;
  }
  .fd-section-title {
    font-family: 'Clash Display', sans-serif; font-weight: 700;
    font-size: 1.05rem; color: var(--foreground, #111); margin: 0 0 2px;
  }
  .fd-section-meta {
    font-size: 12px; color: var(--muted-foreground, #999); margin: 0;
  }
  .fd-unlocked-icon {
    width: 40px; height: 40px; border-radius: 12px;
    background: rgba(20,184,166,0.1); color: #14b8a6;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }

  /* ── Lock notice (rouge, sans icône) ── */
  .fd-lock-notice {
    display: flex; align-items: flex-start;
    margin: 14px 20px 0;
    padding: 11px 14px; border-radius: 12px;
    background: rgba(239,68,68,0.06);
    border: 1px solid rgba(239,68,68,0.18);
    font-size: 12px; line-height: 1.55; color: #dc2626;
  }
  .fd-lock-notice p { margin: 0; }

  /* ══════ MODULES ══════ */
  .fd-modules-list {
    display: flex; flex-direction: column;
    border-top: 1px solid var(--border, #f0f0f0);
    margin-top: 14px;
  }
  .fd-module { border-bottom: 1px solid var(--border, #f0f0f0); }
  .fd-module:last-child { border-bottom: none; }

  .fd-module-btn {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 14px 20px; background: none; border: none; cursor: pointer;
    text-align: left; transition: background .15s;
  }
  .fd-module-btn:hover { background: var(--muted, rgba(0,0,0,0.02)); }

  .fd-mod-num {
    font-family: 'Clash Display', sans-serif; font-weight: 700; font-size: 11px;
    color: #7c3aed; background: rgba(124,58,237,0.08);
    border-radius: 8px; padding: 3px 8px;
    flex-shrink: 0; min-width: 32px; text-align: center;
  }
  .fd-mod-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
  .fd-mod-title {
    font-weight: 700; font-size: 13px; color: var(--foreground, #111);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fd-mod-count {
    font-size: 11px; color: var(--muted-foreground, #aaa); display: block;
  }
  .fd-chevron { color: var(--muted-foreground, #bbb); flex-shrink: 0; }

  /* ══════ LEÇONS ══════ */
  .fd-lecons {
    border-top: 1px solid var(--border, #f0f0f0);
    background: var(--muted, rgba(0,0,0,0.015));
  }
  .fd-lecon {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 20px;
    border-bottom: 1px solid var(--border, rgba(0,0,0,0.04));
    transition: background .12s;
  }
  .fd-lecon:last-child { border-bottom: none; }
  .fd-lecon:hover { background: var(--card, rgba(255,255,255,0.8)); }
  .fd-lecon--locked { opacity: .55; }

  .fd-lecon-num {
    font-size: 10px; font-weight: 700;
    color: var(--muted-foreground, #ccc);
    width: 18px; text-align: center; flex-shrink: 0;
  }
  .fd-licon {
    width: 26px; height: 26px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .fd-licon--video  { background: rgba(124,58,237,0.1); color: #7c3aed; }
  .fd-licon--pdf    { background: rgba(239,68,68,0.1);  color: #ef4444; }
  .fd-licon--lien   { background: rgba(20,184,166,0.1); color: #14b8a6; }
  .fd-licon--locked { background: var(--muted, #f3f3f3); color: var(--muted-foreground, #bbb); }

  .fd-lecon-content { flex: 1; min-width: 0; }
  .fd-lecon-title {
    font-size: 13px; font-weight: 500; color: var(--foreground, #222);
    display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .fd-lecon-title--link {
    color: var(--foreground, #222); text-decoration: none; transition: color .15s;
  }
  .fd-lecon-title--link:hover { color: #7c3aed; }

  .fd-lecon-right {
    display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  }
  .fd-preview-pill {
    font-size: 10px; font-weight: 800;
    color: #14b8a6; background: rgba(20,184,166,0.1);
    padding: 2px 7px; border-radius: 100px;
    font-family: 'Clash Display', sans-serif;
  }
  .fd-lecon-dur {
    font-size: 11px; color: var(--muted-foreground, #bbb); font-family: monospace;
  }

  /* ── Bottom buy ── */
  .fd-bottom-buy { padding: 14px 20px 20px; }

  /* ── Contenu legacy ── */
  .fd-content-link {
    display: flex; align-items: center; gap: 12px;
    margin: 0 20px 20px;
    padding: 12px 14px;
    background: var(--card, #fff);
    border: 1px solid rgba(20,184,166,0.2);
    border-radius: 14px; text-decoration: none;
    transition: background .15s;
  }
  .fd-content-link:hover { background: rgba(20,184,166,0.04); }
  .fd-content-link-label { font-weight: 700; font-size: 13px; color: #14b8a6; margin: 0; }
  .fd-content-link-url {
    font-size: 11px; color: var(--muted-foreground, #aaa); margin: 2px 0 0;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }

  /* ── Login note ── */
  .fd-login-note {
    text-align: center; padding: 14px 20px;
    background: var(--card, #fff);
    border: 1px solid var(--border, #f0f0f0);
    border-radius: 16px;
    font-size: 13px; color: var(--muted-foreground, #777);
  }

  @media (max-width: 480px) {
    .fd-trust { font-size: 10px; gap: 5px; }
    .fd-hero-title { font-size: 1.3rem; }
  }
`;
