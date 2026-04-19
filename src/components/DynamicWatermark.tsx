/**
 * NEXORA — Watermark dynamique superposé à la vidéo
 * Affiche l'email + ID utilisateur en position aléatoire
 */

import { useEffect, useState } from "react";

interface WatermarkProps {
  email: string;
  userId: string;
}

interface WatermarkPosition {
  x: number;
  y: number;
  opacity: number;
}

export function DynamicWatermark({ email, userId }: WatermarkProps) {
  const [positions, setPositions] = useState<WatermarkPosition[]>([]);

  const shortId = userId.slice(0, 8).toUpperCase();
  const text = `${email} • ${shortId}`;

  // Génère 3 watermarks à positions aléatoires, qui bougent toutes les 8s
  useEffect(() => {
    const generate = () => {
      const newPositions: WatermarkPosition[] = Array.from({ length: 3 }).map(() => ({
        x: 5 + Math.random() * 70,
        y: 5 + Math.random() * 80,
        opacity: 0.12 + Math.random() * 0.1,
      }));
      setPositions(newPositions);
    };

    generate();
    const interval = setInterval(generate, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 overflow-hidden"
      style={{ userSelect: "none" }}
      aria-hidden="true"
    >
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute transition-all duration-[2000ms] ease-in-out"
          style={{
            left: `${pos.x}%`,
            top: `${pos.y}%`,
            opacity: pos.opacity,
            transform: "rotate(-15deg)",
            whiteSpace: "nowrap",
          }}
        >
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "11px",
              fontWeight: 600,
              color: "white",
              textShadow: "0 1px 3px rgba(0,0,0,0.8)",
              letterSpacing: "0.05em",
            }}
          >
            {text}
          </span>
        </div>
      ))}

      {/* Watermark diagonal répété en background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `repeating-linear-gradient(
            -45deg,
            transparent,
            transparent 120px,
            rgba(255,255,255,0.015) 120px,
            rgba(255,255,255,0.015) 121px
          )`,
        }}
      />
    </div>
  );
}
