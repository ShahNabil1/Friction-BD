-- Add Google Tag Manager ID column to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS google_tag_manager_id text;