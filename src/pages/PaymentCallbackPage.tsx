// src/pages/PaymentCallbackPage.tsx
// ─────────────────────────────────────────────────────────────────
// Page de retour après paiement GeniusPay
// ✅ FIX : lit user_id depuis l'URL (passé par success_url)
// ✅ FIX : ne fait plus confiance à la seule présence de "reference"
//          → vérifie d'abord le paramètre "status" explicite
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";
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
  const navigate            = useNavigate();
  const [state, setState]   = useState<State>("loading");
  const [message, setMessage] = useState("");
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    handleCallback();
  }, []);

  // ─── Décompte avant redirection ────────────────────────────────
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
      const params = new URLSearchParams(window.location.search);

      // ✅ FIX : on lit "status" passé explicitement depuis success_url
      const statusParam = params.get("status");    // "success" | "error"
      const typeParam   = params.get("type");      // "abonnement_premium" | ...
      // ✅ FIX : user_id maintenant passé dans l'URL par la Edge Function
      const userIdParam = params.get("user_id");
      // Référence de paiement GeniusPay (présente dans la success_url retournée)
      const paymentId   = params.get("reference") ?? params.get("paymentId") ?? params.get("payment_id") ?? null;

      // Paiement échoué ou annulé
      if (statusParam !== "success") {
        setState("failed");
        setMessage("Le paiement a été annulé ou a échoué. Aucun montant n'a été débité.");
        return;
      }

      // Identifier l'utilisateur (URL en priorité, sinon session locale)
      const currentUser = getNexoraUser();
      const userId      = userIdParam || currentUser?.id;

      if (!userId) {
        setState("failed");
        setMessage("Impossible d'identifier votre compte. Reconnectez-vous et vérifiez dans votre profil.");
        return;
      }

      // Récupérer le profil utilisateur depuis Supabase
      const { data: userData, error: fetchError } = await supabase
        .from("nexora_users" as any)
        .select("id, plan, nom_prenom, username, email, avatar_url, is_admin, badge_premium")
        .eq("id", userId)
        .maybeSingle();

      if (fetchError || !userData) {
        setState("failed");
        setMessage("Compte introuvable. Contactez le support en indiquant votre email.");
        return;
      }

      // Déjà premium → on sync quand même le cache local
      if ((userData as any).plan !== "gratuit") {
        setState("already_premium");
        setMessage(`Votre compte est déjà en plan ${(userData as any).plan}.`);
        syncLocalUser({ ...(currentUser ?? {}), ...(userData as any) });
        return;
      }

      // ✅ Activer le plan Premium dans Supabase
      const { error: updateError } = await supabase
        .from("nexora_users" as any)
        .update({
          plan:          "boss",
          badge_premium: true,
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Erreur activation premium:", updateError);
        setState("failed");
        setMessage(
          paymentId
            ? `Paiement reçu mais erreur d'activation. Contactez le support avec la référence : ${paymentId}`
            : "Paiement reçu mais erreur d'activation. Contactez le support."
        );
        return;
      }

      // ✅ Enregistrer dans nexora_payments (non bloquant)
      supabase.from("nexora_payments" as any).insert({
        user_id:    userId,
        type:       typeParam ?? "abonnement_premium",
        amount:     100,
        status:     "success",
        payment_id: paymentId ?? "callback_verified",
        plan:       "boss",
      }).then(() => {}).catch(() => {});

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

      const prenom = (userData as any).nom_prenom?.split(" ")[0] ?? "vous";
      setState("success");
      setMessage(`Félicitations ${prenom} ! Votre compte est maintenant Premium 🎉`);

    } catch (err: any) {
      console.error("Erreur callback paiement:", err);
      setState("failed");
      setMessage("Une erreur inattendue s'est produite. Contactez le support.");
    }
  };

  // ─── Sync cache local (localStorage ou sessionStorage selon la session) ───
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

  // ─── UI ───────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, hsl(217 89% 18%) 0%, hsl(217 89% 8%) 100%)" }}
    >
      <div className="w-full max-w-sm bg-card rounded-3xl shadow-2xl border border-white/10 overflow-hidden">

        {/* Chargement */}
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

        {/* Succès */}
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
                Redirection dans <span className="text-white font-black">{countdown}s</span>
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

        {/* Déjà premium */}
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

        {/* Échec */}
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
