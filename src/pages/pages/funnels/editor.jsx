import { useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  X, Eye, Settings, ChevronDown, ChevronUp,
  Type, Image, MousePointer, AlignLeft, Video,
  Columns, FileText, CheckSquare, Clock, Code,
  ShoppingBag, Link2, Minus, Save, Smartphone,
  Monitor, Tablet, Trash2, GripVertical, Plus,
  Bold, Italic, AlignCenter, AlignLeft as AlignL,
  Palette, MoveUp, MoveDown
} from "lucide-react";

// ── Éléments disponibles ─────────────────────────────────
const ELEMENT_GROUPS = [
  {
    label: "Contenu",
    items: [
      { type: "heading", icon: Type, label: "Titre" },
      { type: "text", icon: AlignLeft, label: "Texte" },
      { type: "image", icon: Image, label: "Image" },
      { type: "button", icon: MousePointer, label: "Bouton" },
      { type: "video", icon: Video, label: "Vidéo" },
      { type: "divider", icon: Minus, label: "Séparateur" },
    ],
  },
  {
    label: "Mise en page",
    items: [
      { type: "columns2", icon: Columns, label: "2 Colonnes" },
      { type: "section", icon: Columns, label: "Section" },
    ],
  },
  {
    label: "Formulaire",
    items: [
      { type: "form", icon: FileText, label: "Formulaire" },
      { type: "checkbox", icon: CheckSquare, label: "Case à cocher" },
    ],
  },
  {
    label: "Paiement",
    items: [
      { type: "product", icon: ShoppingBag, label: "Produit" },
      { type: "paybutton", icon: Link2, label: "Btn Paiement" },
    ],
  },
  {
    label: "Autre",
    items: [
      { type: "countdown", icon: Clock, label: "Countdown" },
      { type: "html", icon: Code, label: "Code HTML" },
    ],
  },
];

