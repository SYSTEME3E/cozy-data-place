import { supabase } from "@/integrations/supabase/client";

// ─── Constantes ─────────────────────────────────────────────────────────────
export const NEXORA_SESSION_KEY = "nexora_session_token";
export const NEXORA_USER_KEY = "nexora_current_user";
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 heures


// ─── Types & Limites ──────────────────────────────────────────────────────────
export type NexoraPlan = "gratuit" | "boss" | "roi" | "admin";

export interface NexoraUser {
  id: string;
  nom_prenom: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  is_admin: boolean;
  plan: NexoraPlan;
  badge_premium: boolean;
}

// Configuration stricte des quotas par plan
export const PLAN_LIMITS = {
  gratuit: {
    produits: 5,
    factures: 10,
    prets: 2,
    prix: 0,
    label: "Gratuit",
  },
  boss: {
    produits: 20,
    factures: 100,
    prets: 10,
    prix: 10,
    label: "Boss",
  },
  roi: {
    produits: Infinity,
    factures: Infinity,
    prets: Infinity,
    prix: 20,
    label: "Roi",
  },
  admin: {
    produits: Infinity,
    factures: Infinity,
    prets: Infinity,
    prix: 0,
    label: "Administrateur",
  },
};

// ─── Hash sécurisé ────────────────────────────────────────────────────────────
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "nexora_secure_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Générer token sécurisé ───────────────────────────────────────────────────
function generateToken(): string {
  const array = new Uint8Array(48);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ─── Vérification des Quotas ──────────────────────────────────────────────────
export async function canUserAdd(
  type: "produits" | "factures"
): Promise<{ can: boolean; current: number; limit: number }> {
  const user = getNexoraUser();
  if (!user) return { can: false, current: 0, limit: 0 };

  const limits = PLAN_LIMITS[user.plan as NexoraPlan] || PLAN_LIMITS.gratuit;
  const limit = limits[type];

  if (limit === Infinity) return { can: true, current: 0, limit: Infinity };

  const { count, error } = await supabase
    .from(type as any)
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id);

  const currentCount = count || 0;
  return {
    can: currentCount < limit,
    current: currentCount,
    limit: limit,
  };
}

// ─── Inscription ──────────────────────────────────────────────────────────────
export async function registerUser(data: {
  nom_prenom: string;
  username: string;
  email: string;
  password: string;
  whatsapp?: string;
  referrer_code?: string | null; // ✅ Code parrain passé depuis /register?ref=XXX
}): Promise<{ success: boolean; error?: string }> {
  try {
    // Vérifier si le username existe déjà
    const { data: existingUser, error: userCheckError } = await supabase
      .from("nexora_users" as any)
      .select("id")
      .ilike("username", data.username)
      .maybeSingle();

    if (userCheckError) {
      console.error("Erreur vérification username:", userCheckError);
      return { success: false, error: "Erreur de connexion à la base de données." };
    }

    if (existingUser) {
      return { success: false, error: "Ce nom d'utilisateur est déjà pris." };
    }

    // Vérifier si l'email existe déjà
    const { data: existingEmail, error: emailCheckError } = await supabase
      .from("nexora_users" as any)
      .select("id")
      .ilike("email", data.email)
      .maybeSingle();

    if (emailCheckError) {
      console.error("Erreur vérification email:", emailCheckError);
      return { success: false, error: "Erreur de connexion à la base de données." };
    }

    if (existingEmail) {
      return { success: false, error: "Cet email est déjà utilisé." };
    }

    // ✅ Résoudre le referrer_id depuis le ref_code (code parrain dans l'URL)
    let referrer_id: string | null = null;
    if (data.referrer_code?.trim()) {
      const { data: parrain } = await supabase
        .from("nexora_users" as any)
        .select("id")
        .eq("ref_code", data.referrer_code.trim())
        .maybeSingle();
      if (parrain) {
        referrer_id = (parrain as any).id;
      }
    }

    const password_hash = await hashPassword(data.password);

    const { error: insertError } = await supabase
      .from("nexora_users" as any)
      .insert({
        nom_prenom: data.nom_prenom,
        username: data.username.toLowerCase(),
        email: data.email.toLowerCase(),
        password_hash,
        is_admin: false,
        plan: "free",
        badge_premium: false,
        whatsapp: data.whatsapp || null,
        is_active: true,
        status: "actif",
        referrer_id, // ✅ Parrain enregistré
      });

    if (insertError) {
      console.error("Erreur insertion utilisateur:", insertError);
      // Retourner le message Supabase pour mieux diagnostiquer
      return {
        success: false,
        error: `Erreur lors de la création du compte : ${insertError.message}`,
      };
    }

    // Notifier les admins du nouvel inscrit
    try {
      const { data: admins } = await supabase
        .from("nexora_users" as any)
        .select("id")
        .eq("is_admin", true);
      if (admins && admins.length > 0) {
        const notifs = (admins as any[]).map((admin: any) => ({
          user_id: admin.id,
          titre: "👤 Nouvel inscrit",
          message: `${data.nom_prenom} (@${data.username}) vient de rejoindre Nexora.${referrer_id ? " Parrainé." : ""}`,
          type: "info",
          lu: false,
        }));
        await supabase.from("nexora_notifications" as any).insert(notifs);
      }
    } catch (_) { console.warn("Erreur ignorée:", _); }

    return { success: true };
  } catch (err: any) {
    console.error("Erreur inattendue registerUser:", err);
    return { success: false, error: "Une erreur inattendue s'est produite." };
  }
}

