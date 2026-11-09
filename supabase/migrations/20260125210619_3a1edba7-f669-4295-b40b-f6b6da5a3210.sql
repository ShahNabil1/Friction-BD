-- Add locking columns to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS locked_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS locked_by_name text,
ADD COLUMN IF NOT EXISTS lock_expiration timestamp with time zone;

-- Create index for faster lock queries
CREATE INDEX IF NOT EXISTS idx_orders_locked_by ON public.orders(locked_by) WHERE locked_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_lock_expiration ON public.orders(lock_expiration) WHERE lock_expiration IS NOT NULL;