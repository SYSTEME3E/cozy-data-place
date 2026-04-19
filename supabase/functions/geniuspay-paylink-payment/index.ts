// supabase/functions/geniuspay-paylink-payment/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function dédiée aux paiements Nexora PayLink via GeniusPay
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";
const GENIUSPAY_PUBLIC  = Deno.env.get("GENIUSPAY_PUBLIC_KEY")  ?? "";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY")  ?? "";

console.log("🔑 PAYLINK — GENIUSPAY_PUBLIC_KEY présent :", !!GENIUSPAY_PUBLIC);
console.log("🔑 PAYLINK — GENIUSPAY_SECRET_KEY présent :", !!GENIUSPAY_SECRET);


const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse du body ─────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 PayLink — Body reçu :", JSON.stringify(body));

    const {
      paylink_id,
      amount,
      currency = "XOF",
      description,
      reference,
      customer,
      payment_method,
      pays,
      metadata = {},
    } = body;

    // ── 2. Validation ─────────────────────────────────────────────
    if (!paylink_id || !amount || !reference) {
      const missing = [
        !paylink_id && "paylink_id",
        !amount     && "amount",
        !reference  && "reference",
      ].filter(Boolean);
      return new Response(
        JSON.stringify({ success: false, error: `Paramètres manquants : ${missing.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 3. Vérification des clés API ──────────────────────────────
    if (!GENIUSPAY_PUBLIC || !GENIUSPAY_SECRET) {
      console.error("❌ Clés GeniusPay non configurées dans les secrets Supabase !");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Clés API GeniusPay manquantes. Configurez GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans Supabase Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. URLs de callback — on lit le domaine depuis la requête ──
    // Comme ça, peu importe le domaine de la plateforme, ça s'adapte automatiquement
    const requestOrigin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/[^/]*$/, "") ?? "";
    const APP_URL = requestOrigin || Deno.env.get("APP_URL") || "";

    if (!APP_URL) {
      console.error("❌ Impossible de déterminer l'URL de la plateforme (origin/referer absents)");
    }

    const success_url = `${APP_URL}/pay/${metadata.slug ?? paylink_id}?status=success&ref=${reference}`;
    const error_url   = `${APP_URL}/pay/${metadata.slug ?? paylink_id}?status=failed&ref=${reference}`;

    console.log("✅ success_url :", success_url);
    console.log("✅ error_url   :", error_url);

    // ── 5. Payload GeniusPay ──────────────────────────────────────
    const geniusPayload: any = {
      amount,
      currency,
      description: description ?? "Paiement Nexora PayLink",
      customer: {
        name:  customer?.name  ?? undefined,
        phone: customer?.phone ?? undefined,
        email: customer?.email ?? undefined,
      },
      success_url,
      error_url,
      metadata: {
        ...metadata,
        paylink_id,
        reference,
        source: "nexora_paylink",
      },
    };

    // Si Mobile Money : on ajoute le réseau et le pays
    if (payment_method) {
      geniusPayload.payment_method = payment_method;
    }
    if (pays) {
      geniusPayload.country = pays;
    }

    console.log("📤 Payload GeniusPay :", JSON.stringify(geniusPayload));

    // ── 6. Appel API GeniusPay ────────────────────────────────────
    const geniusResponse = await fetch(`${GENIUSPAY_API_URL}/payments`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    GENIUSPAY_PUBLIC,
        "X-API-Secret": GENIUSPAY_SECRET,
        "Accept":       "application/json",
      },
      body: JSON.stringify(geniusPayload),
    });

    const rawText = await geniusResponse.text();
    console.log("📥 GeniusPay HTTP status :", geniusResponse.status);
    console.log("📥 GeniusPay réponse brute :", rawText);

    let geniusData: any;
    try {
      geniusData = JSON.parse(rawText);
    } catch {
      console.error("❌ Réponse GeniusPay non-JSON :", rawText);
      return new Response(
        JSON.stringify({ success: false, error: `GeniusPay réponse invalide : ${rawText.slice(0, 200)}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData      = geniusData.data ?? geniusData;
    const checkoutUrl = txData.checkout_url ?? txData.payment_url ?? null;
    const geniusRef   = txData.reference    ?? txData.id          ?? null;

    if (!geniusResponse.ok || !checkoutUrl) {
      console.error("❌ GeniusPay a refusé la requête :", JSON.stringify(geniusData));
      return new Response(
        JSON.stringify({
          success:          false,
          error:            geniusData.message ?? geniusData.error ?? `Erreur GeniusPay HTTP ${geniusResponse.status}`,
          geniuspay_detail: geniusData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ checkout_url obtenu :", checkoutUrl);

    // ── 7. Mise à jour de la transaction en base ──────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Met à jour le paiement avec l'ID GeniusPay
    await supabase
      .from("nexora_paylink_payments")
      .update({
        geniuspay_payment_id: String(geniusRef),
        checkout_url:         checkoutUrl,
      })
      .eq("reference", reference);

    return new Response(
      JSON.stringify({
        success:      true,
        checkout_url: checkoutUrl,
        payment_id:   String(geniusRef),
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
