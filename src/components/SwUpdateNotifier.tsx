// ============================================================
//  SwUpdateNotifier.tsx
//  Écoute les messages du Service Worker et recharge la page
//  automatiquement quand une nouvelle version est disponible.
//  ✅ SOLUTION au problème "les modifs ne s'affichent pas"
// ============================================================

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

const SwUpdateNotifier = () => {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // ── 1. Écoute le message SW_UPDATED envoyé par le Service Worker ──
    // Quand le nouveau SW s'active, il envoie ce message à tous les onglets.
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "SW_UPDATED") {
        // Recharge automatiquement pour afficher la nouvelle version
        window.location.reload();
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // ── 2. Vérifie aussi si un nouveau SW est en attente d'activation ──
    // Cas où l'utilisateur avait déjà la page ouverte avant le déploiement.
    const checkForWaiting = async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.waiting) {
        // Un nouveau SW attend → affiche la bannière de mise à jour
        setShowBanner(true);
      }
    };
    checkForWaiting();

    // ── 3. Écoute les nouveaux SW qui arrivent en attente ──
    const handleControllerChange = () => {
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  // Force l'activation du SW en attente
  const applyUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      // Demande au SW en attente de s'activer immédiatement
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  if (!showBanner) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        backgroundColor: "#0a0a0a",
        border: "1.5px solid #6366f1",
        borderRadius: "14px",
        padding: "14px 20px",
        boxShadow: "0 0 0 1px rgba(99,102,241,0.2), 0 8px 32px rgba(99,102,241,0.3)",
        whiteSpace: "nowrap",
        animation: "swFadeUp 0.4s ease",
      }}
    >
      <RefreshCw size={16} color="#6366f1" />
      <span style={{ color: "#fff", fontSize: "13px", fontWeight: 600 }}>
        Nouvelle version disponible
      </span>
      <button
        onClick={applyUpdate}
        style={{
          background: "#6366f1",
          border: "none",
          cursor: "pointer",
          color: "#fff",
          fontSize: "12px",
          fontWeight: 700,
          padding: "6px 14px",
          borderRadius: "8px",
        }}
      >
        Mettre à jour
      </button>
      <button
        onClick={() => setShowBanner(false)}
        aria-label="Fermer"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
        }}
      >
        <X size={14} color="#555" />
      </button>

      <style>{`
        @keyframes swFadeUp {
          from { opacity: 0; transform: translateX(-50%) translateY(16px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default SwUpdateNotifier;
