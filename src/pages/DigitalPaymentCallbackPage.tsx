// src/pages/DigitalPaymentCallbackPage.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Page de callback PUBLIC (pas besoin d'être connecté NEXORA)
// Gère uniquement les paiements de type "vente_digitale"
// Flux : GeniusPay → redirect → ici → marque commande payée → crédite vendeur → ouvre produit
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Loader2, Package, ExternalLink, Home } from "lucide-react";

type PageState = "loading" | "success" | "failed";

const COMMISSION_RATE = 0.06; // 6% prélevé sur chaque vente digitale

export default function DigitalPaymentCallbackPage() {
  const navigate     = useNavigate();
  const [state,      setState]      = useState<PageState>("loading");
  const [message,    setMessage]    = useState("");
  const [lienProduit, setLienProduit] = useState<string | null>(null);
  const [boutiqSlug, setBoutiqSlug]  = useState<string | null>(null);
  const [countdown,  setCountdown]  = useState(6);
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    handleDigitalCallback();
  }, []);

  // Compte à rebours après résolution
  useEffect(() => {
    if (state === "loading") return;
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          // Redirection finale
          if (state === "success" && lienProduit) {
            window.open(lienProduit, "_blank");
          }
          if (boutiqSlug) navigate(`/shop/${boutiqSlug}`, { replace: true });
          else navigate("/", { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [state, lienProduit, boutiqSlug]);

  const handleDigitalCallback = async () => {
    try {
      const params = new URLSearchParams(window.location.search);

      // ── Lire les paramètres de callback GeniusPay ─────────────────────────
      const statusParam   = params.get("status");
      const typeParam     = params.get("type_transaction") ?? params.get("type") ?? "";
      const commandeId    = params.get("commande_id")    ?? params.get("metadata[commande_id]")    ?? null;
      const lienProd      = params.get("lien_produit")   ?? params.get("metadata[lien_produit]")   ?? null;
      const sellerUserId  = params.get("seller_user_id") ?? params.get("metadata[seller_user_id]") ?? null;
      const boutiqSlugVal = params.get("boutique_slug")  ?? params.get("metadata[boutique_slug]")  ?? null;
      const montantParam  = params.get("amount")         ?? params.get("metadata[montant]")         ?? null;
      const paymentId     = params.get("reference")      ?? params.get("paymentId")                ?? null;

      if (boutiqSlugVal) setBoutiqSlug(boutiqSlugVal);

      // ── Vérifier que c'est bien un paiement digital ───────────────────────
      if (typeParam !== "vente_digitale") {
        // Ce n'est pas notre cas — renvoyer vers le callback principal
        navigate(`/payment/callback${window.location.search}`, { replace: true });
        return;
      }

      // ── Paiement échoué ───────────────────────────────────────────────────
      if (statusParam !== "success") {
        setState("failed");
        setMessage("Le paiement a été annulé ou a échoué. Aucun montant n'a été débité.");
        return;
      }

      // ── Récupérer les infos depuis localStorage si params manquants ───────
      let resolvedCommandeId   = commandeId;
      let resolvedLienProduit  = lienProd;
      let resolvedSellerUserId = sellerUserId;
      let resolvedBoutiqueSlug = boutiqSlugVal;
      let resolvedMontant      = montantParam ? parseFloat(montantParam) : 0;

      if (!resolvedCommandeId || !resolvedLienProduit) {
        try {
          const stored = localStorage.getItem("nexora_digital_callback");
          if (stored) {
            const parsed = JSON.parse(stored);
            resolvedCommandeId   = resolvedCommandeId   || parsed.commande_id;
            resolvedLienProduit  = resolvedLienProduit  || parsed.lien_produit;
            resolvedSellerUserId = resolvedSellerUserId || parsed.seller_user_id;
            resolvedBoutiqueSlug = resolvedBoutiqueSlug || parsed.boutique_slug;
            resolvedMontant      = resolvedMontant || parsed.montant || 0;
            if (boutiqSlugVal) setBoutiqSlug(boutiqSlugVal);
            else if (parsed.boutique_slug) setBoutiqSlug(parsed.boutique_slug);
          }
        } catch (_) {}
      }

      if (resolvedLienProduit) setLienProduit(resolvedLienProduit);

      // ── Mettre à jour la commande → statut payé ───────────────────────────
      if (resolvedCommandeId) {
        try {
          // Récupérer le montant depuis la commande si non disponible
          if (!resolvedMontant) {
            const { data: cmd } = await supabase
              .from("commandes" as any)
              .select("total, boutique_id")
              .eq("id", resolvedCommandeId)
              .maybeSingle();
            if (cmd) {
              resolvedMontant = (cmd as any).total || 0;
              if (!resolvedSellerUserId) {
                // Récupérer le user_id du vendeur depuis la boutique
                const { data: bout } = await supabase
                  .from("boutiques" as any)
                  .select("user_id")
                  .eq("id", (cmd as any).boutique_id)
                  .maybeSingle();
                if (bout) resolvedSellerUserId = (bout as any).user_id;
              }
            }
          }

          // Marquer comme payé
          await supabase.from("commandes" as any).update({
            statut_paiement: "paye",
            statut:          "confirmee",
            kkiapay_id:      paymentId ?? undefined,
          }).eq("id", resolvedCommandeId);
        } catch (e) {
          console.warn("Impossible de mettre à jour la commande:", e);
          // On continue quand même — le paiement est confirmé
        }
      }

      // ── Créditer le portefeuille du vendeur (montant net − 6%) ───────────
      if (resolvedSellerUserId && resolvedMontant > 0) {
        try {
          const commission = Math.round(resolvedMontant * COMMISSION_RATE);
          const montantNet = resolvedMontant - commission;

          await supabase.from("nexora_transactions" as any).insert({
            user_id:     resolvedSellerUserId,
            type:        "vente_digitale",
            montant:     montantNet,
            commission:  commission,
            statut:      "succes",
            description: `Vente produit digital — commande ${resolvedCommandeId ?? "?"}`,
            reference:   paymentId ?? resolvedCommandeId ?? null,
            metadata: {
              commande_id:   resolvedCommandeId,
              lien_produit:  resolvedLienProduit,
              montant_brut:  resolvedMontant,
            },
          });
        } catch (e) {
          console.warn("Impossible de créditer le portefeuille:", e);
          // Ne pas bloquer l'acheteur — la transaction sera régularisée manuellement
        }
      }

      // ── Nettoyer le localStorage ──────────────────────────────────────────
      try { localStorage.removeItem("nexora_digital_callback"); } catch (_) {}

      // ── Succès ────────────────────────────────────────────────────────────
      setState("success");
      setMessage("Paiement confirmé ! Votre produit va s'ouvrir automatiquement.");

    } catch (err: any) {
      console.error("Erreur callback digital:", err);
      setState("failed");
      setMessage("Une erreur inattendue s'est produite. Si vous avez été débité, contactez le support.");
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "radial-gradient(ellipse at top, hsl(258 89% 16%) 0%, hsl(240 89% 8%) 100%)" }}
    >
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Loading ── */}
        {state === "loading" && (
          <div className="p-10 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-violet-100 flex items-center justify-center">
              <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Vérification du paiement</h2>
              <p className="text-sm text-gray-500">Confirmation en cours, ne fermez pas cette page…</p>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full animate-pulse w-2/3" />
            </div>
          </div>
        )}

        {/* ── Succès ── */}
        {state === "success" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            {/* Icône */}
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-200">
              <CheckCircle2 className="w-11 h-11 text-white" />
            </div>

            {/* Titre */}
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Paiement réussi ! 🎉</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>

            {/* Bouton accès produit */}
            {lienProduit && (
              <a
                href={lienProduit}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full h-13 py-3.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-base shadow-lg shadow-violet-200 flex items-center justify-center gap-2 hover:from-violet-700 hover:to-indigo-700 transition-all active:scale-95"
              >
                <Package className="w-5 h-5" />
                Accéder à mon produit →
              </a>
            )}

            {/* Compte à rebours */}
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
              <div className="flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4 text-violet-500" />
                <p className="text-sm font-semibold text-gray-700">
                  Ouverture automatique dans{" "}
                  <span className="text-violet-600 font-black">{countdown}s</span>
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all duration-1000"
                  style={{ width: `${((6 - countdown) / 6) * 100}%` }}
                />
              </div>
            </div>

            {/* Lien retour boutique */}
            {boutiqSlug && (
              <button
                onClick={() => navigate(`/shop/${boutiqSlug}`, { replace: true })}
                className="text-sm text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                ← Retour à la boutique
              </button>
            )}
          </div>
        )}

        {/* ── Échec ── */}
        {state === "failed" && (
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div className="w-20 h-20 rounded-2xl bg-red-100 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-2">Paiement non confirmé</h2>
              <p className="text-sm text-gray-500 leading-relaxed">{message}</p>
            </div>
            <div className="w-full bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-400">
                Redirection dans <span className="text-gray-700 font-black">{countdown}s</span>
              </p>
            </div>
            <div className="flex gap-3 w-full">
              {boutiqSlug && (
                <button
                  onClick={() => navigate(`/shop/${boutiqSlug}`, { replace: true })}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 hover:bg-gray-200 transition"
                >
                  <Home className="w-4 h-4" /> Boutique
                </button>
              )}
              <button
                onClick={() => navigate(-1)}
                className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-1.5"
              >
                Réessayer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
