-- Add missing columns to email_templates
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS trigger_event TEXT;
ALTER TABLE public.email_templates ADD COLUMN IF NOT EXISTS html_body TEXT;

-- Add tracking_code alias column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_code TEXT;

-- Add order_date to orders  
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS order_date TIMESTAMPTZ DEFAULT now();