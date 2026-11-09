-- Add missing columns to activity_logs
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT now();

-- Add missing columns to user_addresses
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS upazilla TEXT;
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS zilla TEXT;

-- Add missing columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_fee INT DEFAULT 0;

-- Add missing columns to order_items
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS product_image TEXT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS quantity INT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS unit_price INT;
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS selected_variation JSONB;

-- Fix order_items insert policy to be more restrictive
DROP POLICY IF EXISTS "Order items insertable with order" ON public.order_items;
CREATE POLICY "Order items insertable with valid order" ON public.order_items FOR INSERT 
WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id)
);

-- Add role column to profiles for customer tracking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'customer';

-- Update customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_orders INT DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS total_spent INT DEFAULT 0;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS last_order_at TIMESTAMPTZ;