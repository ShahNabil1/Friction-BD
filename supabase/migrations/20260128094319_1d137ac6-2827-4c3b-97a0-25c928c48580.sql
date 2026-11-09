-- Drop existing admin policy and create one that includes super_admin
DROP POLICY IF EXISTS "Admins can manage order items" ON public.order_items;

CREATE POLICY "Admins and Super Admins can manage order items"
ON public.order_items
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));