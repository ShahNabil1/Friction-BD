-- Fix overly permissive INSERT policy - require authenticated users or allow anonymous but with rate limiting consideration
DROP POLICY "Users can create reviews" ON public.product_reviews;

-- Only authenticated users can create reviews (more secure)
CREATE POLICY "Authenticated users can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);