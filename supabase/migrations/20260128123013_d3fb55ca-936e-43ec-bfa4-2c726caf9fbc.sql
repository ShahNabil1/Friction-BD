-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can manage abandoned checkouts" ON abandoned_checkouts;

-- Create new policy that includes both admin and super_admin
CREATE POLICY "Admins and Super Admins can manage abandoned checkouts"
ON abandoned_checkouts
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));