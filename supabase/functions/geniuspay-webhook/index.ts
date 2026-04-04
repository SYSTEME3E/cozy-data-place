// supabase/functions/geniuspay-webhook/index.ts
// ─────────────────────────────────────────────────────────────────
// Webhook GeniusPay → reçoit les événements de paiement
// ✅ Gère : payment.success / payment.failed / payment.cancelled
// ✅ Pour recharge_transfert : crédite nexora_transfert_comptes
// ✅ Pour abonnement_premium : active le plan Premium
// ✅ Robuste : fonctionne même si la transaction n'existe pas encore
//    (peut être appelé avant ou après la redirection utilisateur)
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event   = req.headers.get("X-Webhook-Event") ?? req.headers.get("x-webhook-event");
    const payload = await req.json();

    console.log("Webhook received:", event, JSON.stringify(payload));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // GeniusPay envoie les données dans payload.data ou directement dans payload
    const txData    = payload.data ?? payload;
    const reference = txData.reference ?? txData.id ?? txData.payment_id ?? null;

    if (!reference) {
      console.warn("Webhook sans référence, ignoré.");
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ── Lire les metadata envoyées par GeniusPay (contient user_id, type, amount_net)
    const meta      = txData.metadata ?? {};
    const userId    = meta.user_id    ?? txData.user_id    ?? null;
    const txType    = meta.type       ?? txData.type       ?? null;
    const amountRaw = txData.amount   ?? 0;
    const frais     = txType === "recharge_transfert" ? 100 : 0;
    const amountNet = Number(meta.amount_net) || Math.max(0, amountRaw - frais);

    // ─────────────────────────────────────────────────────────────
    // PAIEMENT RÉUSSI
    // ─────────────────────────────────────────────────────────────
    if (event === "payment.success") {

      // 1. Mettre à jour la transaction existante (créée par geniuspay-payment)
      //    OU créer une nouvelle si elle n'existe pas encore (robustesse)
      const { data: existingTx } = await supabase
        .from("nexora_transactions")
        .select("*")
        .eq("moneroo_id", reference)
        .maybeSingle();

      let tx = existingTx;

      if (tx) {
        // Mise à jour de la transaction existante
        await supabase
          .from("nexora_transactions")
          .update({
            status:       "completed",
            completed_at: new Date().toISOString(),
          })
          .eq("moneroo_id", reference);
      } else {
        // Aucune transaction trouvée → on la crée maintenant
        // (cas où le webhook arrive avant la réponse de geniuspay-payment)
        if (!userId || !txType) {
          console.warn("Webhook sans user_id ou type dans metadata, impossible de créer la transaction.");
          return new Response(JSON.stringify({ received: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        const { data: newTx } = await supabase
          .from("nexora_transactions")
          .insert({
            user_id:      userId,
            type:         txType,
            amount:       amountRaw,
            frais,
            currency:     txData.currency ?? "XOF",
            status:       "completed",
            completed_at: new Date().toISOString(),
            moneroo_id:   reference,
            metadata:     meta,
          })
          .select()
          .single();

        tx = newTx;
      }

      if (!tx) {
        console.error("Impossible de créer/récupérer la transaction.");
        return new Response(JSON.stringify({ received: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const finalUserId  = tx.user_id  ?? userId;
      const finalType    = tx.type     ?? txType;
      const finalMeta    = (tx.metadata as Record<string, string>) ?? meta;
      const finalFrais   = tx.frais    ?? frais;
      const finalNet     = Number(finalMeta.amount_net) || Math.max(0, (tx.amount ?? amountRaw) - finalFrais);

      // ── RECHARGE TRANSFERT : créditer le solde ──────────────────
      if (finalType === "recharge_transfert" && finalUserId) {

        // Upsert avec recalcul depuis toutes les transactions (source de vérité)
        // pour éviter les doubles crédits en cas de webhook dupliqué
        const { data: allTxs } = await supabase
          .from("nexora_transactions")
          .select("type, amount, frais, status")
          .eq("user_id", finalUserId);

        if (allTxs) {
          const totalRecharges = allTxs
            .filter(t => t.type === "recharge_transfert" && t.status === "completed")
            .reduce((sum, t) => sum + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);

          const totalTransferts = allTxs
            .filter(t => t.type === "retrait_transfert" && t.status === "completed")
            .reduce((sum, t) => sum + (t.amount ?? 0), 0);

          const soldeFinal = Math.max(0, totalRecharges - totalTransferts);

          // Upsert : insert si pas de ligne, update si existe
          await supabase
            .from("nexora_transfert_comptes")
            .upsert(
              { user_id: finalUserId, solde: soldeFinal, updated_at: new Date().toISOString() },
              { onConflict: "user_id" }
            );
        }

        // Notification
        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "💰 Recharge réussie",
          message: `${finalNet} FCFA ont été crédités sur votre compte Transfert.`,
          type:    "success",
        });

        console.log(`✅ Recharge ${finalNet} FCFA créditée pour ${finalUserId}`);
      }

      // ── ABONNEMENT PREMIUM : activer le plan ─────────────────────
      if (finalType === "abonnement_premium" && finalUserId) {
        const now     = new Date();
        const dateEnd = new Date(now);
        dateEnd.setMonth(dateEnd.getMonth() + 1);

        await supabase.from("abonnements").insert({
          user_id:            finalUserId,
          plan:               "boss",
          montant:            tx.amount,
          statut:             "actif",
          date_debut:         now.toISOString(),
          date_fin:           dateEnd.toISOString(),
          reference_paiement: reference,
        });

        await supabase
          .from("nexora_users")
          .update({
            plan:               "boss",
            badge_premium:      true,
            premium_since:      now.toISOString(),
            premium_expires_at: dateEnd.toISOString(),
          })
          .eq("id", finalUserId);

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "🎉 Bienvenue Premium !",
          message: "Votre abonnement Premium est maintenant actif. Profitez de toutes les fonctionnalités !",
          type:    "success",
        });

        console.log(`✅ Premium activé pour ${finalUserId}`);
      }

    // ─────────────────────────────────────────────────────────────
    // PAIEMENT ÉCHOUÉ OU ANNULÉ
    // ─────────────────────────────────────────────────────────────
    } else if (
      event === "payment.failed"    ||
      event === "payment.cancelled" ||
      event === "payment.expired"
    ) {
      await supabase
        .from("nexora_transactions")
        .update({ status: "failed" })
        .eq("moneroo_id", reference);

      console.log(`❌ Paiement ${reference} marqué comme échoué (event: ${event})`);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err: any) {
    console.error("Webhook error:", err);
    // Toujours retourner 200 pour éviter que GeniusPay renvoie en boucle
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
