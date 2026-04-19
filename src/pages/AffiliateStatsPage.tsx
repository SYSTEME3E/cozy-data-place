/**
 * NEXORA — Page Mes Commissions Affilié (CORRIGÉE)
 *
 * BUGS CORRIGÉS :
 *  1. [CRITIQUE] loadAll() appelait getAffiliateStats(code) avec le refCode
 *     alors que la fonction corrigée attend le userId.
 *     → Remplacé par getAffiliateStats(user!.id).
 *  2. [CRITIQUE] Les requêtes inline de clics/ventes utilisaient "affiliate_ref"
 *     → Remplacé par "ref_code" (colonne unifiée).
 *  3. [CRITIQUE] Les ventes inline cherchaient par "affiliate_ref" (refCode)
 *     → Remplacé par "referrer_id" (userId) pour cohérence avec recordAffiliateSale.
 *  4. [IMPORTANT] conversionRate lisait stats.totalClicks / stats.totalSales
 *     qui pointaient vers undefined (l'interface retournait totalClics / totalVentes).
 *     → Maintenant aligné avec l'interface corrigée (totalClicks / totalSales).
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, MousePointerClick, ShoppingBag, DollarSign,
  Loader2, ArrowLeft, BookOpen, Share2, Copy, CheckCheck
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { getAffiliateStats, AffiliateStats } from "@/lib/affiliateService";
import { formatMontant } from "@/lib/mlm-utils";
import { useToast } from "@/hooks/use-toast";

interface FormationStat {
  formation_id: string;
  titre: string;
  image_url: string | null;
  clics: number;
  ventes: number;
  revenus: number;
}

export default function AffiliateStatsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const user = getNexoraUser();

  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [formationStats, setFormationStats] = useState<FormationStat[]>([]);
  const [refCode, setRefCode] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [copiedFormation, setCopiedFormation] = useState<string | null>(null);
  const [copiedGlobal, setCopiedGlobal] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      // 1. Récupérer le ref_code de l'utilisateur
      const { data: userData } = await (supabase as any)
        .from("nexora_users").select("ref_code").eq("id", user!.id).maybeSingle();
      const code = userData?.ref_code || user!.id;
      setRefCode(code);

      // 2. Stats globales — FIX #1 : on passe userId, pas refCode
      const globalStats = await getAffiliateStats(user!.id);
      setStats(globalStats);

      // 3. Stats par formation : clics — FIX #2 : colonne "ref_code"
      const { data: clicksData, error: clicksError } = await (supabase as any)
        .from("affiliate_clicks")
        .select("formation_id, created_at")
        .eq("ref_code", code); // FIX #2 : était "affiliate_ref"

      if (clicksError) {
        console.error("[AffiliateStats] Erreur clics:", clicksError);
      }

      // 4. Stats par formation : ventes — FIX #3 : "referrer_id" + userId
      const { data: salesData, error: salesError } = await (supabase as any)
        .from("affiliate_sales")
        .select("formation_id, commission")
        .eq("referrer_id", user!.id); // FIX #3 : était .eq("affiliate_ref", code)

      if (salesError) {
        console.error("[AffiliateStats] Erreur ventes:", salesError);
      }

      // 5. Liste des formations concernées
      const allFormationIds = Array.from(new Set([
        ...(clicksData || []).map((c: any) => c.formation_id).filter(Boolean),
        ...(salesData || []).map((s: any) => s.formation_id).filter(Boolean),
      ]));

      if (allFormationIds.length === 0) {
        setFormationStats([]);
        setLoading(false);
        return;
      }

      const { data: formationsData } = await (supabase as any)
        .from("formations")
        .select("id, titre, image_url")
        .in("id", allFormationIds);

      const formationMap: Record<string, { titre: string; image_url: string | null }> = {};
      (formationsData || []).forEach((f: any) => {
        formationMap[f.id] = { titre: f.titre, image_url: f.image_url };
      });

      // 6. Agréger par formation
      const aggr: Record<string, FormationStat> = {};

      allFormationIds.forEach((fid) => {
        aggr[fid] = {
          formation_id: fid,
          titre: formationMap[fid]?.titre || "Formation supprimée",
          image_url: formationMap[fid]?.image_url || null,
          clics: 0,
          ventes: 0,
          revenus: 0,
        };
      });

      (clicksData || []).forEach((c: any) => {
        if (c.formation_id && aggr[c.formation_id]) aggr[c.formation_id].clics++;
      });

      (salesData || []).forEach((s: any) => {
        if (s.formation_id && aggr[s.formation_id]) {
          aggr[s.formation_id].ventes++;
          // FIX : colonne "commission" (pas "commission_amount" dans affiliate_sales)
          aggr[s.formation_id].revenus += Number(s.commission || 0);
        }
      });

      const sorted = Object.values(aggr).sort((a, b) => b.revenus - a.revenus);
      setFormationStats(sorted);
    } catch (err) {
      console.error("Erreur chargement stats affilié:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyGlobal = async () => {
    const link = `${window.location.origin}/formations?ref=${refCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedGlobal(true);
    setTimeout(() => setCopiedGlobal(false), 2000);
    toast({ title: "Lien global copié ✅" });
  };

  const handleShareFormation = async (fstat: FormationStat) => {
    const link = `${window.location.origin}/formations/${fstat.formation_id}?ref=${refCode}`;
    const msg = `🎓 *${fstat.titre}*\n\n👆 Voir la formation :\n${link}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyFormation = async (fstat: FormationStat) => {
    const link = `${window.location.origin}/formations/${fstat.formation_id}?ref=${refCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedFormation(fstat.formation_id);
    setTimeout(() => setCopiedFormation(null), 2000);
    toast({ title: "Lien copié ✅" });
  };

  // FIX #4 : stats.totalClicks / stats.totalSales (champs corrigés dans l'interface)
  const conversionRate = (stats && stats.totalClicks > 0)
    ? ((stats.totalSales / stats.totalClicks) * 100).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div>
          <button
            onClick={() => navigate("/commissions")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Retour aux commissions
          </button>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-primary" /> Mes Commissions Formations
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Statistiques de vos liens affiliés formations
          </p>
        </div>

        {/* Lien global d'affiliation */}
        {refCode && (
          <div className="bg-gradient-to-r from-red-500/10 to-emerald-500/10 border border-red-500/20 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Votre lien affilié global</p>
            <div className="flex items-center gap-2 bg-background/60 rounded-xl px-3 py-2 border border-border/40">
              <code className="text-xs text-primary flex-1 truncate">
                {window.location.origin}/formations?ref={refCode}
              </code>
              <button
                onClick={handleCopyGlobal}
                className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                {copiedGlobal
                  ? <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Copié</>
                  : <><Copy className="w-3.5 h-3.5" /> Copier</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ─── KPIs globaux ─── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-2">
              <MousePointerClick className="w-5 h-5 text-blue-500" />
            </div>
            {/* FIX #4 : stats.totalClicks */}
            <p className="text-2xl font-black text-foreground">{stats?.totalClicks ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Clics totaux</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-2">
              <ShoppingBag className="w-5 h-5 text-emerald-500" />
            </div>
            {/* FIX #4 : stats.totalSales */}
            <p className="text-2xl font-black text-foreground">{stats?.totalSales ?? 0}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ventes générées</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
              <DollarSign className="w-5 h-5 text-amber-500" />
            </div>
            {/* FIX #4 : stats.totalRevenue */}
            <p className="text-2xl font-black text-emerald-500">
              {formatMontant(stats?.totalRevenue ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Commissions gagnées</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl font-black text-foreground">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-0.5">Taux de conversion</p>
          </div>
        </div>

        {/* ─── Détail par formation ─── */}
        <div className="space-y-3">
          <h2 className="font-black text-foreground text-base flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-red-500" /> Performance par formation
          </h2>

          {formationStats.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
              <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-semibold text-sm">Aucune activité encore</p>
              <p className="text-xs mt-1">Partagez vos liens pour commencer à gagner des commissions.</p>
              <button
                onClick={() => navigate("/formations")}
                className="mt-4 text-xs font-bold text-primary hover:underline"
              >
                Voir les formations →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formationStats.map((fstat) => (
                <div key={fstat.formation_id} className="bg-card border border-border rounded-2xl overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-muted flex-shrink-0">
                      {fstat.image_url ? (
                        <img src={fstat.image_url} alt={fstat.titre}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-muted-foreground/40" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-foreground truncate">{fstat.titre}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-blue-500 font-semibold flex items-center gap-1">
                          <MousePointerClick className="w-3 h-3" /> {fstat.clics} clics
                        </span>
                        <span className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
                          <ShoppingBag className="w-3 h-3" /> {fstat.ventes} ventes
                        </span>
                        <span className="text-xs text-amber-500 font-bold">
                          {formatMontant(fstat.revenus)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border/40 px-4 py-2.5 flex gap-2">
                    <button
                      onClick={() => handleShareFormation(fstat)}
                      className="flex-1 h-8 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-green-600 hover:border-green-400 transition-colors"
                    >
                      <Share2 className="w-3.5 h-3.5" /> WhatsApp
                    </button>
                    <button
                      onClick={() => handleCopyFormation(fstat)}
                      className="flex-1 h-8 rounded-lg border border-border text-xs font-bold flex items-center justify-center gap-1.5 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                    >
                      {copiedFormation === fstat.formation_id ? (
                        <><CheckCheck className="w-3.5 h-3.5 text-emerald-500" /> Copié</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copier le lien</>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique des ventes récentes */}
        {(stats?.salesHistory ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="font-black text-foreground text-base">Ventes récentes</h2>
            <div className="space-y-2">
              {(stats!.salesHistory).slice(0, 10).map((sale, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-card border border-border rounded-xl">
                  <div>
                    <p className="text-sm font-bold text-foreground">{sale.formation_titre || "Formation"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(sale.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {/* FIX #4 : sale.commission_amount (était sale.commission) */}
                  <span className="text-sm font-black text-emerald-500">
                    +{formatMontant(sale.commission_amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
