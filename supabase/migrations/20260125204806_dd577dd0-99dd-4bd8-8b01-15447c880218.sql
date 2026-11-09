-- Create function to auto-update payment status on delivery
CREATE OR REPLACE FUNCTION public.update_payment_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes to 'delivered' and payment is not already 'paid', mark as paid
  IF NEW.status = 'delivered' 
     AND (OLD.status IS DISTINCT FROM 'delivered') 
     AND (NEW.payment_status IS NULL OR NEW.payment_status != 'paid') THEN
    NEW.payment_status := 'paid';
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS on_order_delivery_update ON public.orders;
CREATE TRIGGER on_order_delivery_update
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_payment_on_delivery();