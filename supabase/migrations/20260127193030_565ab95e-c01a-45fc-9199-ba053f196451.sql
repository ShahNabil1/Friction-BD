-- Ensure RLS is enabled
ALTER TABLE public.fraud_check_cache ENABLE ROW LEVEL SECURITY;

-- Allow both admin and super_admin to read/write cached fraud data
ALTER POLICY "Admins can manage fraud cache"
ON public.fraud_check_cache
USING (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::public.app_role)
  OR has_role(auth.uid(), 'super_admin'::public.app_role)
);
