-- product_reviews: fix RESTRICTIVE policies that are unintentionally blocking user INSERTs and admin visibility

-- 1) Drop existing policies (recreate as PERMISSIVE)
DROP POLICY IF EXISTS "Admins and Super Admins can manage reviews" ON public.product_reviews;
DROP POLICY IF EXISTS "Approved reviews are public" ON public.product_reviews;

-- 2) Admins/Super Admins: manage all reviews (PERMISSIVE)
CREATE POLICY "Admins and Super Admins can manage reviews"
ON public.product_reviews
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- 3) Public: only approved reviews are readable (PERMISSIVE)
-- Keep backward compatibility with both the legacy is_approved flag and the newer status column
CREATE POLICY "Approved reviews are public"
ON public.product_reviews
FOR SELECT
TO anon, authenticated
USING (
  (status = 'approved') OR (is_approved = true)
);

-- NOTE: The existing INSERT policy "Users can create their own reviews" remains in place.