// ─── Connexion ────────────────────────────────────────────────────────────────
export async function loginUser(data: {
  identifier: string;
  password: string;
  remember?: boolean;
}): Promise<{ success: boolean; user?: NexoraUser; error?: string }> {
  try {
    const hash = await hashPassword(data.password);

    const { data: user, error: loginError } = await supabase
      .from("nexora_users" as any)
      .select("*")
      .or(`username.ilike.${data.identifier},email.ilike.${data.identifier}`)
      .eq("password_hash", hash)
      .eq("is_active", true)
      .maybeSingle();

    if (loginError) {
      console.error("Erreur connexion:", loginError);
      return { success: false, error: "Erreur de connexion à la base de données." };
    }

    if (!user) {
      return {
        success: false,
        error: "Identifiant ou mot de passe incorrect.",
      };
    }

    // Vérifier si le compte est suspendu ou bloqué
    if (
      (user as any).status === "suspendu" ||
      (user as any).status === "bloque"
    ) {
      return {
        success: false,
        error: `Votre compte est restreint. Motif : ${
          (user as any).suspended_reason ||
          (user as any).blocked_reason ||
          "Contactez l'admin."
        }`,
      };
    }

    const token = generateToken();
    const expires_at = new Date(
      Date.now() + SESSION_DURATION_MS
    ).toISOString();

    await supabase.from("nexora_sessions" as any).insert({
      user_id: (user as any).id,
      session_token: token,
      expires_at,
      is_admin_session: (user as any).is_admin,
    });

    const nexoraUser: NexoraUser = {
      id: (user as any).id,
      nom_prenom: (user as any).nom_prenom,
      username: (user as any).username,
      email: (user as any).email,
      avatar_url: (user as any).avatar_url,
      is_admin: (user as any).is_admin,
      plan: (user as any).plan,
      badge_premium: (user as any).badge_premium,
    };

    const storage = data.remember ? localStorage : sessionStorage;
    storage.setItem(NEXORA_SESSION_KEY, token);
    storage.setItem(NEXORA_USER_KEY, JSON.stringify(nexoraUser));

    return { success: true, user: nexoraUser };
  } catch (err: any) {
    console.error("Erreur inattendue loginUser:", err);
    return { success: false, error: "Une erreur inattendue s'est produite." };
  }
}

