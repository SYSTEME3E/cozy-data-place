import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldAlert, Clock, LogOut, Fingerprint } from "lucide-react";
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
  const [pinKey, setPinKey] = useState(0);

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

  const blue = "#1a56db";
  const blueSoft = "rgba(26,86,219,0.10)";
  const blueBorder = "rgba(26,86,219,0.3)";

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{ width: "100%", maxWidth: 360 }}>

        {/* Icône + titre */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 18, marginBottom: 14,
            background: locked ? "rgba(220,38,38,0.08)" : blueSoft,
            border: locked ? "1.5px solid rgba(220,38,38,0.3)" : `1.5px solid ${blueBorder}`,
          }}>
            {locked
              ? <ShieldAlert style={{ width: 28, height: 28, color: "#dc2626" }} />
              : <Fingerprint style={{ width: 28, height: 28, color: blue }} />
            }
          </div>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", margin: 0 }}>
            Entrez votre code PIN
          </h2>
          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: 4 }}>
            {locked ? "Compte temporairement verrouillé" : "Saisissez votre code PIN à 4 chiffres"}
          </p>
        </div>

        {/* Lockout */}
        {locked ? (
          <div style={{
            marginBottom: 20, padding: "16px", borderRadius: 12,
            background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
            textAlign: "center",
          }}>
            <Clock style={{ width: 30, height: 30, color: "#dc2626", margin: "0 auto 8px" }} />
            <p style={{ color: "#dc2626", fontWeight: 700, fontSize: "0.9rem", margin: 0 }}>
              Trop de tentatives incorrectes
            </p>
            <div style={{
              display: "inline-block", marginTop: 10, padding: "5px 18px", borderRadius: 20,
              background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
              color: "#dc2626", fontWeight: 700, fontSize: "1.1rem", fontFamily: "monospace",
            }}>
              {formatTime(lockCountdown)}
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 16 }}>
            <PinInput
              key={pinKey}
              onComplete={handlePin}
              disabled={loading || locked}
              error={!!error && !locked}
              shake={shake}
            />
          </div>
        )}

        {/* Erreur */}
        {error && !locked && (
          <div style={{
            textAlign: "center", padding: "8px 12px", borderRadius: 8,
            background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)",
            color: "#dc2626", fontSize: "0.78rem", marginBottom: 12,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: "50%", background: blue,
                animation: "bounce 0.8s infinite", animationDelay: `${i * 0.15}s`,
              }} />
            ))}
          </div>
        )}

        {/* Indicateur tentatives */}
        {!locked && attempts > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12 }}>
            {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
              <div key={i} style={{
                width: 8, height: 8, borderRadius: "50%",
                background: i < attempts ? "#dc2626" : "#e5e7eb",
                boxShadow: i < attempts ? "0 0 5px rgba(220,38,38,0.4)" : "none",
                transition: "all 0.3s",
              }} />
            ))}
          </div>
        )}

        {/* Séparateur + Déconnexion */}
        <div style={{
          marginTop: 20, paddingTop: 16,
          borderTop: "1px solid #f3f4f6",
          textAlign: "center",
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              color: "#9ca3af", fontSize: "0.78rem",
              background: "none", border: "none", cursor: "pointer",
              padding: "6px 12px", borderRadius: 8, transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#374151")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
          >
            <LogOut style={{ width: 14, height: 14 }} />
            Se déconnecter
          </button>
        </div>

      </div>
    </div>
  );
}
