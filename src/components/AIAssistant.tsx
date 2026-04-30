/**
 * AIAssistant — Bouton flottant IA vendeur pour NEXORA
 * Visible sur toutes les pages (à ajouter dans App.tsx)
 *
 * Usage dans App.tsx :
 *   import AIAssistant from "@/components/AIAssistant";
 *   // Dans le JSX, après <SmartCartDrawer /> :
 *   <AIAssistant />
 *
 * Dépendances : lucide-react (déjà installé), supabase client (déjà installé)
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Sparkles, X, Send, Minimize2, ChevronRight,
  Zap, ShoppingBag, TrendingUp, MessageSquare, RotateCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface QuickAction {
  icon: React.ReactNode;
  label: string;
  prompt: string;
  color: string;
}

// ─── Constantes ────────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    icon: <ShoppingBag size={14} />,
    label: "Écrire une description produit",
    prompt: "Aide-moi à rédiger une description produit percutante pour augmenter mes ventes.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: <TrendingUp size={14} />,
    label: "Booster mes ventes",
    prompt: "Quelles sont les meilleures stratégies pour booster mes ventes sur NEXORA ?",
    color: "from-[#008000] to-[#008000]",
  },
  {
    icon: <Zap size={14} />,
    label: "Créer un PayLink",
    prompt: "Comment créer un PayLink efficace pour vendre rapidement sans boutique ?",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: <MessageSquare size={14} />,
    label: "Répondre à un client",
    prompt: "Aide-moi à rédiger une réponse professionnelle et rassurante pour un client mécontent.",
    color: "from-[#305CDE] to-[#305CDE]",
  },
];

const SYSTEM_PROMPT = `Tu es NORI, l'assistant IA vendeur de NEXORA — la plateforme e-commerce intelligente pour l'Afrique.

Ton rôle : aider les vendeurs à vendre plus, mieux et plus vite.

Tu peux aider avec :
- Rédaction de descriptions produits percutantes
- Stratégies de vente et marketing
- Utilisation des fonctionnalités NEXORA (boutique, PayLink, affiliation 30%, transfert 24 pays, factures)
- Réponses aux clients
- Conseils pour augmenter les conversions

Règles :
- Réponds toujours en français
- Sois concis, actionnable et encourageant
- Mets en avant les fonctionnalités NEXORA quand c'est pertinent
- Utilise des emojis avec parcimonie pour rendre le texte plus vivant
- Maximum 150 mots par réponse sauf si l'utilisateur demande plus de détails`;

// ─── Utilitaires ───────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).slice(2, 9);

const formatTime = (date: Date) =>
  date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

// ─── Sous-composants ────────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-2 h-2 rounded-full bg-[#305CDE] animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      {!isUser && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-2 mt-0.5 shadow-md shadow-blue-500/30">
          <Sparkles size={12} className="text-white" />
        </div>
      )}
      <div className="max-w-[80%]">
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-tr-sm shadow-md shadow-blue-500/25"
              : "bg-white/8 text-slate-100 rounded-tl-sm border border-white/10"
          }`}
          style={{ backdropFilter: isUser ? undefined : "blur(8px)" }}
        >
          {msg.content}
        </div>
        <p className={`text-[10px] mt-1 text-slate-500 ${isUser ? "text-right" : "text-left"}`}>
          {formatTime(msg.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Composant principal ────────────────────────────────────────────────────────

export default function AIAssistant() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Arrêter le pulse après 5 sec
  useEffect(() => {
    const t = setTimeout(() => setPulse(false), 5000);
    return () => clearTimeout(t);
  }, []);

  // Message d'accueil
  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: "assistant",
          content: "Bonjour 👋 Je suis **NORI**, votre assistant IA vendeur NEXORA.\n\nComment puis-je vous aider à vendre plus aujourd'hui ?",
          timestamp: new Date(),
        },
      ]);
    }
    if (open) {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  // Scroll automatique
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Appel via Supabase Edge Function (même pattern que AIDescriptionHelper)
      const history = messages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await (supabase as any).functions.invoke("nexora-ai-assistant", {
        body: {
          messages: [...history, { role: "user", content: trimmed }],
        },
      });

      // Afficher l'erreur exacte pour debug
      if (error) {
        console.error("❌ Supabase invoke error:", error);
        throw new Error(error.message || JSON.stringify(error));
      }

      // La fonction peut retourner une erreur dans data.reply
      const reply = data?.reply || "Désolé, je n'ai pas pu répondre. Réessayez !";

      setMessages((prev) => [
        ...prev,
        { id: generateId(), role: "assistant", content: reply, timestamp: new Date() },
      ]);

      if (!open) setHasUnread(true);
    } catch (err: any) {
      console.error("❌ AIAssistant catch:", err);
      setMessages((prev) => [
        ...prev,
        {
          id: generateId(),
          role: "assistant",
          // Afficher l'erreur réelle pour identifier le problème
          content: "❌ Erreur : " + (err?.message || "inconnue"),
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const reset = () => {
    setMessages([]);
    setTimeout(() => {
      setMessages([{
        id: generateId(),
        role: "assistant",
        content: "Conversation réinitialisée 🔄 Comment puis-je vous aider ?",
        timestamp: new Date(),
      }]);
    }, 100);
  };

  // Ne pas afficher sur la page Landing
  if (location.pathname === "/" || location.pathname === "/landing") return null;

  return (
    <>
      {/* ── Panneau ── */}
      <div
        className={`
          fixed z-50 transition-all duration-300 ease-out
          ${open && !minimized
            ? "bottom-40 right-4 sm:right-6 opacity-100 scale-100 pointer-events-auto"
            : "bottom-40 right-4 sm:right-6 opacity-0 scale-95 pointer-events-none"
          }
        `}
        style={{ width: "min(380px, calc(100vw - 32px))" }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50 border border-white/10"
          style={{
            background: "linear-gradient(160deg, hsl(222 47% 10%) 0%, hsl(222 44% 8%) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3.5"
            style={{ background: "linear-gradient(90deg, hsl(217 91% 18%) 0%, hsl(222 47% 14%) 100%)" }}
          >
            <div className="flex items-center gap-2.5">
              <div>
                <p className="text-white font-semibold text-sm leading-none">NORI</p>
                <p className="text-[#305CDE]/70 text-[10px] mt-0.5">Assistant IA NEXORA · En ligne</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={reset}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Nouvelle conversation"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Corps */}
          <div
            className={`transition-all duration-300 overflow-hidden ${minimized ? "max-h-0" : "max-h-[420px]"}`}
          >
            {/* Messages */}
            <div className="h-64 overflow-y-auto px-3 py-3 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {loading && (
                <div className="flex justify-start mb-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mr-2 mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="bg-white/8 border border-white/10 rounded-2xl rounded-tl-sm">
                    <TypingDots />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Actions rapides (si pas encore de conversation) */}
            {messages.length <= 1 && !loading && (
              <div className="px-3 pb-2 grid grid-cols-2 gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.prompt)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl border border-white/8 bg-white/4 hover:bg-white/10 transition-all text-left group"
                  >
                    <span className={`flex-shrink-0 w-5 h-5 rounded-md bg-gradient-to-br ${action.color} flex items-center justify-center text-white`}>
                      {action.icon}
                    </span>
                    <span className="text-[11px] text-slate-300 group-hover:text-white transition-colors leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3">
              <div className="flex items-end gap-2 bg-white/6 border border-white/10 rounded-xl px-3 py-2 focus-within:border-[#305CDE]/50 transition-colors">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Posez votre question…"
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 resize-none outline-none leading-relaxed max-h-24"
                  style={{ scrollbarWidth: "none" }}
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white disabled:opacity-30 disabled:cursor-not-allowed hover:from-blue-400 hover:to-blue-500 transition-all shadow-md shadow-blue-500/30"
                >
                  <Send size={13} />
                </button>
              </div>
              <p className="text-[9px] text-slate-600 text-center mt-1.5">
                IA NEXORA · Entrée pour envoyer
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bouton flottant ── */}
      <button
        onClick={() => { setOpen(!open); setHasUnread(false); }}
        className="fixed bottom-24 right-4 sm:right-6 z-50 group"
        aria-label="Ouvrir l'assistant IA NEXORA"
      >
        {/* Glow ambiant */}
        <span
          className="absolute inset-0 rounded-full blur-xl opacity-60 group-hover:opacity-90 transition-opacity"
          style={{ background: "radial-gradient(circle, hsl(217 91% 60%) 0%, transparent 70%)" }}
        />

        {/* Pulse animation */}
        {pulse && !open && (
          <span className="absolute inset-0 rounded-full bg-[#305CDE]/40 animate-ping" />
        )}

        {/* Cercle principal */}
        <span
          className="relative w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-blue-500/50 transition-all duration-200 group-hover:scale-110 group-active:scale-95"
          style={{
            background: open
              ? "linear-gradient(135deg, hsl(222 47% 16%) 0%, hsl(222 44% 12%) 100%)"
              : "linear-gradient(135deg, hsl(217 91% 55%) 0%, hsl(195 91% 45%) 100%)",
          }}
        >
          <span
            className="transition-all duration-200"
            style={{ transform: open ? "rotate(180deg) scale(0.9)" : "rotate(0deg) scale(1)" }}
          >
            {open ? (
              <X size={22} className="text-white" />
            ) : (
              <img
                src="https://i.postimg.cc/4ydG1TrC/file-000000002c9071f486e09bcc989bd19a.png"
                alt="NORI IA"
                className="w-8 h-8 object-contain rounded-full"
              />
            )}
          </span>

          {/* Badge non lu */}
          {hasUnread && !open && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#008000] border-2 border-[hsl(222_47%_7%)] text-[9px] font-bold text-slate-900 flex items-center justify-center">
              1
            </span>
          )}
        </span>

        {/* Label tooltip au survol */}
        {!open && (
          <span className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap bg-[hsl(222_47%_10%)] border border-white/10 text-white text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none shadow-xl flex items-center gap-1.5 translate-x-2 group-hover:translate-x-0">
            <Sparkles size={11} className="text-[#305CDE]" />
            Assistant IA vendeur
            <ChevronRight size={11} className="text-slate-500" />
          </span>
        )}
      </button>
    </>
  );
}
