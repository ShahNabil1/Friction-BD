-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- Add missing columns to user_addresses  
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS flat_no TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS road_no TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS village TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS post_office TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS thana TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'Bangladesh';
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add missing columns to pos_drafts
ALTER TABLE public.pos_drafts ADD COLUMN IF NOT EXISTS label TEXT;

-- Add user_name column to activity_logs
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_name TEXT;

-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    discount_type TEXT NOT NULL DEFAULT 'percentage',
    discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    min_order_amount INT DEFAULT 0,
    max_uses INT,
    current_uses INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coupons are viewable by everyone" ON public.coupons FOR SELECT USING (true);
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create order_items table
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    price INT NOT NULL,
    qty INT NOT NULL DEFAULT 1,
    image TEXT,
    variation JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT 
    USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));
CREATE POLICY "Admins can manage order items" ON public.order_items FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Order items insertable with order" ON public.order_items FOR INSERT WITH CHECK (true);

-- Add coupon-related columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount INT DEFAULT 0;