-- Fix RLS policies for orders and order_items tables
-- Ensure moderators and POS staff can INSERT, UPDATE, and SELECT orders

-- ======================
-- ORDERS TABLE POLICIES
-- ======================

-- Drop the overly restrictive guest insert policy and recreate it
DROP POLICY IF EXISTS "Guest and authenticated users can create orders" ON "public"."orders";

-- Create a more permissive INSERT policy for website orders (guest checkout)
CREATE POLICY "Website users can create orders"
ON "public"."orders"
FOR INSERT
TO authenticated, anon
WITH CHECK (
  -- Basic validation for all orders
  customer_phone IS NOT NULL AND
  customer_name IS NOT NULL AND
  total_amount > 0
);

-- Ensure POS staff can view ALL orders for their outlet (not just their own)
DROP POLICY IF EXISTS "POS staff can view outlet orders" ON "public"."orders";
CREATE POLICY "POS staff can view outlet orders"
ON "public"."orders"
FOR SELECT
TO authenticated
USING (
  -- POS staff can view orders for their assigned outlet
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
      AND profiles.assigned_outlet_id = orders.outlet_id
    )
  )
  -- Also allow viewing if outlet_id is null (newly created orders)
  OR (
    outlet_id IS NULL AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
    )
  )
);

-- Ensure POS staff can UPDATE orders for their outlet
DROP POLICY IF EXISTS "POS staff can update order status" ON "public"."orders";
CREATE POLICY "POS staff can update orders"
ON "public"."orders"
FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
    )
    AND (
      outlet_id IS NULL OR
      outlet_id IN (SELECT profiles.assigned_outlet_id FROM profiles WHERE profiles.id = auth.uid())
    )
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
  (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
    )
  )
);

-- ======================
-- ORDER_ITEMS TABLE POLICIES
-- ======================

-- Allow POS staff and moderators to INSERT order items
DROP POLICY IF EXISTS "Order items insertable with valid order" ON "public"."order_items";
CREATE POLICY "Staff and POS users can insert order items"
ON "public"."order_items"
FOR INSERT
TO authenticated
WITH CHECK (
  -- Order must exist
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id)
  AND (
    -- Admins can always insert
    has_role(auth.uid(), 'super_admin'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Moderators with orders permission
    (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
    -- POS staff can insert
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
    )
  )
);

-- Allow anonymous users to create order items (for guest checkout)
CREATE POLICY "Guest users can insert order items"
ON "public"."order_items"
FOR INSERT
TO anon
WITH CHECK (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id)
);