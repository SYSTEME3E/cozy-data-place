// supabase/functions/geniuspay-payout/index.ts
// ✅ FIX PRINCIPAL : nexora_transactions n'a PAS de colonne amount_net → supprimée de tous les inserts
// ✅ FIX : Mapping réseau (ex: "MTN MoMo" → "mtn_money")
// ✅ FIX : Déduction immédiate du solde + restitution si GeniusPay rejette
// ✅ FIX : Toujours insérer dans nexora_transactions (même si GeniusPay échoue)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const GENIUSPAY_API_URL = "https://pay.genius.ci/api/v1/merchant";
const GENIUSPAY_PUBLIC  = Deno.env.get("GENIUSPAY_PUBLIC_KEY") ?? "";
const GENIUSPAY_SECRET  = Deno.env.get("GENIUSPAY_SECRET_KEY") ?? "";

const RESEAU_CODES: Record<string, string> = {
  "wave": "wave", "Wave": "wave",
  "orange_money": "orange_money", "Orange Money": "orange_money",
  "Orange Money CI": "orange_money", "Orange Money SN": "orange_money",
  "mtn_money": "mtn_money", "MTN MoMo": "mtn_money", "MTN MoMo CI": "mtn_money",
  "moov_money": "moov_money", "Moov Money": "moov_money", "Flooz": "moov_money",
  "Free Money": "orange_money", "T-Money": "mtn_money",
  "Airtel Money": "airtel_money", "airtel_money": "airtel_money",
  "M-Pesa": "mpesa", "Tigo Pesa": "tigo",
  "Vodacom": "vodacom", "Vodafone Cash": "vodafone",
  "AirtelTigo Money": "airteltigo", "Glo Pay": "glo",
  "Africell Money": "africell", "Maroc Telecom": "iam", "Lonestar Money": "lonestar",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      type, amount, frais = 0, user_id, user_email,
      user_first_name, user_last_name, pays, reseau, reseau_label,
      numero_mobile, metadata = {}
    } = body;

    if (!user_id || !amount || !type || !numero_mobile) {
      return new Response(JSON.stringify({ success: false, error: "Paramètres manquants" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!GENIUSPAY_SECRET || !GENIUSPAY_PUBLIC) {
      return new Response(JSON.stringify({ success: false, error: "Clés API GeniusPay non configurées." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ✅ Normaliser le code réseau pour GeniusPay
    const reseauCode    = RESEAU_CODES[reseau] ?? reseau.toLowerCase().replace(/\s+/g, "_");
    const reseauDisplay = reseau_label ?? reseau;
    const nomBeneficiaire = `${user_first_name ?? ""} ${user_last_name ?? ""}`.trim();
    const amountNet = amount - frais;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── 1. Vérifier le solde ──
    const { data: compte } = await supabase
      .from("nexora_transfert_comptes").select("solde").eq("user_id", user_id).maybeSingle();
    const soldeActuel = compte?.solde ?? 0;

    if (soldeActuel < amount) {
      return new Response(JSON.stringify({ success: false, error: "Solde insuffisant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── 2. Créer le payout en DB (status "pending") ──
    const { data: payout, error: payoutErr } = await supabase
      .from("nexora_payouts")
      .insert({
        user_id, type, amount, amount_net: amountNet, frais,
        currency: "XOF", status: "pending",
        nom_beneficiaire: nomBeneficiaire,
        numero: numero_mobile, pays,
        reseau: reseauDisplay,
        metadata: {
          ...metadata,
          reseau_code: reseauCode,
          pays_flag: metadata.pays_flag ?? "",
          pays_code: metadata.pays_code ?? "",
        },
      })
      .select().single();

    if (payoutErr) {
      console.error("Erreur création payout:", JSON.stringify(payoutErr));
      return new Response(JSON.stringify({ success: false, error: "Erreur création du transfert" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── 3. ✅ Déduire le solde IMMÉDIATEMENT ──
    const newSolde = Math.max(0, soldeActuel - amount);
    await supabase.from("nexora_transfert_comptes")
      .upsert({ user_id, solde: newSolde, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    console.log(`💳 Solde déduit: ${user_id} → ${newSolde} FCFA`);

    // ── 4. Appel GeniusPay ──
    console.log("Appel GeniusPay payout — réseau code:", reseauCode);
    const geniusPayResponse = await fetch(`${GENIUSPAY_API_URL}/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    GENIUSPAY_PUBLIC,
        "X-API-Secret": GENIUSPAY_SECRET,
        "Accept":       "application/json",
      },
      body: JSON.stringify({
        amount: amountNet,
        currency: "XOF",
        description: `Transfert Nexora vers ${pays} - ${reseauDisplay}`,
        recipient: {
          name:         nomBeneficiaire,
          phone:        numero_mobile,
          email:        user_email ?? undefined,
          mobile_money: reseauCode,
          country:      metadata.pays_code ?? "",
        },
        metadata: { ...metadata, user_id, payout_id: payout.id, type },
      }),
    });

    const geniusData = await geniusPayResponse.json();
    console.log("GeniusPay payout status:", geniusPayResponse.status, JSON.stringify(geniusData));

    // ── 5. GeniusPay rejette → restituer le solde + marquer failed ──
    if (!geniusPayResponse.ok) {
      console.error("GeniusPay payout error:", geniusData);

      await supabase.from("nexora_payouts").update({ status: "failed" }).eq("id", payout.id);

      // ✅ Restituer le solde
      await supabase.from("nexora_transfert_comptes")
        .upsert({ user_id, solde: soldeActuel, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

      // ✅ INSERT dans nexora_transactions (sans amount_net - colonne inexistante)
      await supabase.from("nexora_transactions").insert({
        user_id,
        type: "retrait_transfert",
        amount,
        frais,
        currency: "XOF",
        status: "failed",
        moneroo_id: payout.id,
        metadata: {
          ...metadata,
          nom_beneficiaire: nomBeneficiaire,
          telephone: numero_mobile,
          reseau: reseauDisplay,
          pays,
          error: geniusData.message ?? geniusData.error ?? `HTTP ${geniusPayResponse.status}`,
        },
      });

      await supabase.from("nexora_notifications").insert({
        user_id, titre: "⚠️ Transfert refusé",
        message: `Transfert de ${amountNet} FCFA vers ${pays} refusé. Solde restitué.`,
        type: "error",
      });

      return new Response(JSON.stringify({
        success: false,
        error: geniusData.message ?? geniusData.error ?? `Erreur GeniusPay (HTTP ${geniusPayResponse.status})`,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const txData    = geniusData.data ?? geniusData;
    const payoutRef = txData.reference ?? txData.id ?? payout.id;
    const isSuccess = ["success", "completed"].includes(txData.status ?? "");

    // ── 6. Mettre à jour le payout ──
    await supabase.from("nexora_payouts")
      .update({ status: isSuccess ? "completed" : "pending", moneroo_id: String(payoutRef) })
      .eq("id", payout.id);

    // ── 7. ✅ INSERT dans nexora_transactions (sans amount_net) ──
    await supabase.from("nexora_transactions").insert({
      user_id,
      type: "retrait_transfert",
      amount,
      frais,
      currency: "XOF",
      status: isSuccess ? "completed" : "pending",
      completed_at: isSuccess ? new Date().toISOString() : null,
      moneroo_id: String(payoutRef),
      metadata: {
        ...metadata,
        nom_beneficiaire: nomBeneficiaire,
        telephone: numero_mobile,
        reseau: reseauDisplay,
        pays_flag: metadata.pays_flag ?? "",
        pays,
      },
    });

    // ── 8. Notification ──
    await supabase.from("nexora_notifications").insert({
      user_id,
      titre: isSuccess ? "📤 Transfert envoyé" : "⏳ Transfert en cours",
      message: `${amountNet} FCFA → ${pays} (${reseauDisplay}) — Réf: ${payoutRef}`,
      type: isSuccess ? "success" : "info",
    });

    console.log(`${isSuccess ? "✅" : "⏳"} Payout ${payoutRef} pour ${user_id} — ${amountNet} FCFA → ${pays}`);

    return new Response(JSON.stringify({
      success: true,
      payout_id: payout.id,
      reference: String(payoutRef),
      status: isSuccess ? "completed" : "pending",
      message: isSuccess ? "Transfert envoyé avec succès" : "Transfert en cours de traitement",
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err: any) {
    console.error("geniuspay-payout error:", err?.message, err?.stack);
    return new Response(JSON.stringify({ success: false, error: err.message ?? "Erreur interne" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
