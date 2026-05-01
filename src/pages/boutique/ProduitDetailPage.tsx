/**
 * NEXORA — ProduitDetailsPage
 * Page publique de détail produit avec :
 *   - Galerie photos interactive
 *   - Sélecteur couleurs / tailles / options visuels
 *   - Discussion intégrée acheteur ↔ vendeur (sans compte requis)
 *   - Stock en temps réel par combinaison
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, ShoppingCart, MessageCircle, Send, X, ChevronLeft,
  ChevronRight, Star, Package, Shield, Truck, RefreshCw, Share2,
  Heart, Check, Plus, Minus, ImageIcon, Loader2, ZoomIn,
  Mic, MicOff, Play, Pause, Square,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { useToast } from "@/hooks/use-toast";
import { formatPrix } from "@/lib/devise-utils";
import { isUUID } from "@/lib/slugUtils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface OptionProduit {
  id: string;
  type_option: "couleur" | "taille" | "matiere" | "style" | "autre";
  label: string;
  valeur: string;
  code_hex?: string | null;
  image_url?: string | null;
  prix_supplement: number;
  stock: number;
  stock_illimite: boolean;
}

interface ProduitDetail {
  id: string;
  boutique_id: string;
  nom: string;
  slug: string;
  description: string | null;
  prix: number;
  prix_promo: number | null;
  photos: string[] | null;
  stock: number;
  stock_illimite: boolean;
  categorie: string | null;
  poids: string | null;
  dimensions: string | null;
  sku: string | null;
  politique_remboursement: string | null;
  type_produit: string;
}

interface BoutiqueInfo {
  id: string;
  nom: string;
  slug: string;
  devise: string;
}

interface Message {
  id: string;
  expediteur: "acheteur" | "vendeur";
  contenu: string | null;
  fichier_url: string | null;
  fichier_type: string | null;
  created_at: string;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const SESSION_KEY = "nexora_chat_session_v2";

function getSessionId(): string {
  let sid = localStorage.getItem(SESSION_KEY);
  if (!sid) {
    sid = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, sid);
  }
  return sid;
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "À l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Lecteur audio acheteur ────────────────────────────────────────────────────
function AudioPlayer({ url, isMe }: { url: string; isMe: boolean }) {
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
      isMe
        ? "bg-[#305CDE] text-white rounded-br-sm"
        : "bg-white border border-neutral-100 rounded-bl-sm"
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
        {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
      </button>
      <div className={`flex-1 h-1.5 rounded-full relative ${isMe ? "bg-white/30" : "bg-neutral-200"}`}>
        <div
          className={`absolute left-0 top-0 h-1.5 rounded-full transition-all ${isMe ? "bg-white" : "bg-[#305CDE]"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <span className={`text-[10px] flex-shrink-0 tabular-nums ${isMe ? "text-white/80" : "text-neutral-400"}`}>
        {formatDuration(duration)}
      </span>
    </div>
  );
}

// ─── Composant principal ───────────────────────────────────────────────────────

export default function ProduitDetailsPage() {
  const { slug: boutiqueSlug, produitSlug } = useParams<{ slug: string; produitSlug: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToCart } = useCart();

  // ── Data
  const [produit, setProduit]       = useState<ProduitDetail | null>(null);
  const [boutique, setBoutique]     = useState<BoutiqueInfo | null>(null);
  const [options, setOptions]       = useState<OptionProduit[]>([]);
  const [loading, setLoading]       = useState(true);

  // ── Galerie
  const [photoIndex, setPhotoIndex]     = useState(0);
  const [zoomOpen, setZoomOpen]         = useState(false);

  // ── Sélection options
  const [selectedOptions, setSelectedOptions] = useState<Record<string, OptionProduit>>({});
  const [quantity, setQuantity]               = useState(1);
  const [wishlist, setWishlist]               = useState(false);

  // ── Chat intégré
  const [chatOpen, setChatOpen]           = useState(false);
  const [chatStep, setChatStep]           = useState<"info" | "chat">("info");
  const [acheteurNom, setAcheteurNom]     = useState("");
  const [acheteurContact, setAcheteurContact] = useState("");
  const [discussionId, setDiscussionId]   = useState<string | null>(null);
  const [messages, setMessages]           = useState<Message[]>([]);
  const [newMsg, setNewMsg]               = useState("");
  const [sending, setSending]             = useState(false);
  const [chatLoading, setChatLoading]     = useState(false);
  const [uploadFile, setUploadFile]       = useState<File | null>(null);

  // Audio recording
  const [recording, setRecording]             = useState(false);
  const [audioBlob, setAudioBlob]             = useState<Blob | null>(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [recordSeconds, setRecordSeconds]     = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef   = useRef<Blob[]>([]);
  const recordTimerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unread notification for buyer
  const [hasUnread, setHasUnread] = useState(false);

  const fileInputRef    = useRef<HTMLInputElement>(null);
  const chatBottomRef   = useRef<HTMLDivElement>(null);
  const pollRef         = useRef<ReturnType<typeof setInterval> | null>(null);

  // ─── Charger produit & boutique ───────────────────────────────────────────

  useEffect(() => {
    (async () => {
      if (!boutiqueSlug || !produitSlug) return;
      setLoading(true);

      // 1. Boutique
      const boutiqueQuery = isUUID(boutiqueSlug)
        ? (supabase as any).from("boutiques").select("id,nom,slug,devise").eq("id", boutiqueSlug)
        : (supabase as any).from("boutiques").select("id,nom,slug,devise").eq("slug", boutiqueSlug);
      const { data: boutiqueData } = await boutiqueQuery.maybeSingle();
      if (!boutiqueData) { setLoading(false); return; }
      setBoutique(boutiqueData);

      // 2. Produit
      const produitQuery = isUUID(produitSlug)
        ? (supabase as any).from("produits").select("*").eq("id", produitSlug)
        : (supabase as any).from("produits").select("*").eq("slug", produitSlug).eq("boutique_id", boutiqueData.id);
      const { data: produitData } = await produitQuery.maybeSingle();
      if (!produitData) { setLoading(false); return; }
      setProduit(produitData);

      // 3. Options (couleurs, tailles…)
      const { data: optionsData } = await (supabase as any)
        .from("options_produit")
        .select("*")
        .eq("produit_id", produitData.id)
        .eq("actif", true)
        .order("position");
      setOptions((optionsData as OptionProduit[]) || []);

      // 4. Discussion existante (via session)
      const sessionId = getSessionId();
      const { data: existingDisc } = await (supabase as any)
        .from("discussions")
        .select("id")
        .eq("acheteur_session_id", sessionId)
        .eq("produit_id", produitData.id)
        .maybeSingle();
      if (existingDisc?.id) {
        setDiscussionId(existingDisc.id);
        setChatStep("chat");
        // Pré-remplir nom/contact depuis localStorage
        const stored = localStorage.getItem("nexora_acheteur_info");
        if (stored) {
          try { const info = JSON.parse(stored); setAcheteurNom(info.nom || ""); setAcheteurContact(info.contact || ""); } catch {}
        }
      }

      setLoading(false);
    })();
  }, [boutiqueSlug, produitSlug]);

  // ─── Options groupées par type ─────────────────────────────────────────────

  const optionsByType = options.reduce<Record<string, OptionProduit[]>>((acc, opt) => {
    if (!acc[opt.type_option]) acc[opt.type_option] = [];
    acc[opt.type_option].push(opt);
    return acc;
  }, {});

  const typeLabels: Record<string, string> = {
    couleur: "Couleur",
    taille:  "Taille",
    matiere: "Matière",
    style:   "Style",
    autre:   "Option",
  };

  // ─── Prix calculé (avec suppléments des options sélectionnées) ─────────────

  const prixBase = produit ? (produit.prix_promo ?? produit.prix) : 0;
  const prixSupplement = Object.values(selectedOptions).reduce((sum, o) => sum + (o.prix_supplement || 0), 0);
  const prixFinal = prixBase + prixSupplement;

  // ─── Panier ───────────────────────────────────────────────────────────────

  const handleAddToCart = () => {
    if (!produit || !boutique) return;
    addToCart({
      id:         produit.id,
      boutique_id: produit.boutique_id,
      nom:        produit.nom,
      prix:       prixFinal,
      photo:      (produit.photos || [])[0] || "",
      quantity,
      options:    Object.values(selectedOptions).map(o => `${o.label}: ${o.valeur}`).join(", ") || undefined,
    });
    toast({ title: "Ajouté au panier ✓", description: produit.nom });
  };

  // ─── Chat ─────────────────────────────────────────────────────────────────

  const loadMessages = async (discId: string, scrollToBottom = false) => {
    const { data } = await (supabase as any)
      .from("messages_discussion")
      .select("*")
      .eq("discussion_id", discId)
      .order("created_at", { ascending: true });
    const msgs = (data as Message[]) || [];
    setMessages(msgs);
    if (scrollToBottom) {
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
    // Marquer lu côté acheteur + détecter messages non lus du vendeur
    const vendeurUnread = msgs.filter(m => m.expediteur === "vendeur" && !m.lu);
    if (vendeurUnread.length > 0 && !chatOpen) {
      setHasUnread(true);
    }
    await (supabase as any)
      .from("messages_discussion")
      .update({ lu: true })
      .eq("discussion_id", discId)
      .eq("expediteur", "vendeur");
    if (chatOpen) setHasUnread(false);
  };

  useEffect(() => {
    if (!discussionId) return;
    loadMessages(discussionId, true);
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => loadMessages(discussionId, false), 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [discussionId]);

  const startDiscussion = async () => {
    if (!acheteurNom.trim() || !acheteurContact.trim() || !produit || !boutique) return;
    setChatLoading(true);
    const sessionId = getSessionId();
    localStorage.setItem("nexora_acheteur_info", JSON.stringify({ nom: acheteurNom, contact: acheteurContact }));

    const { data: disc } = await (supabase as any)
      .from("discussions")
      .insert({
        boutique_id:         boutique.id,
        produit_id:          produit.id,
        acheteur_nom:        acheteurNom.trim(),
        acheteur_tel:        acheteurContact.includes("@") ? null : acheteurContact.trim(),
        acheteur_email:      acheteurContact.includes("@") ? acheteurContact.trim() : null,
        acheteur_session_id: sessionId,
        statut:              "ouvert",
      })
      .select("id")
      .single();

    if (disc?.id) {
      setDiscussionId(disc.id);
      setChatStep("chat");
    }
    setChatLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const max = file.type.startsWith("video") ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max) { toast({ title: "Fichier trop volumineux", variant: "destructive" }); return; }
    setUploadFile(file);
    setAudioBlob(null); setAudioPreviewUrl(null);
  };

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
    } catch { toast({ title: "Microphone non accessible", variant: "destructive" }); }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
  };

  const cancelAudio = () => { setAudioBlob(null); setAudioPreviewUrl(null); setRecordSeconds(0); };

  const sendMessage = async () => {
    if (!discussionId || (!newMsg.trim() && !uploadFile && !audioBlob)) return;
    setSending(true);

    let fichierUrl: string | null = null;
    let fichierType: string | null = null;
    let fichierNom: string | null = null;

    if (audioBlob) {
      const fileName = `audio_${Date.now()}.webm`;
      const path = `discussions/${discussionId}/${fileName}`;
      const { error } = await supabase.storage.from("medias").upload(path, audioBlob, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from("medias").getPublicUrl(path);
        fichierUrl = pub.publicUrl; fichierType = "audio"; fichierNom = fileName;
      }
      setAudioBlob(null); setAudioPreviewUrl(null);
    } else if (uploadFile) {
      const ext = uploadFile.name.split(".").pop();
      const path = `discussions/${discussionId}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("discussion-attachments").upload(path, uploadFile, { upsert: true });
      if (!error) {
        const { data: pub } = supabase.storage.from("discussion-attachments").getPublicUrl(path);
        fichierUrl  = pub.publicUrl;
        fichierType = uploadFile.type.startsWith("video") ? "video" : "image";
        fichierNom  = uploadFile.name;
      }
      setUploadFile(null);
    }

    if (!newMsg.trim() && !fichierUrl) { setSending(false); return; }

    await (supabase as any).from("messages_discussion").insert({
      discussion_id: discussionId,
      expediteur:    "acheteur",
      contenu:       newMsg.trim() || null,
      fichier_url:   fichierUrl,
      fichier_type:  fichierType,
      fichier_nom:   fichierNom,
    });

    // Notifier vendeur → lu_vendeur = false
    await (supabase as any).from("discussions")
      .update({ updated_at: new Date().toISOString(), lu_vendeur: false })
      .eq("id", discussionId);

    setNewMsg("");
    setSending(false);
    await loadMessages(discussionId, true);
  };

  // ─── Photos ───────────────────────────────────────────────────────────────

  const photos = produit?.photos || [];

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-[#305CDE] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-neutral-400 font-medium">Chargement du produit…</p>
      </div>
    </div>
  );

  if (!produit || !boutique) return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="text-center">
        <Package className="w-12 h-12 text-neutral-200 mx-auto mb-3" />
        <p className="text-neutral-500 font-semibold">Produit introuvable</p>
      </div>
    </div>
  );

  const hasPromo = produit.prix_promo && produit.prix_promo < produit.prix;
  const discountPct = hasPromo ? Math.round((1 - produit.prix_promo! / produit.prix) * 100) : 0;

  return (
    <div className="min-h-screen bg-neutral-50 font-sans">
      {/* ── Topbar ── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-neutral-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-800 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">{boutique.nom}</span>
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.share?.({ title: produit.nom, url: window.location.href })}
              className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
            >
              <Share2 className="w-4 h-4 text-neutral-500" />
            </button>
            <button
              onClick={() => setWishlist(w => !w)}
              className={`p-2 rounded-xl transition-colors ${wishlist ? "text-red-500 bg-red-50" : "hover:bg-neutral-100 text-neutral-500"}`}
            >
              <Heart className={`w-4 h-4 ${wishlist ? "fill-current" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-10">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">

          {/* ── Colonne gauche : Galerie ── */}
          <div className="space-y-3">
            {/* Photo principale */}
            <div className="relative aspect-square bg-white rounded-3xl overflow-hidden shadow-md group cursor-zoom-in" onClick={() => setZoomOpen(true)}>
              {photos.length > 0 ? (
                <img
                  src={photos[photoIndex]}
                  alt={produit.nom}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-100">
                  <Package className="w-16 h-16 text-neutral-300" />
                </div>
              )}
              {hasPromo && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow">
                  -{discountPct}%
                </div>
              )}
              {photos.length > 1 && (
                <>
                  <button
                    onClick={e => { e.stopPropagation(); setPhotoIndex(i => (i - 1 + photos.length) % photos.length); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setPhotoIndex(i => (i + 1) % photos.length); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-white/90 rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
              <div className="absolute bottom-3 right-3 w-8 h-8 bg-white/80 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <ZoomIn className="w-3.5 h-3.5 text-neutral-600" />
              </div>
            </div>

            {/* Miniatures */}
            {photos.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {photos.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIndex(i)}
                    className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${i === photoIndex ? "border-[#305CDE] shadow-md shadow-[#305CDE]/20" : "border-transparent hover:border-neutral-300"}`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Badges info */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Truck,  label: "Livraison" },
                { icon: Shield, label: "Sécurisé" },
                { icon: RefreshCw, label: "Retours" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 p-3 bg-white rounded-2xl border border-neutral-100">
                  <Icon className="w-4 h-4 text-[#305CDE]" />
                  <span className="text-[10px] font-semibold text-neutral-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Colonne droite : Infos & options ── */}
          <div className="space-y-5">
            {/* Catégorie & titre */}
            {produit.categorie && (
              <span className="inline-block text-xs font-bold text-[#305CDE] bg-[#305CDE]/10 px-3 py-1 rounded-full">
                {produit.categorie}
              </span>
            )}
            <h1 className="text-2xl lg:text-3xl font-black text-neutral-900 leading-tight">{produit.nom}</h1>

            {/* Avis fictif (placeholder visuel) */}
            <div className="flex items-center gap-2">
              <div className="flex">
                {[1,2,3,4,5].map(s => <Star key={s} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />)}
              </div>
              <span className="text-xs text-neutral-400 font-medium">Nouveau produit</span>
            </div>

            {/* Prix */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-neutral-900">
                {formatPrix(prixFinal, boutique.devise)}
              </span>
              {hasPromo && (
                <span className="text-lg text-neutral-400 line-through font-medium">
                  {formatPrix(produit.prix + prixSupplement, boutique.devise)}
                </span>
              )}
              {prixSupplement > 0 && (
                <span className="text-sm text-[#305CDE] font-semibold">
                  +{formatPrix(prixSupplement, boutique.devise)} options
                </span>
              )}
            </div>

            {/* ── Options (couleurs, tailles…) ── */}
            {Object.entries(optionsByType).map(([type, opts]) => (
              <div key={type} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-bold text-neutral-700">
                    {typeLabels[type] || type}
                    {selectedOptions[type] && (
                      <span className="ml-2 font-normal text-neutral-500">— {selectedOptions[type].valeur}</span>
                    )}
                  </p>
                </div>

                {type === "couleur" ? (
                  /* Swatch couleurs */
                  <div className="flex flex-wrap gap-2">
                    {opts.map(opt => {
                      const isSelected = selectedOptions[type]?.id === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedOptions(prev => ({
                            ...prev,
                            [type]: isSelected ? (delete prev[type], { ...prev })[type] : opt,
                          }))}
                          className={`relative group transition-all ${isSelected ? "scale-110" : "hover:scale-105"}`}
                          title={opt.valeur}
                        >
                          {opt.image_url ? (
                            <div className={`w-10 h-10 rounded-xl overflow-hidden border-2 transition-all ${isSelected ? "border-[#305CDE] shadow-lg shadow-[#305CDE]/30" : "border-transparent hover:border-neutral-300"}`}>
                              <img src={opt.image_url} alt={opt.valeur} className="w-full h-full object-cover" />
                            </div>
                          ) : (
                            <div
                              className={`w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center ${isSelected ? "border-[#305CDE] shadow-lg shadow-[#305CDE]/30" : "border-neutral-200 hover:border-neutral-400"}`}
                              style={{ backgroundColor: opt.code_hex || "#e5e7eb" }}
                            >
                              {isSelected && <Check className="w-4 h-4 text-white drop-shadow" />}
                            </div>
                          )}
                          {opt.prix_supplement > 0 && (
                            <span className="absolute -top-1 -right-1 text-[9px] bg-[#305CDE] text-white rounded-full px-1 font-bold">
                              +{opt.prix_supplement}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* Boutons texte (tailles, matières…) */
                  <div className="flex flex-wrap gap-2">
                    {opts.map(opt => {
                      const isSelected = selectedOptions[type]?.id === opt.id;
                      const epuise = !opt.stock_illimite && opt.stock === 0;
                      return (
                        <button
                          key={opt.id}
                          disabled={epuise}
                          onClick={() => setSelectedOptions(prev => ({
                            ...prev,
                            [type]: isSelected ? (delete prev[type], { ...prev })[type] : opt,
                          }))}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all relative
                            ${epuise ? "opacity-40 cursor-not-allowed line-through border-neutral-200 text-neutral-400" : ""}
                            ${isSelected && !epuise ? "bg-[#305CDE] text-white border-[#305CDE] shadow-lg shadow-[#305CDE]/30" : ""}
                            ${!isSelected && !epuise ? "border-neutral-200 text-neutral-700 hover:border-[#305CDE] hover:text-[#305CDE]" : ""}
                          `}
                        >
                          {opt.valeur}
                          {opt.prix_supplement > 0 && !epuise && (
                            <span className="absolute -top-1.5 -right-1.5 text-[9px] bg-amber-400 text-white rounded-full px-1 font-bold">
                              +{opt.prix_supplement}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {/* Quantité */}
            <div className="flex items-center gap-4">
              <p className="text-sm font-bold text-neutral-700">Quantité</p>
              <div className="flex items-center gap-1 bg-neutral-100 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(q => Math.max(1, q - 1))}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow transition-all"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-black text-neutral-800">{quantity}</span>
                <button
                  onClick={() => setQuantity(q => q + 1)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white hover:shadow transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              {!produit.stock_illimite && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${produit.stock > 5 ? "bg-green-50 text-green-600" : produit.stock > 0 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>
                  {produit.stock > 0 ? `${produit.stock} en stock` : "Rupture de stock"}
                </span>
              )}
            </div>

            {/* Boutons action */}
            <div className="space-y-2.5 pt-1">
              <button
                onClick={handleAddToCart}
                disabled={!produit.stock_illimite && produit.stock === 0}
                className="w-full flex items-center justify-center gap-2.5 py-4 bg-[#305CDE] text-white font-black text-base rounded-2xl shadow-lg shadow-[#305CDE]/30 hover:bg-[#2449c7] active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ShoppingCart className="w-5 h-5" />
                Ajouter au panier — {formatPrix(prixFinal * quantity, boutique.devise)}
              </button>

              <button
                onClick={() => { setChatOpen(true); setHasUnread(false); }}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-white text-[#305CDE] font-bold text-sm border-2 border-[#305CDE]/30 rounded-2xl hover:bg-[#305CDE]/5 transition-all relative"
              >
                <MessageCircle className="w-4 h-4" />
                Contacter le vendeur
                {hasUnread && <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />}
                {!hasUnread && discussionId && <span className="w-2 h-2 bg-green-500 rounded-full" />}
              </button>
            </div>

            {/* Description */}
            {produit.description && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-2">
                <h3 className="font-bold text-sm text-neutral-700">Description</h3>
                <p className="text-sm text-neutral-600 leading-relaxed whitespace-pre-line">{produit.description}</p>
              </div>
            )}

            {/* Détails techniques */}
            {(produit.poids || produit.dimensions || produit.sku) && (
              <div className="bg-white rounded-2xl border border-neutral-100 p-5 space-y-3">
                <h3 className="font-bold text-sm text-neutral-700">Caractéristiques</h3>
                <div className="space-y-2">
                  {produit.sku && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">SKU</span>
                      <span className="font-semibold text-neutral-800 font-mono">{produit.sku}</span>
                    </div>
                  )}
                  {produit.poids && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Poids</span>
                      <span className="font-semibold text-neutral-800">{produit.poids}</span>
                    </div>
                  )}
                  {produit.dimensions && (
                    <div className="flex justify-between text-sm">
                      <span className="text-neutral-500">Dimensions</span>
                      <span className="font-semibold text-neutral-800">{produit.dimensions}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Politique retour */}
            {produit.politique_remboursement && (
              <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 text-sm text-amber-800">
                <p className="font-bold mb-1 flex items-center gap-1.5"><Shield className="w-4 h-4" />Politique de retour</p>
                <p className="leading-relaxed">{produit.politique_remboursement}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal Chat intégré ─────────────────────────────────────────────── */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setChatOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden flex flex-col"
            style={{ maxHeight: "90vh", minHeight: "420px" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-neutral-100 bg-gradient-to-r from-[#305CDE] to-[#4a76f5]">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-black text-sm truncate">{boutique.nom}</p>
                <p className="text-white/70 text-xs truncate">{produit.nom}</p>
              </div>
              <button onClick={() => setChatOpen(false)} className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            {chatStep === "info" ? (
              /* ── Étape 1 : Saisir nom & contact ── */
              <div className="flex-1 p-6 flex flex-col gap-4">
                <div className="text-center space-y-1">
                  <p className="font-black text-neutral-800">Avant de commencer</p>
                  <p className="text-sm text-neutral-500">Dites-nous qui vous êtes pour que le vendeur puisse vous répondre.</p>
                </div>
                {/* Produit mini */}
                <div className="flex items-center gap-3 p-3 bg-[#305CDE]/5 rounded-2xl border border-[#305CDE]/10">
                  {photos[0] && <img src={photos[0]} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-xs text-neutral-500 font-medium">Demande à propos de :</p>
                    <p className="text-sm font-bold text-neutral-800 truncate">{produit.nom}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-neutral-600 mb-1.5 block">Votre nom *</label>
                    <input
                      value={acheteurNom}
                      onChange={e => setAcheteurNom(e.target.value)}
                      placeholder="Ex: Jean Dupont"
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 bg-neutral-50"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-neutral-600 mb-1.5 block">Téléphone ou Email *</label>
                    <input
                      value={acheteurContact}
                      onChange={e => setAcheteurContact(e.target.value)}
                      placeholder="Ex: +229 97 00 00 00 ou email@..."
                      className="w-full px-4 py-3 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 bg-neutral-50"
                    />
                  </div>
                </div>
                <button
                  onClick={startDiscussion}
                  disabled={!acheteurNom.trim() || !acheteurContact.trim() || chatLoading}
                  className="w-full py-3.5 bg-[#305CDE] text-white font-black rounded-xl hover:bg-[#2449c7] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {chatLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Démarrer la conversation
                </button>
              </div>
            ) : (
              /* ── Étape 2 : Chat ── */
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-neutral-50">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center">
                      <MessageCircle className="w-8 h-8 text-neutral-200 mb-2" />
                      <p className="text-sm text-neutral-400">Envoyez votre premier message !</p>
                      <p className="text-xs text-neutral-300 mt-1">Le vendeur vous répondra très bientôt.</p>
                    </div>
                  ) : (
                    messages.map(msg => {
                      const isMe = msg.expediteur === "acheteur";
                      return (
                        <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                          {!isMe && (
                            <div className="w-7 h-7 rounded-full bg-[#305CDE] flex items-center justify-center text-white text-xs font-black mr-2 flex-shrink-0 self-end">
                              V
                            </div>
                          )}
                          <div className={`max-w-[78%] space-y-1 ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                            {msg.fichier_url && msg.fichier_type === "image" && (
                              <img src={msg.fichier_url} alt="img" className="max-w-[180px] rounded-xl object-cover cursor-pointer" onClick={() => window.open(msg.fichier_url!, "_blank")} />
                            )}
                            {msg.fichier_url && msg.fichier_type === "video" && (
                              <video src={msg.fichier_url} controls className="max-w-[180px] rounded-xl" />
                            )}
                            {msg.fichier_url && msg.fichier_type === "audio" && (
                              <AudioPlayer url={msg.fichier_url} isMe={isMe} />
                            )}
                            {msg.contenu && (
                              <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? "bg-[#305CDE] text-white rounded-br-sm" : "bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm"}`}>
                                {msg.contenu}
                              </div>
                            )}
                            <p className="text-[10px] text-neutral-400 px-1">{timeAgo(msg.created_at)}</p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatBottomRef} />
                </div>

                {/* Aperçu fichier */}
                {uploadFile && (
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex items-center gap-2">
                    {uploadFile.type.startsWith("image") ? (
                      <img src={URL.createObjectURL(uploadFile)} className="w-10 h-10 rounded-lg object-cover" />
                    ) : <ImageIcon className="w-5 h-5 text-[#305CDE]" />}
                    <p className="flex-1 text-xs text-neutral-600 truncate">{uploadFile.name}</p>
                    <button onClick={() => setUploadFile(null)}><X className="w-4 h-4 text-neutral-400" /></button>
                  </div>
                )}

                {/* Aperçu audio prêt */}
                {audioPreviewUrl && !recording && (
                  <div className="px-4 py-2 bg-[#305CDE]/5 border-t border-[#305CDE]/10 flex items-center gap-3">
                    <audio src={audioPreviewUrl} controls className="h-8 flex-1 max-w-[220px]" />
                    <button onClick={cancelAudio} className="p-1 rounded-full hover:bg-[#305CDE]/10">
                      <X className="w-4 h-4 text-neutral-400" />
                    </button>
                  </div>
                )}

                {/* Enregistrement en cours */}
                {recording && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-100 flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                    <span className="text-sm text-red-600 font-semibold flex-1">
                      Enregistrement… {formatDuration(recordSeconds)}
                    </span>
                    <button
                      onClick={stopRecording}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 transition-colors"
                    >
                      <Square className="w-3 h-3" /> Arrêter
                    </button>
                  </div>
                )}

                <div className="p-3 border-t border-neutral-100 bg-white">
                  <div className="flex items-end gap-2">
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-2.5 rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors flex-shrink-0">
                      <ImageIcon className="w-4 h-4 text-neutral-400" />
                    </button>
                    {/* Micro */}
                    {!recording ? (
                      <button
                        onClick={startRecording}
                        disabled={!!audioBlob}
                        className="p-2.5 rounded-xl border border-neutral-200 hover:bg-[#305CDE]/10 hover:border-[#305CDE]/40 transition-colors flex-shrink-0 disabled:opacity-40"
                        title="Enregistrer un audio"
                      >
                        <Mic className="w-4 h-4 text-[#305CDE]" />
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="p-2.5 rounded-xl border border-red-300 bg-red-50 transition-colors flex-shrink-0 animate-pulse"
                      >
                        <MicOff className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                    <textarea
                      value={newMsg}
                      onChange={e => setNewMsg(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="Votre message…"
                      rows={1}
                      className="flex-1 px-3 py-2.5 text-sm bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#305CDE]/30 resize-none"
                      style={{ minHeight: "40px", maxHeight: "100px" }}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={sending || (!newMsg.trim() && !uploadFile && !audioBlob)}
                      className="p-2.5 bg-[#305CDE] text-white rounded-xl hover:bg-[#2449c7] transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Zoom photo ── */}
      {zoomOpen && photos[photoIndex] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setZoomOpen(false)}>
          <button className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <X className="w-5 h-5 text-white" />
          </button>
          <img src={photos[photoIndex]} alt={produit.nom} className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </div>
  );
}
