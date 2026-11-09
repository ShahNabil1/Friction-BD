-- Create products table for full catalog persistence
CREATE TABLE IF NOT EXISTS public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Core merchandising
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  sku TEXT,
  slug TEXT NOT NULL,

  -- Routing / taxonomy
  category TEXT NOT NULL DEFAULT '',
  subcategory TEXT NOT NULL DEFAULT '',
  shop_category TEXT,

  -- Pricing (store cents as integers)
  price_cents INTEGER NOT NULL DEFAULT 0,
  compare_at_price_cents INTEGER,

  -- Inventory
  stock INTEGER NOT NULL DEFAULT 0,

  -- Presentation
  badge TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  -- Rich content / advanced catalog fields
  images JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::text[],
  color_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  size_options JSONB NOT NULL DEFAULT '[]'::jsonb,
  specs JSONB NOT NULL DEFAULT '[]'::jsonb,
  faq JSONB NOT NULL DEFAULT '[]'::jsonb,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Social proof
  rating NUMERIC NOT NULL DEFAULT 0,
  review_count INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  CONSTRAINT products_slug_unique UNIQUE (slug)
);

-- Indexes for catalog browsing
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products (status);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category);
CREATE INDEX IF NOT EXISTS idx_products_shop_category ON public.products (shop_category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products (brand);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ BEGIN
  CREATE POLICY "Anyone can view active products"
  ON public.products
  FOR SELECT
  USING (status = 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins can manage products"
  ON public.products
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
