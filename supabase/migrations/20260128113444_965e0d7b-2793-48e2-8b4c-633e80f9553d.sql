-- Automated inventory sync: decrement on shipped, increment on returned

-- Function to manage stock when order status changes
CREATE OR REPLACE FUNCTION public.manage_inventory_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- DECREMENT stock when status becomes 'shipped' or 'delivered' (from something else)
  IF NEW.status IN ('shipped', 'delivered') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('shipped', 'delivered')) THEN
    
    -- Loop through order_items and decrement product stock
    FOR item IN
      SELECT product_id, qty FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE products
      SET stock = GREATEST(0, COALESCE(stock, 0) - item.qty),
          updated_at = now()
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  -- INCREMENT stock when status becomes 'returned' (from shipped/delivered)
  IF NEW.status = 'returned' 
     AND OLD.status IN ('shipped', 'delivered') THEN
    
    FOR item IN
      SELECT product_id, qty FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE products
      SET stock = COALESCE(stock, 0) + item.qty,
          updated_at = now()
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  -- Also handle 'cancelled' to return stock if it was shipped
  IF NEW.status = 'cancelled' 
     AND OLD.status IN ('shipped', 'delivered') THEN
    
    FOR item IN
      SELECT product_id, qty FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      UPDATE products
      SET stock = COALESCE(stock, 0) + item.qty,
          updated_at = now()
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trg_manage_inventory_on_status_change ON public.orders;

CREATE TRIGGER trg_manage_inventory_on_status_change
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.manage_inventory_on_status_change();