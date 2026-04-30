-- ============================================================
-- Migration : Timer de réservation checkout
-- Crée une table pour réserver temporairement le stock
-- pendant que l'acheteur complète sa commande (10 minutes)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.reservations_checkout (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL,           -- ID unique de la session checkout (localStorage)
  boutique_id   UUID NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  produit_id    UUID NOT NULL REFERENCES public.produits(id)  ON DELETE CASCADE,
  quantite      INTEGER NOT NULL DEFAULT 1,
  expire_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '10 minutes'),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour nettoyage rapide des réservations expirées
CREATE INDEX IF NOT EXISTS idx_reservations_expire
  ON public.reservations_checkout(expire_at);

-- Index pour recherche par session
CREATE INDEX IF NOT EXISTS idx_reservations_session
  ON public.reservations_checkout(session_id);

-- RLS : accès public pour lecture/écriture (comme les commandes)
ALTER TABLE public.reservations_checkout ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all reservations_checkout"
  ON public.reservations_checkout FOR ALL USING (true) WITH CHECK (true);

-- ─── Fonction : calculer stock disponible (stock réel − stock réservé actif) ──
CREATE OR REPLACE FUNCTION public.stock_disponible(p_produit_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT GREATEST(0,
    COALESCE((SELECT stock FROM public.produits WHERE id = p_produit_id), 0)
    -
    COALESCE((
      SELECT SUM(quantite)
      FROM   public.reservations_checkout
      WHERE  produit_id = p_produit_id
        AND  expire_at > NOW()
    ), 0)
  );
$$;

-- ─── Fonction : nettoyer les réservations expirées (à appeler périodiquement) ─
CREATE OR REPLACE FUNCTION public.nettoyer_reservations_expirees()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.reservations_checkout WHERE expire_at <= NOW();
$$;
