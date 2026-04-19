import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, X, Eye, Save, Settings,
  Type, Image, MousePointer, Clock, Gift,
  AlignCenter, Maximize2, Timer, ExternalLink
} from "lucide-react";

const triggerOptions = [
  { id: "click", icon: MousePointer, label: "Au clic d'un bouton" },
  { id: "timer", icon: Timer, label: "Après X secondes" },
  { id: "exit", icon: ExternalLink, label: "Intention de quitter" },
  { id: "scroll", icon: AlignCenter, label: "Au défilement 50%" },
];

const popupElements = [
  { type: "heading", icon: Type, label: "Titre" },
  { type: "text", icon: Type, label: "Texte" },
  { type: "image", icon: Image, label: "Image" },
  { type: "button", icon: MousePointer, label: "Bouton" },
  { type: "countdown", icon: Clock, label: "Countdown" },
  { type: "offer", icon: Gift, label: "Offre spéciale" },
];

function PopupPreview({ elements, settings }) {
  return (
    <div
      className="relative rounded-2xl overflow-hidden shadow-2xl"
      style={{
        background: settings.bgColor || "#fff",
        width: "100%",
        maxWidth: "360px",
        minHeight: "200px",
      }}
    >
      {/* Close button */}
      <button className="absolute top-3 right-3 w-7 h-7 bg-black/10 rounded-full flex items-center justify-center hover:bg-black/20 transition-colors z-10">
        <X className="w-4 h-4 text-gray-600" />
      </button>

      <div className="p-5 space-y-3">
        {elements.map((el, i) => (
          <div key={i}>
            {el.type === "heading" && (
              <h3 className="font-black text-gray-900 text-lg text-center leading-tight">
                {el.content || "🎁 Offre exclusive !"}
              </h3>
            )}
            {el.type === "text" && (
              <p className="text-sm text-gray-600 text-center">
                {el.content || "Profitez de cette offre limitée dans le temps."}
              </p>
            )}
            {el.type === "image" && (
              <div className="h-24 bg-violet-100 rounded-xl flex items-center justify-center">
                <div className="text-3xl">🎁</div>
              </div>
            )}
            {el.type === "button" && (
              <button
                className="w-full font-black py-3 rounded-xl text-sm"
                style={{ background: el.bgColor || "#7C3AED", color: "#fff" }}
              >
                {el.content || "Je veux cette offre !"}
              </button>
            )}
            {el.type === "countdown" && (
              <div className="bg-gray-900 rounded-xl p-3 flex justify-center gap-3">
                {[{ v: "00", l: "H" }, { v: "14", l: "M" }, { v: "59", l: "S" }].map(t => (
                  <div key={t.l} className="text-center">
                    <div className="bg-violet-600 text-white font-black text-lg w-10 h-10 rounded-lg flex items-center justify-center">{t.v}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{t.l}</div>
                  </div>
                ))}
              </div>
            )}
            {el.type === "offer" && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                <div className="text-2xl font-black text-gray-900">50% OFF</div>
                <div className="text-xs text-amber-600 font-bold">Coupon : NEXORA50</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PopupEditor() {
  const navigate = useNavigate();
  const [trigger, setTrigger] = useState("timer");
  const [timerDelay, setTimerDelay] = useState(5);
  const [preview, setPreview] = useState(false);
  const [settings, setSettings] = useState({ bgColor: "#ffffff", overlay: true, size: "medium" });

  const [elements, setElements] = useState([
    { type: "heading", content: "🎁 Offre spéciale !" },
    { type: "text", content: "Obtenez 50% de réduction sur notre formation. Offre valable 15 minutes." },
    { type: "countdown" },
    { type: "button", content: "Je veux -50% maintenant", bgColor: "#7C3AED" },
  ]);

  const addElement = (type) => {
    const defaults = {
      heading: { content: "Nouveau titre" },
      text: { content: "Votre texte ici..." },
      button: { content: "Cliquez ici", bgColor: "#7C3AED" },
      image: {},
      countdown: {},
      offer: {},
    };
    setElements(e => [...e, { type, ...defaults[type] }]);
  };

  const removeElement = (i) => setElements(e => e.filter((_, idx) => idx !== i));

  const updateElement = (i, updates) => {
    setElements(e => e.map((el, idx) => idx === i ? { ...el, ...updates } : el));
  };

  if (preview) {
    return (
      <div className="min-h-screen bg-black/80 flex items-center justify-center p-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <div className="w-full max-w-sm">
          <PopupPreview elements={elements} settings={settings} />
          <button
            onClick={() => setPreview(false)}
            className="mt-4 w-full text-white font-bold py-3 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
          >
            ← Retour à l'éditeur
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/funnels")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Éditeur Popup</h1>
              <p className="text-xs text-gray-400">Créez votre popup</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setPreview(true)} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 font-bold px-3 py-2 rounded-xl">
              <Eye className="w-3 h-3" /> Aperçu
            </button>
            <button className="flex items-center gap-1 text-xs bg-violet-600 text-white font-bold px-3 py-2 rounded-xl">
              <Save className="w-3 h-3" /> Sauver
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-4">

        {/* Preview mini */}
        <div className="bg-gray-800 rounded-2xl p-6 flex justify-center">
          <PopupPreview elements={elements} settings={settings} />
        </div>

        {/* Déclencheur */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">⚡ Déclencheur</h2>
          <div className="grid grid-cols-2 gap-2">
            {triggerOptions.map(t => (
              <button
                key={t.id}
                onClick={() => setTrigger(t.id)}
                className={`p-3 rounded-xl border-2 text-left transition-all ${
                  trigger === t.id ? "border-violet-500 bg-violet-50" : "border-gray-100"
                }`}
              >
                <t.icon className="w-4 h-4 mb-1 text-violet-500" />
                <div className="text-xs font-bold text-gray-700 leading-tight">{t.label}</div>
              </button>
            ))}
          </div>
          {trigger === "timer" && (
            <div>
              <label className="text-xs font-bold text-gray-400 mb-1 block">Délai : {timerDelay} secondes</label>
              <input
                type="range"
                min={1}
                max={60}
                value={timerDelay}
                onChange={e => setTimerDelay(e.target.value)}
                className="w-full accent-violet-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>1s</span><span>30s</span><span>60s</span>
              </div>
            </div>
          )}
        </div>

        {/* Éléments */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">🧱 Contenu du popup</h2>

          {/* Éléments actuels */}
          <div className="space-y-2">
            {elements.map((el, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
                <div className="flex-1">
                  <div className="text-xs font-bold text-gray-700 capitalize">{el.type}</div>
                  {el.content && <div className="text-xs text-gray-400 truncate">{el.content}</div>}
                </div>
                {(el.type === "button" || el.type === "heading" || el.type === "text") && (
                  <input
                    value={el.content || ""}
                    onChange={e => updateElement(i, { content: e.target.value })}
                    className="flex-1 border border-gray-200 rounded-lg px-2 py-1 text-xs outline-none focus:border-violet-400"
                    placeholder="Texte..."
                  />
                )}
                <button onClick={() => removeElement(i)} className="w-6 h-6 bg-red-100 text-red-400 rounded-lg flex items-center justify-center flex-shrink-0 hover:bg-red-200">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>

          {/* Ajouter élément */}
          <div className="grid grid-cols-3 gap-1.5">
            {popupElements.map(el => (
              <button
                key={el.type}
                onClick={() => addElement(el.type)}
                className="flex flex-col items-center gap-1 p-2 bg-gray-50 rounded-xl hover:bg-violet-50 hover:text-violet-700 text-gray-500 transition-all text-xs font-semibold border border-transparent hover:border-violet-200"
              >
                <el.icon className="w-3.5 h-3.5" />
                {el.label}
              </button>
            ))}
          </div>
        </div>

        {/* Style */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h2 className="font-black text-gray-900 text-sm">🎨 Style</h2>
          <div>
            <label className="text-xs font-bold text-gray-400 mb-1.5 block">Couleur de fond</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.bgColor}
                onChange={e => setSettings(s => ({ ...s, bgColor: e.target.value }))}
                className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer"
              />
              {["#ffffff","#1a1a2e","#fdf4ff","#f0fdf4","#fff7ed","#111827"].map(c => (
                <button key={c} onClick={() => setSettings(s => ({ ...s, bgColor: c }))} className="w-8 h-8 rounded-lg border-2 border-white shadow-sm ring-1 ring-gray-200" style={{ background: c }} />
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-gray-800 text-sm">Overlay sombre</div>
              <div className="text-xs text-gray-400">Fond foncé derrière le popup</div>
            </div>
            <button
              onClick={() => setSettings(s => ({ ...s, overlay: !s.overlay }))}
              className={`w-12 h-6 rounded-full transition-colors relative ${settings.overlay ? "bg-violet-600" : "bg-gray-200"}`}
            >
              <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${settings.overlay ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>

        <div className="pb-6" />
      </div>
    </div>
  );
}
