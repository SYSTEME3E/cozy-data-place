import { useState } from "react";
import { KeyRound, RotateCcw, ShieldOff, Check, X, AlertTriangle, Lock } from "lucide-react";
import PinInput from "@/components/auth/PinInput";
import { adminResetPin, adminSetPin } from "@/services/pinService";
import { getNexoraUser } from "@/lib/nexora-auth";

interface AdminPinManagerProps {
  targetUserId: string;
  targetUserName: string;
  hasPinSet: boolean;
  onDone?: () => void;
}

type Mode = "idle" | "reset" | "set";

export default function AdminPinManager({
  targetUserId,
  targetUserName,
  hasPinSet,
  onDone,
}: AdminPinManagerProps) {
  const adminUser = getNexoraUser();
  const [mode, setMode] = useState<Mode>("idle");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [pinKey, setPinKey] = useState(0);

  const handleReset = async () => {
    if (!adminUser) return;
    setLoading(true);
    setResult(null);
    const res = await adminResetPin(adminUser.id, targetUserId);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? `PIN de ${targetUserName} réinitialisé. L'utilisateur devra en créer un nouveau.`
        : res.error || "Erreur lors de la réinitialisation.",
    });
    if (res.success) {
      setTimeout(() => { setMode("idle"); setResult(null); onDone?.(); }, 2500);
    }
  };

  const handleSetPin = async (pin: string) => {
    if (!adminUser) return;
    setLoading(true);
    setResult(null);
    const res = await adminSetPin(adminUser.id, targetUserId, pin);
    setLoading(false);
    setResult({
      success: res.success,
      message: res.success
        ? `Nouveau PIN défini pour ${targetUserName}.`
        : res.error || "Erreur lors de la définition du PIN.",
    });
    if (res.success) {
      setTimeout(() => { setMode("idle"); setResult(null); setPinKey((k) => k + 1); onDone?.(); }, 2500);
    }
  };

  return (
    <div style={{
      background: "rgba(0,0,0,0.3)",
      border: "1px solid rgba(0,255,120,0.15)",
      borderRadius: 12,
      padding: "14px 16px",
      marginTop: 8,
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <KeyRound className="w-4 h-4" style={{ color: "#00ff78" }} />
        <span style={{ color: "#f0fdf4", fontSize: "0.82rem", fontWeight: 600, fontFamily: "'Courier New', monospace" }}>
          Gestion du PIN
        </span>
        <div style={{
          marginLeft: "auto",
          padding: "2px 8px", borderRadius: 20,
          background: hasPinSet ? "rgba(0,255,120,0.1)" : "rgba(255,165,0,0.1)",
          border: hasPinSet ? "1px solid rgba(0,255,120,0.3)" : "1px solid rgba(255,165,0,0.3)",
          color: hasPinSet ? "#00ff78" : "#ffaa00",
          fontSize: "0.65rem",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.05em",
        }}>
          {hasPinSet ? "PIN DÉFINI" : "PAS DE PIN"}
        </div>
      </div>

      {mode === "idle" && (
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setMode("set")}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "8px 12px", borderRadius: 8,
              background: "rgba(0,255,120,0.08)", border: "1px solid rgba(0,255,120,0.25)",
              color: "#00ff78", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0,255,120,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0,255,120,0.08)"}
          >
            <Lock className="w-3.5 h-3.5" />
            Définir PIN
          </button>
          {hasPinSet && (
            <button
              onClick={() => setMode("reset")}
              style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                padding: "8px 12px", borderRadius: 8,
                background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.25)",
                color: "#ffaa00", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,165,0,0.15)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,165,0,0.08)"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Réinitialiser
            </button>
          )}
        </div>
      )}

      {/* Set PIN mode */}
      {mode === "set" && !result && (
        <div>
          <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", marginBottom: 12, textAlign: "center" }}>
            Définir un nouveau PIN pour <strong style={{ color: "#f0fdf4" }}>{targetUserName}</strong>
          </p>
          <PinInput key={pinKey} onComplete={handleSetPin} disabled={loading} />
          <button
            onClick={() => setMode("idle")}
            style={{
              display: "block", width: "100%", marginTop: 10,
              padding: "6px", background: "none", border: "none",
              color: "rgba(255,255,255,0.3)", fontSize: "0.72rem", cursor: "pointer",
            }}
          >
            Annuler
          </button>
        </div>
      )}

      {/* Reset confirmation mode */}
      {mode === "reset" && !result && (
        <div>
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12,
            padding: "10px 12px", borderRadius: 8,
            background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.2)",
          }}>
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ffaa00" }} />
            <p style={{ color: "rgba(255,200,0,0.8)", fontSize: "0.75rem", lineHeight: 1.4 }}>
              Cela supprimera le PIN de <strong>{targetUserName}</strong>. L'utilisateur devra en créer un nouveau à sa prochaine connexion.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleReset}
              disabled={loading}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                background: "rgba(255,165,0,0.15)", border: "1px solid rgba(255,165,0,0.3)",
                color: "#ffaa00", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              }}
            >
              {loading ? "..." : "Confirmer"}
            </button>
            <button
              onClick={() => setMode("idle")}
              style={{
                flex: 1, padding: "8px", borderRadius: 8,
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.5)", fontSize: "0.75rem", cursor: "pointer",
              }}
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "10px 12px", borderRadius: 8,
          background: result.success ? "rgba(0,255,120,0.08)" : "rgba(255,68,68,0.08)",
          border: result.success ? "1px solid rgba(0,255,120,0.25)" : "1px solid rgba(255,68,68,0.25)",
          color: result.success ? "#00ff78" : "#ff6b6b",
          fontSize: "0.78rem",
        }}>
          {result.success
            ? <Check className="w-4 h-4 flex-shrink-0" />
            : <X className="w-4 h-4 flex-shrink-0" />
          }
          {result.message}
        </div>
      )}
    </div>
  );
}
