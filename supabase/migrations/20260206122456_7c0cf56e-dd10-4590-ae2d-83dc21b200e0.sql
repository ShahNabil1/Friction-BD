-- Add buying_price column to products table (nullable, for super_admin only)
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS buying_price integer NULL;

-- Add a comment to document the column's purpose
COMMENT ON COLUMN public.products.buying_price IS 'Cost/buying price - visible only to super_admin role';