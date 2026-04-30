/**
 * VideoAutoplay
 * ─────────────────────────────────────────────────────────────────────
 * Lecteur vidéo intelligent pour les produits Nexora.
 *
 * Mode "vitrine" (muted=true, autoplay) :
 *   - Démarre automatiquement en muet quand la carte entre dans le viewport
 *   - S'arrête quand elle en sort (IntersectionObserver)
 *   - Boucle en continu, pas de contrôles
 *   - Overlay image si la vidéo n'est pas encore chargée
 *
 * Mode "fiche" (muted=false) :
 *   - Contrôles natifs visibles
 *   - Pas d'autoplay (l'utilisateur choisit)
 *   - Poster = première photo du produit
 */

import { useEffect, useRef, useState } from "react";
import { Play, Volume2, VolumeX } from "lucide-react";

interface VideoAutoplayProps {
  videoUrl: string;
  poster?: string;          // URL image de couverture (photo produit)
  mode?: "vitrine" | "fiche";
  className?: string;
  aspectRatio?: "square" | "video"; // "square" = 1:1, "video" = 16:9
}

export default function VideoAutoplay({
  videoUrl,
  poster,
  mode = "vitrine",
  className = "",
  aspectRatio = "square",
}: VideoAutoplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // ── IntersectionObserver : autoplay quand visible (mode vitrine) ──────
  useEffect(() => {
    if (mode !== "vitrine") return;
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {}); // ignore autoplay policy errors
          setPlaying(true);
        } else {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [mode, videoUrl]);

  // ── Toggle mute (mode vitrine) ──────────────────────────────────────
  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation(); // ne pas naviguer vers la fiche
    if (!videoRef.current) return;
    const newMuted = !muted;
    videoRef.current.muted = newMuted;
    setMuted(newMuted);
  };

  if (error) return null; // Pas de vidéo = silencieux, on affiche juste la photo

  const paddingTop = aspectRatio === "video" ? "56.25%" : "100%";

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ paddingTop, background: "#000" }}
    >
      {/* Poster flou pendant le chargement */}
      {poster && !loaded && (
        <img
          src={poster}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "blur(8px)", transform: "scale(1.05)" }}
        />
      )}

      <video
        ref={videoRef}
        src={videoUrl}
        poster={poster}
        muted={mode === "vitrine" ? muted : false}
        loop={mode === "vitrine"}
        playsInline
        autoPlay={mode === "vitrine"}
        controls={mode === "fiche"}
        preload="metadata"
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.3s ease" }}
        onLoadedData={() => setLoaded(true)}
        onError={() => setError(true)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />

      {/* Badge VIDÉO — visible uniquement en mode vitrine */}
      {mode === "vitrine" && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Play className="w-2.5 h-2.5 fill-white" />
          VIDÉO
        </div>
      )}

      {/* Bouton mute/unmute — mode vitrine seulement */}
      {mode === "vitrine" && loaded && (
        <button
          onClick={toggleMute}
          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all active:scale-90"
          title={muted ? "Activer le son" : "Couper le son"}
        >
          {muted
            ? <VolumeX className="w-3.5 h-3.5 text-white" />
            : <Volume2 className="w-3.5 h-3.5 text-white" />
          }
        </button>
      )}
    </div>
  );
}
