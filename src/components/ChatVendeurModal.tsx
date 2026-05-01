/**
 * NEXORA — Chat Acheteur ↔ Vendeur
 * Modal de messagerie sur la page produit avec support image/vidéo
 * Acheteur libre : nom + contact (pas de compte requis)
 */

import { useState, useEffect, useRef } from "react";
import { X, Send, Image as ImageIcon, Video, Loader2, MessageCircle } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ChatVendeurModalProps {
  open: boolean;
  onClose: () => void;
  boutiqueId: string;
  boutiqueNom: string;
  produitId?: string;
  produitNom?: string;
  produitImage?: string;
}

interface Message {
  id: string;
  expediteur: "acheteur" | "vendeur";
  contenu: string;
  media_url?: string | null;
  media_type?: "image" | "video" | null;
  created_at: string;
}

const SESSION_KEY = "nexora_chat_session";

function getOrCreateSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function getStoredAcheteurInfo() {
  try {
    const raw = localStorage.getItem("nexora_acheteur_info");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function ChatVendeurModal({
  open,
  onClose,
  boutiqueId,
  boutiqueNom,
  produitId,
  produitNom,
  produitImage,
}: ChatVendeurModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<"info" | "chat">("info");
  const [acheteurNom, setAcheteurNom] = useState("");
  const [acheteurContact, setAcheteurContact] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nouveauMessage, setNouveauMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionId = getOrCreateSessionId();

  // Pré-remplir si déjà saisi
  useEffect(() => {
    if (open) {
      const info = getStoredAcheteurInfo();
      if (info?.nom && info?.contact) {
        setAcheteurNom(info.nom);
        setAcheteurContact(info.contact);
        loadOrCreateConversation(info.nom, info.contact);
      }
    }
  }, [open]);

  // Realtime sur les messages
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_boutique",
          filter: `conversation_id=eq.${conversationId}`,
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
  }, [conversationId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadOrCreateConversation(nom: string, contact: string) {
    try {
      // Chercher conversation existante
      let query = supabase
        .from("conversations_boutique" as any)
        .select("*")
        .eq("boutique_id", boutiqueId)
        .eq("acheteur_session_id", sessionId);
      if (produitId) query = query.eq("produit_id", produitId);
      const { data: existing } = await query.maybeSingle();

      let conv: any = existing;
      if (!conv) {
        const { data: created, error } = await (supabase as any)
          .from("conversations_boutique")
          .insert({
            boutique_id: boutiqueId,
            produit_id: produitId || null,
            produit_nom: produitNom || null,
            produit_image: produitImage || null,
            acheteur_nom: nom,
            acheteur_contact: contact,
            acheteur_session_id: sessionId,
          })
          .select()
          .single();
        if (error) throw error;
        conv = created;
      }
      setConversationId(conv.id);

      // Charger messages
      const { data: msgs } = await supabase
        .from("messages_boutique" as any)
        .select("*")
        .eq("conversation_id", conv.id)
        .order("created_at", { ascending: true });
      setMessages((msgs as any) || []);

      // Marquer messages vendeur comme lus
      await (supabase as any)
        .from("conversations_boutique")
        .update({ non_lus_acheteur: 0 })
        .eq("id", conv.id);

      setStep("chat");
    } catch (err: any) {
      toast({
        title: "Erreur",
        description: err.message || "Impossible de démarrer la conversation",
        variant: "destructive",
      });
    }
  }

  function handleSubmitInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!acheteurNom.trim() || !acheteurContact.trim()) {
      toast({ title: "Tous les champs sont requis", variant: "destructive" });
      return;
    }
    localStorage.setItem(
      "nexora_acheteur_info",
      JSON.stringify({ nom: acheteurNom.trim(), contact: acheteurContact.trim() })
    );
    loadOrCreateConversation(acheteurNom.trim(), acheteurContact.trim());
  }

  async function envoyerMessage(contenu: string, mediaUrl?: string, mediaType?: "image" | "video") {
    if (!conversationId) return;
    if (!contenu.trim() && !mediaUrl) return;
    setSending(true);
    try {
      const { error } = await (supabase as any).from("messages_boutique").insert({
        conversation_id: conversationId,
        expediteur: "acheteur",
        contenu: contenu.trim(),
        media_url: mediaUrl || null,
        media_type: mediaType || null,
      });
      if (error) throw error;
      setNouveauMessage("");
    } catch (err: any) {
      toast({
        title: "Erreur d'envoi",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !conversationId) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast({ title: "Type de fichier non supporté", variant: "destructive" });
      return;
    }

    // Limite: 20 Mo
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "Fichier trop volumineux (max 20 Mo)", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${conversationId}/${Date.now()}.${ext}`;
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg h-[85vh] p-0 gap-0 bg-background flex flex-col">
        {/* Header */}
        <div className="border-b border-border px-4 py-3 flex items-center justify-between bg-card">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <MessageCircle size={18} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-sm font-bold text-foreground truncate">
                {boutiqueNom}
              </DialogTitle>
              {produitNom && (
                <p className="text-xs text-muted-foreground truncate">À propos de : {produitNom}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          >
            <X size={18} className="text-foreground" />
          </button>
        </div>

        {/* Étape : informations acheteur */}
        {step === "info" && (
          <form onSubmit={handleSubmitInfo} className="flex-1 p-6 flex flex-col justify-center space-y-4">
            <div className="text-center space-y-2 mb-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
                <MessageCircle size={28} className="text-primary" />
              </div>
              <h3 className="font-bold text-lg text-foreground">Discuter avec le vendeur</h3>
              <p className="text-sm text-muted-foreground">
                Renseignez vos coordonnées pour démarrer la conversation
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Votre nom</label>
              <Input
                value={acheteurNom}
                onChange={(e) => setAcheteurNom(e.target.value)}
                placeholder="ex: Jean Dupont"
                maxLength={100}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">
                Téléphone ou email
              </label>
              <Input
                value={acheteurContact}
                onChange={(e) => setAcheteurContact(e.target.value)}
                placeholder="ex: +229 XX XX XX XX"
                maxLength={150}
                required
              />
            </div>
            <Button type="submit" className="w-full mt-2">
              Démarrer la discussion
            </Button>
          </form>
        )}

        {/* Étape : chat */}
        {step === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {messages.length === 0 && (
                <div className="text-center text-sm text-muted-foreground py-10">
                  Aucun message pour l'instant. Envoyez le premier !
                </div>
              )}
              {messages.map((m) => {
                const isMine = m.expediteur === "acheteur";
                return (
                  <div
                    key={m.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
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
                      {m.contenu && <p className="text-sm whitespace-pre-wrap break-words">{m.contenu}</p>}
                      <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
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
                  placeholder="Écrivez votre message..."
                  rows={1}
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none"
                />
                <Button
                  onClick={() => envoyerMessage(nouveauMessage)}
                  disabled={sending || (!nouveauMessage.trim())}
                  size="icon"
                  className="rounded-full flex-shrink-0"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
