-- Ensure public product pages can read stock availability for active online products only
GRANT SELECT ON public.outlet_inventory TO anon;
GRANT SELECT ON public.outlet_inventory TO authenticated;
GRANT ALL ON public.outlet_inventory TO service_role;

DROP POLICY IF EXISTS "Public can view online product inventory" ON public.outlet_inventory;
CREATE POLICY "Public can view online product inventory"
ON public.outlet_inventory
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1
    FROM public.products p
    WHERE p.id = outlet_inventory.product_id
      AND p.status = 'active'
      AND (p.is_online_active = true OR p.is_online_active IS NULL)
  )
);

-- Remove duplicate stock-sync triggers and keep one canonical trigger
DROP TRIGGER IF EXISTS sync_global_stock_on_outlet_change ON public.outlet_inventory;
DROP TRIGGER IF EXISTS sync_outlet_inventory_to_products ON public.outlet_inventory;

CREATE OR REPLACE FUNCTION public.recalculate_product_inventory(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF _product_id IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.product_variants pv
  SET stock_quantity = COALESCE((
    SELECT SUM(oi.quantity)
    FROM public.outlet_inventory oi
    WHERE oi.variant_id = pv.id
  ), 0),
  updated_at = now()
  WHERE pv.product_id = _product_id;

  UPDATE public.products p
  SET stock = COALESCE((
    SELECT SUM(oi.quantity)
    FROM public.outlet_inventory oi
    WHERE oi.product_id = _product_id
  ), 0),
  updated_at = now()
  WHERE p.id = _product_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sync_global_stock_from_outlets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recalculate_product_inventory(OLD.product_id);
    RETURN OLD;
  END IF;

  PERFORM public.recalculate_product_inventory(NEW.product_id);

  IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
    PERFORM public.recalculate_product_inventory(OLD.product_id);
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER sync_outlet_inventory_to_products
AFTER INSERT OR UPDATE OR DELETE ON public.outlet_inventory
FOR EACH ROW
EXECUTE FUNCTION public.sync_global_stock_from_outlets();

-- Prevent duplicate default/non-variant inventory rows too
DROP INDEX IF EXISTS public.outlet_inventory_one_row_per_variant_idx;
CREATE UNIQUE INDEX outlet_inventory_one_row_per_variant_idx
ON public.outlet_inventory (
  outlet_id,
  product_id,
  COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
);

-- Recalculate all existing product and variant stock from outlet inventory
UPDATE public.product_variants pv
SET stock_quantity = COALESCE((
  SELECT SUM(oi.quantity)
  FROM public.outlet_inventory oi
  WHERE oi.variant_id = pv.id
), 0),
updated_at = now();

UPDATE public.products p
SET stock = COALESCE((
  SELECT SUM(oi.quantity)
  FROM public.outlet_inventory oi
  WHERE oi.product_id = p.id
), 0),
updated_at = now();