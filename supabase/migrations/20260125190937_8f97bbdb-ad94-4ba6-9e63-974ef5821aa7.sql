-- Add coupon-related columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS coupon_code TEXT,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;