import { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, Monitor,
  MonitorOff, Users, Crown, X
} from "lucide-react";
import type { GroupeMembre } from "@/hooks/useGroupe";
import { supabase } from "@/integrations/supabase/client";


interface Participant {
  user_id: string;
  nom_prenom: string;
  avatar_url?: string | null;
  stream?: MediaStream;
  micro_on: boolean;
  video_on: boolean;
  role: "admin" | "membre";
}

interface Props {
  type: "video" | "audio";
  monProfil: GroupeMembre;
  membres: GroupeMembre[];
  isAdmin: boolean;
  onClose: () => void;
}

function Avatar({ src, nom, taille = 48 }: { src?: string | null; nom: string; taille?: number }) {
  const colors = ["#305CDE","#8B5CF6","#EC4899","#10B981","#F59E0B"];
  const color = colors[nom.charCodeAt(0) % colors.length];
  if (src) return <img src={src} alt={nom} style={{ width: taille, height: taille }} className="rounded-full object-cover" />;
  return (
    <div style={{ width: taille, height: taille, background: color }}
      className="rounded-full flex items-center justify-center flex-shrink-0">
      <span style={{ fontSize: taille * 0.4 }} className="text-white font-black">
        {nom.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

export default function GroupeAppel({ type, monProfil, membres, isAdmin, onClose }: Props) {
  const [microOn, setMicroOn]     = useState(true);
  const [videoOn, setVideoOn]     = useState(type === "video");
  const [partage, setPartage]     = useState(false);
  const [duree, setDuree]         = useState(0);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [affichageGrid, setAffichageGrid] = useState(false);

  const localVideoRef  = useRef<HTMLVideoElement>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const localStreamRef  = useRef<MediaStream | null>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval>>();
  const db = supabase as any;

  // ── Initialiser stream local ─────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: type === "video",
          audio: true,
        });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        // Soi-même dans les participants
        setParticipants([{
          user_id: monProfil.user_id,
          nom_prenom: monProfil.nom_prenom,
          avatar_url: monProfil.avatar_url,
          stream,
          micro_on: true,
          video_on: type === "video",
          role: monProfil.role,
        }]);

        // Signaler l'appel dans Supabase
        await db.from("groupe_appels").insert({
          initiateur_id: monProfil.user_id,
          type,
          statut: "en_cours",
          participants: [monProfil.user_id],
        });
      } catch (err) {
        console.error("Impossible d'accéder aux médias", err);
      }
    };
    init();

    // Timer
    timerRef.current = setInterval(() => setDuree(d => d + 1), 1000);

    return () => {
      clearInterval(timerRef.current);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  // ── Formater durée ──────────────────────────────────────────────────────────
  const formatDuree = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Toggle micro ─────────────────────────────────────────────────────────────
  const toggleMicro = useCallback(() => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMicroOn(prev => {
      setParticipants(ps => ps.map(p =>
        p.user_id === monProfil.user_id ? { ...p, micro_on: !prev } : p
      ));
      return !prev;
    });
  }, [monProfil.user_id]);

  // ── Toggle vidéo ─────────────────────────────────────────────────────────────
  const toggleVideo = useCallback(() => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoOn(prev => {
      setParticipants(ps => ps.map(p =>
        p.user_id === monProfil.user_id ? { ...p, video_on: !prev } : p
      ));
      return !prev;
    });
  }, [monProfil.user_id]);

  // ── Partage écran ────────────────────────────────────────────────────────────
  const togglePartageEcran = useCallback(async () => {
    if (!isAdmin) return;
    if (partage) {
      screenStreamRef.current?.getTracks().forEach(t => t.stop());
      screenStreamRef.current = null;
      setPartage(false);
      // Rétablir stream caméra
      if (localVideoRef.current && localStreamRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    } else {
      try {
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screen;
        if (localVideoRef.current) localVideoRef.current.srcObject = screen;
        setPartage(true);
        screen.getVideoTracks()[0].onended = () => {
          setPartage(false);
          if (localVideoRef.current && localStreamRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }
        };
      } catch (err) {
        console.error("Partage écran annulé", err);
      }
    }
  }, [isAdmin, partage]);

  // ── Couper micro d'un participant (admin) ────────────────────────────────────
  const couperMicroParticipant = useCallback((userId: string) => {
    if (!isAdmin) return;
    setParticipants(ps => ps.map(p =>
      p.user_id === userId ? { ...p, micro_on: false } : p
    ));
    db.from("groupe_membres").update({ micro_coupe: true }).eq("user_id", userId);
  }, [isAdmin]);

  // ── Terminer appel ────────────────────────────────────────────────────────────
  const terminer = useCallback(async () => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    screenStreamRef.current?.getTracks().forEach(t => t.stop());
    await db.from("groupe_appels").update({ statut: "termine", ended_at: new Date().toISOString() })
      .eq("initiateur_id", monProfil.user_id).eq("statut", "en_cours");
    onClose();
  }, [onClose, monProfil.user_id]);

  const moi = participants.find(p => p.user_id === monProfil.user_id);

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b0f12] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 pt-safe pt-4 pb-3 bg-gradient-to-b from-black/60 to-transparent absolute top-0 left-0 right-0 z-10">
        <div>
          <p className="text-white font-black text-base">NEXORA MEMBRE GROUP</p>
          <div className="flex items-center gap-2 mt-0.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#25d366] animate-pulse" />
            <p className="text-[#25d366] text-xs font-semibold">{formatDuree(duree)}</p>
            <span className="text-gray-400 text-xs">•</span>
            <p className="text-gray-300 text-xs">{type === "video" ? "Appel vidéo" : "Appel audio"}</p>
            {partage && <span className="text-[10px] bg-[#305CDE] text-white px-2 py-0.5 rounded-full font-bold">Partage écran</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAffichageGrid(!affichageGrid)}
            className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20">
            <Users className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Zone vidéo principale ── */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {type === "video" || partage ? (
          <video ref={localVideoRef} autoPlay muted playsInline
            className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Avatar src={monProfil.avatar_url} nom={monProfil.nom_prenom} taille={96} />
            <p className="text-white font-black text-xl">{monProfil.nom_prenom}</p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
              <p className="text-[#25d366] text-sm">En appel • {formatDuree(duree)}</p>
            </div>
          </div>
        )}

        {/* Grille participants (si ouvert) */}
        {affichageGrid && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between p-4">
              <p className="text-white font-bold">Participants ({participants.length})</p>
              <button onClick={() => setAffichageGrid(false)} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3 p-3 bg-white/5 rounded-2xl">
                  <Avatar src={p.avatar_url} nom={p.nom_prenom} taille={40} />
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">
                      {p.nom_prenom}
                      {p.user_id === monProfil.user_id && " (vous)"}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {p.role === "admin" && <Crown className="w-3 h-3 text-[#305CDE]" />}
                      {p.micro_on ? <Mic className="w-3 h-3 text-[#25d366]" /> : <MicOff className="w-3 h-3 text-red-400" />}
                    </div>
                  </div>
                  {isAdmin && p.user_id !== monProfil.user_id && p.micro_on && (
                    <button onClick={() => couperMicroParticipant(p.user_id)}
                      className="px-3 py-1.5 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors">
                      Couper
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Barre de contrôles ── */}
      <div className="absolute bottom-0 left-0 right-0 pb-safe pb-8 pt-6 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-5">

          {/* Micro */}
          <button onClick={toggleMicro}
            className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
              microOn ? "bg-white/15 text-white" : "bg-red-500 text-white"
            }`}>
            {microOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
          </button>

          {/* Raccrocher */}
          <button onClick={terminer}
            className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-xl hover:bg-red-700 transition-colors">
            <PhoneOff className="w-7 h-7 text-white" />
          </button>

          {/* Vidéo */}
          {type === "video" && (
            <button onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                videoOn ? "bg-white/15 text-white" : "bg-red-500 text-white"
              }`}>
              {videoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          )}

          {/* Partage écran (admin) */}
          {isAdmin && (
            <button onClick={togglePartageEcran}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all ${
                partage ? "bg-[#305CDE] text-white" : "bg-white/15 text-white"
              }`}>
              {partage ? <MonitorOff className="w-6 h-6" /> : <Monitor className="w-6 h-6" />}
            </button>
          )}
        </div>

        {/* Légendes */}
        <div className="flex items-center justify-center gap-5 mt-2">
          <span className="text-xs text-gray-400 w-14 text-center">{microOn ? "Micro" : "Muet"}</span>
          <span className="text-xs text-gray-400 w-16 text-center">Terminer</span>
          {type === "video" && <span className="text-xs text-gray-400 w-14 text-center">Caméra</span>}
          {isAdmin && <span className="text-xs text-gray-400 w-14 text-center">Écran</span>}
        </div>
      </div>
    </div>
  );
}
