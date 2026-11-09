-- Drop existing restrictive policies on outlet_inventory
DROP POLICY IF EXISTS "Managers can update their outlet inventory" ON outlet_inventory;
DROP POLICY IF EXISTS "Staff can view assigned outlet inventory" ON outlet_inventory;
DROP POLICY IF EXISTS "Super admins and admins can manage outlet inventory" ON outlet_inventory;

-- Create new comprehensive policies for outlet_inventory

-- SELECT: Staff can view their assigned outlet inventory
CREATE POLICY "Staff can view assigned outlet inventory"
ON outlet_inventory FOR SELECT
TO authenticated
USING (
  outlet_id IN (
    SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- INSERT: POS staff can add stock to their assigned outlet
CREATE POLICY "POS staff can insert outlet inventory"
ON outlet_inventory FOR INSERT
TO authenticated
WITH CHECK (
  -- Super admins and admins can insert anywhere
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
  -- Moderators with inventory permission can insert anywhere
  OR (has_role(auth.uid(), 'moderator') AND has_permission(auth.uid(), 'inventory'))
  -- POS staff can insert to their assigned outlet only
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND can_access_pos = true
    )
    AND outlet_id IN (
      SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- UPDATE: POS staff can update stock at their assigned outlet
CREATE POLICY "POS staff can update outlet inventory"
ON outlet_inventory FOR UPDATE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'moderator') AND has_permission(auth.uid(), 'inventory'))
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND can_access_pos = true
    )
    AND outlet_id IN (
      SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- DELETE: Only super_admin and admin can delete inventory records
CREATE POLICY "Admins can delete outlet inventory"
ON outlet_inventory FOR DELETE
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Update inventory_logs policies
DROP POLICY IF EXISTS "Staff can view their outlet logs" ON inventory_logs;
DROP POLICY IF EXISTS "Staff with inventory permission can manage logs" ON inventory_logs;

-- SELECT: Staff can view logs for their outlet
CREATE POLICY "Staff can view inventory logs"
ON inventory_logs FOR SELECT
TO authenticated
USING (
  outlet_id IN (
    SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
  )
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'moderator') AND has_permission(auth.uid(), 'inventory'))
);

-- INSERT: POS staff can create logs for their outlet
CREATE POLICY "POS staff can insert inventory logs"
ON inventory_logs FOR INSERT
TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
  OR (has_role(auth.uid(), 'moderator') AND has_permission(auth.uid(), 'inventory'))
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND can_access_pos = true
    )
    AND outlet_id IN (
      SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
    )
  )
);