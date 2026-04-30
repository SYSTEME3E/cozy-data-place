/**
 * NEXORA — Tracker de Campagne Publicitaire (v3 — pays fiable)
 *
 * Changements vs v2 :
 *   - Remplacement de ipapi.co par ip-api.com (plus fiable sur mobile)
 *   - Fallback sur ipwho.is si ip-api.com échoue
 *   - Timeout augmenté à 4s pour les connexions mobiles lentes
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// ─── 1. Lecture & nettoyage du campagne_id ───────────────────────────────────

/**
 * Lit le ?cid= dans l'URL, le stocke en sessionStorage,
 * puis SUPPRIME le paramètre de l'URL visible (sans rechargement de page).
 */
export function readAndCleanCampagneId(): string | null {
  const params = new URLSearchParams(window.location.search);
  const cid = params.get('cid');

  if (cid) {
    // Persister avant de nettoyer
    sessionStorage.setItem('nexora_cid', cid);

    // Supprimer ?cid= de l'URL affichée — 301 SEO côté Next.js/Vite
    params.delete('cid');
    const newSearch = params.toString();
    const newUrl =
      window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
    window.history.replaceState(null, '', newUrl);

    return cid;
  }

  return sessionStorage.getItem('nexora_cid');
}

/** Retourne le campagne_id de la session sans modifier l'URL. */
export function getCampagneId(): string | null {
  return sessionStorage.getItem('nexora_cid');
}

// ─── 2. Détection appareil ───────────────────────────────────────────────────

function detectAppareil(): 'mobile' | 'tablette' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  if (/tablet|ipad|playbook|silk|(android(?!.*mobi))/i.test(ua)) return 'tablette';
  if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) return 'mobile';
  return 'desktop';
}

// ─── 3. Détection source de trafic ───────────────────────────────────────────

function detectSourceUrl(): string {
  return document.referrer || 'direct';
}

// ─── 4. Détection pays (via API publique) ────────────────────────────────────

async function detectPays(): Promise<string> {
  // Tentative 1 : ip-api.com (gratuit, fiable, rapide sur mobile)
  try {
    const res = await fetch('https://ip-api.com/json/?fields=country', {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (data.country) return data.country;
  } catch {
    // on essaie le fallback
  }

  // Tentative 2 : ipwho.is (fallback)
  try {
    const res = await fetch('https://ipwho.is/', {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    if (data.country) return data.country;
  } catch {
    // on essaie le dernier fallback
  }

  // Tentative 3 : ipapi.co (dernier recours)
  try {
    const res = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return data.country_name || data.country || 'Inconnu';
  } catch {
    return 'Inconnu';
  }
}

// ─── 5. Anti-doublons (même session) ─────────────────────────────────────────

function hasRecentVisite(campagneId: string): boolean {
  return !!sessionStorage.getItem(`nexora_visite_${campagneId}`);
}

function markVisite(campagneId: string) {
  sessionStorage.setItem(`nexora_visite_${campagneId}`, Date.now().toString());
}

// ─── 6. Enregistrement visite ────────────────────────────────────────────────

export async function trackVisite(boutiqueId: string): Promise<void> {
  // Lire ET nettoyer l'URL au premier appel
  const campagneId = readAndCleanCampagneId();
  if (!campagneId) return;
  if (hasRecentVisite(campagneId)) return;

  try {
    const [pays, appareil, source_url] = await Promise.all([
      detectPays(),
      Promise.resolve(detectAppareil()),
      Promise.resolve(detectSourceUrl()),
    ]);

    await db.from('campagne_visites').insert({
      campagne_id: campagneId,
      boutique_id: boutiqueId,
      pays,
      appareil,
      source_url,
      ip_hash: null,
    });

    markVisite(campagneId);
    console.debug('[Nexora Tracker] Visite enregistrée', { campagneId, pays, appareil });
  } catch (err) {
    console.warn('[Nexora Tracker] Erreur tracking visite:', err);
  }
}

// ─── 7. Enregistrement conversion ────────────────────────────────────────────

interface ConversionData {
  commandeId?: string;
  clientNom?: string;
  clientTel?: string;
  montant: number;
  devise?: string;
  boutiqueId: string;
}

export async function trackConversion(data: ConversionData): Promise<void> {
  const campagneId = getCampagneId();
  if (!campagneId) return;

  try {
    await db.from('campagne_conversions').insert({
      campagne_id: campagneId,
      commande_id: data.commandeId || null,
      boutique_id: data.boutiqueId,
      client_nom: data.clientNom || '',
      client_tel: data.clientTel || '',
      montant: data.montant,
      devise: data.devise || 'XOF',
    });

    sessionStorage.removeItem('nexora_cid');
    console.debug('[Nexora Tracker] Conversion enregistrée', {
      campagneId,
      montant: data.montant,
    });
  } catch (err) {
    console.warn('[Nexora Tracker] Erreur tracking conversion:', err);
  }
}

// ─── 8. Hook React ────────────────────────────────────────────────────────────

export function useCampagneTracker(boutiqueId: string | null | undefined) {
  useEffect(() => {
    if (!boutiqueId) return;
    trackVisite(boutiqueId);
  }, [boutiqueId]);
}
