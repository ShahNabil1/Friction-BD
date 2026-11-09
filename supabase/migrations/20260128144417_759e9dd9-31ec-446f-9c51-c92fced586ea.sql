-- Create a function to check if user has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(_user_id uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = _user_id
      AND ur.role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = _user_id
      AND (
        p.permissions::jsonb ? _permission
        OR _permission = ANY(ARRAY(SELECT jsonb_array_elements_text(p.permissions::jsonb)))
      )
  )
$$;

-- Update RLS policy for orders table - allow users with 'orders' permission
DROP POLICY IF EXISTS "Admins and Super Admins can manage all orders" ON public.orders;
CREATE POLICY "Staff with orders permission can manage orders"
ON public.orders FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
);

-- Update RLS policy for order_items table
DROP POLICY IF EXISTS "Admins and Super Admins can manage order items" ON public.order_items;
CREATE POLICY "Staff with orders permission can manage order items"
ON public.order_items FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
);

-- Update RLS policy for products table
DROP POLICY IF EXISTS "Admins and Super Admins can manage products" ON public.products;
CREATE POLICY "Staff with products permission can manage products"
ON public.products FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'products'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'products'))
);

-- Update RLS policy for product_variants table
DROP POLICY IF EXISTS "Admins can manage product variants" ON public.product_variants;
CREATE POLICY "Staff with inventory permission can manage variants"
ON public.product_variants FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND (has_permission(auth.uid(), 'inventory') OR has_permission(auth.uid(), 'products')))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND (has_permission(auth.uid(), 'inventory') OR has_permission(auth.uid(), 'products')))
);

-- Update RLS policy for customers table
DROP POLICY IF EXISTS "Admins and Super Admins can manage customers" ON public.customers;
CREATE POLICY "Staff with customers permission can manage customers"
ON public.customers FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'customers'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'customers'))
);

-- Update RLS policy for categories table
DROP POLICY IF EXISTS "Admins and Super Admins can manage categories" ON public.categories;
CREATE POLICY "Staff with categories permission can manage categories"
ON public.categories FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'categories'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'categories'))
);

-- Update RLS policy for brands table
DROP POLICY IF EXISTS "Admins and Super Admins can manage brands" ON public.brands;
CREATE POLICY "Staff with brands permission can manage brands"
ON public.brands FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'brands'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'brands'))
);

-- Update RLS policy for product_reviews table (admin management)
DROP POLICY IF EXISTS "Admins and Super Admins can manage reviews" ON public.product_reviews;
CREATE POLICY "Staff with reviews permission can manage reviews"
ON public.product_reviews FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'reviews'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'reviews'))
);

-- Update RLS policy for store_settings table
DROP POLICY IF EXISTS "Admins and Super Admins can manage store settings" ON public.store_settings;
CREATE POLICY "Staff with website permission can manage store settings"
ON public.store_settings FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
);

-- Update RLS policy for site_settings table
DROP POLICY IF EXISTS "Admins and Super Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Staff with website permission can manage site settings"
ON public.site_settings FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
);

-- Update RLS policy for abandoned_checkouts table
DROP POLICY IF EXISTS "Admins and Super Admins can manage abandoned checkouts" ON public.abandoned_checkouts;
CREATE POLICY "Staff with orders permission can manage abandoned checkouts"
ON public.abandoned_checkouts FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
);

-- Update RLS policy for fraud_check_cache table
DROP POLICY IF EXISTS "Admins can manage fraud cache" ON public.fraud_check_cache;
CREATE POLICY "Staff with orders permission can manage fraud cache"
ON public.fraud_check_cache FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
);

-- Update RLS policy for fraud_courier_breakdown table
DROP POLICY IF EXISTS "Admins can manage courier breakdown" ON public.fraud_courier_breakdown;
CREATE POLICY "Staff with orders permission can manage courier breakdown"
ON public.fraud_courier_breakdown FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'))
);

-- Update RLS policy for coupons table
DROP POLICY IF EXISTS "Admins and Super Admins can manage coupons" ON public.coupons;
CREATE POLICY "Staff with website permission can manage coupons"
ON public.coupons FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'website'))
);