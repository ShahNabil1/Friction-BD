-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create updated policy that includes moderators
CREATE POLICY "Staff can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);