-- Drop existing policies for coupons table
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;

-- Create new policy that includes both admin and super_admin roles
CREATE POLICY "Admins and Super Admins can manage coupons" 
ON public.coupons 
FOR ALL 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);