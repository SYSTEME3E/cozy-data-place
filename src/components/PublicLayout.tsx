/**
 * PublicLayout — Layout sans sidebar pour les pages publiques (formations)
 *
 * Ce layout masque intégralement les menus / sidebar de la plateforme NEXORA.
 * Il affiche uniquement : logo · bouton connexion/espace · contenu · footer.
 */

import { ReactNode } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { LogIn, LayoutDashboard } from "lucide-react";
import { getNexoraUser } from "@/lib/nexora-auth";
import nexoraLogo from "@/assets/nexora-logo.png";

interface PublicLayoutProps {
  children: ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const user = getNexoraUser();

  // ── Layout public (header minimaliste + contenu + footer) ───────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* Header — aucun menu plateforme */}
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-6xl mx-auto flex items-center justify-between h-14 px-4">

          {/* Logo — cliquable vers l'accueil */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 focus:outline-none"
            aria-label="Accueil Nexora"
          >
            <img src={nexoraLogo} alt="Nexora" className="h-8 w-auto" />
          </button>

          {/* Actions droite */}
          <div className="flex items-center gap-3">
            {user ? (
              // Utilisateur connecté → bouton "Mon espace"
              <button
                onClick={() => navigate("/dashboard")}
                className="flex items-center gap-2 text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Mon espace
              </button>
            ) : (
              // Visiteur → Se connecter + Créer un compte
              <>
                <button
                  onClick={() =>
                    navigate(
                      `/login?redirect=${encodeURIComponent(
                        location.pathname + location.search
                      )}`
                    )
                  }
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <LogIn className="w-4 h-4" />
                  Se connecter
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center gap-2 text-sm font-bold bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Créer un compte
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6">
        {children}
      </main>

      
      {/* Footer minimaliste */}
      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Nexora. Tous droits réservés.</span>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/cgu")}
              className="hover:text-foreground transition-colors"
            >
              CGU
            </button>
            <button
              onClick={() => navigate("/confidentialite")}
              className="hover:text-foreground transition-colors"
            >
              Confidentialité
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
