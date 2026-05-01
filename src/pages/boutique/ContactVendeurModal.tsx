import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  X, Send, MessageCircle, Image as ImageIcon, Video,
  Package, ShoppingCart, CheckCircle, AlertCircle
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  boutiqueId: string;
  produitId?: string;
  produitNom?: string;
  commandeId?: string;
  commandeNumero?: string;
}

export default function ContactVendeurModal({
  isOpen, onClose, boutiqueId, produitId, produitNom, commandeId, commandeNumero
}: Props) {
  const [step, setStep]         = useState<"infos" | "chat">("infos");
  const [nom, setNom]           = useState("");
  const [tel, setTel]           = useState("");
  const [email, setEmail]       = useState("");
  const [message, setMessage]   = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [sending, setSending]   = useState(false);
  const [discId, setDiscId]     = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

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

  // Étape 1 : créer la discussion et envoyer le premier message
  const handleStart = async () => {
    if (!nom.trim()) { setError("Votre nom est obligatoire."); return; }
    if (!message.trim() && !uploadFile) { setError("Écrivez un message."); return; }
    setError(null);
    setSending(true);

    // 1. Créer la discussion
    const { data: disc, error: discErr } = await (supabase as any)
      .from("discussions")
      .insert({
        boutique_id:   boutiqueId,
        produit_id:    produitId || null,
        commande_id:   commandeId || null,
        acheteur_nom:  nom.trim(),
        acheteur_tel:  tel.trim() || null,
        acheteur_email: email.trim() || null,
        statut:        "ouvert",
        lu_vendeur:    false,
        lu_acheteur:   true,
      })
      .select()
      .single();

    if (discErr || !disc) {
      setError("Erreur lors de la création de la discussion. Réessayez.");
      setSending(false);
      return;
    }

    setDiscId(disc.id);

    // 2. Upload fichier si présent
    let fichierUrl: string | null = null;
    let fichierType: string | null = null;
    let fichierNom: string | null = null;

    if (uploadFile) {
      const ext  = uploadFile.name.split(".").pop();
      const path = `discussions/${disc.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("medias").upload(path, uploadFile, { upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("medias").getPublicUrl(path);
        fichierUrl  = pub.publicUrl;
        fichierType = uploadFile.type.startsWith("video") ? "video" : "image";
        fichierNom  = uploadFile.name;
      }
    }

    // 3. Envoyer le premier message
    const { data: msg } = await (supabase as any)
      .from("messages_discussion")
      .insert({
        discussion_id: disc.id,
        expediteur:    "acheteur",
        contenu:       message.trim() || null,
        fichier_url:   fichierUrl,
        fichier_type:  fichierType,
        fichier_nom:   fichierNom,
      })
      .select()
      .single();

    if (msg) setMessages([msg]);
    setMessage("");
    setUploadFile(null);
    setSending(false);
    setStep("chat");
    setSent(true);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // Étape 2 : envoyer un message supplémentaire dans la discussion existante
  const handleSendMore = async () => {
    if (!discId || (!message.trim() && !uploadFile)) return;
    setSending(true);

    let fichierUrl: string | null = null;
    let fichierType: string | null = null;
    let fichierNom: string | null = null;

    if (uploadFile) {
      const ext  = uploadFile.name.split(".").pop();
      const path = `discussions/${discId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("medias").upload(path, uploadFile, { upsert: true });
      if (!upErr) {
        const { data: pub } = supabase.storage.from("medias").getPublicUrl(path);
        fichierUrl  = pub.publicUrl;
        fichierType = uploadFile.type.startsWith("video") ? "video" : "image";
        fichierNom  = uploadFile.name;
      }
      setUploadFile(null);
    }

    const { data: msg } = await (supabase as any)
      .from("messages_discussion")
      .insert({
        discussion_id: discId,
        expediteur:    "acheteur",
        contenu:       message.trim() || null,
        fichier_url:   fichierUrl,
        fichier_type:  fichierType,
        fichier_nom:   fichierNom,
      })
      .select()
      .single();

    // Recharger tous les messages (y compris réponses du vendeur)
    const { data: allMsgs } = await (supabase as any)
      .from("messages_discussion")
      .select("*")
      .eq("discussion_id", discId)
      .order("created_at", { ascending: true });

    if (allMsgs) setMessages(allMsgs);
    setMessage("");
    setSending(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#305CDE]/10 rounded-2xl flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-[#305CDE]" />
            </div>
            <div>
              <p className="font-black text-gray-900 text-sm">Contacter le vendeur</p>
              {produitNom && (
                <p className="text-xs text-[#305CDE] font-semibold flex items-center gap-1">
                  <Package className="w-3 h-3" />{produitNom}
                </p>
              )}
              {commandeNumero && (
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <ShoppingCart className="w-3 h-3" />Commande #{commandeNumero}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* ── Étape 1 : Formulaire ── */}
        {step === "infos" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <p className="text-sm text-gray-500">Posez votre question directement au vendeur. Il vous répondra dès que possible.</p>

            {/* Infos acheteur */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Votre nom *</label>
                <input
                  value={nom}
                  onChange={e => setNom(e.target.value)}
                  placeholder="Ex: Jean Dupont"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1 block">Téléphone (optionnel)</label>
                <input
                  value={tel}
                  onChange={e => setTel(e.target.value)}
                  placeholder="+229 97 00 00 00"
                  className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="text-xs font-bold text-gray-600 mb-1 block">Votre message *</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Ex: Quelles tailles sont disponibles ? Y a-t-il une couleur rouge ?"
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 resize-none"
              />
            </div>

            {/* Pièce jointe */}
            <div>
              <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
              {uploadFile ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                  {uploadFile.type.startsWith("image") ? (
                    <img src={URL.createObjectURL(uploadFile)} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <Video className="w-10 h-10 text-[#305CDE]" />
                  )}
                  <p className="flex-1 text-xs text-gray-600 truncate">{uploadFile.name}</p>
                  <button onClick={() => setUploadFile(null)} className="p-1 rounded-full hover:bg-blue-100">
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center gap-2 p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-[#305CDE] hover:bg-[#305CDE]/5 transition-colors text-sm text-gray-500"
                >
                  <ImageIcon className="w-4 h-4" />
                  Joindre une image ou vidéo (optionnel)
                </button>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={sending}
              className="w-full h-12 bg-[#305CDE] text-white font-black rounded-2xl flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-[#305CDE]/90 transition-colors"
            >
              {sending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <><Send className="w-4 h-4" /> Envoyer le message</>
              )}
            </button>
          </div>
        )}

        {/* ── Étape 2 : Chat ── */}
        {step === "chat" && (
          <>
            {/* Confirmation */}
            {sent && (
              <div className="flex items-center gap-2 p-3 mx-4 mt-4 bg-green-50 border border-green-200 rounded-2xl flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <p className="text-xs text-green-700 font-semibold">Message envoyé ! Le vendeur vous répondra bientôt.</p>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map(msg => {
                const isAcheteur = msg.expediteur === "acheteur";
                return (
                  <div key={msg.id} className={`flex ${isAcheteur ? "justify-end" : "justify-start"}`}>
                    {!isAcheteur && (
                      <div className="w-7 h-7 bg-[#305CDE] rounded-full flex items-center justify-center text-xs text-white font-bold mr-2 flex-shrink-0 self-end">
                        <Store className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div className={`max-w-[75%] flex flex-col ${isAcheteur ? "items-end" : "items-start"}`}>
                      {msg.fichier_url && msg.fichier_type === "image" && (
                        <img src={msg.fichier_url} alt="" className="max-w-[200px] rounded-2xl mb-1 cursor-pointer" onClick={() => window.open(msg.fichier_url, "_blank")} />
                      )}
                      {msg.fichier_url && msg.fichier_type === "video" && (
                        <video src={msg.fichier_url} controls className="max-w-[200px] rounded-2xl mb-1" />
                      )}
                      {msg.contenu && (
                        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                          isAcheteur ? "bg-[#305CDE] text-white rounded-br-sm" : "bg-white text-gray-800 border border-gray-100 rounded-bl-sm"
                        }`}>
                          {msg.contenu}
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">
                        {isAcheteur ? "Vous" : "Vendeur"} · {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Zone de saisie */}
            <div className="p-3 border-t border-gray-100 bg-white flex-shrink-0">
              {uploadFile && (
                <div className="flex items-center gap-2 p-2 mb-2 bg-blue-50 rounded-xl">
                  <p className="flex-1 text-xs text-gray-600 truncate">{uploadFile.name}</p>
                  <button onClick={() => setUploadFile(null)}><X className="w-4 h-4 text-gray-400" /></button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50">
                  <ImageIcon className="w-5 h-5 text-gray-400" />
                </button>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMore(); } }}
                  placeholder="Répondre..."
                  rows={1}
                  className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 resize-none"
                />
                <button
                  onClick={handleSendMore}
                  disabled={sending || (!message.trim() && !uploadFile)}
                  className="p-2.5 rounded-xl bg-[#305CDE] text-white disabled:opacity-50"
                >
                  {sending ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
