/**
 * useCheckoutTimer
 * ─────────────────────────────────────────────────────────────────────
 * Gère la réservation temporaire du stock pendant le checkout.
 * - Crée les réservations en DB dès que le composant monte
 * - Lance un compte à rebours de 10 minutes (600 secondes)
 * - Supprime les réservations si l'acheteur quitte la page
 * - Retourne le temps restant formaté + un flag expired
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

const TIMER_SECONDS = 600; // 10 minutes
const SESSION_KEY   = "nexora_checkout_session";

interface ProduitReserve {
  produit_id: string;
  quantite: number;
  type: string; // "physique" | "numerique"
}

interface UseCheckoutTimerOptions {
  boutiqueId: string;
  produits: ProduitReserve[];
  enabled: boolean; // n'activer que quand le panier est prêt
}

interface UseCheckoutTimerResult {
  secondsLeft: number;
  expired: boolean;
  formatted: string; // "09:45"
  reservationActive: boolean;
  sessionId: string;
}

function getOrCreateSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `ck_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `ck_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function useCheckoutTimer({
  boutiqueId,
  produits,
  enabled,
}: UseCheckoutTimerOptions): UseCheckoutTimerResult {
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [expired, setExpired] = useState(false);
  const [reservationActive, setReservationActive] = useState(false);
  const sessionId = useRef(getOrCreateSessionId()).current;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reservedRef = useRef(false);

  // ─── Créer les réservations en DB ────────────────────────────────────
  const createReservations = useCallback(async () => {
    if (!boutiqueId || produits.length === 0 || reservedRef.current) return;

    // Seulement les produits physiques (le stock numérique est illimité)
    const physiques = produits.filter(p => p.type === "physique");
    if (physiques.length === 0) {
      setReservationActive(true);
      return;
    }

    // Nettoyer d'abord les anciennes réservations de cette session
    await (supabase as any)
      .from("reservations_checkout")
      .delete()
      .eq("session_id", sessionId);

    // Insérer les nouvelles réservations
    const rows = physiques.map(p => ({
      session_id:  sessionId,
      boutique_id: boutiqueId,
      produit_id:  p.produit_id,
      quantite:    p.quantite,
      expire_at:   new Date(Date.now() + TIMER_SECONDS * 1000).toISOString(),
    }));

    const { error } = await (supabase as any)
      .from("reservations_checkout")
      .insert(rows);

    if (!error) {
      reservedRef.current = true;
      setReservationActive(true);
    }
  }, [boutiqueId, produits, sessionId]);

  // ─── Supprimer les réservations (annulation / confirmation) ──────────
  const deleteReservations = useCallback(async () => {
    await (supabase as any)
      .from("reservations_checkout")
      .delete()
      .eq("session_id", sessionId);
    reservedRef.current = false;
    setReservationActive(false);
  }, [sessionId]);

  // ─── Démarrer le timer quand enabled ─────────────────────────────────
  useEffect(() => {
    if (!enabled) return;

    createReservations();

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setExpired(true);
          deleteReservations();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Nettoyage si l'utilisateur quitte sans commander
    const handleUnload = () => deleteReservations();
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(intervalRef.current!);
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [enabled]);

  // ─── Exposer deleteReservations pour la confirmation ─────────────────
  // On l'attache à window pour pouvoir l'appeler depuis CheckoutPage
  useEffect(() => {
    (window as any).__nexoraReleaseReservation = deleteReservations;
    return () => { delete (window as any).__nexoraReleaseReservation; };
  }, [deleteReservations]);

  const minutes = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const seconds = (secondsLeft % 60).toString().padStart(2, "0");

  return {
    secondsLeft,
    expired,
    formatted: `${minutes}:${seconds}`,
    reservationActive,
    sessionId,
  };
}
