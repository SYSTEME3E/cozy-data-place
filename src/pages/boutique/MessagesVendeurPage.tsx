/**
 * NEXORA — Messages Vendeur (v2)
 * • Couleur bleu roi (#305CDE) partout
 * • Avatars acheteurs bleu roi
 * • Badge vert (nb messages non lus) devant le nom de l'acheteur
 * • Point rouge dans le menu si message non lu
 * • Envoi d'images, vidéos et AUDIOS
 * • Polling 5s
 * • Responsive mobile / dark mode
 */

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  MessageCircle, Send, Image as ImageIcon, Video, X, ChevronLeft,
  Package, ShoppingCart, CheckCheck, Search, Mic, MicOff,
  Play, Pause, Inbox, Square,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Discussion {
  id: string;
  boutique_id: string;
  produit_id: string | null;
  commande_id: string | null;
  acheteur_nom: string;
  acheteur_tel: string | null;
  acheteur_email: string | null;
  statut: string;
  lu_vendeur: boolean;
  created_at: string;
  updated_at: string;
  produit?: { nom: string; photos: string[] | null } | null;
  commande?: { numero: string } | null;
  dernierMessage?: string;
  nbNonLus?: number;
}

interface Message {
  id: string;
  discussion_id: string;
  expediteur: "acheteur" | "vendeur";
  contenu: string | null;
  fichier_url: string | null;
  fichier_type: string | null;
  fichier_nom: string | null;
  lu: boolean;
  created_at: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)    return "À l'instant";
  if (diff < 3600)  return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Composant lecteur audio ───────────────────────────────────────────────────
