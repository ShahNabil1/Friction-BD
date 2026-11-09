REVOKE ALL ON FUNCTION public.recalculate_product_inventory(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalculate_product_inventory(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.recalculate_product_inventory(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.recalculate_product_inventory(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.sync_global_stock_from_outlets() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_global_stock_from_outlets() FROM anon;
REVOKE ALL ON FUNCTION public.sync_global_stock_from_outlets() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sync_global_stock_from_outlets() TO service_role;