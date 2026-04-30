// supabase/functions/kkiapay-payment/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { kkiapay } from "https://esm.sh/@kkiapay-org/nodejs-sdk@latest";

const KKIAPAY_PUBLIC_KEY  = Deno.env.get("KKIAPAY_PUBLIC_KEY")  ?? "";
const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";
const KKIAPAY_SECRET_KEY  = Deno.env.get("KKIAPAY_SECRET_KEY")  ?? "";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
const err = (msg: string, status = 400) =>
  json({ success: false, error: msg }, status);

// ── Retry : vérifie la transaction jusqu'à 5 fois ─────────────────
async function verifyKkiapay(transactionId: string) {
  const k = kkiapay({
    privatekey: KKIAPAY_PRIVATE_KEY,
    publickey:  KKIAPAY_PUBLIC_KEY,
    secretkey:  KKIAPAY_SECRET_KEY,
  });

  const delays = [0, 2000, 3000, 4000, 5000];

  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]));
    try {
      console.log(`📥 Tentative ${i + 1}/5 — verify ${transactionId}`);
      const tx: any = await k.verify(transactionId);
      console.log(`📥 Réponse KKiaPay :`, JSON.stringify(tx));

      const s = tx?.status ?? "";
      const isOk = ["SUCCESS", "COMPLETE", "TRANSACTION_APPROVED", "APPROVED"].includes(s);
      if (isOk) return { ok: true, status: s, amount: Number(tx?.amount ?? 0), raw: tx };

      console.log(`⏳ Statut "${s}" — on retente...`);
    } catch (e: any) {
      console.warn(`⚠️ Tentative ${i + 1}/5 erreur :`, e?.message);
    }
  }
  return { ok: false, status: "UNKNOWN", amount: 0, raw: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!KKIAPAY_PRIVATE_KEY || !KKIAPAY_SECRET_KEY)
      return err("Clés KKiaPay manquantes dans Supabase Secrets.", 500);

    let body: any;
    try { body = await req.json(); } catch { return err("Body JSON invalide"); }
    console.log("📦 kkiapay-payment — Body :", JSON.stringify(body));

    const { transaction_id, type, amount, amount_net, currency = "XOF",
            user_id, user_email, user_name, duree_mois, metadata = {} } = body;

    const missing = [
      !transaction_id && "transaction_id", !user_id && "user_id",
      !type && "type", !amount && "amount",
    ].filter(Boolean) as string[];
    if (missing.length) return err(`Paramètres manquants : ${missing.join(", ")}`);

    const verify = await verifyKkiapay(transaction_id);
    if (!verify.ok) return err(`Transaction KKiaPay invalide (statut : ${verify.status})`);
    if (verify.amount > 0 && Math.abs(verify.amount - amount) > 10)
      return err(`Montant incorrect (attendu : ${amount} XOF, reçu : ${verify.amount} XOF)`);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: existing } = await sb.from("nexora_transactions").select("id")
      .eq("moneroo_id", transaction_id).maybeSingle();
    if (existing) return json({ success: true, payment_id: transaction_id, already_processed: true });

    const FRAIS_RECHARGE = 100;
    const frais     = type === "recharge_transfert" ? FRAIS_RECHARGE : 0;
    const netAmount = amount_net ?? Math.max(0, amount - frais);

    await sb.from("nexora_transactions").insert({
      user_id, type, amount, amount_net: netAmount, frais, currency,
      status: "completed", completed_at: new Date().toISOString(),
      moneroo_id: transaction_id,
      metadata: { ...metadata, user_id, type, amount_net: String(netAmount), source: "kkiapay" },
    });

    if (type === "recharge_transfert") {
      await crediterSoldeTransfert(sb, user_id);
      await sb.from("nexora_notifications").insert({
        user_id, titre: "💰 Recharge réussie",
        message: `${netAmount.toLocaleString("fr-FR")} FCFA crédités sur votre compte Transfert.`,
        type: "success", lu: false,
      });
    }
    else if (type === "abonnement_premium") {
      const nbMois  = Number(duree_mois ?? metadata.duree_mois ?? 1);
      const now     = new Date();
      const dateFin = new Date(now);
      dateFin.setMonth(dateFin.getMonth() + nbMois);

      const { data: aboExist } = await sb.from("nexora_abonnements").select("id")
        .eq("transaction_id", transaction_id).maybeSingle();
      if (!aboExist) {
        await sb.from("nexora_abonnements").update({ statut: "expire" }).eq("user_id", user_id).eq("statut", "actif");
        await sb.from("nexora_abonnements").insert({
          user_id, plan: "boss", duree_mois: nbMois, montant_xof: amount,
          transaction_id, gateway: "kkiapay", statut: "actif",
          date_debut: now.toISOString(), date_fin: dateFin.toISOString(),
        });
        await sb.from("nexora_users").update({ plan: "boss", badge_premium: true, updated_at: now.toISOString() }).eq("id", user_id);
        await sb.from("nexora_notifications").insert({
          user_id, titre: "🎉 Abonnement Premium activé !",
          message: `Abonnement ${nbMois} mois actif. Expire le ${dateFin.toLocaleDateString("fr-FR")}.`,
          type: "success", lu: false,
        });
      }
    }
    else if (type === "vente_digitale") {
      const commandeId   = metadata.commande_id    ?? null;
      const sellerUserId = metadata.seller_user_id ?? null;
      const montantBrut  = netAmount > 0 ? netAmount : amount;
      const commission   = Math.round(montantBrut * 0.06);
      const montantVendeur = Math.max(0, montantBrut - commission);
      if (commandeId) await sb.from("commandes" as any).update({ statut_paiement: "paye", statut: "confirmee", kkiapay_id: transaction_id, paid_at: new Date().toISOString() }).eq("id", commandeId);
      if (sellerUserId && montantVendeur > 0) await sb.from("nexora_notifications" as any).insert({ user_id: sellerUserId, titre: "💰 Vente digitale confirmée !", message: `${montantVendeur.toLocaleString("fr-FR")} FCFA crédités pour commande ${commandeId ?? "—"}.`, type: "success", lu: false });
    }
    else if (type === "vente_physique") {
      const commandeId   = metadata.commande_id   ?? null;
      const sellerUserId = metadata.seller_user_id ?? null;
      if (commandeId) await sb.from("commandes" as any).update({ statut_paiement: "paye", statut: "confirmee", kkiapay_id: transaction_id, paid_at: new Date().toISOString() }).eq("id", commandeId);
      if (sellerUserId) await sb.from("nexora_notifications" as any).insert({ user_id: sellerUserId, titre: "📦 Commande payée !", message: `Commande ${amount.toLocaleString("fr-FR")} FCFA réglée (réf: ${transaction_id}).`, type: "success", lu: false });
    }

    return json({ success: true, payment_id: transaction_id, message: "Paiement vérifié et traité avec succès" });
  } catch (e: any) {
    console.error("💥 Exception :", e?.message, e?.stack);
    return err(e?.message ?? "Erreur interne du serveur", 500);
  }
});

async function crediterSoldeTransfert(sb: any, userId: string) {
  const { data: allTxs } = await sb.from("nexora_transactions").select("type, amount, frais, status").eq("user_id", userId);
  if (!allTxs) return;
  const totalRecharges = allTxs.filter((t: any) => ["topup", "recharge_transfert"].includes(t.type) && t.status === "completed").reduce((s: number, t: any) => s + Math.max(0, (t.amount ?? 0) - (t.frais ?? 100)), 0);
  const totalRetraits  = allTxs.filter((t: any) => t.type === "retrait_transfert" && t.status === "completed").reduce((s: number, t: any) => s + (t.amount ?? 0), 0);
  const newSolde = Math.max(0, totalRecharges - totalRetraits);
  await sb.from("nexora_transfert_comptes").upsert({ user_id: userId, solde: newSolde, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
  console.log(`💰 Solde mis à jour — user: ${userId} | solde: ${newSolde} FCFA`);
}
