-- Create table to track SMS rate limits
CREATE TABLE public.sms_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  phone TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index on phone for upsert operations
CREATE UNIQUE INDEX idx_sms_rate_limits_phone ON public.sms_rate_limits(phone);

-- Create index for cleanup queries
CREATE INDEX idx_sms_rate_limits_window ON public.sms_rate_limits(window_start);

-- Enable RLS (but allow service role access)
ALTER TABLE public.sms_rate_limits ENABLE ROW LEVEL SECURITY;

-- No public access - only service role can access this table
-- This is intentional for security