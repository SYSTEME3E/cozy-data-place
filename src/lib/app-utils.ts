import { supabase } from "@/integrations/supabase/client";

export async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code + "mes_secrets_salt_2024");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAccessCode(code: string): Promise<boolean> {
  const hashed = await hashCode(code);
  const { data } = await supabase.from("profiles").select("access_code_hash").limit(1).single();
  if (!data) return false;
  return data.access_code_hash === hashed;
}

export async function verifyUserToken(userId: string, code: string): Promise<{ nom: string } | null> {
  const hashed = await hashCode(code);
  const { data } = await supabase
    .from("app_users")
    .select("id, nom, access_code_hash, is_active")
    .eq("id", userId)
    .eq("is_active", true)
    .single();
  if (!data) return null;
  if (data.access_code_hash !== hashed) return null;
  return { nom: data.nom };
}

export async function getProfile() {
  const { data } = await supabase.from("profiles").select("*").limit(1).single();
  return data;
}

export async function ensureProfile() {
  const { data: existing } = await supabase.from("profiles").select("id, access_code_hash").limit(1).single();
  if (!existing) {
    const defaultHash = await hashCode("55237685N");
    await supabase.from("profiles").insert({
      nom: "Eric Kpakpo",
      email: "erickpakpo786@gmail.com",
      avatar_url: null,
      access_code_hash: defaultHash,
    });
  } else if (!existing.access_code_hash || existing.access_code_hash === "DEFAULT_HASH") {
    const defaultHash = await hashCode("55237685N");
    await supabase.from("profiles").update({ access_code_hash: defaultHash }).eq("id", existing.id);
  }
}

export function playSuccessSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Silently fail
  }
}

// ─── Conversion XOF / USD ────────────────────────────────
export const XOF_TO_USD = 0.00167;
export const USD_TO_XOF = 600;

export function convertAmount(amount: number, from: "XOF" | "USD", to: "XOF" | "USD"): number {
  if (from === to) return amount;
  if (from === "XOF" && to === "USD") return amount * XOF_TO_USD;
  return amount * USD_TO_XOF;
}

// ✅ CORRIGÉ — plus de / dans les montants
export function formatAmount(amount: number, devise: "XOF" | "USD"): string {
  if (devise === "USD") {
    return new Intl.NumberFormat("en-US", {
      style: "currency", currency: "USD", maximumFractionDigits: 2,
    }).format(amount);
  }
  const formatted = Math.round(amount)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return formatted + " FCFA";
}

// ─── Dates ───────────────────────────────────────────────
export function getWeekNumber(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function getMondayOfWeek(weekNum: number, year: number): Date {
  const jan4 = new Date(year, 0, 4);
  const week1Monday = new Date(jan4);
  week1Monday.setDate(jan4.getDate() - (jan4.getDay() + 6) % 7);
  const monday = new Date(week1Monday);
  monday.setDate(week1Monday.getDate() + (weekNum - 1) * 7);
  return monday;
}

export function formatDatetime(dt: string): string {
  if (!dt) return "";
  const d = new Date(dt);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) +
    " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

// ─── Sécurité session ────────────────────────────────────
export const SESSION_KEY = "mes_secrets_auth";
export const USER_SESSION_KEY = "mes_secrets_user";
export const SESSION_EXPIRY_KEY = "mes_secrets_expiry";

// Durée de session : 8 heures
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

// ✅ Générer un token aléatoire sécurisé
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
}

export function setSession() {
  const token = generateToken();
  const expiry = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
  localStorage.removeItem(USER_SESSION_KEY);
}

export function setUserSession(userId: string, nom: string) {
  const token = generateToken();
  const expiry = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_KEY, token);
  localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
  localStorage.setItem(USER_SESSION_KEY, JSON.stringify({ userId, nom }));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(USER_SESSION_KEY);
  localStorage.removeItem(SESSION_EXPIRY_KEY);
}

// ✅ Vérifie session + expiration
export function isAuthenticated(): boolean {
  const token = localStorage.getItem(SESSION_KEY);
  const expiry = localStorage.getItem(SESSION_EXPIRY_KEY);
  if (!token || !expiry) return false;

  const expiryTime = parseInt(expiry, 10);
  if (Date.now() > expiryTime) {
    // Session expirée → on nettoie
    clearSession();
    return false;
  }
  return true;
}

// ✅ Renouveler la session à chaque action
export function renewSession() {
  if (!isAuthenticated()) return;
  const expiry = Date.now() + SESSION_DURATION_MS;
  localStorage.setItem(SESSION_EXPIRY_KEY, expiry.toString());
}

export function getCurrentUser(): { userId: string; nom: string } | null {
  const raw = localStorage.getItem(USER_SESSION_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function isAdminUser(): boolean {
  return isAuthenticated() && !getCurrentUser();
}
