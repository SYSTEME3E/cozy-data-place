// src/pages/PaymentCallbackPage.tsx
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getNexoraUser,
  NEXORA_USER_KEY,
  NEXORA_SESSION_KEY,
} from "@/lib/nexora-auth";
import { CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";

type State = "loading" | "success" | "failed" | "already_premium";

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    handleCallback();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    if (state === "loading") return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate("/dashboard", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state]);

  const handleCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get("status");
      const typeParam = params.get("type");
      const userIdParam = params.get("user_id");
      const paymentId = params.get("reference") ?? params.get("paymentId") ?? params.get("payment_id") ?? null;

      if (statusParam !== "success") {
        setState("failed");
        setMessage("Le paiement a été annulé ou a échoué. Aucun montant n'a été débité.");
        return;
      }

      const currentUser = getNexoraUser();
      const userId = userIdParam || currentUser?.id;

      if (!userId) {
        setState("failed");
        setMessage("Impossible d'identifier votre compte. Reconnectez-vous et vérifiez dans votre profil.");
        return;
      }

      // Pour l'abonnement: le webhook active le plan côté serveur
      // On poll la DB pour détecter l'activation
      if (typeParam === "abonnement_premium") {
        let attempts = 0;
        const maxAttempts = 15; // 15 x 2s = 30s max

        pollRef.current = setInterval(async () => {
          attempts++;
          const { data: userData } = await supabase
            .from("nexora_users" as any)
            .select("id, plan, nom_prenom, username, email, avatar_url, is_admin, badge_premium")
            .eq("id", userId)
            .maybeSingle();

          if (userData && (userData as any).plan !== "gratuit") {
            if (pollRef.current) clearInterval(pollRef.current);
            
            const updatedUser = {
              ...(currentUser ?? {}),
              id: userId,
              nom_prenom: (userData as any).nom_prenom,
              username: (userData as any).username,
              email: (userData as any).email,
              avatar_url: (userData as any).avatar_url,
              is_admin: (userData as any).is_admin,
              plan: (userData as any).plan,
              badge_premium: (userData as any).badge_premium,
            };
            syncLocalUser(updatedUser);

            const prenom = (userData as any).nom_prenom?.split(" ")[0] ?? "vous";
            setState("success");
            setMessage(`Félicitations ${prenom} ! Votre compte est maintenant Premium 🎉`);
            return;
          }

          if (attempts >= maxAttempts) {
            if (pollRef.current) clearInterval(pollRef.current);
            setState("success");
            setMessage(
              paymentId
                ? `Paiement reçu ! L'activation peut prendre quelques instants. Référence : ${paymentId}`
                : "Paiement reçu ! L'activation peut prendre quelques instants."
            );
          }
        }, 2000);
        return;
      }

      // Pour les autres types de paiement
      setState("success");
      setMessage("Paiement confirmé !");

    } catch (err: any) {
      console.error("Erreur callback paiement:", err);
      setState("failed");
      setMessage("Une erreur inattendue s'est produite. Contactez le support.");
    }
  };

  const syncLocalUser = (user: any) => {
    try {
      const json = JSON.stringify(user);
      if (localStorage.getItem(NEXORA_SESSION_KEY)) {
        localStorage.setItem(NEXORA_USER_KEY, json);
      } else if (sessionStorage.getItem(NEXORA_SESSION_KEY)) {
        sessionStorage.setItem(NEXORA_USER_KEY, json);
      }
    } catch (e) {
      console.warn("Impossible de sync le cache local:", e);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}
    >
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-border overflow-hidden">

        {state === "loading" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground mb-2">Vérification du paiement</h2>
              <p className="text-sm text-muted-foreground">Activation de votre plan en cours...</p>
            </div>
          </div>
        )}

        {state === "success" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
              <Crown className="w-10 h-10 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground mb-2">🎉 Premium Activé !</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            </div>
            <div className="w-full bg-muted rounded-2xl p-4 border border-border">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Redirection dans <span className="text-foreground font-black">{countdown}s</span>
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-primary-foreground font-black rounded-xl"
            >
              Aller au Dashboard →
            </button>
          </div>
        )}

        {state === "already_premium" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center">
              <Crown className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground mb-2">Déjà Premium !</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redirection dans <span className="text-foreground font-black">{countdown}s</span>
            </p>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full py-3 bg-muted text-foreground font-bold rounded-xl"
            >
              Retour au Dashboard
            </button>
          </div>
        )}

        {state === "failed" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-destructive/20 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground mb-2">Paiement non confirmé</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-muted-foreground">
              Redirection dans <span className="text-foreground font-black">{countdown}s</span>
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate("/abonnement", { replace: true })}
                className="flex-1 py-3 bg-muted text-foreground font-bold rounded-xl text-sm"
              >
                Réessayer
              </button>
              <button
                onClick={() => navigate("/dashboard", { replace: true })}
                className="flex-1 py-3 bg-muted/50 text-muted-foreground font-bold rounded-xl text-sm"
              >
                Dashboard
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}