-- Fix the overly permissive RLS policy
DROP POLICY IF EXISTS "Service role can manage fraud cache" ON public.fraud_check_cache;

-- Only allow inserts/updates via service role key (edge function uses service role)
-- The edge function will use the service role key to bypass RLS for writes
-- Regular users cannot write to this table

-- Add policy for admins to manage (for manual cleanup if needed)
CREATE POLICY "Admins can manage fraud cache"
  ON public.fraud_check_cache
  FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));