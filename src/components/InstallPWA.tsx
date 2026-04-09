// ============================================================
//  InstallPWA.tsx — Bouton d'installation Nexora PWA
//  S'affiche UNIQUEMENT si l'app n'est pas encore installée.
//  Une fois installée → disparaît définitivement.
//  Fonctionne comme une vraie app (mode standalone, sans Chrome).
// ============================================================

import { useState, useEffect } from "react";
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

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;

  // Vérifie si l'app tourne déjà en mode standalone (= installée)
  const isInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  useEffect(() => {
    // ── Si déjà installée en mode app → ne rien afficher du tout ──
    if (isInstalled()) return;

    // ── iOS Safari ──────────────────────────────────────────────
    if (isIOS()) {
      const dismissed = localStorage.getItem("nexora-ios-dismissed");
      if (!dismissed) setShowIOSBanner(true);
      return;
    }

    // ── Android / Chrome / Edge ─────────────────────────────────
    const handler = (e: Event) => {
      e.preventDefault(); // bloque le mini-infobar Chrome natif
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Si l'app vient d'être installée, cacher le bouton
    window.addEventListener("appinstalled", () => {
      setShowAndroidButton(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Déclenche le prompt natif d'installation ─────────────────
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
    localStorage.setItem("nexora-ios-dismissed", "true");
    setShowIOSBanner(false);
  };

  return (
    <>
      {/* ── Bouton Android / Chrome / Edge ─────────────────────── */}
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
            animation: "nexoraFadeUp 0.4s ease",
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

      {/* ── Bannière iOS Safari ─────────────────────────────────── */}
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
            animation: "nexoraFadeUp 0.4s ease",
          }}
        >
          {/* Flèche bas pointant vers le bouton Share d'iOS */}
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
            <span
              style={{ color: "#84cc16", fontWeight: 700, fontSize: "15px" }}
            >
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
              <Share
                size={13}
                style={{ verticalAlign: "middle", display: "inline" }}
                color="#84cc16"
              />{" "}
              <strong style={{ color: "#fff" }}>Partager</strong> en bas de
              Safari
            </li>
            <li>
              Choisissez{" "}
              <strong style={{ color: "#84cc16" }}>
                « Sur l&apos;écran d&apos;accueil »
              </strong>
            </li>
            <li>
              Appuyez sur{" "}
              <strong style={{ color: "#fff" }}>Ajouter</strong> en haut à
              droite
            </li>
          </ol>

          <p
            style={{
              color: "#555",
              fontSize: "11px",
              marginTop: "10px",
              marginBottom: 0,
            }}
          >
            L&apos;app s&apos;ouvrira en plein écran, sans barre Safari.
          </p>
        </div>
      )}

      {/* Animation */}
      <style>{`
        @keyframes nexoraFadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
};

export default InstallPWA;
