/**
 * NEXORA MLM — Logique de distribution des commissions
 * Supporte : abonnements + formations
 * Niveaux : 1→30%, 2→10%, 3→5% (abonnement) | vendeur→30%, niv1→5% (formation)
 */

import { supabase } from "@/integrations/supabase/client";

// ── Taux de commission ────────────────────────────────────────────────────────

export const SUBSCRIPTION_RATES = {
  1: 0.30, // 30%
  2: 0.10, // 10%
  3: 0.05, // 5%
} as const;

export const FORMATION_RATES = {
  seller: 0.30, // 30% vendeur affilié direct
  1: 0.05,      // 5% niveau 1 (grand leader du vendeur)
} as const;

// ── Envoyer une notification à tous les admins ───────────────────────────────

export async function notifyAdmins(
  titre: string,
  message: string,
  type: string = "success"
): Promise<void> {
  try {
    const { data: admins } = await (supabase as any)
      .from("nexora_users")
      .select("id")
      .eq("is_admin", true);

    if (!admins || admins.length === 0) return;

    const notifications = admins.map((admin: any) => ({
      user_id: admin.id,
      titre,
      message,
      type,
      lu: false,
    }));

    await (supabase as any).from("nexora_notifications").insert(notifications);
  } catch (e) {
    console.warn("notifyAdmins error:", e);
  }
}

// ── Récupérer la chaîne de parrainage (jusqu'à 3 niveaux) ───────────────────

export async function getReferralChain(userId: string): Promise<string[]> {
  const chain: string[] = [];
  let currentId: string | null = userId;

  for (let i = 0; i < 3; i++) {
    const { data } = await (supabase as any)
      .from("nexora_users")
      .select("referrer_id")
      .eq("id", currentId)
      .maybeSingle();

    if (!data?.referrer_id) break;
    chain.push(data.referrer_id);
    currentId = data.referrer_id;
  }

  return chain;
}

// ── Distribution commissions ABONNEMENT ─────────────────────────────────────

export async function distributeSubscriptionCommissions(
  userId: string,
  amount: number,
  subscriptionId: string,
  currency: string = "XOF"
): Promise<void> {
  const chain = await getReferralChain(userId);
  if (chain.length === 0) return;

  const commissions = chain.map((toUserId, idx) => {
    const level = (idx + 1) as 1 | 2 | 3;
    const rate = SUBSCRIPTION_RATES[level] ?? 0;
    return {
      from_user_id: userId,
      to_user_id: toUserId,
      level,
      amount: Math.round(amount * rate),
      currency,
      type: "subscription",
      reference_id: subscriptionId,
      status: "credited",
    };
  });

  if (commissions.length === 0) return;

  // Insérer les commissions
  await (supabase as any).from("mlm_commissions").insert(commissions);

  // Créditer le solde de chaque bénéficiaire
  for (const c of commissions) {
    if (c.amount <= 0) continue;
    await (supabase as any).rpc("increment_solde_commissions", {
      user_id: c.to_user_id,
      montant: c.amount,
    }).catch(() => {
      // Fallback si la RPC n'existe pas encore
      (supabase as any)
        .from("nexora_users")
        .select("solde_commissions")
        .eq("id", c.to_user_id)
        .maybeSingle()
        .then(({ data }: any) => {
          const current = data?.solde_commissions ?? 0;
          (supabase as any)
            .from("nexora_users")
            .update({ solde_commissions: current + c.amount })
            .eq("id", c.to_user_id);
        });
    });

    // Notifier l'utilisateur qui reçoit la commission
    await (supabase as any).from("nexora_notifications").insert({
      user_id: c.to_user_id,
      titre: "💰 Commission abonnement reçue !",
      message: `Niveau ${c.level} : +${formatMontant(c.amount)} crédité sur votre solde commissions.`,
      type: "success",
      lu: false,
    }).catch(() => {});
  }

  // Notifier les admins
  await notifyAdmins(
    "🌟 Nouvel abonnement Premium",
    `Un utilisateur vient de souscrire un abonnement. ${commissions.length} commission(s) distribuée(s) pour ${formatMontant(commissions.reduce((s, c) => s + c.amount, 0))}.`,
    "success"
  );
}

// ── Distribution commissions FORMATION ──────────────────────────────────────

export async function distributeFormationCommissions(
  buyerId: string,
  affiliateId: string | null,
  amount: number,
  purchaseId: string,
  currency: string = "XOF"
): Promise<void> {
  const commissions: any[] = [];

  // Le vendeur affilié reçoit 30%
  if (affiliateId && affiliateId !== buyerId) {
    commissions.push({
      from_user_id: buyerId,
      to_user_id: affiliateId,
      level: 0, // 0 = vendeur direct
      amount: Math.round(amount * FORMATION_RATES.seller),
      currency,
      type: "formation",
      reference_id: purchaseId,
      status: "credited",
    });

    // Niveau 1 du vendeur reçoit 5%
    const { data: affiliateData } = await (supabase as any)
      .from("nexora_users")
      .select("referrer_id")
      .eq("id", affiliateId)
      .maybeSingle();

    if (affiliateData?.referrer_id) {
      commissions.push({
        from_user_id: buyerId,
        to_user_id: affiliateData.referrer_id,
        level: 1,
        amount: Math.round(amount * FORMATION_RATES[1]),
        currency,
        type: "formation",
        reference_id: purchaseId,
        status: "credited",
      });
    }
  }

  if (commissions.length === 0) return;

  await (supabase as any).from("mlm_commissions").insert(commissions);

  // Créditer les soldes
  for (const c of commissions) {
    if (c.amount <= 0) continue;
    const { data: userData } = await (supabase as any)
      .from("nexora_users")
      .select("solde_commissions")
      .eq("id", c.to_user_id)
      .maybeSingle();

    const current = userData?.solde_commissions ?? 0;
    await (supabase as any)
      .from("nexora_users")
      .update({ solde_commissions: current + c.amount })
      .eq("id", c.to_user_id);

    // Notifier l'utilisateur qui reçoit la commission
    const labelNiveau = c.level === 0 ? "Vendeur affilié" : `Niveau ${c.level}`;
    await (supabase as any).from("nexora_notifications").insert({
      user_id: c.to_user_id,
      titre: "💰 Commission formation reçue !",
      message: `${labelNiveau} : +${formatMontant(c.amount)} crédité sur votre solde.`,
      type: "success",
      lu: false,
    }).catch(() => {});
  }

  // Notifier les admins de l'achat + commissions
  await notifyAdmins(
    "🎓 Achat de formation",
    `Nouvelle formation achetée. ${commissions.length} commission(s) distribuée(s) pour un total de ${formatMontant(commissions.reduce((s, c) => s + c.amount, 0))}.`,
    "success"
  );
}

// ── Helpers affichage ────────────────────────────────────────────────────────

export function formatMontant(amount: number, currency = "XOF"): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

export function getLevelLabel(level: number): string {
  if (level === 0) return "Vendeur affilié";
  return `Niveau ${level}`;
}

export function getCommissionTypeLabel(type: string): string {
  return type === "subscription" ? "Abonnement" : "Formation";
}
