// supabase/functions/geniuspay-webhook/index.ts
// ✅ FIX PRINCIPAL : suppression de amount_net dans les inserts nexora_transactions (colonne inexistante)
// ✅ FIX : Sur payout.failed → restituer le solde (déduit à l'initiation)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

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
    const userId    = meta.user_id ?? txData.user_id ?? null;
    const txType    = meta.type    ?? txData.type    ?? null;
    const amountRaw = Number(txData.amount) || 0;
    const frais     = txType === "recharge_transfert" ? 100 : 0;
    // ✅ amount_net calculé localement (pas stocké dans nexora_transactions)
    const amountNet = Math.max(0, amountRaw - frais);

    // ══════════════════════════════════
    // ① PAIEMENT RÉUSSI
    // ══════════════════════════════════
    if (event === "payment.success") {
      console.log(`🟢 PAYMENT SUCCESS: ${reference}`);

      const { data: existingTx } = await supabase
        .from("nexora_transactions").select("*").eq("moneroo_id", reference).maybeSingle();

      let tx = existingTx;

      if (tx) {
        await supabase.from("nexora_transactions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("moneroo_id", reference);
      } else {
        if (!userId || !txType) {
          console.warn("Webhook sans user_id ou type.");
          return jsonOk();
        }
        // ✅ INSERT sans amount_net
        const { data: newTx } = await supabase.from("nexora_transactions").insert({
          user_id: userId,
          type: txType,
          amount: amountRaw,
          frais,
          currency: txData.currency ?? "XOF",
          status: "completed",
          completed_at: new Date().toISOString(),
          moneroo_id: reference,
          metadata: meta,
        }).select().single();
        tx = newTx;
      }

      if (!tx) { console.error("Impossible de gérer la transaction."); return jsonOk(); }

      const finalUserId = tx.user_id ?? userId;
      const finalType   = tx.type    ?? txType;
      const finalFrais  = tx.frais   ?? frais;
      const txAmount    = tx.amount  ?? amountRaw;
      const finalNet    = Math.max(0, txAmount - finalFrais);

      // ── RECHARGE TRANSFERT ──
      if (finalType === "recharge_transfert" && finalUserId) {
        const { data: allTxs } = await supabase
          .from("nexora_transactions").select("type, amount, frais, status").eq("user_id", finalUserId);

        if (allTxs) {
          const totalRecharges  = allTxs
            .filter(t => t.type === "recharge_transfert" && t.status === "completed")
            .reduce((s, t) => s + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);
          const totalTransferts = allTxs
            .filter(t => t.type === "retrait_transfert" && t.status === "completed")
            .reduce((s, t) => s + (t.amount ?? 0), 0);
          const newSolde = Math.max(0, totalRecharges - totalTransferts);

          await supabase.from("nexora_transfert_comptes")
            .upsert({ user_id: finalUserId, solde: newSolde, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
          console.log(`💰 Solde mis à jour: ${finalUserId} → ${newSolde} FCFA`);
        }

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId, titre: "💰 Recharge réussie",
          message: `${finalNet} FCFA crédités sur votre compte Transfert.`, type: "success",
        });
        console.log(`✅ Recharge ${finalNet} FCFA pour ${finalUserId}`);
      }

      // ── ABONNEMENT PREMIUM ──
      if (finalType === "abonnement_premium" && finalUserId) {
        const now     = new Date();
        const dateEnd = new Date(now);
        dateEnd.setMonth(dateEnd.getMonth() + 1);

        await supabase.from("abonnements").insert({
          user_id: finalUserId, plan: "boss", montant: txAmount,
          statut: "actif", date_debut: now.toISOString(),
          date_fin: dateEnd.toISOString(), reference_paiement: reference,
        });

        await supabase.from("nexora_users").update({
          plan: "boss", badge_premium: true,
          premium_since: now.toISOString(),
          premium_expires_at: dateEnd.toISOString(),
        }).eq("id", finalUserId);

        await supabase.from("nexora_notifications").insert({
          user_id: finalUserId, titre: "🎉 Bienvenue Premium !",
          message: "Votre abonnement Premium est maintenant actif.", type: "success",
        });
        console.log(`✅ Premium activé pour ${finalUserId}`);
      }
    }

    // ══════════════════════════════════
    // ② PAYOUT RÉUSSI
    // ══════════════════════════════════
    else if (event === "payout.success") {
      console.log(`🟢 PAYOUT SUCCESS: ${reference}`);

      const { data: payout } = await supabase
        .from("nexora_payouts").select("*").eq("moneroo_id", reference).maybeSingle();

      if (!payout) { console.warn(`Payout ${reference} introuvable`); return jsonOk(); }

      await supabase.from("nexora_payouts")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", payout.id);

      await supabase.from("nexora_transactions")
        .update({ status: "completed", completed_at: new Date().toISOString() }).eq("moneroo_id", reference);

      // Note: le solde a déjà été déduit à l'initiation du payout — rien à faire ici
      console.log(`✅ Payout ${reference} complété pour ${payout.user_id}`);

      await supabase.from("nexora_notifications").insert({
        user_id: payout.user_id, titre: "✅ Transfert réussi",
        message: `${payout.amount_net} FCFA envoyés vers ${payout.pays} (${payout.reseau}) — Réf: ${reference}`,
        type: "success",
      });
    }

    // ══════════════════════════════════
    // ③ PAYOUT ÉCHOUÉ → RESTITUER LE SOLDE
    // ══════════════════════════════════
    else if (["payout.failed", "payout.cancelled"].includes(event ?? "")) {
      console.log(`🔴 PAYOUT FAILED: ${reference}`);

      const { data: payout } = await supabase
        .from("nexora_payouts").select("*").eq("moneroo_id", reference).maybeSingle();

      if (payout) {
        await supabase.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);
        await supabase.from("nexora_transactions").update({ status: "failed" }).eq("moneroo_id", reference);

        // ✅ Restituer le solde (déduit à l'initiation)
        const { data: compteEchec } = await supabase
          .from("nexora_transfert_comptes").select("solde").eq("user_id", payout.user_id).maybeSingle();
        const soldeActuel = compteEchec?.solde ?? 0;
        const newSolde    = soldeActuel + payout.amount;
        await supabase.from("nexora_transfert_comptes")
          .upsert({ user_id: payout.user_id, solde: newSolde, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
        console.log(`💰 Solde restitué: ${payout.user_id} → ${newSolde} FCFA`);

        await supabase.from("nexora_notifications").insert({
          user_id: payout.user_id, titre: "⚠️ Transfert échoué",
          message: `Le transfert de ${payout.amount} FCFA vers ${payout.pays} a échoué. Votre solde a été restitué.`,
          type: "error",
        });
        console.log(`❌ Payout ${reference} échoué — Solde restitué pour ${payout.user_id}`);
      }
    }

    // ══════════════════════════════════
    // ④ PAIEMENT ÉCHOUÉ
    // ══════════════════════════════════
    else if (["payment.failed", "payment.cancelled", "payment.expired"].includes(event ?? "")) {
      console.log(`🔴 PAYMENT FAILED: ${reference}`);
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
    status: 200, headers: { "Content-Type": "application/json" },
  });
}
