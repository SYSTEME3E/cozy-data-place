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
  const [formationContenuUrl, setFormationContenuUrl] = useState<string | null>(null);
  const [formationId, setFormationId] = useState<string | null>(null);
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
          // Si c'est une formation avec URL de contenu → ouvrir le contenu
          if (formationContenuUrl) {
            window.open(formationContenuUrl, "_blank");
            navigate(formationId ? `/formations/${formationId}` : `/formations`, { replace: true });
          } else if (formationId) {
            navigate(`/formations/${formationId}`, { replace: true });
          } else {
            navigate("/dashboard", { replace: true });
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, formationContenuUrl, formationId]);

  const handleCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const statusParam = params.get("status");
      // Lire type_transaction en priorité (nouveau), fallback sur type (legacy)
      const typeParam = params.get("type_transaction") ?? params.get("type");
      const userIdParam = params.get("user_id");
      const paymentId = params.get("reference") ?? params.get("paymentId") ?? params.get("payment_id") ?? null;

      // Récupérer les metadata depuis les params
      const formationId = params.get("formation_id") ?? params.get("metadata[formation_id]") ?? null;
      const affiliateId = params.get("affiliate_id") ?? params.get("metadata[affiliate_id]") ?? null;
      const productId   = params.get("product_id") ?? null;

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

      // ── CAS PRODUIT / FORMATION (type_transaction = "product") ────────────
      // Compatibilité legacy : anciens callbacks avec type="formation"
      const isFormationPayment =
        typeParam === "product" ||
        typeParam === "formation" ||
        formationId !== null;

      if (isFormationPayment && formationId) {
        try {
          // Chercher un achat pending pour cette formation
          const { data: existingPurchase } = await supabase
            .from("formation_purchases" as any)
            .select("id, status")
            .eq("user_id", userId)
            .eq("formation_id", formationId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (existingPurchase && (existingPurchase as any).status === "completed") {
            // Déjà confirmé
            setState("success");
            setMessage("Vous avez déjà accès à cette formation 🎓");
            return;
          }

          // Confirmer l'achat (mettre à jour le status pending → completed)
          let finalPurchaseId: string | null = null;

          if (existingPurchase) {
            await supabase
              .from("formation_purchases" as any)
              .update({
                status: "completed",
                payment_id: paymentId,
              })
              .eq("id", (existingPurchase as any).id);
            finalPurchaseId = (existingPurchase as any).id;
          } else {
            // Créer l'achat s'il n'existe pas encore (cas webhook direct)
            const { data: newPurchase } = await supabase
              .from("formation_purchases" as any)
              .insert({
                user_id: userId,
                formation_id: formationId,
                amount: 0,
                currency: "XOF",
                status: "completed",
                affiliate_id: affiliateId || null,
                payment_id: paymentId,
              })
              .select("id")
              .maybeSingle();
            finalPurchaseId = (newPurchase as any)?.id ?? null;
          }

          // Distribuer les commissions affilié
          if (affiliateId && affiliateId !== userId && finalPurchaseId) {
            const { data: formationData } = await supabase
              .from("formations" as any)
              .select("prix, prix_promo")
              .eq("id", formationId)
              .maybeSingle();

            const fd = formationData as any;
            const prix = (fd?.prix_promo && fd.prix_promo < fd.prix)
              ? fd.prix_promo
              : (fd?.prix ?? 0);
            if (prix > 0) {
              const { distributeFormationCommissions } = await import("@/lib/mlm-utils");
              await distributeFormationCommissions(userId, affiliateId, prix, finalPurchaseId);
            }
          }

          // Récupérer l'URL du contenu pour rediriger l'acheteur
          const { data: formationInfo } = await supabase
            .from("formations" as any)
            .select("titre, contenu_url, contenu_type")
            .eq("id", formationId)
            .maybeSingle();

          const contenuUrl = (formationInfo as any)?.contenu_url ?? null;
          const formationTitre = (formationInfo as any)?.titre ?? "la formation";

          setState("success");
          setMessage(`🎓 Paiement confirmé ! Vous avez maintenant accès à "${formationTitre}".`);
          // Stocker l'URL du contenu pour le bouton d'accès
          if (contenuUrl) {
            setFormationContenuUrl(contenuUrl);
          }
          setFormationId(formationId);
          return;
        } catch (formationErr: any) {
          console.error("Erreur confirmation formation:", formationErr);
          // Même si erreur DB, on montre succès car le paiement est passé
          setState("success");
          setMessage("Paiement reçu ! L'accès à la formation sera activé sous peu.");
          return;
        }
      }

      // ── CAS ABONNEMENT PREMIUM ─────────────────────────────────────────────
      // Accepte type_transaction="subscription" (nouveau) et type="abonnement_premium" (legacy)
      if (typeParam === "subscription" || typeParam === "abonnement_premium") {
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

      // ── CAS GÉNÉRIQUE ──────────────────────────────────────────────────────
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
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-lg ${
              message.includes("formation") || message.includes("Formation") || message.includes("🎓")
                ? "bg-gradient-to-br from-blue-400 to-violet-500"
                : "bg-gradient-to-br from-yellow-400 to-orange-500"
            }`}>
              {message.includes("🎓") ? (
                <span className="text-4xl">🎓</span>
              ) : (
                <Crown className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground mb-2">
                {message.includes("🎓") ? "Formation débloquée !" : "🎉 Premium Activé !"}
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
            </div>
            <div className="w-full bg-muted rounded-2xl p-4 border border-border">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Redirection dans <span className="text-foreground font-black">{countdown}s</span>
              </p>
            </div>
            <div className="flex gap-3 w-full">
              {message.includes("🎓") && (
                <>
                  {formationContenuUrl && (
                    <button
                      onClick={() => {
                        window.open(formationContenuUrl, "_blank");
                        navigate(formationId ? `/formations/${formationId}` : "/formations", { replace: true });
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-blue-400 to-violet-500 text-white font-black rounded-xl text-sm"
                    >
                      Accéder au contenu →
                    </button>
                  )}
                  <button
                    onClick={() => navigate(formationId ? `/formations/${formationId}` : "/formations", { replace: true })}
                    className="flex-1 py-3 bg-gradient-to-r from-blue-400/60 to-violet-500/60 text-white font-black rounded-xl text-sm"
                  >
                    Voir la formation →
                  </button>
                </>
              )}
              {!message.includes("🎓") && (
                <button
                  onClick={() => navigate("/dashboard", { replace: true })}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-primary-foreground font-black rounded-xl"
                >
                  Aller au Dashboard →
                </button>
              )}
            </div>
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
