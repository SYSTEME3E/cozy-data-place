import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GENIUSPAY_API        = "https://pay.geniuspay.io/api/v1/merchant/payments";
const GENIUSPAY_API_KEY    = Deno.env.get("GENIUSPAY_API_KEY") ?? "";
const GENIUSPAY_API_SECRET = Deno.env.get("GENIUSPAY_API_SECRET") ?? "";
const APP_URL              = Deno.env.get("APP_URL") ?? "https://nexora-refactor-restore.lovable.app";
const SUPABASE_URL         = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type PaymentType = "abonnement_premium" | "recharge_transfert" | "depot_epargne";

interface PaymentRequest {
  type: PaymentType;
  amount: number;
  amount_net: number;
  currency?: string;
  payment_method?: string;
  user_id: string;
  user_email: string;
  user_name: string;
  user_phone?: string;
  metadata?: Record<string, string>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: PaymentRequest = await req.json();

    if (!body.type || !body.amount || !body.user_id || !body.user_email) {
      return new Response(
        JSON.stringify({ success: false, error: "Champs obligatoires manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (body.amount < 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Montant minimum : 100 FCFA" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GENIUSPAY_API_KEY || !GENIUSPAY_API_SECRET) {
      console.error("GENIUSPAY_API_KEY ou GENIUSPAY_API_SECRET manquant");
      return new Response(
        JSON.stringify({ success: false, error: "Configuration API manquante. Contactez l'administrateur." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const descriptions: Record<PaymentType, string> = {
      abonnement_premium: "Abonnement NEXORA Premium",
      recharge_transfert: `Recharge NEXORA Transfert — ${body.amount_net} FCFA`,
      depot_epargne:      `Dépôt Épargne NEXORA — ${body.amount_net} FCFA`,
    };

    const successUrls: Record<PaymentType, string> = {
      abonnement_premium: `${APP_URL}/payment/callback?type=abonnement&status=success`,
      recharge_transfert: `${APP_URL}/payment/callback?type=transfert&status=success`,
      depot_epargne:      `${APP_URL}/payment/callback?type=epargne&status=success`,
    };
    const errorUrls: Record<PaymentType, string> = {
      abonnement_premium: `${APP_URL}/payment/callback?type=abonnement&status=failed`,
      recharge_transfert: `${APP_URL}/payment/callback?type=transfert&status=failed`,
      depot_epargne:      `${APP_URL}/payment/callback?type=epargne&status=failed`,
    };

    const geniusPayload: Record<string, unknown> = {
      amount:      body.amount,
      currency:    body.currency ?? "XOF",
      description: descriptions[body.type],
      success_url: successUrls[body.type],
      error_url:   errorUrls[body.type],
      customer: {
        name:  body.user_name || "Client NEXORA",
        email: body.user_email,
        phone: body.user_phone ?? "",
      },
      metadata: {
        user_id:      body.user_id,
        payment_type: body.type,
        amount_net:   String(body.amount_net),
        frais_nexora: "100",
        ...body.metadata,
      },
    };

    if (body.payment_method) {
      geniusPayload.payment_method = body.payment_method;
    }

    const gpRes = await fetch(GENIUSPAY_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept":       "application/json",
        "X-API-Key":    GENIUSPAY_API_KEY,
        "X-API-Secret": GENIUSPAY_API_SECRET,
      },
      body: JSON.stringify(geniusPayload),
    });

    const gpData = await gpRes.json();

    if (!gpRes.ok || !gpData.success || !gpData.data?.payment_url) {
      console.error("GeniusPay payment error:", JSON.stringify(gpData));
      return new Response(
        JSON.stringify({
          success: false,
          error: gpData.error?.message ?? gpData.message ?? "Erreur GeniusPay",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const transaction = gpData.data;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("nexora_transactions").insert({
      user_id:      body.user_id,
      moneroo_id:   transaction.reference,
      type:         body.type,
      amount:       body.amount_net,
      frais:        100,
      currency:     body.currency ?? "XOF",
      status:       "pending",
      checkout_url: transaction.payment_url,
      metadata:     { ...body.metadata, geniuspay_id: String(transaction.id) },
    });

    return new Response(
      JSON.stringify({
        success:     true,
        payment_url: transaction.payment_url,
        payment_id:  transaction.reference,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Erreur serveur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
