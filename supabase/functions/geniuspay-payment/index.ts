import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// GeniusPay webhook handler
// Receives payment status updates from GeniusPay

Deno.serve(async (req) => {
  // Webhooks are POST only
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const event = req.headers.get("X-Webhook-Event");
    const payload = await req.json();

    console.log("Webhook received:", event, JSON.stringify(payload));

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const txData = payload.data;
    if (!txData?.reference) {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const reference = txData.reference;

    if (event === "payment.success") {
      // Update transaction status
      const { data: tx } = await supabase
        .from("nexora_transactions")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("moneroo_id", reference)
        .select()
        .single();

      if (tx) {
        const meta = (tx.metadata as Record<string, string>) || {};
        const nexoraType = tx.type || meta.nexora_type;
        const userId = tx.user_id;

        // Handle subscription activation
        if (nexoraType === "abonnement_premium" && userId) {
          const now = new Date();
          const dateEnd = new Date(now);
          dateEnd.setMonth(dateEnd.getMonth() + 1);

          await supabase.from("abonnements").insert({
            user_id: userId,
            plan: "premium",
            montant: tx.amount,
            statut: "actif",
            date_debut: now.toISOString(),
            date_fin: dateEnd.toISOString(),
            reference_paiement: reference,
          });

          // Update user plan
          await supabase
            .from("nexora_users")
            .update({
              plan: "premium",
              badge_premium: true,
              premium_since: now.toISOString(),
              premium_expires_at: dateEnd.toISOString(),
            })
            .eq("id", userId);

          // Send notification
          await supabase.from("nexora_notifications").insert({
            user_id: userId,
            titre: "🎉 Bienvenue Premium !",
            message: "Votre abonnement Premium est maintenant actif. Profitez de toutes les fonctionnalités !",
            type: "success",
          });
        }

        // Handle transfer recharge
        if (nexoraType === "recharge_transfert" && userId) {
          // ✅ FIX : utiliser frais pour calculer le montant net réellement crédité
          const frais     = tx.frais ?? 100; // 100 FCFA de frais fixes
          const amountNet = Number(meta.amount_net) || Math.max(0, (tx.amount ?? 0) - frais);

          // Upsert transfer account balance
          const { data: existing } = await supabase
            .from("nexora_transfert_comptes")
            .select("solde")
            .eq("user_id", userId)
            .single();

          if (existing) {
            await supabase
              .from("nexora_transfert_comptes")
              .update({ solde: existing.solde + amountNet })
              .eq("user_id", userId);
          } else {
            await supabase
              .from("nexora_transfert_comptes")
              .insert({ user_id: userId, solde: amountNet });
          }

          await supabase.from("nexora_notifications").insert({
            user_id: userId,
            titre: "💰 Recharge réussie",
            message: `${amountNet} FCFA ajoutés à votre compte Transfert.`,
            type: "success",
          });
        }
      }
    } else if (event === "payment.failed" || event === "payment.cancelled") {
      await supabase
        .from("nexora_transactions")
        .update({ status: "failed" })
        .eq("moneroo_id", reference);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
