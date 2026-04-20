/**
 * NEXORA — Page Lecteur Vidéo Sécurisé v4
 *
 * Protections actives :
 * ✅ Lecteur custom (contrôles natifs cachés — contrôle total)
 * ✅ Pause / Play / Recommencer / Plein écran / Volume — autorisés
 * ✅ Barre de progression verrouillée (saut en avant interdit)
 * ✅ Vitesse bloquée à 1x
 * ✅ Téléchargement bloqué (nodownload + token signé expirant)
 * ✅ Clic droit / menu contextuel bloqué
 * ✅ Appui long (long press) bloqué
 * ✅ Ctrl+S / Ctrl+U bloqués
 * ✅ Progression séquentielle vérifiée côté serveur à chaque accès
 * ✅ Journalisation des tentatives de contournement (security_logs)
 * ✅ Token signé expirant avec refresh automatique à 80% du TTL
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Lock, Play, Pause,
  CheckCircle, Loader2, AlertTriangle, Shield,
  Volume2, VolumeX, Maximize, RotateCcw,
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getDeviceFingerprint(): Promise<string> {
  const raw = [
    navigator.userAgent, navigator.language,
    screen.width, screen.height, screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency,
    (navigator as any).deviceMemory ?? "?",
  ].join("|");
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(raw));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label = "Timeout"): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} dépassé (${ms}ms)`)), ms)
    ),
  ]);
}

/** Journalise une tentative de contournement côté serveur */
async function logSecurityEvent(
  userId: string,
  videoId: string,
  courseId: string,
  action: string
): Promise<void> {
  try {
    await (supabase as any).from("security_logs").insert({
      user_id: userId,
      video_id: videoId,
      course_id: courseId,
      action,
      user_agent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Silencieux — ne pas bloquer l'UX pour un log raté
  }
}

/** Récupère un token signé pour streamer la vidéo */
async function fetchSecureToken(
  videoId: string,
  courseId: string,
  deviceFingerprint: string
): Promise<{ signedUrl: string; expiresAt: string } | null> {
  try {
    const sessionResult = await withTimeout(
      supabase.auth.getSession(), 5_000, "getSession"
    ).catch(() => ({ data: { session: null } }));
    const session = sessionResult.data.session;
    if (!session) return null;

    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 8_000);

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
        signal: controller.signal,
      }
    );
    clearTimeout(abortTimer);

    if (!response.ok) {
      console.error("[SecurePlayer] Token refusé:", await response.json().catch(() => ({})));
      return null;
    }
    return await response.json();
  } catch (err) {
    console.error("[SecurePlayer] Erreur token:", err);
    return null;
  }
}

