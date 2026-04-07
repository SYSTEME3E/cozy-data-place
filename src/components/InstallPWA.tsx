// ============================================================
//  InstallPWA.tsx — Bouton d'installation Nexora PWA
//  Place ce fichier dans : src/components/InstallPWA.tsx
//  Puis importe-le dans App.tsx ou AppLayout.tsx
// ============================================================

import { useState, useEffect } from "react";
import { Download, Share, X } from "lucide-react";

// Type pour l'événement beforeinstallprompt (non standard, absent des typings TS)
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidButton, setShowAndroidButton] = useState(false);
  const [showIOSBanner, setShowIOSBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // ── Détection de la plateforme ────────────────────────────
  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    !(window as Window & { MSStream?: unknown }).MSStream;

  const isInStandaloneMode = () =>
    "standalone" in navigator &&
    (navigator as Navigator & { standalone?: boolean }).standalone === true;

  const isAlreadyInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    isInStandaloneMode();

  useEffect(() => {
    // Si déjà installée, ne rien afficher
    if (isAlreadyInstalled()) return;

    // iOS Safari — pas de beforeinstallprompt, on affiche une aide manuelle
    if (isIOS()) {
      const iosDismissed = localStorage.getItem("nexora-ios-banner-dismissed");
      if (!iosDismissed) setShowIOSBanner(true);
      return;
    }

    // Android / Chrome — écoute l'événement natif
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidButton(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // ── Gestionnaire d'installation Android ──────────────────
  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      console.log("[PWA] Nexora installée avec succès.");
    }
    setDeferredPrompt(null);
    setShowAndroidButton(false);
  };

  // ── Fermeture de la bannière iOS ──────────────────────────
  const handleIOSDismiss = () => {
    localStorage.setItem("nexora-ios-banner-dismissed", "true");
    setShowIOSBanner(false);
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <>
      {/* ── Bouton Android / Chrome ────────────────────────── */}
      {showAndroidButton && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "10px",
            backgroundColor: "#0a0a0a",
            border: "1.5px solid #84cc16",
            borderRadius: "12px",
            padding: "12px 20px",
            boxShadow: "0 0 20px rgba(132, 204, 22, 0.35)",
            cursor: "pointer",
            whiteSpace: "nowrap",
            animation: "fadeInUp 0.4s ease",
          }}
          onClick={handleInstallClick}
          role="button"
          aria-label="Installer l'application Nexora"
        >
          <Download size={18} color="#84cc16" />
          <span
            style={{
              color: "#ffffff",
              fontSize: "14px",
              fontWeight: 600,
              letterSpacing: "0.02em",
            }}
          >
            Installer l&apos;application Nexora
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAndroidButton(false);
            }}
            aria-label="Fermer"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "0 0 0 8px",
              lineHeight: 1,
            }}
          >
            <X size={15} color="#aaaaaa" />
          </button>
        </div>
      )}

      {/* ── Bannière iOS Safari ────────────────────────────── */}
      {showIOSBanner && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            left: "16px",
            right: "16px",
            zIndex: 9999,
            backgroundColor: "#0a0a0a",
            border: "1.5px solid #84cc16",
            borderRadius: "14px",
            padding: "16px 18px",
            boxShadow: "0 0 24px rgba(132, 204, 22, 0.3)",
            animation: "fadeInUp 0.4s ease",
          }}
        >
          {/* Flèche décorative pointant vers le bouton Share d'iOS */}
          <div
            style={{
              position: "absolute",
              bottom: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "10px solid #84cc16",
            }}
          />

          <button
            onClick={handleIOSDismiss}
            aria-label="Fermer"
            style={{
              position: "absolute",
              top: "10px",
              right: "12px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={16} color="#aaaaaa" />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <span style={{ fontSize: "20px" }}>📲</span>
            <span
              style={{
                color: "#84cc16",
                fontWeight: 700,
                fontSize: "15px",
              }}
            >
              Installer Nexora
            </span>
          </div>

          <p
            style={{
              color: "#e5e5e5",
              fontSize: "13px",
              lineHeight: "1.6",
              margin: 0,
            }}
          >
            Pour ajouter Nexora à votre écran d&apos;accueil sur iOS :
          </p>

          <ol
            style={{
              color: "#cccccc",
              fontSize: "13px",
              lineHeight: "1.8",
              margin: "8px 0 0 0",
              paddingLeft: "18px",
            }}
          >
            <li>
              Appuyez sur l&apos;icône{" "}
              <Share
                size={13}
                style={{ verticalAlign: "middle", display: "inline" }}
                color="#84cc16"
              />{" "}
              <strong style={{ color: "#ffffff" }}>Partager</strong> dans Safari
            </li>
            <li>
              Sélectionnez{" "}
              <strong style={{ color: "#84cc16" }}>
                « Sur l&apos;écran d&apos;accueil »
              </strong>
            </li>
            <li>
              Appuyez sur <strong style={{ color: "#ffffff" }}>Ajouter</strong>
            </li>
          </ol>
        </div>
      )}

      {/* Animation CSS */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </>
  );
};

export default InstallPWA;
