-- Update RLS policy for user_addresses to include moderator access
DROP POLICY IF EXISTS "Users can manage own user_addresses" ON public.user_addresses;

CREATE POLICY "Users can manage own user_addresses" 
ON public.user_addresses 
FOR ALL 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Update RLS policy for customer_carts to include moderator access
DROP POLICY IF EXISTS "Users can manage own cart" ON public.customer_carts;

CREATE POLICY "Users can manage own cart" 
ON public.customer_carts 
FOR ALL 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);