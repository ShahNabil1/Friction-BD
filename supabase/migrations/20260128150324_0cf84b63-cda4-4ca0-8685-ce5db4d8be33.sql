-- Update RLS policy for abandoned_checkouts to use lead_recovery permission
DROP POLICY IF EXISTS "Staff with orders permission can manage abandoned checkouts" ON public.abandoned_checkouts;

CREATE POLICY "Staff with lead_recovery permission can manage abandoned checkouts" 
ON public.abandoned_checkouts 
FOR ALL 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'lead_recovery'::text))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'lead_recovery'::text))
);