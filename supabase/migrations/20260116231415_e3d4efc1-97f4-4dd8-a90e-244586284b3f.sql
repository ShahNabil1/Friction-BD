-- =============================================
-- ADMIN DASHBOARD DATABASE SCHEMA
-- =============================================

-- 1. Create app_role enum type
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'moderator', 'customer');

-- 2. Create user_roles table (following security best practices)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- 3. Create permissions table
CREATE TABLE public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role app_role NOT NULL,
  page_path TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (role, page_path)
);

-- 4. Create email_templates table
CREATE TABLE public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_event TEXT NOT NULL UNIQUE,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 5. Create site_settings table
CREATE TABLE public.site_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create coupons table
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL DEFAULT 'percentage', -- 'percentage' or 'fixed'
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 7. Create customer_carts table for real-time cart tracking
CREATE TABLE public.customer_carts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 8. Add tracking_code and shipping_address to orders
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tracking_code TEXT,
ADD COLUMN IF NOT EXISTS shipping_address JSONB,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_email TEXT,
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

-- 9. Enable RLS on all new tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_carts ENABLE ROW LEVEL SECURITY;

-- 10. Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- 11. Create function to check if user is admin (any admin role)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin', 'admin', 'moderator')
  )
$$;

-- 12. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- 13. RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can view all roles"
ON public.user_roles
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- 14. RLS Policies for permissions
CREATE POLICY "Anyone can view permissions"
ON public.permissions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Super admins can manage permissions"
ON public.permissions
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- 15. RLS Policies for email_templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Super admins and admins can manage email templates"
ON public.email_templates
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

-- 16. RLS Policies for site_settings
CREATE POLICY "Anyone can view site settings"
ON public.site_settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage site settings"
ON public.site_settings
FOR ALL
USING (public.is_admin(auth.uid()));

-- 17. RLS Policies for coupons
CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
USING (public.is_admin(auth.uid()));

-- 18. RLS Policies for customer_carts
CREATE POLICY "Users can manage their own cart"
ON public.customer_carts
FOR ALL
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all carts"
ON public.customer_carts
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 19. Update orders RLS to allow admins to view/manage all orders
CREATE POLICY "Admins can view all orders"
ON public.orders
FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update all orders"
ON public.orders
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- 20. Update order_items RLS to allow admins to view all items
CREATE POLICY "Admins can view all order items"
ON public.order_items
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 21. Update profiles RLS to allow admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.is_admin(auth.uid()));

-- 22. Create trigger to auto-assign customer role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- 23. Create triggers for updated_at columns
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON public.email_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_coupons_updated_at
  BEFORE UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customer_carts_updated_at
  BEFORE UPDATE ON public.customer_carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 24. Insert default permissions for each role
INSERT INTO public.permissions (role, page_path, can_access) VALUES
-- Super Admin has access to everything
('super_admin', '/admin/dashboard', true),
('super_admin', '/admin/orders', true),
('super_admin', '/admin/inventory', true),
('super_admin', '/admin/users', true),
('super_admin', '/admin/products', true),
('super_admin', '/admin/categories', true),
('super_admin', '/admin/reports', true),
('super_admin', '/admin/website', true),
('super_admin', '/admin/customers', true),
('super_admin', '/admin/emails', true),
-- Admin has access to most things except user management
('admin', '/admin/dashboard', true),
('admin', '/admin/orders', true),
('admin', '/admin/inventory', true),
('admin', '/admin/users', false),
('admin', '/admin/products', true),
('admin', '/admin/categories', true),
('admin', '/admin/reports', true),
('admin', '/admin/website', true),
('admin', '/admin/customers', true),
('admin', '/admin/emails', true),
-- Moderator has limited access
('moderator', '/admin/dashboard', true),
('moderator', '/admin/orders', true),
('moderator', '/admin/inventory', false),
('moderator', '/admin/users', false),
('moderator', '/admin/products', false),
('moderator', '/admin/categories', false),
('moderator', '/admin/reports', false),
('moderator', '/admin/website', false),
('moderator', '/admin/customers', true),
('moderator', '/admin/emails', false);

-- 25. Insert default email templates
INSERT INTO public.email_templates (trigger_event, subject, html_body) VALUES
('order_created', 'Order Confirmation - Fashion Elegance', '<h1>Thank you for your order!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been received and is being processed.</p><p>Total: {{total_amount}}</p><p>We will notify you when your order ships.</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_confirmed', 'Order Confirmed - Fashion Elegance', '<h1>Your order has been confirmed!</h1><p>Hi {{customer_name}},</p><p>Great news! Your order #{{order_id}} has been confirmed and will be processed shortly.</p><p>Total: {{total_amount}}</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_processing', 'Order Processing - Fashion Elegance', '<h1>Your order is being processed</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} is now being prepared for shipment.</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_shipped', 'Your Order Has Shipped! - Fashion Elegance', '<h1>Your order is on its way!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been shipped.</p><p>Tracking Code: <strong>{{tracking_code}}</strong></p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_delivered', 'Order Delivered - Fashion Elegance', '<h1>Your order has been delivered!</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been delivered successfully.</p><p>Thank you for shopping with us!</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_cancelled', 'Order Cancelled - Fashion Elegance', '<h1>Your order has been cancelled</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been cancelled.</p><p>If you have any questions, please contact our support team.</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('order_on_hold', 'Order On Hold - Fashion Elegance', '<h1>Your order is on hold</h1><p>Hi {{customer_name}},</p><p>Your order #{{order_id}} has been placed on hold.</p><p>Our team will contact you shortly to resolve any issues.</p><p>Best regards,<br>Fashion Elegance Team</p>'),
('admin_new_order', 'New Order Alert! #{{order_id}}', '<h1>New Order Received!</h1><p>A new order has been placed.</p><p>Order ID: {{order_id}}</p><p>Customer: {{customer_name}}</p><p>Email: {{customer_email}}</p><p>Phone: {{customer_phone}}</p><p>Total: {{total_amount}}</p><p>View the order in the admin dashboard.</p>');

-- 26. Insert default site settings
INSERT INTO public.site_settings (setting_key, setting_value) VALUES
('announcement_bar', '{"text": "Get 5% Flat Discount on all products! Use code: FLAT5", "code": "FLAT5", "is_active": true}'::jsonb),
('contact_info', '{"phone": "+880 1234-567890", "email": "support@fashionelegance.com", "address": "123 Fashion Street, Dhaka, Bangladesh"}'::jsonb),
('footer_text', '{"copyright": "© 2024 Fashion Elegance. All rights reserved.", "about": "Your premier destination for luxury watches and perfumes."}'::jsonb),
('hero_slides', '[]'::jsonb);

-- 27. Enable Realtime for orders and order_items
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;