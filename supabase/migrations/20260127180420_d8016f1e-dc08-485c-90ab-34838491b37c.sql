-- Drop existing SELECT policies for profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create updated policy that allows both admin and super_admin to view all profiles
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also update user_addresses policy so admins can view customer addresses
DROP POLICY IF EXISTS "Users can manage own user_addresses" ON public.user_addresses;

CREATE POLICY "Users can manage own user_addresses" 
ON public.user_addresses 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Update customer_carts policy so admins can view customer carts
DROP POLICY IF EXISTS "Users can manage own cart" ON public.customer_carts;

CREATE POLICY "Users can manage own cart" 
ON public.customer_carts 
FOR ALL 
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);