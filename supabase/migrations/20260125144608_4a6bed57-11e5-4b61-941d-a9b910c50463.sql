-- Create categories table with hierarchical support
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  image_url_optimized TEXT,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add category_id to products table (keep existing text fields for backward compatibility)
ALTER TABLE public.products 
ADD COLUMN category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

-- Enable RLS on categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Anyone can view categories
CREATE POLICY "Anyone can view categories"
ON public.categories
FOR SELECT
USING (true);

-- Admins can manage categories
CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for parent_id lookups
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Create index for slug lookups
CREATE INDEX idx_categories_slug ON public.categories(slug);

-- Create index for product category lookups
CREATE INDEX idx_products_category_id ON public.products(category_id);