-- Fix RLS for orders table to allow POS staff to update order status
-- This allows staff with can_access_pos = true to update orders for their assigned outlet

-- Drop existing policies that might conflict
DROP POLICY IF EXISTS "POS staff can update order status" ON orders;

-- Create policy allowing POS staff to update orders for their outlet
CREATE POLICY "POS staff can update order status" 
ON orders 
FOR UPDATE 
TO authenticated
USING (
  -- Super admins and admins can update any order
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  -- Moderators with orders permission
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
  -- POS staff can update orders assigned to their outlet
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_access_pos = true)
    AND outlet_id IN (SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
  (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_access_pos = true)
    AND outlet_id IN (SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid())
  )
);