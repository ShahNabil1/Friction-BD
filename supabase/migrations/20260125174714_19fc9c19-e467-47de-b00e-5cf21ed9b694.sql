-- Add benefits column to products table with default premium benefits
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS benefits JSONB NOT NULL DEFAULT '[
  { "title": "No Warranty", "desc": "Check carefully before buying" },
  { "title": "100% Original", "desc": "Authentic product guarantee" },
  { "title": "Free Box & Bag", "desc": "Premium packaging included" },
  { "title": "Open Box Check", "desc": "Allowing checking before payment" },
  { "title": "7 Days Replacement", "desc": "Easy replacement policy" },
  { "title": "Fast Delivery", "desc": "Delivery within 2-3 days" }
]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN public.products.benefits IS 'Array of premium benefit objects with title and desc fields';