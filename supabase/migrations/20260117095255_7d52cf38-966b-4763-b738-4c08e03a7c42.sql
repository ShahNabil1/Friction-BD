-- Inventory-safe manual order creation (single transaction)
CREATE OR REPLACE FUNCTION public.create_manual_order(
  p_user_id uuid,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_shipping_address jsonb,
  p_delivery_fee numeric,
  p_payment_status text,
  p_payment_method text,
  p_items jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_item jsonb;
  v_product record;
  v_qty int;
  v_subtotal numeric := 0;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'items required';
  END IF;

  -- Lock + validate stock, compute subtotal from DB prices
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::int, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'invalid quantity';
    END IF;

    SELECT id, title, stock, price_cents, images
      INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'product not found';
    END IF;

    IF v_product.stock < v_qty THEN
      RAISE EXCEPTION 'insufficient stock for % (have %, need %)', v_product.title, v_product.stock, v_qty;
    END IF;

    v_subtotal := v_subtotal + (v_product.price_cents::numeric * v_qty);
  END LOOP;

  -- Create order (total = subtotal + delivery fee)
  INSERT INTO public.orders (
    user_id,
    customer_id,
    source,
    status,
    total_amount,
    delivery_fee,
    payment_status,
    payment_method,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address
  ) VALUES (
    p_user_id,
    p_customer_id,
    'manual',
    'pending',
    v_subtotal + COALESCE(p_delivery_fee, 0),
    COALESCE(p_delivery_fee, 0),
    COALESCE(p_payment_status, 'pending'),
    p_payment_method,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    p_shipping_address
  )
  RETURNING id INTO v_order_id;

  -- Insert items + decrement stock (same row locks already held by FOR UPDATE)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := (v_item->>'quantity')::int;

    SELECT id, title, stock, price_cents, images
      INTO v_product
    FROM public.products
    WHERE id = (v_item->>'product_id')::uuid
    FOR UPDATE;

    UPDATE public.products
      SET stock = stock - v_qty
    WHERE id = v_product.id;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price
    ) VALUES (
      v_order_id,
      v_product.id,
      COALESCE(v_item->>'product_name', v_product.title),
      COALESCE(v_item->>'product_image', NULLIF((v_product.images->>0), '')),
      v_qty,
      v_product.price_cents
    );
  END LOOP;

  RETURN v_order_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_manual_order(
  uuid, uuid, text, text, text, jsonb, numeric, text, text, jsonb
) TO authenticated;