-- ============================================================
-- 1. Détails produits : enrichir variations_produit
-- ============================================================
ALTER TABLE public.variations_produit 
  ADD COLUMN IF NOT EXISTS type_variation text DEFAULT 'autre',
  ADD COLUMN IF NOT EXISTS valeur_principale text,
  ADD COLUMN IF NOT EXISTS code_couleur text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS stock_disponible integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prix_supplement numeric DEFAULT 0;

-- ============================================================
-- 2. Conversations boutique (acheteur libre ↔ vendeur)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conversations_boutique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  boutique_id uuid NOT NULL,
  produit_id uuid,
  produit_nom text,
  produit_image text,
  acheteur_nom text NOT NULL,
  acheteur_contact text NOT NULL,
  acheteur_session_id text NOT NULL,
  dernier_message text DEFAULT '',
  dernier_message_at timestamptz DEFAULT now(),
  non_lus_vendeur integer DEFAULT 0,
  non_lus_acheteur integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_conversations_boutique ON public.conversations_boutique(boutique_id, dernier_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.conversations_boutique(acheteur_session_id);

ALTER TABLE public.conversations_boutique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all conversations_boutique" ON public.conversations_boutique
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 3. Messages boutique
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages_boutique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations_boutique(id) ON DELETE CASCADE,
  expediteur text NOT NULL CHECK (expediteur IN ('acheteur', 'vendeur')),
  contenu text DEFAULT '',
  media_url text,
  media_type text CHECK (media_type IN ('image', 'video', NULL)),
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages_boutique(conversation_id, created_at);

ALTER TABLE public.messages_boutique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all messages_boutique" ON public.messages_boutique
  FOR ALL USING (true) WITH CHECK (true);

-- Activer realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages_boutique;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations_boutique;

-- ============================================================
-- 4. Storage bucket pour les médias échangés
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('boutique-messages-media', 'boutique-messages-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read boutique messages media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'boutique-messages-media');

CREATE POLICY "Public upload boutique messages media"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'boutique-messages-media');

-- ============================================================
-- 5. Trigger pour mettre à jour la conversation lors d'un nouveau message
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_conversation_on_message()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.conversations_boutique
  SET 
    dernier_message = CASE 
      WHEN NEW.media_type IS NOT NULL THEN '📎 ' || COALESCE(NEW.media_type, 'média')
      ELSE LEFT(NEW.contenu, 100)
    END,
    dernier_message_at = NEW.created_at,
    non_lus_vendeur = CASE WHEN NEW.expediteur = 'acheteur' THEN non_lus_vendeur + 1 ELSE non_lus_vendeur END,
    non_lus_acheteur = CASE WHEN NEW.expediteur = 'vendeur' THEN non_lus_acheteur + 1 ELSE non_lus_acheteur END,
    updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_conversation_on_message ON public.messages_boutique;
CREATE TRIGGER trg_update_conversation_on_message
AFTER INSERT ON public.messages_boutique
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_on_message();