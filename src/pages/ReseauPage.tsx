/**
 * NEXORA — Réseau MLM
 * Arbre de parrainage, lien d'affiliation, stats par niveau
 */

import { useEffect, useState } from "react";
import {
  Users, Link2, Copy, CheckCheck, Share2, ChevronRight,
  TrendingUp, Loader2, UserPlus, Network
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import { formatMontant } from "@/lib/mlm-utils";
import { useDevise } from "@/lib/devise-context";

interface Filleul {
  id: string;
  nom_prenom: string;
  username: string;
  plan: string;
  created_at: string;
  avatar_url: string | null;
}

interface LevelStats {
  count: number;
  members: Filleul[];
}

export default function ReseauPage() {
  const user = getNexoraUser();
  const { toast } = useToast();
  const { fmtXOF } = useDevise();
  const [loading, setLoading] = useState(true);
  const [refCode, setRefCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [levels, setLevels] = useState<Record<1 | 2 | 3, LevelStats>>({
    1: { count: 0, members: [] },
    2: { count: 0, members: [] },
    3: { count: 0, members: [] },
  });
  const [totalGainsReseau, setTotalGainsReseau] = useState(0);
  const [expandedLevel, setExpandedLevel] = useState<number | null>(1);

  useEffect(() => { if (user) loadNetwork(); }, []);

  const loadNetwork = async () => {
    setLoading(true);

    // Récupérer ref_code
    const { data: userData } = await (supabase as any)
      .from("nexora_users").select("ref_code, solde_commissions").eq("id", user!.id).maybeSingle();
    if (userData?.ref_code) setRefCode(userData.ref_code);

    // Niveau 1 : utilisateurs qui ont cet user comme parrain direct
    const { data: l1 } = await (supabase as any)
      .from("nexora_users")
      .select("id, nom_prenom, username, plan, created_at, avatar_url")
      .eq("referrer_id", user!.id)
      .order("created_at", { ascending: false });

    const l1Members: Filleul[] = l1 || [];
    const l1Ids = l1Members.map((m: Filleul) => m.id);

    // Niveau 2 : filleuls des filleuls niveau 1
    let l2Members: Filleul[] = [];
    if (l1Ids.length > 0) {
      const { data: l2 } = await (supabase as any)
        .from("nexora_users")
        .select("id, nom_prenom, username, plan, created_at, avatar_url")
        .in("referrer_id", l1Ids)
        .order("created_at", { ascending: false });
      l2Members = l2 || [];
    }

    const l2Ids = l2Members.map((m: Filleul) => m.id);

    // Niveau 3 : filleuls des filleuls niveau 2
    let l3Members: Filleul[] = [];
    if (l2Ids.length > 0) {
      const { data: l3 } = await (supabase as any)
        .from("nexora_users")
        .select("id, nom_prenom, username, plan, created_at, avatar_url")
        .in("referrer_id", l2Ids)
        .order("created_at", { ascending: false });
      l3Members = l3 || [];
    }

    setLevels({
      1: { count: l1Members.length, members: l1Members },
      2: { count: l2Members.length, members: l2Members },
      3: { count: l3Members.length, members: l3Members },
    });

    // Total gains réseau
    const { data: commData } = await (supabase as any)
      .from("mlm_commissions")
      .select("amount")
      .eq("to_user_id", user!.id);
    const total = (commData || []).reduce((s: number, c: any) => s + (c.amount || 0), 0);
    setTotalGainsReseau(total);

    setLoading(false);
  };

  const refLink = `${window.location.origin}/register?ref=${refCode}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Lien copié ✅" });
  };

  const handleShareWhatsApp = () => {
    const msg = `🚀 Rejoins *NEXORA* — La plateforme qui te fait gagner de l'argent !\n\n✅ Formations premium\n✅ Commissions MLM jusqu'à 30%\n✅ Réseau illimité\n\n👆 Inscris-toi ici :\n${refLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const totalFilleuls = levels[1].count + levels[2].count + levels[3].count;

  const levelConfig = [
    { level: 1 as const, label: "Niveau 1", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", rate: "30%" },
    { level: 2 as const, label: "Niveau 2", color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", rate: "10%" },
    { level: 3 as const, label: "Niveau 3", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30", rate: "5%" },
  ];

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
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Network className="w-6 h-6 text-primary" /> Mon Réseau MLM
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Parrainez des membres et gagnez des commissions sur 3 niveaux</p>
        </div>

        {/* Stats globales */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-foreground">{totalFilleuls}</p>
            <p className="text-xs text-muted-foreground mt-1">Membres au total</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-emerald-400">{levels[1].count}</p>
            <p className="text-xs text-muted-foreground mt-1">Niveau 1 (30%)</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-blue-400">{levels[2].count}</p>
            <p className="text-xs text-muted-foreground mt-1">Niveau 2 (10%)</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-3xl font-black text-purple-400">{levels[3].count}</p>
            <p className="text-xs text-muted-foreground mt-1">Niveau 3 (5%)</p>
          </div>
        </div>

        {/* Gains réseau */}
        <div className="bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/20 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Gains total du réseau</p>
            <p className="text-3xl font-black text-foreground mt-1">{fmtXOF(totalGainsReseau)}</p>
          </div>
          <TrendingUp className="w-10 h-10 text-primary/40" />
        </div>

        {/* Lien de parrainage */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-primary" />
            <p className="font-black text-foreground">Votre lien de parrainage</p>
          </div>

          <div className="flex gap-2">
            <div className="flex-1 bg-muted/50 rounded-xl px-3 py-2.5 font-mono text-xs text-muted-foreground truncate border border-border">
              {refLink}
            </div>
            <button onClick={handleCopy}
              className="px-3 h-10 rounded-xl bg-primary/10 text-primary font-bold text-sm flex items-center gap-1.5 hover:bg-primary/20 transition-colors">
              {copied ? <><CheckCheck className="w-4 h-4" /> Copié</> : <><Copy className="w-4 h-4" /> Copier</>}
            </button>
          </div>

          <div className="flex gap-2">
            <button onClick={handleShareWhatsApp}
              className="flex-1 h-10 rounded-xl bg-green-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-600 transition-colors">
              <Share2 className="w-4 h-4" /> Partager sur WhatsApp
            </button>
            <button onClick={handleCopy}
              className="flex-1 h-10 rounded-xl border border-border font-bold text-sm flex items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors">
              {copied ? <><CheckCheck className="w-4 h-4 text-emerald-500" /> Copié</> : <><UserPlus className="w-4 h-4" /> Copier lien</>}
            </button>
          </div>
        </div>

        {/* Niveaux détaillés */}
        <div className="space-y-3">
          {levelConfig.map(({ level, label, color, bg, border, rate }) => (
            <div key={level} className={`bg-card rounded-2xl border ${border} overflow-hidden`}>
              <button
                onClick={() => setExpandedLevel(expandedLevel === level ? null : level)}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                    <Users className={`w-5 h-5 ${color}`} />
                  </div>
                  <div className="text-left">
                    <p className="font-black text-foreground text-sm">{label}</p>
                    <p className="text-xs text-muted-foreground">{levels[level].count} membre{levels[level].count > 1 ? "s" : ""} · Commission {rate}</p>
                  </div>
                </div>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expandedLevel === level ? "rotate-90" : ""}`} />
              </button>

              {expandedLevel === level && levels[level].members.length > 0 && (
                <div className="border-t border-border divide-y divide-border/50">
                  {levels[level].members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="w-9 h-9 rounded-full bg-muted overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {m.avatar_url
                          ? <img src={m.avatar_url} alt={m.nom_prenom} className="w-full h-full object-cover" />
                          : <span className="text-sm font-black text-muted-foreground">{m.nom_prenom[0]?.toUpperCase()}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{m.nom_prenom}</p>
                        <p className="text-xs text-muted-foreground">@{m.username}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${m.plan !== "free" ? "bg-amber-400/15 text-amber-400" : "bg-muted text-muted-foreground"}`}>
                        {m.plan === "free" ? "Gratuit" : m.plan.charAt(0).toUpperCase() + m.plan.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {expandedLevel === level && levels[level].members.length === 0 && (
                <div className="border-t border-border px-4 py-6 text-center text-muted-foreground text-sm">
                  Aucun membre à ce niveau encore
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
          <p className="font-black text-foreground text-sm">Taux de commission abonnement</p>
          <div className="space-y-2">
            {[
              { label: "Niveau 1 (filleuls directs)", rate: "30%", amount: 2100 },
              { label: "Niveau 2", rate: "10%", amount: 700 },
              { label: "Niveau 3", rate: "5%", amount: 350 },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <p className="text-sm text-muted-foreground">{r.label}</p>
                <div className="text-right">
                  <span className="font-black text-foreground text-sm">{r.rate}</span>
                  <p className="text-[10px] text-muted-foreground">ex. {fmtXOF(r.amount)} / 7 000 FCFA</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
