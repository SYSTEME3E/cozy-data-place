import { useEffect, useState } from "react";

interface NexoraSplashProps {
  duration?: number;
  onDone: () => void;
}

export default function NexoraSplash({ duration = 2200, onDone }: NexoraSplashProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), duration - 400);
    const doneTimer = setTimeout(() => onDone(), duration);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [duration, onDone]);

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
        background: "linear-gradient(160deg, #0a0e27 0%, #0d2d6b 50%, #061530 100%)",
        transition: "opacity 0.4s ease",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "all",
      }}
    >
      {/* Glow ambiant derrière le logo */}
      <div
        style={{
          position: "absolute",
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, transparent 70%)",
          filter: "blur(30px)",
        }}
      />

      {/* Logo texte NEXORA */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 20,
          animation: "fadeSlideIn 0.6s ease forwards",
        }}
      >
        <h1
          style={{
            fontSize: 42,
            fontWeight: 900,
            letterSpacing: "0.25em",
            margin: 0,
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          <span style={{ color: "#ffffff" }}>Nex</span>
          <span style={{ color: "#3b82f6" }}>ora</span>
        </h1>

        <p
          style={{
            color: "rgba(255,255,255,0.35)",
            fontSize: 11,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            margin: 0,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Votre espace financier
        </p>
      </div>

      {/* Spinner arc de cercle */}
      <div style={{ marginTop: 52, position: "relative", width: 36, height: 36 }}>
        <svg
          width="36"
          height="36"
          viewBox="0 0 36 36"
          style={{ animation: "spin 1s linear infinite" }}
        >
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r="14"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="55"
            strokeDashoffset="42"
          />
        </svg>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
