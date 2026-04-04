// src/pages/PaymentCallbackPage.tsx
// ─────────────────────────────────────────────────────────────────
// Page de retour après paiement GeniusPay
// GeniusPay redirige ici après succès ou échec du paiement
// Cette page vérifie le paiement et active automatiquement le plan Premium
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getNexoraUser,
  NEXORA_USER_KEY,
  NEXORA_SESSION_KEY,
} from "@/lib/nexora-auth";
import { verifyPaymentFromCallback } from "@/lib/Moneroo";
import { CheckCircle2, XCircle, Loader2, Crown } from "lucide-react";

type State = "loading" | "success" | "failed" | "already_premium";

export default function PaymentCallbackPage() {
  const navigate        = useNavigate();
  const [state, setState] = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    handleCallback();
  }, []);

  // ─── Décompte avant redirection ───────────────────────────────
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

  // ─── Logique principale ────────────────────────────────────────
  const handleCallback = async () => {
    try {
      const { status, type, paymentId } = await verifyPaymentFromCallback();

      // Récupérer le user_id depuis l'URL (ajouté dans AbonnementPage)
      const params = new URLSearchParams(window.location.search);
      const userIdFromUrl = params.get("user_id");

      // Paiement échoué
      if (status !== "success") {
        setState("failed");
        setMessage("Le paiement a été annulé ou a échoué. Aucun montant n'a été débité.");
        return;
      }

      // Identifier l'utilisateur
      const currentUser = getNexoraUser();
      const userId = userIdFromUrl || currentUser?.id;

      if (!userId) {
        setState("failed");
        setMessage("Impossible d'identifier votre compte. Connectez-vous et réessayez.");
        return;
      }

      // Vérifier le plan actuel
      const { data: userData, error: fetchError } = await supabase
        .from("nexora_users" as any)
        .select("id, plan, nom_prenom, username, email, avatar_url, is_admin, badge_premium")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError || !userData) {
        setState("failed");
        setMessage("Compte introuvable. Contactez le support.");
        return;
      }

      if ((userData as any).plan !== "gratuit") {
        setState("already_premium");
        setMessage(`Votre compte est déjà en plan ${(userData as any).plan}.`);
        // Mettre à jour le cache local quand même
        syncLocalUser(userData);
        return;
      }

      // ✅ Activer le plan Premium dans Supabase
      const { error: updateError } = await supabase
        .from("nexora_users" as any)
        .update({
          plan:          "boss",   // "boss" = premier niveau premium
          badge_premium: true,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Erreur activation premium:", updateError);
        setState("failed");
        setMessage("Paiement reçu mais erreur d'activation. Contactez le support avec votre ID : " + paymentId);
        return;
      }

      // ✅ Enregistrer le paiement dans nexora_payments (si la table existe)
      await supabase.from("nexora_payments" as any).insert({
        user_id:    userId,
        type:       "abonnement_premium",
        amount:     100,
        status:     "success",
        payment_id: paymentId ?? "manual",
        plan:       "boss",
      }).then(() => {}).catch(() => {}); // Non bloquant

      // ✅ Mettre à jour le cache localStorage/sessionStorage
      const updatedUser = {
        ...(currentUser ?? {}),
        id:            userId,
        nom_prenom:    (userData as any).nom_prenom,
        username:      (userData as any).username,
        email:         (userData as any).email,
        avatar_url:    (userData as any).avatar_url,
        is_admin:      (userData as any).is_admin,
        plan:          "boss",
        badge_premium: true,
      };
      syncLocalUser(updatedUser);

      setState("success");
      setMessage(`Félicitations ${(userData as any).nom_prenom?.split(" ")[0]} ! Votre compte est maintenant Premium.`);

    } catch (err: any) {
      console.error("Erreur callback paiement:", err);
      setState("failed");
      setMessage("Une erreur inattendue s'est produite. Contactez le support.");
    }
  };

  // ─── Sync cache local ─────────────────────────────────────────
  const syncLocalUser = (user: any) => {
    const json = JSON.stringify(user);
    if (localStorage.getItem(NEXORA_SESSION_KEY)) {
      localStorage.setItem(NEXORA_USER_KEY, json);
    } else if (sessionStorage.getItem(NEXORA_SESSION_KEY)) {
      sessionStorage.setItem(NEXORA_USER_KEY, json);
    }
  };

  // ─── UI ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}
    >
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-white/10 overflow-hidden">

        {/* État : chargement */}
        {state === "loading" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-900/50 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Vérification du paiement</h2>
              <p className="text-sm text-white/50">Activation de votre plan en cours...</p>
            </div>
          </div>
        )}

        {/* État : succès */}
        {state === "success" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Crown className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">🎉 Premium Activé !</h2>
              <p className="text-sm text-white/70 leading-relaxed">{message}</p>
            </div>
            <div className="w-full bg-white/5 rounded-2xl p-4 border border-white/10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-white/50">
                Redirection automatique dans <span className="text-white font-black">{countdown}s</span>
              </p>
            </div>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-black rounded-xl"
            >
              Aller au Dashboard →
            </button>
          </div>
        )}

        {/* État : déjà premium */}
        {state === "already_premium" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-indigo-900/50 flex items-center justify-center">
              <Crown className="w-10 h-10 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Déjà Premium !</h2>
              <p className="text-sm text-white/70 leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-white/30">
              Redirection dans <span className="text-white font-black">{countdown}s</span>
            </p>
            <button
              onClick={() => navigate("/dashboard", { replace: true })}
              className="w-full py-3 bg-white/10 text-white font-bold rounded-xl"
            >
              Retour au Dashboard
            </button>
          </div>
        )}

        {/* État : échec */}
        {state === "failed" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-900/30 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-2">Paiement non confirmé</h2>
              <p className="text-sm text-white/70 leading-relaxed">{message}</p>
            </div>
            <p className="text-xs text-white/30">
              Redirection dans <span className="text-white font-black">{countdown}s</span>
            </p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => navigate("/abonnement", { replace: true })}
                className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl text-sm"
              >
                Réessayer
              </button>
              <button
                onClick={() => navigate("/dashboard", { replace: true })}
                className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
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
