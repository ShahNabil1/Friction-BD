-- Add SELECT policy for moderators with dashboard permission to view orders for analytics
CREATE POLICY "Staff with dashboard permission can view orders for analytics"
ON public.orders
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'dashboard'::text))
);

-- Also allow dashboard permission to view order_items for analytics
CREATE POLICY "Staff with dashboard permission can view order items for analytics"
ON public.order_items
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'dashboard'::text))
);