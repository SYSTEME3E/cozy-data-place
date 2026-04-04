// supabase/functions/geniuspay-payment/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initialise un paiement GeniusPay
// ✅ FIX : ajoute success_url et error_url pour la redirection callback
// ─────────────────────────────────────────────────────────────────

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GENIUSPAY_API_URL = "https://api.geniuspay.app/api/v1"; // adapter si besoin
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";
const APP_URL           = Deno.env.get("APP_URL") ?? "https://ton-app.com"; // ⚠️ à définir dans Supabase


const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const {
      type,
      amount,         // Montant total (net + frais 100 FCFA)
      amount_net,     // Montant net sans frais
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

    // ✅ FIX PRINCIPAL : URLs de redirection après paiement
    // Pour la recharge, rediriger vers /transfert (pas /payment/callback)
    // Pour l'abonnement, rediriger vers /payment/callback
    const isRecharge = type === "recharge_transfert";
    const callbackBase = isRecharge
      ? `${APP_URL}/transfert`
      : `${APP_URL}/payment/callback`;

    const success_url = `${callbackBase}?status=success&type=${type}&user_id=${user_id}`;
    const error_url   = `${callbackBase}?status=failed&type=${type}&user_id=${user_id}`;

    // Appel à l'API GeniusPay
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
        // ✅ URLs de redirection
        success_url,
        error_url,
        cancel_url: error_url,
        // ✅ Metadata pour retrouver le contexte dans la callback
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

    return new Response(
      JSON.stringify({
        success:     true,
        payment_url: geniusData.payment_url,
        payment_id:  geniusData.id ?? geniusData.payment_id,
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

// ─── Descriptions lisibles par type de paiement ───────────────────
function getDescription(type: string): string {
  switch (type) {
    case "abonnement_premium": return "Abonnement Nexora Premium - 1 mois";
    case "recharge_transfert": return "Recharge portefeuille Nexora Transfert";
    case "depot_epargne":      return "Dépôt épargne Nexora";
    default:                   return "Paiement Nexora";
  }
}
