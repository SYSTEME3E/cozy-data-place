import { useState, useCallback } from "react";

const PIN_UNLOCKED_KEY = "nexora_pin_unlocked";
const PIN_ATTEMPTS_KEY = "nexora_pin_attempts";
const PIN_LOCKED_UNTIL_KEY = "nexora_pin_locked_until";

const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function usePinAuth() {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate((n) => n + 1);

  /** Is the PIN validated for this session? */
  const isPinUnlocked = (): boolean => {
    return sessionStorage.getItem(PIN_UNLOCKED_KEY) === "true";
  };

  /** Mark PIN as validated for this session */
  const unlockPin = () => {
    sessionStorage.setItem(PIN_UNLOCKED_KEY, "true");
    sessionStorage.setItem(PIN_ATTEMPTS_KEY, "0");
    refresh();
  };

  /** Clear PIN unlock (called on logout or session end) */
  const lockPin = () => {
    sessionStorage.removeItem(PIN_UNLOCKED_KEY);
    refresh();
  };

  /** Get remaining lockout time in seconds (0 = not locked) */
  const getLockoutRemaining = (): number => {
    const lockedUntil = sessionStorage.getItem(PIN_LOCKED_UNTIL_KEY);
    if (!lockedUntil) return 0;
    const remaining = parseInt(lockedUntil) - Date.now();
    if (remaining <= 0) {
      sessionStorage.removeItem(PIN_LOCKED_UNTIL_KEY);
      sessionStorage.setItem(PIN_ATTEMPTS_KEY, "0");
      return 0;
    }
    return Math.ceil(remaining / 1000);
  };

  /** Returns true if account is currently locked out */
  const isLockedOut = (): boolean => {
    return getLockoutRemaining() > 0;
  };

  /** Get current failed attempt count */
  const getAttempts = (): number => {
    return parseInt(sessionStorage.getItem(PIN_ATTEMPTS_KEY) || "0");
  };

  /** Record a failed attempt, lock if max reached. Returns remaining attempts. */
  const recordFailedAttempt = (): { attemptsLeft: number; locked: boolean } => {
    const current = getAttempts() + 1;
    sessionStorage.setItem(PIN_ATTEMPTS_KEY, String(current));
    if (current >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCK_DURATION_MS;
      sessionStorage.setItem(PIN_LOCKED_UNTIL_KEY, String(lockedUntil));
      refresh();
      return { attemptsLeft: 0, locked: true };
    }
    refresh();
    return { attemptsLeft: MAX_ATTEMPTS - current, locked: false };
  };

  /** Reset attempts counter */
  const resetAttempts = () => {
    sessionStorage.removeItem(PIN_ATTEMPTS_KEY);
    sessionStorage.removeItem(PIN_LOCKED_UNTIL_KEY);
    refresh();
  };

  return {
    isPinUnlocked,
    unlockPin,
    lockPin,
    isLockedOut,
    getLockoutRemaining,
    getAttempts,
    recordFailedAttempt,
    resetAttempts,
    MAX_ATTEMPTS,
  };
}
