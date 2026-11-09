-- 1) Storage bucket for ecommerce assets
INSERT INTO storage.buckets (id, name, public)
VALUES ('ecommerce-assets', 'ecommerce-assets', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- 2) Storage RLS policies for ecommerce-assets
-- Note: policies live on storage.objects
DO $$
BEGIN
  -- Public read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read ecommerce-assets'
  ) THEN
    CREATE POLICY "Public read ecommerce-assets"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'ecommerce-assets');
  END IF;

  -- Admin insert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can upload ecommerce-assets'
  ) THEN
    CREATE POLICY "Admins can upload ecommerce-assets"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'ecommerce-assets' AND public.is_admin(auth.uid()));
  END IF;

  -- Admin update
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can update ecommerce-assets'
  ) THEN
    CREATE POLICY "Admins can update ecommerce-assets"
    ON storage.objects
    FOR UPDATE
    USING (bucket_id = 'ecommerce-assets' AND public.is_admin(auth.uid()))
    WITH CHECK (bucket_id = 'ecommerce-assets' AND public.is_admin(auth.uid()));
  END IF;

  -- Admin delete
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Admins can delete ecommerce-assets'
  ) THEN
    CREATE POLICY "Admins can delete ecommerce-assets"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'ecommerce-assets' AND public.is_admin(auth.uid()));
  END IF;
END $$;

-- 3) Brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brands' AND policyname = 'Anyone can view brands'
  ) THEN
    CREATE POLICY "Anyone can view brands"
    ON public.brands
    FOR SELECT
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'brands' AND policyname = 'Admins can manage brands'
  ) THEN
    CREATE POLICY "Admins can manage brands"
    ON public.brands
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_brands_updated_at ON public.brands;
CREATE TRIGGER update_brands_updated_at
BEFORE UPDATE ON public.brands
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Ensure products.brand exists
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS brand text;