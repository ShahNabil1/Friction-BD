-- Drop the existing restrictive admin update policy
DROP POLICY IF EXISTS "Admins can update all orders" ON public.orders;

-- Create a PERMISSIVE policy for admin updates (permissive is the default, meaning it OR's with other policies)
CREATE POLICY "Admins can update all orders" 
ON public.orders 
FOR UPDATE 
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));