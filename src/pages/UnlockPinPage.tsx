import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, ShieldAlert, Clock, LogOut, Fingerprint } from "lucide-react";
import PinInput from "@/components/auth/PinInput";
import { verifyPin } from "@/services/pinService";
import { getNexoraUser, logoutUser } from "@/lib/nexora-auth";
import { usePinAuth } from "@/hooks/usePinAuth";

export default function UnlockPinPage() {
  const navigate = useNavigate();
  const user = getNexoraUser();
  const { unlockPin, isLockedOut, getLockoutRemaining, recordFailedAttempt, getAttempts, MAX_ATTEMPTS } = usePinAuth();

  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lockCountdown, setLockCountdown] = useState(0);
  const [pinKey, setPinKey] = useState(0); // force re-render PinInput

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLockedOut()) return;
    setLockCountdown(getLockoutRemaining());
    const timer = setInterval(() => {
      const remaining = getLockoutRemaining();
      setLockCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        setError("");
        setPinKey((k) => k + 1);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPinKey((k) => k + 1);
    }, 500);
  };

  const handlePin = async (pin: string) => {
    if (!user) { navigate("/login", { replace: true }); return; }
    if (isLockedOut()) return;

    setLoading(true);
    setError("");

    const correct = await verifyPin(user.id, pin);
    setLoading(false);

    if (correct) {
      unlockPin();
      navigate("/dashboard", { replace: true });
    } else {
      const { attemptsLeft, locked } = recordFailedAttempt();
      triggerShake();
      if (locked) {
        setLockCountdown(getLockoutRemaining());
        setError(`Trop de tentatives. Réessayez dans ${Math.ceil(getLockoutRemaining() / 60)} min.`);
        // Start countdown
        const timer = setInterval(() => {
          const remaining = getLockoutRemaining();
          setLockCountdown(remaining);
          if (remaining <= 0) {
            clearInterval(timer);
            setError("");
            setPinKey((k) => k + 1);
          }
        }, 1000);
      } else {
        setError(`Code incorrect. ${attemptsLeft} tentative${attemptsLeft > 1 ? "s" : ""} restante${attemptsLeft > 1 ? "s" : ""}.`);
      }
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const locked = isLockedOut();
  const attempts = getAttempts();

  return (
    <div className="min-h-screen bg-[#080c10] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: "absolute", top: "30%", left: "50%",
          transform: "translate(-50%,-50%)",
          width: 500, height: 500, borderRadius: "50%",
          background: locked
            ? "radial-gradient(circle, rgba(255,68,68,0.06) 0%, transparent 70%)"
            : "radial-gradient(circle, rgba(0,255,120,0.07) 0%, transparent 70%)",
          transition: "background 0.5s",
        }} />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 72, height: 72, borderRadius: 20, marginBottom: 16,
            background: locked ? "rgba(255,68,68,0.1)" : "rgba(0,255,120,0.1)",
            border: locked ? "1.5px solid rgba(255,68,68,0.4)" : "1.5px solid rgba(0,255,120,0.3)",
            boxShadow: locked ? "0 0 30px rgba(255,68,68,0.15)" : "0 0 30px rgba(0,255,120,0.15)",
            transition: "all 0.5s",
          }}>
            {locked
              ? <ShieldAlert className="w-8 h-8" style={{ color: "#ff4444" }} />
              : <Fingerprint className="w-8 h-8" style={{ color: "#00ff78" }} />
            }
          </div>
          <h1 style={{
            fontSize: "1.5rem", fontWeight: 800, color: "#f0fdf4",
            letterSpacing: "-0.02em", fontFamily: "'Courier New', monospace",
          }}>
            NEXORA
          </h1>
          <p style={{
            color: locked ? "rgba(255,68,68,0.6)" : "rgba(0,255,120,0.6)",
            fontSize: "0.75rem", letterSpacing: "0.2em", marginTop: 2,
            transition: "color 0.5s",
          }}>
            {locked ? "COMPTE VERROUILLÉ" : "DÉVERROUILLAGE"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(10,18,12,0.9)",
          border: locked ? "1px solid rgba(255,68,68,0.25)" : "1px solid rgba(0,255,120,0.2)",
          borderRadius: 20, padding: "2rem",
          boxShadow: "0 0 40px rgba(0,0,0,0.6)",
          backdropFilter: "blur(20px)",
          transition: "border-color 0.5s",
        }}>
          {/* User greeting */}
          <div style={{
            display: "flex", alignItems: "center", gap: 10, marginBottom: 20,
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0,255,120,0.3), rgba(0,200,255,0.3))",
              border: "1.5px solid rgba(0,255,120,0.3)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.875rem", fontWeight: 700, color: "#00ff78",
              fontFamily: "'Courier New', monospace",
            }}>
              {user?.nom_prenom?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div>
              <p style={{ color: "#f0fdf4", fontSize: "0.8rem", fontWeight: 600 }}>
                {user?.nom_prenom || "Utilisateur"}
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
                @{user?.username || ""}
              </p>
            </div>
            <Lock className="w-4 h-4 ml-auto" style={{ color: "rgba(0,255,120,0.4)" }} />
          </div>

          <div className="text-center mb-2">
            <h2 style={{
              fontSize: "1.0rem", fontWeight: 700, color: "#f0fdf4",
              fontFamily: "'Courier New', monospace",
            }}>
              Entrez votre code PIN
            </h2>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
              Saisissez votre code PIN à 4 chiffres
            </p>
          </div>

          {/* Lockout display */}
          {locked ? (
            <div style={{
              margin: "20px 0",
              padding: "16px",
              borderRadius: 12,
              background: "rgba(255,68,68,0.08)",
              border: "1px solid rgba(255,68,68,0.25)",
              textAlign: "center",
            }}>
              <Clock className="w-8 h-8 mx-auto mb-2" style={{ color: "#ff4444" }} />
              <p style={{ color: "#ff6b6b", fontWeight: 700, fontSize: "0.9rem", fontFamily: "'Courier New', monospace" }}>
                Compte temporairement verrouillé
              </p>
              <p style={{ color: "rgba(255,107,107,0.7)", fontSize: "0.78rem", marginTop: 4 }}>
                Trop de tentatives incorrectes
              </p>
              <div style={{
                display: "inline-block", marginTop: 12,
                padding: "6px 16px", borderRadius: 20,
                background: "rgba(255,68,68,0.15)",
                border: "1px solid rgba(255,68,68,0.3)",
                fontFamily: "'Courier New', monospace",
                color: "#ff4444", fontWeight: 700, fontSize: "1.1rem",
              }}>
                {formatTime(lockCountdown)}
              </div>
            </div>
          ) : (
            <div className="my-5">
              <PinInput
                key={pinKey}
                onComplete={handlePin}
                disabled={loading || locked}
                error={!!error && !locked}
                shake={shake}
              />
            </div>
          )}

          {/* Error message */}
          {error && !locked && (
            <div style={{
              textAlign: "center", padding: "8px 12px", borderRadius: 8,
              background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
              color: "#ff6b6b", fontSize: "0.78rem",
            }}>
              {error}
            </div>
          )}

          {/* Loading dots */}
          {loading && (
            <div className="flex items-center justify-center gap-2 mt-3">
              {[0, 1, 2].map((i) => (
                <div key={i} style={{
                  width: 6, height: 6, borderRadius: "50%", background: "#00ff78",
                  animation: "bounce 0.8s infinite", animationDelay: `${i * 0.15}s`,
                }} />
              ))}
            </div>
          )}

          {/* Attempts indicator */}
          {!locked && attempts > 0 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: 12 }}>
              {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                <div key={i} style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: i < attempts ? "#ff4444" : "rgba(255,255,255,0.1)",
                  border: i < attempts ? "none" : "1px solid rgba(255,255,255,0.2)",
                  boxShadow: i < attempts ? "0 0 6px rgba(255,68,68,0.5)" : "none",
                  transition: "all 0.3s",
                }} />
              ))}
            </div>
          )}

          {/* Logout option */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", textAlign: "center" }}>
            <button
              onClick={handleLogout}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                color: "rgba(255,255,255,0.3)", fontSize: "0.75rem",
                background: "none", border: "none", cursor: "pointer",
                padding: "6px 12px", borderRadius: 8,
                transition: "color 0.2s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
            >
              <LogOut className="w-3.5 h-3.5" />
              Se déconnecter
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
