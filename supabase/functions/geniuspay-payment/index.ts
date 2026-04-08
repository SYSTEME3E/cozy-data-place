// supabase/functions/geniuspay-payment/index.ts
// ✅ FIX PRINCIPAL : suppression de amount_net dans l'insert nexora_transactions (colonne inexistante)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";
const GENIUSPAY_PUBLIC  = Deno.env.get("GENIUSPAY_PUBLIC_KEY") ?? "";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";
const APP_URL           = Deno.env.get("APP_URL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      type, amount, currency = "XOF", payment_method,
      user_id, user_email, user_name, user_phone, metadata = {},
    } = body;

    if (!user_id || !amount || !type) {
      return new Response(JSON.stringify({ success: false, error: "Paramètres manquants : user_id, amount, type requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!GENIUSPAY_SECRET || !GENIUSPAY_PUBLIC) {
      console.error("❌ Clés GeniusPay non configurées !");
      return new Response(JSON.stringify({ success: false, error: "Clés API GeniusPay non configurées." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isRecharge   = type === "recharge_transfert";
    const callbackBase = isRecharge ? `${APP_URL}/transfert` : `${APP_URL}/payment/callback`;
    const success_url  = `${callbackBase}?status=success&type=${type}&user_id=${user_id}`;
    const error_url    = `${callbackBase}?status=failed&type=${type}&user_id=${user_id}`;

    console.log("Appel GeniusPay:", `${GENIUSPAY_API_URL}/payments`);

    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    GENIUSPAY_PUBLIC,
        "X-API-Secret": GENIUSPAY_SECRET,
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        amount, currency,
        description: getDescription(type),
        customer: {
          email: user_email || undefined,
          name:  user_name  || undefined,
          phone: user_phone || undefined,
        },
        payment_method: payment_method || undefined,
        success_url, error_url,
        metadata: { ...metadata, user_id, type, source: "nexora" },
      }),
    });

    const geniusData = await geniusPayResponse.json();
    console.log("Réponse GeniusPay status:", geniusPayResponse.status);
    console.log("Réponse GeniusPay data:", JSON.stringify(geniusData));

    const txData     = geniusData.data ?? geniusData;
    const paymentUrl = txData.checkout_url ?? txData.payment_url ?? null;
    const paymentRef = txData.reference    ?? txData.id           ?? null;

    if (!geniusPayResponse.ok || !paymentUrl) {
      console.error("GeniusPay error:", geniusData);
      return new Response(JSON.stringify({
        success: false,
        error: geniusData.message ?? geniusData.error ?? `Erreur GeniusPay (HTTP ${geniusPayResponse.status})`,
        detail: geniusData,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const frais = isRecharge ? 100 : 0;

    // ✅ INSERT sans amount_net (colonne inexistante dans nexora_transactions)
    const { error: txError } = await supabase.from("nexora_transactions").insert({
      user_id,
      type,
      amount,
      frais,
      currency,
      status:       "pending",
      moneroo_id:   String(paymentRef),
      checkout_url: paymentUrl,
      metadata: { ...metadata, user_id, type },
    });

    if (txError) {
      console.error("Erreur création transaction:", JSON.stringify(txError));
    }

    return new Response(JSON.stringify({
      success:     true,
      payment_url: paymentUrl,
      payment_id:  String(paymentRef),
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("geniuspay-payment error:", err?.message, err?.stack);
    return new Response(JSON.stringify({ success: false, error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

function getDescription(type: string): string {
  switch (type) {
    case "abonnement_premium": return "Abonnement Nexora Premium - 1 mois";
    case "recharge_transfert": return "Recharge portefeuille Nexora Transfert";
    default:                   return "Paiement Nexora";
  }
}
