-- Create table to cache BD Courier fraud check results
CREATE TABLE public.fraud_check_cache (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL UNIQUE,
  total_order INTEGER DEFAULT 0,
  success_delivery INTEGER DEFAULT 0,
  cancel_order INTEGER DEFAULT 0,
  success_ratio NUMERIC DEFAULT 0,
  raw_response JSONB,
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast phone lookups
CREATE INDEX idx_fraud_check_cache_phone ON public.fraud_check_cache(phone);

-- Create index for cache expiry queries
CREATE INDEX idx_fraud_check_cache_checked_at ON public.fraud_check_cache(checked_at);

-- Enable RLS
ALTER TABLE public.fraud_check_cache ENABLE ROW LEVEL SECURITY;

-- Admins can view cached fraud data
CREATE POLICY "Admins can view fraud cache"
  ON public.fraud_check_cache
  FOR SELECT
  USING (is_admin(auth.uid()));

-- Admins can insert/update fraud cache (via edge function with service role)
CREATE POLICY "Service role can manage fraud cache"
  ON public.fraud_check_cache
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_fraud_check_cache_updated_at
  BEFORE UPDATE ON public.fraud_check_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();