-- Add courier tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS courier_consignment_id text,
ADD COLUMN IF NOT EXISTS courier_tracking_code text;