// supabase/functions/geniuspay-payment/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initialise un paiement GeniusPay
// ✅ FIX CRITIQUE : crée la transaction en base AVANT la redirection
//    → le webhook peut ainsi la retrouver par moneroo_id et mettre
//      à jour le statut + créditer le solde automatiquement
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://api.geniuspay.app/api/v1";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";
const APP_URL           = Deno.env.get("APP_URL") ?? "https://ton-app.com";

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

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

    // ── Supabase client avec service role pour écrire en base ──
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── URLs de redirection ──
    const isRecharge   = type === "recharge_transfert";
    const callbackBase = isRecharge
      ? `${APP_URL}/transfert`
      : `${APP_URL}/payment/callback`;

    const success_url = `${callbackBase}?status=success&type=${type}&user_id=${user_id}`;
    const error_url   = `${callbackBase}?status=failed&type=${type}&user_id=${user_id}`;

    // ── Appel GeniusPay ──
    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payments/initialize`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GENIUSPAY_SECRET}`,
        "Accept":        "application/json",
      },
      body: JSON.stringify({
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
      }),
    });

    const geniusData = await geniusPayResponse.json();

    if (!geniusPayResponse.ok || !geniusData.payment_url) {
      console.error("GeniusPay error:", geniusData);
      return new Response(
        JSON.stringify({
          success: false,
          error: geniusData.message ?? "Erreur lors de l'initialisation du paiement",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ FIX CRITIQUE : enregistrer la transaction en base maintenant
    // que GeniusPay nous a donné son ID de référence.
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
        status:      "pending",
        moneroo_id:  paymentId,
        checkout_url: geniusData.payment_url,
        metadata: {
          ...metadata,
          user_id,
          type,
          amount_net: String(amount_net ?? (amount - frais)),
        },
      });

    if (txError) {
      console.error("Erreur création transaction:", txError);
    }

    return new Response(
      JSON.stringify({
        success:     true,
        payment_url: geniusData.payment_url,
        payment_id:  paymentId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("geniuspay-payment error:", err);
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
