import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  id: string;
  title: string;
  price: number; // integer BDT
  qty: number;
  image?: string;
  variation?: Record<string, string>;
}

interface AddressDetails {
  road_no?: string;
  village?: string;
  thana?: string;
  zilla?: string;
  notes?: string;
}

interface SaveAbandonedCheckoutRequest {
  phone: string;
  customer_name?: string;
  customer_email?: string;
  user_id?: string | null;
  cart_items: CartItem[];
  session_id?: string;
  address_details?: AddressDetails;
}

/**
 * Capture an in-progress checkout as a real "incomplete" order.
 * The customer only needs a valid 11-digit phone; address/name may be empty.
 * If an incomplete order for this phone already exists (within 24h), it is
 * updated in place so admins see the latest cart/address as the user types.
 */
serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: SaveAbandonedCheckoutRequest = await req.json();
    const {
      phone,
      customer_name,
      customer_email,
      user_id,
      cart_items,
      address_details,
    } = body;

    // Only phone + at least one cart item are required
    if (!phone || !cart_items || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: phone, cart_items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("01")) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format. Must be 11 digits starting with 01." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const item of cart_items) {
      if (
        !item.id ||
        !item.title ||
        typeof item.price !== "number" ||
        typeof item.qty !== "number"
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid cart item format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Compute totals in whole-BDT integers
    const subtotal = cart_items.reduce(
      (sum, it) => sum + Math.round(it.price) * Math.round(it.qty),
      0
    );
    const totalAmount = subtotal; // shipping/discount unknown until customer picks

    // Build stored address (text + snapshot columns matching regular orders)
    const addr = address_details || {};
    const shippingAddressText = [addr.road_no, addr.village]
      .filter((p) => p && String(p).trim())
      .join(", ");
    const shippingCity = addr.zilla || null;
    const shippingArea = addr.thana || null;

    // Items JSONB snapshot (same shape used elsewhere in the app)
    const itemsJson = cart_items.map((it) => ({
      id: it.id,
      product_id: it.id,
      title: it.title,
      product_name: it.title,
      product_image: it.image || null,
      price: Math.round(it.price),
      qty: Math.round(it.qty),
      quantity: Math.round(it.qty),
      unit_price: Math.round(it.price),
      variation: it.variation || null,
      selected_variation: it.variation || null,
    }));

    // Look for an existing incomplete order for this phone from the last 24h
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existing, error: lookupError } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("customer_phone", phoneDigits)
      .eq("status", "incomplete")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("Lookup error:", lookupError);
      throw lookupError;
    }

    const orderPayload: Record<string, unknown> = {
      user_id: user_id || null,
      customer_name: customer_name || null,
      customer_email: customer_email || null,
      customer_phone: phoneDigits,
      shipping_address: shippingAddressText || null,
      shipping_city: shippingCity,
      shipping_area: shippingArea,
      items: itemsJson,
      subtotal,
      shipping_cost: 0,
      delivery_fee: 0,
      discount: 0,
      total_amount: totalAmount,
      payment_method: "cod",
      payment_status: "pending",
      status: "incomplete",
      source: "abandoned",
      notes: addr.notes || null,
      updated_at: new Date().toISOString(),
    };

    let orderId: string;

    if (existing) {
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("orders")
        .update(orderPayload)
        .eq("id", existing.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }
      orderId = updated.id;

      // Rebuild order_items snapshot so admin edit view matches latest cart
      await supabaseAdmin.from("order_items").delete().eq("order_id", orderId);
    } else {
      const { data: inserted, error: insertError } = await supabaseAdmin
        .from("orders")
        .insert(orderPayload)
        .select("id")
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        throw insertError;
      }
      orderId = inserted.id;
    }

    // Insert order_items rows so the pending/incomplete edit UI works as-is
    const orderItemsRows = cart_items.map((it) => ({
      order_id: orderId,
      product_id: it.id,
      title: it.title,
      product_name: it.title,
      product_image: it.image || null,
      price: Math.round(it.price) * Math.round(it.qty),
      qty: Math.round(it.qty),
      quantity: Math.round(it.qty),
      unit_price: Math.round(it.price),
      selected_variation: it.variation || null,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("order_items")
      .insert(orderItemsRows);
    if (itemsError) {
      console.error("Order items insert error:", itemsError);
      // Do not throw – order row is captured; items can be rebuilt from `items` JSONB
    }

    return new Response(
      JSON.stringify({ success: true, order_id: orderId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error saving incomplete order:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
