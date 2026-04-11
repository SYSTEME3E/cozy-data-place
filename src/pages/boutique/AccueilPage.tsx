import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getSymboleDevise } from "@/lib/devise-utils";
import {
  ShoppingBag, Package, TrendingUp, Clock,
  CheckCircle, Truck, XCircle, BarChart2,
  Zap, Crown, Lock, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNexoraUser, PLAN_LIMITS } from "@/lib/nexora-auth";

type Periode = "jour" | "semaine" | "mois";

export default function BoutiqueAccueilPage() {
  const user = getNexoraUser();
  const [boutique, setBoutique] = useState<any>(null);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [produits, setProduits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState<Periode>("semaine");

  const load = async () => {
    setLoading(true);
    const userId = user?.id;
    if (!userId) { setLoading(false); return; }
    const { data: b } = await supabase
      .from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
    if (!b) { setLoading(false); return; }
    setBoutique(b);

    const { data: cmds } = await supabase
      .from("commandes" as any)
      .select("*")
      .eq("boutique_id", (b as any).id)
      .order("created_at", { ascending: false });
    setCommandes(cmds as any[] || []);

    const { data: prods } = await supabase
      .from("produits" as any)
      .select("*")
      .eq("boutique_id", (b as any).id);
    setProduits(prods as any[] || []);

    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtrerParPeriode = (liste: any[]) => {
    const now = new Date();
    return liste.filter(c => {
      const date = new Date(c.created_at);
      if (periode === "jour") return date.toDateString() === now.toDateString();
      if (periode === "semaine") return (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24) <= 7;
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  };

  const commandesFiltrees = filtrerParPeriode(commandes);
  const totalMontant = commandesFiltrees.reduce((sum, c) => sum + (c.total || 0), 0);

  const produitsPhysiques = produits.filter(p => p.type === 'physique' || !p.type).length;
  const produitsDigitaux = produits.filter(p => p.type === 'numerique').length;

  const planActuel = user?.plan || 'gratuit';
  const limiteProduits = PLAN_LIMITS[planActuel].produits;
  const estBloque = produits.length >= limiteProduits;

  const graphData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const cmdsJour = commandes.filter(c => new Date(c.created_at).toDateString() === date.toDateString());
      days.push({
        label: date.toLocaleDateString("fr-FR", { weekday: "short" }),
        montant: cmdsJour.reduce((sum, c) => sum + (c.total || 0), 0),
      });
    }
    return days;
  };

  const graph = graphData();
  const maxMontant = Math.max(...graph.map(d => d.montant), 1);

  if (loading) return (
    <BoutiqueLayout boutiqueName={boutique?.nom}>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </BoutiqueLayout>
  );

  if (!boutique) return (
    <BoutiqueLayout>
      <div className="text-center py-20 px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏪</div>
        <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">Boutique non configurée</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Créez votre boutique pour commencer à vendre.</p>
        <Button className="mt-6 bg-pink-500 hover:bg-pink-600 rounded-2xl h-12 px-8 font-bold shadow-lg shadow-pink-200">
          <a href="/boutique/parametres">Configurer ma boutique</a>
        </Button>
      </div>
    </BoutiqueLayout>
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-6 pb-12">

        {/* 1. HEADER & SÉLECTEUR DE PÉRIODE */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-800 dark:text-gray-100 tracking-tight">Tableau de bord</h1>
            <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Analyse de votre activité</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
            {(["jour", "semaine", "mois"] as Periode[]).map(p => (
              <button key={p} onClick={() => setPeriode(p)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all capitalize ${
                  periode === p
                    ? "bg-white dark:bg-gray-700 text-pink-600 dark:text-pink-400 shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 2. BANNIÈRE ABONNEMENT */}
        <div className={`p-5 rounded-[2rem] flex items-center justify-between relative overflow-hidden transition-all ${
          planActuel === 'roi' ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-white border-none shadow-xl shadow-yellow-100' :
          planActuel === 'boss' ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-none shadow-xl shadow-blue-100' :
          'bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm'
        }`}>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`p-3 rounded-2xl ${planActuel === 'gratuit' ? 'bg-gray-100 dark:bg-gray-700' : 'bg-white/20'}`}>
              {planActuel === 'roi'
                ? <Crown className="w-6 h-6" />
                : <Zap className={`w-6 h-6 ${planActuel === 'gratuit' ? 'text-gray-400 dark:text-gray-300' : ''}`} />}
            </div>
            <div>
              <p className={`text-[10px] opacity-70 font-black uppercase tracking-widest ${planActuel === 'gratuit' ? 'text-gray-500 dark:text-gray-400' : ''}`}>Plan Actuel</p>
              <h2 className={`text-lg font-black capitalize tracking-tight ${planActuel === 'gratuit' ? 'text-gray-800 dark:text-gray-100' : ''}`}>{planActuel}</h2>
            </div>
          </div>
          <div className="text-right relative z-10">
            <p className={`text-[10px] font-bold ${planActuel === 'gratuit' ? 'text-gray-500 dark:text-gray-400' : ''}`}>
              Produits : {produits.length} / {limiteProduits === Infinity ? '∞' : limiteProduits}
            </p>
            <Button size="sm" className="h-7 text-[9px] mt-2 bg-white text-black hover:bg-gray-100 font-bold rounded-full border-none shadow-sm">
              AMÉLIORER
            </Button>
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-10">
            {planActuel === 'roi' ? <Crown className="w-24 h-24" /> : <ShieldCheck className="w-24 h-24" />}
          </div>
        </div>

        {/* 3. ALERTE DE LIMITE */}
        {estBloque && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 animate-pulse">
            <Lock className="w-5 h-5 text-red-500" />
            <div className="flex-1">
              <p className="text-xs font-black text-red-700 dark:text-red-400 uppercase">Limite de produits atteinte !</p>
              <p className="text-[10px] text-red-600 dark:text-red-400">Passez au plan **BOSS** pour débloquer plus d'espace.</p>
            </div>
          </div>
        )}

        {/* 4. PHYSIQUE VS DIGITAL */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-5">
              <Package className="w-16 h-16" />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter">Boutique Physique</p>
            <p className="text-3xl font-black text-gray-800 dark:text-gray-100">{produitsPhysiques}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1">Articles réels</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-5 text-pink-600">
              <Zap className="w-16 h-16" />
            </div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter">Boutique Digitale</p>
            <p className="text-3xl font-black text-pink-600 dark:text-pink-400">{produitsDigitaux}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1">Services & PDF</p>
          </div>
        </div>

        {/* 5. STATS REVENUS & COMMANDES */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-pink-100 dark:bg-pink-950/50 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-pink-600 dark:text-pink-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase">Ventes</p>
            </div>
            <p className="text-3xl font-black text-gray-800 dark:text-gray-100">{commandesFiltrees.length}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-950/50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase">Revenus</p>
            </div>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100 leading-none">
              {Math.round(totalMontant).toLocaleString()}
            </p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-1 uppercase">{getSymboleDevise(boutique.devise) || "FCFA"}</p>
          </div>
        </div>

        {/* 6. GRAPHIQUE */}
        <div className="bg-white dark:bg-gray-800 rounded-[2rem] p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <BarChart2 className="w-5 h-5 text-pink-500" />
            <p className="font-black text-gray-800 dark:text-gray-100 text-xs uppercase tracking-widest">Performance (7 jours)</p>
          </div>
          <div className="flex items-end gap-3 h-32">
            {graph.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full rounded-t-xl bg-pink-50 dark:bg-pink-950/30 relative group cursor-pointer"
                  style={{ height: `${Math.max((d.montant / maxMontant) * 100, 8)}%` }}>
                  <div className="absolute inset-0 bg-pink-500 opacity-70 group-hover:opacity-100 transition-all rounded-t-xl" />
                </div>
                <span className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </BoutiqueLayout>
  );
}
