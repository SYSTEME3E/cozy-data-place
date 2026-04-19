/**
 * NEXORA — Hook de sécurité vidéo
 * Centralise toutes les détections et protections anti-piratage
 */

import { useEffect, useRef, useState, useCallback } from "react";

interface SecurityConfig {
  userEmail: string;
  userId: string;
  onSecurityBreach?: (reason: string) => void;
}

interface SecurityState {
  isBlurred: boolean;
  isDevToolsOpen: boolean;
  isSuspicious: boolean;
  warningCount: number;
  blobUrl: string | null;
}

const MAX_WARNINGS = 3;

export function useVideoSecurity(
  videoRef: React.RefObject<HTMLVideoElement>,
  config: SecurityConfig
) {
  const [state, setState] = useState<SecurityState>({
    isBlurred: false,
    isDevToolsOpen: false,
    isSuspicious: false,
    warningCount: 0,
    blobUrl: null,
  });

  const warningCountRef = useRef(0);
  const devToolsCheckRef = useRef<number>();
  const tokenRefreshRef = useRef<number>();

  // ─── Chargement sécurisé via blob URL ───────────────────────────────────────
  const loadSecureVideo = useCallback(
    async (signedUrl: string) => {
      try {
        // Révoquer l'ancien blob URL
        if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);

        const response = await fetch(signedUrl, {
          headers: {
            "X-Security-Token": config.userId,
          },
          credentials: "include",
        });

        if (!response.ok) throw new Error("Accès refusé");

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        setState((s) => ({ ...s, blobUrl }));

        if (videoRef.current) {
          videoRef.current.src = blobUrl;
        }
      } catch (err) {
        console.error("[Security] Échec chargement sécurisé:", err);
        config.onSecurityBreach?.("load_failed");
      }
    },
    [config, state.blobUrl, videoRef]
  );

  // ─── Révocation blob URL au démontage ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (state.blobUrl) URL.revokeObjectURL(state.blobUrl);
    };
  }, [state.blobUrl]);

  // ─── Détection DevTools (méthode taille fenêtre) ────────────────────────────
  useEffect(() => {
    const THRESHOLD = 160;

    const checkDevTools = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      const isOpen = widthDiff > THRESHOLD || heightDiff > THRESHOLD;

      if (isOpen !== state.isDevToolsOpen) {
        setState((s) => ({ ...s, isDevToolsOpen: isOpen, isBlurred: isOpen }));
        if (isOpen) {
          videoRef.current?.pause();
          recordSuspiciousAction("devtools_detected");
        }
      }
    };

    // Méthode complémentaire : debugger timing
    const devToolsDebugCheck = () => {
      const start = performance.now();
      // eslint-disable-next-line no-debugger
      debugger;
      const elapsed = performance.now() - start;
      if (elapsed > 100) {
        setState((s) => ({ ...s, isDevToolsOpen: true, isBlurred: true }));
        videoRef.current?.pause();
      }
    };

    devToolsCheckRef.current = window.setInterval(checkDevTools, 1000) as unknown as number;

    return () => {
      if (devToolsCheckRef.current) clearInterval(devToolsCheckRef.current);
    };
  }, [state.isDevToolsOpen, videoRef]);

  // ─── Pause sur onglet caché / perte focus ───────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setState((s) => ({ ...s, isBlurred: true }));
      }
    };

    const handleBlur = () => {
      videoRef.current?.pause();
      setState((s) => ({ ...s, isBlurred: true }));
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [videoRef]);

  // ─── Blocage clic droit global sur le player ────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        videoRef.current?.contains(e.target as Node) ||
        (e.target as Element)?.closest("[data-secure-player]")
      ) {
        e.preventDefault();
        recordSuspiciousAction("right_click");
      }
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [videoRef]);

  // ─── Blocage touches de raccourci (F12, Ctrl+S, Ctrl+U…) ───────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const blocked =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && ["s", "u", "S", "U"].includes(e.key)) ||
        (e.metaKey && ["s", "u", "S", "U"].includes(e.key));

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        recordSuspiciousAction("keyboard_shortcut");
      }
    };

    document.addEventListener("keydown", handleKeyDown, { capture: true });
    return () => document.removeEventListener("keydown", handleKeyDown, { capture: true });
  }, []);

  // ─── Détection Screen Capture API (Chrome 94+) ──────────────────────────────
  useEffect(() => {
    // Monkey-patch getDisplayMedia pour détecter les tentatives
    const originalGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(
      navigator.mediaDevices
    );

    if (originalGetDisplayMedia) {
      navigator.mediaDevices.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
        videoRef.current?.pause();
        setState((s) => ({ ...s, isBlurred: true }));
        recordSuspiciousAction("screen_capture_attempt");
        // On laisse l'API fonctionner mais le contenu sera flou
        return originalGetDisplayMedia(constraints);
      };

      return () => {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      };
    }
  }, [videoRef]);

  // ─── Compteur d'actions suspectes ───────────────────────────────────────────
  const recordSuspiciousAction = useCallback(
    (reason: string) => {
      warningCountRef.current += 1;
      setState((s) => ({ ...s, warningCount: warningCountRef.current }));

      console.warn(`[Security] Action suspecte: ${reason} (${warningCountRef.current}/${MAX_WARNINGS})`);

      if (warningCountRef.current >= MAX_WARNINGS) {
        setState((s) => ({ ...s, isSuspicious: true }));
        videoRef.current?.pause();
        config.onSecurityBreach?.(reason);
      }
    },
    [config, videoRef]
  );

  const unblur = useCallback(() => {
    setState((s) => ({ ...s, isBlurred: false }));
  }, []);

  const resetWarnings = useCallback(() => {
    warningCountRef.current = 0;
    setState((s) => ({ ...s, warningCount: 0, isSuspicious: false }));
  }, []);

  return {
    ...state,
    loadSecureVideo,
    unblur,
    resetWarnings,
    recordSuspiciousAction,
  };
}
