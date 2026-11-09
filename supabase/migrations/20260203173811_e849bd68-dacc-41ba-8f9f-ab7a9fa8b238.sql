-- =============================================
-- MULTI-OUTLET MANAGEMENT SCHEMA
-- =============================================

-- 1. Create outlets table
CREATE TABLE public.outlets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  is_main_branch BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create outlet_inventory table (links products to outlets with specific stock)
CREATE TABLE public.outlet_inventory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(outlet_id, product_id, variant_id)
);

-- 3. Create inventory_transfers table
CREATE TABLE public.inventory_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  to_outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE RESTRICT,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 4. Add outlet assignment to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS assigned_outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS outlet_role TEXT DEFAULT 'cashier' CHECK (outlet_role IN ('manager', 'cashier', 'viewer'));

-- 5. Add outlet_id to orders table for tracking which outlet processed the order
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL;

-- =============================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.outlets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outlet_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transfers ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES FOR OUTLETS
-- =============================================

-- Super admins and admins can manage all outlets
CREATE POLICY "Super admins and admins can manage outlets"
ON public.outlets FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Staff can view outlets they are assigned to
CREATE POLICY "Staff can view assigned outlet"
ON public.outlets FOR SELECT
USING (
  id IN (
    SELECT assigned_outlet_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- =============================================
-- RLS POLICIES FOR OUTLET_INVENTORY
-- =============================================

-- Super admins and admins can manage all outlet inventory
CREATE POLICY "Super admins and admins can manage outlet inventory"
ON public.outlet_inventory FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Staff can view their outlet's inventory
CREATE POLICY "Staff can view assigned outlet inventory"
ON public.outlet_inventory FOR SELECT
USING (
  outlet_id IN (
    SELECT assigned_outlet_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Managers can update their outlet's inventory
CREATE POLICY "Managers can update their outlet inventory"
ON public.outlet_inventory FOR UPDATE
USING (
  outlet_id IN (
    SELECT assigned_outlet_id FROM public.profiles 
    WHERE id = auth.uid() AND outlet_role = 'manager'
  )
);

-- =============================================
-- RLS POLICIES FOR INVENTORY_TRANSFERS
-- =============================================

-- Super admins and admins can manage all transfers
CREATE POLICY "Super admins and admins can manage transfers"
ON public.inventory_transfers FOR ALL
USING (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin') OR 
  has_role(auth.uid(), 'admin')
);

-- Staff can view transfers involving their outlet
CREATE POLICY "Staff can view transfers for their outlet"
ON public.inventory_transfers FOR SELECT
USING (
  from_outlet_id IN (SELECT assigned_outlet_id FROM public.profiles WHERE id = auth.uid()) OR
  to_outlet_id IN (SELECT assigned_outlet_id FROM public.profiles WHERE id = auth.uid())
);

-- Managers can create transfers from their outlet
CREATE POLICY "Managers can create transfers from their outlet"
ON public.inventory_transfers FOR INSERT
WITH CHECK (
  from_outlet_id IN (
    SELECT assigned_outlet_id FROM public.profiles 
    WHERE id = auth.uid() AND outlet_role = 'manager'
  )
);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE TRIGGER update_outlets_updated_at
BEFORE UPDATE ON public.outlets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_outlet_inventory_updated_at
BEFORE UPDATE ON public.outlet_inventory
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inventory_transfers_updated_at
BEFORE UPDATE ON public.inventory_transfers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- MIGRATION: CREATE MAIN BRANCH & MIGRATE STOCK
-- =============================================

-- Insert Main Branch outlet
INSERT INTO public.outlets (name, address, phone, is_main_branch, is_active)
VALUES ('Main Branch', 'Doctor''s Oasis (1st Floor), Rumena Afaz Road, Puran Bogra', '09611-656671', true, true);

-- Migrate existing variant stock to Main Branch outlet_inventory
INSERT INTO public.outlet_inventory (outlet_id, product_id, variant_id, quantity)
SELECT 
  (SELECT id FROM public.outlets WHERE is_main_branch = true LIMIT 1),
  pv.product_id,
  pv.id,
  pv.stock_quantity
FROM public.product_variants pv
WHERE pv.stock_quantity > 0;

-- Also migrate products without variants (using product.stock)
INSERT INTO public.outlet_inventory (outlet_id, product_id, variant_id, quantity)
SELECT 
  (SELECT id FROM public.outlets WHERE is_main_branch = true LIMIT 1),
  p.id,
  NULL,
  COALESCE(p.stock, 0)
FROM public.products p
WHERE NOT EXISTS (SELECT 1 FROM public.product_variants pv WHERE pv.product_id = p.id)
  AND COALESCE(p.stock, 0) > 0
ON CONFLICT (outlet_id, product_id, variant_id) DO NOTHING;

-- Update all existing orders to belong to Main Branch
UPDATE public.orders
SET outlet_id = (SELECT id FROM public.outlets WHERE is_main_branch = true LIMIT 1)
WHERE outlet_id IS NULL;

-- =============================================
-- FUNCTION: SYNC GLOBAL STOCK FROM OUTLET INVENTORY
-- =============================================

CREATE OR REPLACE FUNCTION public.sync_global_stock_from_outlets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update variant stock
  IF NEW.variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = (
      SELECT COALESCE(SUM(quantity), 0)
      FROM outlet_inventory
      WHERE variant_id = NEW.variant_id
    ),
    updated_at = now()
    WHERE id = NEW.variant_id;
  END IF;
  
  -- Update product stock (aggregate of all variants or direct stock)
  UPDATE products
  SET stock = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM outlet_inventory
    WHERE product_id = NEW.product_id
  ),
  updated_at = now()
  WHERE id = NEW.product_id;
  
  RETURN NEW;
END;
$$;

-- Trigger to sync global stock whenever outlet inventory changes
CREATE TRIGGER sync_global_stock_on_outlet_change
AFTER INSERT OR UPDATE OR DELETE ON public.outlet_inventory
FOR EACH ROW
EXECUTE FUNCTION public.sync_global_stock_from_outlets();

-- =============================================
-- FUNCTION: PROCESS INVENTORY TRANSFER
-- =============================================

CREATE OR REPLACE FUNCTION public.complete_inventory_transfer(p_transfer_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer RECORD;
  v_source_qty INTEGER;
BEGIN
  -- Get transfer details
  SELECT * INTO v_transfer
  FROM inventory_transfers
  WHERE id = p_transfer_id AND status = 'pending';
  
  IF v_transfer IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Transfer not found or already processed');
  END IF;
  
  -- Check source outlet has enough stock
  SELECT quantity INTO v_source_qty
  FROM outlet_inventory
  WHERE outlet_id = v_transfer.from_outlet_id
    AND product_id = v_transfer.product_id
    AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(v_transfer.variant_id, '00000000-0000-0000-0000-000000000000');
  
  IF v_source_qty IS NULL OR v_source_qty < v_transfer.quantity THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insufficient stock at source outlet');
  END IF;
  
  -- Deduct from source outlet
  UPDATE outlet_inventory
  SET quantity = quantity - v_transfer.quantity, updated_at = now()
  WHERE outlet_id = v_transfer.from_outlet_id
    AND product_id = v_transfer.product_id
    AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000') = COALESCE(v_transfer.variant_id, '00000000-0000-0000-0000-000000000000');
  
  -- Add to destination outlet (upsert)
  INSERT INTO outlet_inventory (outlet_id, product_id, variant_id, quantity)
  VALUES (v_transfer.to_outlet_id, v_transfer.product_id, v_transfer.variant_id, v_transfer.quantity)
  ON CONFLICT (outlet_id, product_id, variant_id)
  DO UPDATE SET quantity = outlet_inventory.quantity + v_transfer.quantity, updated_at = now();
  
  -- Mark transfer as completed
  UPDATE inventory_transfers
  SET status = 'completed', completed_at = now(), updated_at = now()
  WHERE id = p_transfer_id;
  
  RETURN jsonb_build_object('success', true, 'transfer_id', p_transfer_id);
END;
$$;

-- =============================================
-- UPDATE INVENTORY TRIGGER FOR OUTLET CONTEXT
-- =============================================

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
BEGIN
  -- Only proceed if status actually changed
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get the outlet_id from the order (use Main Branch if not set)
  v_outlet_id := COALESCE(NEW.outlet_id, (SELECT id FROM outlets WHERE is_main_branch = true LIMIT 1));

  -- DECREMENT stock when status becomes 'shipped' or 'delivered' (from something else)
  IF NEW.status IN ('shipped', 'delivered') 
     AND (OLD.status IS NULL OR OLD.status NOT IN ('shipped', 'delivered')) THEN
    
    FOR item IN
      SELECT product_id, qty, selected_variation FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
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
    END LOOP;
  END IF;

  -- INCREMENT stock when status becomes 'returned' or 'cancelled' (from shipped/delivered)
  IF NEW.status IN ('returned', 'cancelled') 
     AND OLD.status IN ('shipped', 'delivered') THEN
    
    FOR item IN
      SELECT product_id, qty, selected_variation FROM order_items WHERE order_id = NEW.id AND product_id IS NOT NULL
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
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;