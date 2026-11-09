-- Drop the existing admin-only policy
DROP POLICY IF EXISTS "Admins can manage products" ON public.products;

-- Create new policy that allows both admin and super_admin roles
CREATE POLICY "Admins and Super Admins can manage products" 
ON public.products 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));