
-- Add loyalty_points to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS loyalty_points integer NOT NULL DEFAULT 0;

-- Add points columns to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_monetary_value numeric DEFAULT 0;

-- Create function to award loyalty points on paid orders
CREATE OR REPLACE FUNCTION public.award_loyalty_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_customer_id UUID;
  v_billable_amount NUMERIC;
  v_points_to_award INTEGER;
BEGIN
  -- Only fire when payment_status becomes 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Find the customer
    v_customer_id := NEW.customer_id;
    
    IF v_customer_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Calculate billable amount: total minus any portion paid by points
    v_billable_amount := GREATEST(0, NEW.total_amount - COALESCE(NEW.points_monetary_value, 0));
    
    -- 1 point per 100 BDT spent
    v_points_to_award := FLOOR(v_billable_amount / 100);
    
    IF v_points_to_award > 0 THEN
      UPDATE customers
      SET loyalty_points = loyalty_points + v_points_to_award,
          updated_at = now()
      WHERE id = v_customer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_award_loyalty_points ON public.orders;
CREATE TRIGGER trg_award_loyalty_points
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.award_loyalty_points();
