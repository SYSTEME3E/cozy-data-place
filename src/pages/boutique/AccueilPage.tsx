import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getSymboleDevise } from "@/lib/devise-utils";
import {
  ShoppingBag, Package, TrendingUp, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNexoraUser } from "@/lib/nexora-auth";

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

  const produitsPhysiques = produits.filter(p => p.type === 'physique' || !p.type);
  const produitsDigitaux = produits.filter(p => p.type === 'numerique');

  // Revenus par type de produit : on joint les commandes aux items pour séparer physique/digital
  const revenusPhysique = commandesFiltrees.reduce((sum, c) => {
    const items: any[] = Array.isArray(c.items) ? c.items : [];
    const montant = items
      .filter((it: any) => it.type !== 'numerique')
      .reduce((s: number, it: any) => s + (it.montant || 0), 0);
    return sum + montant;
  }, 0);

  const revenusDigital = commandesFiltrees.reduce((sum, c) => {
    const items: any[] = Array.isArray(c.items) ? c.items : [];
    const montant = items
      .filter((it: any) => it.type === 'numerique')
      .reduce((s: number, it: any) => s + (it.montant || 0), 0);
    return sum + montant;
  }, 0);

  const totalMontant = revenusPhysique + revenusDigital;
  const devise = getSymboleDevise(boutique?.devise) || "FCFA";

  if (loading) return (
    <BoutiqueLayout boutiqueName={boutique?.nom}>
      <div className="flex items-center justify-center h-64">
        <div className="w-10 h-10 border-4 border-[#305CDE] border-t-transparent rounded-full animate-spin" />
      </div>
    </BoutiqueLayout>
  );

  if (!boutique) return (
    <BoutiqueLayout>
      <div className="text-center py-20 px-6">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">🏪</div>
        <h2 className="text-xl font-black text-gray-800 dark:text-gray-100">Boutique non configurée</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Créez votre boutique pour commencer à vendre.</p>
        <Button className="mt-6 bg-[#305CDE] hover:bg-[#305CDE] rounded-2xl h-12 px-8 font-bold shadow-lg shadow-blue-200">
          <a href="/boutique/parametres">Configurer ma boutique</a>
        </Button>
      </div>
    </BoutiqueLayout>
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="space-y-3 pb-12">

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
                    ? "bg-white dark:bg-gray-700 text-[#305CDE] dark:text-[#305CDE] shadow-sm"
                    : "text-gray-500 dark:text-gray-400"
                }`}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* 2. PHYSIQUE VS DIGITAL — compteurs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-5">
              <Package className="w-12 h-12" />
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter">Boutique Physique</p>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100">{produitsPhysiques.length}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">Articles réels</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm relative overflow-hidden">
            <div className="absolute -right-2 -bottom-2 opacity-5 text-[#305CDE]">
              <Zap className="w-12 h-12" />
            </div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase tracking-tighter">Boutique Digitale</p>
            <p className="text-2xl font-black text-[#305CDE] dark:text-[#305CDE]">{produitsDigitaux.length}</p>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-bold mt-0.5">Services & PDF</p>
          </div>
        </div>

        {/* 3. STATS VENTES */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          </div>
          <div>
            <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase">Ventes</p>
            <p className="text-2xl font-black text-gray-800 dark:text-gray-100 leading-none">{commandesFiltrees.length}</p>
          </div>
        </div>

        {/* 4. REVENUS SÉPARÉS + TOTAL GLOBAL */}
        <div className="space-y-3">

          {/* Revenus physique */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Package className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase">Revenus Physique</p>
                <p className="text-lg font-black text-gray-800 dark:text-gray-100 leading-none mt-0.5">
                  {Math.round(revenusPhysique).toLocaleString()}
                  <span className="text-[9px] text-gray-400 dark:text-gray-500 font-bold ml-1">{devise}</span>
                </p>
              </div>
          </div>

          {/* Revenus digital */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-gray-500 dark:text-gray-300" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-black uppercase">Revenus Digital</p>
                <p className="text-lg font-black text-[#305CDE] dark:text-[#305CDE] leading-none mt-0.5">
                  {Math.round(revenusDigital).toLocaleString()}
                  <span className="text-[9px] text-[#305CDE] dark:text-[#305CDE] font-bold ml-1">{devise}</span>
                </p>
              </div>
          </div>

          {/* Total global */}
          <div className="bg-[#305CDE] rounded-2xl p-3 shadow-sm flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-[9px] text-white font-black uppercase">Total Global</p>
                <p className="text-xl font-black text-white leading-none mt-0.5">
                  {Math.round(totalMontant).toLocaleString()}
                  <span className="text-[9px] text-white font-bold ml-1">{devise}</span>
                </p>
              </div>
          </div>

        </div>

      </div>
    </BoutiqueLayout>
  );
}
