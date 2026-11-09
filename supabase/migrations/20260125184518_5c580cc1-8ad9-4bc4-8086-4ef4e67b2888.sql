-- Make user_id nullable to support guest checkout
ALTER TABLE public.orders ALTER COLUMN user_id DROP NOT NULL;

-- Ensure customer_email is not null for all orders (guest or authenticated)
ALTER TABLE public.orders ALTER COLUMN customer_email SET NOT NULL;

-- Add an index on customer_email for faster lookups when linking orders
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);

-- Update RLS policies to allow guest orders (insert without user_id)
DROP POLICY IF EXISTS "Users can insert their own orders" ON public.orders;

CREATE POLICY "Anyone can insert orders" 
ON public.orders 
FOR INSERT 
WITH CHECK (true);

-- Update select policy to allow users to see their orders by email too
DROP POLICY IF EXISTS "Users can view their own orders" ON public.orders;

CREATE POLICY "Users can view their own orders" 
ON public.orders 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR customer_email = (SELECT email FROM auth.users WHERE id = auth.uid())
);