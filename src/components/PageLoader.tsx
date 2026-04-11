import { useEffect, useState } from "react";

interface PageLoaderProps {
  duration?: number;
  children: React.ReactNode;
  onlyAuth?: boolean;
}

export default function PageLoader({
  duration = 600,
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
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#1a2235",
      }}>
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
