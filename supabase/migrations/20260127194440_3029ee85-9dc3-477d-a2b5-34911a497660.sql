-- Create table to store detailed courier breakdown per phone
CREATE TABLE public.fraud_courier_breakdown (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  courier_key text NOT NULL,
  courier_name text,
  logo_url text,
  total_parcel integer DEFAULT 0,
  success_parcel integer DEFAULT 0,
  cancelled_parcel integer DEFAULT 0,
  success_ratio numeric DEFAULT 0,
  checked_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(phone, courier_key)
);

-- Enable RLS
ALTER TABLE public.fraud_courier_breakdown ENABLE ROW LEVEL SECURITY;

-- Policy: Admins and super_admins can manage
CREATE POLICY "Admins can manage courier breakdown"
ON public.fraud_courier_breakdown
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Index for fast lookups
CREATE INDEX idx_fraud_courier_breakdown_phone ON public.fraud_courier_breakdown(phone);
CREATE INDEX idx_fraud_courier_breakdown_checked_at ON public.fraud_courier_breakdown(checked_at DESC);