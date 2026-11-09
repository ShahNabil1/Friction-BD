-- Drop existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users and admins can create reviews" ON public.product_reviews;

-- Create a PERMISSIVE INSERT policy that allows:
-- 1. Authenticated users to create reviews with their own user_id
-- 2. Admins/super_admins to create reviews with any user_id (including null for manual reviews)
CREATE POLICY "Users can create their own reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (
  (auth.uid() = user_id) OR 
  (user_id IS NULL AND (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)))
);