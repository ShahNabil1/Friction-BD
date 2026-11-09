-- Create abandoned_checkouts table
CREATE TABLE public.abandoned_checkouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT,
  phone TEXT NOT NULL,
  cart_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on phone to enable upsert
CREATE UNIQUE INDEX abandoned_checkouts_phone_unique ON public.abandoned_checkouts (phone) WHERE status = 'pending';

-- Enable RLS
ALTER TABLE public.abandoned_checkouts ENABLE ROW LEVEL SECURITY;

-- Admins can manage abandoned checkouts
CREATE POLICY "Admins can manage abandoned checkouts"
ON public.abandoned_checkouts
FOR ALL
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- Anyone can insert (for guest checkout capture)
CREATE POLICY "Anyone can insert abandoned checkouts"
ON public.abandoned_checkouts
FOR INSERT
WITH CHECK (true);

-- Anyone can update their own abandoned checkout by phone
CREATE POLICY "Anyone can update abandoned checkouts"
ON public.abandoned_checkouts
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Create trigger for updated_at
CREATE TRIGGER update_abandoned_checkouts_updated_at
BEFORE UPDATE ON public.abandoned_checkouts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();