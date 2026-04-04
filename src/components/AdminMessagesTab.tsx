import { useState, useRef, useEffect } from "react";
import {
  MessageSquare, Search, Send, Archive, CheckCheck,
  Clock, User, ChevronLeft, Circle
} from "lucide-react";
import { useAdminChat, type ChatConversation } from "@/hooks/useChat";

const ASSISTANT_PHOTO =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&face";

function formatTimeShort(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "À l'instant";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}min`;
  if (diff < 86400000)
    return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

function formatTimeFull(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#7c3aed", "#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444",
];
function avatarColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export default function AdminMessagesTab() {
  const { conversations, loading, totalUnread, sendAdminReply, markUserMessagesRead, archiveConversation } =
    useAdminChat();

  const [selected, setSelected] = useState<ChatConversation | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [showList, setShowList] = useState(true); // Mobile toggle
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep selected in sync with live data
  useEffect(() => {
    if (selected) {
      const updated = conversations.find((c) => c.user_id === selected.user_id);
      if (updated) setSelected(updated);
    }
  }, [conversations]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selected?.messages]);

  const handleSelect = async (conv: ChatConversation) => {
    setSelected(conv);
    setShowList(false);
    await markUserMessagesRead(conv.user_id);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleSend = async () => {
    if (!selected || !reply.trim() || sending) return;
    setSending(true);
    await sendAdminReply(selected.user_id, reply);
    setReply("");
    setSending(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const filtered = conversations.filter(
    (c) =>
      c.user_name.toLowerCase().includes(search.toLowerCase()) ||
      c.user_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-180px)] min-h-[400px] rounded-2xl overflow-hidden border border-border bg-card shadow-sm">
      {/* ── Left: Conversation List ── */}
      <div
        className={`flex flex-col border-r border-border bg-card flex-shrink-0 ${
          showList ? "flex" : "hidden md:flex"
        }`}
        style={{ width: 300 }}
      >
        {/* Header */}
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-violet-500" />
              <span className="font-black text-base">Messages</span>
              {totalUnread > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black text-white"
                  style={{ background: "#ef4444" }}>
                  {totalUnread}
                </span>
              )}
            </div>
          </div>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border bg-muted/40 outline-none focus:border-violet-400 focus:bg-background transition-all"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex justify-center py-8">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-2 h-2 rounded-full bg-violet-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <MessageSquare className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun message</p>
            </div>
          )}
          {filtered.map((conv) => {
            const isSelected = selected?.user_id === conv.user_id;
            const color = avatarColor(conv.user_id);
            return (
              <button
                key={conv.user_id}
                onClick={() => handleSelect(conv)}
                className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-border/50 hover:bg-muted/50 ${
                  isSelected ? "bg-violet-50 dark:bg-violet-950/30" : ""
                }`}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                    style={{ background: color }}
                  >
                    {initials(conv.user_name)}
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
                      style={{ background: "#ef4444" }}>
                      {conv.unread_count}
                    </span>
                  )}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className={`text-sm truncate ${conv.unread_count > 0 ? "font-bold" : "font-medium"}`}>
                      {conv.user_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      {formatTimeShort(conv.last_message_at)}
                    </span>
                  </div>
                  <p className={`text-xs truncate mt-0.5 ${
                    conv.unread_count > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}>
                    {conv.last_message}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Right: Conversation View ── */}
      <div className={`flex-1 flex flex-col ${!showList ? "flex" : "hidden md:flex"}`}>
        {!selected ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6">
            {/* Assistant illustration */}
            <div className="relative">
              <img
                src={ASSISTANT_PHOTO}
                alt="Sophia"
                className="w-20 h-20 rounded-full object-cover border-4 border-violet-200 shadow-lg"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='40' fill='%237c3aed'/%3E%3Ctext x='40' y='50' text-anchor='middle' fill='white' font-size='36'%3E👩%3C/text%3E%3C/svg%3E";
                }}
              />
              <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2 border-white"
                style={{ background: "#22c55e" }} />
            </div>
            <div>
              <p className="font-bold text-base">Sophia — Support Nexora</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sélectionnez une conversation pour répondre
              </p>
            </div>
            {totalUnread > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl"
                style={{ background: "#fef3c7" }}>
                <Circle className="w-2 h-2 fill-amber-500 text-amber-500" />
                <span className="text-sm font-medium text-amber-700">
                  {totalUnread} message{totalUnread > 1 ? "s" : ""} non lu{totalUnread > 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Conversation Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
              <button
                className="md:hidden p-1.5 rounded-lg hover:bg-muted transition-colors"
                onClick={() => { setShowList(true); setSelected(null); }}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                style={{ background: avatarColor(selected.user_id) }}
              >
                {initials(selected.user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm">{selected.user_name}</p>
                <p className="text-xs text-muted-foreground truncate">{selected.user_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => archiveConversation(selected.user_id)}
                  title="Archiver la conversation"
                  className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  <Archive className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
              style={{ background: "#f8f7ff" }}>
              {selected.messages.map((msg) => {
                const isAdmin = msg.sender === "admin";
                return (
                  <div key={msg.id} className={`flex items-end gap-2 ${isAdmin ? "flex-row-reverse" : "flex-row"}`}>
                    {!isAdmin && (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mb-0.5"
                        style={{ background: avatarColor(selected.user_id) }}
                      >
                        {initials(selected.user_name)}
                      </div>
                    )}
                    {isAdmin && (
                      <img
                        src={ASSISTANT_PHOTO}
                        alt="Sophia"
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 mb-0.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='14' fill='%237c3aed'/%3E%3Ctext x='14' y='18' text-anchor='middle' fill='white' font-size='12'%3E👩%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    )}
                    <div className={`max-w-[70%] flex flex-col ${isAdmin ? "items-end" : "items-start"}`}>
                      <div
                        className={`px-3.5 py-2.5 shadow-sm ${
                          isAdmin
                            ? "rounded-2xl rounded-br-sm text-white"
                            : "rounded-2xl rounded-tl-sm"
                        }`}
                        style={{
                          background: isAdmin
                            ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                            : "#ffffff",
                          color: isAdmin ? "#ffffff" : "#111827",
                          border: isAdmin ? "none" : "1px solid #e5e7eb",
                        }}
                      >
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 px-1">
                        <span className="text-[10px] text-gray-400">
                          {formatTimeFull(msg.created_at)}
                        </span>
                        {isAdmin && (
                          msg.is_read
                            ? <CheckCheck className="w-3 h-3 text-violet-400" />
                            : <Clock className="w-3 h-3 text-gray-300" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="flex items-center gap-2 px-3 py-3 border-t border-border bg-card flex-shrink-0">
              <img
                src={ASSISTANT_PHOTO}
                alt="Sophia"
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='16' fill='%237c3aed'/%3E%3Ctext x='16' y='20' text-anchor='middle' fill='white' font-size='14'%3E👩%3C/text%3E%3C/svg%3E";
                }}
              />
              <input
                ref={inputRef}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Répondre à ${selected.user_name}…`}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none bg-muted/40 border border-border focus:border-violet-400 focus:bg-background transition-all"
                disabled={sending}
              />
              <button
                onClick={handleSend}
                disabled={!reply.trim() || sending}
                className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 flex-shrink-0 disabled:opacity-40"
                style={{
                  background: reply.trim()
                    ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                    : undefined,
                  backgroundColor: reply.trim() ? undefined : "var(--muted)",
                }}
              >
                <Send className={`w-4 h-4 ${reply.trim() ? "text-white" : "text-muted-foreground"}`} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
