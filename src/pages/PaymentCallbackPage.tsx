// src/pages/PaymentCallbackPage.tsx
// ─────────────────────────────────────────────────────────────────
// Page de retour après paiement Moneroo
// URL configurée dans Moneroo : /payment/callback
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { verifyPaymentFromCallback } from "@/lib/Moneroo";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");
  const [type, setType]     = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const result = await verifyPaymentFromCallback();
      setType(result.type);

      if (result.status === "success" || result.status === "completed") {
        setStatus("success");
        // Redirection selon le type après 3 secondes
        setTimeout(() => {
          if (result.type === "abonnement") navigate("/abonnement");
          else if (result.type === "transfert") navigate("/transfert");
          else if (result.type === "epargne") navigate("/dashboard");
          else navigate("/dashboard");
        }, 3000);
      } else {
        setStatus("failed");
        setTimeout(() => navigate("/dashboard"), 4000);
      }
    };
    check();
  }, []);

  const messages: Record<string, string> = {
    abonnement: "Votre plan Premium est maintenant actif !",
    transfert:  "Votre compte Transfert a été rechargé !",
    epargne:    "Votre dépôt épargne a été effectué !",
  };

  return (
    <AppLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        {status === "loading" && (
          <>
            <Loader2 className="w-16 h-16 text-accent animate-spin mb-4" />
            <h2 className="text-xl font-black text-foreground">Vérification du paiement...</h2>
            <p className="text-muted-foreground text-sm mt-2">Veuillez patienter</p>
          </>
        )}
        {status === "success" && (
          <>
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Paiement réussi !</h2>
            <p className="text-muted-foreground text-sm">
              {type ? messages[type] : "Transaction confirmée."}
            </p>
            <p className="text-xs text-muted-foreground mt-3">Redirection automatique...</p>
          </>
        )}
        {status === "failed" && (
          <>
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground mb-2">Paiement échoué</h2>
            <p className="text-muted-foreground text-sm">La transaction n'a pas pu être complétée.</p>
            <p className="text-xs text-muted-foreground mt-3">Redirection vers le tableau de bord...</p>
          </>
        )}
      </div>
    </AppLayout>
  );
}
