// supabase/functions/geniuspay-payout/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initie un retrait / transfert via GeniusPay
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";
const GENIUSPAY_PUBLIC  = Deno.env.get("GENIUSPAY_PUBLIC_KEY") ?? "";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";

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
      frais = 0,
      user_id,
      user_email,
      user_first_name,
      user_last_name,
      pays,
      reseau,
      numero_mobile,
      metadata = {},
    } = body;

    if (!user_id || !amount || !type || !numero_mobile) {
      return new Response(
        JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!GENIUSPAY_SECRET || !GENIUSPAY_PUBLIC) {
      return new Response(
        JSON.stringify({ success: false, error: "Clés API GeniusPay non configurées." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Vérifier le solde de l'utilisateur
    const { data: compte } = await supabase
      .from("nexora_transfert_comptes")
      .select("solde")
      .eq("user_id", user_id)
      .maybeSingle();

    const soldeActuel = compte?.solde ?? 0;
    if (soldeActuel < amount) {
      return new Response(
        JSON.stringify({ success: false, error: "Solde insuffisant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer l'enregistrement payout
    const { data: payout, error: payoutErr } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type,
        amount,
        amount_net: amount_net ?? amount - frais,
        frais,
        currency: "XOF",
        status: "pending",
        nom_beneficiaire: `${user_first_name} ${user_last_name}`,
        numero: numero_mobile,
        pays,
        reseau,
        metadata: {
          ...metadata,
          pays_flag: metadata.pays_flag ?? "",
          pays_code: metadata.pays_code ?? "",
        },
      })
      .select()
      .single();

    if (payoutErr) {
      console.error("Erreur création payout:", JSON.stringify(payoutErr));
      return new Response(
        JSON.stringify({ success: false, error: "Erreur création du transfert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enregistrer aussi dans nexora_transactions pour le suivi
    await supabase.from("nexora_transactions").insert({
      user_id,
      type: "retrait_transfert",
      amount,
      amount_net: amount_net ?? amount - frais,
      frais,
      currency: "XOF",
      status: "completed",
      completed_at: new Date().toISOString(),
      moneroo_id: payout?.id ?? null,
      metadata: {
        ...metadata,
        nom_beneficiaire: `${user_first_name} ${user_last_name}`,
        telephone: numero_mobile,
        reseau,
        pays,
      },
    });

    // Déduire du solde
    const newSolde = Math.max(0, soldeActuel - amount);
    await supabase
      .from("nexora_transfert_comptes")
      .upsert(
        { user_id, solde: newSolde, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    // Notification
    await supabase.from("nexora_notifications").insert({
      user_id,
      titre: "📤 Transfert envoyé",
      message: `${amount} FCFA envoyés vers ${pays} (${reseau})`,
      type: "success",
    });

    return new Response(
      JSON.stringify({
        success:   true,
        payout_id: payout?.id,
        message:   "Transfert initié avec succès",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("geniuspay-payout error:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
