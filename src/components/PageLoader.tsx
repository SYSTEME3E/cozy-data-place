import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import nexoraLogo from "@/assets/nexora-logo.png";

interface PageLoaderProps {
  /**
   * Mode timer (mount) : durée fixe en ms avant de révéler children.
   * Ignoré si `loading` est fourni. Défaut : 900.
   */
  duration?: number;

  /**
   * Mode contrôlé : quand true, affiche le spinner ;
   * quand false, le cache (avec minDisplay respecté).
   * Si undefined, bascule en mode timer.
   */
  loading?: boolean;

  /**
   * Délai avant d'afficher le spinner (ms).
   * Évite le flash pour les opérations très rapides. Défaut : 300.
   */
  delayShow?: number;

  /**
   * Durée minimale d'affichage une fois le spinner visible (ms).
   * Évite qu'il disparaisse trop vite. Défaut : 500.
   */
  minDisplay?: number;

  children: React.ReactNode;
}

export default function PageLoader({
  duration = 900,
  loading,
  delayShow = 300,
  minDisplay = 500,
  children,
}: PageLoaderProps) {
  const isControlled = loading !== undefined;

  // ── Mode timer (mount) ──────────────────────────────────────────────────────
  const [timerDone, setTimerDone] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (isControlled) return;
    setTimerDone(false);
    const t = setTimeout(() => setTimerDone(true), duration);
    return () => clearTimeout(t);
  }, [location.pathname, isControlled, duration]);

  // ── Mode contrôlé ──────────────────────────────────────────────────────────
  const [visible, setVisible] = useState(false);
  const showTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shownAtRef     = useRef<number | null>(null);

  useEffect(() => {
    if (!isControlled) return;

    if (loading) {
      // Démarrer le délai avant affichage
      showTimerRef.current = setTimeout(() => {
        setVisible(true);
        shownAtRef.current = Date.now();
      }, delayShow);
    } else {
      // Annuler l'affichage si l'opération s'est terminée avant delayShow
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      if (visible) {
        // Respecter minDisplay avant de cacher
        const elapsed = shownAtRef.current ? Date.now() - shownAtRef.current : minDisplay;
        const remaining = Math.max(0, minDisplay - elapsed);
        setTimeout(() => {
          setVisible(false);
          shownAtRef.current = null;
        }, remaining);
      }
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [loading, isControlled, delayShow, minDisplay, visible]);

  // ── Décision d'affichage ───────────────────────────────────────────────────
  const shouldShow = isControlled ? visible : !timerDone;

  if (!shouldShow) return <>{children}</>;

  // Sur les pages boutique, afficher un simple loader discret (pas le splash Nexora)
  const isBoutiquePage = location.pathname.startsWith("/boutique");

  if (isBoutiquePage) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(249,250,251,0.85)",
        }}
      >
        <div style={{
          width: 40, height: 40,
          border: "4px solid #E5E7EB",
          borderTop: "4px solid #1D4ED8",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite",
        }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(160deg, #0a0e27 0%, #0d2d6b 50%, #061530 100%)",
        gap: 0,
      }}
    >
      <style>{`
        @keyframes plSpin        { from { transform: rotate(0deg); }  to { transform: rotate(360deg); } }
        @keyframes plSpinRev     { from { transform: rotate(0deg); }  to { transform: rotate(-360deg); } }
        @keyframes plPulse       { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.07); opacity:0.85; } }
        @keyframes plFadeUp      { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes plGlow        { 0%,100% { opacity:0.25; } 50% { opacity:0.55; } }
        .pl-ring-1 { animation: plSpin 1.8s linear infinite; }
        .pl-ring-2 { animation: plSpinRev 2.6s linear infinite; }
        .pl-logo   { animation: plFadeUp 0.5s ease forwards, plPulse 2s ease-in-out 0.5s infinite; }
        .pl-glow   { animation: plGlow 2s ease-in-out infinite; }
        .pl-title  { animation: plFadeUp 0.5s ease 0.1s both; }
        .pl-sub    { animation: plFadeUp 0.5s ease 0.3s both; }
      `}</style>

      {/* Glow */}
      <div
        className="pl-glow"
        style={{
          position: "absolute",
          width: 240,
          height: 240,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(48,92,222,0.28) 0%, transparent 70%)",
          filter: "blur(36px)",
        }}
      />

      {/* Texte */}
      <h1
        className="pl-title"
        style={{
          fontSize: 36,
          fontWeight: 900,
          letterSpacing: "0.22em",
          margin: "0 0 28px 0",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
        }}
      >
        <span style={{ color: "#ffffff" }}>Nex</span>
        <span style={{ color: "#305CDE" }}>ora</span>
      </h1>

      {/* Logo + anneaux */}
      <div style={{ position: "relative", width: 100, height: 100 }}>
        <svg
          className="pl-ring-1"
          width="100"
          height="100"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <circle
            cx="50" cy="50" r="45" fill="none" stroke="#008000" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="283" strokeDashoffset="212"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }}
          />
        </svg>

        <svg
          className="pl-ring-2"
          width="100"
          height="100"
          viewBox="0 0 100 100"
          style={{ position: "absolute", inset: 0 }}
        >
          <circle cx="50" cy="50" r="34" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <circle
            cx="50" cy="50" r="34" fill="none" stroke="#305CDE" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="214" strokeDashoffset="165"
            style={{ transform: "rotate(-90deg)", transformOrigin: "50px 50px" }}
          />
        </svg>

        <div
          className="pl-logo"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "rgba(255,255,255,0.07)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow:
                "0 0 20px rgba(48,92,222,0.4), 0 0 8px rgba(0,128,0,0.2)",
            }}
          >
            <img
              src={nexoraLogo}
              alt="NEXORA"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          </div>
        </div>

        {(
          [
            { deg: 0,   color: "#008000" },
            { deg: 120, color: "#305CDE" },
            { deg: 240, color: "#FF1A00" },
          ] as { deg: number; color: string }[]
        ).map(({ deg, color }, i) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const x = 50 + 45 * Math.cos(rad);
          const y = 50 + 45 * Math.sin(rad);
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: x - 3,
                top: y - 3,
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: color,
                boxShadow: `0 0 7px ${color}`,
              }}
            />
          );
        })}
      </div>

      <p
        className="pl-sub"
        style={{
          color: "rgba(255,255,255,0.28)",
          fontSize: 10,
          letterSpacing: "0.28em",
          textTransform: "uppercase",
          margin: "24px 0 0 0",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Chargement...
      </p>
    </div>
  );
}
