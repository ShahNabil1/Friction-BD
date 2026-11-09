-- Allow public read access to orders for tracking by phone or tracking code
CREATE POLICY "Public can view orders by phone or tracking code"
ON public.orders
FOR SELECT
USING (
  customer_phone IS NOT NULL OR 
  courier_tracking_code IS NOT NULL
);

-- Allow public read access to order items for tracked orders
CREATE POLICY "Public can view order items for trackable orders"
ON public.order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM orders 
    WHERE orders.id = order_items.order_id 
    AND (orders.customer_phone IS NOT NULL OR orders.courier_tracking_code IS NOT NULL)
  )
);