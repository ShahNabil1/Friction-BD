-- Add RLS policy for POS staff to view orders assigned to their outlet
DROP POLICY IF EXISTS "POS staff can view outlet orders" ON orders;

CREATE POLICY "POS staff can view outlet orders" 
ON orders 
FOR SELECT 
TO authenticated
USING (
  -- POS staff can view orders assigned to their outlet
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_access_pos = true)
  AND outlet_id IN (SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid())
);