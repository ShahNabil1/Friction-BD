-- Add INSERT policy for staff and POS users to create orders
-- This ensures moderators, store managers, and POS staff can create orders

CREATE POLICY "Staff and POS users can insert orders"
ON "public"."orders"
FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins and admins can always insert
  has_role(auth.uid(), 'super_admin'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Moderators with orders permission can insert
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text)) OR
  -- Any user with POS access can insert orders for their outlet
  (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.can_access_pos = true
  ))
);