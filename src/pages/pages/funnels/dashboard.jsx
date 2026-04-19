import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  Plus, Zap, Eye, Edit3, Trash2, BarChart2,
  ArrowRight, MoreVertical, Copy, TrendingUp,
  DollarSign, Loader2
} from "lucide-react";

const db = /** @type {any} */ (supabase);

const goalLabels = {
  vente:     { label: "Vente",         color: "bg-violet-100 text-violet-700"   },
  email:     { label: "Capture email", color: "bg-blue-100 text-blue-700"       },
  webinaire: { label: "Webinaire",     color: "bg-amber-100 text-amber-700"     },
  lead:      { label: "Lead",          color: "bg-emerald-100 text-emerald-700" },
};

function TunnelCard({ tunnel, onEdit, onDelete, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const goal  = goalLabels[tunnel.goal] || goalLabels.vente;
  const steps = Array.isArray(tunnel.steps) ? tunnel.steps : [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-black text-gray-900 text-base truncate">{tunnel.name}</span>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${goal.color}`}>{goal.label}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              tunnel.status === "actif" ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"
            }`}>
              {tunnel.status === "actif" ? "● Actif" : "○ Brouillon"}
            </span>
            <span className="text-xs text-gray-400">
              {new Date(tunnel.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1">
              {[
                { icon: Edit3,     label: "Modifier",  action: onEdit,      color: "text-gray-700" },
                { icon: Copy,      label: "Dupliquer", action: onDuplicate, color: "text-gray-700" },
                { icon: BarChart2, label: "Analytics", action: () => {},    color: "text-gray-700" },
                { icon: Trash2,    label: "Supprimer", action: onDelete,    color: "text-red-500"  },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={() => { item.action(); setMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors ${item.color}`}
                >
                  <item.icon className="w-3.5 h-3.5" /> {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="px-4 pb-3 flex items-center gap-1 flex-wrap">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="text-xs bg-gray-100 text-gray-600 font-semibold px-2.5 py-1 rounded-lg">{s}</div>
            {i < steps.length - 1 && <ArrowRight className="w-3 h-3 text-gray-300 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 flex gap-2 border-t border-gray-50">
        <button
          onClick={onEdit}
          className="flex-1 flex items-center justify-center gap-1.5 bg-violet-600 text-white text-sm font-bold py-2 rounded-xl hover:bg-violet-700 transition-colors"
        >
          <Edit3 className="w-3.5 h-3.5" /> Éditer
        </button>
        <button className="flex-1 flex items-center justify-center gap-1.5 border border-gray-200 text-gray-600 text-sm font-bold py-2 rounded-xl hover:bg-gray-50 transition-colors">
          <Eye className="w-3.5 h-3.5" /> Aperçu
        </button>
      </div>
    </div>
  );
}

export default function FunnelDashboard() {
  const navigate = useNavigate();
  const [tunnels, setTunnels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState("tous");

  const fetchTunnels = async () => {
    setLoading(true);
    const user = getNexoraUser();
    if (!user?.id) { setLoading(false); return; }

    const { data, error } = await db
      .from("funnels")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) setTunnels(data);
    setLoading(false);
  };

  useEffect(() => { fetchTunnels(); }, []);

  const deleteTunnel = async (id) => {
    await db.from("funnels").delete().eq("id", id);
    setTunnels(t => t.filter(x => x.id !== id));
  };

  const duplicateTunnel = async (id) => {
    const original = tunnels.find(t => t.id === id);
    if (!original) return;
    const user = getNexoraUser();
    const { data } = await db
      .from("funnels")
      .insert({
        user_id: user.id,
        name:    original.name + " (copie)",
        goal:    original.goal,
        status:  "brouillon",
        steps:   original.steps,
      })
      .select()
      .single();
    if (data) setTunnels(t => [data, ...t]);
  };

  const filtered = filter === "tous"
    ? tunnels
    : tunnels.filter(t => t.status === filter || t.goal === filter);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div>
            <h1 className="font-black text-xl text-gray-900 flex items-center gap-2">
              <Zap className="w-5 h-5 text-violet-600" /> Mes Tunnels
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">{tunnels.length} tunnel{tunnels.length !== 1 ? "s" : ""} créé{tunnels.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={() => navigate("/funnels/create")}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-violet-700 transition-colors"
          >
            <Plus className="w-4 h-4" /> Créer
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Eye,        label: "Tunnels",    value: tunnels.length,                                       color: "#7C3AED" },
            { icon: TrendingUp, label: "Actifs",     value: tunnels.filter(t => t.status === "actif").length,     color: "#059669" },
            { icon: DollarSign, label: "Brouillons", value: tunnels.filter(t => t.status === "brouillon").length, color: "#D97706" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <div className="w-8 h-8 rounded-xl mx-auto mb-2 flex items-center justify-center" style={{ background: s.color + "20" }}>
                <s.icon className="w-4 h-4" style={{ color: s.color }} />
              </div>
              <div className="font-black text-gray-900 text-sm">{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {["tous", "actif", "brouillon", "vente", "email"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-colors capitalize ${
                filter === f ? "bg-violet-600 text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
          </div>
        )}

        {/* Liste tunnels */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(tunnel => (
              <TunnelCard
                key={tunnel.id}
                tunnel={tunnel}
                onEdit={()      => navigate(`/funnels/editor/${tunnel.id}`)}
                onDelete={()    => deleteTunnel(tunnel.id)}
                onDuplicate={() => duplicateTunnel(tunnel.id)}
              />
            ))}
          </div>
        )}

        {/* État vide */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <div className="font-bold text-gray-400">Aucun tunnel trouvé</div>
            <button
              onClick={() => navigate("/funnels/create")}
              className="mt-4 text-violet-600 font-bold text-sm"
            >
              Créer votre premier tunnel →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
