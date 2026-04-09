import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isNexoraAuthenticated, getNexoraUser } from "@/lib/nexora-auth";

interface NexoraAuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePremium?: boolean;
}

// Chemins qui ne nécessitent pas de vérification PIN
const PIN_FLOW_PATHS = ["/setup-pin", "/unlock-pin", "/login"];

const PIN_UNLOCKED_KEY = "nexora_pin_unlocked";

export default function NexoraAuthGuard({
  children,
  requireAdmin = false,
  requirePremium = false,
}: NexoraAuthGuardProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const check = async () => {
      setIsLoading(true);

      if (!isNexoraAuthenticated()) {
        navigate("/login", { replace: true });
        return;
      }

      const user = getNexoraUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }

      // ── Vérification PIN obligatoire ──────────────────────────────────────
      // Si le PIN n'est pas déverrouillé pour cette session, rediriger vers unlock-pin
      if (!PIN_FLOW_PATHS.includes(location.pathname)) {
        const pinUnlocked = sessionStorage.getItem(PIN_UNLOCKED_KEY) === "true";
        if (!pinUnlocked) {
          navigate("/unlock-pin", { replace: true });
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      if (requireAdmin && !user.is_admin) {
        navigate("/dashboard", { replace: true });
        return;
      }

      if (requirePremium && user.plan === "gratuit") {
        navigate("/abonnement", { replace: true });
        return;
      }

      setAuthorized(true);
      setIsLoading(false);
    };

    check();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#080c10" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: 12, height: 12, borderRadius: "50%",
                  background: "#00ff78",
                  animation: "bounce 0.8s infinite",
                  animationDelay: `${i * 0.15}s`,
                  boxShadow: "0 0 8px rgba(0,255,120,0.5)",
                }}
              />
            ))}
          </div>
          <p style={{ color: "rgba(0,255,120,0.5)", fontFamily: "'Courier New', monospace", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
            VÉRIFICATION...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}