// ─── Déconnexion ──────────────────────────────────────────────────────────────
export async function logoutUser(): Promise<void> {
  const token =
    localStorage.getItem(NEXORA_SESSION_KEY) ||
    sessionStorage.getItem(NEXORA_SESSION_KEY);
  if (token) {
    await supabase
      .from("nexora_sessions" as any)
      .delete()
      .eq("session_token", token);
  }
  localStorage.removeItem(NEXORA_SESSION_KEY);
  localStorage.removeItem(NEXORA_USER_KEY);
  sessionStorage.removeItem(NEXORA_SESSION_KEY);
  sessionStorage.removeItem(NEXORA_USER_KEY);
  // Toujours effacer le PIN lors de la déconnexion — obligatoire à la reconnexion
  sessionStorage.removeItem("nexora_pin_unlocked");
  sessionStorage.removeItem("nexora_pin_attempts");
  sessionStorage.removeItem("nexora_pin_locked_until");
}

// ─── Getters de session ───────────────────────────────────────────────────────
export function getNexoraUser(): NexoraUser | null {
  try {
    const raw =
      localStorage.getItem(NEXORA_USER_KEY) ||
      sessionStorage.getItem(NEXORA_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isNexoraAuthenticated(): boolean {
  return !!(
    localStorage.getItem(NEXORA_SESSION_KEY) ||
    sessionStorage.getItem(NEXORA_SESSION_KEY)
  );
}

export function hasNexoraPremium(): boolean {
  const user = getNexoraUser();
  // Les admins ont accès complet sans abonnement payant
  if (user?.is_admin === true) return true;
  return ["boss", "roi", "admin"].includes(user?.plan || "");
}

// ─── Rafraîchir la session ────────────────────────────────────────────────────
export async function refreshNexoraSession(): Promise<void> {
  const token =
    localStorage.getItem(NEXORA_SESSION_KEY) ||
    sessionStorage.getItem(NEXORA_SESSION_KEY);
  if (!token) return;

  const { data: session } = await supabase
    .from("nexora_sessions" as any)
    .select("user_id, expires_at")
    .eq("session_token", token)
    .maybeSingle();

  if (!session || new Date((session as any).expires_at) < new Date()) return;

  const { data: user } = await supabase
    .from("nexora_users" as any)
    .select(
      "id, nom_prenom, username, email, avatar_url, is_admin, plan, badge_premium, is_active, status"
    )
    .eq("id", (session as any).user_id)
    .maybeSingle();

  if (
    !user ||
    !(user as any).is_active ||
    ["suspendu", "bloque"].includes((user as any).status)
  ) {
    await logoutUser();
    window.location.href = "/login";
    return;
  }

  const nexoraUser: NexoraUser = {
    id: (user as any).id,
    nom_prenom: (user as any).nom_prenom,
    username: (user as any).username,
    email: (user as any).email,
    avatar_url: (user as any).avatar_url,
    is_admin: (user as any).is_admin,
    plan: (user as any).plan,
    badge_premium: (user as any).badge_premium,
  };

  const storage = localStorage.getItem(NEXORA_SESSION_KEY)
    ? localStorage
    : sessionStorage;
  storage.setItem(NEXORA_USER_KEY, JSON.stringify(nexoraUser));
}

// ─── Vérifier admin ──────────────────────────────────────────────────────────
export function isNexoraAdmin(): boolean {
  const user = getNexoraUser();
  return user?.is_admin === true;
}

// ─── Valider mot de passe ────────────────────────────────────────────────────
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (password.length < 8)
    return { valid: false, error: "Minimum 8 caractères" };
  if (!/[a-zA-Z]/.test(password))
    return { valid: false, error: "Au moins une lettre" };
  if (!/[0-9]/.test(password))
    return { valid: false, error: "Au moins un chiffre" };
  return { valid: true };
}

// ─── Réinitialiser mot de passe via PIN ──────────────────────────────────────
export async function updatePasswordById(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    const password_hash = await hashPassword(newPassword);
    const { error } = await supabase
      .from("nexora_users" as any)
      .update({ password_hash, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (error) {
      console.error("updatePasswordById error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("updatePasswordById exception:", err);
    return { success: false, error: err?.message ?? "Erreur inconnue" };
  }
}

// ─── Initialiser l'admin ─────────────────────────────────────────────────────
// Admin initialization is handled server-side. Do not create admin accounts from client code.
export async function initAdminUser(): Promise<void> {
  // No-op: admin accounts must be managed through secure backend functions
  return;
}
