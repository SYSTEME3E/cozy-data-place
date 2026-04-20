// supabase/functions/geniuspay-payout/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : initie un retrait / transfert via GeniusPay
// ✅ CORRECTIONS APPLIQUÉES :
//   1. Clé lue sous GENIUSPAY_PUBLIC_KEY (tout en majuscules — cohérent avec Supabase Secrets)
//   2. Réseau converti en code API GeniusPay (ex: "MTN MoMo" → "mtn_money")
//   3. Déduction du solde immédiate dès que GeniusPay accepte la demande
//   4. Si GeniusPay échoue ensuite → webhook "cashout.failed" rembourse automatiquement
//   5. Logs détaillés pour faciliter le débogage dans Supabase Dashboard
// ─────────────────────────────────────────────────────────────────

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";

// ✅ FIX #1 — Noms de variables 100% en MAJUSCULES
// Dans Supabase Dashboard → Settings → Edge Functions → Secrets :
//   GENIUSPAY_PUBLIC_KEY  → votre pk_live_...
//   GENIUSPAY_SECRET_KEY  → votre sk_live_...
// ⚠️  "GENIUSPAY_Public_KEY" ≠ "GENIUSPAY_PUBLIC_KEY" — le casing compte !
const GENIUSPAY_PUBLIC = Deno.env.get("GENIUSPAY_PUBLIC_KEY") ?? "";
const GENIUSPAY_SECRET = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";

// Logs au démarrage — visibles dans Supabase Dashboard > Edge Functions > Logs
console.log("🔑 GENIUSPAY_PUBLIC_KEY présent :", !!GENIUSPAY_PUBLIC, "| longueur :", GENIUSPAY_PUBLIC.length);
console.log("🔑 GENIUSPAY_SECRET_KEY présent :", !!GENIUSPAY_SECRET, "| longueur :", GENIUSPAY_SECRET.length);

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ✅ FIX #2 — Mapping complet nom réseau → code API GeniusPay
// GeniusPay attend un identifiant technique (snake_case), pas un nom lisible
const RESEAU_CODES: Record<string, string> = {
  // Afrique de l'Ouest - XOF
  "MTN MoMo":         "mtn_money",
  "Moov Money":       "moov_money",
  "Orange Money":     "orange_money",
  "Wave":             "wave",
  "Free Money":       "orange_money",  // Free Money Sénégal = infra Orange
  "Flooz":            "moov_money",    // Flooz = Moov Togo
  "T-Money":          "mtn_money",     // T-Money = réseau MTN Togo
  "Airtel Money":     "airtel_money",
  // Afrique Centrale - XAF
  "Vodacom":          "vodacom",
  // Afrique de l'Est
  "M-Pesa":           "mpesa",
  "Tigo Pesa":        "tigo_pesa",
  "Vodafone Cash":    "vodafone_cash",
  "AirtelTigo Money": "airtel_money",
  "Lonestar Money":   "lonestar",
  "Africell Money":   "africell",
  "QCell":            "qcell",
  "Maroc Telecom":    "maroc_telecom",
  // Fallbacks — au cas où le frontend enverrait déjà les codes techniques
  "mtn_money":        "mtn_money",
  "moov_money":       "moov_money",
  "orange_money":     "orange_money",
  "wave":             "wave",
  "airtel_money":     "airtel_money",
  "mpesa":            "mpesa",
  "vodacom":          "vodacom",
};

/** Convertit un nom de réseau en code API GeniusPay.
 *  Si inconnu, génère un code standardisé en snake_case lowercase. */
