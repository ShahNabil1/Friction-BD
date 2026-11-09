
CREATE TABLE public.courier_webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  consignment_id TEXT,
  tracking_code TEXT,
  courier_status TEXT,
  mapped_order_status TEXT,
  cod_collected NUMERIC,
  delivery_charge NUMERIC,
  note TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_courier_webhook_events_order ON public.courier_webhook_events(order_id, received_at DESC);
CREATE INDEX idx_courier_webhook_events_consignment ON public.courier_webhook_events(consignment_id);

GRANT SELECT ON public.courier_webhook_events TO authenticated;
GRANT ALL ON public.courier_webhook_events TO service_role;

ALTER TABLE public.courier_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view courier webhook events"
ON public.courier_webhook_events FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);
