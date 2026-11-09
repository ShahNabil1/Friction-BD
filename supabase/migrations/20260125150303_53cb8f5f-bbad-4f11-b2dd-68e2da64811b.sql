-- Add is_featured column to categories table
ALTER TABLE public.categories 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Update existing featured categories based on current homepage display
UPDATE public.categories 
SET is_featured = true 
WHERE slug IN ('mens', 'womens', 'analog-watches', 'smart-watches', 'perfumes', 'gift-sets');