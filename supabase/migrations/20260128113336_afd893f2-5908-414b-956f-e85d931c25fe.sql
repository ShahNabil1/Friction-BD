-- Fix review submission: make authenticated INSERT robust + allow users to SELECT their own reviews

-- 1) Replace INSERT policy with a simpler authenticated gate
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.product_reviews;

CREATE POLICY "Authenticated users can create reviews"
ON public.product_reviews
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- 2) Allow users to read their own reviews (incl. pending) so:
--   - insert return=representation works
--   - we can prevent duplicate submissions
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.product_reviews;

CREATE POLICY "Users can view their own reviews"
ON public.product_reviews
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3) Enforce server-side fields for non-admin submissions
--    (prevents privilege escalation and removes client-side dependency)
CREATE OR REPLACE FUNCTION public.enforce_product_review_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Must be authenticated';
  END IF;

  -- Non-admin users: force ownership + keep review pending
  IF NOT (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    NEW.user_id := auth.uid();
    NEW.status := 'pending';
    NEW.is_approved := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_product_review_fields ON public.product_reviews;

CREATE TRIGGER trg_enforce_product_review_fields
BEFORE INSERT ON public.product_reviews
FOR EACH ROW
EXECUTE FUNCTION public.enforce_product_review_fields();