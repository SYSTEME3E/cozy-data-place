import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── MAPPING réseau affiché → provider GeniusPay ───
const PROVIDER_MAP: Record<string, string> = {
  "Wave":         "wave",
  "Orange Money": "orange_money",
  "MTN MoMo":     "mtn_money",
  "Moov Money":   "moov_money",
  "Flooz":        "moov_money",
  "T-Money":      "mtn_money",
  "M-Pesa":       "mpesa",
  "Airtel Money": "airtel_money",
  "Vodacom":      "vodacom",
  "Free Money":   "orange_money",
  "wave":         "wave",
  "orange_money": "orange_money",
  "mtn_money":    "mtn_money",
  "moov_money":   "moov_money",
};

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
    const supabase    = createClient(supabaseUrl, supabaseKey);

    const fraisCalc  = frais ?? Math.round(amount * 0.03);
    const montantNet = amount_net ?? (amount - fraisCalc);
    const nomComplet = `${user_first_name} ${user_last_name}`.trim();

    // ─────────────────────────────────────────────
    // 1. VÉRIFIER LE SOLDE DISPONIBLE
    // ─────────────────────────────────────────────
    const { data: txs, error: txError } = await supabase
      .from("nexora_transactions")
      .select("amount, frais, type, status")
      .eq("user_id", user_id)
      .eq("status", "completed");

    if (txError) {
      console.error("Erreur lecture transactions:", txError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur vérification solde" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let solde = 0;
    for (const tx of txs ?? []) {
      if (tx.type === "recharge_transfert") {
        solde += (tx.amount ?? 0) - (tx.frais ?? 0);
      } else if (tx.type === "retrait_transfert") {
        solde -= (tx.amount ?? 0);
      }
    }

    if (amount > solde) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Solde insuffisant. Solde disponible : ${Math.round(solde)} FCFA`,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────
    // 2. INSÉRER DANS nexora_transactions (status: pending)
    //    → débite immédiatement le solde dans l'UI
    // ─────────────────────────────────────────────
    const { data: transaction, error: txInsertError } = await supabase
      .from("nexora_transactions")
      .insert({
        user_id,
        type:     "retrait_transfert",
        amount,
        frais:    fraisCalc,
        currency: "XOF",
        status:   "pending",
        metadata: {
          ...metadata,
          pays,
          reseau,
          telephone:        numero_mobile,
          nom_beneficiaire: nomComplet,
          email:            user_email,
        },
      })
      .select()
      .single();

    if (txInsertError) {
      console.error("Erreur insertion transaction:", txInsertError);
      return new Response(
        JSON.stringify({ success: false, error: "Erreur enregistrement transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─────────────────────────────────────────────
    // 3. APPEL API GENIUSPAY PAYOUT
    //    POST https://pay.genius.ci/api/v1/merchant/payouts
    // ─────────────────────────────────────────────
    const geniuspayKey   = Deno.env.get("GENIUSPAY_SECRET_KEY")!;
    const walletId       = Deno.env.get("GENIUSPAY_WALLET_ID") ?? "b335ceab-ccc3-456f-836c-2ab3dde83736";
    const provider       = PROVIDER_MAP[reseau] ?? reseau.toLowerCase().replace(/\s+/g, "_");
    const phoneClean     = numero_mobile.replace(/[\s\-()+]/g, "");
    const idempotencyKey = `nexora-${transaction.id}`;

    let gpStatus    = "pending";
    let gpReference = null as string | null;
    let gpError     = null as string | null;

    try {
      const gpRes = await fetch("https://pay.genius.ci/api/v1/merchant/payouts", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${geniuspayKey}`,
          "Content-Type":  "application/json",
          "Accept":        "application/json",
        },
        body: JSON.stringify({
          wallet_id: walletId,
          recipient: {
            name:  nomComplet,
            phone: phoneClean,
            email: user_email ?? "",
          },
          destination: {
            type:     "mobile_money",
            provider: provider,
            account:  phoneClean,
          },
          amount:          montantNet,
          currency:        "XOF",
          description:     `Transfert NEXORA vers ${pays} - ${reseau}`,
          metadata: {
            nexora_transaction_id: transaction.id,
            user_id,
            pays,
            reseau,
          },
          idempotency_key: idempotencyKey,
        }),
      });

      const gpData = await gpRes.json();
      console.log("GeniusPay payout response:", JSON.stringify(gpData));

      if (gpRes.ok && gpData?.success) {
        const payoutData = gpData?.data?.payout;
        gpReference = payoutData?.reference ?? payoutData?.id ?? null;
        gpStatus    = payoutData?.status === "completed" ? "completed" : "pending";
      } else {
        gpError = gpData?.message ?? gpData?.error ?? "Erreur GeniusPay";
        console.error("GeniusPay error:", gpError, "HTTP:", gpRes.status);
        // Si erreur côté GeniusPay (numéro invalide, provider inconnu, etc.)
        // on annule la transaction pour ne pas débiter l'utilisateur
        if (gpRes.status === 400 || gpRes.status === 422) {
          await supabase
            .from("nexora_transactions")
            .update({ status: "failed" })
            .eq("id", transaction.id);
          return new Response(
            JSON.stringify({ success: false, error: gpError }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (gpErr: any) {
      console.error("GeniusPay fetch error:", gpErr);
      gpError = gpErr.message;
    }

    // ─────────────────────────────────────────────
    // 4. METTRE À JOUR nexora_transactions avec la référence GeniusPay
    // ─────────────────────────────────────────────
    await supabase
      .from("nexora_transactions")
      .update({
        status:       gpStatus,
        moneroo_id:   gpReference,
        completed_at: gpStatus === "completed" ? new Date().toISOString() : null,
      })
      .eq("id", transaction.id);

    // ─────────────────────────────────────────────
    // 5. INSÉRER DANS nexora_payouts (suivi admin)
    // ─────────────────────────────────────────────
    await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type:             type || "retrait_transfert",
        amount,
        amount_net:       montantNet,
        frais:            fraisCalc,
        currency:         "XOF",
        status:           gpStatus,
        pays,
        reseau,
        numero:           phoneClean,
        nom_beneficiaire: nomComplet,
        transaction_id:   transaction.id,
        metadata: {
          ...metadata,
          email:           user_email,
          geniuspay_ref:   gpReference,
          geniuspay_error: gpError,
        },
      });

    return new Response(
      JSON.stringify({
        success:   true,
        payout_id: gpReference ?? transaction.id,
        message:   gpError
          ? "Transfert enregistré. Traitement en cours."
          : "Transfert envoyé ! Le destinataire recevra l'argent dans quelques minutes.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Payout error:", err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
