import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { getSymboleDevise } from "@/lib/devise-utils";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, TrendingDown, DollarSign, ShoppingCart,
  Users, Package, BarChart3, RefreshCw,
  ArrowUpRight, ArrowDownRight, Zap, Star, Activity,
  Calendar, ChevronDown, XCircle
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";

type Periode = "7j" | "30j" | "12m";

interface SummaryStats {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  validOrders: number;
  cancelledRefunded: number;
  totalCustomers: number;
  totalProductsSold: number;
  avgOrderValue: number;
  prevPeriodRevenue: number;
  prevPeriodOrders: number;
}

interface ChartPoint { label: string; revenue: number; orders: number; }
interface TopProduct { name: string; sold: number; revenue: number; photo?: string | null; }

function isOrderValid(o: any): boolean {
  if (o.statut === "annulee" && o.statut_paiement === "rembourse") return false;
  return true;
}

const PERIOD_LABELS: Record<Periode, string> = {
  "7j": "7 derniers jours",
  "30j": "30 derniers jours",
  "12m": "12 derniers mois",
};

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

function fmt(n: number, symbol = "FCFA") {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M ${symbol}`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ${symbol}`;
  return `${Math.round(n).toLocaleString("fr-FR")} ${symbol}`;
}

function pct(current: number, prev: number) {
  if (prev === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - prev) / prev) * 100);
}

function startOf(period: Periode): Date {
  const d = new Date();
  if (period === "7j") { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
  if (period === "30j") { d.setDate(d.getDate() - 29); d.setHours(0, 0, 0, 0); return d; }
  d.setMonth(d.getMonth() - 11); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

function prevStart(period: Periode): Date {
  const d = new Date();
  if (period === "7j") { d.setDate(d.getDate() - 13); d.setHours(0, 0, 0, 0); return d; }
  if (period === "30j") { d.setDate(d.getDate() - 59); d.setHours(0, 0, 0, 0); return d; }
  d.setMonth(d.getMonth() - 23); d.setDate(1); d.setHours(0, 0, 0, 0);
  return d;
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded-xl ${className}`} />;
}

function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-3">
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

function HeroCard({ title, value, sub, icon: Icon, color, growth, loading }: {
  title: string; value: string; sub?: string;
  icon: any; color: string; growth?: number; loading?: boolean;
}) {
  if (loading) return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-3">
      <Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-40" /><Skeleton className="h-3 w-24" />
    </div>
  );
  const up = (growth ?? 0) >= 0;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        {growth !== undefined && (
          <div className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full
            ${up ? "bg-green-50 dark:bg-green-950/30 text-green-600" : "bg-red-50 dark:bg-red-950/30 text-red-500"}`}>
            {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(growth)}%
          </div>
        )}
      </div>
      <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">{title}</p>
      <p className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white leading-none">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">{sub}</p>}
    </div>
  );
}

function MiniCard({ title, value, sub, icon: Icon, color, loading }: {
  title: string; value: string; sub?: string;
  icon: any; color: string; loading?: boolean;
}) {
  if (loading) return <CardSkeleton />;
  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide leading-tight">{title}</p>
      </div>
      <p className="text-xl font-black text-gray-900 dark:text-white">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function CustomTooltip({ active, payload, label, symbol }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-xl px-4 py-3 shadow-2xl border border-gray-700 text-sm">
      <p className="font-bold text-gray-300 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.dataKey === "revenue" ? fmt(p.value, symbol) : `${p.value} commande${p.value > 1 ? "s" : ""}`}
        </p>
      ))}
    </div>
  );
}

