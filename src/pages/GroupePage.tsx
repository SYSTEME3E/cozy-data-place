import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft, Paperclip, Smile, Mic, Send,
  Video, Phone, Image, FileText, Film,
  Lock, Eye, Users, X, CheckCircle2
} from "lucide-react";
import { useGroupe } from "@/hooks/useGroupe";
import MessageBubble from "@/components/MessageBubble";
import EmojiPicker from "@/components/EmojiPicker";
import GroupeInfoPanel from "@/components/GroupeInfoPanel";
import GroupeAppel from "@/components/GroupeAppel";
import { getNexoraUser } from "@/lib/nexora-auth";

export default function GroupePage() {
  const navigate = useNavigate();
  const user = getNexoraUser();
  const {
    config, messages, membres, monProfil, loading,
    isAdmin, estMembre, nbConnectes, uploadProgress,
    rejoindre, quitter,
    envoyerMessage, modifierMessage, supprimerMessage,
    uploadMedia, marquerVueUnique,
    expulserMembre, nommerAdmin, retirerAdmin,
    ouvrirFermerGroupe, couperMicro,
  } = useGroupe();

  const [texte, setTexte]             = useState("");
  const [showEmoji, setShowEmoji]     = useState(false);
  const [showAttach, setShowAttach]   = useState(false);
  const [showInfo, setShowInfo]       = useState(false);
  const [vueUnique, setVueUnique]     = useState(false);
  const [appel, setAppel]             = useState<{ type: "video" | "audio" } | null>(null);
  const [enregistrement, setEnregistrement] = useState(false);
  const [mediaRecorder, setMediaRecorder]   = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks]       = useState<Blob[]>([]);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const imageRef   = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Auto scroll ──────────────────────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Envoyer texte ────────────────────────────────────────────────────────────
  const handleEnvoyer = useCallback(async () => {
    const t = texte.trim();
    if (!t || !estMembre) return;
    setTexte("");
    textareaRef.current && (textareaRef.current.style.height = "auto");
    await envoyerMessage({ contenu: t, type: "texte", vue_unique: vueUnique });
    setVueUnique(false);
  }, [texte, estMembre, envoyerMessage, vueUnique]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnvoyer();
    }
  }, [handleEnvoyer]);

  // ── Upload fichier ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, type: "image" | "video" | "fichier") => {
    const file = e.target.files?.[0];
    if (!file || !estMembre) return;
    setShowAttach(false);
    const url = await uploadMedia(file);
    if (url) {
      await envoyerMessage({
        type,
        media_url: url,
        media_nom: file.name,
        media_taille: file.size,
        vue_unique: vueUnique && type === "image",
      });
      setVueUnique(false);
    }
    e.target.value = "";
  }, [estMembre, uploadMedia, envoyerMessage, vueUnique]);

  // ── Enregistrement vocal ─────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const file = new File([blob], `vocal_${Date.now()}.webm`, { type: "audio/webm" });
        const url = await uploadMedia(file);
        if (url) {
          await envoyerMessage({ type: "audio", media_url: url, media_duree: Math.round(chunks.length * 0.1) });
        }
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start(100);
      setMediaRecorder(recorder);
      setAudioChunks(chunks);
      setEnregistrement(true);
    } catch (err) {
      console.error("Micro inaccessible", err);
    }
  }, [uploadMedia, envoyerMessage]);

  const stopRecording = useCallback(() => {
    mediaRecorder?.stop();
    setMediaRecorder(null);
    setEnregistrement(false);
  }, [mediaRecorder]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <p className="text-gray-400">Connexion requise</p>
      </div>
    );
  }

  // ── Écran de chargement ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-[#111b21] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl overflow-hidden">
            <img src="https://i.postimg.cc/MGrfm9b1/file-00000000f168720aaa88f3276382f694.png" alt="logo" className="w-full h-full object-cover" />
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-[#25d366] animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Groupe fermé ─────────────────────────────────────────────────────────────
  if (config && !config.est_ouvert && !isAdmin) {
    return (
      <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center gap-5 px-6">
        <div className="w-20 h-20 rounded-3xl overflow-hidden border-2 border-red-500/30">
          <img src={config.logo_url} alt={config.nom} className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h2 className="text-white font-black text-xl">{config.nom}</h2>
          <p className="text-gray-400 text-sm mt-1">Ce groupe est temporairement fermé par l'administrateur.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 border border-red-500/20 rounded-2xl">
          <Lock className="w-4 h-4 text-red-400" />
          <span className="text-red-400 text-sm font-semibold">Groupe fermé</span>
        </div>
        <button onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white text-sm transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Retour
        </button>
      </div>
    );
  }

  // ── Rejoindre le groupe ──────────────────────────────────────────────────────
  if (!estMembre) {
    return (
      <div className="min-h-screen bg-[#111b21] flex flex-col items-center justify-center gap-6 px-6">
        <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-[#305CDE]/40 shadow-2xl">
          <img src={config?.logo_url} alt="logo" className="w-full h-full object-cover" />
        </div>
        <div className="text-center">
          <h1 className="text-white font-black text-2xl leading-tight">{config?.nom}</h1>
          <p className="text-gray-400 text-sm mt-2">Groupe de discussion Nexora</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-white font-black text-2xl">{membres.length}</p>
            <p className="text-gray-400 text-xs">membres</p>
          </div>
          <div className="w-px h-8 bg-white/10" />
          <div className="text-center">
            <p className="text-[#25d366] font-black text-2xl">{nbConnectes}</p>
            <p className="text-gray-400 text-xs">en ligne</p>
          </div>
        </div>
        {config?.description && (
          <p className="text-gray-400 text-sm text-center max-w-xs">{config.description}</p>
        )}
        <button
          onClick={rejoindre}
          className="w-full max-w-xs py-4 rounded-2xl bg-[#25d366] text-white font-black text-base shadow-lg hover:bg-[#25d366]/90 active:scale-95 transition-all"
        >
          Rejoindre le groupe
        </button>
        <button onClick={() => navigate(-1)} className="text-gray-500 text-sm hover:text-gray-300 transition-colors">
          Annuler
        </button>
      </div>
    );
  }

  // ── Interface principale ─────────────────────────────────────────────────────
  const visibleMessages = messages.filter(m => !m.supprime || isAdmin || m.user_id === monProfil!.user_id);

  return (
    <div className="flex flex-col h-screen bg-[#0b141a] overflow-hidden relative">

      {/* ── APPEL EN COURS ── */}
      {appel && monProfil && (
        <GroupeAppel
          type={appel.type}
          monProfil={monProfil}
          membres={membres}
          isAdmin={isAdmin}
          onClose={() => setAppel(null)}
        />
      )}

      {/* ── PANEL INFO ── */}
      {showInfo && monProfil && config && (
        <GroupeInfoPanel
          config={config}
          membres={membres}
          monProfil={monProfil}
          nbConnectes={nbConnectes}
          isAdmin={isAdmin}
          onClose={() => setShowInfo(false)}
          onQuitter={async () => { await quitter(); setShowInfo(false); }}
          onExpulser={expulserMembre}
          onNommerAdmin={nommerAdmin}
          onRetirerAdmin={retirerAdmin}
          onOuvrirFermer={ouvrirFermerGroupe}
          onCouperMicro={couperMicro}
        />
      )}

      {/* ── HEADER ── */}
      <div className="flex items-center gap-3 px-3 py-3 bg-[#1f2c34] border-b border-white/5 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="p-1.5 text-gray-300 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Info groupe (cliquable) */}
        <button
          onClick={() => setShowInfo(true)}
          className="flex items-center gap-3 flex-1 min-w-0 hover:bg-white/5 rounded-xl px-2 py-1 transition-colors"
        >
          <div className="relative flex-shrink-0">
            <img src="https://i.postimg.cc/MGrfm9b1/file-00000000f168720aaa88f3276382f694.png"
              alt="logo" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
            {nbConnectes > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#25d366] border-2 border-[#1f2c34]" />
            )}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white font-black text-sm leading-tight truncate">{config?.nom}</p>
            <p className="text-[#25d366] text-xs mt-0.5 truncate">
              {nbConnectes} en ligne • {membres.length} membres
            </p>
          </div>
        </button>

        {/* Appels (admin seulement) */}
        {isAdmin && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setAppel({ type: "audio" })}
              className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              <Phone className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => setAppel({ type: "video" })}
              className="p-2 rounded-full hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            >
              <Video className="w-4.5 h-4.5" />
            </button>
          </div>
        )}
      </div>

      {/* ── GROUPE FERMÉ BANNIÈRE (admin voit quand même) ── */}
      {config && !config.est_ouvert && isAdmin && (
        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border-b border-red-500/20 flex-shrink-0">
          <Lock className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-xs font-semibold">Groupe fermé — seul vous pouvez écrire</span>
        </div>
      )}

      {/* ── UPLOAD PROGRESS ── */}
      {uploadProgress > 0 && (
        <div className="px-4 py-2 bg-[#1f2c34] border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-white/10 rounded-full h-1.5">
              <div className="bg-[#25d366] h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="text-gray-400 text-xs">{uploadProgress}%</span>
          </div>
        </div>
      )}

      {/* ── MESSAGES ── */}
      <div
        className="flex-1 overflow-y-auto py-3 space-y-0.5"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          backgroundColor: "#0b141a",
        }}
        onClick={() => { setShowEmoji(false); setShowAttach(false); }}
      >
        {/* Date header */}
        <div className="flex justify-center mb-3">
          <span className="text-[10px] text-gray-400 bg-[#1f2c34]/80 px-3 py-1 rounded-full">
            {new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
          </span>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 px-6">
            <div className="w-16 h-16 rounded-2xl overflow-hidden opacity-30">
              <img src="https://i.postimg.cc/MGrfm9b1/file-00000000f168720aaa88f3276382f694.png" alt="" className="w-full h-full object-cover" />
            </div>
            <p className="text-gray-500 text-sm text-center">Soyez le premier à écrire un message !</p>
          </div>
        ) : (
          visibleMessages.map(msg => (
            <MessageBubble
              key={msg.id}
              message={msg}
              monProfil={monProfil!}
              isAdmin={isAdmin}
              onSupprimer={supprimerMessage}
              onModifier={modifierMessage}
              onVueUnique={marquerVueUnique}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── EMOJI PICKER ── */}
      {showEmoji && (
        <div className="absolute bottom-20 left-3 z-30">
          <EmojiPicker
            onSelect={e => {
              setTexte(prev => prev + e);
              setShowEmoji(false);
              textareaRef.current?.focus();
            }}
            onClose={() => setShowEmoji(false)}
          />
        </div>
      )}

      {/* ── ATTACH MENU ── */}
      {showAttach && (
        <div className="absolute bottom-20 left-3 z-30 bg-[#1f2c34] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {[
            { icon: Image, label: "Image", color: "#8B5CF6", onClick: () => imageRef.current?.click() },
            { icon: Film, label: "Vidéo", color: "#EC4899", onClick: () => videoRef.current?.click() },
            { icon: FileText, label: "Fichier", color: "#F59E0B", onClick: () => fileRef.current?.click() },
          ].map(({ icon: Icon, label, color, onClick }) => (
            <button key={label} onClick={onClick}
              className="flex items-center gap-3 px-5 py-3.5 w-44 hover:bg-white/5 transition-colors">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
              <span className="text-white text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* ── INPUT FILES (cachés) ── */}
      <input ref={imageRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e, "image")} />
      <input ref={videoRef} type="file" accept="video/*" className="hidden" onChange={e => handleFile(e, "video")} />
      <input ref={fileRef}  type="file" className="hidden" onChange={e => handleFile(e, "fichier")} />

      {/* ── BARRE SAISIE ── */}
      <div className="flex-shrink-0 px-3 pb-4 pt-2 bg-[#0b141a] border-t border-white/5">

        {/* Indicateur vue unique */}
        {vueUnique && (
          <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-[#25d366]/10 rounded-xl border border-[#25d366]/20">
            <Eye className="w-3.5 h-3.5 text-[#25d366]" />
            <span className="text-[#25d366] text-xs font-semibold flex-1">Vue unique activée</span>
            <button onClick={() => setVueUnique(false)}>
              <X className="w-3.5 h-3.5 text-[#25d366]" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Boutons gauche */}
          <div className="flex items-center gap-0.5 flex-shrink-0 pb-1.5">
            <button onClick={() => { setShowEmoji(!showEmoji); setShowAttach(false); }}
              className={`p-2 rounded-full transition-colors ${showEmoji ? "text-[#25d366]" : "text-gray-400 hover:text-white"}`}>
              <Smile className="w-5 h-5" />
            </button>
            <button onClick={() => { setShowAttach(!showAttach); setShowEmoji(false); }}
              className={`p-2 rounded-full transition-colors ${showAttach ? "text-[#25d366]" : "text-gray-400 hover:text-white"}`}>
              <Paperclip className="w-5 h-5" />
            </button>
            <button
              onClick={() => setVueUnique(!vueUnique)}
              className={`p-2 rounded-full transition-colors ${vueUnique ? "text-[#25d366]" : "text-gray-400 hover:text-white"}`}
              title="Vue unique"
            >
              <Eye className="w-5 h-5" />
            </button>
          </div>

          {/* Textarea */}
          <div className="flex-1 bg-[#1f2c34] rounded-3xl px-4 py-3 flex items-end gap-2 border border-white/5">
            {enregistrement ? (
              <div className="flex items-center gap-3 flex-1 py-0.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-red-400 text-sm font-semibold">Enregistrement...</span>
                <div className="flex gap-0.5 flex-1">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div key={i} className="flex-1 rounded-full bg-red-400 opacity-60"
                      style={{ height: Math.random() * 16 + 4, animationDelay: `${i * 0.05}s` }} />
                  ))}
                </div>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                value={texte}
                onChange={e => {
                  setTexte(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onKeyDown={handleKeyDown}
                placeholder="Message..."
                rows={1}
                className="flex-1 bg-transparent text-white text-[15px] placeholder-gray-500 resize-none outline-none leading-relaxed"
                style={{ maxHeight: 120 }}
              />
            )}
          </div>

          {/* Bouton envoi / micro */}
          <div className="flex-shrink-0 pb-1">
            {texte.trim() ? (
              <button
                onClick={handleEnvoyer}
                className="w-11 h-11 rounded-full bg-[#25d366] flex items-center justify-center shadow-lg hover:bg-[#25d366]/90 active:scale-95 transition-all"
              >
                <Send className="w-5 h-5 text-white" />
              </button>
            ) : (
              <button
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                className={`w-11 h-11 rounded-full flex items-center justify-center shadow-lg transition-all ${
                  enregistrement ? "bg-red-500 scale-110" : "bg-[#25d366] hover:bg-[#25d366]/90"
                }`}
              >
                <Mic className="w-5 h-5 text-white" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
