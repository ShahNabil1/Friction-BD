
-- Update the award_loyalty_points trigger to BLOCK points on credit/due sales
-- Business rule: If there is even 1 taka of due, no points are awarded.
-- Also blocks points when a credit sale is later fully repaid.

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
    
    -- BLOCK: No points for any order that involves credit/due
    -- This covers: full due, partial due, and later repayment of due
    IF NEW.payment_method = 'due' THEN
      RETURN NEW;
    END IF;
    
    -- Also block if the order ever had a due amount (repayment scenario)
    IF COALESCE(OLD.due_amount, 0) > 0 THEN
      RETURN NEW;
    END IF;

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
