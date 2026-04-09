// ============================================================
//  InstallPWA.tsx — Composant d'installation Nexora PWA
//  Android/Chrome : prompt natif
//  iOS Safari     : bannière instructions pas à pas
//  Design         : bordure néon verte, fond noir, texte blanc
// ============================================================

import { useState, useEffect, useRef } from "react";
import { Download, Share2, X, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showAndroidBtn,  setShowAndroidBtn]  = useState(false);
  const [showIOSBanner,   setShowIOSBanner]   = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isIOS = () =>
    /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as any).MSStream;

  const isInstalled = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.startsWith("android-app://");

  useEffect(() => {
    if (isInstalled()) return;

    // iOS Safari
    if (isIOS()) {
      const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
      if (!isSafari) return;
      const ts = localStorage.getItem("nexora-ios-dismissed");
      if (!ts || Date.now() - parseInt(ts) > 7 * 86400000) {
        timerRef.current = setTimeout(() => setShowIOSBanner(true), 4000);
      }
      return;
    }

    // Android / Chrome / Edge
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowAndroidBtn(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", () => { setShowAndroidBtn(false); setDeferredPrompt(null); });
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") { setShowAndroidBtn(false); setDeferredPrompt(null); }
  };

  const dismissIOS = () => {
    localStorage.setItem("nexora-ios-dismissed", String(Date.now()));
    setShowIOSBanner(false);
  };

  const neon = { border: "1.5px solid #84cc16", boxShadow: "0 0 0 1px rgba(132,204,22,0.2), 0 0 32px rgba(132,204,22,0.3)" };

  return (
    <>
      {/* ── Bouton Android ── */}
      {showAndroidBtn && (
        <div style={{ position:"fixed", bottom:"28px", left:"50%", transform:"translateX(-50%)",
          zIndex:9999, display:"flex", alignItems:"center", gap:"10px",
          backgroundColor:"#0a0a0a", borderRadius:"16px", padding:"14px 22px",
          whiteSpace:"nowrap", animation:"nexoraSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1)", ...neon }}>
          <div style={{ width:34, height:34, borderRadius:10, background:"rgba(132,204,22,0.15)",
            display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <Download size={17} color="#84cc16" />
          </div>
          <button onClick={handleInstall}
            style={{ background:"transparent", border:"none", cursor:"pointer",
              color:"#fff", fontSize:"14px", fontWeight:700, padding:0 }}>
            Installer l&apos;app Nexora
          </button>
          <button onClick={() => setShowAndroidBtn(false)} aria-label="Fermer"
            style={{ background:"transparent", border:"none", cursor:"pointer", padding:"0 0 0 4px" }}>
            <X size={14} color="#555" />
          </button>
        </div>
      )}

      {/* ── Bannière iOS ── */}
      {showIOSBanner && (
        <div style={{ position:"fixed", bottom:"24px", left:"16px", right:"16px", zIndex:9999,
          backgroundColor:"#0a0a0a", borderRadius:"20px", padding:"20px",
          animation:"nexoraFadeUpBanner 0.4s cubic-bezier(0.34,1.56,0.64,1)", ...neon }}>
          {/* Flèche bas */}
          <div style={{ position:"absolute", bottom:"-10px", left:"50%", transform:"translateX(-50%)",
            width:0, height:0, borderLeft:"10px solid transparent", borderRight:"10px solid transparent",
            borderTop:"10px solid #84cc16" }} />
          {/* Fermer */}
          <button onClick={dismissIOS} aria-label="Fermer"
            style={{ position:"absolute", top:14, right:14, background:"rgba(255,255,255,0.1)",
              border:"none", cursor:"pointer", borderRadius:8, width:28, height:28,
              display:"flex", alignItems:"center", justifyContent:"center" }}>
            <X size={15} color="#888" />
          </button>
          {/* Header */}
          <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
            <div style={{ width:42, height:42, borderRadius:12,
              background:"rgba(132,204,22,0.15)", border:"1px solid rgba(132,204,22,0.3)",
              display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
              <Smartphone size={20} color="#84cc16" />
            </div>
            <div>
              <div style={{ color:"#84cc16", fontWeight:800, fontSize:"15px" }}>Installer Nexora</div>
              <div style={{ color:"#555", fontSize:"12px" }}>Accès depuis l'écran d'accueil</div>
            </div>
          </div>
          {/* Étapes */}
          {[
            { icon:<Share2 size={14} color="#84cc16"/>, text:<>Appuyez sur <strong style={{color:"#fff"}}>Partager</strong> en bas de Safari</> },
            { icon:<span style={{fontSize:14}}>➕</span>, text:<>Choisissez <strong style={{color:"#84cc16"}}>« Sur l'écran d'accueil »</strong></> },
            { icon:<span style={{fontSize:14}}>✅</span>, text:<>Appuyez sur <strong style={{color:"#fff"}}>Ajouter</strong> en haut à droite</> },
          ].map((s, i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:12,
              background:"rgba(255,255,255,0.04)", borderRadius:12, padding:"10px 14px", marginBottom:8 }}>
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(132,204,22,0.1)",
                border:"1px solid rgba(132,204,22,0.2)", display:"flex", alignItems:"center",
                justifyContent:"center", flexShrink:0 }}>{s.icon}</div>
              <span style={{ color:"#ccc", fontSize:"13px", lineHeight:1.4 }}>{s.text}</span>
            </div>
          ))}
          <p style={{ color:"#444", fontSize:"11px", textAlign:"center", marginTop:12, marginBottom:0 }}>
            L'app s'ouvrira en plein écran, sans barre Safari.
          </p>
        </div>
      )}

      <style>{`
        @keyframes nexoraSlideUp {
          from { opacity:0; transform:translateX(-50%) translateY(24px) scale(0.95); }
          to   { opacity:1; transform:translateX(-50%) translateY(0) scale(1); }
        }
        @keyframes nexoraFadeUpBanner {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </>
  );
};

export default InstallPWA;
