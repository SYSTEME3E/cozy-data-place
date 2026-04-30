/**
 * NEXORA — LegacyProduitRedirect
 *
 * Intercepte les anciennes URLs avec UUID et effectue une redirection
 * côté client vers la nouvelle URL avec slug SEO.
 *
 * Usage dans App.tsx :
 *   <Route path="/shop/:slug/produit/:legacyId/redirect"
 *          element={<LegacyProduitRedirect type="produit" />} />
 *
 * NB : Ces routes avec /redirect ne sont jamais appelées directement
 * par le frontend (qui utilise déjà les slugs). Elles servent uniquement
 * pour les anciens liens partagés (emails, WhatsApp, posts réseaux sociaux).
 * Le composant ProduitDetailPage gère lui-même la résolution UUID → slug
 * pour les rares cas où un UUID se retrouve dans l'URL.
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


interface Props {
  type: 'produit' | 'digital' | 'acheter';
}

export default function LegacyProduitRedirect({ type }: Props) {
  const { slug, legacyId } = useParams<{ slug: string; legacyId: string }>();
  const navigate = useNavigate();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug || !legacyId) { setError(true); return; }

    const resolve = async () => {
      try {
        // Résoudre l'UUID en slug via Supabase
        const { data: boutique } = await (supabase as any)
          .from('boutiques')
          .select('id')
          .eq('slug', slug)
          .maybeSingle();

        if (!boutique) { setError(true); return; }

        const { data: produit } = await (supabase as any)
          .from('produits')
          .select('slug')
          .eq('id', legacyId)
          .eq('boutique_id', boutique.id)
          .maybeSingle();

        if (!produit?.slug) { setError(true); return; }

        // Redirection permanente (React Router remplace l'entrée dans l'historique)
        navigate(`/shop/${slug}/${type}/${produit.slug}`, { replace: true });
      } catch {
        setError(true);
      }
    };

    resolve();
  }, [slug, legacyId, type, navigate]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-gray-500">
        <p className="text-lg font-medium">Produit introuvable</p>
        <button
          onClick={() => navigate(`/shop/${slug ?? ''}`)}
          className="px-4 py-2 rounded-xl bg-pink-500 text-white text-sm font-semibold"
        >
          Retour à la boutique
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
