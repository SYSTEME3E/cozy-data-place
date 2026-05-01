/**
 * NEXORA — Messages Vendeur
 * Interface de messagerie côté vendeur : liste des discussions + chat en temps réel
 */

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import {
  MessageCircle, Send, Image as ImageIcon, Video, X, ChevronLeft,
  Package, ShoppingCart, CheckCheck, Search,
  RefreshCw, User, Inbox
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

function avatarColor(name: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-violet-500",
    "bg-orange-500", "bg-rose-500", "bg-teal-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

// ─── Composant principal ───────────────────────────────────────────────────────
export default function MessagesVendeurPage() {
  const [boutiqueId, setBoutiqueId]     = useState<string | null>(null);
  const [discussions, setDiscussions]   = useState<Discussion[]>([]);
  const [activeId, setActiveId]         = useState<string | null>(null);
  const [messages, setMessages]         = useState<Message[]>([]);
  const [newMsg, setNewMsg]             = useState("");
  const [sending, setSending]           = useState(false);
  const [loading, setLoading]           = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);
  const [search, setSearch]             = useState("");
  const [uploadFile, setUploadFile]     = useState<File | null>(null);
  const [uploading, setUploading]       = useState(false);
  const [mobileView, setMobileView]     = useState<"list" | "chat">("list");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);
  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeDiscussion = discussions.find(d => d.id === activeId) || null;

  // ── Charger la boutique de l'utilisateur connecté ──────────────────────────
  useEffect(() => {
    (async () => {
      const user = getNexoraUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("boutiques")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.id) setBoutiqueId(data.id);
    })();
  }, []);

  // ── Charger toutes les discussions ─────────────────────────────────────────
  const loadDiscussions = async () => {
    if (!boutiqueId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("discussions")
      .select(`*, produit:produit_id ( nom, photos ), commande:commande_id ( numero )`)
      .eq("boutique_id", boutiqueId)
      .order("updated_at", { ascending: false });

    if (data) {
      const withLast = await Promise.all(
        (data as Discussion[]).map(async (d) => {
          const { data: lastMsg } = await (supabase as any)
            .from("messages_discussion")
            .select("contenu, fichier_type")
            .eq("discussion_id", d.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          return {
            ...d,
            dernierMessage:
              lastMsg?.contenu ||
              (lastMsg?.fichier_type === "image"
                ? "📷 Image"
                : lastMsg?.fichier_type === "video"
                ? "🎥 Vidéo"
                : ""),
          };
        })
      );
      setDiscussions(withLast);
    }
    setLoading(false);
  };

  useEffect(() => { if (boutiqueId) loadDiscussions(); }, [boutiqueId]);

  // ── Charger les messages d'une discussion ──────────────────────────────────
  const loadMessages = async (discId: string) => {
    setLoadingMsgs(true);
    const { data } = await (supabase as any)
      .from("messages_discussion")
      .select("*")
      .eq("discussion_id", discId)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
    setLoadingMsgs(false);

    // Marquer comme lu
    await (supabase as any).from("discussions").update({ lu_vendeur: true }).eq("id", discId);
    await (supabase as any)
      .from("messages_discussion")
      .update({ lu: true })
      .eq("discussion_id", discId)
      .eq("expediteur", "acheteur");
    setDiscussions(prev =>
      prev.map(d => (d.id === discId ? { ...d, lu_vendeur: true } : d))
    );
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ── Polling toutes les 5s ──────────────────────────────────────────────────
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

  // ── Upload fichier ─────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = file.type.startsWith("video") ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert(`Fichier trop volumineux. Max : ${file.type.startsWith("video") ? "50 Mo" : "5 Mo"}`);
      return;
    }
    setUploadFile(file);
  };

  const uploadMedia = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `discussions/${activeId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("medias").upload(path, file, { upsert: true });
    if (error) { setUploading(false); return null; }
    const { data: pub } = supabase.storage.from("medias").getPublicUrl(path);
    setUploading(false);
    return {
      url: pub.publicUrl,
      type: file.type.startsWith("video") ? "video" : "image",
      nom: file.name,
    };
  };

  // ── Envoyer un message ─────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!activeId || (!newMsg.trim() && !uploadFile)) return;
    setSending(true);

    let fichierUrl: string | null = null;
    let fichierType: string | null = null;
    let fichierNom: string | null = null;

    if (uploadFile) {
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

    await (supabase as any)
      .from("discussions")
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

  const nonLus = discussions.filter(d => !d.lu_vendeur).length;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-[calc(100vh-80px)] bg-gray-50 dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">

      {/* ══ Panneau gauche — Liste des discussions ══════════════════════════ */}
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} md:flex flex-col w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0`}>

        {/* Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-emerald-500" />
              <h1 className="text-lg font-black text-gray-900 dark:text-white">Messages</h1>
              {nonLus > 0 && (
                <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {nonLus}
                </span>
              )}
            </div>
            <button
              onClick={loadDiscussions}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="Actualiser"
            >
              <RefreshCw className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Barre de recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une conversation..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 dark:text-white"
            />
          </div>
        </div>

        {/* Liste des discussions */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredDiscussions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-6">
              <Inbox className="w-10 h-10 text-gray-200 dark:text-gray-600 mb-2" />
              <p className="text-sm font-semibold text-gray-400">Aucune discussion</p>
              <p className="text-xs text-gray-400 mt-1">
                Les messages de vos acheteurs apparaîtront ici
              </p>
            </div>
          ) : (
            filteredDiscussions.map(d => (
              <button
                key={d.id}
                onClick={() => openDiscussion(d.id)}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-50 dark:border-gray-700 ${
                  activeId === d.id
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-l-emerald-500"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm flex-shrink-0 ${
                    activeId === d.id ? "bg-emerald-500" : avatarColor(d.acheteur_nom)
                  }`}>
                    {d.acheteur_nom.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm font-bold truncate ${
                        !d.lu_vendeur ? "text-gray-900 dark:text-white" : "text-gray-600 dark:text-gray-400"
                      }`}>
                        {d.acheteur_nom}
                      </p>
                      <span className="text-[10px] text-gray-400 flex-shrink-0">
                        {timeAgo(d.updated_at)}
                      </span>
                    </div>

                    {/* Produit / Commande */}
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {d.produit && (
                        <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
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
                        !d.lu_vendeur
                          ? "text-gray-700 dark:text-gray-200 font-semibold"
                          : "text-gray-400"
                      }`}>
                        {d.dernierMessage}
                      </p>
                    )}
                  </div>

                  {/* Badge non lu */}
                  {!d.lu_vendeur && (
                    <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full flex-shrink-0 mt-1" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* ══ Panneau droit — Conversation ═══════════════════════════════════════ */}
      <div className={`${mobileView === "list" ? "hidden" : "flex"} md:flex flex-col flex-1 bg-white dark:bg-gray-800`}>

        {!activeDiscussion ? (
          /* État vide */
          <div className="flex flex-col items-center justify-center h-full text-center px-8">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl flex items-center justify-center mb-4">
              <MessageCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black text-gray-800 dark:text-white">Vos messages</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
              Sélectionnez une conversation à gauche pour répondre à vos acheteurs.
            </p>
          </div>
        ) : (
          <>
            {/* ── En-tête du chat ── */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <button
                onClick={() => setMobileView("list")}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>

              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white font-black text-sm ${avatarColor(activeDiscussion.acheteur_nom)}`}>
                {activeDiscussion.acheteur_nom.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white text-sm">
                  {activeDiscussion.acheteur_nom}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {activeDiscussion.produit && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
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
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}>
                {activeDiscussion.statut === "ouvert" ? "Ouvert" : "Fermé"}
              </span>
            </div>

            {/* ── Fil des messages ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-gray-900/50">
              {loadingMsgs ? (
                <div className="flex justify-center pt-8">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
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
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white mr-2 flex-shrink-0 self-end ${avatarColor(activeDiscussion.acheteur_nom)}`}>
                          {activeDiscussion.acheteur_nom.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`max-w-[75%] space-y-1 flex flex-col ${isVendeur ? "items-end" : "items-start"}`}>
                        {/* Image */}
                        {msg.fichier_url && msg.fichier_type === "image" && (
                          <div className={`rounded-2xl overflow-hidden shadow-sm ${isVendeur ? "rounded-br-sm" : "rounded-bl-sm"}`}>
                            <img
                              src={msg.fichier_url}
                              alt={msg.fichier_nom || "image"}
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
                        {/* Texte */}
                        {msg.contenu && (
                          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                            isVendeur
                              ? "bg-emerald-500 text-white rounded-br-sm"
                              : "bg-white dark:bg-gray-700 text-gray-800 dark:text-white border border-gray-100 dark:border-gray-600 rounded-bl-sm"
                          }`}>
                            {msg.contenu}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <p className="text-[10px] text-gray-400">{timeAgo(msg.created_at)}</p>
                          {isVendeur && (
                            <CheckCheck className={`w-3 h-3 ${msg.lu ? "text-emerald-500" : "text-gray-300"}`} />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Aperçu du fichier à envoyer ── */}
            {uploadFile && (
              <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border-t border-emerald-100 dark:border-emerald-800 flex items-center gap-3">
                {uploadFile.type.startsWith("image") ? (
                  <img
                    src={URL.createObjectURL(uploadFile)}
                    className="w-12 h-12 rounded-lg object-cover"
                    alt="preview"
                  />
                ) : (
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg flex items-center justify-center">
                    <Video className="w-5 h-5 text-emerald-600" />
                  </div>
                )}
                <p className="flex-1 text-xs text-gray-600 dark:text-gray-300 truncate">{uploadFile.name}</p>
                <button
                  onClick={() => setUploadFile(null)}
                  className="p-1 rounded-full hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            )}

            {/* ── Zone de saisie ── */}
            <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-end gap-2">
                {/* Bouton fichier */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
                  title="Envoyer une image ou vidéo"
                >
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </button>

                {/* Textarea */}
                <textarea
                  value={newMsg}
                  onChange={e => setNewMsg(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Écrire un message..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none max-h-32 dark:text-white dark:placeholder-gray-400"
                  style={{ minHeight: "42px" }}
                />

                {/* Bouton envoyer */}
                <button
                  onClick={sendMessage}
                  disabled={sending || uploading || (!newMsg.trim() && !uploadFile)}
                  className="p-2.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending || uploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5 text-center">
                Entrée pour envoyer · Images max 5 Mo · Vidéos max 50 Mo
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
