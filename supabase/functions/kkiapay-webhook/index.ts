// supabase/functions/kkiapay-webhook/index.ts
// ═══════════════════════════════════════════════════════════════════
//  Edge Function : Webhook KKiaPay
//  Reçoit les notifications asynchrones de KKiaPay
//
//  Événements gérés :
//    • transaction.success / TRANSACTION_APPROVED → paiement réussi
//    • transaction.failed  / TRANSACTION_FAILED   → paiement échoué
//    • transfer.success    / TRANSFER_APPROVED    → cashout réussi
//    • transfer.failed     / TRANSFER_FAILED      → cashout échoué
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";

Deno.serve(async (req) => {
  if (req.method !== "POST")
    return new Response("Method not allowed", { status: 405 });

  try {
    const rawBody = await req.text();

    // ── Vérification signature HMAC (optionnelle mais recommandée) ─
    const signature = req.headers.get("x-kkiapay-signature");
    if (KKIAPAY_PRIVATE_KEY && signature) {
      try {
        const encoder = new TextEncoder();
        const keyData = encoder.encode(KKIAPAY_PRIVATE_KEY);
        const msgData = encoder.encode(rawBody);
        const cryptoKey = await crypto.subtle.importKey(
          "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
        );
        const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
        const expected  = Array.from(new Uint8Array(sigBuffer))
          .map(b => b.toString(16).padStart(2, "0")).join("");

        if (signature !== expected) {
          console.warn("⚠️ Signature KKiaPay invalide — webhook rejeté");
          return new Response(JSON.stringify({ received: false, error: "Signature invalide" }), { status: 401 });
        }
      } catch (sigErr) {
        console.warn("⚠️ Impossible de vérifier la signature :", sigErr);
      }
    }

    let payload: any;
    try { payload = JSON.parse(rawBody); }
    catch { console.error("❌ Body JSON invalide"); return jsonOk(); }

    const event = payload.type ?? payload.event ?? payload.eventType ?? "";
    console.log("📩 Webhook KKiaPay — event :", event);
    console.log("📩 Payload :", JSON.stringify(payload));

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const txData   = payload.data ?? payload;
    const reference = String(txData.transactionId ?? txData.id ?? txData.reference ?? "");

    if (!reference) {
      console.warn("⚠️ Webhook sans référence — ignoré.");
      return jsonOk();
    }

    // Metadata custom envoyée dans le champ "data" du widget
    let meta: Record<string, any> = {};
    try {
      if (txData.data) meta = typeof txData.data === "string" ? JSON.parse(txData.data) : txData.data;
    } catch { meta = {}; }

    const userId    = meta.user_id    ?? txData.userId ?? null;
    const txType    = meta.type       ?? txData.reason  ?? "";
    const amountRaw = Number(txData.amount ?? txData.requestAmount ?? 0);
    const frais     = txType === "recharge_transfert" ? 100 : 0;
    const amountNet = Number(meta.amount_net) || Math.max(0, amountRaw - frais);

    console.log(`📌 Ref: ${reference} | Event: ${event} | Type: ${txType} | User: ${userId}`);

    // ════════════════════════════════════════════════════════════════
    // PAIEMENT RÉUSSI
    // ════════════════════════════════════════════════════════════════
    if (event === "transaction.success" || event === "TRANSACTION_APPROVED") {
      console.log(`🟢 TRANSACTION SUCCESS: ${reference}`);

      // Idempotence
      const { data: existingTx } = await sb
        .from("nexora_transactions").select("*")
        .eq("moneroo_id", reference).maybeSingle();

      let tx = existingTx;

      if (tx) {
        await sb.from("nexora_transactions")
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("moneroo_id", reference);
      } else {
        if (!userId || !txType) {
          console.warn("⚠️ Webhook sans user_id ou type — impossible de créer la transaction.");
          return jsonOk();
        }
        const { data: newTx } = await sb.from("nexora_transactions").insert({
          user_id:      userId,
          type:         txType,
          amount:       amountRaw,
          amount_net:   amountNet,
          frais, currency: "XOF",
          status:       "completed",
          completed_at: new Date().toISOString(),
          moneroo_id:   reference,
          metadata:     { ...meta, source: "kkiapay_webhook" },
        }).select().single();
        tx = newTx;
      }

      if (!tx) { console.error("❌ Impossible de gérer la transaction."); return jsonOk(); }

      const finalUserId = tx.user_id ?? userId;
      const finalType   = (tx.metadata as any)?.type ?? tx.type ?? txType;
      const finalNet    = Number((tx.metadata as any)?.amount_net) || Math.max(0, (tx.amount ?? amountRaw) - (tx.frais ?? frais));

      // ── Recharge Transfert ─────────────────────────────────────
      if (["recharge_transfert", "topup"].includes(finalType) && finalUserId) {
        const { data: allTxs } = await sb
          .from("nexora_transactions")
          .select("type, amount, frais, status")
          .eq("user_id", finalUserId);

        if (allTxs) {
          const totalRecharges = allTxs
            .filter((t: any) => ["topup", "recharge_transfert"].includes(t.type) && t.status === "completed")
            .reduce((s: number, t: any) => s + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);
          const totalRetraits = allTxs
            .filter((t: any) => t.type === "retrait_transfert" && t.status === "completed")
            .reduce((s: number, t: any) => s + (t.amount ?? 0), 0);

          await sb.from("nexora_transfert_comptes").upsert(
            { user_id: finalUserId, solde: Math.max(0, totalRecharges - totalRetraits), updated_at: new Date().toISOString() },
            { onConflict: "user_id" }
          );
        }

        await sb.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "💰 Recharge réussie",
          message: `${finalNet.toLocaleString("fr-FR")} FCFA ont été crédités sur votre compte Transfert.`,
          type:    "success", lu: false,
        });
      }

      // ── Abonnement Premium ─────────────────────────────────────
      else if (["abonnement_premium", "subscription"].includes(finalType) && finalUserId) {
        const now     = new Date();
        const dateFin = new Date(now);
        dateFin.setMonth(dateFin.getMonth() + 1);

        await sb.from("nexora_abonnements").insert({
          user_id:            finalUserId,
          plan:               "boss",
          montant_xof:        tx.amount,
          statut:             "actif",
          date_debut:         now.toISOString(),
          date_fin:           dateFin.toISOString(),
          transaction_id:     reference,
          gateway:            "kkiapay",
        });

        await sb.from("nexora_users").update({
          plan:          "boss",
          badge_premium: true,
          updated_at:    now.toISOString(),
        }).eq("id", finalUserId);

        await sb.from("nexora_notifications").insert({
          user_id: finalUserId,
          titre:   "🎉 Abonnement Premium activé !",
          message: "Votre abonnement Premium est maintenant actif.",
          type:    "success", lu: false,
        });
      }

      // ── Vente digitale ─────────────────────────────────────────
      else if (finalType === "vente_digitale") {
        const commandeId    = meta.commande_id    ?? null;
        const sellerUserId  = meta.seller_user_id ?? null;
        const montantBrut   = finalNet > 0 ? finalNet : amountRaw;
        const commission    = Math.round(montantBrut * 0.06);
        const montantVendeur = Math.max(0, montantBrut - commission);

        if (commandeId) {
          await sb.from("commandes" as any).update({
            statut_paiement: "paye", statut: "confirmee",
            kkiapay_id: reference, paid_at: new Date().toISOString(),
          }).eq("id", commandeId);
        }

        if (sellerUserId && montantVendeur > 0) {
          await sb.from("nexora_notifications" as any).insert({
            user_id: sellerUserId,
            titre:   "💰 Vente digitale confirmée !",
            message: `${montantVendeur.toLocaleString("fr-FR")} FCFA crédités pour la commande ${commandeId ?? "—"}.`,
            type:    "success", lu: false,
          });
        }
      }
    }

    // ════════════════════════════════════════════════════════════════
    // CASHOUT RÉUSSI
    // ════════════════════════════════════════════════════════════════
    else if (event === "transfer.success" || event === "TRANSFER_APPROVED") {
      console.log(`🟢 TRANSFER SUCCESS: ${reference}`);

      const { data: payout } = await sb
        .from("nexora_payouts").select("*")
        .eq("moneroo_id", reference).maybeSingle();

      if (payout) {
        await sb.from("nexora_payouts").update({
          status: "completed", completed_at: new Date().toISOString(),
        }).eq("id", payout.id);

        await sb.from("nexora_transactions").update({
          status: "completed", completed_at: new Date().toISOString(),
        }).eq("moneroo_id", reference);

        await sb.from("nexora_notifications").insert({
          user_id: payout.user_id,
          titre:   "✅ Transfert confirmé !",
          message: `${(payout.amount_net ?? payout.amount).toLocaleString("fr-FR")} FCFA envoyés vers ${payout.pays ?? ""} (${payout.reseau ?? ""}) — Réf: ${reference}`,
          type:    "success", lu: false,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // CASHOUT ÉCHOUÉ
    // ════════════════════════════════════════════════════════════════
    else if (event === "transfer.failed" || event === "TRANSFER_FAILED") {
      console.log(`🔴 TRANSFER FAILED: ${reference}`);

      const { data: payout } = await sb
        .from("nexora_payouts").select("*")
        .eq("moneroo_id", reference).maybeSingle();

      if (payout) {
        await sb.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);
        await sb.from("nexora_transactions").update({ status: "failed" }).eq("moneroo_id", reference);

        const { data: compte } = await sb
          .from("nexora_transfert_comptes").select("solde")
          .eq("user_id", payout.user_id).maybeSingle();

        const soldeRembourse = (compte?.solde ?? 0) + payout.amount;
        await sb.from("nexora_transfert_comptes").upsert(
          { user_id: payout.user_id, solde: soldeRembourse, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

        await sb.from("nexora_notifications").insert({
          user_id: payout.user_id,
          titre:   "⚠️ Transfert échoué — Solde remboursé",
          message: `Votre transfert de ${payout.amount.toLocaleString("fr-FR")} FCFA a échoué. Solde remboursé. Réf: ${reference}`,
          type:    "error", lu: false,
        });
      }
    }

    // ════════════════════════════════════════════════════════════════
    // PAIEMENT ÉCHOUÉ
    // ════════════════════════════════════════════════════════════════
    else if (event === "transaction.failed" || event === "TRANSACTION_FAILED") {
      console.log(`🔴 TRANSACTION FAILED: ${reference}`);
      await sb.from("nexora_transactions").update({ status: "failed" }).eq("moneroo_id", reference);
    }

    else {
      console.warn(`⚠️ Événement non géré : "${event}"`);
    }

    return jsonOk();

  } catch (e: any) {
    console.error("💥 Webhook error :", e?.message, e?.stack);
    return jsonOk(); // Toujours 200 pour éviter les réenvois KKiaPay
  }
});

function jsonOk() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
