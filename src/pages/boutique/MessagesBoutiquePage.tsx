/**
 * NEXORA — Page Messages Boutique (Côté Vendeur)
 * Liste des conversations + vue conversation avec envoi d'images/vidéos
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Send, Image as ImageIcon, Loader2,
  MessageCircle, Search, ChevronLeft, Package
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getNexoraUser } from "@/lib/nexora-auth";

interface Conversation {
  id: string;
  boutique_id: string;
  produit_id: string | null;
  produit_nom: string | null;
  produit_image: string | null;
  acheteur_nom: string;
  acheteur_contact: string;
  acheteur_session_id: string;
  dernier_message: string;
  dernier_message_at: string;
  non_lus_vendeur: number;
}

interface Message {
  id: string;
  expediteur: "acheteur" | "vendeur";
  contenu: string;
  media_url?: string | null;
  media_type?: "image" | "video" | null;
  created_at: string;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString();
}

export default function MessagesBoutiquePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentUser = getNexoraUser();

  const [boutiqueId, setBoutiqueId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Charger la boutique du vendeur
  useEffect(() => {
    if (!currentUser) {
      navigate("/connexion");
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("boutiques" as any)
        .select("id")
        .eq("user_id", currentUser.id)
        .maybeSingle();
      if (data) setBoutiqueId((data as any).id);
      else setLoading(false);
    })();
  }, [currentUser?.id]);

  // Charger les conversations
  useEffect(() => {
    if (!boutiqueId) return;
    loadConversations();

    // Realtime sur les nouvelles conversations
    const channel = supabase
      .channel(`conv-${boutiqueId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations_boutique",
          filter: `boutique_id=eq.${boutiqueId}`,
        },
        () => loadConversations()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [boutiqueId]);

  async function loadConversations() {
    if (!boutiqueId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("conversations_boutique" as any)
      .select("*")
      .eq("boutique_id", boutiqueId)
      .order("dernier_message_at", { ascending: false });
    if (!error) setConversations((data as any) || []);
    setLoading(false);
  }

  // Charger les messages quand on sélectionne une conversation
  useEffect(() => {
    if (!selectedConv) return;
    loadMessages(selectedConv.id);

    // Marquer comme lu
    (supabase as any)
      .from("conversations_boutique")
      .update({ non_lus_vendeur: 0 })
      .eq("id", selectedConv.id)
      .then(() => loadConversations());

    // Realtime sur les nouveaux messages
    const channel = supabase
      .channel(`msg-${selectedConv.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_boutique",
          filter: `conversation_id=eq.${selectedConv.id}`,
        },
        (payload) => {
          setMessages((prev) => {
            if (prev.find((m) => m.id === (payload.new as any).id)) return prev;
            return [...prev, payload.new as Message];
          });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConv?.id]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadMessages(convId: string) {
    const { data } = await supabase
      .from("messages_boutique" as any)
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages((data as any) || []);
  }

  async function envoyerMessage(contenu: string, mediaUrl?: string, mediaType?: "image" | "video") {
    if (!selectedConv) return;
    if (!contenu.trim() && !mediaUrl) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("messages_boutique").insert({
        conversation_id: selectedConv.id,
        expediteur: "vendeur",
        contenu: contenu.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      });
      if (error) throw error;
      setNouveauMessage("");
    } catch (err: any) {
      toast({ title: "Erreur d'envoi", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !selectedConv) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Type de fichier non supporté", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux (max 20 Mo)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${selectedConv.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("boutique-messages-media")
        .upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("boutique-messages-media").getPublicUrl(path);
      await envoyerMessage("", pub.publicUrl, isImage ? "image" : "video");
    } catch (err: any) {
      toast({ title: "Erreur d'upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const filteredConversations = conversations.filter((c) =>
    `${c.acheteur_nom} ${c.acheteur_contact} ${c.produit_nom || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (!currentUser) return null;

  if (!boutiqueId && !loading) {
    return (
      <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center text-center">
        <Package size={48} className="text-muted-foreground mb-4" />
        <h2 className="font-bold text-foreground mb-2">Aucune boutique</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Vous devez créer une boutique pour gérer vos messages.
        </p>
        <Button onClick={() => navigate("/boutique/parametres")}>Créer ma boutique</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => (selectedConv ? setSelectedConv(null) : navigate(-1))}
          className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
        >
          {selectedConv ? <ChevronLeft size={20} /> : <ArrowLeft size={18} />}
        </button>
        <div className="flex-1 min-w-0">
          {selectedConv ? (
            <>
              <h1 className="font-bold text-foreground truncate">{selectedConv.acheteur_nom}</h1>
              <p className="text-xs text-muted-foreground truncate">{selectedConv.acheteur_contact}</p>
            </>
          ) : (
            <h1 className="font-bold text-foreground">Messages</h1>
          )}
        </div>
        {!selectedConv && conversations.length > 0 && (
          <span className="text-xs bg-primary/10 text-primary font-bold px-2 py-1 rounded-full">
            {conversations.length}
          </span>
        )}
      </div>

      {/* Liste de conversations OU vue chat */}
      {!selectedConv ? (
        <div className="flex-1 flex flex-col">
          {/* Barre de recherche */}
          <div className="p-3 border-b border-border bg-card">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un client..."
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" />
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-10">
              <MessageCircle size={48} className="text-muted-foreground mb-3" />
              <h3 className="font-bold text-foreground mb-1">Aucune conversation</h3>
              <p className="text-sm text-muted-foreground">
                Les messages des acheteurs s'afficheront ici.
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              {filteredConversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedConv(c)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 border-b border-border text-left transition"
                >
                  {c.produit_image ? (
                    <img
                      src={c.produit_image}
                      alt=""
                      className="w-12 h-12 rounded-full object-cover flex-shrink-0 border border-border"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary font-bold">
                        {c.acheteur_nom[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {c.acheteur_nom}
                      </p>
                      <span className="text-[10px] text-muted-foreground flex-shrink-0">
                        {formatDate(c.dernier_message_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground truncate">
                        {c.dernier_message || "Nouvelle conversation"}
                      </p>
                      {c.non_lus_vendeur > 0 && (
                        <span className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center flex-shrink-0">
                          {c.non_lus_vendeur}
                        </span>
                      )}
                    </div>
                    {c.produit_nom && (
                      <p className="text-[10px] text-primary truncate mt-0.5">
                        📦 {c.produit_nom}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Bandeau produit si conversation liée */}
          {selectedConv.produit_nom && (
            <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center gap-2">
              {selectedConv.produit_image && (
                <img
                  src={selectedConv.produit_image}
                  alt=""
                  className="w-8 h-8 rounded object-cover"
                />
              )}
              <p className="text-xs text-foreground truncate">
                <span className="text-muted-foreground">Sujet :</span>{" "}
                <span className="font-semibold">{selectedConv.produit_nom}</span>
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
            {messages.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-10">
                Aucun message pour l'instant.
              </div>
            )}
            {messages.map((m) => {
              const isMine = m.expediteur === "vendeur";
              return (
                <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                      isMine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card text-foreground border border-border rounded-bl-sm"
                    }`}
                  >
                    {m.media_url && m.media_type === "image" && (
                      <img
                        src={m.media_url}
                        alt="média"
                        className="rounded-lg mb-1 max-w-full max-h-60 object-cover"
                      />
                    )}
                    {m.media_url && m.media_type === "video" && (
                      <video
                        src={m.media_url}
                        controls
                        className="rounded-lg mb-1 max-w-full max-h-60"
                      />
                    )}
                    {m.contenu && (
                      <p className="text-sm whitespace-pre-wrap break-words">{m.contenu}</p>
                    )}
                    <p
                      className={`text-[10px] mt-1 ${
                        isMine ? "text-primary-foreground/70" : "text-muted-foreground"
                      }`}
                    >
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3 bg-card">
            <div className="flex items-end gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || sending}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center text-foreground disabled:opacity-50"
                title="Envoyer une image ou vidéo"
              >
                {uploading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <ImageIcon size={18} />
                )}
              </button>
              <Textarea
                value={nouveauMessage}
                onChange={(e) => setNouveauMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    envoyerMessage(nouveauMessage);
                  }
                }}
                placeholder="Répondre au client..."
                rows={1}
                className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              />
              <Button
                onClick={() => envoyerMessage(nouveauMessage)}
                disabled={sending || !nouveauMessage.trim()}
                size="icon"
                className="rounded-full flex-shrink-0"
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
