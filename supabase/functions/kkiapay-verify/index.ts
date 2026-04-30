// supabase/functions/kkiapay-verify/index.ts
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
const err = (msg: string, status = 400) => json({ success: false, error: msg }, status);

async function verifyKkiapay(transactionId: string) {
  const k = kkiapay({ privatekey: KKIAPAY_PRIVATE_KEY, publickey: KKIAPAY_PUBLIC_KEY, secretkey: KKIAPAY_SECRET_KEY });
  const delays = [0, 2000, 3000, 4000, 5000];
  for (let i = 0; i < delays.length; i++) {
    if (delays[i] > 0) await new Promise(r => setTimeout(r, delays[i]));
    try {
      console.log(`📥 Tentative ${i + 1}/5 — verify ${transactionId}`);
      const tx: any = await k.verify(transactionId);
      console.log(`📥 Réponse :`, JSON.stringify(tx));
      const s = tx?.status ?? "";
      if (["SUCCESS", "COMPLETE", "TRANSACTION_APPROVED", "APPROVED"].includes(s))
        return { ok: true, status: s, amount: Number(tx?.amount ?? 0), raw: tx };
      console.log(`⏳ Statut "${s}" — on retente...`);
    } catch (e: any) { console.warn(`⚠️ Tentative ${i + 1}/5 :`, e?.message); }
  }
  return { ok: false, status: "UNKNOWN", amount: 0, raw: null };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  try {
    if (!KKIAPAY_PRIVATE_KEY || !KKIAPAY_SECRET_KEY) return err("Clés KKiaPay manquantes.", 500);
    let body: any;
    try { body = await req.json(); } catch { return err("Body JSON invalide"); }
    console.log("📦 kkiapay-verify — Body :", JSON.stringify(body));

    const { transactionId, type = "paylink", reference, paylink_id, user_id, duree_mois, montant_xof, commande_id, seller_user_id } = body;
    if (!transactionId) return err("transactionId manquant");

    const verify = await verifyKkiapay(transactionId);
    if (!verify.ok) return err(`Transaction KKiaPay invalide (statut : ${verify.status})`);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (type === "paylink" && reference) {
      await sb.from("nexora_paylink_payments").update({ statut: "paye", paid_at: new Date().toISOString(), kkiapay_transaction_id: transactionId }).eq("reference", reference);
    }
    else if (type === "abonnement_premium") {
      if (!user_id || !duree_mois) return err("user_id et duree_mois requis");
      const { data: existing } = await sb.from("nexora_abonnements").select("id").eq("transaction_id", transactionId).maybeSingle();
      if (existing) return json({ success: true, already_processed: true });
      const now = new Date();
      const dateFin = new Date(now);
      dateFin.setMonth(dateFin.getMonth() + Number(duree_mois));
      await sb.from("nexora_abonnements").update({ statut: "expire" }).eq("user_id", user_id).eq("statut", "actif");
      await sb.from("nexora_abonnements").insert({ user_id, plan: "boss", duree_mois: Number(duree_mois), montant_xof: montant_xof ?? 0, transaction_id: transactionId, gateway: "kkiapay", statut: "actif", date_debut: now.toISOString(), date_fin: dateFin.toISOString() });
      await sb.from("nexora_users").update({ plan: "boss", badge_premium: true, updated_at: now.toISOString() }).eq("id", user_id);
      await sb.from("nexora_notifications").insert({ user_id, titre: "🎉 Abonnement Premium activé !", message: `Abonnement ${duree_mois} mois actif. Expire le ${dateFin.toLocaleDateString("fr-FR")}.`, type: "success", lu: false });
    }
    else if (type === "vente_digitale") {
      if (commande_id) await sb.from("commandes" as any).update({ statut_paiement: "paye", statut: "confirmee", kkiapay_id: transactionId, paid_at: new Date().toISOString() }).eq("id", commande_id);
      if (seller_user_id) {
        const mv = Math.max(0, (verify.amount > 0 ? verify.amount : (montant_xof ?? 0)) * 0.94);
        await sb.from("nexora_notifications" as any).insert({ user_id: seller_user_id, titre: "💰 Vente confirmée !", message: `${mv.toLocaleString("fr-FR")} FCFA crédités pour commande ${commande_id ?? "—"}.`, type: "success", lu: false });
      }
    }
    return json({ success: true, transactionId, status: verify.status, amount: verify.amount });
  } catch (e: any) {
    console.error("💥 Exception :", e?.message);
    return err(e?.message ?? "Erreur interne", 500);
  }
});
