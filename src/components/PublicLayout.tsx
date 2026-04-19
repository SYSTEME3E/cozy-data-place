/**
 * PublicLayout — Layout sans sidebar pour les pages publiques (formations)
 *
 * Règles d'accès :
 * ✅ Utilisateur connecté → accède normalement, sans restriction
 * ✅ Visiteur avec ?ref=CODE → accède normalement, ref sauvegardé
 * ❌ Visiteur SANS ?ref= → page "Accès restreint" (lien d'affiliation requis)
 *
 * Ce layout masque intégralement les menus / sidebar de la plateforme NEXORA.
 * Il affiche uniquement : logo · bouton connexion/espace · contenu · footer.
 */

import { ReactNode, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { LogIn, ShieldAlert, LayoutDashboard } from "lucide-react";
import { getNexoraUser } from "@/lib/nexora-auth";
import { saveAffiliateRef, getAffiliateRef } from "@/lib/affiliateService";
import nexoraLogo from "@/assets/nexora-logo.png";

interface PublicLayoutProps {
  children: ReactNode;
  /**
   * Si true (défaut), exige un ?ref= pour les visiteurs non connectés.
   * Les utilisateurs connectés ne sont jamais bloqués.
   */
  requireAffiliateLink?: boolean;
}

export default function PublicLayout({
  children,
  requireAffiliateLink = true,
}: PublicLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const user = getNexoraUser();
  const refFromUrl = searchParams.get("ref");

  // ── Persister le ref affilié dès qu'il apparaît dans l'URL ──────────────────
  useEffect(() => {
    if (refFromUrl) saveAffiliateRef(refFromUrl);
  }, [refFromUrl]);

  // ── Résolution du ref affilié (URL en priorité, sinon stockage local) ───────
  const affiliateRef = refFromUrl || getAffiliateRef();

  // ── Règle d'accès ────────────────────────────────────────────────────────────
  // Bloqué seulement si : page restreinte + visiteur non connecté + aucun ref
  const isAccessDenied =
    requireAffiliateLink &&
    !user &&
    !affiliateRef;

  // ── Page "Accès restreint" ───────────────────────────────────────────────────
  if (isAccessDenied) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-10 h-10 text-red-500" />
        </div>
        <img src={nexoraLogo} alt="Nexora" className="h-8 w-auto mb-6 opacity-60" />
        <h1 className="text-2xl font-black text-foreground mb-2">Accès restreint</h1>
        <p className="text-muted-foreground text-sm mb-1 max-w-xs">
          Cette page est accessible uniquement via un{" "}
          <span className="font-bold text-primary">lien d'affiliation</span>.
        </p>
        <p className="text-muted-foreground text-xs mb-8 max-w-xs">
          Demandez à votre parrain de vous partager son lien personnel pour
          accéder aux formations.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() =>
              navigate(
                `/login?redirect=${encodeURIComponent(
                  location.pathname + location.search
                )}`
              )
            }
            className="flex items-center justify-center gap-2 bg-primary text-white font-bold px-6 py-3 rounded-xl hover:bg-primary/90 transition-all"
          >
            <LogIn className="w-4 h-4" /> J'ai déjà un compte
          </button>
          <button
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors px-6 py-3 rounded-xl border border-border hover:bg-muted/40"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

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
                  onClick={() =>
                    navigate(
                      `/register${affiliateRef ? `?ref=${affiliateRef}` : ""}`
                    )
                  }
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
