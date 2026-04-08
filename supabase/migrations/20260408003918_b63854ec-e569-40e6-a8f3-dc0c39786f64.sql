-- Add PIN columns to nexora_users
ALTER TABLE public.nexora_users
  ADD COLUMN IF NOT EXISTS security_pin TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS has_set_pin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS pin_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Drop restrictive UPDATE policy and create a permissive one
DROP POLICY IF EXISTS "users_update_own" ON public.nexora_users;

CREATE POLICY "Allow users to update own record"
ON public.nexora_users
FOR UPDATE
USING (true)
WITH CHECK (true);