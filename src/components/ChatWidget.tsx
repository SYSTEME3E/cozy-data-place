import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { useChat } from "@/hooks/useChat";
import { getNexoraUser } from "@/lib/nexora-auth";

// Widget flottant uniquement — le chat s'ouvre sur /chat
export default function ChatWidget() {
  const navigate = useNavigate();
  const user = getNexoraUser();
  const { unreadCount } = useChat();

  if (!user) return null;

  const handleClick = () => {
    navigate("/chat");
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col items-end gap-3">
      {/* Pulse halo quand messages non lus */}
      {unreadCount > 0 && (
        <div className="absolute inset-0 rounded-full animate-ping bg-violet-500 opacity-30 pointer-events-none" />
      )}

      <button
        onClick={handleClick}
        className="relative flex items-center justify-center rounded-full shadow-2xl transition-transform active:scale-95 hover:scale-105"
        style={{
          width: 60,
          height: 60,
          background: "linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)",
        }}
        aria-label="Ouvrir le chat support"
      >
        <MessageCircle className="w-6 h-6 text-white" />

        {/* Badge non lus */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 flex items-center justify-center rounded-full text-[11px] font-black text-white shadow-lg"
            style={{ background: "#ef4444" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
