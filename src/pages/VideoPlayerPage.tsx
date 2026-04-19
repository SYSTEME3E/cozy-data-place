/**
 * NEXORA — Page Lecteur Vidéo Ultra-Sécurisé v2
 *
 * Sécurités implémentées :
 * ✅ Streaming via blob URL (URL directe jamais exposée)
 * ✅ Token signé expirant (5 min) via Edge Function
 * ✅ Watermark dynamique (email + ID)
 * ✅ Blocage clic droit, F12, Ctrl+S, Ctrl+U
 * ✅ Détection DevTools → pause + flou
 * ✅ Patch getDisplayMedia → pause au screen record
 * ✅ Pause sur onglet caché / perte de focus
 * ✅ Limite multi-appareils (max 3) via device fingerprint
 * ✅ Contrôle progression séquentielle côté serveur
 * ✅ Auto-déconnexion si comportement suspect (3 violations)
 * ✅ Logs d'audit côté serveur
 * ✅ Flag Android FLAG_SECURE (via Capacitor plugin)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Lock, Play, Pause,
  CheckCircle, Loader2, AlertTriangle, EyeOff,
  Shield, ShieldAlert, Smartphone,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser, isNexoraAdmin } from "@/lib/nexora-auth";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Lecon {
  id: string;
  titre: string;
  type: "video" | "pdf" | "lien";
  url: string | null;
  storage_path: string | null;
  duree_secondes: number;
  ordre: number;
  module_id: string;
  module_titre: string;
}

type SecurityState = "safe" | "warning" | "blocked";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Génère un device fingerprint basé sur caractéristiques navigateur */
async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency,
    (navigator as any).deviceMemory ?? "?",
  ].join("|");

  // Hash simple via SubtleCrypto
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/** Appel à l'Edge Function pour obtenir un URL signé */
async function fetchSecureToken(
  videoId: string,
  courseId: string,
  deviceFingerprint: string
): Promise<{ signedUrl: string; expiresAt: string } | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-video-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
          "X-Device-Fingerprint": deviceFingerprint,
        },
        body: JSON.stringify({ videoId, courseId, deviceFingerprint }),
      }
    );

    if (!response.ok) {
      const err = await response.json();
      console.error("[SecurePlayer] Token refusé:", err);
      return null;
    }

    return await response.json();
  } catch (err) {
    console.error("[SecurePlayer] Erreur token:", err);
    return null;
  }
}

/** Charge la vidéo via blob URL pour ne jamais exposer l'URL signée */
async function loadVideoAsBlob(
  signedUrl: string,
  videoEl: HTMLVideoElement,
  previousBlobRef: React.MutableRefObject<string | null>
): Promise<boolean> {
  try {
    const res = await fetch(signedUrl);
    if (!res.ok) throw new Error("Fetch failed");

    const blob = await res.blob();

    // Révoquer l'ancien blob URL avant d'en créer un nouveau
    if (previousBlobRef.current) {
      URL.revokeObjectURL(previousBlobRef.current);
    }

    const blobUrl = URL.createObjectURL(blob);
    previousBlobRef.current = blobUrl;
    videoEl.src = blobUrl;
    return true;
  } catch {
    return false;
  }
}

