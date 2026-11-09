-- Fix RLS policy to include super_admin role for site_settings
DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;

CREATE POLICY "Admins and Super Admins can manage site settings"
  ON public.site_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));