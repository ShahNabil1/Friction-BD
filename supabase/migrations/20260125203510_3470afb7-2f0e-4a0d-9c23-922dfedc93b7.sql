-- Add featured_reviews column to store_settings
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS featured_reviews jsonb DEFAULT '[]'::jsonb;