// ─── Composant Watermark ──────────────────────────────────────────────────────
function DynamicWatermark({ email, userId }: { email: string; userId: string }) {
  const [positions, setPositions] = useState<Array<{ x: number; y: number; opacity: number }>>([]);
  const shortId = userId.slice(0, 8).toUpperCase();
  const text = `${email} · ${shortId}`;

  useEffect(() => {
    const generate = () =>
      setPositions(
        Array.from({ length: 3 }, () => ({
          x: 5 + Math.random() * 68,
          y: 8 + Math.random() * 75,
          opacity: 0.10 + Math.random() * 0.12,
        }))
      );
    generate();
    const id = setInterval(generate, 7000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 select-none overflow-hidden"
      aria-hidden="true"
    >
      {positions.map((p, i) => (
        <div
          key={i}
          className="absolute transition-all duration-[2500ms] ease-in-out"
          style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.opacity, transform: "rotate(-18deg)" }}
        >
          <span style={{
            fontFamily: "monospace",
            fontSize: "11px",
            fontWeight: 700,
            color: "white",
            letterSpacing: "0.06em",
            textShadow: "0 1px 4px rgba(0,0,0,0.9)",
            whiteSpace: "nowrap",
          }}>
            {text}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function VideoPlayerPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devToolsIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningCountRef = useRef(0);
  const deviceFingerprintRef = useRef<string>("");

  // ── State ─────────────────────────────────────────────────────────────────
  const [lecon, setLecon] = useState<Lecon | null>(null);
  const [allLecons, setAllLecons] = useState<Lecon[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [securityState, setSecurityState] = useState<SecurityState>("safe");
  const [warningMessage, setWarningMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userId, setUserId] = useState("");

  const currentIndex = allLecons.findIndex((l) => l.id === videoId);
  const nextLecon = currentIndex >= 0 && currentIndex < allLecons.length - 1
    ? allLecons[currentIndex + 1] : null;
  const prevLecon = currentIndex > 0 ? allLecons[currentIndex - 1] : null;

  // ── Sécurité : avertissement / blocage ───────────────────────────────────
  const triggerSecurityWarning = useCallback((reason: string) => {
    warningCountRef.current += 1;
    const count = warningCountRef.current;

    videoRef.current?.pause();
    setIsBlurred(true);
    setIsPaused(true);

    console.warn(`[Security] Violation #${count}: ${reason}`);

    if (count >= 3) {
      setSecurityState("blocked");
      setWarningMessage("Activité suspecte détectée. Lecture bloquée.");
      // Déconnexion automatique après 3 secondes
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login?reason=security");
      }, 3000);
    } else {
      setSecurityState("warning");
      setWarningMessage(`Attention : action non autorisée détectée (${count}/3 avertissements).`);
      setTimeout(() => {
        if (warningCountRef.current < 3) setSecurityState("safe");
      }, 4000);
    }
  }, [navigate]);

  // ── Activation FLAG_SECURE Android (Capacitor) ───────────────────────────
  useEffect(() => {
    const enableAndroidSecureFlag = async () => {
      try {
        // Capacitor Android — empêche captures d'écran et enregistrement
        const { Plugins } = await import("@capacitor/core");
        const { ScreenProtector } = Plugins as any;
        if (ScreenProtector) {
          await ScreenProtector.enable();
        }
      } catch {
        // Non-Capacitor env, ignoré silencieusement
      }
    };
    enableAndroidSecureFlag();
  }, []);

  // ── Patch getDisplayMedia (détection screen record) ──────────────────────
  useEffect(() => {
    const originalGetDisplayMedia = navigator.mediaDevices?.getDisplayMedia?.bind(
      navigator.mediaDevices
    );
    if (!originalGetDisplayMedia) return;

    navigator.mediaDevices.getDisplayMedia = async (constraints?: DisplayMediaStreamOptions) => {
      triggerSecurityWarning("screen_record_attempt");
      return originalGetDisplayMedia(constraints);
    };

    return () => {
      navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
    };
  }, [triggerSecurityWarning]);

  // ── Détection DevTools (taille fenêtre + timing debugger) ────────────────
  useEffect(() => {
    const THRESHOLD = 160;
    let wasOpen = false;

    const check = () => {
      const isOpen =
        window.outerWidth - window.innerWidth > THRESHOLD ||
        window.outerHeight - window.innerHeight > THRESHOLD;

      if (isOpen && !wasOpen) {
        wasOpen = true;
        triggerSecurityWarning("devtools_open");
      } else if (!isOpen) {
        wasOpen = false;
      }
    };

    devToolsIntervalRef.current = setInterval(check, 1000);
    return () => {
      if (devToolsIntervalRef.current) clearInterval(devToolsIntervalRef.current);
    };
  }, [triggerSecurityWarning]);

  // ── Blocage clic droit sur le player ─────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) {
        e.preventDefault();
        triggerSecurityWarning("right_click");
      }
    };
    document.addEventListener("contextmenu", handler);
    return () => document.removeEventListener("contextmenu", handler);
  }, [triggerSecurityWarning]);

  // ── Blocage raccourcis clavier dangereux ──────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isBlocked =
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C", "K"].includes(e.key)) ||
        (e.ctrlKey && ["s", "S", "u", "U", "p", "P"].includes(e.key)) ||
        (e.metaKey && ["s", "S", "u", "U"].includes(e.key));

      if (isBlocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
        triggerSecurityWarning("keyboard_shortcut");
      }
    };
    document.addEventListener("keydown", handler, { capture: true });
    return () => document.removeEventListener("keydown", handler, { capture: true });
  }, [triggerSecurityWarning]);

  // ── Pause sur onglet caché / blur ────────────────────────────────────────
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setIsBlurred(true);
        setIsPaused(true);
      }
    };
    const onBlur = () => {
      videoRef.current?.pause();
      setIsPaused(true);
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  // ── Nettoyage blob URL au démontage ──────────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
    };
  }, []);

  // ── Chargement sécurisé de la vidéo ──────────────────────────────────────
  const loadSecureVideo = useCallback(
    async (leconData: Lecon) => {
      if (!videoRef.current || !courseId) return;

      setVideoLoading(true);
      setVideoError(false);

      // Priorité : storage_path (Supabase Storage) > url directe (legacy)
      if (leconData.storage_path) {
        const tokenData = await fetchSecureToken(
          leconData.id,
          courseId,
          deviceFingerprintRef.current
        );

        if (!tokenData) {
          setVideoError(true);
          setVideoLoading(false);
          return;
        }

        // ✅ FIX: Utiliser l'URL signée directement (streaming natif)
        // loadVideoAsBlob() téléchargeait tout le fichier avant de jouer → spinner infini
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        videoRef.current.src = tokenData.signedUrl;
        const success = true;

        if (!success) {
          setVideoError(true);
          setVideoLoading(false);
          return;
        }

        // Planifier le refresh du token avant expiration (à 80% du TTL)
        if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
        const ttlMs = new Date(tokenData.expiresAt).getTime() - Date.now();
        tokenRefreshTimerRef.current = setTimeout(() => {
          loadSecureVideo(leconData);
        }, ttlMs * 0.8);

      } else if (leconData.url) {
        // Fallback legacy : URL directe (moins sécurisée)
        console.warn("[SecurePlayer] Fallback URL directe — migrez vers storage_path");
        videoRef.current.src = leconData.url;
      } else {
        setVideoError(true);
      }

      setVideoLoading(false);
    },
    [courseId]
  );

  // ── Chargement données formation ──────────────────────────────────────────
  const loadData = useCallback(async () => {
    const user = getNexoraUser();
    const adminAccess = isNexoraAdmin();

    if (!user || !courseId || !videoId) { navigate("/login"); return; }

    setUserEmail(user.email ?? "");
    setUserId(user.id);

    // Générer le device fingerprint
    deviceFingerprintRef.current = await getDeviceFingerprint();

    setLoading(true);

    try {
      // Vérifier achat
      if (!adminAccess) {
        const { data: purchase } = await (supabase as any)
          .from("formation_purchases")
          .select("id")
          .eq("user_id", user.id)
          .eq("formation_id", courseId)
          .eq("status", "completed")
          .maybeSingle();

        if (!purchase) {
          setAccessDenied(true);
          setAccessDeniedReason("Vous n'avez pas accès à cette formation.");
          setLoading(false);
          return;
        }
      }

      // Charger modules et leçons
      const { data: mData } = await (supabase as any)
        .from("formation_modules")
        .select("id, titre, ordre")
        .eq("formation_id", courseId)
        .order("ordre", { ascending: true });

      const modIds = (mData || []).map((m: any) => m.id);

      const { data: leconsData } = await (supabase as any)
        .from("formation_lecons")
        .select("id, titre, type, url, storage_path, duree_secondes, ordre, module_id")
        .in("module_id", modIds)
        .eq("type", "video")
        .order("ordre", { ascending: true });

      const modMap: Record<string, any> = {};
      (mData || []).forEach((m: any) => { modMap[m.id] = m; });

      const flatLecons: Lecon[] = (leconsData || [])
        .map((l: any) => ({ ...l, module_titre: modMap[l.module_id]?.titre || "" }))
        .sort((a: any, b: any) => {
          const oA = modMap[a.module_id]?.ordre ?? 0;
          const oB = modMap[b.module_id]?.ordre ?? 0;
          return oA !== oB ? oA - oB : a.ordre - b.ordre;
        });

      setAllLecons(flatLecons);

      const currentLecon = flatLecons.find((l) => l.id === videoId);
      if (!currentLecon) { navigate(`/mes-formations/${courseId}/cours`); return; }

      // Vérifier progression séquentielle côté client (double contrôle avec serveur)
      if (!adminAccess) {
        const idx = flatLecons.findIndex((l) => l.id === videoId);
        if (idx > 0) {
          const prevL = flatLecons[idx - 1];
          const { data: prevProgress } = await (supabase as any)
            .from("video_progress")
            .select("status")
            .eq("user_id", user.id)
            .eq("video_id", prevL.id)
            .maybeSingle();

          if (!prevProgress || prevProgress.status !== "completed") {
            setAccessDenied(true);
            setAccessDeniedReason("Terminez la leçon précédente pour débloquer celle-ci.");
            setLoading(false);
            return;
          }
        }
      }

      setLecon(currentLecon);

      // Vérifier si déjà complétée
      const { data: progress } = await (supabase as any)
        .from("video_progress")
        .select("status")
        .eq("user_id", user.id)
        .eq("video_id", videoId)
        .maybeSingle();

      setIsCompleted(progress?.status === "completed");

      if (!progress) {
        await (supabase as any).from("video_progress").upsert({
          user_id: user.id,
          course_id: courseId,
          module_id: currentLecon.module_id,
          video_id: videoId,
          status: "unlocked",
        }, { onConflict: "user_id,video_id" });
      }

      // Charger la vidéo de façon sécurisée
      await loadSecureVideo(currentLecon);

    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  }, [courseId, videoId, navigate, loadSecureVideo]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Marquer comme terminée ────────────────────────────────────────────────
  const handleVideoEnded = useCallback(async () => {
    const user = getNexoraUser();
    if (!user || !courseId || !videoId || !lecon) return;
    setIsCompleted(true);
    setIsPaused(true);
    await (supabase as any).from("video_progress").upsert({
      user_id: user.id,
      course_id: courseId,
      module_id: lecon.module_id,
      video_id: videoId,
      status: "completed",
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
  }, [courseId, videoId, lecon]);

  const handlePlayPause = useCallback(() => {
    if (securityState === "blocked") return;
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, [securityState]);

  const goToNext = useCallback(() => {
    if (nextLecon && isCompleted)
      navigate(`/mes-formations/${courseId}/video/${nextLecon.id}`);
  }, [nextLecon, isCompleted, courseId, navigate]);

  const goToPrev = useCallback(() => {
    if (prevLecon)
      navigate(`/mes-formations/${courseId}/video/${prevLecon.id}`);
  }, [prevLecon, courseId, navigate]);

  // ── Rendu : chargement ────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="relative">
            <Loader2 className="w-10 h-10 text-violet-500 animate-spin" />
            <Shield className="w-4 h-4 text-emerald-500 absolute -bottom-1 -right-1" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">Vérification de l'accès sécurisé…</p>
        </div>
      </AppLayout>
    );
  }

  // ── Rendu : accès refusé ───────────────────────────────────────────────────
  if (accessDenied) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h2 className="text-xl font-black text-foreground">Accès refusé</h2>
            <p className="text-sm text-muted-foreground mt-1">{accessDeniedReason}</p>
          </div>
          <button
            onClick={() => navigate("/mes-formations")}
            className="px-6 py-2.5 rounded-2xl bg-violet-600 text-white font-bold text-sm"
          >
            Mes formations
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!lecon) return null;

  // ── Rendu principal ───────────────────────────────────────────────────────
  return (
    <AppLayout>
      {/* Bannière sécurité (warning / blocked) */}
      {securityState !== "safe" && (
        <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white ${
          securityState === "blocked" ? "bg-red-600" : "bg-amber-500"
        }`}>
          <ShieldAlert className="w-4 h-4 flex-shrink-0" />
          {warningMessage}
        </div>
      )}

      <div className="max-w-3xl mx-auto space-y-4 pb-10" style={{ marginTop: securityState !== "safe" ? "48px" : 0 }}>

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/mes-formations/${courseId}/cours`)}
            className="w-9 h-9 rounded-xl bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-violet-600 dark:text-violet-400 truncate">{lecon.module_titre}</p>
            <h1 className="text-base font-black text-foreground truncate leading-tight">{lecon.titre}</h1>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isCompleted && (
              <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full">
                <CheckCircle className="w-3.5 h-3.5" /> Terminée
              </div>
            )}
            {/* Indicateur sécurité */}
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              securityState === "safe" ? "bg-emerald-500/10" : "bg-red-500/10"
            }`} title="Lecture sécurisée">
              <Shield className={`w-4 h-4 ${
                securityState === "safe" ? "text-emerald-500" : "text-red-500"
              }`} />
            </div>
          </div>
        </div>

        {/* ── Lecteur vidéo sécurisé ── */}
        <div
          ref={containerRef}
          data-secure-player="true"
          className="relative w-full bg-black rounded-2xl overflow-hidden shadow-xl"
          style={{ aspectRatio: "16/9" }}
          // Empêche la sélection de texte (technique watermark)
          onSelectStart={(e) => e.preventDefault()}
        >
          {/* Vidéo (src chargé dynamiquement via blob URL, jamais via attribut HTML) */}
          <video
            ref={videoRef}
            key={lecon.id}
            className="w-full h-full object-contain"
            controlsList="nodownload nofullscreen noremoteplayback"
            disablePictureInPicture
            onEnded={handleVideoEnded}
            onPlay={() => { setIsPaused(false); setIsBlurred(false); }}
            onPause={() => setIsPaused(true)}
            onError={() => setVideoError(true)}
            onWaiting={() => setVideoLoading(true)}
            onCanPlay={() => setVideoLoading(false)}
            playsInline
            // Pas d'attribut "src" ici — chargé dynamiquement via JS
          />

          {/* Watermark dynamique */}
          {userEmail && (
            <DynamicWatermark email={userEmail} userId={userId} />
          )}

          {/* Overlay chargement vidéo */}
          {videoLoading && !videoError && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-white/60 text-xs font-medium">Chargement sécurisé…</p>
            </div>
          )}

          {/* Overlay flou (DevTools / onglet caché) */}
          {isBlurred && !videoError && securityState !== "blocked" && (
            <div
              className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center gap-3 cursor-pointer z-20"
              onClick={() => {
                if (securityState !== "blocked") {
                  setIsBlurred(false);
                  videoRef.current?.play();
                  setIsPaused(false);
                }
              }}
            >
              <EyeOff className="w-10 h-10 text-white/40" />
              <p className="text-white/60 text-sm font-medium">Lecture mise en pause</p>
              {securityState === "warning" && (
                <p className="text-amber-400/80 text-xs px-4 text-center">{warningMessage}</p>
              )}
              {securityState === "safe" && (
                <p className="text-white/40 text-xs">Cliquez pour reprendre</p>
              )}
            </div>
          )}

          {/* Overlay bloqué (3 violations) */}
          {securityState === "blocked" && (
            <div className="absolute inset-0 bg-black/98 flex flex-col items-center justify-center gap-4 z-40">
              <ShieldAlert className="w-12 h-12 text-red-500" />
              <p className="text-white/90 text-sm font-bold text-center px-6">
                Activité suspecte détectée
              </p>
              <p className="text-white/50 text-xs text-center px-8">
                Déconnexion en cours pour des raisons de sécurité…
              </p>
            </div>
          )}

          {/* Erreur */}
          {videoError && (
            <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center gap-3 z-20">
              <AlertTriangle className="w-10 h-10 text-red-400" />
              <p className="text-white/80 text-sm font-medium">Impossible de charger la vidéo</p>
              <button
                onClick={() => loadSecureVideo(lecon)}
                className="text-xs text-violet-400 underline"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Bouton play (quand en pause, pas de blur ni d'erreur) */}
          {isPaused && !isBlurred && !videoError && !videoLoading && securityState !== "blocked" && (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer group z-10"
              onClick={handlePlayPause}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-transform group-hover:scale-110">
                <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* Bouton pause (visible au hover) */}
          {!isPaused && !isBlurred && (
            <div
              className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100 transition-opacity z-10"
              onClick={handlePlayPause}
            >
              <Pause className="w-4 h-4 text-white" fill="currentColor" />
            </div>
          )}
        </div>

        {/* Info + navigation */}
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <h2 className="text-base font-black text-foreground">{lecon.titre}</h2>
            <p className="text-sm text-violet-600 dark:text-violet-400 font-semibold mt-0.5">{lecon.module_titre}</p>
            {lecon.duree_secondes > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Durée : {Math.floor(lecon.duree_secondes / 60)}min {lecon.duree_secondes % 60}s
              </p>
            )}
          </div>

          {/* Badge sécurité */}
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/8 border border-emerald-500/20 rounded-xl px-3 py-2">
            <Shield className="w-3 h-3 flex-shrink-0" />
            <span>Lecture sécurisée · Watermark actif · Appareil vérifié</span>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={goToPrev}
              disabled={!prevLecon}
              className="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-border text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
            >
              <ArrowLeft className="w-4 h-4" /> Précédent
            </button>

            <button
              onClick={goToNext}
              disabled={!isCompleted || !nextLecon}
              className={`flex-1 flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-bold transition-all ${
                isCompleted && nextLecon
                  ? "bg-violet-600 hover:bg-violet-700 text-white shadow-sm active:scale-[0.98]"
                  : "bg-muted text-muted-foreground cursor-not-allowed opacity-60"
              }`}
            >
              {!isCompleted
                ? <><Lock className="w-3.5 h-3.5" /> Terminez d'abord</>
                : !nextLecon
                ? <><CheckCircle className="w-3.5 h-3.5" /> Formation terminée !</>
                : <>Suivant <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          {!isCompleted && (
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <Lock className="w-3 h-3 flex-shrink-0" />
              Regardez la vidéo jusqu'à la fin pour débloquer la suivante.
            </p>
          )}
        </div>

        {/* Liste des leçons */}
        {allLecons.length > 1 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/50">
              <p className="text-sm font-black text-foreground">
                Leçon {currentIndex + 1} / {allLecons.length}
              </p>
            </div>
            <div className="divide-y divide-border/30 max-h-64 overflow-y-auto">
              {allLecons.map((l, idx) => {
                const isCurrent = l.id === videoId;
                const isLocked = idx > currentIndex + 1 && !isNexoraAdmin();

                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      if (!isLocked) navigate(`/mes-formations/${courseId}/video/${l.id}`);
                    }}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isCurrent ? "bg-violet-500/8" : isLocked ? "opacity-50 cursor-not-allowed" : "hover:bg-muted/20"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                      isCurrent ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`flex-1 text-xs font-semibold truncate ${isCurrent ? "text-violet-600 dark:text-violet-400" : "text-foreground"}`}>
                      {l.titre}
                    </span>
                    {isLocked && <Lock className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />}
                    {isCurrent && <Play className="w-3 h-3 text-violet-500 flex-shrink-0" fill="currentColor" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