export default function PerformancePage() {
  const user = getNexoraUser();
  const navigate = useNavigate();

  const [boutique, setBoutique] = useState<any>(null);
  const [periode, setPeriode] = useState<Periode>("30j");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [activeChart, setActiveChart] = useState<"revenue" | "orders">("revenue");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);

  useEffect(() => {
    const loadBoutique = async () => {
      const userId = user?.id;
      if (!userId) return;
      const { data } = await supabase
        .from("boutiques" as any).select("*").eq("user_id", userId).limit(1).maybeSingle();
      if (data) setBoutique(data);
    };
    loadBoutique();
  }, []);

  const loadStats = useCallback(async (boutiqueId: string, p: Periode) => {
    const { data: allOrders } = await supabase
      .from("commandes" as any)
      .select("id, total, client_email, client_nom, created_at, statut, statut_paiement, items")
      .eq("boutique_id", boutiqueId)
      .order("created_at", { ascending: true });

    const orders: any[] = allOrders || [];
    const now = new Date();
    const todayStr = now.toDateString();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const periodStart = startOf(p);
    const prevPeriodStart = prevStart(p);

    const validOrders = orders.filter(isOrderValid);

    const totalRevenue = validOrders.reduce((s, o) => s + (o.total || 0), 0);
    const todayRevenue = validOrders.filter(o => new Date(o.created_at).toDateString() === todayStr).reduce((s, o) => s + (o.total || 0), 0);
    const monthlyRevenue = validOrders.filter(o => { const d = new Date(o.created_at); return d.getMonth() === currentMonth && d.getFullYear() === currentYear; }).reduce((s, o) => s + (o.total || 0), 0);

    const periodValid = validOrders.filter(o => new Date(o.created_at) >= periodStart);
    const prevPeriodValid = validOrders.filter(o => { const d = new Date(o.created_at); return d >= prevPeriodStart && d < periodStart; });
    const cancelledRefunded = orders.filter(o => !isOrderValid(o) && new Date(o.created_at) >= periodStart).length;
    const periodRevenue = periodValid.reduce((s, o) => s + (o.total || 0), 0);
    const prevRevenue = prevPeriodValid.reduce((s, o) => s + (o.total || 0), 0);
    const uniqueCustomers = new Set(validOrders.map(o => o.client_email || o.client_nom)).size;

    let totalProductsSold = 0;
    const productMap: Record<string, { name: string; sold: number; revenue: number; photo?: string | null }> = {};
    for (const order of periodValid) {
      const items = Array.isArray(order.items) ? order.items : [];
      for (const item of items) {
        totalProductsSold += item.quantite || 1;
        const key = item.nom_produit || "Produit";
        if (!productMap[key]) productMap[key] = { name: key, sold: 0, revenue: 0, photo: item.photo_url };
        productMap[key].sold += item.quantite || 1;
        productMap[key].revenue += item.montant || 0;
      }
    }
    setTopProducts(Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

    setStats({
      totalRevenue, todayRevenue, monthlyRevenue,
      totalOrders: orders.length, validOrders: periodValid.length, cancelledRefunded,
      totalCustomers: uniqueCustomers, totalProductsSold,
      avgOrderValue: periodValid.length > 0 ? Math.round(periodRevenue / periodValid.length) : 0,
      prevPeriodRevenue: prevRevenue, prevPeriodOrders: prevPeriodValid.length,
    });

    const points: ChartPoint[] = [];
    if (p === "12m") {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        const m = d.getMonth(); const y = d.getFullYear();
        const mo = validOrders.filter(o => { const od = new Date(o.created_at); return od.getMonth() === m && od.getFullYear() === y; });
        points.push({ label: d.toLocaleDateString("fr-FR", { month: "short" }), revenue: mo.reduce((s, o) => s + (o.total || 0), 0), orders: mo.length });
      }
    } else {
      const days = p === "7j" ? 6 : 29;
      for (let i = days; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const ds = d.toDateString();
        const dayOrders = validOrders.filter(o => new Date(o.created_at).toDateString() === ds);
        points.push({ label: d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }), revenue: dayOrders.reduce((s, o) => s + (o.total || 0), 0), orders: dayOrders.length });
      }
    }
    setChartData(points);
  }, [boutique]);

  useEffect(() => {
    if (!boutique?.id) return;
    setLoading(true);
    loadStats(boutique.id, periode).finally(() => setLoading(false));
  }, [boutique, periode]);

  useEffect(() => {
    if (!boutique?.id) return;
    const interval = setInterval(() => {
      setRefreshing(true);
      loadStats(boutique.id, periode).finally(() => setRefreshing(false));
    }, 60_000);
    return () => clearInterval(interval);
  }, [boutique, periode]);

  const handleRefresh = async () => {
    if (!boutique?.id || refreshing) return;
    setRefreshing(true);
    await loadStats(boutique.id, periode);
    setRefreshing(false);
  };

  const symbol = getSymboleDevise(boutique?.devise) || "FCFA";
  const periodRevenue = stats ? (stats.validOrders > 0 ? chartData.reduce((s, d) => s + d.revenue, 0) : 0) : 0;
  const growthRev = stats ? pct(periodRevenue, stats.prevPeriodRevenue) : 0;
  const growthOrd = stats ? pct(stats.validOrders, stats.prevPeriodOrders) : 0;

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 space-y-6">

        {/* ══ HEADER ══ */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black text-gray-900 dark:text-white">Performance</h1>
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-full">LIVE</span>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">Hors commandes annulées + remboursées</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowPeriodMenu(v => !v)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-700 dark:text-gray-300 hover:border-indigo-400 transition-colors shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="hidden sm:inline">{PERIOD_LABELS[periode]}</span>
                <span className="sm:hidden">{periode}</span>
                <ChevronDown className="w-3 h-3 flex-shrink-0" />
              </button>
              {showPeriodMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden">
                  {(Object.keys(PERIOD_LABELS) as Periode[]).map(p => (
                    <button key={p} onClick={() => { setPeriode(p); setShowPeriodMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm font-medium transition-colors
                        ${p === periode ? "bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600" : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}>
                      {PERIOD_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button onClick={handleRefresh} disabled={refreshing}
              className="p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 hover:text-indigo-600 hover:border-indigo-400 transition-colors shadow-sm">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* ══ SECTION 1 — KPI PÉRIODE (2 grandes cartes) ══ */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Période · {PERIOD_LABELS[periode]}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <HeroCard loading={loading} title="CA de la période"
              value={loading ? "—" : fmt(periodRevenue, symbol)}
              sub={`vs préc. : ${stats ? fmt(stats.prevPeriodRevenue, symbol) : "—"}`}
              icon={DollarSign} color="bg-gradient-to-br from-indigo-500 to-indigo-600" growth={growthRev} />
            <HeroCard loading={loading} title="Commandes valides"
              value={stats ? String(stats.validOrders) : "—"}
              sub={`Total boutique : ${stats?.totalOrders ?? "—"}`}
              icon={ShoppingCart} color="bg-gradient-to-br from-orange-500 to-orange-600" growth={growthOrd} />
          </div>
        </div>

        {/* ══ SECTION 2 — GRAPHIQUE PRINCIPAL ══ */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 sm:p-5 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-gray-900 dark:text-white text-sm">
                {activeChart === "revenue" ? "Évolution des revenus" : "Évolution des commandes"}
              </h3>
              <p className="text-xs text-gray-400">{PERIOD_LABELS[periode]}</p>
            </div>
            <div className="flex gap-0.5 p-0.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              {(["revenue", "orders"] as const).map(key => (
                <button key={key} onClick={() => setActiveChart(key)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    activeChart === key ? "bg-white dark:bg-gray-700 text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"}`}>
                  {key === "revenue" ? "Revenus" : "Cdes"}
                </button>
              ))}
            </div>
          </div>
          {loading ? <Skeleton className="h-44 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradOrd" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={periode === "30j" ? 4 : 0} />
                <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)} width={36} />
                <Tooltip content={<CustomTooltip symbol={symbol} />} />
                {activeChart === "revenue"
                  ? <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRev)" dot={false} activeDot={{ r: 4 }} />
                  : <Area type="monotone" dataKey="orders" stroke="#f97316" strokeWidth={2.5} fill="url(#gradOrd)" dot={false} activeDot={{ r: 4 }} />}
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ══ SECTION 3 — VUE GLOBALE (4 mini cartes 2×2) ══ */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Vue globale · Toute la boutique
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MiniCard loading={loading} title="CA total" value={stats ? fmt(stats.totalRevenue, symbol) : "—"} sub="Depuis la création" icon={TrendingUp} color="bg-gradient-to-br from-emerald-500 to-emerald-600" />
            <MiniCard loading={loading} title="Clients uniques" value={stats ? String(stats.totalCustomers) : "—"} sub="Tous acheteurs" icon={Users} color="bg-gradient-to-br from-purple-500 to-purple-600" />
            <MiniCard loading={loading} title="Aujourd'hui" value={stats ? fmt(stats.todayRevenue, symbol) : "—"} sub="Revenus du jour" icon={Zap} color="bg-gradient-to-br from-yellow-400 to-yellow-500" />
            <MiniCard loading={loading} title="Ce mois" value={stats ? fmt(stats.monthlyRevenue, symbol) : "—"} sub="Revenus du mois" icon={Activity} color="bg-gradient-to-br from-cyan-500 to-cyan-600" />
          </div>
        </div>

        {/* ══ SECTION 4 — PANIER MOYEN + ANNULÉES (2 mini cartes) ══ */}
        <div className="grid grid-cols-2 gap-3">
          <MiniCard loading={loading} title="Panier moyen" value={stats ? fmt(stats.avgOrderValue, symbol) : "—"} sub="Par commande valide" icon={Star} color="bg-gradient-to-br from-pink-500 to-pink-600" />
          <MiniCard loading={loading} title="Annulées + Remb." value={stats ? String(stats.cancelledRefunded) : "—"} sub="Exclues de la période" icon={XCircle} color="bg-gradient-to-br from-red-400 to-red-500" />
        </div>

        {/* ══ SECTION 5 — TOP PRODUITS ══ */}
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">
            Top Produits · {PERIOD_LABELS[periode]}
          </p>

          {/* Pie + Bar côte à côte sur sm+, empilés sur mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-gray-900 dark:text-white text-sm mb-0.5">Répartition</h3>
              <p className="text-xs text-gray-400 mb-3">Par revenus générés</p>
              {loading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</div>
              ) : topProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-36 text-gray-400 text-xs text-center">
                  <Package className="w-7 h-7 mb-2 opacity-30" />Aucune vente
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={topProducts} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={32} outerRadius={50} paddingAngle={3}>
                        {topProducts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [fmt(v, symbol), "Revenus"]}
                        contentStyle={{ background: "#1f2937", border: "none", borderRadius: "10px", color: "#fff", fontSize: "11px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{p.name}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-900 dark:text-white flex-shrink-0">{p.sold} vte</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <h3 className="font-black text-gray-900 dark:text-white text-sm mb-0.5">Commandes / période</h3>
              <p className="text-xs text-gray-400 mb-3">Nombre de commandes valides</p>
              {loading ? <Skeleton className="h-40 w-full" /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.4} vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} interval={periode === "30j" ? 4 : 0} />
                    <YAxis tick={{ fontSize: 9, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} width={20} />
                    <Tooltip content={<CustomTooltip symbol={symbol} />} />
                    <Bar dataKey="orders" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Classement produits — pleine largeur */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
            <h3 className="font-black text-gray-900 dark:text-white text-sm mb-0.5">Classement produits</h3>
            <p className="text-xs text-gray-400 mb-4">Par revenus générés sur la période</p>
            {loading ? (
              <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
            ) : topProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-400 text-sm text-center">
                <Package className="w-8 h-8 mb-2 opacity-30" />Aucune vente sur cette période
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((p, i) => {
                  const maxRev = topProducts[0]?.revenue || 1;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0
                        ${i === 0 ? "bg-yellow-100 dark:bg-yellow-950/30 text-yellow-600"
                          : i === 1 ? "bg-gray-100 dark:bg-gray-800 text-gray-500"
                          : i === 2 ? "bg-orange-100 dark:bg-orange-950/30 text-orange-600"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-400"}`}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{p.name}</span>
                          <span className="text-xs font-bold text-indigo-600 ml-2 flex-shrink-0">{fmt(p.revenue, symbol)}</span>
                        </div>
                        <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(p.revenue / maxRev) * 100}%`, background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 flex-shrink-0 w-14 text-right">{p.sold} vendu{p.sold > 1 ? "s" : ""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ══ SECTION 6 — BANDEAU CROISSANCE ══ */}
        {stats && !loading && (
          <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3
            ${growthRev >= 0 ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900" : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"}`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${growthRev >= 0 ? "bg-emerald-500" : "bg-red-500"}`}>
                {growthRev >= 0 ? <TrendingUp className="w-4 h-4 text-white" /> : <TrendingDown className="w-4 h-4 text-white" />}
              </div>
              <div>
                <p className={`font-black text-sm ${growthRev >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                  {growthRev >= 0 ? `+${growthRev}%` : `${growthRev}%`} vs période précédente
                </p>
                <p className={`text-xs ${growthRev >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                  Actuelle : {fmt(periodRevenue, symbol)} · Préc. : {fmt(stats.prevPeriodRevenue, symbol)}
                </p>
              </div>
            </div>
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full flex-shrink-0
              ${growthOrd >= 0 ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"}`}>
              Commandes : {growthOrd >= 0 ? "+" : ""}{growthOrd}%
            </div>
          </div>
        )}

        <p className="text-xs text-center text-gray-400 dark:text-gray-600 pb-2">
          Toutes les commandes comptabilisées · Seules celles <strong>annulées + remboursées</strong> sont exclues · Actualisation auto toutes les 60 s
        </p>

      </div>
    </BoutiqueLayout>
  );
}
