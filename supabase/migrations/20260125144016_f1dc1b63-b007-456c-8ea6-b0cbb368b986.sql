-- Allow admins to view all user addresses
CREATE POLICY "Admins can view all user addresses"
ON public.user_addresses
FOR SELECT
USING (is_admin(auth.uid()));