/**
 * FormationsPage — Marketplace des formations (MODE PUBLIC CONTRÔLÉ)
 *
 * ✅ Accessible sans compte uniquement via un lien d'affiliation (?ref=)
 * ✅ Utilisateurs connectés → accès direct, sans restriction
 * ✅ Clic "Acheter" sans compte → QuickSignupModal (pas de redirection)
 * ✅ Après inscription → achat enchaîné automatiquement
 * ✅ Liens de partage affilié → /formations/:id?ref=CODE
 * ✅ Aucun menu / sidebar de la plateforme NEXORA affiché
 */

import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  BookOpen, Play, FileText, Link, ShoppingCart, Share2, Check,
  Loader2, X, ExternalLink, TrendingUp, Copy, CheckCheck,
} from "lucide-react";
import PublicLayout from "@/components/PublicLayout";
import QuickSignupModal from "@/components/QuickSignupModal";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { distributeFormationCommissions, formatMontant } from "@/lib/mlm-utils";
import { useToast } from "@/hooks/use-toast";
import { initPayment } from "@/lib/Moneroo";

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
}

interface Purchase {
  formation_id: string;
}

export default function FormationsPage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFormation, setSelectedFormation] = useState<Formation | null>(null);
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal inscription rapide pour les visiteurs non connectés
  const [signupModalOpen, setSignupModalOpen] = useState(false);
  const [pendingFormation, setPendingFormation] = useState<Formation | null>(null);

  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const user = getNexoraUser();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [{ data: fData }, { data: pData }] = await Promise.all([
      (supabase as any)
        .from("formations")
        .select("*")
        .eq("actif", true)
        .order("created_at", { ascending: false }),
      user
        ? (supabase as any)
            .from("formation_purchases")
            .select("formation_id")
            .eq("user_id", user.id)
            .eq("status", "completed")
        : { data: [] },
    ]);
    setFormations(fData || []);
    setPurchases(pData || []);
    setLoading(false);
  };

  const isPurchased = (formationId: string) =>
    purchases.some((p) => p.formation_id === formationId);

  // ── Achat effectif (utilisateur connecté requis) ─────────────────────────────
  const processBuy = async (formation: Formation) => {
    const currentUser = getNexoraUser();
    if (!currentUser) return;

    if (isPurchased(formation.id)) {
      setSelectedFormation(formation);
      return;
    }

    setBuyingId(formation.id);
    try {
      if (formation.prix === 0) {
        const { data: purchase, error } = await (supabase as any)
          .from("formation_purchases")
          .insert({
            user_id: currentUser.id,
            formation_id: formation.id,
            amount: 0,
            currency: "XOF",
            status: "completed",
          })
          .select()
          .maybeSingle();

        if (error) throw error;

        toast({ title: "Accès accordé ✅", description: `Vous avez accès à "${formation.titre}"` });
        await loadData();
        setSelectedFormation(formation);
        return;
      }

      const finalPrice =
        formation.prix_promo && formation.prix_promo < formation.prix
          ? formation.prix_promo
          : formation.prix;

      const result = await initPayment({
        type_transaction: "product",
        amount: finalPrice,
        currency: "XOF",
        metadata: {
          formation_id: formation.id,
          product_name: formation.titre,
          user_id: currentUser.id,
        },
      });

      if (result.success && result.payment_url) {
        await (supabase as any).from("formation_purchases").insert({
          user_id: currentUser.id,
          formation_id: formation.id,
          amount: formation.prix,
          currency: "XOF",
          status: "pending",
          payment_id: result.payment_id || null,
        });
        toast({ title: "Redirection vers le paiement ✅" });
        window.location.href = result.payment_url;
      } else {
        toast({
          title: "Erreur paiement",
          description: result.error || "Impossible d'initier le paiement.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("Erreur achat formation:", err);
      toast({
        title: "Erreur",
        description: err?.message || "Impossible de traiter le paiement.",
        variant: "destructive",
      });
    } finally {
      setBuyingId(null);
    }
  };

  // ── Bouton "Acheter" : ouvre le modal si non connecté ───────────────────────
  const handleBuy = (formation: Formation) => {
    if (!user) {
      setPendingFormation(formation);
      setSignupModalOpen(true);
      return;
    }
    processBuy(formation);
  };

  // ── Après inscription réussie → enchaîner l'achat ────────────────────────────
  const handleSignupSuccess = () => {
    setSignupModalOpen(false);
    if (pendingFormation) {
      const f = pendingFormation;
      setPendingFormation(null);
      loadData().then(() => processBuy(f));
    }
  };

  // ── Partage WhatsApp avec lien affilié ──────────────────────────────────────
  const handleShare = async (formation: Formation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setPendingFormation(formation);
      setSignupModalOpen(true);
      return;
    }
    const { data: ud } = await (supabase as any)
      .from("nexora_users").select("ref_code").eq("id", user.id).maybeSingle();
    const refCode = ud?.ref_code || user.id;
    const link = `${window.location.origin}/formations/${formation.id}?ref=${refCode}`;
    const finalPrice =
      formation.prix_promo && formation.prix_promo < formation.prix
        ? formation.prix_promo : formation.prix;
    const msg = `🎓 *${formation.titre}*\n\n${formation.description || ""}\n\n💰 Prix : ${formatMontant(finalPrice)}\n\n👆 Voir la formation :\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Copier le lien affilié ──────────────────────────────────────────────────
  const handleCopyLink = async (formation: Formation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setPendingFormation(formation);
      setSignupModalOpen(true);
      return;
    }
    const { data: ud } = await (supabase as any)
      .from("nexora_users").select("ref_code").eq("id", user.id).maybeSingle();
    const refCode = ud?.ref_code || user.id;
    const link = `${window.location.origin}/formations/${formation.id}?ref=${refCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedId(formation.id);
    setTimeout(() => setCopiedId(null), 2000);
    toast({ title: "Lien copié ✅" });
  };

  const getTypeIcon = (type: string) => {
    if (type === "video") return <Play className="w-4 h-4" />;
    if (type === "pdf") return <FileText className="w-4 h-4" />;
    return <Link className="w-4 h-4" />;
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

  return (
    <PublicLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ── En-tête ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-primary" /> Formations
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Achetez et revendez des formations pour gagner des commissions
            </p>
          </div>
          <div className="bg-primary/10 text-primary text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5" /> Gagnez 30% sur chaque vente
          </div>
        </div>

        {/* ── Bannière visiteur ── */}
        {!user && (
          <div className="bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="font-bold text-foreground text-sm">Créez votre compte gratuitement</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Achetez des formations et gagnez des commissions en les revendant
              </p>
            </div>
            <button
              onClick={() => navigate(`/register`)}
              className="flex-shrink-0 bg-primary text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-primary/90 transition-colors"
            >
              Créer un compte
            </button>
          </div>
        )}

        {/* ── Stats commissions ── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Vendeur direct", value: "30%", color: "text-emerald-400", bg: "bg-emerald-400/10" },
            { label: "Niveau 1", value: "5%", color: "text-blue-400", bg: "bg-blue-400/10" },
          ].map((s) => (
            <div key={s.label} className={`rounded-2xl p-3 ${s.bg} border border-border/30 text-center`}>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Grille formations ── */}
        {formations.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Aucune formation disponible pour l'instant</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {formations.map((formation) => {
              const bought = isPurchased(formation.id);
              const isBuying = buyingId === formation.id;
              const finalPrice =
                formation.prix_promo && formation.prix_promo < formation.prix
                  ? formation.prix_promo : formation.prix;
              const hasPromo = formation.prix_promo && formation.prix_promo < formation.prix;

              return (
                <div
                  key={formation.id}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:shadow-lg transition-all group cursor-pointer"
                  onClick={() =>
                    navigate(`/formations/${formation.id}`)
                  }
                >
                  {/* Image */}
                  <div
                    className="relative bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden"
                    style={{ minHeight: "10rem" }}
                  >
                    {formation.image_url ? (
                      <img
                        src={formation.image_url}
                        alt={formation.titre}
                        className="w-full h-auto block"
                        style={{ maxHeight: "10rem", objectFit: "cover", width: "100%" }}
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center">
                        <BookOpen className="w-12 h-12 text-primary/40" />
                      </div>
                    )}
                    {bought && (
                      <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                        <Check className="w-3 h-3" /> Acheté
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      {getTypeIcon(formation.contenu_type)}
                      {formation.contenu_type.toUpperCase()}
                    </div>
                  </div>

                  {/* Contenu */}
                  <div className="p-4 space-y-3">
                    <div>
                      <h3 className="font-black text-foreground text-sm leading-snug">
                        {formation.titre}
                      </h3>
                      {formation.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {formation.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-red-500">
                          {formatMontant(finalPrice)}
                        </span>
                        {hasPromo && (
                          <span className="text-sm font-bold text-muted-foreground line-through">
                            {formatMontant(formation.prix)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full">
                        +{formatMontant(Math.round(finalPrice * 0.3))} si vendu
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="space-y-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleBuy(formation); }}
                        disabled={isBuying}
                        className={`w-full h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                          bought
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-primary text-white hover:bg-primary/90 shadow-sm"
                        }`}
                      >
                        {isBuying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : bought ? (
                          <><Play className="w-4 h-4" /> Accéder au contenu</>
                        ) : (
                          <><ShoppingCart className="w-4 h-4" /> Acheter — {formatMontant(finalPrice)}</>
                        )}
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleShare(formation, e)}
                          className="flex-1 h-9 rounded-xl border border-border text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-green-600 hover:border-green-400 transition-colors"
                        >
                          <Share2 className="w-3.5 h-3.5" /> WhatsApp
                        </button>
                        <button
                          onClick={(e) => handleCopyLink(formation, e)}
                          className="flex-1 h-9 rounded-xl border border-border text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          {copiedId === formation.id ? (
                            <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Copié</>
                          ) : (
                            <><Copy className="w-3.5 h-3.5" /> Lien</>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal inscription rapide ── */}
      <QuickSignupModal
        open={signupModalOpen}
        onClose={() => { setSignupModalOpen(false); setPendingFormation(null); }}
        onSuccess={handleSignupSuccess}
        formationTitre={pendingFormation?.titre}
      />

      {/* ── Modal accès contenu (après achat) ── */}
      {selectedFormation && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-foreground text-lg">{selectedFormation.titre}</h2>
              <button
                onClick={() => setSelectedFormation(null)}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedFormation.description && (
              <p className="text-sm text-muted-foreground">{selectedFormation.description}</p>
            )}

            <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Contenu de la formation
              </p>
              {selectedFormation.contenu_url ? (
                <a
                  href={selectedFormation.contenu_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-primary/10 rounded-xl hover:bg-primary/20 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(selectedFormation.contenu_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground">Accéder au contenu</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {selectedFormation.contenu_url}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Contenu en cours de chargement…
                </p>
              )}
            </div>

            <button
              onClick={async () => {
                const currentUser = getNexoraUser();
                if (!selectedFormation || !currentUser) return;
                const { data: ud } = await (supabase as any)
                  .from("nexora_users").select("ref_code").eq("id", currentUser.id).maybeSingle();
                const refCode = ud?.ref_code || currentUser.id;
                const link = `${window.location.origin}/formations/${selectedFormation.id}?ref=${refCode}`;
                const finalPrice =
                  selectedFormation.prix_promo && selectedFormation.prix_promo < selectedFormation.prix
                    ? selectedFormation.prix_promo : selectedFormation.prix;
                const msg = `🎓 *${selectedFormation.titre}*\n\n${selectedFormation.description || ""}\n\n💰 Prix : ${formatMontant(finalPrice)}\n\n👆 Voir la formation :\n${link}`;
                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
              }}
              className="w-full h-11 rounded-xl bg-green-500 text-white font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors"
            >
              <Share2 className="w-4 h-4" /> Partager sur WhatsApp et gagner 30%
            </button>
          </div>
        </div>
      )}
    </PublicLayout>
  );
}
