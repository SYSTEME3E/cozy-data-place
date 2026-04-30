// supabase/functions/kkiapay-verify/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : vérifie une transaction KKiaPay
// Utilisée par PayLinkCheckoutPage après le widget KKiaPay
// Supporte les types : "paylink"
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";
const KKIAPAY_API_URL     = "https://api.kkiapay.me/api/v1/transactions";

console.log("🔑 kkiapay-verify — KKIAPAY_PRIVATE_KEY présent :", !!KKIAPAY_PRIVATE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse body ─────────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 kkiapay-verify — Body reçu :", JSON.stringify(body));

    const {
      transactionId,
      type       = "paylink",
      paylink_id,
      reference,
    } = body;

    // ── 2. Validation ─────────────────────────────────────────────
    if (!transactionId) {
      return new Response(
        JSON.stringify({ success: false, error: "transactionId manquant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!KKIAPAY_PRIVATE_KEY) {
      console.error("❌ KKIAPAY_PRIVATE_KEY non configurée !");
      return new Response(
        JSON.stringify({ success: false, error: "Clé privée KKiaPay manquante. Configurez KKIAPAY_PRIVATE_KEY dans Supabase Secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Vérification de la transaction KKiaPay ─────────────────
    console.log("🔍 Vérification transaction KKiaPay :", transactionId);
    const verifyResponse = await fetch(`${KKIAPAY_API_URL}/${transactionId}/status`, {
      method: "GET",
      headers: {
        "x-private-key": KKIAPAY_PRIVATE_KEY,
        "Content-Type":  "application/json",
      },
    });

    const rawText = await verifyResponse.text();
    console.log("📥 KKiaPay HTTP status :", verifyResponse.status);
    console.log("📥 KKiaPay réponse brute :", rawText);

    let kkiaData: any;
    try {
      kkiaData = JSON.parse(rawText);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: `KKiaPay réponse invalide : ${rawText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Vérifier le statut ─────────────────────────────────────
    const txStatus  = kkiaData.status ?? kkiaData.transactionStatus ?? "";
    const isSuccess = txStatus === "SUCCESS" || txStatus === "COMPLETE";

    if (!verifyResponse.ok || !isSuccess) {
      console.error("❌ Transaction KKiaPay invalide :", JSON.stringify(kkiaData));
      return new Response(
        JSON.stringify({
          success: false,
          error:   kkiaData.message ?? `Transaction invalide (statut: ${txStatus})`,
          kkiapay_detail: kkiaData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Transaction KKiaPay vérifiée :", transactionId);

    // ── 5. Traitement selon le type ───────────────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (type === "paylink" && reference) {
      // Mettre à jour le paylink payment
      const { error: updateErr } = await supabase
        .from("nexora_paylink_payments")
        .update({
          statut:                "paye",
          paid_at:               new Date().toISOString(),
          geniuspay_payment_id:  transactionId,   // colonne existante réutilisée
          kkiapay_transaction_id: transactionId,
        })
        .eq("reference", reference);

      if (updateErr) {
        console.error("❌ Erreur mise à jour paylink_payments :", updateErr.message);
        // On retourne quand même succès (la tx est vérifiée) mais on log
      }

      console.log("✅ PayLink payment mis à jour — référence :", reference);
    }

    return new Response(
      JSON.stringify({
        success:        true,
        transactionId,
        status:         txStatus,
        amount:         kkiaData.amount ?? kkiaData.requestAmount ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("💥 Exception non gérée :", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
