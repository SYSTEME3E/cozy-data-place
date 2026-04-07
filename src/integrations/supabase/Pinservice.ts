import { supabase } from "@/integrations/supabase/client";

const PIN_SALT = "nexora_pin_secure_salt_2024";

/** Hash a PIN using SHA-256 with salt */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + PIN_SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Check if user has already set a PIN */
export async function hasPinSet(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("nexora_users" as any)
    .select("has_set_pin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return (data as any).has_set_pin === true;
}

/** Verify a PIN against the stored hash */
export async function verifyPin(userId: string, pin: string): Promise<boolean> {
  const pinHash = await hashPin(pin);

  const { data, error } = await supabase
    .from("nexora_users" as any)
    .select("security_pin")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return false;
  return (data as any).security_pin === pinHash;
}

/** Set or update a user's PIN */
export async function setPin(userId: string, pin: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: "Le code PIN doit contenir exactement 4 chiffres." };
    }

    const pinHash = await hashPin(pin);

    const { error } = await supabase
      .from("nexora_users" as any)
      .update({
        security_pin: pinHash,
        has_set_pin: true,
        pin_updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (error) {
      console.error("Erreur setPin:", error);
      return { success: false, error: "Impossible d'enregistrer le code PIN." };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur inattendue setPin:", err);
    return { success: false, error: "Une erreur inattendue s'est produite." };
  }
}

/** Admin: Reset a user's PIN (clears the hash and has_set_pin flag) */
export async function adminResetPin(
  adminUserId: string,
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Verify the caller is admin
    const { data: admin, error: adminErr } = await supabase
      .from("nexora_users" as any)
      .select("is_admin")
      .eq("id", adminUserId)
      .maybeSingle();

    if (adminErr || !admin || !(admin as any).is_admin) {
      return { success: false, error: "Accès refusé. Droits administrateur requis." };
    }

    const { error } = await supabase
      .from("nexora_users" as any)
      .update({
        security_pin: null,
        has_set_pin: false,
        pin_updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (error) {
      console.error("Erreur adminResetPin:", error);
      return { success: false, error: "Impossible de réinitialiser le PIN." };
    }

    return { success: true };
  } catch (err) {
    console.error("Erreur inattendue adminResetPin:", err);
    return { success: false, error: "Une erreur inattendue s'est produite." };
  }
}

/** Admin: Set a specific PIN for a user */
export async function adminSetPin(
  adminUserId: string,
  targetUserId: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!/^\d{4}$/.test(newPin)) {
      return { success: false, error: "Le code PIN doit contenir exactement 4 chiffres." };
    }

    // Verify the caller is admin
    const { data: admin, error: adminErr } = await supabase
      .from("nexora_users" as any)
      .select("is_admin")
      .eq("id", adminUserId)
      .maybeSingle();

    if (adminErr || !admin || !(admin as any).is_admin) {
      return { success: false, error: "Accès refusé. Droits administrateur requis." };
    }

    const pinHash = await hashPin(newPin);

    const { error } = await supabase
      .from("nexora_users" as any)
      .update({
        security_pin: pinHash,
        has_set_pin: true,
        pin_updated_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);

    if (error) {
      return { success: false, error: "Impossible de définir le PIN." };
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: "Une erreur inattendue s'est produite." };
  }
}
