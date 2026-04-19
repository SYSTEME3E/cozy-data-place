// supabase/functions/geniuspay-payment/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initialise un paiement GeniusPay
// VERSION DEBUG — logs détaillés pour diagnostiquer
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";

// ✅ FIX : lecture des secrets avec fallback et log du résultat
const GENIUSPAY_PUBLIC = Deno.env.get("GENIUSPAY_PUBLIC_KEY") ?? "";
const GENIUSPAY_SECRET = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";
const APP_URL          = Deno.env.get("APP_URL") ?? "";

// Log au démarrage pour vérifier les secrets
console.log("🔑 GENIUSPAY_PUBLIC_KEY présent :", !!GENIUSPAY_PUBLIC, "| longueur :", GENIUSPAY_PUBLIC.length);
console.log("🔑 GENIUSPAY_SECRET_KEY présent :", !!GENIUSPAY_SECRET, "| longueur :", GENIUSPAY_SECRET.length);
console.log("🌐 APP_URL :", APP_URL || "(vide !)");

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── 1. Parse du body ──────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      console.error("❌ Impossible de parser le body JSON :", parseErr);
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📦 Body reçu :", JSON.stringify(body));

    const {
      type,
      amount,
      amount_net,
      currency = "XOF",
      payment_method,
      user_id,
      user_email,
      user_name,
      user_phone,
      metadata = {},
      // ── Champs PayLink ──
      paylink_id,
      reference,
      customer,
      pays,
    } = body;

    // ── 2. Validation des paramètres ──────────────────────────────
    const isPayLink = type === "paylink";

    if (isPayLink) {
      // Validation PayLink : besoin de paylink_id, amount, reference
      if (!paylink_id || !amount || !reference) {
        const missing = [!paylink_id && "paylink_id", !amount && "amount", !reference && "reference"].filter(Boolean);
        return new Response(
          JSON.stringify({ success: false, error: `Paramètres manquants : ${missing.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Validation normale : besoin de user_id, amount, type
      if (!user_id || !amount || !type) {
        const missing = [!user_id && "user_id", !amount && "amount", !type && "type"].filter(Boolean);
        console.error("❌ Paramètres manquants :", missing.join(", "));
        return new Response(
          JSON.stringify({ success: false, error: `Paramètres manquants : ${missing.join(", ")}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ── 3. Vérification des clés API ──────────────────────────────
    if (!GENIUSPAY_PUBLIC || !GENIUSPAY_SECRET) {
      console.error("❌ Clés GeniusPay non configurées dans les secrets Supabase !");
      console.error("   → Allez dans : Supabase Dashboard > Settings > Edge Functions > Secrets");
      console.error("   → Ajoutez : GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Clés API GeniusPay manquantes. Configurez GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans Supabase Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 4. Construction des URLs de callback ─────────────────────
    const isRecharge   = type === "recharge_transfert";

    let success_url: string;
    let error_url: string;

    if (isPayLink) {
      // Pour PayLink : on lit le domaine depuis la requête (dynamique)
      const origin = req.headers.get("origin") ?? req.headers.get("referer")?.replace(/\/[^/]*$/, "") ?? APP_URL;
      const paylinkSlug = metadata.slug ?? paylink_id;
      success_url = `${origin}/pay/${paylinkSlug}?status=success&ref=${reference}`;
      error_url   = `${origin}/pay/${paylinkSlug}?status=failed&ref=${reference}`;
    } else {
      const callbackBase = isRecharge
        ? `${APP_URL}/transfert`
        : `${APP_URL}/payment/callback`;
      success_url = `${callbackBase}?status=success&type=${type}&user_id=${user_id}`;
      error_url   = `${callbackBase}?status=failed&type=${type}&user_id=${user_id}`;
    }

    console.log("✅ success_url :", success_url);
    console.log("✅ error_url   :", error_url);

    // ── 5. Appel GeniusPay ────────────────────────────────────────
    const geniusPayload: any = {
      amount,
      currency,
      description: isPayLink ? (metadata.description ?? "Paiement Nexora PayLink") : getDescription(type),
      customer: isPayLink
        ? { name: customer?.name, phone: customer?.phone }
        : { email: user_email || undefined, name: user_name || undefined, phone: user_phone || undefined },
      payment_method: payment_method || undefined,
      success_url,
      error_url,
      metadata: isPayLink
        ? { ...metadata, paylink_id, reference, source: "nexora_paylink" }
        : { ...metadata, user_id, type, amount_net: String(amount_net ?? amount), source: "nexora" },
    };

    if (isPayLink && pays) geniusPayload.country = pays;

    console.log("📤 Payload GeniusPay :", JSON.stringify(geniusPayload));
    console.log("🔐 X-API-Key (début) :", GENIUSPAY_PUBLIC.substring(0, 10) + "...");

    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payments`, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "X-API-Key":     GENIUSPAY_PUBLIC,
        "X-API-Secret":  GENIUSPAY_SECRET,
        "Accept":        "application/json",
      },
      body: JSON.stringify(geniusPayload),
    });

    // ── 6. Lecture de la réponse GeniusPay ────────────────────────
    const rawText   = await geniusPayResponse.text();
    console.log("📥 GeniusPay HTTP status :", geniusPayResponse.status);
    console.log("📥 GeniusPay réponse brute :", rawText);

    let geniusData: any;
    try {
      geniusData = JSON.parse(rawText);
    } catch {
      console.error("❌ Réponse GeniusPay non-JSON :", rawText);
      return new Response(
        JSON.stringify({ success: false, error: `GeniusPay a retourné une réponse invalide : ${rawText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData     = geniusData.data ?? geniusData;
    const paymentUrl = txData.checkout_url ?? txData.payment_url ?? null;
    const paymentRef = txData.reference     ?? txData.id          ?? null;

    if (!geniusPayResponse.ok || !paymentUrl) {
      console.error("❌ GeniusPay a refusé la requête :", JSON.stringify(geniusData));
      return new Response(
        JSON.stringify({
          success: false,
          error: geniusData.message ?? geniusData.error ?? `Erreur GeniusPay HTTP ${geniusPayResponse.status}`,
          geniuspay_detail: geniusData,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ payment_url obtenu :", paymentUrl);

    // ── 7. Enregistrement de la transaction ──────────────────────
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (isPayLink) {
      // Pour PayLink : mettre à jour nexora_paylink_payments (non bloquant)
      supabase
        .from("nexora_paylink_payments")
        .update({
          geniuspay_payment_id: String(paymentRef),
          checkout_url: paymentUrl,
        })
        .eq("reference", reference)
        .then(({ error: upErr }) => {
          if (upErr) console.error("⚠️ Mise à jour paylink_payments (non bloquant) :", upErr.message);
        });
    } else {
      // Pour les autres types : insérer dans nexora_transactions
      const frais = isRecharge ? 100 : 0;
      const { error: txError } = await supabase
        .from("nexora_transactions")
        .insert({
          user_id,
          type,
          amount,
          amount_net:   amount_net ?? (amount - frais),
          frais,
          currency,
          status:       "pending",
          moneroo_id:   String(paymentRef),
          checkout_url: paymentUrl,
          metadata: {
            ...metadata,
            user_id,
            type,
            amount_net: String(amount_net ?? (amount - frais)),
          },
        });
      if (txError) {
        console.error("⚠️  Erreur création transaction (non bloquant) :", JSON.stringify(txError));
      }
    }

    return new Response(
      JSON.stringify({
        success:     true,
        payment_url: paymentUrl,
        payment_id:  String(paymentRef),
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

function getDescription(type: string): string {
  switch (type) {
    case "abonnement_premium": return "Abonnement Nexora Premium - 1 mois";
    case "recharge_transfert": return "Recharge portefeuille Nexora Transfert";
    default:                   return "Paiement Nexora";
  }
}
