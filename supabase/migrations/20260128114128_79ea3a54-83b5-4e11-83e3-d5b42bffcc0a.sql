-- Create product_variants table for SKU-based stock management
CREATE TABLE public.product_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT,
  color TEXT,
  sku TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER,
  compare_at_price_cents INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id, size, color)
);

-- Create index for faster lookups
CREATE INDEX idx_product_variants_product_id ON public.product_variants(product_id);
CREATE INDEX idx_product_variants_sku ON public.product_variants(sku) WHERE sku IS NOT NULL;

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Policies: Public read, admin write
CREATE POLICY "Product variants are viewable by everyone"
ON public.product_variants FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product variants"
ON public.product_variants FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Trigger to update updated_at
CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update inventory management trigger to use product_variants
CREATE OR REPLACE FUNCTION public.manage_inventory_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  item RECORD;
  variant_id_val UUID;
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- DECREMENT stock when status becomes 'shipped' or 'delivered' (from something else)
  IF NEW.status IN ('shipped', 'delivered') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('shipped', 'delivered')) THEN
    
    -- Loop through order_items and decrement stock
    FOR item IN
      SELECT product_id, qty, selected_variation FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      -- Try to find matching variant first
      IF item.selected_variation IS NOT NULL THEN
        SELECT id INTO variant_id_val
        FROM product_variants
        WHERE product_id = item.product_id
          AND COALESCE(size, '') = COALESCE(item.selected_variation->>'size', '')
          AND COALESCE(color, '') = COALESCE(item.selected_variation->>'color', '');
        
        IF variant_id_val IS NOT NULL THEN
          -- Decrement from variant
          UPDATE product_variants
          SET stock_quantity = GREATEST(0, COALESCE(stock_quantity, 0) - item.qty),
              updated_at = now()
          WHERE id = variant_id_val;
        END IF;
      END IF;
      
      -- Also update main product stock (as aggregate/fallback)
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
      SELECT product_id, qty, selected_variation FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      IF item.selected_variation IS NOT NULL THEN
        SELECT id INTO variant_id_val
        FROM product_variants
        WHERE product_id = item.product_id
          AND COALESCE(size, '') = COALESCE(item.selected_variation->>'size', '')
          AND COALESCE(color, '') = COALESCE(item.selected_variation->>'color', '');
        
        IF variant_id_val IS NOT NULL THEN
          UPDATE product_variants
          SET stock_quantity = COALESCE(stock_quantity, 0) + item.qty,
              updated_at = now()
          WHERE id = variant_id_val;
        END IF;
      END IF;
      
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
      SELECT product_id, qty, selected_variation FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
    LOOP
      IF item.selected_variation IS NOT NULL THEN
        SELECT id INTO variant_id_val
        FROM product_variants
        WHERE product_id = item.product_id
          AND COALESCE(size, '') = COALESCE(item.selected_variation->>'size', '')
          AND COALESCE(color, '') = COALESCE(item.selected_variation->>'color', '');
        
        IF variant_id_val IS NOT NULL THEN
          UPDATE product_variants
          SET stock_quantity = COALESCE(stock_quantity, 0) + item.qty,
              updated_at = now()
          WHERE id = variant_id_val;
        END IF;
      END IF;
      
      UPDATE products
      SET stock = COALESCE(stock, 0) + item.qty,
          updated_at = now()
      WHERE id = item.product_id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;