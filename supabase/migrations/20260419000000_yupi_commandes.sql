-- ============================================================
-- YUPI GLOBAL SHOP — Table des commandes
-- Migration: 20260419000000_yupi_commandes.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS public.yupi_commandes (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  reference         TEXT NOT NULL UNIQUE,
  client_nom        TEXT NOT NULL,
  client_whatsapp   TEXT NOT NULL,
  ville             TEXT NOT NULL,
  adresse_livraison TEXT,
  notes             TEXT,
  items             JSONB NOT NULL DEFAULT '[]'::jsonb,
  total             NUMERIC(12, 2) NOT NULL DEFAULT 0,
  statut            TEXT NOT NULL DEFAULT 'en_attente'
                    CHECK (statut IN ('en_attente','confirmee','en_livraison','livree','annulee')),
  user_id           UUID REFERENCES public.nexora_users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

-- Index on statut for filtering
CREATE INDEX IF NOT EXISTS idx_yupi_commandes_statut ON public.yupi_commandes(statut);

-- Index on user_id for user order history
CREATE INDEX IF NOT EXISTS idx_yupi_commandes_user_id ON public.yupi_commandes(user_id);

-- Index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_yupi_commandes_created_at ON public.yupi_commandes(created_at DESC);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.yupi_commandes_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_yupi_commandes_updated_at ON public.yupi_commandes;
CREATE TRIGGER trg_yupi_commandes_updated_at
  BEFORE UPDATE ON public.yupi_commandes
  FOR EACH ROW EXECUTE FUNCTION public.yupi_commandes_update_updated_at();

-- ── Row Level Security ──────────────────────────────────────
ALTER TABLE public.yupi_commandes ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own orders
CREATE POLICY "yupi_commandes_insert_own"
  ON public.yupi_commandes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Users can view their own orders
CREATE POLICY "yupi_commandes_select_own"
  ON public.yupi_commandes
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all orders
CREATE POLICY "yupi_commandes_admin_all"
  ON public.yupi_commandes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.nexora_users
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- Allow anonymous/unauthenticated insert (orders without account)
CREATE POLICY "yupi_commandes_anon_insert"
  ON public.yupi_commandes
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

COMMENT ON TABLE public.yupi_commandes IS 'Commandes de la boutique YUPI GLOBAL SHOP';
COMMENT ON COLUMN public.yupi_commandes.reference IS 'Référence unique de commande (ex: YUPI-123456)';
COMMENT ON COLUMN public.yupi_commandes.items IS 'JSON des articles: [{id, nom, prix, qty, img}]';
COMMENT ON COLUMN public.yupi_commandes.statut IS 'en_attente | confirmee | en_livraison | livree | annulee';
