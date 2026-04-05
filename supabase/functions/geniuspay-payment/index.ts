// supabase/functions/geniuspay-payment/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://api.geniuspay.app/api/v1";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";
const APP_URL           = Deno.env.get("APP_URL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Vérification des secrets au démarrage ──
    console.log("=== geniuspay-payment démarré ===");
    console.log("GENIUSPAY_SECRET défini:", GENIUSPAY_SECRET !== "");
    console.log("SUPABASE_URL défini:", !!Deno.env.get("SUPABASE_URL"));
    console.log("SUPABASE_SERVICE_ROLE_KEY défini:", !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
    console.log("APP_URL:", APP_URL || "(vide)");

    if (!GENIUSPAY_SECRET) {
      console.error("❌ GENIUSPAY_SECRET_KEY manquante !");
      return new Response(
        JSON.stringify({ success: false, error: "Configuration serveur manquante : GENIUSPAY_SECRET_KEY" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    console.log("Body reçu:", JSON.stringify(body));

    const {
      type,
      amount,
      amount_net,
      currency = "XOF",
      payment_method,
      user_id,
      user_email,
      user_name,
      user_phone,
      metadata = {},
    } = body;

    if (!user_id || !amount || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants : user_id, amount, type requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const isRecharge   = type === "recharge_transfert";
    const callbackBase = isRecharge
      ? `${APP_URL}/transfert`
      : `${APP_URL}/payment/callback`;

    const success_url = `${callbackBase}?status=success&type=${type}&user_id=${user_id}`;
    const error_url   = `${callbackBase}?status=failed&type=${type}&user_id=${user_id}`;

    // ── Appel GeniusPay ──
    const geniusPayBody = {
      amount,
      amount_net,
      currency,
      description:    getDescription(type),
      customer: {
        email: user_email,
        name:  user_name,
        phone: user_phone || undefined,
      },
      payment_method: payment_method || undefined,
      success_url,
      error_url,
      cancel_url: error_url,
      metadata: {
        ...metadata,
        user_id,
        type,
        source: "nexora",
      },
    };

    console.log("Appel GeniusPay:", `${GENIUSPAY_API_URL}/payments/initialize`);
    console.log("Body GeniusPay:", JSON.stringify(geniusPayBody));

    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payments/initialize`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GENIUSPAY_SECRET}`,
        "Accept":        "application/json",
      },
      body: JSON.stringify(geniusPayBody),
    });

    const geniusData = await geniusPayResponse.json();
    console.log("Réponse GeniusPay status:", geniusPayResponse.status);
    console.log("Réponse GeniusPay data:", JSON.stringify(geniusData));

    if (!geniusPayResponse.ok || !geniusData.payment_url) {
      console.error("❌ GeniusPay a rejeté la requête:", geniusData);
      return new Response(
        JSON.stringify({
          success: false,
          error: geniusData.message ?? geniusData.error ?? "Erreur GeniusPay : " + geniusPayResponse.status,
          detail: geniusData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentId = geniusData.id ?? geniusData.payment_id ?? null;
    const frais     = isRecharge ? 100 : 0;

    const { error: txError } = await supabase
      .from("nexora_transactions")
      .insert({
        user_id,
        type,
        amount,
        amount_net: amount_net ?? (amount - frais),
        frais,
        currency,
        status:       "pending",
        moneroo_id:   paymentId,
        checkout_url: geniusData.payment_url,
        metadata: {
          ...metadata,
          user_id,
          type,
          amount_net: String(amount_net ?? (amount - frais)),
        },
      });

    if (txError) {
      console.error("⚠️ Erreur création transaction (non bloquant):", txError);
    }

    console.log("✅ Paiement initialisé:", paymentId);

    return new Response(
      JSON.stringify({
        success:     true,
        payment_url: geniusData.payment_url,
        payment_id:  paymentId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("❌ Exception geniuspay-payment:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getDescription(type: string): string {
  switch (type) {
    case "abonnement_premium": return "Abonnement Nexora Premium - 1 mois";
    case "recharge_transfert": return "Recharge portefeuille Nexora Transfert";
    case "depot_epargne":      return "Dépôt épargne Nexora";
    default:                   return "Paiement Nexora";
  }
}
