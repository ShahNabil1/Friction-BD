-- Fix function search_path for update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Drop overly permissive order insert policy and replace with more secure version
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;

-- Allow guest orders (no auth required) but require valid data
CREATE POLICY "Guest and authenticated users can create orders" 
ON public.orders FOR INSERT 
WITH CHECK (
    customer_phone IS NOT NULL 
    AND customer_name IS NOT NULL 
    AND total_amount > 0
);