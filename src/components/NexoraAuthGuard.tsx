import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isNexoraAuthenticated, getNexoraUser } from "@/lib/nexora-auth";
import { hasPinSet } from "@/services/pinService";

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
      if (!PIN_FLOW_PATHS.includes(location.pathname)) {
        const pinUnlocked = sessionStorage.getItem(PIN_UNLOCKED_KEY) === "true";
        if (!pinUnlocked) {
          const pinAlreadySet = await hasPinSet(user.id);
          if (!pinAlreadySet) {
            navigate("/setup-pin", { replace: true });
          } else {
            navigate("/unlock-pin", { replace: true });
          }
          setIsLoading(false);
          return;
        }
      }
      // ─────────────────────────────────────────────────────────────────────

      if (requireAdmin && !user.is_admin) {
        navigate("/dashboard", { replace: true });
        setIsLoading(false);
        return;
      }

      if (requirePremium && user.plan === "gratuit") {
        navigate("/abonnement", { replace: true });
        setIsLoading(false);
        return;
      }

      setAuthorized(true);
      setIsLoading(false);
    };

    check();
  }, [location.pathname]);

  if (isLoading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#ffffff" }}>
        <div style={{ display: "flex", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 10, height: 10, borderRadius: "50%",
                background: "#2962FF",
                animation: "bounce 0.8s infinite",
                animationDelay: `${i * 0.15}s`,
              }}
            />
          ))}
        </div>
        <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }`}</style>
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}
