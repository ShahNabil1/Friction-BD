-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS sync_outlet_inventory_to_products ON outlet_inventory;

-- Update the function to handle INSERT, UPDATE, and DELETE properly
CREATE OR REPLACE FUNCTION public.sync_global_stock_from_outlets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_product_id UUID;
  v_variant_id UUID;
BEGIN
  -- Get the product_id and variant_id based on operation type
  IF TG_OP = 'DELETE' THEN
    v_product_id := OLD.product_id;
    v_variant_id := OLD.variant_id;
  ELSE
    v_product_id := NEW.product_id;
    v_variant_id := NEW.variant_id;
  END IF;

  -- Update variant stock if variant exists
  IF v_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM outlet_inventory
      WHERE variant_id = v_variant_id
    ),
    updated_at = now()
    WHERE id = v_variant_id;
  END IF;
  
  -- Update product stock (aggregate of all outlet inventory for this product)
  UPDATE products
  SET stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM outlet_inventory
    WHERE product_id = v_product_id
  ),
  updated_at = now()
  WHERE id = v_product_id;
  
  -- Return appropriate value based on operation
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Create the trigger on outlet_inventory table
CREATE TRIGGER sync_outlet_inventory_to_products
AFTER INSERT OR UPDATE OR DELETE ON outlet_inventory
FOR EACH ROW
EXECUTE FUNCTION sync_global_stock_from_outlets();

-- ONE-TIME FIX: Recalculate stock for ALL products from outlet_inventory
UPDATE products p
SET stock = COALESCE((
  SELECT SUM(quantity)
  FROM outlet_inventory oi
  WHERE oi.product_id = p.id
), 0),
updated_at = now();

-- Also sync all variant stock quantities
UPDATE product_variants pv
SET stock_quantity = COALESCE((
  SELECT SUM(quantity)
  FROM outlet_inventory oi
  WHERE oi.variant_id = pv.id
), 0),
updated_at = now();