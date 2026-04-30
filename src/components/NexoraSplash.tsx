import { useEffect, useState } from "react";
import nexoraLogo from "@/assets/nexora-logo.png";

interface NexoraSplashProps {
  duration?: number;
  onDone: () => void;
}

export default function NexoraSplash({ duration = 2400, onDone }: NexoraSplashProps) {
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
      <style>{`
        @keyframes nexSpin        { from { transform: rotate(0deg); }   to { transform: rotate(360deg); } }
        @keyframes nexSpinReverse { from { transform: rotate(0deg); }   to { transform: rotate(-360deg); } }
        @keyframes nexPulse       { 0%,100% { transform:scale(1); opacity:1; } 50% { transform:scale(1.08); opacity:0.85; } }
        @keyframes nexFadeUp      { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes nexGlow        { 0%,100% { opacity:0.3; transform:scale(1); } 50% { opacity:0.6; transform:scale(1.15); } }
        .nex-ring-1  { animation: nexSpin 1.8s linear infinite; }
        .nex-ring-2  { animation: nexSpinReverse 2.6s linear infinite; }
        .nex-logo-w  { animation: nexFadeUp 0.65s ease forwards, nexPulse 2.4s ease-in-out 0.65s infinite; }
        .nex-glow    { animation: nexGlow 2s ease-in-out infinite; }
        .nex-text    { animation: nexFadeUp 0.65s ease 0.2s both; }
        .nex-sub     { animation: nexFadeUp 0.65s ease 0.45s both; }
      `}</style>

      {/* Glow ambiant */}
      <div className="nex-glow" style={{
        position: "absolute", width: 280, height: 280, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(48,92,222,0.3) 0%, transparent 70%)",
        filter: "blur(40px)",
      }} />

      {/* Texte NEXORA */}
      <h1 className="nex-text" style={{
        fontSize: 40, fontWeight: 900, letterSpacing: "0.22em",
        margin: "0 0 32px 0", fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}>
        <span style={{ color: "#ffffff" }}>Nex</span>
        <span style={{ color: "#305CDE" }}>ora</span>
      </h1>

      {/* Logo avec anneaux tournants */}
      <div style={{ position: "relative", width: 110, height: 110 }}>

        {/* Anneau extérieur vert */}
        <svg className="nex-ring-1" width="110" height="110" viewBox="0 0 110 110"
          style={{ position: "absolute", inset: 0 }}>
          <circle cx="55" cy="55" r="50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
          <circle cx="55" cy="55" r="50" fill="none" stroke="#008000" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="314" strokeDashoffset="235"
            style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px" }} />
        </svg>

        {/* Anneau intérieur bleu roi */}
        <svg className="nex-ring-2" width="110" height="110" viewBox="0 0 110 110"
          style={{ position: "absolute", inset: 0 }}>
          <circle cx="55" cy="55" r="39" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
          <circle cx="55" cy="55" r="39" fill="none" stroke="#305CDE" strokeWidth="2.5"
            strokeLinecap="round" strokeDasharray="245" strokeDashoffset="190"
            style={{ transform: "rotate(-90deg)", transformOrigin: "55px 55px" }} />
        </svg>

        {/* Logo centré */}
        <div className="nex-logo-w" style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 54, height: 54, borderRadius: 14,
            background: "rgba(255,255,255,0.07)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(48,92,222,0.45), 0 0 10px rgba(0,128,0,0.25)",
          }}>
            <img src={nexoraLogo} alt="NEXORA" style={{ width: 36, height: 36, objectFit: "contain" }} />
          </div>
        </div>

        {/* 3 points colorés sur le grand anneau */}
        {([
          { deg: 0,   color: "#008000" },
          { deg: 120, color: "#305CDE" },
          { deg: 240, color: "#FF1A00" },
        ] as { deg: number; color: string }[]).map(({ deg, color }, i) => {
          const rad = (deg - 90) * (Math.PI / 180);
          const x = 55 + 50 * Math.cos(rad);
          const y = 55 + 50 * Math.sin(rad);
          return (
            <div key={i} style={{
              position: "absolute", left: x - 3, top: y - 3,
              width: 6, height: 6, borderRadius: "50%",
              background: color, boxShadow: `0 0 8px ${color}`,
            }} />
          );
        })}
      </div>

      {/* Sous-titre */}
      <p className="nex-sub" style={{
        color: "rgba(255,255,255,0.3)", fontSize: 11,
        letterSpacing: "0.3em", textTransform: "uppercase",
        margin: "28px 0 0 0", fontFamily: "system-ui, sans-serif",
      }}>
        Votre espace financier
      </p>
    </div>
  );
}
