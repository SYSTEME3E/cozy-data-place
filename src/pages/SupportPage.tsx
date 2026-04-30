import AppLayout from "@/components/AppLayout";
import { ChevronLeft, MessageCircle, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SupportPage() {
  const navigate = useNavigate();

  const handleWhatsApp = () => {
    window.open("https://wa.me/2290155237685", "_blank");
  };

  const handleCall = () => {
    window.location.href = "tel:+2290151762341";
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-[#EEF2FF] dark:bg-background flex flex-col">
        {/* Header */}
        <div className="flex items-center px-4 pt-6 pb-2">
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-white dark:bg-card shadow-sm mr-3"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <h1 className="text-xl font-bold text-foreground">Support</h1>
        </div>

        {/* Illustration */}
        <div className="flex flex-col items-center mt-6 mb-4 px-6">
          <div className="relative w-60 h-44 flex items-center justify-center">
            {/* Yellow blob background */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-52 h-36 rounded-full"
                style={{ background: "#FFE033", borderRadius: "60% 40% 55% 45% / 45% 55% 45% 55%" }}
              />
            </div>
            {/* Agent SVG illustration */}
            <svg
              viewBox="0 0 200 160"
              className="relative z-10 w-56 h-44"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Desk */}
              <rect x="20" y="115" width="160" height="12" rx="4" fill="#C8A97A" />
              {/* Laptop body */}
              <rect x="55" y="80" width="90" height="38" rx="4" fill="#5B6E8C" />
              <rect x="58" y="83" width="84" height="30" rx="2" fill="#7DD3FC" opacity="0.7" />
              {/* Laptop base */}
              <rect x="40" y="116" width="120" height="5" rx="2" fill="#4A5568" />
              {/* Body */}
              <rect x="77" y="58" width="46" height="30" rx="8" fill="#3B82F6" />
              {/* Head */}
              <ellipse cx="100" cy="45" rx="18" ry="18" fill="#FBBF24" />
              {/* Hair */}
              <ellipse cx="100" cy="30" rx="18" ry="10" fill="#1F2937" />
              <ellipse cx="83" cy="42" rx="5" ry="12" fill="#1F2937" />
              {/* Headset arc */}
              <path d="M83 38 Q100 22 117 38" stroke="#374151" strokeWidth="3" fill="none" />
              {/* Headset left cup */}
              <rect x="79" y="37" width="8" height="10" rx="3" fill="#374151" />
              {/* Headset right cup */}
              <rect x="113" y="37" width="8" height="10" rx="3" fill="#374151" />
              {/* Mic */}
              <path d="M117 42 Q123 46 120 52" stroke="#374151" strokeWidth="2" fill="none" />
              <circle cx="120" cy="53" r="2" fill="#374151" />
              {/* Arms */}
              <path d="M77 68 Q65 80 60 90" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" fill="none" />
              <path d="M123 68 Q135 80 140 90" stroke="#3B82F6" strokeWidth="8" strokeLinecap="round" fill="none" />
            </svg>

            {/* Chat bubbles */}
            <div
              className="absolute top-2 left-2 bg-[#3B82F6] text-white text-xs font-bold px-3 py-1.5 rounded-2xl shadow-md"
              style={{ borderBottomLeftRadius: "4px" }}
            >
              24h/7j
            </div>
            <div
              className="absolute top-2 right-2 bg-[#3B82F6] text-white text-xs font-bold px-3 py-1.5 rounded-2xl shadow-md"
              style={{ borderBottomRightRadius: "4px" }}
            >
              Hello !
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="px-8 text-center mb-8">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Contactez le support pour tout problème ou feedback. Nos agents sont disponibles tous les jours de{" "}
            <span className="font-semibold text-foreground">08h à 13h</span> et de{" "}
            <span className="font-semibold text-foreground">15h à 20h</span>
          </p>
        </div>

        {/* Buttons */}
        <div className="px-6 flex flex-col gap-3">
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#3B82F6] hover:bg-blue-600 text-white font-bold text-base transition-colors shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            Chat WhatsApp
          </button>

          <button
            onClick={handleCall}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-[#22C55E] hover:bg-green-600 text-white font-bold text-base transition-colors shadow-md"
          >
            <Phone className="w-5 h-5" />
            Appel direct
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
