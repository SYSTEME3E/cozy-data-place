// supabase/functions/expire-payments/index.ts
// ============================================================
//  COZY DATA PLACE — Expire Payments
//  Appelée toutes les minutes par pg_cron (ou manuellement).
//  Marque comme "échoué" tout paiement en attente depuis +10 min.
//
//  Tables concernées :
//    • commandes          — statut_paiement: 'en_attente' | statut: 'nouvelle'
//    • nexora_paylink_payments — statut: 'pending'
// ============================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const EXPIRY_MINUTES = 10;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  try {
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const cutoff = new Date(Date.now() - EXPIRY_MINUTES * 60 * 1000).toISOString();

    // ── 1. Expirer les commandes digitales en attente ────────────────────
    //       statut_paiement = 'en_attente' ET created_at < cutoff
    const { data: expiredCommandes, error: errCmd } = await (sb as any)
      .from("commandes")
      .update({
        statut_paiement: "echoue",
        statut:          "echouee",
        updated_at:      new Date().toISOString(),
      })
      .in("statut_paiement", ["en_attente"])
      .in("statut", ["nouvelle", "en_cours"])
      .lt("created_at", cutoff)
      .select("id, numero, boutique_id");

    if (errCmd) console.error("❌ Erreur expiration commandes :", errCmd.message);
    else console.log(`✅ Commandes expirées : ${expiredCommandes?.length ?? 0}`);

    // ── 2. Notifier les vendeurs pour chaque commande expirée ────────────
    if (expiredCommandes && expiredCommandes.length > 0) {
      // Récupérer boutique → user_id pour les notifications
      const boutiqueIds = [...new Set(expiredCommandes.map((c: any) => c.boutique_id))];
      const { data: boutiques } = await (sb as any)
        .from("boutiques")
        .select("id, user_id")
        .in("id", boutiqueIds);

      const boutiqueMap: Record<string, string> = {};
      for (const b of (boutiques ?? [])) boutiqueMap[b.id] = b.user_id;

      const notifications = expiredCommandes.map((c: any) => ({
        user_id: boutiqueMap[c.boutique_id],
        titre:   "⏱ Paiement expiré",
        message: `La commande #${c.numero} a expiré sans paiement (délai 10 min dépassé).`,
        type:    "warning",
        lu:      false,
      })).filter((n: any) => n.user_id);

      if (notifications.length > 0) {
        await (sb as any).from("nexora_notifications").insert(notifications);
      }
    }

    // ── 3. Expirer les PayLinks en attente ───────────────────────────────
    //       statut = 'pending' ET created_at < cutoff
    const { data: expiredPaylinks, error: errPl } = await (sb as any)
      .from("nexora_paylink_payments")
      .update({
        statut:     "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("statut", "pending")
      .lt("created_at", cutoff)
      .select("id, reference");

    if (errPl) console.error("❌ Erreur expiration paylinks :", errPl.message);
    else console.log(`✅ PayLinks expirés : ${expiredPaylinks?.length ?? 0}`);

    return json({
      success:           true,
      expiredAt:         new Date().toISOString(),
      commandes_expired: expiredCommandes?.length ?? 0,
      paylinks_expired:  expiredPaylinks?.length ?? 0,
    });

  } catch (e: any) {
    console.error("💥 Exception expire-payments :", e?.message);
    return json({ success: false, error: e?.message ?? "Erreur interne" }, 500);
  }
});
