import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const GENIUSPAY_BASE = "https://pay.genius.ci/api/v1/merchant";
const GENIUSPAY_PK = "pk_live_uVvIvcfuyUidaSs67I49yZj8hQbOeXje";

Deno.serve(async (req) => {
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
      user_id,
      user_email,
      user_name,
      user_phone,
      metadata = {},
    } = body;

    if (!amount || !user_id || !type) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GENIUSPAY_SK = Deno.env.get("GENIUSPAY_SECRET_KEY");
    if (!GENIUSPAY_SK) {
      return new Response(
        JSON.stringify({ success: false, error: "Clé API non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build success/error URLs
    const appUrl = req.headers.get("origin") || "https://id-preview--e1f00d63-c07c-428f-86b9-2d9d976dcdff.lovable.app";
    const successUrl = `${appUrl}/payment/callback?status=success&type=${type}`;
    const errorUrl = `${appUrl}/payment/callback?status=failed&type=${type}`;

    // Call GeniusPay API - checkout mode (no payment_method → hosted checkout page)
    const gpResponse = await fetch(`${GENIUSPAY_BASE}/payments`, {
      method: "POST",
      headers: {
        "X-API-Key": GENIUSPAY_PK,
        "X-API-Secret": GENIUSPAY_SK,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        description: `Nexora ${type} - ${user_name}`,
        customer: {
          name: user_name || "Client Nexora",
          email: user_email || "",
          phone: user_phone || "",
        },
        success_url: successUrl,
        error_url: errorUrl,
        metadata: {
          ...metadata,
          nexora_type: type,
          nexora_user_id: user_id,
          amount_net: String(amount_net ?? amount),
        },
      }),
    });

    const gpData = await gpResponse.json();

    if (!gpData.success || !gpData.data) {
      console.error("GeniusPay error:", gpData);
      return new Response(
        JSON.stringify({ success: false, error: gpData.message || "Erreur GeniusPay" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save transaction in DB
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    await supabase.from("nexora_transactions").insert({
      user_id,
      type,
      amount,
      frais: amount - (amount_net ?? amount),
      currency,
      status: "pending",
      moneroo_id: gpData.data.reference,
      checkout_url: gpData.data.checkout_url || gpData.data.payment_url,
      metadata: {
        ...metadata,
        geniuspay_id: gpData.data.id,
        customer_email: user_email,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        payment_url: gpData.data.checkout_url || gpData.data.payment_url,
        payment_id: gpData.data.reference,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Edge function error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
