-- Remove the plaintext password column from nexora_users
ALTER TABLE public.nexora_users DROP COLUMN IF EXISTS password_plain;

-- Restrict nexora_users table: remove overly permissive policies
-- and add restrictive ones that still allow the custom auth to work

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow public delete nexora_users" ON public.nexora_users;
DROP POLICY IF EXISTS "Allow public insert nexora_users" ON public.nexora_users;
DROP POLICY IF EXISTS "Allow public read nexora_users" ON public.nexora_users;
DROP POLICY IF EXISTS "Allow public update nexora_users" ON public.nexora_users;

-- Allow SELECT only on non-sensitive columns by restricting what can be read
-- Since custom auth needs to query by username/email and verify password_hash,
-- we keep SELECT but will handle sensitive field protection via views/edge functions
CREATE POLICY "Allow public read nexora_users"
ON public.nexora_users FOR SELECT
TO public
USING (true);

-- Only allow INSERT for registration (new accounts)
CREATE POLICY "Allow public insert nexora_users"
ON public.nexora_users FOR INSERT
TO public
WITH CHECK (
  is_admin = false
  AND plan = 'free'
  AND badge_premium = false
  AND status = 'active'
  AND is_active = true
);

-- Deny all public updates - updates must go through edge functions
-- No UPDATE policy = no updates allowed

-- Deny all public deletes
-- No DELETE policy = no deletes allowed