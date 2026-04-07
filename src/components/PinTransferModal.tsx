import { useState, useEffect } from "react";
import { X, Lock, ShieldCheck, AlertTriangle } from "lucide-react";
import PinInput from "@/components/auth/PinInput";
import { verifyPin } from "@/services/pinService";
import { getNexoraUser } from "@/lib/nexora-auth";

interface PinTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  transferDetails?: {
    amount: number;
    currency?: string;
    recipient?: string;
  };
}

export default function PinTransferModal({ isOpen, onClose, onSuccess, transferDetails }: PinTransferModalProps) {
  const user = getNexoraUser();
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [pinKey, setPinKey] = useState(0);
  const MAX_ATTEMPTS = 5;

  useEffect(() => {
    if (!isOpen) {
      setError("");
      setAttempts(0);
      setPinKey((k) => k + 1);
      setLoading(false);
    }
  }, [isOpen]);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => {
      setShake(false);
      setPinKey((k) => k + 1);
    }, 500);
  };

  const handlePin = async (pin: string) => {
    if (!user || loading) return;

    setLoading(true);
    setError("");

    const correct = await verifyPin(user.id, pin);
    setLoading(false);

    if (correct) {
      setAttempts(0);
      onSuccess();
      onClose();
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      triggerShake();
      if (newAttempts >= MAX_ATTEMPTS) {
        setError("Trop de tentatives incorrectes. Transfert annulé.");
        setTimeout(() => onClose(), 2000);
      } else {
        setError(`Code incorrect. ${MAX_ATTEMPTS - newAttempts} tentative${MAX_ATTEMPTS - newAttempts > 1 ? "s" : ""} restante${MAX_ATTEMPTS - newAttempts > 1 ? "s" : ""}.`);
      }
    }
  };

  if (!isOpen) return null;

  const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.round(n));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 50,
          background: "rgba(0,0,0,0.7)",
          backdropFilter: "blur(8px)",
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Modal */}
      <div style={{
        position: "fixed", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        zIndex: 51,
        width: "100%", maxWidth: 380,
        padding: "0 16px",
        animation: "slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        <style>{`
          @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
          @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 24px)); } to { opacity: 1; transform: translate(-50%, -50%); } }
        `}</style>

        <div style={{
          background: "#0a120c",
          border: "1px solid rgba(0,255,120,0.25)",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 1px rgba(0,255,120,0.1)",
        }}>
          {/* Header */}
          <div style={{
            padding: "20px 20px 16px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(0,255,120,0.1)",
                border: "1.5px solid rgba(0,255,120,0.3)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 12px rgba(0,255,120,0.15)",
              }}>
                <Lock className="w-4 h-4" style={{ color: "#00ff78" }} />
              </div>
              <div>
                <h3 style={{
                  color: "#f0fdf4", fontWeight: 700, fontSize: "0.9rem",
                  fontFamily: "'Courier New', monospace",
                }}>
                  Autorisation requise
                </h3>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: "0.7rem" }}>
                  Confirmez avec votre code PIN
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.05)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", color: "rgba(255,255,255,0.4)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                e.currentTarget.style.color = "rgba(255,255,255,0.4)";
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Transfer details */}
          {transferDetails && (
            <div style={{
              margin: "16px 20px",
              padding: "12px 16px",
              borderRadius: 12,
              background: "rgba(0,255,120,0.04)",
              border: "1px solid rgba(0,255,120,0.12)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Montant</span>
                <span style={{
                  color: "#00ff78", fontWeight: 700, fontSize: "1.1rem",
                  fontFamily: "'Courier New', monospace",
                }}>
                  {fmt(transferDetails.amount)} {transferDetails.currency || "XOF"}
                </span>
              </div>
              {transferDetails.recipient && (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.75rem" }}>Destinataire</span>
                  <span style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.8rem" }}>
                    {transferDetails.recipient}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* PIN input */}
          <div style={{ padding: "0 20px 20px" }}>
            <p style={{
              textAlign: "center", color: "rgba(255,255,255,0.4)",
              fontSize: "0.78rem", marginBottom: 16,
            }}>
              Saisissez votre code PIN à 4 chiffres
            </p>

            <PinInput
              key={pinKey}
              onComplete={handlePin}
              disabled={loading || attempts >= MAX_ATTEMPTS}
              error={!!error}
              shake={shake}
            />

            {/* Error */}
            {error && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                marginTop: 12, padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                color: "#ff6b6b", fontSize: "0.78rem",
              }}>
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center gap-2 mt-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 5, height: 5, borderRadius: "50%", background: "#00ff78",
                    animation: "bounce 0.8s infinite", animationDelay: `${i * 0.15}s`,
                  }} />
                ))}
              </div>
            )}

            {/* Attempt dots */}
            {attempts > 0 && attempts < MAX_ATTEMPTS && (
              <div style={{ display: "flex", justifyContent: "center", gap: 5, marginTop: 10 }}>
                {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                  <div key={i} style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: i < attempts ? "#ff4444" : "rgba(255,255,255,0.1)",
                    boxShadow: i < attempts ? "0 0 5px rgba(255,68,68,0.5)" : "none",
                  }} />
                ))}
              </div>
            )}

            {/* Security note */}
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              marginTop: 16, paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.05)",
            }}>
              <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(0,255,120,0.4)" }} />
              <p style={{ color: "rgba(255,255,255,0.25)", fontSize: "0.7rem" }}>
                Transfert sécurisé et chiffré par Nexora
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
