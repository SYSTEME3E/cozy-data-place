// supabase/functions/geniuspay-payout/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initie un retrait / transfert via GeniusPay
// ✅ FIXÉ : Déduit le solde UNIQUEMENT si GeniusPay confirme le succès
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

    // ── 1. Vérifier le solde de l'utilisateur ──
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

    const nomBeneficiaire = `${user_first_name ?? ""} ${user_last_name ?? ""}`.trim();
    const amountNet = amount_net ?? amount - frais;

    // ── 2. Créer le payout en DB avec status "pending" ──
    const { data: payout, error: payoutErr } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type,
        amount,
        amount_net: amountNet,
        frais,
        currency: "XOF",
        status: "pending",
        nom_beneficiaire: nomBeneficiaire,
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

    // ── 3. Appel RÉEL à l'API GeniusPay pour envoyer l'argent ──
    console.log("Appel GeniusPay payout:", `${GENIUSPAY_API_URL}/payouts`);

    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    GENIUSPAY_PUBLIC,
        "X-API-Secret": GENIUSPAY_SECRET,
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        amount: amountNet, // on envoie le montant net (sans frais)
        currency: "XOF",
        description: `Transfert Nexora vers ${pays} - ${reseau}`,
        recipient: {
          name:         nomBeneficiaire,
          phone:        numero_mobile,
          email:        user_email ?? undefined,
          mobile_money: reseau,
          country:      metadata.pays_code ?? "",
        },
        metadata: {
          ...metadata,
          user_id,
          payout_id: payout.id,
          type,
        },
      }),
    });

    const geniusData = await geniusPayResponse.json();
    console.log("Réponse GeniusPay payout status:", geniusPayResponse.status);
    console.log("Réponse GeniusPay payout data:", JSON.stringify(geniusData));

    // ── 4. Si GeniusPay rejette, on annule et on ne déduit pas ──
    if (!geniusPayResponse.ok) {
      console.error("GeniusPay payout error:", geniusData);

      // Marquer le payout comme échoué
      await supabase
        .from("nexora_payouts")
        .update({ status: "failed" })
        .eq("id", payout.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: geniusData.message ?? geniusData.error ?? `Erreur GeniusPay (HTTP ${geniusPayResponse.status})`,
          detail: geniusData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData     = geniusData.data ?? geniusData;
    const payoutRef  = txData.reference ?? txData.id ?? payout.id;
    const payoutStatus = txData.status ?? "pending";

    // ✅ CORRECTION : Vérifier le statut réel GeniusPay
    const isSuccess = payoutStatus === "success" || payoutStatus === "completed";

    // ── 5. Mettre à jour le payout avec la référence GeniusPay ──
    await supabase
      .from("nexora_payouts")
      .update({
        status:     isSuccess ? "completed" : "pending",
        moneroo_id: String(payoutRef),
      })
      .eq("id", payout.id);

    // ── 6. Enregistrer dans nexora_transactions ──
    await supabase.from("nexora_transactions").insert({
      user_id,
      type: "retrait_transfert",
      amount,
      amount_net: amountNet,
      frais,
      currency: "XOF",
      status: isSuccess ? "completed" : "pending", // ✅ Reflète le vrai statut GeniusPay
      completed_at: isSuccess ? new Date().toISOString() : null,
      moneroo_id: String(payoutRef),
      metadata: {
        ...metadata,
        nom_beneficiaire: nomBeneficiaire,
        telephone: numero_mobile,
        reseau,
        pays,
      },
    });

    // ── 7. Déduire du solde UNIQUEMENT si GeniusPay confirme le succès ──
    if (isSuccess) {
      const newSolde = Math.max(0, soldeActuel - amount);
      await supabase
        .from("nexora_transfert_comptes")
        .upsert(
          { user_id, solde: newSolde, updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );

      // ── 8a. Notification succès ──
      await supabase.from("nexora_notifications").insert({
        user_id,
        titre: "📤 Transfert envoyé",
        message: `${amountNet} FCFA envoyés vers ${pays} (${reseau}) — Réf: ${payoutRef}`,
        type: "success",
      });

      console.log(`✅ Payout ${payoutRef} COMPLÉTÉ pour ${user_id} — ${amountNet} FCFA vers ${pays}`);

      return new Response(
        JSON.stringify({
          success:   true,
          payout_id: payout.id,
          reference: String(payoutRef),
          message:   "Transfert initié avec succès",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // ── 8b. Notification attente ──
      await supabase.from("nexora_notifications").insert({
        user_id,
        titre: "⏳ Transfert en attente",
        message: `Votre transfert de ${amountNet} FCFA vers ${pays} (${reseau}) est en attente. Réf: ${payoutRef}`,
        type: "info",
      });

      console.log(`⏳ Payout ${payoutRef} EN ATTENTE pour ${user_id} — Statut GeniusPay: ${payoutStatus}`);

      return new Response(
        JSON.stringify({
          success:   true,
          payout_id: payout.id,
          reference: String(payoutRef),
          status:    "pending",
          message:   "Transfert en attente de confirmation",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (err: any) {
    console.error("geniuspay-payout error:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
