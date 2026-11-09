-- Allow POS staff to view order items for orders assigned to their outlet
CREATE POLICY "POS staff can view order items for outlet orders"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders o
    JOIN profiles p ON p.id = auth.uid()
    WHERE o.id = order_items.order_id
      AND p.can_access_pos = true
      AND o.outlet_id = p.assigned_outlet_id
  )
);