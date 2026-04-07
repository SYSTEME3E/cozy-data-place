// supabase/functions/geniuspay-webhook/index.ts
// ─────────────────────────────────────────────────────────────────
// Webhook GeniusPay → reçoit les événements de paiement
// ✅ Adapté au format réponse GeniusPay v2
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

    // GeniusPay envoie { event, data: { reference, amount, ... } }
    const txData    = payload.data ?? payload;
    const reference = String(txData.reference ?? txData.id ?? txData.payment_id ?? "");

    if (!reference) {
      console.warn("Webhook sans référence, ignoré.");
      return jsonOk();
    }

    const meta      = txData.metadata ?? {};
    const userId    = meta.user_id    ?? txData.user_id    ?? null;
    const txType    = meta.type       ?? txData.type       ?? null;
    const amountRaw = Number(txData.amount) || 0;
    const frais     = txType === "recharge_transfert" ? 100 : 0;
    const amountNet = Number(meta.amount_net) || Math.max(0, amountRaw - frais);

    // ── PAIEMENT RÉUSSI ──
    if (event === "payment.success") {
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
          console.warn("Webhook sans user_id ou type, impossible de créer la transaction.");
          return jsonOk();
        }
        const { data: newTx } = await supabase
          .from("nexora_transactions")
          .insert({
            user_id: userId, type: txType, amount: amountRaw,
            frais, currency: txData.currency ?? "XOF",
            status: "completed", completed_at: new Date().toISOString(),
            moneroo_id: reference, metadata: meta,
          })
          .select().single();
        tx = newTx;
      }

      if (!tx) { console.error("Impossible de gérer la transaction."); return jsonOk(); }

      const finalUserId = tx.user_id ?? userId;
      const finalType   = tx.type    ?? txType;
      const finalMeta   = (tx.metadata as Record<string, string>) ?? meta;
      const finalFrais  = tx.frais   ?? frais;
      const finalNet    = Number(finalMeta.amount_net) || Math.max(0, (tx.amount ?? amountRaw) - finalFrais);

      // ── RECHARGE TRANSFERT ──
      if (finalType === "recharge_transfert" && finalUserId) {
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

          await supabase.from("nexora_transfert_comptes").upsert(
            { user_id: finalUserId, solde: Math.max(0, totalRecharges - totalTransferts), updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre: "💰 Recharge réussie",
          message: `${finalNet} FCFA ont été crédités sur votre compte Transfert.`,
          type: "success",
        });
        console.log(`✅ Recharge ${finalNet} FCFA créditée pour ${finalUserId}`);
      }

      // ── ABONNEMENT PREMIUM ──
      if (finalType === "abonnement_premium" && finalUserId) {
        const now = new Date();
        const dateEnd = new Date(now);
        dateEnd.setMonth(dateEnd.getMonth() + 1);

        await supabase.from("abonnements").insert({
          user_id: finalUserId, plan: "boss", montant: tx.amount,
          statut: "actif", date_debut: now.toISOString(),
          date_fin: dateEnd.toISOString(), reference_paiement: reference,
        });

        await supabase.from("nexora_users").update({
          plan: "boss", badge_premium: true,
          premium_since: now.toISOString(),
          premium_expires_at: dateEnd.toISOString(),
        }).eq("id", finalUserId);

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre: "🎉 Bienvenue Premium !",
          message: "Votre abonnement Premium est maintenant actif.",
          type: "success",
        });
        console.log(`✅ Premium activé pour ${finalUserId}`);
      }

    // ── PAIEMENT ÉCHOUÉ ──
    } else if (["payment.failed", "payment.cancelled", "payment.expired"].includes(event ?? "")) {
      await supabase.from("nexora_transactions")
        .update({ status: "failed" })
        .eq("moneroo_id", reference);
      console.log(`❌ Paiement ${reference} marqué comme échoué (event: ${event})`);
    }

    return jsonOk();
  } catch (err: any) {
    console.error("Webhook error:", err);
    return jsonOk();
  }
});

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
