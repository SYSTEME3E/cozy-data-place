/**
 * NEXORA — useAffiliateTracking (CORRIGÉ)
 *
 * BUGS CORRIGÉS :
 *  1. Le hook importait storeAffiliateRef depuis affiliateTracker
 *     mais affiliateService.ts expose saveAffiliateRef (nom différent !).
 *     → On utilise storeAffiliateRef de affiliateTracker (cohérent avec le hook).
 *  2. Le hook N'ÉTAIT PAS appelé dans FormationsPage.tsx.
 *     → Voir instructions d'intégration ci-dessous.
 *
 * INTÉGRATION REQUISE dans FormationsPage.tsx :
 *   import { useAffiliateTracking } from "@/lib/useAffiliateTracking";
 *   // En haut du composant :
 *   useAffiliateTracking();   // détecte ?ref= et enregistre le clic
 *
 * INTÉGRATION REQUISE dans la page détail d'une formation :
 *   useAffiliateTracking(formationId);
 *
 * TEST LOCAL (sans cooldown) :
 *   Visitez : /formations?ref=VOTRE_CODE&dev_mode=1
 */

import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { storeAffiliateRef, trackAffiliateClick } from "./affiliateTracker";

/**
 * @param formationId - Optionnel. ID de la formation si on est sur une page détail.
 */
export function useAffiliateTracking(formationId?: string | null): void {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (!ref || ref.trim() === "" || ref === "public") return;

    // 1. Persister le ref (valable 30 jours)
    storeAffiliateRef(ref.trim());

    // 2. Enregistrer le clic (anti-doublon 24h, désactivable avec ?dev_mode=1)
    trackAffiliateClick(ref.trim(), formationId ?? null);
  }, [searchParams, formationId]);
}

/*
 * ============================================================
 * GUIDE D'INTÉGRATION — À faire manuellement
 * ============================================================
 *
 * 1. Dans src/pages/FormationsPage.tsx, ajouter en haut du composant :
 *
 *    import { useAffiliateTracking } from "@/lib/useAffiliateTracking";
 *
 *    export default function FormationsPage() {
 *      useAffiliateTracking();  // ← Ajouter cette ligne
 *      // ... reste du composant
 *    }
 *
 * 2. Dans la page détail d'une formation (si elle existe) :
 *
 *    export default function FormationDetailPage() {
 *      const { id } = useParams();
 *      useAffiliateTracking(id);  // ← Passer l'ID de la formation
 *      // ...
 *    }
 *
 * 3. Pour tester que ça marche en local, visitez :
 *    http://localhost:5173/formations?ref=VOTRE_REF_CODE&dev_mode=1
 *    Puis vérifiez dans Supabase > affiliate_clicks qu'une ligne a été insérée.
 *
 * ============================================================
 */
