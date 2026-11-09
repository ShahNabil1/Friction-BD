-- Add permissions array column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT ARRAY[]::text[];

-- Create a security definer function to check if user has specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Super admins have all permissions
  SELECT CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = _user_id AND role = 'super_admin'
    ) THEN true
    -- Check if the permission exists in user's permissions array
    ELSE EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = _user_id AND _permission = ANY(permissions)
    )
  END
$$;

-- Update RLS policy for profiles to allow super_admin to update any profile
DROP POLICY IF EXISTS "Super admins can update all profiles" ON public.profiles;
CREATE POLICY "Super admins can update all profiles"
ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add policy for super_admin to insert profiles (for edge cases)
DROP POLICY IF EXISTS "Super admins can insert profiles" ON public.profiles;
CREATE POLICY "Super admins can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin') OR auth.uid() = id);

-- Update products RLS to use permission-based access
DROP POLICY IF EXISTS "Staff with products permission can manage" ON public.products;
CREATE POLICY "Staff with products permission can manage"
ON public.products
FOR ALL
USING (
  is_admin(auth.uid()) AND (
    has_role(auth.uid(), 'super_admin') OR
    has_permission(auth.uid(), 'products')
  )
)
WITH CHECK (
  is_admin(auth.uid()) AND (
    has_role(auth.uid(), 'super_admin') OR
    has_permission(auth.uid(), 'products')
  )
);

-- Update orders RLS to use permission-based access for staff
DROP POLICY IF EXISTS "Staff with orders permission can manage" ON public.orders;
CREATE POLICY "Staff with orders permission can manage"
ON public.orders
FOR ALL
USING (
  is_admin(auth.uid()) AND (
    has_role(auth.uid(), 'super_admin') OR
    has_permission(auth.uid(), 'orders')
  )
)
WITH CHECK (
  is_admin(auth.uid()) AND (
    has_role(auth.uid(), 'super_admin') OR
    has_permission(auth.uid(), 'orders')
  )
);

-- Comment explaining the permissions system
COMMENT ON COLUMN public.profiles.permissions IS 'Array of permission slugs: dashboard, orders, products, inventory, customers, reports, website, emails, courier, returns, categories, brands, reviews';