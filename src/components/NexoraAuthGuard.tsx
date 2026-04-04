import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isNexoraAuthenticated, getNexoraUser } from "@/lib/nexora-auth";

interface NexoraAuthGuardProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requirePremium?: boolean;
}

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
    const check = () => {
      if (!isNexoraAuthenticated()) {
        navigate("/login", { replace: true });
        return;
      }
      const user = getNexoraUser();
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
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
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full bg-primary animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            Chargement...
          </p>
        </div>
      </div>
    );
  }

  if (!authorized) return null;
  return <>{children}</>;
}
