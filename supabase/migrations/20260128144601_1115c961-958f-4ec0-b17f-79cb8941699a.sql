-- Allow super_admin to update all profiles (including permissions column)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile or admins can update any"
ON public.profiles FOR UPDATE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Allow super_admin and admin to manage user_roles
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Super admins and admins can manage user roles"
ON public.user_roles FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);