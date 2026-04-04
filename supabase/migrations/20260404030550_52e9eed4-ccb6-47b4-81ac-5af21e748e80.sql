-- Add whatsapp column to nexora_users
ALTER TABLE public.nexora_users ADD COLUMN IF NOT EXISTS whatsapp text DEFAULT NULL;
