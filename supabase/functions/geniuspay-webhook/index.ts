// supabase/functions/geniuspay-webhook/index.ts
// ─────────────────────────────────────────────────────────────────
// Webhook GeniusPay → reçoit les événements de paiement et payout
// ✅ Gère payment.success, payment.failed
// ✅ Gère payout.success, payout.failed
// ✅ Différencie subscription / product / topup
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

    const txData    = payload.data ?? payload;
    const reference = String(txData.reference ?? txData.id ?? txData.payment_id ?? "");

    if (!reference) {
      console.warn("Webhook sans référence, ignoré.");
      return jsonOk();
    }

    const meta      = txData.metadata ?? {};
    const userId    = meta.user_id    ?? txData.user_id ?? null;

    // ─── type_transaction : nouvelle clé normalisée ───────────────
    // On préfère meta.type_transaction (nouveau), avec fallback sur meta.type (legacy)
    const txType: string = meta.type_transaction ?? meta.type ?? txData.type ?? "";

    const amountRaw = Number(txData.amount) || 0;
    const frais     = txType === "topup" ? 100 : 0;
    const amountNet = Number(meta.amount_net) || Math.max(0, amountRaw - frais);

    // ══════════════════════════════════════════════════════════════
    // ① PAIEMENT RÉUSSI (payment.success)
    // ══════════════════════════════════════════════════════════════
    if (event === "payment.success") {
      console.log(`🟢 PAYMENT SUCCESS: ${reference} | type: ${txType}`);

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
          console.warn("Webhook sans user_id ou type_transaction, impossible de créer la transaction.");
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
        console.error("Impossible de gérer la transaction.");
        return jsonOk();
      }

      const finalUserId = tx.user_id ?? userId;
      const finalType   = (tx.metadata as any)?.type_transaction ?? tx.type ?? txType;
      const finalMeta   = (tx.metadata as Record<string, string>) ?? meta;
      const finalFrais  = tx.frais ?? frais;
      const finalNet    = Number(finalMeta.amount_net) || Math.max(0, (tx.amount ?? amountRaw) - finalFrais);

      // ── TOPUP (rechargement de solde) ──────────────────────────
      if (finalType === "topup" && finalUserId) {
        const { data: allTxs } = await supabase
          .from("nexora_transactions")
          .select("type, amount, frais, status")
          .eq("user_id", finalUserId);

        if (allTxs) {
          const totalRecharges = allTxs
            .filter(t => (t.type === "topup" || t.type === "recharge_transfert") && t.status === "completed")
            .reduce((sum, t) => sum + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);
          const totalTransferts = allTxs
            .filter(t => (t.type === "retrait_transfert") && t.status === "completed")
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

      // ── SUBSCRIPTION (abonnement premium) ─────────────────────
      else if (finalType === "subscription" && finalUserId) {
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
          plan:                "boss",
          badge_premium:       true,
          premium_since:       now.toISOString(),
          premium_expires_at:  dateEnd.toISOString(),
        }).eq("id", finalUserId);

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "🎉 Bienvenue Premium !",
          message: "Votre abonnement Premium est maintenant actif.",
          type:    "success",
        });
        console.log(`✅ Premium activé pour ${finalUserId}`);
      }

      // ── PRODUCT (achat produit ou formation) ───────────────────
      else if (finalType === "product" && finalUserId) {
        const formationId = finalMeta.formation_id ?? null;
        const productId   = finalMeta.product_id   ?? null;
        const affiliateId = finalMeta.affiliate_id ?? null;

        // Formation
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
            message: `Votre achat est confirmé. Accédez à votre formation dès maintenant.`,
            type:    "success",
          });
          console.log(`✅ Formation ${formationId} confirmée pour ${finalUserId}`);
        }

        // Produit boutique
        if (productId) {
          // Marquer la commande associée comme payée si elle existe
          await supabase
            .from("commandes")
            .update({ statut: "payé", payment_reference: reference })
            .eq("user_id", finalUserId)
            .eq("product_id", productId)
            .eq("statut", "pending");

          await supabase.from("nexora_notifications").insert({
            user_id: finalUserId,
            titre:   "🛍️ Achat confirmé !",
            message: `Votre paiement a été reçu. Commande en cours de traitement.`,
            type:    "success",
          });
          console.log(`✅ Produit ${productId} confirmé pour ${finalUserId}`);
        }

        // Note : la commission affilié est gérée côté frontend après paiement
        // ou peut être ajoutée ici si besoin via distributeFormationCommissions
      }

      // Fallback legacy : anciens types "abonnement_premium" et "recharge_transfert"
      else if (finalType === "abonnement_premium" && finalUserId) {
        // Compatibilité avec les anciennes transactions déjà en BDD
        const now     = new Date();
        const dateEnd = new Date(now);
        dateEnd.setMonth(dateEnd.getMonth() + 1);
        await supabase.from("abonnements").insert({
          user_id: finalUserId, plan: "boss", montant: tx.amount,
          statut: "actif", date_debut: now.toISOString(), date_fin: dateEnd.toISOString(),
          reference_paiement: reference,
        });
        await supabase.from("nexora_users").update({
          plan: "boss", badge_premium: true,
          premium_since: now.toISOString(), premium_expires_at: dateEnd.toISOString(),
        }).eq("id", finalUserId);
        console.log(`✅ (legacy) Premium activé pour ${finalUserId}`);
      }

      else if (finalType === "recharge_transfert" && finalUserId) {
        // Compatibilité legacy rechargement
        const { data: allTxs } = await supabase
          .from("nexora_transactions").select("type, amount, frais, status").eq("user_id", finalUserId);
        if (allTxs) {
          const totalRecharges = allTxs
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
          console.log(`💰 (legacy) Solde mis à jour: ${finalUserId} → ${newSolde} FCFA`);
        }
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ② PAYOUT RÉUSSI (payout.success)
    // ══════════════════════════════════════════════════════════════
    else if (event === "payout.success") {
      console.log(`🟢 PAYOUT SUCCESS: ${reference}`);

      const { data: payout } = await supabase
        .from("nexora_payouts").select("*").eq("moneroo_id", reference).maybeSingle();

      if (!payout) { console.warn(`Payout ${reference} introuvable`); return jsonOk(); }

      const payoutUserId   = payout.user_id;
      const payoutAmount   = payout.amount;
      const payoutAmountNet = payout.amount_net;

      await supabase.from("nexora_payouts")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", payout.id);

      await supabase.from("nexora_transactions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("moneroo_id", reference);

      const { data: compte } = await supabase
        .from("nexora_transfert_comptes").select("solde").eq("user_id", payoutUserId).maybeSingle();

      const newSolde = Math.max(0, (compte?.solde ?? 0) - payoutAmount);
      await supabase.from("nexora_transfert_comptes").upsert(
        { user_id: payoutUserId, solde: newSolde, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

      const reseau = payout.reseau ?? "";
      const pays   = (payout.metadata as any)?.pays_code ?? payout.pays ?? "";

      await supabase.from("nexora_notifications").insert({
        user_id: payoutUserId,
        titre:   "✅ Transfert réussi",
        message: `${payoutAmountNet} FCFA envoyés vers ${pays} (${reseau}) — Réf: ${reference}`,
        type:    "success",
      });
      console.log(`✅ Payout ${reference} complété pour ${payoutUserId}`);
    }

    // ══════════════════════════════════════════════════════════════
    // ③ PAYOUT ÉCHOUÉ
    // ══════════════════════════════════════════════════════════════
    else if (["payout.failed", "payout.cancelled"].includes(event ?? "")) {
      console.log(`🔴 PAYOUT FAILED: ${reference}`);
      const { data: payout } = await supabase
        .from("nexora_payouts").select("*").eq("moneroo_id", reference).maybeSingle();

      if (payout) {
        await supabase.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);
        await supabase.from("nexora_transactions").update({ status: "failed" }).eq("moneroo_id", reference);
        await supabase.from("nexora_notifications").insert({
          user_id: payout.user_id,
          titre:   "⚠️ Transfert échoué",
          message: `Le transfert de ${payout.amount} FCFA a échoué. Votre solde n'a pas été affecté. Réf: ${reference}`,
          type:    "error",
        });
      }
    }

    // ══════════════════════════════════════════════════════════════
    // ④ PAIEMENT ÉCHOUÉ
    // ══════════════════════════════════════════════════════════════
    else if (["payment.failed", "payment.cancelled", "payment.expired"].includes(event ?? "")) {
      console.log(`🔴 PAYMENT FAILED: ${reference} (event: ${event})`);
      await supabase.from("nexora_transactions").update({ status: "failed" }).eq("moneroo_id", reference);
    }

    return jsonOk();
  } catch (err: any) {
    console.error("Webhook error:", err);
    return jsonOk();
  }
});

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
