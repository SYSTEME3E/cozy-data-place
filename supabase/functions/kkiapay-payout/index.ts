// supabase/functions/kkiapay-payout/index.ts
// ═══════════════════════════════════════════════════════════════════
//  Edge Function : Retrait / Cashout Mobile Money via KKiaPay
//
//  Flux :
//    1. Front envoie la demande de retrait
//    2. Vérification du solde Nexora Transfert
//    3. Débit immédiat du solde (évite double dépense)
//    4. Appel API KKiaPay Transfer
//    5. KKiaPay accepte → payout "pending" → webhook confirmera
//    6. KKiaPay refuse  → remboursement + notification
// ═══════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const KKIAPAY_PRIVATE_KEY = Deno.env.get("KKIAPAY_PRIVATE_KEY") ?? "";
const KKIAPAY_PAYOUT_URL  = "https://api.kkiapay.me/api/v1/transfers";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const err = (msg: string, status = 400) =>
  json({ success: false, error: msg }, status);

// ── Mapping réseau → code KKiaPay ─────────────────────────────────
const RESEAU_MAP: Record<string, string> = {
  "MTN MoMo":         "mtn",
  "MTN Mobile Money": "mtn",
  "mtn_money":        "mtn",
  "mtn":              "mtn",
  "Moov Money":       "moov",
  "moov_money":       "moov",
  "moov":             "moov",
  "Flooz":            "moov",
  "Orange Money":     "orange",
  "orange_money":     "orange",
  "orange":           "orange",
  "Free Money":       "orange",
  "Wave":             "wave",
  "wave":             "wave",
  "Airtel Money":     "airtel",
  "airtel":           "airtel",
  "T-Money":          "mtn",
  "M-Pesa":           "mpesa",
  "mpesa":            "mpesa",
  "Vodacom":          "mpesa",
  "Vodafone Cash":    "vodafone",
  "AirtelTigo Money": "airtel",
  "Lonestar Money":   "mtn",
  "Africell Money":   "africell",
};

function toKkiaCode(reseau: string): string {
  return RESEAU_MAP[reseau] ?? reseau.toLowerCase().replace(/[\s\-()+]+/g, "");
}

