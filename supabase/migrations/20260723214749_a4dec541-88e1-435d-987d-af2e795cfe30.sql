
-- 1. Global sequence for Friction order numbers
CREATE SEQUENCE IF NOT EXISTS public.orders_ft_seq START WITH 1 INCREMENT BY 1;

-- 2. Backfill existing NULL order_numbers in chronological order
DO $$
DECLARE
  r RECORD;
  next_val BIGINT;
BEGIN
  -- Reset sequence to 1 for backfill
  PERFORM setval('public.orders_ft_seq', 1, false);

  FOR r IN
    SELECT id FROM public.orders
    WHERE order_number IS NULL OR order_number = ''
    ORDER BY created_at ASC, id ASC
  LOOP
    next_val := nextval('public.orders_ft_seq');
    UPDATE public.orders
    SET order_number = 'FT-' || next_val::text
    WHERE id = r.id;
  END LOOP;
END $$;

-- 3. Ensure uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
  ON public.orders (order_number)
  WHERE order_number IS NOT NULL;

-- 4. Trigger function to auto-assign on insert
CREATE OR REPLACE FUNCTION public.assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := 'FT-' || nextval('public.orders_ft_seq')::text;
  END IF;
  RETURN NEW;
END;
$$;

-- 5. Attach trigger
DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_order_number();

-- 6. Grant sequence usage
GRANT USAGE, SELECT ON SEQUENCE public.orders_ft_seq TO authenticated, anon, service_role;
