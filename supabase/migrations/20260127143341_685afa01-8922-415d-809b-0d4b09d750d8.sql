-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Customers table
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    area TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Categories table
CREATE TABLE public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    image_url_optimized TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
    sort_order INT DEFAULT 0,
    is_featured BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Brands table
CREATE TABLE public.brands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

-- Products table
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    brand TEXT,
    category TEXT,
    subcategory TEXT,
    shop_category TEXT,
    badge TEXT,
    price_cents INT NOT NULL DEFAULT 0,
    compare_at_price_cents INT,
    images JSONB DEFAULT '[]'::jsonb,
    color_options JSONB DEFAULT '[]'::jsonb,
    size_options JSONB DEFAULT '[]'::jsonb,
    variants JSONB DEFAULT '[]'::jsonb,
    specs JSONB DEFAULT '[]'::jsonb,
    faq JSONB DEFAULT '[]'::jsonb,
    benefits JSONB DEFAULT '[]'::jsonb,
    stock INT DEFAULT 0,
    rating NUMERIC(2,1) DEFAULT 0,
    review_count INT DEFAULT 0,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Orders table
CREATE TABLE public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_email TEXT,
    customer_phone TEXT,
    shipping_address TEXT,
    shipping_city TEXT,
    shipping_area TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal INT DEFAULT 0,
    shipping_cost INT DEFAULT 0,
    discount INT DEFAULT 0,
    total_amount INT NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cod',
    payment_status TEXT DEFAULT 'pending',
    status TEXT DEFAULT 'pending',
    notes TEXT,
    admin_notes TEXT,
    courier_tracking_code TEXT,
    courier_consignment_id TEXT,
    locked_by UUID REFERENCES auth.users(id),
    locked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Store settings table
CREATE TABLE public.store_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_inside_dhaka INT DEFAULT 60,
    delivery_outside_dhaka INT DEFAULT 100,
    is_free_shipping_active BOOLEAN DEFAULT false,
    trust_badges JSONB DEFAULT '[]'::jsonb,
    hero_slides JSONB DEFAULT '[]'::jsonb,
    signature_section JSONB,
    offer_banner JSONB,
    featured_reviews JSONB DEFAULT '[]'::jsonb,
    meta_pixel_id TEXT,
    meta_conversion_token TEXT,
    google_analytics_id TEXT,
    google_tag_manager_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- Site settings table (key-value store)
CREATE TABLE public.site_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Customer carts table
CREATE TABLE public.customer_carts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    cart_items JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_carts ENABLE ROW LEVEL SECURITY;

-- Abandoned checkouts table
CREATE TABLE public.abandoned_checkouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_phone TEXT,
    customer_name TEXT,
    customer_email TEXT,
    cart_items JSONB DEFAULT '[]'::jsonb,
    total_amount INT DEFAULT 0,
    status TEXT DEFAULT 'pending',
    recovered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Fraud check cache table
CREATE TABLE public.fraud_check_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT NOT NULL UNIQUE,
    total_order INT DEFAULT 0,
    success_delivery INT DEFAULT 0,
    cancel_order INT DEFAULT 0,
    success_ratio NUMERIC(5,2) DEFAULT 0,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fraud_check_cache ENABLE ROW LEVEL SECURITY;

-- Product reviews table
CREATE TABLE public.product_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    customer_name TEXT,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Customer addresses table
CREATE TABLE public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;

-- Admin notifications table
CREATE TABLE public.admin_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Activity log table
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- POS drafts table
CREATE TABLE public.pos_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT,
    cart_items JSONB DEFAULT '[]'::jsonb,
    customer_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pos_drafts ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Profiles: users can view/edit own, admins can view all
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- User roles: only admins can manage
CREATE POLICY "Admins can manage user roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Products: public read, admin write
CREATE POLICY "Products are viewable by everyone" ON public.products FOR SELECT USING (true);
CREATE POLICY "Admins can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Categories: public read, admin write
CREATE POLICY "Categories are viewable by everyone" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Brands: public read, admin write
CREATE POLICY "Brands are viewable by everyone" ON public.brands FOR SELECT USING (true);
CREATE POLICY "Admins can manage brands" ON public.brands FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Store settings: public read, admin write
CREATE POLICY "Store settings are viewable by everyone" ON public.store_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage store settings" ON public.store_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Site settings: public read, admin write
CREATE POLICY "Site settings are viewable by everyone" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage site settings" ON public.site_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders: users see own, admins see all
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all orders" ON public.orders FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Anyone can create orders" ON public.orders FOR INSERT WITH CHECK (true);

-- Customers: admins only
CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Customer carts: users manage own
CREATE POLICY "Users can manage own cart" ON public.customer_carts FOR ALL USING (auth.uid() = user_id);

-- Customer addresses: users manage own
CREATE POLICY "Users can manage own addresses" ON public.customer_addresses FOR ALL USING (auth.uid() = user_id);

-- Abandoned checkouts: admins only
CREATE POLICY "Admins can manage abandoned checkouts" ON public.abandoned_checkouts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Fraud check cache: admins only
CREATE POLICY "Admins can manage fraud cache" ON public.fraud_check_cache FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Product reviews: public read approved, users create own, admins manage all
CREATE POLICY "Approved reviews are public" ON public.product_reviews FOR SELECT USING (is_approved = true);
CREATE POLICY "Users can create reviews" ON public.product_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage reviews" ON public.product_reviews FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin notifications: admins only
CREATE POLICY "Admins can manage notifications" ON public.admin_notifications FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Activity log: admins only
CREATE POLICY "Admins can view activity log" ON public.activity_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create logs" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- POS drafts: users manage own
CREATE POLICY "Users can manage own POS drafts" ON public.pos_drafts FOR ALL USING (auth.uid() = user_id);

-- Create manual order function
CREATE OR REPLACE FUNCTION public.create_manual_order(order_data JSONB)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_order_id UUID;
BEGIN
    INSERT INTO orders (
        customer_name, customer_phone, customer_email,
        shipping_address, shipping_city, shipping_area,
        items, subtotal, shipping_cost, discount, total_amount,
        payment_method, status, notes
    )
    VALUES (
        order_data->>'customer_name',
        order_data->>'customer_phone',
        order_data->>'customer_email',
        order_data->>'shipping_address',
        order_data->>'shipping_city',
        order_data->>'shipping_area',
        (order_data->'items')::jsonb,
        (order_data->>'subtotal')::int,
        (order_data->>'shipping_cost')::int,
        COALESCE((order_data->>'discount')::int, 0),
        (order_data->>'total_amount')::int,
        COALESCE(order_data->>'payment_method', 'cod'),
        'pending',
        order_data->>'notes'
    )
    RETURNING id INTO new_order_id;
    
    RETURN new_order_id;
END;
$$;

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_brands_updated_at BEFORE UPDATE ON public.brands FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_store_settings_updated_at BEFORE UPDATE ON public.store_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_site_settings_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customer_addresses_updated_at BEFORE UPDATE ON public.customer_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_pos_drafts_updated_at BEFORE UPDATE ON public.pos_drafts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_abandoned_checkouts_updated_at BEFORE UPDATE ON public.abandoned_checkouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();