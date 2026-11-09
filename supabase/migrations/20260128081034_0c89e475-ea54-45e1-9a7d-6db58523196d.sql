-- Drop existing INSERT policy that requires user_id = auth.uid()
DROP POLICY IF EXISTS "Users can create reviews" ON public.product_reviews;

-- Create new INSERT policy that allows:
-- 1. Regular users to create reviews for themselves (user_id = auth.uid())
-- 2. Admins and Super Admins to create reviews with any user_id (including null for manual reviews)
CREATE POLICY "Users and admins can create reviews"
ON public.product_reviews
FOR INSERT
WITH CHECK (
  (auth.uid() = user_id) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also update the admin ALL policy to include super_admin
DROP POLICY IF EXISTS "Admins can manage reviews" ON public.product_reviews;

CREATE POLICY "Admins and Super Admins can manage reviews"
ON public.product_reviews
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'super_admin'::app_role)
);