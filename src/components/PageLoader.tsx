import { useEffect, useState } from "react";

interface PageLoaderProps {
  duration?: number;
  children: React.ReactNode;
}

export default function PageLoader({
  duration = 800,
  children,
}: PageLoaderProps) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (loading) {
    return (
      <div style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "24px",
        backgroundColor: "#1a2235",
      }}>
        <div style={{
          fontSize: "40px",
          fontWeight: 900,
          letterSpacing: "0.08em",
          fontFamily: "'Segoe UI', sans-serif",
        }}>
          <span style={{ color: "#ffffff" }}>Nex</span>
          <span style={{ color: "#2979ff" }}>ora</span>
        </div>
        <div style={{
          width: "38px",
          height: "38px",
          borderRadius: "50%",
          border: "3.5px solid rgba(255,255,255,0.1)",
          borderTopColor: "#2979ff",
          animation: "nexora-spin 0.85s cubic-bezier(0.4,0,0.6,1) infinite",
        }} />
        <style>{`
          @keyframes nexora-spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
