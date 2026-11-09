-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;

-- Create a permissive policy that allows admins and super_admins full access
CREATE POLICY "Admins and Super Admins can manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);