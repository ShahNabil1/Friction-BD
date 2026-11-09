-- Add payment_details JSONB column for multi-tender/split payment support
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_details jsonb DEFAULT NULL;

COMMENT ON COLUMN public.orders.payment_details IS 'Array of payment tenders, e.g. [{"method":"cash","amount":1000},{"method":"bkash","amount":299}]';