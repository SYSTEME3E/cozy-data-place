// ============================================================
//  InstallPWA.tsx — Bouton d'installation Nexora PWA
//  Corrections :
//  - Animation iOS séparée (pas de translateX sur la bannière iOS)
//  - Meilleure détection Android avec timeout de sécurité
//  - Détection display-mode standalone améliorée
// ============================================================

import { useState, useEffect, useRef } from "react";
import { Download, Share, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidButton, setShowAndroidButton] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;

  const isInstalled = () => {
    // Vérifie toutes les façons dont une PWA peut être installée
    if (window.matchMedia("(display-mode: standalone)").matches) return true;
    if ((navigator as Navigator & { standalone?: boolean }).standalone === true) return true;
    if (document.referrer.startsWith("android-app://")) return true;
    return false;
  };

  useEffect(() => {
    // Déjà installée → ne rien afficher
    if (isInstalled()) return;

    // ── iOS Safari ───────────────────────────────────────────
    if (isIOS()) {
      // N'affiche que dans Safari (pas dans d'autres browsers iOS)
      const isSafari =
        /safari/i.test(navigator.userAgent) &&
        !/chrome|crios|fxios/i.test(navigator.userAgent);
      if (!isSafari) return;

      const dismissed = localStorage.getItem("nexora-ios-dismissed");
      const dismissedAt = dismissed ? parseInt(dismissed, 10) : 0;
      // Réaffiche après 7 jours si re-rejeté
      if (!dismissed || Date.now() - dismissedAt > 7 * 24 * 60 * 60 * 1000) {
        // Délai d'affichage pour ne pas surprendre l'utilisateur
        timeoutRef.current = setTimeout(() => setShowIOSBanner(true), 3000);
      }
      return;
    }

    // ── Android / Chrome / Edge ──────────────────────────────
    const handler = (e: Event) => {
      e.preventDefault();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => {
      setShowAndroidButton(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowAndroidButton(false);
      setDeferredPrompt(null);
    }
  };

  const handleIOSDismiss = () => {
    localStorage.setItem("nexora-ios-dismissed", String(Date.now()));
    setShowIOSBanner(false);
  };

  return (
    <>
      {/* ── Bouton Android / Chrome / Edge ─────────────────── */}
      {showAndroidButton && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#0a0a0a",
            border: "1.5px solid #84cc16",
            borderRadius: "14px",
            padding: "14px 22px",
            boxShadow:
              "0 0 0 1px rgba(132,204,22,0.15), 0 0 24px rgba(132,204,22,0.3)",
            whiteSpace: "nowrap",
            // ✅ Animation correcte pour le bouton Android (centré avec translateX)
            animation: "nexoraFadeUpCentered 0.4s ease",
          }}
        >
          <Download size={18} color="#84cc16" />
          <button
            onClick={handleInstall}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.02em",
              padding: 0,
            }}
          >
            Installer l&apos;application Nexora
          </button>
          <button
            onClick={() => setShowAndroidButton(false)}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0 0 0 6px",
              lineHeight: 1,
            }}
          >
            <X size={14} color="#666" />
          </button>
        </div>
      )}

      {/* ── Bannière iOS Safari ─────────────────────────────── */}
      {showIOSBanner && (
        <div
          style={{
            position: "fixed",
            bottom: "28px",
            left: "16px",
            right: "16px",
            zIndex: 9999,
            backgroundColor: "#0a0a0a",
            border: "1.5px solid #84cc16",
            borderRadius: "16px",
            padding: "18px 18px 16px",
            boxShadow:
              "0 0 0 1px rgba(132,204,22,0.15), 0 0 28px rgba(132,204,22,0.25)",
            // ✅ FIX : animation séparée sans translateX (la bannière iOS n'est pas centrée)
            animation: "nexoraFadeUpBanner 0.4s ease",
          }}
        >
          {/* Flèche bas */}
          <div
            style={{
              position: "absolute",
              bottom: "-9px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "9px solid transparent",
              borderRight: "9px solid transparent",
              borderTop: "9px solid #84cc16",
            }}
          />

          {/* Bouton fermer */}
          <button
            onClick={handleIOSDismiss}
            aria-label="Fermer"
            style={{
              position: "absolute",
              top: "12px",
              right: "14px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={16} color="#666" />
          </button>

          {/* Titre */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "12px",
            }}
          >
            <span style={{ fontSize: "22px" }}>📲</span>
            <span style={{ color: "#84cc16", fontWeight: 700, fontSize: "15px" }}>
              Installer Nexora sur iOS
            </span>
          </div>

          {/* Instructions */}
          <ol
            style={{
              color: "#cccccc",
              fontSize: "13px",
              lineHeight: "2",
              margin: 0,
              paddingLeft: "20px",
            }}
          >
            <li>
              Appuyez sur{" "}
              <Share size={13} style={{ verticalAlign: "middle", display: "inline" }} color="#84cc16" />{" "}
              <strong style={{ color: "#fff" }}>Partager</strong> en bas de Safari
            </li>
            <li>
              Choisissez{" "}
              <strong style={{ color: "#84cc16" }}>
                « Sur l&apos;écran d&apos;accueil »
              </strong>
            </li>
            <li>
              Appuyez sur <strong style={{ color: "#fff" }}>Ajouter</strong> en haut à droite
            </li>
          </ol>

          <p style={{ color: "#555", fontSize: "11px", marginTop: "10px", marginBottom: 0 }}>
            L&apos;app s&apos;ouvrira en plein écran, sans barre Safari.
          </p>
        </div>
      )}

      {/* ✅ FIX : 2 animations distinctes — une avec translateX pour Android, une sans pour iOS */}
      <style>{`
        @keyframes nexoraFadeUpCentered {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes nexoraFadeUpBanner {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default InstallPWA;