function toReseauCode(reseau: string): string {
  return RESEAU_CODES[reseau] ?? reseau.toLowerCase().replace(/[\s\-()+]+/g, "_");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {

    // ── 0. Vérification des clés API dès l'entrée ──────────────────
    if (!GENIUSPAY_PUBLIC || !GENIUSPAY_SECRET) {
      console.error("❌ Clés GeniusPay non configurées !");
      console.error("   → Supabase Dashboard > Settings > Edge Functions > Secrets");
      console.error("   → Vérifiez : GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY (tout en MAJUSCULES)");
      return new Response(
        JSON.stringify({
          success: false,
          error:   "Clés API GeniusPay manquantes. Vérifiez GENIUSPAY_PUBLIC_KEY et GENIUSPAY_SECRET_KEY dans Supabase Secrets.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 1. Parse du body ───────────────────────────────────────────
    let body: any;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Body JSON invalide" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    console.log("📥 Payout request:", { type, amount, pays, reseau, numero_mobile, user_id });

    if (!user_id || !amount || !type || !numero_mobile || !reseau || !pays) {
      return new Response(
        JSON.stringify({
          success: false,
          error:   "Paramètres manquants (user_id, amount, type, numero_mobile, reseau, pays — tous requis)",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 2. Vérifier le solde de l'utilisateur ──────────────────────
    const { data: compte } = await supabase
      .from("nexora_transfert_comptes")
      .select("solde")
      .eq("user_id", user_id)
      .maybeSingle();

    const soldeActuel = compte?.solde ?? 0;
    console.log(`💰 Solde actuel de ${user_id}: ${soldeActuel} FCFA | Demande: ${amount} FCFA`);

    if (soldeActuel < amount) {
      return new Response(
        JSON.stringify({ success: false, error: `Solde insuffisant — disponible : ${soldeActuel} FCFA` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const nomBeneficiaire = `${user_first_name ?? ""} ${user_last_name ?? ""}`.trim() || "Client NEXORA";
    const amountNet       = amount_net ?? Math.max(0, amount - frais);

    // ✅ FIX #2 — Convertir le nom de réseau en code API avant envoi à GeniusPay
    const reseauCode    = toReseauCode(reseau);
    const numeroNettoye = numero_mobile.replace(/[\s\-()+]/g, "");

    console.log(`🔄 Réseau: "${reseau}" → code API GeniusPay: "${reseauCode}"`);
    console.log(`📱 Numéro nettoyé: ${numeroNettoye}`);

    // ── 3. Créer le payout en DB avec statut "pending" ─────────────
    const { data: payout, error: payoutErr } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id,
        type,
        amount,
        amount_net:       amountNet,
        frais,
        currency:         "XOF",
        status:           "pending",
        nom_beneficiaire: nomBeneficiaire,
        numero:           numeroNettoye,
        pays,
        reseau,
        metadata: {
          ...metadata,
          pays_flag:   metadata.pays_flag ?? "",
          pays_code:   metadata.pays_code ?? "",
          reseau_code: reseauCode,
        },
      })
      .select()
      .single();

    if (payoutErr) {
      console.error("❌ Erreur création payout en DB:", JSON.stringify(payoutErr));
      return new Response(
        JSON.stringify({ success: false, error: "Erreur création du transfert en base de données" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Payout créé en DB — id:", payout.id);

    // ── 4. Appel API GeniusPay ──────────────────────────────────────
    const geniusPayload = {
      amount:      amountNet,  // montant net reçu par le destinataire
      currency:    "XOF",
      description: `Transfert Nexora vers ${pays} - ${reseau}`,
      recipient: {
        name:         nomBeneficiaire,
        phone:        numeroNettoye,
        email:        user_email ?? undefined,
        mobile_money: reseauCode,  // ✅ FIX #2 — code technique, pas nom lisible
        country:      metadata.pays_code ?? "",
      },
      metadata: {
        ...metadata,
        user_id,
        payout_id: payout.id,
        type,
      },
    };

    console.log("📤 Appel GeniusPay →", `${GENIUSPAY_API_URL}/payouts`);
    console.log("📤 Payload envoyé :", JSON.stringify(geniusPayload));

    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payouts`, {
      method:  "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    GENIUSPAY_PUBLIC,
        "X-API-Secret": GENIUSPAY_SECRET,
        "Accept":       "application/json",
      },
      body: JSON.stringify(geniusPayload),
    });

    // Lire la réponse en texte brut pour éviter les crashs de parsing
    const rawText = await geniusPayResponse.text();
    console.log("📥 GeniusPay HTTP status :", geniusPayResponse.status);
    console.log("📥 GeniusPay réponse brute :", rawText);

    let geniusData: any;
    try {
      geniusData = JSON.parse(rawText);
    } catch {
      console.error("❌ Réponse GeniusPay non-JSON :", rawText);
      await supabase.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);
      return new Response(
        JSON.stringify({ success: false, error: `GeniusPay a retourné une réponse invalide : ${rawText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 5. GeniusPay a rejeté la demande (HTTP 4xx / 5xx) ──────────
    if (!geniusPayResponse.ok) {
      const errMsg = geniusData?.message ?? geniusData?.error ?? `Erreur GeniusPay HTTP ${geniusPayResponse.status}`;
      console.error("❌ GeniusPay payout rejeté :", errMsg, JSON.stringify(geniusData));

      await supabase.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);

      await supabase.from("nexora_notifications").insert({
        user_id,
        titre:   "⚠️ Transfert refusé",
        message: `Votre transfert de ${amountNet} FCFA a été refusé par l'opérateur : ${errMsg}`,
        type:    "error",
      });

      return new Response(
        JSON.stringify({ success: false, error: errMsg, detail: geniusData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 6. GeniusPay a accepté la demande (HTTP 200 / 201) ─────────
    const txData       = geniusData.data ?? geniusData;
    const payoutRef    = String(txData.reference ?? txData.id ?? payout.id);
    const payoutStatus = txData.status ?? "pending";
    const isCompleted  = payoutStatus === "success" || payoutStatus === "completed";

    console.log(`✅ GeniusPay accepté — ref: ${payoutRef} | statut: ${payoutStatus}`);

    // ── 7. Mettre à jour le payout avec la référence GeniusPay ─────
    await supabase
      .from("nexora_payouts")
      .update({
        status:     isCompleted ? "completed" : "pending",
        moneroo_id: payoutRef,
        ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
      })
      .eq("id", payout.id);

    // ── 8. Enregistrer dans nexora_transactions ────────────────────
    await supabase.from("nexora_transactions").insert({
      user_id,
      type:         "retrait_transfert",
      amount,
      amount_net:   amountNet,
      frais,
      currency:     "XOF",
      status:       isCompleted ? "completed" : "pending",
      completed_at: isCompleted ? new Date().toISOString() : null,
      moneroo_id:   payoutRef,
      metadata: {
        ...metadata,
        nom_beneficiaire: nomBeneficiaire,
        telephone:        numeroNettoye,
        reseau,
        reseau_code:      reseauCode,
        pays,
      },
    });

    // ✅ FIX #3 — Déduire le solde dès que GeniusPay accepte la demande
    // Que le statut soit "pending" ou "completed", GeniusPay a pris en charge le transfert.
    // En cas d'échec ultérieur, GeniusPay envoie "cashout.failed" → le webhook
    // geniuspay-webhook/index.ts rembourse automatiquement le solde.
    const newSolde = Math.max(0, soldeActuel - amount);
    await supabase
      .from("nexora_transfert_comptes")
      .upsert(
        { user_id, solde: newSolde, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );

    console.log(`💰 Solde déduit : ${soldeActuel} → ${newSolde} FCFA pour ${user_id}`);

    // ── 9. Notification utilisateur ───────────────────────────────
    if (isCompleted) {
      await supabase.from("nexora_notifications").insert({
        user_id,
        titre:   "✅ Transfert réussi",
        message: `${amountNet} FCFA envoyés vers ${pays} (${reseau}) — Réf: ${payoutRef}`,
        type:    "success",
      });
      console.log(`✅ Payout ${payoutRef} COMPLÉTÉ immédiatement pour ${user_id}`);
    } else {
      await supabase.from("nexora_notifications").insert({
        user_id,
        titre:   "⏳ Transfert en cours",
        message: `Votre transfert de ${amountNet} FCFA vers ${pays} (${reseau}) est en cours. Réf: ${payoutRef}`,
        type:    "info",
      });
      console.log(`⏳ Payout ${payoutRef} EN ATTENTE de confirmation GeniusPay pour ${user_id}`);
    }

    return new Response(
      JSON.stringify({
        success:   true,
        payout_id: payout.id,
        reference: payoutRef,
        status:    isCompleted ? "completed" : "pending",
        message:   isCompleted
          ? "Transfert effectué avec succès"
          : "Transfert initié — en cours de traitement",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("💥 geniuspay-payout exception:", err?.message, err?.stack);
    return new Response(
      JSON.stringify({ success: false, error: err?.message ?? "Erreur interne du serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
