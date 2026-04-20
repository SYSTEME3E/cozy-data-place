// supabase/functions/geniuspay-webhook/index.ts
// ─────────────────────────────────────────────────────────────────
// Webhook GeniusPay → reçoit les événements de paiement et cashout
// ✅ CORRECTIONS APPLIQUÉES :
//   - "payout.success"   → "cashout.completed" + "cashout.approved"
//   - "payout.failed"    → "cashout.failed"
//   - "payout.cancelled" → "cashout.failed" (même traitement)
//   Tous les noms d'événements correspondent EXACTEMENT à ce que
//   GeniusPay envoie (visible dans Dashboard > Webhooks > Événements disponibles)
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // ── Lire l'événement depuis le header ─────────────────────────
    // GeniusPay envoie l'événement dans X-Webhook-Event
    const event = req.headers.get("X-Webhook-Event")
               ?? req.headers.get("x-webhook-event")
               ?? req.headers.get("X-Event-Type")
               ?? req.headers.get("x-event-type");

    let payload: any;
    try {
      payload = await req.json();
    } catch {
      console.error("❌ Body JSON invalide");
      return jsonOk();
    }

    console.log("📩 Webhook reçu — event:", event);
    console.log("📩 Payload brut:", JSON.stringify(payload));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Extraire les données de la transaction ────────────────────
    const txData    = payload.data ?? payload;
    const reference = String(txData.reference ?? txData.id ?? txData.payment_id ?? "");

    if (!reference) {
      console.warn("⚠️ Webhook sans référence — ignoré.");
      return jsonOk();
    }

    const meta      = txData.metadata ?? {};
    const userId    = meta.user_id ?? txData.user_id ?? null;
    const txType    = meta.type_transaction ?? meta.type ?? txData.type ?? "";
    const amountRaw = Number(txData.amount) || 0;
    const frais     = txType === "topup" ? 100 : 0;
    const amountNet = Number(meta.amount_net) || Math.max(0, amountRaw - frais);

    console.log(`📌 Référence: ${reference} | Event: ${event} | Type: ${txType} | User: ${userId}`);

    // ══════════════════════════════════════════════════════════════
    // ① PAIEMENT RÉUSSI — payment.success
    // ══════════════════════════════════════════════════════════════
    if (event === "payment.success") {
      console.log(`🟢 PAYMENT SUCCESS: ${reference} | type: ${txType}`);

      // Chercher la transaction existante
      const { data: existingTx } = await supabase
        .from("nexora_transactions")
        .select("*")
        .eq("moneroo_id", reference)
        .maybeSingle();

      let tx = existingTx;

      if (tx) {
        await supabase
          .from("nexora_transactions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("moneroo_id", reference);
      } else {
        if (!userId || !txType) {
          console.warn("⚠️ Webhook sans user_id ou type — impossible de créer la transaction.");
          return jsonOk();
        }
        const { data: newTx } = await supabase
          .from("nexora_transactions")
          .insert({
            user_id:      userId,
            type:         txType,
            amount:       amountRaw,
            amount_net:   amountNet,
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
        console.error("❌ Impossible de gérer la transaction.");
        return jsonOk();
      }

      const finalUserId = tx.user_id ?? userId;
      const finalType   = (tx.metadata as any)?.type_transaction ?? tx.type ?? txType;
      const finalMeta   = (tx.metadata as Record<string, string>) ?? meta;
      const finalFrais  = tx.frais ?? frais;
      const finalNet    = Number(finalMeta.amount_net) || Math.max(0, (tx.amount ?? amountRaw) - finalFrais);

      // ── TOPUP / RECHARGE ──────────────────────────────────────
      if ((finalType === "topup" || finalType === "recharge_transfert") && finalUserId) {
        const { data: allTxs } = await supabase
          .from("nexora_transactions")
          .select("type, amount, frais, status")
          .eq("user_id", finalUserId);

        if (allTxs) {
          const totalRecharges  = allTxs
            .filter(t => (t.type === "topup" || t.type === "recharge_transfert") && t.status === "completed")
            .reduce((sum, t) => sum + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);
          const totalTransferts = allTxs
            .filter(t => t.type === "retrait_transfert" && t.status === "completed")
            .reduce((sum, t) => sum + (t.amount ?? 0), 0);

          const newSolde = Math.max(0, totalRecharges - totalTransferts);
          await supabase.from("nexora_transfert_comptes").upsert(
            { user_id: finalUserId, solde: newSolde, updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
          console.log(`💰 Solde rechargé : ${finalUserId} → ${newSolde} FCFA`);
        }

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "💰 Recharge réussie",
          message: `${finalNet} FCFA ont été crédités sur votre compte Transfert.`,
          type:    "success",
        });
      }

      // ── SUBSCRIPTION / ABONNEMENT PREMIUM ────────────────────
      else if ((finalType === "subscription" || finalType === "abonnement_premium") && finalUserId) {
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

        await supabase.from("nexora_users").update({
          plan:               "boss",
          badge_premium:      true,
          premium_since:      now.toISOString(),
          premium_expires_at: dateEnd.toISOString(),
        }).eq("id", finalUserId);

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "🎉 Bienvenue Premium !",
          message: "Votre abonnement Premium est maintenant actif.",
          type:    "success",
        });
        console.log(`✅ Premium activé pour ${finalUserId}`);
      }

      // ── PRODUCT (achat produit ou formation) ─────────────────
      else if (finalType === "product" && finalUserId) {
        const formationId = finalMeta.formation_id ?? null;
        const productId   = finalMeta.product_id   ?? null;

        if (formationId) {
          await supabase
            .from("formation_purchases")
            .update({ status: "completed" })
            .eq("user_id", finalUserId)
            .eq("formation_id", formationId)
            .eq("status", "pending");

          await supabase.from("nexora_notifications").insert({
            user_id: finalUserId,
            titre:   "🎓 Formation achetée !",
            message: "Votre achat est confirmé. Accédez à votre formation dès maintenant.",
            type:    "success",
          });
          console.log(`✅ Formation ${formationId} confirmée pour ${finalUserId}`);
        }

        if (productId) {
          await supabase
            .from("commandes")
            .update({ statut: "payé", payment_reference: reference })
            .eq("user_id", finalUserId)
            .eq("product_id", productId)
            .eq("statut", "pending");

          await supabase.from("nexora_notifications").insert({
            user_id: finalUserId,
            titre:   "🛍️ Achat confirmé !",
            message: "Votre paiement a été reçu. Commande en cours de traitement.",
            type:    "success",
          });
          console.log(`✅ Produit ${productId} confirmé pour ${finalUserId}`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ② CASHOUT RÉUSSI — cashout.completed OU cashout.approved
    //
    // ✅ CORRECTION PRINCIPALE :
    //   Avant : "payout.success"    → n'existait PAS chez GeniusPay
    //   Après : "cashout.completed" → événement RÉEL de GeniusPay
    //
    //   "cashout.approved"  = GeniusPay a approuvé, traitement en cours
    //   "cashout.completed" = Argent envoyé et reçu par le destinataire
    //   On traite les deux de la même façon (marquer complété, déduire solde)
    // ══════════════════════════════════════════════════════════════
    else if (event === "cashout.completed" || event === "cashout.approved") {
      console.log(`🟢 CASHOUT ${event?.toUpperCase()}: ${reference}`);

      // Chercher le payout par référence GeniusPay (moneroo_id)
      const { data: payout } = await supabase
        .from("nexora_payouts")
        .select("*")
        .eq("moneroo_id", reference)
        .maybeSingle();

      if (!payout) {
        console.warn(`⚠️ Payout introuvable pour référence: ${reference}`);
        // Tentative de retrouver via payout_id dans les metadata
        const payoutId = meta.payout_id ?? null;
        if (payoutId) {
          const { data: payoutById } = await supabase
            .from("nexora_payouts")
            .select("*")
            .eq("id", payoutId)
            .maybeSingle();
          if (payoutById) {
            console.log(`✅ Payout retrouvé via metadata.payout_id: ${payoutId}`);
            await handleCashoutSuccess(supabase, payoutById, reference, event);
          } else {
            console.warn(`⚠️ Payout introuvable aussi via payout_id: ${payoutId}`);
          }
        }
        return jsonOk();
      }

      await handleCashoutSuccess(supabase, payout, reference, event);
    }

    // ══════════════════════════════════════════════════════════════
    // ③ CASHOUT ÉCHOUÉ — cashout.failed
    //
    // ✅ CORRECTION :
    //   Avant : "payout.failed" / "payout.cancelled" → n'existaient PAS
    //   Après : "cashout.failed" → événement RÉEL de GeniusPay
    // ══════════════════════════════════════════════════════════════
    else if (event === "cashout.failed") {
      console.log(`🔴 CASHOUT FAILED: ${reference}`);

      const { data: payout } = await supabase
        .from("nexora_payouts")
        .select("*")
        .eq("moneroo_id", reference)
        .maybeSingle();

      if (!payout) {
        console.warn(`⚠️ Payout échoué introuvable: ${reference}`);
        return jsonOk();
      }

      // Marquer comme échoué
      await supabase
        .from("nexora_payouts")
        .update({ status: "failed" })
        .eq("id", payout.id);

      await supabase
        .from("nexora_transactions")
        .update({ status: "failed" })
        .eq("moneroo_id", reference);

      // ✅ Rembourser le solde — le montant avait été déduit à l'initiation
      const { data: compte } = await supabase
        .from("nexora_transfert_comptes")
        .select("solde")
        .eq("user_id", payout.user_id)
        .maybeSingle();

      const soldePrecedent  = compte?.solde ?? 0;
      const soldeRembourse  = soldePrecedent + payout.amount;

      await supabase.from("nexora_transfert_comptes").upsert(
        { user_id: payout.user_id, solde: soldeRembourse, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      console.log(`💸 Solde remboursé : ${payout.user_id} | ${soldePrecedent} → ${soldeRembourse} FCFA`);

      // Notification d'échec avec remboursement
      await supabase.from("nexora_notifications").insert({
        user_id: payout.user_id,
        titre:   "⚠️ Transfert échoué — Solde remboursé",
        message: `Votre transfert de ${payout.amount} FCFA a échoué. Votre solde a été remboursé. Réf: ${reference}`,
        type:    "error",
      });

      console.log(`✅ Payout ${reference} marqué échoué et solde remboursé`);
    }

    // ══════════════════════════════════════════════════════════════
    // ④ CASHOUT DEMANDÉ — cashout.requested
    //   GeniusPay vient de recevoir la demande, traitement en cours
    //   Juste un log informatif, pas d'action en base
    // ══════════════════════════════════════════════════════════════
    else if (event === "cashout.requested") {
      console.log(`⏳ CASHOUT REQUESTED: ${reference} — En attente de traitement GeniusPay`);
      // Pas d'action nécessaire : le payout est déjà en "pending" en base
    }

    // ══════════════════════════════════════════════════════════════
    // ⑤ PAIEMENT ÉCHOUÉ — payment.failed / cancelled / expired
    // ══════════════════════════════════════════════════════════════
    else if (["payment.failed", "payment.cancelled", "payment.expired"].includes(event ?? "")) {
      console.log(`🔴 PAYMENT FAILED: ${reference} (event: ${event})`);
      await supabase
        .from("nexora_transactions")
        .update({ status: "failed" })
        .eq("moneroo_id", reference);
    }

    // ══════════════════════════════════════════════════════════════
    // ⑥ ÉVÉNEMENT NON RECONNU — log pour débogage
    // ══════════════════════════════════════════════════════════════
    else {
      console.warn(`⚠️ Événement non géré: "${event}" — référence: ${reference}`);
      // On retourne quand même 200 pour que GeniusPay ne réessaie pas
    }

    return jsonOk();

  } catch (err: any) {
    console.error("💥 Webhook error:", err?.message, err?.stack);
    // Toujours retourner 200 même en cas d'erreur
    // pour éviter que GeniusPay ne renvoie l'événement en boucle
    return jsonOk();
  }
});

// ─────────────────────────────────────────────────────────────────
// HELPER : traiter un cashout réussi (complété ou approuvé)
// Extrait en fonction pour éviter la duplication de code
// ─────────────────────────────────────────────────────────────────
async function handleCashoutSuccess(
  supabase: any,
  payout: any,
  reference: string,
  event: string | null
) {
  const payoutUserId    = payout.user_id;
  const payoutAmount    = payout.amount;
  const payoutAmountNet = payout.amount_net ?? payout.amount;
  const reseauAffiche   = payout.reseau ?? "";
  const paysAffiche     = (payout.metadata as any)?.pays_code ?? payout.pays ?? "";

  // Mettre à jour le payout
  await supabase
    .from("nexora_payouts")
    .update({
      status:       "completed",
      moneroo_id:   reference,
      completed_at: new Date().toISOString(),
    })
    .eq("id", payout.id);

  // Mettre à jour la transaction liée
  await supabase
    .from("nexora_transactions")
    .update({
      status:       "completed",
      completed_at: new Date().toISOString(),
    })
    .eq("moneroo_id", reference);

  // NOTE : avec le nouveau fichier geniuspay-payout/index.ts corrigé,
  // le solde est déjà déduit à l'initiation du payout.
  // Ce bloc ne re-déduit PAS pour éviter une double déduction.
  // Il se contente de confirmer le statut.
  console.log(`✅ Cashout ${reference} (${event}) — payout ${payout.id} marqué complété pour ${payoutUserId}`);

  // Notification de succès
  await supabase.from("nexora_notifications").insert({
    user_id: payoutUserId,
    titre:   "✅ Transfert confirmé !",
    message: `${payoutAmountNet} FCFA envoyés vers ${paysAffiche} (${reseauAffiche}) — Réf: ${reference}`,
    type:    "success",
  });

  console.log(`🔔 Notification envoyée à ${payoutUserId}`);
}

// ─────────────────────────────────────────────────────────────────
// HELPER : réponse 200 standard
// GeniusPay attend un 200 rapide, sinon il renvoie l'événement
// ─────────────────────────────────────────────────────────────────
function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status:  200,
    headers: { "Content-Type": "application/json" },
  });
}
