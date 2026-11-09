-- Create table to track IP-based rate limits
CREATE TABLE public.sms_ip_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on IP for upsert operations
CREATE UNIQUE INDEX idx_sms_ip_rate_limits_ip ON public.sms_ip_rate_limits(ip_address);

-- Create index for cleanup queries
CREATE INDEX idx_sms_ip_rate_limits_window ON public.sms_ip_rate_limits(window_start);

-- Enable RLS (service role only - no public access)
ALTER TABLE public.sms_ip_rate_limits ENABLE ROW LEVEL SECURITY;