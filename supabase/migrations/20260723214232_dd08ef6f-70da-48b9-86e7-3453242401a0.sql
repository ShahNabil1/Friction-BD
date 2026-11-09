
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS courier_status TEXT,
  ADD COLUMN IF NOT EXISTS courier_cod_collected INTEGER,
  ADD COLUMN IF NOT EXISTS courier_delivery_charge INTEGER,
  ADD COLUMN IF NOT EXISTS courier_last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orders_courier_status ON public.orders (courier_status);
