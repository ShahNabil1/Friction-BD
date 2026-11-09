-- Add analytics tracking columns to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS meta_pixel_id text,
ADD COLUMN IF NOT EXISTS meta_conversion_token text,
ADD COLUMN IF NOT EXISTS google_analytics_id text;