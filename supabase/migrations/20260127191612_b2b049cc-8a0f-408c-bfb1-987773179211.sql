-- Allow super_admin to manage store_settings (currently only admin)
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can manage store settings" ON public.store_settings;

CREATE POLICY "Admins and Super Admins can manage store settings"
ON public.store_settings
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
