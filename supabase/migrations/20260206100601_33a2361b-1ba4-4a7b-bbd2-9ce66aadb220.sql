-- Add paid_amount and due_amount columns for credit sale tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS paid_amount integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS due_amount integer DEFAULT 0;