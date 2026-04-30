// supabase/functions/kkiapay-paylink-payment/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { kkiapay } from "https://esm.sh/@kkiapay-org/nodejs-sdk@latest";

const KKIAPAY_PUBLIC_KEY  = Deno.env.get("KKIAPAY_PUBLIC_KEY")  ?? "";
const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";
const KKIAPAY_SECRET_KEY  = Deno.env.get("KKIAPAY_SECRET_KEY")  ?? "";
const COMMISSION_NEXORA   = 0.05;

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
    console.log("📦 kkiapay-paylink-payment — Body :", JSON.stringify(body));

    const { transaction_id, paylink_id, reference, amount, customer, metadata = {} } = body;
    const missing = [!transaction_id && "transaction_id", !paylink_id && "paylink_id", !reference && "reference"].filter(Boolean) as string[];
    if (missing.length) return err(`Paramètres manquants : ${missing.join(", ")}`);

    const verify = await verifyKkiapay(transaction_id);
    if (!verify.ok) return err(`Transaction KKiaPay invalide (statut : ${verify.status})`);

    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: paylink } = await sb.from("nexora_paylinks").select("id, user_id, nom_produit, montant").eq("id", paylink_id).maybeSingle();

    await sb.from("nexora_paylink_payments").update({ statut: "paye", paid_at: new Date().toISOString(), kkiapay_transaction_id: transaction_id }).eq("reference", reference);

    if (paylink?.user_id) {
      const montantBrut    = verify.amount > 0 ? verify.amount : (amount ?? paylink.montant ?? 0);
      const commission     = Math.round(montantBrut * COMMISSION_NEXORA);
      const montantVendeur = Math.max(0, montantBrut - commission);

      const { data: vendeurCompte } = await sb.from("nexora_transfert_comptes").select("solde").eq("user_id", paylink.user_id).maybeSingle();
      await sb.from("nexora_transfert_comptes").upsert({ user_id: paylink.user_id, solde: (vendeurCompte?.solde ?? 0) + montantVendeur, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

      await sb.from("nexora_transactions").insert({
        user_id: paylink.user_id, type: "vente_paylink", amount: montantBrut,
        amount_net: montantVendeur, frais: commission, currency: "XOF",
        status: "completed", completed_at: new Date().toISOString(),
        moneroo_id: transaction_id,
        metadata: { reference, paylink_id, commission, produit: paylink.nom_produit ?? "—", source: "kkiapay_paylink", ...(customer ?? {}) },
      });

      await sb.from("nexora_notifications").insert({ user_id: paylink.user_id, titre: "💰 Nouveau paiement PayLink !", message: `${montantVendeur.toLocaleString("fr-FR")} FCFA reçus pour "${paylink.nom_produit ?? "votre produit"}" (réf: ${reference}).`, type: "success", lu: false });
    }

    return json({ success: true, payment_id: transaction_id, reference });
  } catch (e: any) {
    console.error("💥 Exception :", e?.message);
    return err(e?.message ?? "Erreur interne", 500);
  }
});
