import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const fraisCalc     = frais ?? Math.round(amount * 0.03);
    const montantNet    = amount_net ?? (amount - fraisCalc);
    const nomComplet    = `${user_first_name} ${user_last_name}`.trim();

    // ─────────────────────────────────────────────
    // 1. VÉRIFIER LE SOLDE DISPONIBLE
    // Solde = somme recharges completed - somme transferts completed
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
        // Montant crédité = amount - frais
        solde += (tx.amount ?? 0) - (tx.frais ?? 0);
      } else if (tx.type === "retrait_transfert") {
        // Montant débité = amount complet
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
    //    C'est cette ligne qui débite le solde dans l'UI
    // ─────────────────────────────────────────────
    const { data: transaction, error: txInsertError } = await supabase
      .from("nexora_transactions")
      .insert({
        user_id,
        type:       "retrait_transfert",
        amount,
        frais:      fraisCalc,
        currency:   "XOF",
        status:     "pending",
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
    // 3. INSÉRER AUSSI DANS nexora_payouts (pour suivi admin)
    // ─────────────────────────────────────────────
    const { data: payout } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type:             type || "retrait_transfert",
        amount,
        amount_net:       montantNet,
        frais:            fraisCalc,
        currency:         "XOF",
        status:           "pending",
        pays,
        reseau,
        numero:           numero_mobile,
        nom_beneficiaire: nomComplet,
        transaction_id:   transaction.id, // lien avec nexora_transactions
        metadata: {
          ...metadata,
          email: user_email,
        },
      })
      .select()
      .single();

    // ─────────────────────────────────────────────
    // 4. TENTATIVE APPEL API GENIUSPAY (si dispo)
    //    Si ça échoue, on garde le status "pending" pour traitement manuel
    // ─────────────────────────────────────────────
    const geniuspayKey = Deno.env.get("GENIUSPAY_SECRET_KEY");
    if (geniuspayKey) {
      try {
        const gpRes = await fetch("https://api.genius.ci/v1/payouts", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${geniuspayKey}`,
            "Content-Type":  "application/json",
          },
          body: JSON.stringify({
            amount:        montantNet,
            currency:      "XOF",
            payment_method: reseau.toLowerCase().replace(/\s+/g, "_"),
            phone_number:  numero_mobile.replace(/[\s\-()+]/g, ""),
            country:       metadata?.pays_code ?? "BJ",
            first_name:    user_first_name,
            last_name:     user_last_name,
            reference:     transaction.id,
          }),
        });

        if (gpRes.ok) {
          const gpData = await gpRes.json();
          // Mettre à jour le statut si GeniusPay confirme
          const newStatus = gpData?.status === "success" ? "completed" : "pending";
          await supabase
            .from("nexora_transactions")
            .update({
              status:      newStatus,
              moneroo_id:  gpData?.id ?? gpData?.reference ?? null,
              completed_at: newStatus === "completed" ? new Date().toISOString() : null,
            })
            .eq("id", transaction.id);

          if (payout) {
            await supabase
              .from("nexora_payouts")
              .update({ status: newStatus, geniuspay_id: gpData?.id ?? null })
              .eq("id", payout.id);
          }
        }
      } catch (gpErr) {
        // GeniusPay indispo → on garde pending, traitement manuel
        console.warn("GeniusPay API indisponible:", gpErr);
      }
    }

    return new Response(
      JSON.stringify({
        success:    true,
        payout_id:  payout?.id ?? transaction.id,
        message:    "Transfert initié. Le destinataire recevra l'argent sous 1 minuit.",
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
