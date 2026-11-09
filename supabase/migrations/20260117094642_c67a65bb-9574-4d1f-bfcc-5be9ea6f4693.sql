-- 1) Manual customers table (for POS/offline customers)
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  email text,
  phone text NOT NULL,
  address jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_phone_unique ON public.customers(phone);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Admins can manage customers
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
CREATE POLICY "Admins can manage customers"
ON public.customers
FOR ALL
TO authenticated
USING (is_admin(auth.uid()))
WITH CHECK (is_admin(auth.uid()));

-- 2) Orders: allow manual orders + payment fields
ALTER TABLE public.orders
  ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id uuid NULL REFERENCES public.customers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_method text NULL,
  ADD COLUMN IF NOT EXISTS delivery_fee numeric NOT NULL DEFAULT 0;

-- Admin insert policy for orders (manual creation)
DROP POLICY IF EXISTS "Admins can create all orders" ON public.orders;
CREATE POLICY "Admins can create all orders"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- 3) Order items: link to products for stock deduction
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS product_id uuid NULL REFERENCES public.products(id) ON DELETE SET NULL;

-- Admin insert for order_items
DROP POLICY IF EXISTS "Admins can insert all order items" ON public.order_items;
CREATE POLICY "Admins can insert all order items"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (is_admin(auth.uid()));

-- 4) updated_at triggers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_customers_updated_at'
  ) THEN
    CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_orders_updated_at'
  ) THEN
    CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_order_items_updated_at'
  ) THEN
    -- order_items doesn't have updated_at, so skip
    NULL;
  END IF;
END $$;