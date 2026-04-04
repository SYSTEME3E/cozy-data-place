import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { isAuthenticated } from "@/lib/app-utils";

export default function AuthGuard({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [auth, setAuth] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      const result = isAuthenticated();
      setAuth(result);
      setIsLoading(false);
      if (!result) {
        navigate("/login", { replace: true });
      }
    }, 200);
  }, [location.pathname]);

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <p className="text-gray-500 text-lg">Chargement...</p>
    </div>
  );

  if (!auth) return null;

  return <>{children}</>;
}
