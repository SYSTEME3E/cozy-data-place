import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, ShieldCheck, Eye, EyeOff, ArrowRight, Lock } from "lucide-react";
import PinInput from "@/components/auth/PinInput";
import { setPin } from "@/services/pinService";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useToast } from "@/hooks/use-toast";
import { usePinAuth } from "@/hooks/usePinAuth";

type Step = "create" | "confirm";

export default function SetupPinPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { unlockPin } = usePinAuth();
  const user = getNexoraUser();

  const [step, setStep] = useState<Step>("create");
  const [firstPin, setFirstPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const handleFirstPin = (pin: string) => {
    setFirstPin(pin);
    setStep("confirm");
    setError("");
  };

  const handleConfirmPin = async (pin: string) => {
    if (pin !== firstPin) {
      setError("Les codes PIN ne correspondent pas. Réessayez.");
      triggerShake();
      setTimeout(() => setStep("create"), 800);
      return;
    }

    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    const result = await setPin(user.id, pin);
    setLoading(false);

    if (!result.success) {
      setError(result.error || "Erreur lors de l'enregistrement.");
      triggerShake();
      return;
    }

    unlockPin();
    toast({
      title: "Code PIN configuré !",
      description: "Votre code PIN a été enregistré avec succès.",
    });
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#080c10] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "50%",
            transform: "translate(-50%,-50%)",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,120,0.08) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "10%",
            right: "10%",
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,200,255,0.06) 0%, transparent 70%)",
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "linear-gradient(135deg, rgba(0,255,120,0.15), rgba(0,200,255,0.15))",
              border: "1.5px solid rgba(0,255,120,0.3)",
              boxShadow: "0 0 30px rgba(0,255,120,0.2)",
              marginBottom: 16,
            }}
          >
            <Shield className="w-8 h-8" style={{ color: "#00ff78" }} />
          </div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#f0fdf4",
              letterSpacing: "-0.02em",
              fontFamily: "'Courier New', monospace",
            }}
          >
            NEXORA
          </h1>
          <p style={{ color: "rgba(0,255,120,0.6)", fontSize: "0.75rem", letterSpacing: "0.2em", marginTop: 2 }}>
            SÉCURITÉ
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "rgba(10,18,12,0.9)",
            border: "1px solid rgba(0,255,120,0.2)",
            borderRadius: 20,
            padding: "2rem",
            boxShadow: "0 0 40px rgba(0,0,0,0.6), 0 0 1px rgba(0,255,120,0.1)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            {["create", "confirm"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    fontFamily: "'Courier New', monospace",
                    background:
                      step === s
                        ? "rgba(0,255,120,0.2)"
                        : step === "confirm" && s === "create"
                        ? "rgba(0,255,120,0.1)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      step === s
                        ? "1.5px solid #00ff78"
                        : step === "confirm" && s === "create"
                        ? "1.5px solid rgba(0,255,120,0.4)"
                        : "1.5px solid rgba(255,255,255,0.1)",
                    color:
                      step === s
                        ? "#00ff78"
                        : step === "confirm" && s === "create"
                        ? "rgba(0,255,120,0.6)"
                        : "rgba(255,255,255,0.3)",
                    boxShadow: step === s ? "0 0 10px rgba(0,255,120,0.3)" : "none",
                  }}
                >
                  {step === "confirm" && s === "create" ? "✓" : i + 1}
                </div>
                {i === 0 && (
                  <ArrowRight className="w-3 h-3" style={{ color: "rgba(255,255,255,0.2)" }} />
                )}
              </div>
            ))}
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.7rem",
                color: "rgba(255,255,255,0.3)",
                fontFamily: "'Courier New', monospace",
                letterSpacing: "0.05em",
              }}
            >
              {step === "create" ? "ÉTAPE 1/2" : "ÉTAPE 2/2"}
            </span>
          </div>

          {/* Title */}
          <div className="text-center mb-2">
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 700,
                color: "#f0fdf4",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {step === "create" ? "Créer votre code PIN" : "Confirmer le code PIN"}
            </h2>
            <p
              style={{
                fontSize: "0.8rem",
                color: "rgba(255,255,255,0.4)",
                marginTop: 4,
              }}
            >
              {step === "create"
                ? "Choisissez un code PIN à 4 chiffres"
                : "Saisissez à nouveau votre code PIN"}
            </p>
          </div>

          {/* Lock icon animated */}
          <div className="flex justify-center my-5">
            <div
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "rgba(0,255,120,0.06)",
                border: "1px solid rgba(0,255,120,0.15)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Lock className="w-3.5 h-3.5" style={{ color: "rgba(0,255,120,0.5)" }} />
              <span style={{ fontSize: "0.7rem", color: "rgba(0,255,120,0.5)", fontFamily: "'Courier New', monospace", letterSpacing: "0.1em" }}>
                ACCÈS SÉCURISÉ
              </span>
            </div>
          </div>

          {/* PIN Input */}
          <div className="mb-4">
            <PinInput
              key={step}
              onComplete={step === "create" ? handleFirstPin : handleConfirmPin}
              disabled={loading}
              error={!!error}
              shake={shake}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                textAlign: "center",
                padding: "8px 12px",
                borderRadius: 8,
                background: "rgba(255,68,68,0.1)",
                border: "1px solid rgba(255,68,68,0.3)",
                color: "#ff6b6b",
                fontSize: "0.78rem",
                marginTop: 8,
              }}
            >
              {error}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center mt-4">
              <div className="flex items-center justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: "#00ff78",
                      animation: "bounce 0.8s infinite",
                      animationDelay: `${i * 0.15}s`,
                    }}
                  />
                ))}
              </div>
              <p style={{ color: "rgba(0,255,120,0.6)", fontSize: "0.75rem", marginTop: 6 }}>
                Enregistrement en cours...
              </p>
            </div>
          )}

          {/* Info footer */}
          <div
            style={{
              marginTop: 20,
              paddingTop: 16,
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "rgba(0,255,120,0.4)" }} />
            <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>
              Votre PIN protège l'accès au dashboard et autorise les transferts. Il est stocké de manière chiffrée.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
