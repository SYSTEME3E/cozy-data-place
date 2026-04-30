/**
 * NEXORA — Utilitaires commissions (Affiliation formations uniquement)
 * MLM multi-niveaux supprimé. Seul système : affilié direct 30% sur vente formation.
 */

import { supabase } from "@/integrations/supabase/client";

// ── Taux de commission affiliation ────────────────────────────────────────────

export const FORMATION_AFFILIATE_RATE = 0.30; // 30% pour l'affilié direct

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

// ── Distribution commission FORMATION (affilié direct uniquement) ─────────────

export async function distributeFormationCommissions(
  buyerId: string,
  affiliateId: string | null,
  amount: number,
  purchaseId: string,
  currency: string = "XOF"
): Promise<void> {
  if (!affiliateId || affiliateId === buyerId) return;

  const commissionAmount = Math.round(amount * FORMATION_AFFILIATE_RATE);
  if (commissionAmount <= 0) return;

  const commission = {
    from_user_id: buyerId,
    to_user_id: affiliateId,
    level: 0, // 0 = affilié direct
    amount: commissionAmount,
    currency,
    type: "formation",
    reference_id: purchaseId,
    status: "credited",
  };

  // Insérer la commission
  await (supabase as any).from("affiliate_commissions").insert(commission).catch((e: any) => {
    console.warn("distributeFormationCommissions insert error:", e);
  });

  // Créditer le solde de l'affilié
  const { data: userData } = await (supabase as any)
    .from("nexora_users")
    .select("solde_commissions")
    .eq("id", affiliateId)
    .maybeSingle();

  const current = userData?.solde_commissions ?? 0;
  await (supabase as any)
    .from("nexora_users")
    .update({ solde_commissions: current + commissionAmount })
    .eq("id", affiliateId);

  // Notifier l'affilié
  await (supabase as any).from("nexora_notifications").insert({
    user_id: affiliateId,
    titre: "💰 Commission formation reçue !",
    message: `Affilié direct : +${formatMontant(commissionAmount)} crédité sur votre solde.`,
    type: "success",
    lu: false,
  }).catch(() => {});

  // Notifier les admins
  await notifyAdmins(
    "🎓 Achat de formation",
    `Nouvelle formation achetée. Commission affilié : ${formatMontant(commissionAmount)}.`,
    "success"
  );
}

// ── Helpers affichage ────────────────────────────────────────────────────────

export function formatMontant(amount: number, currency = "XOF"): string {
  return new Intl.NumberFormat("fr-FR").format(amount) + " " + currency;
}

export function getLevelLabel(level: number): string {
  return level === 0 ? "Affilié direct" : `Niveau ${level}`;
}

export function getCommissionTypeLabel(type: string): string {
  return type === "formation" ? "Formation" : type;
}
