import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  ArrowLeft, ArrowRight, Zap, Mail, ShoppingBag,
  Video, Users, CheckCircle2, Plus, X, Loader2
} from "lucide-react";

const db = /** @type {any} */ (supabase);

const goalOptions = [
  {
    id: "vente",
    icon: ShoppingBag,
    label: "Vente de produit",
    desc: "Vendre un produit digital ou physique",
    color: "#7C3AED",
    steps: ["Landing Page", "Checkout", "Page Merci"],
  },
  {
    id: "email",
    icon: Mail,
    label: "Capture d'email",
    desc: "Collecter des contacts pour votre liste",
    color: "#2563EB",
    steps: ["Page de capture", "Page de confirmation"],
  },
  {
    id: "webinaire",
    icon: Video,
    label: "Inscription webinaire",
    desc: "Enregistrer des participants à un événement",
    color: "#D97706",
    steps: ["Page inscription", "Page confirmation", "Rappel email"],
  },
  {
    id: "lead",
    icon: Users,
    label: "Génération de leads",
    desc: "Récupérer des prospects qualifiés",
    color: "#059669",
    steps: ["Landing Page", "Formulaire", "Page Merci"],
  },
];

const stepColors = {
  "Landing Page":         "bg-violet-100 text-violet-700",
  "Checkout":             "bg-amber-100 text-amber-700",
  "Page Merci":           "bg-emerald-100 text-emerald-700",
  "Page de capture":      "bg-blue-100 text-blue-700",
  "Page de confirmation": "bg-emerald-100 text-emerald-700",
  "Page inscription":     "bg-orange-100 text-orange-700",
  "Rappel email":         "bg-pink-100 text-pink-700",
  "Formulaire":           "bg-indigo-100 text-indigo-700",
};

export default function FunnelCreate() {
  const navigate = useNavigate();
  const [step, setStep]                 = useState(1);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [name, setName]                 = useState("");
  const [customSteps, setCustomSteps]   = useState([]);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState("");

  const goal = goalOptions.find(g => g.id === selectedGoal);

  const handleSelectGoal = (id) => {
    setSelectedGoal(id);
    const g = goalOptions.find(o => o.id === id);
    setCustomSteps(g.steps);
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError("");
    setSaving(true);

    const user = getNexoraUser();
    if (!user?.id) {
      setError("Utilisateur non connecté.");
      setSaving(false);
      return;
    }

    const { error: err } = await db
      .from("funnels")
      .insert({
        user_id: user.id,
        name:    name.trim(),
        goal:    selectedGoal,
        status:  "brouillon",
        steps:   customSteps,
      });

    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }

    setSaving(false);
    navigate("/funnels");
  };

  const addStep    = () => setCustomSteps(s => [...s, "Nouvelle étape"]);
  const removeStep = (i) => setCustomSteps(s => s.filter((_, idx) => idx !== i));
  const updateStep = (i, val) => setCustomSteps(s => s.map((x, idx) => idx === i ? val : x));

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button
            onClick={() => step > 1 ? setStep(s => s - 1) : navigate("/funnels")}
            className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-gray-900">Créer un tunnel</h1>
            <div className="text-xs text-gray-400 mt-0.5">Étape {step} / 3</div>
          </div>
        </div>
        <div className="max-w-lg mx-auto mt-3">
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-violet-600 rounded-full transition-all duration-500"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

        {/* Étape 1 — Objectif */}
        {step === 1 && (
          <>
            <div>
              <h2 className="font-black text-gray-900 text-lg">Quel est votre objectif ?</h2>
              <p className="text-sm text-gray-400 mt-1">Choisissez ce que vous voulez accomplir avec ce tunnel.</p>
            </div>
            <div className="space-y-3">
              {goalOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { handleSelectGoal(opt.id); setStep(2); }}
                  className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/30 text-left transition-all"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: opt.color + "20" }}>
                    <opt.icon className="w-6 h-6" style={{ color: opt.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-gray-900">{opt.label}</div>
                    <div className="text-sm text-gray-400 mt-0.5">{opt.desc}</div>
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {opt.steps.map(s => (
                        <span key={s} className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${stepColors[s] || "bg-gray-100 text-gray-500"}`}>{s}</span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* Étape 2 — Nom */}
        {step === 2 && (
          <>
            <div>
              <h2 className="font-black text-gray-900 text-lg">Nommez votre tunnel</h2>
              <p className="text-sm text-gray-400 mt-1">Un nom clair pour retrouver ce tunnel facilement.</p>
            </div>

            {goal && (
              <div className="flex items-center gap-3 bg-violet-50 border border-violet-100 rounded-xl p-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: goal.color + "30" }}>
                  <goal.icon className="w-4 h-4" style={{ color: goal.color }} />
                </div>
                <div className="text-sm font-bold text-violet-800">{goal.label}</div>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-gray-600 mb-2 block">Nom du tunnel *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Ex: Formation Dropshipping, Newsletter Hebdo..."
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-base outline-none focus:border-violet-400 transition-colors"
                autoFocus
              />
            </div>

            <button
              onClick={() => name.trim() && setStep(3)}
              disabled={!name.trim()}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-bold py-3.5 rounded-xl disabled:opacity-40 hover:bg-violet-700 transition-colors"
            >
              Continuer <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Étape 3 — Étapes */}
        {step === 3 && (
          <>
            <div>
              <h2 className="font-black text-gray-900 text-lg">Étapes du tunnel</h2>
              <p className="text-sm text-gray-400 mt-1">Vérifiez et personnalisez les pages de votre tunnel.</p>
            </div>

            <div className="space-y-2">
              {customSteps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-100 text-violet-700 text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</div>
                  <input
                    value={s}
                    onChange={e => updateStep(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:border-violet-400"
                  />
                  <button onClick={() => removeStep(i)} className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center hover:bg-red-100 transition-colors">
                    <X className="w-3.5 h-3.5 text-red-400" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 text-gray-400 text-sm font-bold py-3 rounded-xl hover:border-violet-300 hover:text-violet-400 transition-colors"
            >
              <Plus className="w-4 h-4" /> Ajouter une étape
            </button>

            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-emerald-700">
                <span className="font-bold">"{name}"</span> — {customSteps.length} page{customSteps.length !== 1 ? "s" : ""} seront créées.
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600 font-semibold">
                ❌ {error}
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 text-white font-bold py-3.5 rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-60"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours...</>
              ) : (
                <><Zap className="w-4 h-4" /> Créer le tunnel</>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
