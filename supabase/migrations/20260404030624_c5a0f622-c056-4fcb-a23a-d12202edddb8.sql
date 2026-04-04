CREATE TABLE public.whatsapp_contacts_downloads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  last_download_at timestamp with time zone DEFAULT now(),
  last_download_count integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.whatsapp_contacts_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all whatsapp_contacts_downloads" ON public.whatsapp_contacts_downloads
  FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX idx_whatsapp_downloads_user ON public.whatsapp_contacts_downloads(user_id);
