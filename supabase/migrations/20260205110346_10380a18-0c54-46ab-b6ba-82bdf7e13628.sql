-- Update the inventory management trigger to deduct stock at 'confirmed' status
-- instead of waiting for 'shipped/delivered'

CREATE OR REPLACE FUNCTION public.manage_inventory_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
  variant_id_val UUID;
  v_outlet_id UUID;
  current_qty INTEGER;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the outlet_id from the order (use Main Branch if not set)
  v_outlet_id := COALESCE(NEW.outlet_id, (SELECT id FROM outlets WHERE is_main_branch = true LIMIT 1));

  -- DECREMENT stock when status becomes 'confirmed' or 'processing' (from pending/null)
  -- This is the early deduction to prevent overselling
  IF NEW.status IN ('confirmed', 'processing') 
     AND (OLD.status IS NULL OR OLD.status IN ('pending')) THEN
    
    FOR item IN
      SELECT oi.product_id, COALESCE(oi.quantity, oi.qty, 1) as qty, oi.selected_variation 
      FROM order_items oi 
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      variant_id_val := NULL;
      
      -- Try to find matching variant
      IF item.selected_variation IS NOT NULL THEN
        SELECT id INTO variant_id_val
        FROM product_variants
        WHERE product_id = item.product_id
          AND COALESCE(size, '') = COALESCE(item.selected_variation->>'size', '')
          AND COALESCE(color, '') = COALESCE(item.selected_variation->>'color', '');
      END IF;
      
      -- Deduct from outlet_inventory
      UPDATE outlet_inventory
      SET quantity = GREATEST(0, quantity - item.qty), updated_at = now()
      WHERE outlet_id = v_outlet_id
        AND product_id = item.product_id
        AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(variant_id_val, '00000000-0000-0000-0000-000000000000');
        
      -- Log the deduction
      INSERT INTO inventory_logs (outlet_id, product_id, variant_id, qty_change, action_type, notes, reference_id)
      VALUES (v_outlet_id, item.product_id, variant_id_val, -item.qty, 'order_confirmed', 'Stock deducted for order confirmation', NEW.id::text);
    END LOOP;
  END IF;

  -- INCREMENT stock when status becomes 'returned' or 'cancelled' (from confirmed/processing/shipped/delivered)
  IF NEW.status IN ('returned', 'cancelled') 
     AND OLD.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'packaging') THEN
    
    FOR item IN
      SELECT oi.product_id, COALESCE(oi.quantity, oi.qty, 1) as qty, oi.selected_variation 
      FROM order_items oi 
      WHERE oi.order_id = NEW.id AND oi.product_id IS NOT NULL
    LOOP
      variant_id_val := NULL;
      
      IF item.selected_variation IS NOT NULL THEN
        SELECT id INTO variant_id_val
        FROM product_variants
        WHERE product_id = item.product_id
          AND COALESCE(size, '') = COALESCE(item.selected_variation->>'size', '')
          AND COALESCE(color, '') = COALESCE(item.selected_variation->>'color', '');
      END IF;
      
      -- Add back to outlet_inventory (upsert)
      INSERT INTO outlet_inventory (outlet_id, product_id, variant_id, quantity)
      VALUES (v_outlet_id, item.product_id, variant_id_val, item.qty)
      ON CONFLICT (outlet_id, product_id, variant_id)
      DO UPDATE SET quantity = outlet_inventory.quantity + item.qty, updated_at = now();
      
      -- Log the restock
      INSERT INTO inventory_logs (outlet_id, product_id, variant_id, qty_change, action_type, notes, reference_id)
      VALUES (v_outlet_id, item.product_id, variant_id_val, item.qty, 'order_cancelled', 'Stock restored due to order cancellation/return', NEW.id::text);
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- Ensure trigger exists on orders table
DROP TRIGGER IF EXISTS trigger_manage_inventory_on_status_change ON orders;
CREATE TRIGGER trigger_manage_inventory_on_status_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION manage_inventory_on_status_change();