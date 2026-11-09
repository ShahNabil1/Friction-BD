-- Drop the existing admin-only policy for orders
DROP POLICY IF EXISTS "Admins can manage all orders" ON public.orders;

-- Create updated policy that includes both admin and super_admin roles
CREATE POLICY "Admins and Super Admins can manage all orders" 
ON public.orders 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);