function AudioPlayer({ url, isVendeur }: { url: string; isVendeur: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); setPlaying(false); }
    else         { audioRef.current.play();  setPlaying(true);  }
  };

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-2xl min-w-[180px] shadow-sm ${
      isVendeur
        ? "bg-[#305CDE] text-white rounded-br-sm"
        : "bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-600 rounded-bl-sm"
    }`}>
      <audio
        ref={audioRef}
        src={url}
        onTimeUpdate={() => {
          if (audioRef.current)
            setProgress((audioRef.current.currentTime / (audioRef.current.duration || 1)) * 100);
        }}
        onLoadedMetadata={() => { if (audioRef.current) setDuration(audioRef.current.duration); }}
        onEnded={() => setPlaying(false)}
      />
      <button onClick={toggle} className="flex-shrink-0">
        {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
      </button>
      <div className={`flex-1 h-1.5 rounded-full relative ${isVendeur ? "bg-white/30" : "bg-gray-200 dark:bg-gray-500"}`}>
        <div
          className={`absolute left-0 top-0 h-1.5 rounded-full transition-all ${isVendeur ? "bg-white" : "bg-[#305CDE]"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-[10px] flex-shrink-0 tabular-nums ${isVendeur ? "text-white/80" : "text-gray-400"}`}>
        {formatDuration(duration)}
      </span>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function MessagesVendeurPage() {
  const [boutiqueId, setBoutiqueId]       = useState<string | null>(null);
  const [discussions, setDiscussions]     = useState<Discussion[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [newMsg, setNewMsg]               = useState("");
  const [sending, setSending]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [search, setSearch]               = useState("");
  const [uploadFile, setUploadFile]       = useState<File | null>(null);
  const [uploading, setUploading]         = useState(false);
  const [mobileView, setMobileView]       = useState<"list" | "chat">("list");

  // Audio recording
  const [recording, setRecording]             = useState(false);
  const [audioBlob, setAudioBlob]             = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds]     = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeDiscussion = discussions.find(d => d.id === activeId) || null;

  // ── Boutique ───────────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const user = getNexoraUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("boutiques").select("id").eq("user_id", user.id).maybeSingle();
      if (data?.id) setBoutiqueId(data.id);
    })();
  }, []);

  // ── Charger discussions ────────────────────────────────────────────────────
  const loadDiscussions = async () => {
    if (!boutiqueId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("discussions")
      .select(`*, produit:produit_id(nom,photos), commande:commande_id(numero)`)
      .eq("boutique_id", boutiqueId)
      .order("updated_at", { ascending: false });

    if (data) {
      const withMeta = await Promise.all(
        (data as Discussion[]).map(async (d) => {
          const [{ data: lastMsg }, { count }] = await Promise.all([
            (supabase as any)
              .from("messages_discussion").select("contenu,fichier_type")
              .eq("discussion_id", d.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
            (supabase as any)
              .from("messages_discussion")
              .select("id", { count: "exact", head: true })
              .eq("discussion_id", d.id).eq("expediteur", "acheteur").eq("lu", false),
          ]);
          return {
            ...d,
            nbNonLus: count ?? 0,
            dernierMessage:
              lastMsg?.contenu ||
              (lastMsg?.fichier_type === "image" ? "📷 Image"  :
               lastMsg?.fichier_type === "video" ? "🎥 Vidéo"  :
               lastMsg?.fichier_type === "audio" ? "🎙️ Audio"  : ""),
          };
        })
      );
      setDiscussions(withMeta);
    }
    setLoading(false);
  };

  useEffect(() => { if (boutiqueId) loadDiscussions(); }, [boutiqueId]);

  // ── Charger messages ──────────────────────────────────────────────────────
  const loadMessages = async (discId: string) => {
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from("messages_discussion").select("*")
      .eq("discussion_id", discId).order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoadingMsgs(false);

    await (supabase as any).from("discussions").update({ lu_vendeur: true }).eq("id", discId);
    await (supabase as any).from("messages_discussion")
      .update({ lu: true }).eq("discussion_id", discId).eq("expediteur", "acheteur");
    setDiscussions(prev =>
      prev.map(d => d.id === discId ? { ...d, lu_vendeur: true, nbNonLus: 0 } : d)
    );
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  useEffect(() => {
    if (!activeId) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => loadMessages(activeId), 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [activeId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openDiscussion = (id: string) => {
    setActiveId(id);
    loadMessages(id);
    setMobileView("chat");
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = file.type.startsWith("video") ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) { alert("Fichier trop volumineux."); return; }
    setUploadFile(file);
    setAudioBlob(null); setAudioPreviewUrl(null);
  };

  const uploadMedia = async (file: File | Blob, forceName?: string) => {
    setUploading(true);
    const fileName = forceName || (file instanceof File ? file.name : `audio_${Date.now()}.webm`);
    const fileExt  = fileName.split(".").pop() || "bin";
    const path = `discussions/${activeId}/${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from("medias").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return null; }
    const { data: pub } = supabase.storage.from("medias").getPublicUrl(path);
    setUploading(false);
    const type =
      file instanceof File
        ? (file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "image")
        : "audio";
    return { url: pub.publicUrl, type, nom: fileName };
  };

  // ── Enregistrement audio ──────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mediaRecorderRef.current = mr;
      mr.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      setRecording(true);
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000);
    } catch { alert("Microphone non accessible."); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const cancelAudio = () => { setAudioBlob(null); setAudioPreviewUrl(null); setRecordSeconds(0); };

  // ── Envoyer ───────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeId || (!newMsg.trim() && !uploadFile && !audioBlob)) return;
    setSending(true);

    let fichierUrl: string | null = null;
    let fichierType: string | null = null;
    let fichierNom: string | null = null;

    if (audioBlob) {
      const res = await uploadMedia(audioBlob, `audio_${Date.now()}.webm`);
      if (res) { fichierUrl = res.url; fichierType = "audio"; fichierNom = res.nom; }
      setAudioBlob(null); setAudioPreviewUrl(null);
    } else if (uploadFile) {
      const res = await uploadMedia(uploadFile);
      if (res) { fichierUrl = res.url; fichierType = res.type; fichierNom = res.nom; }
      setUploadFile(null);
    }

    if (!newMsg.trim() && !fichierUrl) { setSending(false); return; }

    await (supabase as any).from("messages_discussion").insert({
      discussion_id: activeId,
      expediteur:    "vendeur",
      contenu:       newMsg.trim() || null,
      fichier_url:   fichierUrl,
      fichier_type:  fichierType,
      fichier_nom:   fichierNom,
    });

    // lu_acheteur = false → point rouge côté acheteur
    await (supabase as any).from("discussions")
      .update({ updated_at: new Date().toISOString(), lu_acheteur: false })
      .eq("id", activeId);

    setNewMsg("");
    setSending(false);
    await loadMessages(activeId);
    await loadDiscussions();
  };

  const filteredDiscussions = discussions.filter(d =>
    d.acheteur_nom.toLowerCase().includes(search.toLowerCase()) ||
    (d.produit?.nom || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.commande?.numero || "").toLowerCase().includes(search.toLowerCase())
  );

  const totalNonLus = discussions.reduce((acc, d) => acc + (d.nbNonLus ?? 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">

      {/* ══ Panneau gauche ══════════════════════════════════════════════════ */}
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0`}>

        {/* Header — pas de bouton actualiser */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <MessageCircle className="w-5 h-5 text-[#305CDE]" />
            <h1 className="text-lg font-black text-gray-900 dark:text-white">Messages</h1>
            {totalNonLus > 0 && (
              <span className="bg-[#305CDE] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalNonLus}
              </span>
            )}
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une conversation…"
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 dark:text-white"
            />
          </div>
        </div>

        {/* Liste discussions */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-[#305CDE] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDiscussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Inbox className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-400">Aucune discussion</p>
              <p className="text-xs text-gray-400 mt-1">Les messages de vos acheteurs apparaîtront ici</p>
            </div>
          ) : (
            filteredDiscussions.map(d => (
              <button
                key={d.id}
                onClick={() => openDiscussion(d.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700 ${
                  activeId === d.id ? "bg-[#305CDE]/5 dark:bg-[#305CDE]/10 border-l-4 border-l-[#305CDE]" : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar bleu roi */}
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-[#305CDE]">
                    {d.acheteur_nom.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className={`text-sm font-bold truncate ${
                        (d.nbNonLus ?? 0) > 0 ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {d.acheteur_nom}
                      </p>
                      {/* Badge vert nb messages non lus */}
                      {(d.nbNonLus ?? 0) > 0 && (
                        <span className="bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full leading-none flex-shrink-0">
                          {d.nbNonLus}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 ml-auto flex-shrink-0">
                        {timeAgo(d.updated_at)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {d.produit && (
                        <span className="text-[10px] text-[#305CDE] font-semibold flex items-center gap-1">
                          <Package className="w-2.5 h-2.5" />{d.produit.nom}
                        </span>
                      )}
                      {d.commande && (
                        <span className="text-[10px] text-gray-400 flex items-center gap-1">
                          <ShoppingCart className="w-2.5 h-2.5" />#{d.commande.numero}
                        </span>
                      )}
                    </div>

                    {d.dernierMessage && (
                      <p className={`text-xs mt-1 truncate ${
                        (d.nbNonLus ?? 0) > 0
                          ? "text-gray-700 dark:text-gray-200 font-semibold"
                          : "text-gray-400"
                      }`}>
                        {d.dernierMessage}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ══ Panneau droit — Chat ═════════════════════════════════════════════ */}
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-col flex-1 bg-white dark:bg-gray-800`}>

        {!activeDiscussion ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-[#305CDE]/10 rounded-3xl flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-[#305CDE]" />
            </div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Vos messages</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              Sélectionnez une conversation à gauche pour répondre à vos acheteurs.
            </p>
          </div>
        ) : (
          <>
            {/* En-tête */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>

              <div className="w-10 h-10 bg-[#305CDE] rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                {activeDiscussion.acheteur_nom.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">{activeDiscussion.acheteur_nom}</p>
                  {(activeDiscussion.nbNonLus ?? 0) > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                      {activeDiscussion.nbNonLus}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeDiscussion.produit && (
                    <span className="text-xs text-[#305CDE] font-semibold flex items-center gap-1">
                      <Package className="w-3 h-3" />{activeDiscussion.produit.nom}
                    </span>
                  )}
                  {activeDiscussion.commande && (
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                      <ShoppingCart className="w-3 h-3" />#{activeDiscussion.commande.numero}
                    </span>
                  )}
                  {activeDiscussion.acheteur_tel && (
                    <span className="text-xs text-gray-400">{activeDiscussion.acheteur_tel}</span>
                  )}
                </div>
              </div>

              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                activeDiscussion.statut === "ouvert"
                  ? "bg-[#305CDE]/10 text-[#305CDE] dark:bg-[#305CDE]/20"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {activeDiscussion.statut === "ouvert" ? "Ouvert" : "Fermé"}
              </span>
            </div>

            {/* Fil messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
              {loadingMsgs ? (
                <div className="flex justify-center pt-8">
                  <div className="w-6 h-6 border-2 border-[#305CDE] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center">
                  <MessageCircle className="w-8 h-8 text-gray-200 dark:text-gray-600 mb-2" />
                  <p className="text-sm text-gray-400">Aucun message pour le moment</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isVendeur = msg.expediteur === "vendeur";
                  return (
                    <div key={msg.id} className={`flex ${isVendeur ? "justify-end" : "justify-start"}`}>
                      {!isVendeur && (
                        <div className="w-7 h-7 bg-[#305CDE] rounded-full flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0 self-end">
                          {activeDiscussion.acheteur_nom.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[75%] space-y-1 flex flex-col ${isVendeur ? "items-end" : "items-start"}`}>
                        {/* Image */}
                        {msg.fichier_url && msg.fichier_type === "image" && (
                          <div className={`rounded-2xl overflow-hidden shadow-sm ${isVendeur ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                            <img
                              src={msg.fichier_url} alt={msg.fichier_nom || "image"}
                              className="max-w-[240px] max-h-[240px] object-cover cursor-pointer"
                              onClick={() => window.open(msg.fichier_url!, "_blank")}
                            />
                          </div>
                        )}
                        {/* Vidéo */}
                        {msg.fichier_url && msg.fichier_type === "video" && (
                          <div className={`rounded-2xl overflow-hidden shadow-sm ${isVendeur ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                            <video src={msg.fichier_url} controls className="max-w-[240px] max-h-[200px] rounded-2xl" />
                          </div>
                        )}
                        {/* Audio */}
                        {msg.fichier_url && msg.fichier_type === "audio" && (
                          <AudioPlayer url={msg.fichier_url} isVendeur={isVendeur} />
                        )}
                        {/* Texte */}
                        {msg.contenu && (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isVendeur
                              ? "bg-[#305CDE] text-white rounded-br-sm"
                              : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-600 rounded-bl-sm"
                          }`}>
                            {msg.contenu}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-gray-400">{timeAgo(msg.created_at)}</p>
                          {isVendeur && (
                            <CheckCheck className={`w-3 h-3 ${msg.lu ? "text-[#305CDE]" : "text-gray-300"}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* Aperçu image/vidéo */}
            {uploadFile && (
              <div className="px-4 py-2 bg-[#305CDE]/5 border-t border-[#305CDE]/10 flex items-center gap-3">
                {uploadFile.type.startsWith("image") ? (
                  <img src={URL.createObjectURL(uploadFile)} className="w-12 h-12 rounded-lg object-cover" alt="preview" />
                ) : (
                  <div className="w-12 h-12 bg-[#305CDE]/10 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-[#305CDE]" />
                  </div>
                )}
                <p className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">{uploadFile.name}</p>
                <button onClick={() => setUploadFile(null)} className="p-1 rounded-full hover:bg-[#305CDE]/10">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Aperçu audio prêt à envoyer */}
            {audioPreviewUrl && !recording && (
              <div className="px-4 py-2 bg-[#305CDE]/5 border-t border-[#305CDE]/10 flex items-center gap-3">
                <audio src={audioPreviewUrl} controls className="h-8 flex-1 max-w-[260px]" />
                <button onClick={cancelAudio} className="p-1 rounded-full hover:bg-[#305CDE]/10">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* Enregistrement en cours */}
            {recording && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/20 border-t border-red-100 dark:border-red-800 flex items-center gap-3">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                <span className="text-sm text-red-600 dark:text-red-400 font-semibold flex-1">
                  Enregistrement… {formatDuration(recordSeconds)}
                </span>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
                >
                  <Square className="w-3.5 h-3.5" /> Arrêter
                </button>
              </div>
            )}

            {/* Zone de saisie */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-end gap-2">
                {/* Image / Vidéo */}
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  title="Image ou vidéo"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </button>

                {/* Micro */}
                {!recording ? (
                  <button
                    onClick={startRecording}
                    disabled={!!audioBlob}
                    className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-[#305CDE]/10 hover:border-[#305CDE]/40 transition-colors flex-shrink-0 disabled:opacity-40"
                    title="Enregistrer un audio"
                  >
                    <Mic className="w-5 h-5 text-[#305CDE]" />
                  </button>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="p-2.5 rounded-xl border border-red-300 bg-red-50 hover:bg-red-100 transition-colors flex-shrink-0 animate-pulse"
                    title="Arrêter"
                  >
                    <MicOff className="w-5 h-5 text-red-500" />
                  </button>
                )}

                {/* Texte */}
                <textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Écrire un message…"
                  rows={1}
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 resize-none max-h-32 dark:text-white dark:placeholder-gray-400"
                  style={{ minHeight: "42px" }}
                />

                {/* Envoyer */}
                <button
                  onClick={sendMessage}
                  disabled={sending || uploading || (!newMsg.trim() && !uploadFile && !audioBlob)}
                  className="p-2.5 rounded-xl bg-[#305CDE] text-white hover:bg-[#305CDE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending || uploading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <Send className="w-5 h-5" />
                  }
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Entrée pour envoyer · Images 5 Mo · Vidéos 50 Mo · Audios 10 Mo
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
