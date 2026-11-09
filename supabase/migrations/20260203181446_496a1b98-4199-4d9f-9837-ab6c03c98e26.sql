-- 1. Add is_online_active column to products table
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS is_online_active boolean DEFAULT true;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_products_online_active ON public.products(is_online_active) WHERE is_online_active = true;

-- 2. Create inventory_logs table for tracking stock movements
CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE CASCADE NOT NULL,
  qty_change integer NOT NULL,
  action_type text NOT NULL, -- 'stock_in', 'stock_out', 'transfer_in', 'transfer_out', 'order_deduct', 'order_return', 'adjustment'
  reference_id text, -- Order ID or Transfer ID if applicable
  notes text,
  user_id uuid,
  user_name text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_inventory_logs_outlet ON public.inventory_logs(outlet_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_variant ON public.inventory_logs(variant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_product ON public.inventory_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created ON public.inventory_logs(created_at DESC);

-- Enable RLS on inventory_logs
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inventory_logs
CREATE POLICY "Staff with inventory permission can manage logs"
ON public.inventory_logs
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'inventory'))
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'inventory'))
);

-- Staff can view logs for their assigned outlet
CREATE POLICY "Staff can view their outlet logs"
ON public.inventory_logs
FOR SELECT
USING (
  outlet_id IN (
    SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid()
  )
);

-- 3. Add trigger to auto-sync outlet_inventory changes to global stock
CREATE OR REPLACE FUNCTION public.log_inventory_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log if quantity actually changed
  IF TG_OP = 'INSERT' THEN
    INSERT INTO inventory_logs (outlet_id, product_id, variant_id, qty_change, action_type, notes, user_id)
    VALUES (NEW.outlet_id, NEW.product_id, NEW.variant_id, NEW.quantity, 'stock_in', 'Initial stock', auth.uid());
  ELSIF TG_OP = 'UPDATE' AND OLD.quantity != NEW.quantity THEN
    INSERT INTO inventory_logs (outlet_id, product_id, variant_id, qty_change, action_type, notes, user_id)
    VALUES (NEW.outlet_id, NEW.product_id, NEW.variant_id, NEW.quantity - OLD.quantity, 
            CASE WHEN NEW.quantity > OLD.quantity THEN 'stock_in' ELSE 'stock_out' END,
            'Manual adjustment', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for logging inventory changes
DROP TRIGGER IF EXISTS log_outlet_inventory_changes ON public.outlet_inventory;
CREATE TRIGGER log_outlet_inventory_changes
AFTER INSERT OR UPDATE ON public.outlet_inventory
FOR EACH ROW
EXECUTE FUNCTION public.log_inventory_change();