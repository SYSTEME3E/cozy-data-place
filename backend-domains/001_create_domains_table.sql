-- ═══════════════════════════════════════════════════════════
-- NEXORA — Custom Domain Mapping
-- Migration 001 : table domains + RLS + indexes
-- Supabase SQL Editor — exécuter en une fois
-- ═══════════════════════════════════════════════════════════

-- ── Créer la table
CREATE TABLE IF NOT EXISTS public.domains (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL,
  domain_name         TEXT        NOT NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'verified', 'active', 'error')),
  page_type           TEXT        NOT NULL DEFAULT 'boutique'
                        CHECK (page_type IN ('boutique', 'immobilier', 'tunnel')),
  page_slug           TEXT,
  verification_token  TEXT        NOT NULL DEFAULT '',
  ssl_status          TEXT        NOT NULL DEFAULT 'pending'
                        CHECK (ssl_status IN ('pending', 'active', 'error')),
  last_checked_at     TIMESTAMPTZ,
  verified_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT domains_domain_name_unique UNIQUE (domain_name)
);

-- ── Indexes pour performance
CREATE INDEX IF NOT EXISTS domains_user_id_idx    ON public.domains(user_id);
CREATE INDEX IF NOT EXISTS domains_domain_name_idx ON public.domains(domain_name);
CREATE INDEX IF NOT EXISTS domains_status_idx      ON public.domains(status);

-- ── Trigger updated_at automatique
CREATE OR REPLACE FUNCTION update_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS domains_updated_at ON public.domains;
CREATE TRIGGER domains_updated_at
  BEFORE UPDATE ON public.domains
  FOR EACH ROW EXECUTE FUNCTION update_domains_updated_at();

-- ── Row Level Security
ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies si elles existent
DROP POLICY IF EXISTS "domains_select_own"   ON public.domains;
DROP POLICY IF EXISTS "domains_insert_own"   ON public.domains;
DROP POLICY IF EXISTS "domains_update_own"   ON public.domains;
DROP POLICY IF EXISTS "domains_delete_own"   ON public.domains;
DROP POLICY IF EXISTS "domains_service_all"  ON public.domains;

-- Policy : lecture — l'utilisateur voit uniquement ses domaines
-- Note : le backend utilise service_role qui bypasse RLS
CREATE POLICY "domains_select_own" ON public.domains
  FOR SELECT
  USING (
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "domains_insert_own" ON public.domains
  FOR INSERT
  WITH CHECK (
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "domains_update_own" ON public.domains
  FOR UPDATE
  USING (
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

CREATE POLICY "domains_delete_own" ON public.domains
  FOR DELETE
  USING (
    user_id::text = (current_setting('request.jwt.claims', true)::json->>'sub')
    OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
  );

-- ── Commentaires
COMMENT ON TABLE  public.domains                    IS 'Domaines personnalisés des utilisateurs Nexora';
COMMENT ON COLUMN public.domains.status             IS 'pending=ajouté, verified=propriété prouvée, active=DNS ok, error=erreur';
COMMENT ON COLUMN public.domains.page_type          IS 'boutique | immobilier | tunnel';
COMMENT ON COLUMN public.domains.page_slug          IS 'Slug de la boutique/page associée';
COMMENT ON COLUMN public.domains.verification_token IS 'Token TXT DNS pour vérification de propriété';
COMMENT ON COLUMN public.domains.ssl_status         IS 'État du certificat SSL Cloudflare';
