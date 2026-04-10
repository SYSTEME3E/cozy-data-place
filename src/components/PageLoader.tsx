import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface PageLoaderProps {
  duration?: number;
  children: React.ReactNode;
  onlyAuth?: boolean;
}

export default function PageLoader({
  duration = 600,
  children,
  onlyAuth = false,
}: PageLoaderProps) {
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/register";

  useEffect(() => {
    if (onlyAuth && !isAuthPage) {
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => setLoading(false), duration);
    return () => clearTimeout(timer);
  }, [duration, onlyAuth, isAuthPage]);

  if (loading) {
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
          gap: "20px",
          backgroundColor: "#1a2235",
        }}
      >
        <div
          style={{
            fontSize: "38px",
            fontWeight: 900,
            letterSpacing: "0.08em",
            fontFamily: "'Segoe UI', sans-serif",
          }}
        >
          <span style={{ color: "#ffffff" }}>Nex</span>
          <span style={{ color: "#2979ff" }}>ora</span>
        </div>

        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid transparent",
            borderTop: "3px solid #4a5568",
            borderRight: "3px solid #4a5568",
            borderBottom: "3px solid #4a5568",
            borderRadius: "50%",
            animation: "nexora-spin 0.9s linear infinite",
          }}
        />

        <style>{`
          @keyframes nexora-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
