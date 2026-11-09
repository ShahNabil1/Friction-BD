DROP POLICY IF EXISTS "Customers can view online product inventory" ON public.outlet_inventory;
CREATE POLICY "Customers can view online product inventory"
ON public.outlet_inventory
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = outlet_inventory.product_id
      AND p.status = 'active'
      AND (p.is_online_active = true OR p.is_online_active IS NULL)
  )
);