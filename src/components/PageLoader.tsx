import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import nexoraLogo from "@/assets/nexora-logo.png";

interface PageLoaderProps {
  duration?: number;
  children: React.ReactNode;
  onlyAuth?: boolean; // 🔥 nouveau
}

export default function PageLoader({
  duration = 600,
  children,
  onlyAuth = false,
}: PageLoaderProps) {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // 🔥 détecte pages auth
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  useEffect(() => {
    // 🔥 si seulement auth et on n'est pas sur auth → skip loader
    if (onlyAuth && !isAuthPage) {
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration, onlyAuth, isAuthPage]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 bg-gradient-to-br from-[#061530] via-[#0d2d6b] to-[#020617]">
        
        {/* 🔥 Logo + glow */}
        <div className="flex flex-col items-center gap-6 animate-fadeIn">
          <img
            src={nexoraLogo}
            alt="Nexora"
            className="w-20 h-20 object-contain drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] animate-pulse"
          />

          <h1 className="text-3xl font-black tracking-[0.3em] text-white">
            NEXORA
          </h1>
        </div>

        {/* 🔥 Loader dots modern */}
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-3.5 h-3.5 rounded-full bg-yellow-400 animate-bounce"
              style={{ animationDelay: `${i * 0.2}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
