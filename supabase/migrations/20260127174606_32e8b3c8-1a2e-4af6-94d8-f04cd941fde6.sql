-- Add SKU column to products table for barcode scanning
ALTER TABLE public.products 
ADD COLUMN sku text;

-- Create index for faster SKU lookups
CREATE INDEX idx_products_sku ON public.products (sku);

-- Add unique constraint (allowing nulls) for SKU
CREATE UNIQUE INDEX idx_products_sku_unique ON public.products (sku) WHERE sku IS NOT NULL;