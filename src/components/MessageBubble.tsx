import { useState, useRef, useCallback } from "react";
import { Check, CheckCheck, Eye, Pencil, Trash2, X, Send } from "lucide-react";
import type { GroupeMessage, GroupeMembre } from "@/hooks/useGroupe";

interface Props {
  message: GroupeMessage;
  monProfil: GroupeMembre;
  isAdmin: boolean;
  onSupprimer: (id: string) => void;
  onModifier: (id: string, contenu: string) => void;
  onVueUnique: (id: string) => void;
}

function Avatar({ src, nom }: { src?: string | null; nom: string }) {
  const colors = ["#305CDE","#8B5CF6","#EC4899","#10B981","#F59E0B","#EF4444"];
  const color = colors[nom.charCodeAt(0) % colors.length];
  if (src) return <img src={src} alt={nom} className="w-7 h-7 rounded-full object-cover flex-shrink-0" />;
  return (
    <div style={{ background: color }} className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-black">{nom.charAt(0).toUpperCase()}</span>
    </div>
  );
}

function FileIcon({ type }: { type: string }) {
  const ext = type.split("/").pop()?.toUpperCase() || "FILE";
  return (
    <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2.5 min-w-[160px]">
      <div className="w-9 h-9 rounded-lg bg-[#305CDE] flex items-center justify-center flex-shrink-0">
        <span className="text-white text-[9px] font-black">{ext}</span>
      </div>
      <span className="text-white text-xs font-medium truncate flex-1">Fichier</span>
    </div>
  );
}