// ── Rendu des éléments sur le canvas ──────────────────────
function RenderElement({ el, selected, onClick, onDelete, onMoveUp, onMoveDown }) {
  return (
    <div
      onClick={() => onClick(el.id)}
      className={`relative group cursor-pointer rounded-xl transition-all ${
        selected ? "ring-2 ring-violet-500 ring-offset-1" : "hover:ring-2 hover:ring-violet-200"
      }`}
    >
      {/* Controls */}
      <div className={`absolute -top-3 right-2 flex gap-1 z-10 ${selected ? "flex" : "hidden group-hover:flex"}`}>
        <button onClick={(e) => { e.stopPropagation(); onMoveUp(); }} className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50">
          <MoveUp className="w-3 h-3 text-gray-500" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onMoveDown(); }} className="w-6 h-6 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm hover:bg-gray-50">
          <MoveDown className="w-3 h-3 text-gray-500" />
        </button>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="w-6 h-6 bg-red-500 rounded-lg flex items-center justify-center shadow-sm hover:bg-red-600">
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="p-2">
        {el.type === "heading" && (
          <h2 style={{ fontSize: el.style?.fontSize || "24px", color: el.style?.color || "#111827", textAlign: el.style?.align || "left", fontWeight: "800" }}>
            {el.content || "Votre titre ici"}
          </h2>
        )}
        {el.type === "text" && (
          <p style={{ fontSize: el.style?.fontSize || "15px", color: el.style?.color || "#4B5563", textAlign: el.style?.align || "left", lineHeight: "1.6" }}>
            {el.content || "Votre texte ici. Double-cliquez pour modifier."}
          </p>
        )}
        {el.type === "button" && (
          <div style={{ textAlign: el.style?.align || "center" }}>
            <button style={{ background: el.style?.bgColor || "#7C3AED", color: el.style?.color || "#fff", borderRadius: "12px", padding: "12px 24px", fontWeight: "700", fontSize: "15px" }}>
              {el.content || "Cliquez ici"}
            </button>
          </div>
        )}
        {el.type === "image" && (
          <div className="bg-gray-100 rounded-xl flex items-center justify-center h-32 border-2 border-dashed border-gray-200">
            <div className="text-center">
              <Image className="w-8 h-8 text-gray-300 mx-auto mb-1" />
              <div className="text-xs text-gray-400 font-semibold">Cliquez pour ajouter une image</div>
            </div>
          </div>
        )}
        {el.type === "video" && (
          <div className="bg-gray-900 rounded-xl flex items-center justify-center h-32">
            <div className="text-center">
              <Video className="w-8 h-8 text-gray-500 mx-auto mb-1" />
              <div className="text-xs text-gray-400">{el.content || "URL YouTube / Vimeo"}</div>
            </div>
          </div>
        )}
        {el.type === "divider" && (
          <div style={{ borderTop: `${el.style?.thickness || 1}px ${el.style?.style || "solid"} ${el.style?.color || "#E5E7EB"}`, margin: "8px 0" }} />
        )}
        {el.type === "form" && (
          <div className="space-y-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
            <input placeholder="Votre nom" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" readOnly />
            <input placeholder="Votre email" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" readOnly />
            <button className="w-full bg-violet-600 text-white font-bold py-2.5 rounded-lg text-sm">
              {el.content || "S'inscrire gratuitement"}
            </button>
          </div>
        )}
        {el.type === "checkbox" && (
          <div className="flex items-start gap-2">
            <div className="w-4 h-4 border-2 border-gray-300 rounded mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{el.content || "J'accepte les conditions générales"}</span>
          </div>
        )}
        {el.type === "countdown" && (
          <div className="bg-gray-900 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-2 font-semibold">⏰ OFFRE LIMITÉE</div>
            <div className="flex justify-center gap-3">
              {[{ v: "02", l: "Jours" }, { v: "14", l: "Heures" }, { v: "37", l: "Min" }, { v: "59", l: "Sec" }].map(t => (
                <div key={t.l} className="text-center">
                  <div className="bg-violet-600 text-white font-black text-xl w-12 h-12 rounded-xl flex items-center justify-center">{t.v}</div>
                  <div className="text-xs text-gray-400 mt-1">{t.l}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {el.type === "product" && (
          <div className="border-2 border-gray-200 rounded-xl p-4 text-center bg-white">
            <div className="text-sm text-gray-500 mb-1">Formation complète</div>
            <div className="text-3xl font-black text-gray-900 mb-1">5 000 <span className="text-lg">FCFA</span></div>
            <div className="text-xs text-gray-400 line-through mb-3">10 000 FCFA</div>
            <button className="w-full bg-amber-500 text-white font-black py-3 rounded-xl">
              Payer avec MTN MoMo
            </button>
          </div>
        )}
        {el.type === "paybutton" && (
          <div style={{ textAlign: "center" }}>
            <button className="bg-yellow-400 text-gray-900 font-black py-3 px-6 rounded-xl flex items-center gap-2 mx-auto">
              <span>📱</span> {el.content || "Payer maintenant"}
            </button>
          </div>
        )}
        {el.type === "html" && (
          <div className="bg-gray-900 rounded-xl p-3 font-mono text-xs text-green-400">
            {el.content || "<div>Votre code HTML ici</div>"}
          </div>
        )}
        {el.type === "columns2" && (
          <div className="grid grid-cols-2 gap-2">
            <div className="border-2 border-dashed border-gray-200 rounded-xl h-16 flex items-center justify-center text-xs text-gray-300 font-semibold">Colonne 1</div>
            <div className="border-2 border-dashed border-gray-200 rounded-xl h-16 flex items-center justify-center text-xs text-gray-300 font-semibold">Colonne 2</div>
          </div>
        )}
        {el.type === "section" && (
          <div className="border-2 border-dashed border-violet-200 rounded-xl p-4 bg-violet-50/30">
            <div className="text-xs text-violet-400 font-bold text-center">Section — glissez des éléments ici</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Panneau propriétés ────────────────────────────────────
function PropertiesPanel({ element, onChange }) {
  if (!element) return (
    <div className="flex flex-col items-center justify-center h-64 text-center px-4">
      <MousePointer className="w-8 h-8 text-gray-200 mb-3" />
      <div className="text-sm text-gray-400 font-semibold">Sélectionnez un élément</div>
      <div className="text-xs text-gray-300 mt-1">pour modifier ses propriétés</div>
    </div>
  );

  const update = (key, val) => onChange({ ...element, [key]: val });
  const updateStyle = (key, val) => onChange({ ...element, style: { ...element.style, [key]: val } });

  return (
    <div className="space-y-4 p-3">
      <div className="font-bold text-gray-800 text-sm capitalize flex items-center gap-2">
        <div className="w-2 h-2 bg-violet-500 rounded-full" />
        {element.type}
      </div>

      {/* Contenu texte */}
      {["heading", "text", "button", "form", "paybutton", "checkbox", "video", "html"].includes(element.type) && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Contenu</label>
          {["text", "html"].includes(element.type) ? (
            <textarea
              rows={4}
              value={element.content || ""}
              onChange={e => update("content", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400 resize-none"
            />
          ) : (
            <input
              value={element.content || ""}
              onChange={e => update("content", e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          )}
        </div>
      )}

      {/* Couleur texte */}
      {["heading", "text", "button"].includes(element.type) && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Couleur texte</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={element.style?.color || "#111827"}
              onChange={e => updateStyle("color", e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
            />
            <input
              value={element.style?.color || "#111827"}
              onChange={e => updateStyle("color", e.target.value)}
              className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-mono outline-none focus:border-violet-400"
            />
          </div>
        </div>
      )}

      {/* Taille police */}
      {["heading", "text", "button"].includes(element.type) && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Taille police</label>
          <select
            value={element.style?.fontSize || "16px"}
            onChange={e => updateStyle("fontSize", e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-400"
          >
            {["12px","14px","16px","18px","20px","24px","28px","32px","40px","48px"].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Alignement */}
      {["heading", "text", "button"].includes(element.type) && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Alignement</label>
          <div className="flex gap-1">
            {["left","center","right"].map(a => (
              <button
                key={a}
                onClick={() => updateStyle("align", a)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-colors ${
                  (element.style?.align || "left") === a
                    ? "bg-violet-100 text-violet-700"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {a}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Couleur bouton */}
      {["button", "paybutton"].includes(element.type) && (
        <div>
          <label className="text-xs font-semibold text-gray-400 mb-1 block">Couleur fond bouton</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={element.style?.bgColor || "#7C3AED"}
              onChange={e => updateStyle("bgColor", e.target.value)}
              className="w-8 h-8 rounded-lg border border-gray-200 cursor-pointer"
            />
            <div className="flex gap-1 flex-wrap">
              {["#7C3AED","#059669","#D97706","#DC2626","#2563EB","#111827"].map(c => (
                <button key={c} onClick={() => updateStyle("bgColor", c)} className="w-6 h-6 rounded-lg border-2 border-white shadow-sm" style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Éditeur principal ─────────────────────────────────────
export default function FunnelEditor() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [panel, setPanel] = useState("elements"); // elements | properties | settings
  const [viewport, setViewport] = useState("mobile");
  const [selectedId, setSelectedId] = useState(null);
  const [canvas, setCanvas] = useState([
    { id: "1", type: "heading", content: "Votre titre accrocheur ici", style: { fontSize: "28px", align: "center" } },
    { id: "2", type: "text", content: "Décrivez votre offre irrésistible en quelques mots simples et directs.", style: { align: "center", color: "#6B7280" } },
    { id: "3", type: "button", content: "Je veux en savoir plus →", style: { bgColor: "#7C3AED", align: "center" } },
  ]);

  const selectedEl = canvas.find(e => e.id === selectedId);

  const addElement = (type) => {
    const defaults = {
      heading: { content: "Nouveau titre", style: { fontSize: "24px", align: "left" } },
      text: { content: "Nouveau paragraphe de texte...", style: {} },
      button: { content: "Cliquez ici", style: { bgColor: "#7C3AED", align: "center" } },
      image: { content: "", style: {} },
      video: { content: "", style: {} },
      form: { content: "S'inscrire gratuitement", style: {} },
      product: { content: "", style: {} },
      countdown: { content: "", style: {} },
      html: { content: "<p>Votre HTML</p>", style: {} },
      divider: { content: "", style: { color: "#E5E7EB", thickness: 1 } },
      checkbox: { content: "J'accepte les conditions", style: {} },
      paybutton: { content: "Payer maintenant", style: {} },
      columns2: { content: "", style: {} },
      section: { content: "", style: {} },
    };
    const def = defaults[type] || { content: "", style: {} };
    const newEl = { id: Date.now().toString(), type, ...def };
    setCanvas(c => [...c, newEl]);
    setSelectedId(newEl.id);
    setPanel("properties");
  };

  const updateElement = (updated) => {
    setCanvas(c => c.map(e => e.id === updated.id ? updated : e));
  };

  const deleteElement = (id) => {
    setCanvas(c => c.filter(e => e.id !== id));
    setSelectedId(null);
  };

  const moveUp = (id) => {
    setCanvas(c => {
      const idx = c.findIndex(e => e.id === id);
      if (idx === 0) return c;
      const n = [...c];
      [n[idx - 1], n[idx]] = [n[idx], n[idx - 1]];
      return n;
    });
  };

  const moveDown = (id) => {
    setCanvas(c => {
      const idx = c.findIndex(e => e.id === id);
      if (idx === c.length - 1) return c;
      const n = [...c];
      [n[idx], n[idx + 1]] = [n[idx + 1], n[idx]];
      return n;
    });
  };

  const viewportWidths = { mobile: "max-w-sm", tablet: "max-w-md", desktop: "max-w-2xl" };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Top bar */}
      <div className="h-13 bg-white border-b border-gray-200 flex items-center justify-between px-3 py-2 flex-shrink-0 sticky top-0 z-30">
        <button
          onClick={() => navigate("/funnels")}
          className="flex items-center gap-1.5 text-sm text-gray-600 font-semibold hover:text-gray-900"
        >
          <X className="w-4 h-4" /> Fermer
        </button>

        {/* Viewport */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {[{ id: "mobile", icon: Smartphone }, { id: "tablet", icon: Tablet }, { id: "desktop", icon: Monitor }].map(v => (
            <button
              key={v.id}
              onClick={() => setViewport(v.id)}
              className={`w-8 h-7 rounded-lg flex items-center justify-center transition-colors ${viewport === v.id ? "bg-white shadow-sm text-violet-600" : "text-gray-400"}`}
            >
              <v.icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => navigate(`/funnels/preview/${id}`)}
            className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 font-bold px-3 py-1.5 rounded-xl hover:bg-gray-200 transition-colors"
          >
            <Eye className="w-3 h-3" /> Aperçu
          </button>
          <button className="flex items-center gap-1 text-xs bg-violet-600 text-white font-bold px-3 py-1.5 rounded-xl hover:bg-violet-700 transition-colors">
            <Save className="w-3 h-3" /> Publier
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* Left Sidebar */}
        <div className="w-56 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 overflow-y-auto">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            {[
              { id: "elements", label: "Éléments" },
              { id: "properties", label: "Style" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setPanel(t.id)}
                className={`flex-1 py-3 text-xs font-bold transition-colors ${panel === t.id ? "text-violet-600 border-b-2 border-violet-600" : "text-gray-400"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {panel === "elements" && (
            <div className="p-2 space-y-3">
              {ELEMENT_GROUPS.map(group => (
                <div key={group.label}>
                  <div className="text-xs font-black text-gray-400 uppercase tracking-wider px-2 mb-1.5">{group.label}</div>
                  <div className="grid grid-cols-2 gap-1">
                    {group.items.map(el => (
                      <button
                        key={el.type}
                        onClick={() => addElement(el.type)}
                        className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gray-50 hover:bg-violet-50 hover:text-violet-700 text-gray-500 transition-all border border-transparent hover:border-violet-200 text-center"
                      >
                        <el.icon className="w-4 h-4" />
                        <span className="text-xs font-semibold leading-tight">{el.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {panel === "properties" && (
            <PropertiesPanel
              element={selectedEl}
              onChange={updateElement}
            />
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6" onClick={() => setSelectedId(null)}>
          <div className={`mx-auto transition-all duration-300 ${viewportWidths[viewport]}`}>
            <div
              className="bg-white rounded-2xl shadow-lg overflow-hidden min-h-screen"
              onClick={e => e.stopPropagation()}
            >
              {/* Browser chrome */}
              <div className="bg-gray-800 px-3 py-2 flex items-center gap-2 flex-shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 bg-red-400 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full" />
                  <div className="w-2.5 h-2.5 bg-green-400 rounded-full" />
                </div>
                <div className="flex-1 bg-gray-700 rounded-lg px-3 py-1 text-xs text-gray-400 font-mono text-center">
                  votre-page.nexora.app
                </div>
              </div>

              {/* Page content */}
              <div className="p-4 space-y-3">
                {canvas.map((el) => (
                  <RenderElement
                    key={el.id}
                    el={el}
                    selected={selectedId === el.id}
                    onClick={(id) => { setSelectedId(id); setPanel("properties"); }}
                    onDelete={() => deleteElement(el.id)}
                    onMoveUp={() => moveUp(el.id)}
                    onMoveDown={() => moveDown(el.id)}
                  />
                ))}

                {/* Zone d'ajout */}
                <button
                  onClick={() => setPanel("elements")}
                  className="w-full py-5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-300 font-semibold hover:border-violet-300 hover:text-violet-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Ajouter un élément
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
