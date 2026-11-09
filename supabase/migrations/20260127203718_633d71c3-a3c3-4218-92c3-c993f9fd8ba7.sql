-- Allow both admin and super_admin to manage brands
DROP POLICY IF EXISTS "Admins can manage brands" ON public.brands;

CREATE POLICY "Admins and Super Admins can manage brands"
ON public.brands
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
