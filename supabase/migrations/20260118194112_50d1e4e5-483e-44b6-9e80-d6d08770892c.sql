-- Add optimized image URL fields for Cloudinary delivery/transforms
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS images_optimized jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.brands
ADD COLUMN IF NOT EXISTS logo_url_optimized text;

-- Optional: keep updated_at fresh if you later add triggers; no triggers exist yet.