export default function MessageBubble({ message: msg, monProfil, isAdmin, onSupprimer, onModifier, onVueUnique }: Props) {
  const estMoi = msg.user_id === monProfil.user_id;
  const peutGerer = estMoi || isAdmin;

  const [menu, setMenu] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editText, setEditText] = useState(msg.contenu || "");
  const [vueUniqueOuvert, setVueUniqueOuvert] = useState(false);

  const longPressTimer = useRef<ReturnType<typeof setTimeout>>();

  // ── Long press ──────────────────────────────────────────────────────────────
  const handleTouchStart = useCallback(() => {
    if (!peutGerer) return;
    longPressTimer.current = setTimeout(() => setMenu(true), 500);
  }, [peutGerer]);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(longPressTimer.current);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (!peutGerer) return;
    e.preventDefault();
    setMenu(true);
  }, [peutGerer]);

  // ── Modifier ────────────────────────────────────────────────────────────────
  const saveEdit = useCallback(() => {
    if (editText.trim()) onModifier(msg.id, editText.trim());
    setEditMode(false);
    setMenu(false);
  }, [editText, msg.id, onModifier]);

  // ── Vue unique ───────────────────────────────────────────────────────────────
  const handleVueUnique = useCallback(() => {
    if (!msg.vue_unique_lu) {
      setVueUniqueOuvert(true);
      onVueUnique(msg.id);
      setTimeout(() => setVueUniqueOuvert(false), 5000);
    }
  }, [msg.vue_unique_lu, msg.id, onVueUnique]);

  if (msg.supprime) {
    return (
      <div className={`flex ${estMoi ? "justify-end" : "justify-start"} px-3 py-0.5`}>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 border border-white/10 max-w-xs`}>
          <Trash2 className="w-3 h-3 text-gray-500" />
          <span className="text-xs text-gray-500 italic">Message supprimé</span>
        </div>
      </div>
    );
  }

  const heure = new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  const renderContenu = () => {
    if (msg.type === "texte" || msg.type === "sticker") {
      return (
        <p className="text-[15px] text-white leading-relaxed break-words whitespace-pre-wrap">
          {msg.contenu}
        </p>
      );
    }
    if (msg.type === "image") {
      return (
        <img src={msg.media_url!} alt="image"
          className="max-w-[220px] max-h-64 rounded-2xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => window.open(msg.media_url!, "_blank")}
        />
      );
    }
    if (msg.type === "video") {
      return (
        <video src={msg.media_url!} controls
          className="max-w-[220px] max-h-48 rounded-2xl" />
      );
    }
    if (msg.type === "audio") {
      return (
        <div className="bg-white/10 rounded-2xl px-3 py-2.5 min-w-[180px]">
          <audio src={msg.media_url!} controls className="w-full" style={{ height: 36 }} />
          {msg.media_duree && (
            <p className="text-gray-400 text-[10px] mt-1 text-right">{msg.media_duree}s</p>
          )}
        </div>
      );
    }
    if (msg.type === "fichier") {
      return (
        <a href={msg.media_url!} target="_blank" rel="noreferrer" className="block no-underline">
          <div className="flex items-center gap-3 bg-white/10 rounded-2xl px-3 py-2.5 min-w-[180px] hover:bg-white/15 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-[#305CDE] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-black">
                {msg.media_nom?.split(".").pop()?.toUpperCase() || "FILE"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{msg.media_nom || "Fichier"}</p>
              {msg.media_taille && (
                <p className="text-gray-400 text-[10px]">
                  {msg.media_taille > 1024 * 1024
                    ? `${(msg.media_taille / 1024 / 1024).toFixed(1)} Mo`
                    : `${(msg.media_taille / 1024).toFixed(0)} Ko`}
                </p>
              )}
            </div>
          </div>
        </a>
      );
    }
    return null;
  };

  return (
    <>
      {/* Overlay menu */}
      {menu && (
        <div className="fixed inset-0 z-40 flex items-end justify-center" onClick={() => setMenu(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 w-full max-w-sm mx-3 mb-6 bg-[#1f2c34] rounded-3xl overflow-hidden shadow-2xl border border-white/10">
            {estMoi && (
              <button
                onClick={() => { setEditMode(true); setMenu(false); }}
                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left border-b border-white/5"
              >
                <Pencil className="w-4.5 h-4.5 text-[#305CDE]" />
                <span className="text-white font-medium">Modifier le message</span>
              </button>
            )}
            <button
              onClick={() => { onSupprimer(msg.id); setMenu(false); }}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-red-500/10 transition-colors text-left"
            >
              <Trash2 className="w-4.5 h-4.5 text-red-400" />
              <span className="text-red-400 font-medium">Supprimer le message</span>
            </button>
            <button
              onClick={() => setMenu(false)}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-colors text-left border-t border-white/5"
            >
              <X className="w-4.5 h-4.5 text-gray-400" />
              <span className="text-gray-400 font-medium">Annuler</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal vue unique */}
      {vueUniqueOuvert && msg.type === "image" && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setVueUniqueOuvert(false)}>
          <img src={msg.media_url!} alt="" className="max-w-full max-h-full object-contain" />
          <div className="absolute top-4 right-4 text-white text-xs bg-black/60 px-3 py-1.5 rounded-full font-bold">
            Vue unique • disparaît dans 5s
          </div>
        </div>
      )}

      {/* Bulle message */}
      <div
        className={`flex items-end gap-2 px-3 py-0.5 ${estMoi ? "flex-row-reverse" : "flex-row"}`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onContextMenu={handleContextMenu}
      >
        {/* Avatar (autres) */}
        {!estMoi && <Avatar src={msg.avatar_url} nom={msg.nom_prenom} />}

        <div className={`flex flex-col max-w-[75%] ${estMoi ? "items-end" : "items-start"}`}>
          {/* Nom expéditeur (autres) */}
          {!estMoi && (
            <span className="text-[#305CDE] text-xs font-bold px-3 mb-1">
              {msg.nom_prenom}
            </span>
          )}

          {/* Bulle */}
          <div
            className={`relative rounded-2xl px-3 py-2 shadow-sm ${
              estMoi
                ? "bg-[#005c4b] rounded-br-sm"
                : "bg-[#1f2c34] rounded-bl-sm"
            } ${msg.vue_unique && !msg.vue_unique_lu ? "cursor-pointer" : ""}`}
            onClick={msg.vue_unique && !msg.vue_unique_lu && !estMoi ? handleVueUnique : undefined}
          >
            {/* Vue unique non lu */}
            {msg.vue_unique && !msg.vue_unique_lu && !estMoi ? (
              <div className="flex items-center gap-2 px-2 py-1">
                <Eye className="w-5 h-5 text-[#25d366]" />
                <span className="text-[#25d366] text-sm font-semibold">Vue unique • Appuyer pour voir</span>
              </div>
            ) : editMode ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  className="bg-transparent text-white text-sm resize-none outline-none w-full"
                  rows={3}
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setEditMode(false)} className="p-1.5 rounded-lg bg-white/10 text-gray-300 hover:bg-white/20">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={saveEdit} className="p-1.5 rounded-lg bg-[#25d366] text-white hover:bg-[#25d366]/90">
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              renderContenu()
            )}

            {/* Footer heure + statut */}
            {!editMode && (
              <div className={`flex items-center gap-1 mt-1 ${estMoi ? "justify-end" : "justify-end"}`}>
                {msg.modifie && <span className="text-[10px] text-gray-400 italic">modifié</span>}
                {msg.vue_unique && (
                  <Eye className="w-3 h-3 text-[#25d366]" />
                )}
                <span className="text-[10px] text-gray-400">{heure}</span>
                {estMoi && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
