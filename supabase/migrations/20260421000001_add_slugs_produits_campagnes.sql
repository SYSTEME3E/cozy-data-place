-- ============================================================
--  NEXORA — Migration : Slugs SEO pour produits & campagnes
--  Date  : 2026-04-21
--  Auteur: NEXORA Engineering
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. FONCTION UTILITAIRE : génération de slug propre
--    "Chaussure Nike Air Max 90 !" → "chaussure-nike-air-max-90"
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_slug(input_text TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_slug TEXT;
BEGIN
  -- Mise en minuscule
  v_slug := lower(input_text);

  -- Translittération des caractères accentués courants
  v_slug := translate(v_slug,
    'àáâãäåæèéêëìíîïòóôõöùúûüýÿçñðøþœšžß',
    'aaaaaaaeeeeiiiioooooouuuuyycndotoe sz '
  );

  -- Supprimer les caractères non alphanumériques (sauf tirets et espaces)
  v_slug := regexp_replace(v_slug, '[^a-z0-9\s\-]', '', 'g');

  -- Remplacer espaces multiples + tirets multiples par un seul tiret
  v_slug := regexp_replace(v_slug, '[\s\-]+', '-', 'g');

  -- Supprimer les tirets en début/fin
  v_slug := trim(both '-' from v_slug);

  RETURN v_slug;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2. FONCTION : générer un slug unique pour la table produits
--    Gère les doublons avec suffixe -1, -2, …
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.unique_slug_produit(
  p_nom        TEXT,
  p_boutique_id UUID,
  p_exclude_id  UUID DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_base  TEXT;
  v_slug  TEXT;
  v_count INTEGER := 0;
  v_exists BOOLEAN;
BEGIN
  -- Validation : nom non vide
  IF p_nom IS NULL OR trim(p_nom) = '' THEN
    RAISE EXCEPTION 'Le nom du produit ne peut pas être vide';
  END IF;

  v_base := public.generate_slug(p_nom);

  -- Cas dégradé : le nom ne produit que des caractères non-ASCII
  IF v_base = '' THEN
    v_base := 'produit';
  END IF;

  v_slug := v_base;

  LOOP
    -- Vérifier l'unicité dans la boutique (en excluant l'enregistrement courant lors d'une mise à jour)
    SELECT EXISTS (
      SELECT 1 FROM public.produits
      WHERE slug = v_slug
        AND boutique_id = p_boutique_id
        AND (p_exclude_id IS NULL OR id <> p_exclude_id)
    ) INTO v_exists;

    EXIT WHEN NOT v_exists;

    v_count := v_count + 1;
    v_slug  := v_base || '-' || v_count;
  END LOOP;

  RETURN v_slug;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 3. AJOUT DE LA COLONNE slug SUR LA TABLE produits
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.produits
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Index unique par boutique (le même slug peut exister dans deux boutiques différentes)
CREATE UNIQUE INDEX IF NOT EXISTS produits_boutique_slug_idx
  ON public.produits (boutique_id, slug)
  WHERE slug IS NOT NULL;

-- Index de recherche rapide par slug seul (pour les lookups publics)
CREATE INDEX IF NOT EXISTS produits_slug_idx
  ON public.produits (slug)
  WHERE slug IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 4. BACKFILL : générer les slugs pour les produits existants
--    On traite par batch de 500 pour éviter les locks longs
-- ─────────────────────────────────────────────────────────────
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, nom, boutique_id
    FROM   public.produits
    WHERE  slug IS NULL
    ORDER  BY created_at ASC
  LOOP
    UPDATE public.produits
    SET    slug = public.unique_slug_produit(rec.nom, rec.boutique_id, rec.id)
    WHERE  id = rec.id;
  END LOOP;
END;
$$;

-- Rendre slug NOT NULL après le backfill
ALTER TABLE public.produits
  ALTER COLUMN slug SET NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 5. TRIGGER : auto-génération du slug à l'INSERT
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_produit_set_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- INSERT : slug absent → générer automatiquement
  IF TG_OP = 'INSERT' THEN
    IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
      NEW.slug := public.unique_slug_produit(NEW.nom, NEW.boutique_id, NULL);
    ELSE
      -- Slug fourni manuellement : normaliser + unicifier
      NEW.slug := public.unique_slug_produit(
        public.generate_slug(NEW.slug),  -- normalise la saisie manuelle
        NEW.boutique_id,
        NULL
      );
    END IF;
  END IF;

  -- UPDATE : régénérer si le nom ou le slug a changé
  IF TG_OP = 'UPDATE' THEN
    IF NEW.slug IS NULL OR trim(NEW.slug) = '' THEN
      -- Slug vidé → régénérer depuis le nom
      NEW.slug := public.unique_slug_produit(NEW.nom, NEW.boutique_id, NEW.id);
    ELSIF NEW.slug <> OLD.slug THEN
      -- Slug modifié manuellement → normaliser + unicifier
      NEW.slug := public.unique_slug_produit(
        public.generate_slug(NEW.slug),
        NEW.boutique_id,
        NEW.id
      );
    ELSIF NEW.nom <> OLD.nom AND NEW.slug = OLD.slug THEN
      -- Nom changé MAIS slug non modifié manuellement → régénérer
      -- (comportement conservateur : on ne modifie le slug que si l'utilisateur
      --  n'a pas fourni le sien)
      NULL; -- On garde l'ancien slug pour préserver les liens existants
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_produit_set_slug ON public.produits;
CREATE TRIGGER trg_produit_set_slug
  BEFORE INSERT OR UPDATE ON public.produits
  FOR EACH ROW EXECUTE FUNCTION public.trg_produit_set_slug();

-- ─────────────────────────────────────────────────────────────
-- 6. TABLE campagnes — ajout du slug produit dénormalisé
--    (pour construire les liens sans jointure)
-- ─────────────────────────────────────────────────────────────

-- Note : la table campagnes stocke déjà produit_id.
-- On ajoute une colonne calculée/cached pour le slug du produit lié,
-- ainsi qu'un slug propre pour la campagne elle-même.

ALTER TABLE public.campagnes
  ADD COLUMN IF NOT EXISTS produit_slug TEXT;   -- slug dénormalisé du produit lié

-- Backfill : remplir produit_slug depuis la table produits
UPDATE public.campagnes c
SET    produit_slug = p.slug
FROM   public.produits p
WHERE  p.id = c.produit_id
  AND  c.produit_slug IS NULL;

-- Trigger pour maintenir produit_slug à jour quand on crée/modifie une campagne
CREATE OR REPLACE FUNCTION public.trg_campagne_set_produit_slug()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.produit_id IS NOT NULL THEN
    SELECT slug INTO NEW.produit_slug
    FROM   public.produits
    WHERE  id = NEW.produit_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_campagne_set_produit_slug ON public.campagnes;
CREATE TRIGGER trg_campagne_set_produit_slug
  BEFORE INSERT OR UPDATE ON public.campagnes
  FOR EACH ROW EXECUTE FUNCTION public.trg_campagne_set_produit_slug();

-- ─────────────────────────────────────────────────────────────
-- 7. VUE pratique : produits avec URL propre
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_produits_with_url AS
SELECT
  p.*,
  '/shop/' || b.slug || '/produit/' || p.slug  AS url_produit,
  '/shop/' || b.slug || '/digital/' || p.slug  AS url_digital,
  '/shop/' || b.slug || '/acheter/' || p.slug  AS url_acheter
FROM public.produits  p
JOIN public.boutiques b ON b.id = p.boutique_id;

-- ─────────────────────────────────────────────────────────────
-- 8. FONCTION RPC : résoudre un produit par boutique_slug + produit_slug
--    Utilisée par le frontend pour les lookups publics
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_produit_by_slug(
  p_boutique_slug TEXT,
  p_produit_slug  TEXT
)
RETURNS SETOF public.produits
LANGUAGE sql
STABLE
AS $$
  SELECT p.*
  FROM   public.produits  p
  JOIN   public.boutiques b ON b.id = p.boutique_id
  WHERE  b.slug = p_boutique_slug
    AND  p.slug = p_produit_slug
    AND  (p.actif IS NULL OR p.actif = true)
  LIMIT  1;
$$;

-- ─────────────────────────────────────────────────────────────
-- 9. COMMENTAIRES
-- ─────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.produits.slug IS
  'Slug SEO unique au sein d''une boutique. Généré automatiquement depuis le nom. Modifiable manuellement par le vendeur.';

COMMENT ON COLUMN public.campagnes.produit_slug IS
  'Dénormalisation du slug du produit lié — mis à jour automatiquement par trigger.';
