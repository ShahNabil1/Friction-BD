-- Function to swap an order item's variant and adjust inventory
CREATE OR REPLACE FUNCTION public.swap_order_item_variant(
  p_order_item_id UUID,
  p_old_variant_id UUID,
  p_new_variant_id UUID,
  p_new_size TEXT DEFAULT NULL,
  p_new_color TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_product_id UUID;
  v_order_id UUID;
  v_order_status TEXT;
  v_new_stock INTEGER;
  v_result JSONB;
BEGIN
  -- Verify user has staff role (admin, moderator, or super_admin)
  IF NOT (
    has_role(auth.uid(), 'admin') OR 
    has_role(auth.uid(), 'moderator') OR 
    has_role(auth.uid(), 'super_admin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Staff role required';
  END IF;

  -- Get order item and order info
  SELECT oi.product_id, oi.order_id, o.status
  INTO v_product_id, v_order_id, v_order_status
  FROM order_items oi
  JOIN orders o ON o.id = oi.order_id
  WHERE oi.id = p_order_item_id;

  IF v_product_id IS NULL THEN
    RAISE EXCEPTION 'Order item not found';
  END IF;

  -- Don't allow changes on shipped/delivered/cancelled orders
  IF v_order_status IN ('shipped', 'delivered', 'cancelled', 'returned') THEN
    RAISE EXCEPTION 'Cannot modify items on % orders', v_order_status;
  END IF;

  -- Check new variant has stock
  SELECT stock_quantity INTO v_new_stock
  FROM product_variants
  WHERE id = p_new_variant_id;

  IF v_new_stock IS NULL THEN
    RAISE EXCEPTION 'New variant not found';
  END IF;

  IF v_new_stock < 1 THEN
    RAISE EXCEPTION 'New variant is out of stock';
  END IF;

  -- Increment stock on old variant (return to inventory)
  IF p_old_variant_id IS NOT NULL THEN
    UPDATE product_variants
    SET stock_quantity = COALESCE(stock_quantity, 0) + 1,
        updated_at = NOW()
    WHERE id = p_old_variant_id;
  END IF;

  -- Decrement stock on new variant
  UPDATE product_variants
  SET stock_quantity = stock_quantity - 1,
      updated_at = NOW()
  WHERE id = p_new_variant_id;

  -- Update the order item with new variant info
  UPDATE order_items
  SET selected_variation = jsonb_build_object(
        'size', COALESCE(p_new_size, ''),
        'color', COALESCE(p_new_color, '')
      )
  WHERE id = p_order_item_id;

  -- Return success with new variant info
  v_result := jsonb_build_object(
    'success', true,
    'order_item_id', p_order_item_id,
    'new_variant_id', p_new_variant_id,
    'new_size', p_new_size,
    'new_color', p_new_color
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users (RPC handles role check internally)
GRANT EXECUTE ON FUNCTION public.swap_order_item_variant(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;