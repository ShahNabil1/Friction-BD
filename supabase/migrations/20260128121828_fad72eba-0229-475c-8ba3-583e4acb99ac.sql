-- Add session_id and address_details columns to abandoned_checkouts table
ALTER TABLE public.abandoned_checkouts 
ADD COLUMN IF NOT EXISTS session_id text,
ADD COLUMN IF NOT EXISTS address_details jsonb DEFAULT '{}'::jsonb;

-- Create index on session_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_session_id 
ON public.abandoned_checkouts(session_id);

-- Create index on status for filtering pending leads
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_status 
ON public.abandoned_checkouts(status);

-- Create index on phone for upsert lookups
CREATE INDEX IF NOT EXISTS idx_abandoned_checkouts_phone 
ON public.abandoned_checkouts(phone);