// ─────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    if (!KKIAPAY_PRIVATE_KEY)
      return err("KKIAPAY_PRIVATE_KEY non configurée dans Supabase Secrets.", 500);

    let body: any;
    try { body = await req.json(); }
    catch { return err("Body JSON invalide"); }

    const {
      type,
      amount,
      frais = 0,
      user_id,
      user_first_name,
      user_last_name,
      user_email,
      pays,
      reseau,
      numero_mobile,
      nom_beneficiaire,
      metadata = {},
    } = body;

    console.log("📥 kkiapay-payout :", { type, amount, pays, reseau, numero_mobile, user_id });

    const missing = [
      !user_id       && "user_id",
      !amount        && "amount",
      !type          && "type",
      !numero_mobile && "numero_mobile",
      !reseau        && "reseau",
      !pays          && "pays",
    ].filter(Boolean) as string[];

    if (missing.length) return err(`Paramètres manquants : ${missing.join(", ")}`);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Vérifier le solde ─────────────────────────────────────────
    const { data: compte } = await sb
      .from("nexora_transfert_comptes")
      .select("solde")
      .eq("user_id", user_id)
      .maybeSingle();

    const solde = compte?.solde ?? 0;
    console.log(`💰 Solde ${user_id} : ${solde} FCFA | Demande : ${amount} FCFA`);

    if (solde < amount)
      return err(`Solde insuffisant — disponible : ${solde.toLocaleString("fr-FR")} FCFA`);

    const amountNet  = Math.max(0, amount - frais);
    const reseauCode = toKkiaCode(reseau);
    const numero     = numero_mobile.replace(/[\s\-()+]/g, "");
    const nomBenef   = nom_beneficiaire
      || `${user_first_name ?? ""} ${user_last_name ?? ""}`.trim()
      || "Client NEXORA";

    console.log(`🔄 Réseau "${reseau}" → "${reseauCode}" | Numéro : ${numero}`);

    // ── Créer le payout en DB ─────────────────────────────────────
    const { data: payout, error: payoutErr } = await sb
      .from("nexora_payouts")
      .insert({
        user_id, type, amount,
        amount_net:       amountNet,
        frais, currency:  "XOF",
        status:           "pending",
        nom_beneficiaire: nomBenef,
        numero, pays, reseau,
        metadata: { ...metadata, reseau_code: reseauCode, source: "kkiapay" },
      })
      .select().single();

    if (payoutErr || !payout) {
      console.error("❌ Erreur création payout :", JSON.stringify(payoutErr));
      return err("Erreur création du transfert en base de données", 500);
    }

    // ── Débiter le solde AVANT l'appel KKiaPay ───────────────────
    const newSolde = Math.max(0, solde - amount);
    await sb.from("nexora_transfert_comptes").upsert(
      { user_id, solde: newSolde, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
    console.log(`💸 Solde débité : ${solde} → ${newSolde} FCFA`);

    // ── Appel KKiaPay Transfer ────────────────────────────────────
    const kkiaPayload = {
      amount:      amountNet,
      phoneNumber: numero,
      fullname:    nomBenef,
      reason:      `Transfert Nexora — ${pays} (${reseau})`,
      data: JSON.stringify({ user_id, payout_id: payout.id, type, ...metadata }),
    };

    console.log("📤 KKiaPay Transfer payload :", JSON.stringify(kkiaPayload));

    const kkiaResp = await fetch(KKIAPAY_PAYOUT_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json", "x-private-key": KKIAPAY_PRIVATE_KEY },
      body:    JSON.stringify(kkiaPayload),
    });

    const rawText = await kkiaResp.text();
    console.log("📥 KKiaPay payout HTTP :", kkiaResp.status, "| body :", rawText);

    let kkia: any;
    try { kkia = JSON.parse(rawText); }
    catch {
      await rembourser(sb, user_id, payout.id, newSolde, amount, "Réponse KKiaPay invalide");
      return err(`Réponse KKiaPay invalide : ${rawText.slice(0, 200)}`, 502);
    }

    // ── KKiaPay refuse ────────────────────────────────────────────
    if (!kkiaResp.ok) {
      const errMsg = kkia?.message ?? kkia?.error ?? `Erreur KKiaPay HTTP ${kkiaResp.status}`;
      console.error("❌ KKiaPay payout refusé :", errMsg);
      await rembourser(sb, user_id, payout.id, newSolde, amount, errMsg);
      return err(errMsg);
    }

    // ── KKiaPay accepte ───────────────────────────────────────────
    const txData      = kkia.data ?? kkia;
    const payoutRef   = String(txData.transactionId ?? txData.id ?? payout.id);
    const payStatus   = txData.status ?? "pending";
    const isCompleted = ["SUCCESS", "COMPLETE"].includes(payStatus);

    await sb.from("nexora_payouts").update({
      status:     isCompleted ? "completed" : "pending",
      moneroo_id: payoutRef,
      ...(isCompleted ? { completed_at: new Date().toISOString() } : {}),
    }).eq("id", payout.id);

    await sb.from("nexora_transactions").insert({
      user_id,
      type:         "retrait_transfert",
      amount, amount_net: amountNet, frais,
      currency:     "XOF",
      status:       isCompleted ? "completed" : "pending",
      completed_at: isCompleted ? new Date().toISOString() : null,
      moneroo_id:   payoutRef,
      metadata: {
        ...metadata,
        nom_beneficiaire: nomBenef,
        telephone:        numero,
        reseau, reseau_code: reseauCode, pays,
        source: "kkiapay",
      },
    });

    await sb.from("nexora_notifications").insert({
      user_id,
      titre:   isCompleted ? "✅ Transfert réussi" : "⏳ Transfert en cours",
      message: isCompleted
        ? `${amountNet.toLocaleString("fr-FR")} FCFA envoyés vers ${pays} (${reseau}) — Réf: ${payoutRef}`
        : `Votre transfert de ${amountNet.toLocaleString("fr-FR")} FCFA vers ${pays} est en cours. Réf: ${payoutRef}`,
      type: isCompleted ? "success" : "info",
      lu:   false,
    });

    return json({
      success:   true,
      payout_id: payout.id,
      reference: payoutRef,
      status:    isCompleted ? "completed" : "pending",
      message:   isCompleted ? "Transfert effectué avec succès" : "Transfert initié — en cours de traitement",
    });

  } catch (e: any) {
    console.error("💥 Exception :", e?.message, e?.stack);
    return err(e?.message ?? "Erreur interne du serveur", 500);
  }
});

// ── Helper remboursement ──────────────────────────────────────────
async function rembourser(
  sb: any, userId: string, payoutId: string,
  soldeCourant: number, montant: number, raison = "Transfert refusé"
) {
  const soldeRembourse = soldeCourant + montant;
  await sb.from("nexora_payouts").update({ status: "failed" }).eq("id", payoutId);
  await sb.from("nexora_transfert_comptes").upsert(
    { user_id: userId, solde: soldeRembourse, updated_at: new Date().toISOString() },
    { onConflict: "user_id" }
  );
  await sb.from("nexora_notifications").insert({
    user_id: userId,
    titre:   "⚠️ Transfert refusé — Solde remboursé",
    message: `Transfert refusé (${raison}). ${montant.toLocaleString("fr-FR")} FCFA remboursés.`,
    type:    "error", lu: false,
  });
  console.log(`💸 Remboursement : ${userId} | ${soldeCourant} → ${soldeRembourse} FCFA`);
}
