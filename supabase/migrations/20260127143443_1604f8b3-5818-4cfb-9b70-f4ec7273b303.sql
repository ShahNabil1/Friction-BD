-- Add missing columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_onboarded BOOLEAN DEFAULT false;

-- Add missing columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'website';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS locked_by_name TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS lock_expiration TIMESTAMPTZ;

-- Add missing columns to admin_notifications
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info';
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.admin_notifications ADD COLUMN IF NOT EXISTS created_by_name TEXT;

-- Add missing columns to product_reviews
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS reviewer_name TEXT;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS is_verified_purchase BOOLEAN DEFAULT false;
ALTER TABLE public.product_reviews ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Add missing columns to abandoned_checkouts
ALTER TABLE public.abandoned_checkouts ADD COLUMN IF NOT EXISTS phone TEXT;

-- Create user_addresses table (different from customer_addresses)
CREATE TABLE IF NOT EXISTS public.user_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    label TEXT,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    house_no TEXT,
    road TEXT,
    area TEXT,
    district TEXT,
    division TEXT,
    postal_code TEXT,
    additional_info TEXT,
    address TEXT,
    city TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own user_addresses" ON public.user_addresses FOR ALL USING (auth.uid() = user_id);

CREATE TRIGGER update_user_addresses_updated_at BEFORE UPDATE ON public.user_addresses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create activity_logs table (note: different from activity_log)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    details JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view activity_logs" ON public.activity_logs FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated users can create activity_logs" ON public.activity_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);