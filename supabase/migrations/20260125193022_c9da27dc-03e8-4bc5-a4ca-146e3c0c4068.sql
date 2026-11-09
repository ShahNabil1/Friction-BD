-- Fix RLS policy that references auth.users table directly
-- This is causing "permission denied for table users" error

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

-- Recreate the policy WITHOUT referencing auth.users directly
-- Instead, just check if user_id matches OR if they're viewing via customer_email match with profiles
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  USING (
    auth.uid() = user_id 
    OR 
    customer_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Ensure the admin policy is still in place (should already exist)
-- Just recreating it to be safe
DROP POLICY IF EXISTS "Admins can view all orders" ON public.orders;

CREATE POLICY "Admins can view all orders"
  ON public.orders
  FOR SELECT
  USING (public.is_admin(auth.uid()));