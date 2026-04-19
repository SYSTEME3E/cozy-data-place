import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Eye, Users, TrendingUp, DollarSign,
  MousePointer, Clock, Globe, Smartphone, Monitor,
  Calendar, Download, RefreshCw
} from "lucide-react";

const statCards = [
  { icon: Eye, label: "Visites", value: "1 240", change: "+18%", color: "#7C3AED", positive: true },
  { icon: Users, label: "Leads", value: "234", change: "+12%", color: "#2563EB", positive: true },
  { icon: MousePointer, label: "Taux conv.", value: "7.2%", change: "+2.1%", color: "#059669", positive: true },
  { icon: DollarSign, label: "Revenus", value: "435K FCFA", change: "+34%", color: "#D97706", positive: true },
];

const weekData = [
  { day: "Lun", visits: 120, conversions: 8 },
  { day: "Mar", visits: 180, conversions: 14 },
  { day: "Mer", visits: 95, conversions: 5 },
  { day: "Jeu", visits: 220, conversions: 20 },
  { day: "Ven", visits: 310, conversions: 28 },
  { day: "Sam", visits: 190, conversions: 16 },
  { day: "Dim", visits: 125, conversions: 9 },
];

const topSources = [
  { name: "WhatsApp", visits: 480, pct: 39 },
  { name: "Facebook", visits: 320, pct: 26 },
  { name: "Direct", visits: 240, pct: 19 },
  { name: "Google", visits: 120, pct: 10 },
  { name: "Instagram", visits: 80, pct: 6 },
];

const deviceData = [
  { label: "Mobile", pct: 72, icon: Smartphone, color: "#7C3AED" },
  { label: "Desktop", pct: 22, icon: Monitor, color: "#2563EB" },
  { label: "Tablette", pct: 6, icon: Monitor, color: "#D97706" },
];

const recentLeads = [
  { name: "Kofi Mensah", email: "kofi@gmail.com", source: "WhatsApp", time: "Il y a 5 min", country: "🇧🇯" },
  { name: "Fatou Diallo", email: "fatou@outlook.com", source: "Facebook", time: "Il y a 23 min", country: "🇸🇳" },
  { name: "Ibrahim Traoré", email: "ibrahim@gmail.com", source: "Google", time: "Il y a 1h", country: "🇨🇮" },
  { name: "Aminata Bah", email: "amina@gmail.com", source: "Instagram", time: "Il y a 2h", country: "🇬🇳" },
];

const maxVisits = Math.max(...weekData.map(d => d.visits));

export default function FunnelAnalytics() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [period, setPeriod] = useState("7j");
  const [view, setView] = useState("visites");

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/funnels")}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Analytics</h1>
              <p className="text-xs text-gray-400">Formation Dropshipping</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
            <button className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <Download className="w-4 h-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1.5 max-w-lg mx-auto mt-3">
          {["7j", "30j", "90j", "Tout"].map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                period === p ? "bg-violet-600 text-white" : "bg-gray-100 text-gray-500"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {statCards.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: s.color + "15" }}>
                  <s.icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  s.positive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"
                }`}>
                  {s.change}
                </span>
              </div>
              <div className="text-xl font-black text-gray-900">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Graphique barres */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-sm">Tendance</h3>
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {["visites", "conversions"].map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${
                    view === v ? "bg-white text-violet-600 shadow-sm" : "text-gray-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-end gap-2 h-28">
            {weekData.map((d, i) => {
              const val = view === "visites" ? d.visits : d.conversions;
              const max = view === "visites" ? maxVisits : 28;
              const pct = Math.round((val / max) * 100);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className="text-xs text-gray-400 font-bold">{val}</div>
                  <div className="w-full flex items-end" style={{ height: "72px" }}>
                    <div
                      className="w-full rounded-t-lg transition-all"
                      style={{
                        height: `${pct}%`,
                        background: view === "visites" ? "#7C3AED" : "#059669",
                        opacity: 0.8,
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 font-semibold">{d.day}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sources de trafic */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Globe className="w-4 h-4 text-violet-600" /> Sources de trafic
          </h3>
          <div className="space-y-3">
            {topSources.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold text-gray-700">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{s.visits}</span>
                    <span className="text-xs font-bold text-violet-600 w-8 text-right">{s.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Appareils */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <h3 className="font-black text-gray-900 text-sm mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-violet-600" /> Appareils utilisés
          </h3>
          <div className="space-y-3">
            {deviceData.map(d => (
              <div key={d.label} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: d.color + "15" }}>
                  <d.icon className="w-4 h-4" style={{ color: d.color }} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-700">{d.label}</span>
                    <span className="text-sm font-bold" style={{ color: d.color }}>{d.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${d.pct}%`, background: d.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl p-2.5">
            <p className="text-xs text-amber-700 font-semibold">
              📱 72% de vos visiteurs sont sur mobile — optimisez votre page pour mobile en priorité.
            </p>
          </div>
        </div>

        {/* Derniers leads */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-gray-900 text-sm">Derniers leads</h3>
            <button className="text-xs text-violet-600 font-bold">Tout voir</button>
          </div>
          <div className="space-y-3">
            {recentLeads.map((l, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center font-black text-violet-700 text-sm flex-shrink-0">
                  {l.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-800 text-sm truncate">{l.name}</span>
                    <span className="text-base">{l.country}</span>
                  </div>
                  <div className="text-xs text-gray-400 truncate">{l.email}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xs font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-lg">{l.source}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{l.time}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
            <Download className="w-3.5 h-3.5" /> Exporter les leads (.csv)
          </button>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