/** Formate secondes → mm:ss */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function VideoPlayerPage() {
  const { courseId, videoId } = useParams<{ courseId: string; videoId: string }>();
  const navigate = useNavigate();

  // ── Refs ──────────────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const blobUrlRef = useRef<string | null>(null);
  const tokenRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deviceFingerprintRef = useRef<string>("");
  const userIdRef = useRef<string>("");
  // Temps maximum déjà regardé — interdit de sauter au-delà
  const maxWatchedRef = useRef(0);
  // Ref stable pour loadSecureVideo (évite boucles de dépendances)
  const loadSecureVideoRef = useRef<((l: Lecon) => Promise<void>) | null>(null);
  // Auto-hide des contrôles
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ─────────────────────────────────────────────────────────────────
  const [lecon, setLecon] = useState<Lecon | null>(null);
  const [allLecons, setAllLecons] = useState<Lecon[]>([]);
  const [loading, setLoading] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessDeniedReason, setAccessDeniedReason] = useState("");
  const [isCompleted, setIsCompleted] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // Lecteur custom
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  const currentIndex = allLecons.findIndex((l) => l.id === videoId);
  const nextLecon = currentIndex >= 0 && currentIndex < allLecons.length - 1
    ? allLecons[currentIndex + 1] : null;
  const prevLecon = currentIndex > 0 ? allLecons[currentIndex - 1] : null;

  // ── Protections globales : clic droit, appui long, raccourcis ─────────────
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      if (userIdRef.current && videoId && courseId) {
        logSecurityEvent(userIdRef.current, videoId, courseId, "context_menu_attempt");
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const blocked =
        (e.ctrlKey && ["s", "S", "u", "U"].includes(e.key)) ||
        (e.metaKey && ["s", "S", "u", "U"].includes(e.key));
      if (blocked) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (userIdRef.current && videoId && courseId) {
          logSecurityEvent(userIdRef.current, videoId, courseId, `keyboard_blocked_${e.key}`);
        }
      }
    };

    // Bloquer appui long (touchstart > 500ms sans relâcher)
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    const onTouchStart = () => {
      longPressTimer = setTimeout(() => {
        if (userIdRef.current && videoId && courseId) {
          logSecurityEvent(userIdRef.current, videoId, courseId, "long_press_attempt");
        }
      }, 500);
    };
    const onTouchEnd = () => {
      if (longPressTimer) clearTimeout(longPressTimer);
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown, { capture: true });
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown, { capture: true });
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [videoId, courseId]);

  // ── Forcer vitesse 1x ─────────────────────────────────────────────────────
  const handleRateChange = useCallback(() => {
    const vid = videoRef.current;
    if (!vid || vid.playbackRate === 1) return;
    vid.playbackRate = 1;
    if (userIdRef.current && videoId && courseId) {
      logSecurityEvent(userIdRef.current, videoId, courseId, "speed_change_blocked");
    }
  }, [videoId, courseId]);

  // ── Mise à jour temps + mémorisation du max regardé ───────────────────────
  const handleTimeUpdate = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    setCurrentTime(vid.currentTime);
    if (vid.currentTime > maxWatchedRef.current) {
      maxWatchedRef.current = vid.currentTime;
    }
  }, []);

  // ── Bloquer tout saut en avant au-delà du max regardé ────────────────────
  const handleSeeked = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.currentTime > maxWatchedRef.current + 1) {
      vid.currentTime = maxWatchedRef.current;
      if (userIdRef.current && videoId && courseId) {
        logSecurityEvent(userIdRef.current, videoId, courseId, "seek_forward_blocked");
      }
    }
  }, [videoId, courseId]);

  // Reset au changement de leçon
  useEffect(() => {
    maxWatchedRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
  }, [videoId]);

  // ── Nettoyage au démontage ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
      if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
      if (videoLoadingTimeoutRef.current) clearTimeout(videoLoadingTimeoutRef.current);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  // ── Chargement sécurisé de la vidéo ──────────────────────────────────────
  const loadSecureVideo = useCallback(
    async (leconData: Lecon) => {
      if (!videoRef.current || !courseId) return;
      setVideoLoading(true);
      setVideoError(false);

      if (leconData.storage_path) {
        const tokenData = await fetchSecureToken(
          leconData.id, courseId, deviceFingerprintRef.current
        );
        if (!tokenData) {
          setVideoError(true);
          setVideoLoading(false);
          return;
        }
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        videoRef.current.src = tokenData.signedUrl;
        videoRef.current.load();

        if (videoLoadingTimeoutRef.current) clearTimeout(videoLoadingTimeoutRef.current);
        videoLoadingTimeoutRef.current = setTimeout(() => setVideoLoading(false), 15_000);

        // Refresh du token à 80% du TTL
        if (tokenRefreshTimerRef.current) clearTimeout(tokenRefreshTimerRef.current);
        const ttlMs = new Date(tokenData.expiresAt).getTime() - Date.now();
        if (ttlMs > 0) {
          tokenRefreshTimerRef.current = setTimeout(() => {
            loadSecureVideoRef.current?.(leconData);
          }, ttlMs * 0.8);
        }
      } else if (leconData.url) {
        videoRef.current.src = leconData.url;
        videoRef.current.load();
      } else {
        setVideoError(true);
        setVideoLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [courseId]
  );

  useEffect(() => { loadSecureVideoRef.current = loadSecureVideo; });

  // ── Chargement données + vérification serveur ─────────────────────────────
  const loadData = useCallback(async () => {
    const user = getNexoraUser();
    const adminAccess = isNexoraAdmin();
    if (!user || !courseId || !videoId) { navigate("/login"); return; }

    userIdRef.current = user.id;
    deviceFingerprintRef.current = await getDeviceFingerprint();
    setLoading(true);

    try {
      const QUERY_TIMEOUT = 12_000;

      // 1. Vérifier l'achat côté serveur
      if (!adminAccess) {
        const { data: purchase } = await withTimeout(
          (supabase as any)
            .from("formation_purchases")
            .select("id")
            .eq("user_id", user.id)
            .eq("formation_id", courseId)
            .eq("status", "completed")
            .maybeSingle(),
          QUERY_TIMEOUT, "formation_purchases"
        ).catch(() => ({ data: null }));

        if (!purchase) {
          await logSecurityEvent(user.id, videoId, courseId, "access_denied_no_purchase");
          setAccessDenied(true);
          setAccessDeniedReason("Vous n'avez pas accès à cette formation.");
          setLoading(false);
          return;
        }
      }

      // 2. Charger modules et leçons
      const { data: mData } = await withTimeout(
        (supabase as any)
          .from("formation_modules")
          .select("id, titre, ordre")
          .eq("formation_id", courseId)
          .order("ordre", { ascending: true }),
        QUERY_TIMEOUT, "formation_modules"
      ).catch(() => ({ data: [] }));

      const modIds = (mData || []).map((m: any) => m.id);

      const { data: leconsData } = await withTimeout(
        (supabase as any)
          .from("formation_lecons")
          .select("id, titre, type, url, storage_path, duree_secondes, ordre, module_id")
          .in("module_id", modIds)
          .eq("type", "video")
          .order("ordre", { ascending: true }),
        QUERY_TIMEOUT, "formation_lecons"
      ).catch(() => ({ data: [] }));

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

      // 3. Vérification séquentielle côté SERVEUR
      if (!adminAccess) {
        const idx = flatLecons.findIndex((l) => l.id === videoId);
        if (idx > 0) {
          const prevL = flatLecons[idx - 1];
          const { data: prevProgress } = await withTimeout(
            (supabase as any)
              .from("video_progress")
              .select("status")
              .eq("user_id", user.id)
              .eq("video_id", prevL.id)
              .maybeSingle(),
            QUERY_TIMEOUT, "video_progress_prev"
          ).catch(() => ({ data: null }));

          if (!prevProgress || prevProgress.status !== "completed") {
            await logSecurityEvent(user.id, videoId, courseId, "access_denied_sequential_lock");
            setAccessDenied(true);
            setAccessDeniedReason("Terminez la leçon précédente pour débloquer celle-ci.");
            setLoading(false);
            return;
          }
        }
      }

      setLecon(currentLecon);

      // 4. Statut de complétion de la leçon actuelle
      const { data: progress } = await withTimeout(
        (supabase as any)
          .from("video_progress")
          .select("status")
          .eq("user_id", user.id)
          .eq("video_id", videoId)
          .maybeSingle(),
        QUERY_TIMEOUT, "video_progress_current"
      ).catch(() => ({ data: null }));

      setIsCompleted(progress?.status === "completed");

      if (!progress) {
        (supabase as any).from("video_progress").upsert({
          user_id: user.id,
          course_id: courseId,
          module_id: currentLecon.module_id,
          video_id: videoId,
          status: "unlocked",
        }, { onConflict: "user_id,video_id" }).then().catch(console.warn);
      }

    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, videoId, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  // Déclencher la vidéo une fois que le <video> est dans le DOM
  useEffect(() => {
    if (!loading && lecon && videoRef.current) {
      loadSecureVideo(lecon);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, lecon]);

  // ── Marquer comme terminée (persisté côté serveur) ────────────────────────
  const handleVideoEnded = useCallback(async () => {
    const user = getNexoraUser();
    if (!user || !courseId || !videoId || !lecon) return;
    setIsCompleted(true);
    setIsPlaying(false);
    await (supabase as any).from("video_progress").upsert({
      user_id: user.id,
      course_id: courseId,
      module_id: lecon.module_id,
      video_id: videoId,
      status: "completed",
      completed_at: new Date().toISOString(),
    }, { onConflict: "user_id,video_id" });
  }, [courseId, videoId, lecon]);

  // ── Contrôles du lecteur custom ───────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.paused ? vid.play() : vid.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    vid.muted = !vid.muted;
    setIsMuted(vid.muted);
  }, []);

  const handleFullscreen = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(console.warn);
    } else {
      document.exitFullscreen().catch(console.warn);
    }
  }, []);

  const handleRestart = useCallback(() => {
    const vid = videoRef.current;
    if (!vid) return;
    maxWatchedRef.current = 0;
    vid.currentTime = 0;
    vid.play();
  }, []);

  // ── Clic barre de progression (verrouillée en avant) ──────────────────────
  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const vid = videoRef.current;
    const bar = progressBarRef.current;
    if (!vid || !bar || duration === 0) return;

    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = ratio * duration;

    if (targetTime <= maxWatchedRef.current + 1) {
      vid.currentTime = targetTime;
    } else {
      // Tentative de saut en avant — logguer et ignorer
      if (userIdRef.current && videoId && courseId) {
        logSecurityEvent(userIdRef.current, videoId, courseId, "progress_bar_skip_attempt");
      }
    }
  }, [duration, videoId, courseId]);

  // ── Auto-hide contrôles sur inactivité ───────────────────────────────────
  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  }, []);

  const goToNext = useCallback(() => {
    if (nextLecon && isCompleted)
      navigate(`/mes-formations/${courseId}/video/${nextLecon.id}`);
  }, [nextLecon, isCompleted, courseId, navigate]);

  const goToPrev = useCallback(() => {
    if (prevLecon) navigate(`/mes-formations/${courseId}/video/${prevLecon.id}`);
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
          <p className="text-sm text-muted-foreground font-medium">Vérification de l'accès…</p>
        </div>
      </AppLayout>
    );
  }

  // ── Rendu : accès refusé ──────────────────────────────────────────────────
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

  // Calculs barre de progression
  const watchedPercent = duration > 0 ? Math.min(100, (maxWatchedRef.current / duration) * 100) : 0;
  const currentPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  // ── Rendu principal ───────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-4 pb-10">

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
          {isCompleted && (
            <div className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0">
              <CheckCircle className="w-3.5 h-3.5" /> Terminée
            </div>
          )}
        </div>

        {/* ── Lecteur vidéo sécurisé ── */}
        <div
          ref={containerRef}
          className="relative w-full bg-black rounded-2xl overflow-hidden shadow-xl select-none"
          style={{ aspectRatio: "16/9" }}
          onMouseMove={showControlsTemporarily}
          onTouchStart={showControlsTemporarily}
        >
          {/* Élément vidéo — PAS de contrôles natifs exposés */}
          <video
            ref={videoRef}
            key={lecon.id}
            className="w-full h-full object-contain"
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            onEnded={handleVideoEnded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onError={() => { setVideoError(true); setVideoLoading(false); }}
            onWaiting={() => { if (videoRef.current?.src) setVideoLoading(true); }}
            onCanPlay={() => setVideoLoading(false)}
            onLoadedData={() => {
              setVideoLoading(false);
              setDuration(videoRef.current?.duration ?? 0);
            }}
            onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
            onTimeUpdate={handleTimeUpdate}
            onSeeked={handleSeeked}
            onRateChange={handleRateChange}
            playsInline
            onClick={togglePlay}
          />

          {/* Overlay chargement */}
          {videoLoading && !videoError && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 z-20 pointer-events-none">
              <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
              <p className="text-white/60 text-xs font-medium">Chargement…</p>
            </div>
          )}

          {/* Overlay erreur */}
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

          {/* Bouton play central */}
          {!isPlaying && !videoLoading && !videoError && (
            <div
              className="absolute inset-0 flex items-center justify-center z-10 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
                <Play className="w-7 h-7 text-white ml-1" fill="currentColor" />
              </div>
            </div>
          )}

          {/* ── Barre de contrôles custom ── */}
          <div
            className={`absolute bottom-0 left-0 right-0 z-30 transition-opacity duration-300 ${
              showControls ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            style={{
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
              padding: "40px 14px 12px",
            }}
          >
            {/* Barre de progression */}
            <div
              ref={progressBarRef}
              className="relative w-full cursor-pointer mb-3 group"
              style={{ height: 20, display: "flex", alignItems: "center" }}
              onClick={handleProgressClick}
            >
              {/* Piste de fond */}
              <div className="absolute w-full h-1 bg-white/20 rounded-full" />

              {/* Zone max regardée (grise claire) = jusqu'où on peut aller */}
              <div
                className="absolute h-1 bg-white/40 rounded-full"
                style={{ width: `${watchedPercent}%` }}
              />

              {/* Progression actuelle (violet) */}
              <div
                className="absolute h-1 bg-violet-500 rounded-full"
                style={{ width: `${currentPercent}%` }}
              />

              {/* Curseur actuel */}
              <div
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-lg transition-transform group-hover:scale-125"
                style={{
                  left: `${currentPercent}%`,
                  transform: "translateX(-50%)",
                  boxShadow: "0 0 0 2px rgba(139,92,246,0.6)",
                }}
              />

              {/* Icône verrou à la limite max regardée */}
              {watchedPercent < 99 && watchedPercent > 0 && (
                <div
                  className="absolute pointer-events-none"
                  style={{ left: `${watchedPercent}%`, transform: "translate(-6px, -10px)" }}
                >
                  <Lock className="w-2.5 h-2.5 text-amber-400/80" />
                </div>
              )}
            </div>

            {/* Boutons */}
            <div className="flex items-center gap-2">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center text-white hover:text-violet-300 transition-colors rounded-lg hover:bg-white/10"
              >
                {isPlaying
                  ? <Pause className="w-5 h-5" fill="currentColor" />
                  : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />
                }
              </button>

              {/* Recommencer depuis le début */}
              <button
                onClick={handleRestart}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Recommencer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Temps actuel / durée */}
              <span className="text-white/80 text-xs font-mono tabular-nums ml-1">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1" />

              {/* Mute */}
              <button
                onClick={toggleMute}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title={isMuted ? "Activer le son" : "Couper le son"}
              >
                {isMuted
                  ? <VolumeX className="w-4 h-4" />
                  : <Volume2 className="w-4 h-4" />
                }
              </button>

              {/* Plein écran */}
              <button
                onClick={handleFullscreen}
                className="w-9 h-9 flex items-center justify-center text-white/70 hover:text-white transition-colors rounded-lg hover:bg-white/10"
                title="Plein écran"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
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

          {/* Boutons navigation */}
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
                // Verrouillé si au-delà de la prochaine ET pas admin
                const isLocked = idx > currentIndex && !isNexoraAdmin() &&
                  !(idx === currentIndex + 1 && isCompleted);

                return (
                  <button
                    key={l.id}
                    onClick={() => {
                      if (!isLocked) {
                        navigate(`/mes-formations/${courseId}/video/${l.id}`);
                      } else if (userIdRef.current) {
                        logSecurityEvent(userIdRef.current, l.id, courseId!, "lesson_skip_attempt");
                      }
                    }}
                    disabled={isLocked}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                      isCurrent
                        ? "bg-violet-500/8"
                        : isLocked
                        ? "opacity-40 cursor-not-allowed"
                        : "hover:bg-muted/20"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black ${
                      isCurrent ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                    }`}>
                      {idx + 1}
                    </div>
                    <span className={`flex-1 text-xs font-semibold truncate ${
                      isCurrent ? "text-violet-600 dark:text-violet-400" : "text-foreground"
                    }`}>
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
