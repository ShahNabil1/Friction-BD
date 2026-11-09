-- Drop the existing function first (it has wrong signature)
DROP FUNCTION IF EXISTS public.create_manual_order(jsonb);

-- Create the function with the correct parameters that match frontend
CREATE OR REPLACE FUNCTION public.create_manual_order(
  p_user_id UUID DEFAULT NULL,
  p_customer_id UUID DEFAULT NULL,
  p_customer_name TEXT DEFAULT NULL,
  p_customer_email TEXT DEFAULT NULL,
  p_customer_phone TEXT DEFAULT NULL,
  p_shipping_address JSONB DEFAULT NULL,
  p_delivery_fee INTEGER DEFAULT 0,
  p_payment_status TEXT DEFAULT 'pending',
  p_payment_method TEXT DEFAULT 'cod',
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_order_id UUID;
  item JSONB;
  v_subtotal INTEGER := 0;
  v_total INTEGER := 0;
  v_shipping_address_text TEXT;
  v_shipping_city TEXT;
  v_shipping_area TEXT;
BEGIN
  -- Extract address components from shipping_address JSONB
  v_shipping_address_text := COALESCE(
    p_shipping_address->>'house_no', ''
  ) || ' ' || COALESCE(
    p_shipping_address->>'road_no', ''
  ) || ' ' || COALESCE(
    p_shipping_address->>'village', ''
  );
  v_shipping_city := COALESCE(p_shipping_address->>'zilla', p_shipping_address->>'city', '');
  v_shipping_area := COALESCE(p_shipping_address->>'thana', p_shipping_address->>'upazilla', p_shipping_address->>'area', '');

  -- Calculate subtotal from items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    -- Get product price if not in items
    v_subtotal := v_subtotal + COALESCE(
      (item->>'price')::INTEGER,
      (SELECT price_cents FROM products WHERE id = (item->>'product_id')::UUID)
    ) * COALESCE((item->>'quantity')::INTEGER, 1);
  END LOOP;

  -- Calculate total
  v_total := v_subtotal + COALESCE(p_delivery_fee, 0);

  -- Insert the order
  INSERT INTO orders (
    user_id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    shipping_city,
    shipping_area,
    items,
    subtotal,
    shipping_cost,
    delivery_fee,
    total_amount,
    payment_method,
    payment_status,
    status,
    source,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_customer_id,
    p_customer_name,
    p_customer_email,
    p_customer_phone,
    v_shipping_address_text,
    v_shipping_city,
    v_shipping_area,
    p_items,
    v_subtotal,
    p_delivery_fee,
    p_delivery_fee,
    v_total,
    p_payment_method,
    p_payment_status,
    'pending',
    'manual',
    NOW(),
    NOW()
  )
  RETURNING id INTO new_order_id;

  -- Insert order items
  FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    INSERT INTO order_items (
      order_id,
      product_id,
      title,
      product_name,
      product_image,
      quantity,
      qty,
      price,
      unit_price,
      selected_variation,
      created_at
    ) VALUES (
      new_order_id,
      (item->>'product_id')::UUID,
      COALESCE(item->>'product_name', 'Product'),
      item->>'product_name',
      item->>'product_image',
      COALESCE((item->>'quantity')::INTEGER, 1),
      COALESCE((item->>'quantity')::INTEGER, 1),
      COALESCE(
        (item->>'price')::INTEGER,
        (SELECT price_cents FROM products WHERE id = (item->>'product_id')::UUID)
      ),
      COALESCE(
        (item->>'price')::INTEGER,
        (SELECT price_cents FROM products WHERE id = (item->>'product_id')::UUID)
      ),
      CASE 
        WHEN item->>'size' IS NOT NULL OR item->>'color' IS NOT NULL 
        THEN jsonb_build_object('size', item->>'size', 'color', item->>'color')
        ELSE NULL
      END,
      NOW()
    );
  END LOOP;

  RETURN new_order_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_manual_order TO authenticated;