import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// GeniusPay does not have a public payout/cashout API endpoint documented.
// For now, we record the payout request in our DB and mark it as pending.
// The admin will process payouts manually or via a future GeniusPay cashout API.

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
      frais,
      user_id,
      user_email,
      user_first_name,
      user_last_name,
      pays,
      reseau,
      numero_mobile,
      metadata = {},
    } = body;

    if (!amount || !user_id || !numero_mobile) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Record payout request
    const { data: payout, error } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type: type || "payout",
        amount,
        amount_net: amount_net ?? amount - (frais ?? 0),
        frais: frais ?? 0,
        currency: "XOF",
        status: "pending",
        pays,
        reseau,
        numero: numero_mobile,
        nom_beneficiaire: `${user_first_name} ${user_last_name}`.trim(),
        metadata: {
          ...metadata,
          email: user_email,
        },
      })
      .select()
      .single();

    if (error) {
      console.error("DB error:", error);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur enregistrement" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        payout_id: payout.id,
        message: "Demande de retrait enregistrée. Traitement sous 24h.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Payout error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
