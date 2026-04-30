// supabase/functions/kkiapay-paylink-payment/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : vérifie un paiement PayLink via KKiaPay
// Le widget KKiaPay s'ouvre côté client → frontend récupère transactionId
// → appelle cette fonction pour vérifier et créditer le vendeur
// ─────────────────────────────────────────────────────────────────


import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";
const KKIAPAY_API_URL     = "https://api.kkiapay.me/api/v1/transactions";

console.log("🔑 PAYLINK — KKIAPAY_PRIVATE_KEY présent :", !!KKIAPAY_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse du body ──────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 PayLink — Body reçu :", JSON.stringify(body));

    const {
      transaction_id,   // transactionId retourné par le widget KKiaPay
      paylink_id,
      amount,
      currency = "XOF",
      description,
      reference,
      customer,
      metadata = {},
    } = body;

    // ── 2. Validation ─────────────────────────────────────────────
    if (!transaction_id || !paylink_id || !reference) {
      const missing = [
        !transaction_id && "transaction_id",
        !paylink_id     && "paylink_id",
        !reference      && "reference",
      ].filter(Boolean);
      return new Response(
        JSON.stringify({ success: false, error: `Paramètres manquants : ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Vérification de la Private Key ─────────────────────────
    if (!KKIAPAY_PRIVATE_KEY) {
      console.error("❌ KKIAPAY_PRIVATE_KEY non configurée !");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Clé privée KKiaPay manquante. Configurez KKIAPAY_PRIVATE_KEY dans Supabase Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Vérification avec retry (jusqu'à 5 tentatives, délai croissant)
    console.log("🔍 Vérification transaction KKiaPay PayLink :", transaction_id);
    const MAX_RETRIES  = 5;
    const RETRY_DELAYS = [1500, 2500, 3500, 4000, 5000]; // ms
    let kkiaData: any = null;
    let txStatus       = "";
    let isSuccess      = false;
    let lastRawText    = "";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt - 1]));
      }

      const verifyResponse = await fetch(`${KKIAPAY_API_URL}/${transaction_id}/status`, {
        method: "GET",
        headers: {
          "x-private-key": KKIAPAY_PRIVATE_KEY,
          "Content-Type":  "application/json",
        },
      });

      lastRawText = await verifyResponse.text();
      console.log(`📥 Tentative ${attempt + 1}/${MAX_RETRIES} — HTTP ${verifyResponse.status} — ${lastRawText.slice(0, 300)}`);

      try {
        kkiaData = JSON.parse(lastRawText);
      } catch {
        console.warn(`⚠️ Réponse non-JSON (tentative ${attempt + 1})`);
        continue;
      }

      txStatus  = kkiaData.status ?? kkiaData.transactionStatus ?? "";
      isSuccess = txStatus === "SUCCESS" || txStatus === "COMPLETE" ||
                  txStatus === "TRANSACTION_APPROVED" || txStatus === "APPROVED";

      if (isSuccess) {
        console.log(`✅ Transaction confirmée au bout de ${attempt + 1} tentative(s)`);
        break;
      }

      console.log(`⏳ Statut "${txStatus}" — non final, on retente...`);
    }

    if (!kkiaData) {
      return new Response(
        JSON.stringify({ success: false, error: `KKiaPay réponse invalide : ${lastRawText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. Vérifier le statut final ───────────────────────────────
    if (!isSuccess) {
      console.error("❌ Transaction KKiaPay invalide :", JSON.stringify(kkiaData));
      return new Response(
        JSON.stringify({
          success: false,
          error:   kkiaData.message ?? `Transaction invalide (statut: ${txStatus})`,
          kkiapay_detail: kkiaData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Transaction KKiaPay PayLink vérifiée :", transaction_id);

    // ── 6. Mise à jour en base ─────────────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    await supabase
      .from("nexora_paylink_payments")
      .update({
        geniuspay_payment_id: transaction_id,  // colonne existante, on y met le transactionId KKiaPay
        checkout_url:         null,             // plus de checkout_url avec KKiaPay widget
        statut:               "paye",
        paid_at:              new Date().toISOString(),
      })
      .eq("reference", reference);

    console.log("✅ PayLink payment mis à jour :", reference);

    return new Response(
      JSON.stringify({
        success:    true,
        payment_id: transaction_id,
        reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("💥 Exception non gérée :", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
