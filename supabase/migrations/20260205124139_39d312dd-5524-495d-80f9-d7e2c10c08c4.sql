-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Staff with customers permission can manage customers" ON public.customers;

-- Create a new policy that allows POS staff and moderators to manage customers
CREATE POLICY "Staff and POS users can manage customers" ON public.customers
FOR ALL USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'customers'::text)) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.can_access_pos = true
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'customers'::text)) OR
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.can_access_pos = true
  )
);