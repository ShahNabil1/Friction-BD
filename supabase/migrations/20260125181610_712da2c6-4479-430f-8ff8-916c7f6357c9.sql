-- Add images column and status column to product_reviews table
ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS images text[] DEFAULT ARRAY[]::text[];

ALTER TABLE public.product_reviews 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';

-- Migrate existing data: set approved reviews to 'approved' status, hidden to 'pending'
UPDATE public.product_reviews 
SET status = CASE 
  WHEN is_approved = true THEN 'approved' 
  ELSE 'pending' 
END;

-- Create index for faster status filtering
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_status ON public.product_reviews(product_id, status);

-- Update RLS policies to use status instead of is_approved for viewing
DROP POLICY IF EXISTS "Anyone can view approved reviews" ON public.product_reviews;

CREATE POLICY "Anyone can view approved reviews" 
ON public.product_reviews 
FOR SELECT 
USING (status = 'approved');