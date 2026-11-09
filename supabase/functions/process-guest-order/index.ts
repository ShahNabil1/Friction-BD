import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
  image?: string;
  variation?: {
    color?: string;
    size?: string;
  };
}

interface ShippingAddress {
  house_no?: string;
  flat_no?: string;
  road_no?: string;
  village?: string;
  post_office?: string;
  thana?: string;
  upazilla?: string;
  zilla?: string;
  notes?: string;
}

interface GuestOrderRequest {
  email: string;
  full_name: string;
  phone: string;
  shipping_address: ShippingAddress;
  cart_items: CartItem[];
  notes?: string;
  shipping_cost?: number;
  coupon_code?: string;
  discount_amount?: number;
  total_amount?: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: GuestOrderRequest = await req.json();
    const { email, full_name, phone, shipping_address, cart_items, notes, shipping_cost, coupon_code, discount_amount, total_amount } = body;

    if (!full_name || !phone || !cart_items || cart_items.length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: full_name, phone, cart_items" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(
          JSON.stringify({ error: "Invalid email format" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    let userId: string | null = null;
    let isNewUser = false;

    if (email && email.trim()) {
      const { data: existingUsers, error: lookupError } = await supabaseAdmin.auth.admin.listUsers();
      
      if (!lookupError) {
        const existingUser = existingUsers.users.find(
          (u) => u.email?.toLowerCase() === email.toLowerCase()
        );
        
        if (existingUser) {
          userId = existingUser.id;
        }
      }
    }

    if (!userId && email && email.trim()) {
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email,
        email_confirm: false,
        user_metadata: {
          full_name: full_name,
          phone: phone,
        },
      });

      if (!createError && newUser?.user) {
        userId = newUser.user.id;
        isNewUser = true;

        try {
          await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
            redirectTo: `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/auth/callback`,
          });
        } catch (inviteErr) {
          console.error("Failed to send invite:", inviteErr);
        }
      }
    }

    const calculatedSubtotal = cart_items.reduce((sum, item) => sum + item.price * item.qty, 0);
    const finalShippingCost = shipping_cost || 0;
    const finalDiscount = discount_amount || 0;
    const finalTotal = total_amount || (calculatedSubtotal + finalShippingCost - finalDiscount);

    // Keep a copy of cart items on the order row as a fallback source for UIs.
    // This also helps future debugging if order_items insert fails.
    const orderItemsJson = cart_items.map((item) => ({
      product_id: item.id,
      product_name: item.title,
      product_image: item.image || null,
      quantity: item.qty,
      unit_price: item.price,
      price: item.price * item.qty,
      selected_variation: item.variation || null,
    }));

    const { data: order, error: orderError } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        total_amount: finalTotal,
        subtotal: calculatedSubtotal,
        delivery_fee: finalShippingCost,
        shipping_cost: finalShippingCost,
        status: "pending",
        payment_status: "pending",
        source: "website",
        customer_name: full_name,
        customer_email: email && email.trim() ? email : null,
        customer_phone: phone,
        shipping_address: {
          ...shipping_address,
          notes: notes || shipping_address.notes,
        },
        coupon_code: coupon_code || null,
        discount: finalDiscount,
        items: orderItemsJson,
      })
      .select()
      .single();

    if (orderError) {
      console.error("Error creating order:", orderError);
      return new Response(
        JSON.stringify({ error: "Failed to create order", details: orderError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderItems = cart_items.map((item) => ({
      order_id: order.id,
      product_id: item.id,
      title: item.title,
      product_name: item.title,
      product_image: item.image || null,
      price: item.price * item.qty, // required by schema
      qty: item.qty, // required by schema
      quantity: item.qty,
      unit_price: item.price,
      selected_variation: item.variation || null,
    }));

    const { error: itemsError } = await supabaseAdmin.from("order_items").insert(orderItems);

    if (itemsError) {
      console.error("Error creating order items:", itemsError);

      // Avoid creating a broken order with total but no line items.
      try {
        await supabaseAdmin.from("orders").delete().eq("id", order.id);
      } catch (cleanupErr) {
        console.error("Failed to cleanup broken order:", cleanupErr);
      }

      return new Response(
        JSON.stringify({
          error: "Failed to create order items",
          details: itemsError.message,
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (email && email.trim()) {
      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-order-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            orderId: order.id,
            status: "pending",
            customerEmail: email,
            customerName: full_name,
            totalAmount: finalTotal,
            sendAdminNotification: true,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email send failed:", await emailResponse.text());
        }
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
      }
    }

    fetch(`${supabaseUrl}/functions/v1/warm-fraud-cache`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ phone }),
    }).catch((warmErr) => {
      console.error("Error warming fraud cache:", warmErr);
    });

    return new Response(
      JSON.stringify({
        success: true,
        orderId: order.id,
        isNewUser,
        userId,
        message: isNewUser 
          ? "Order placed! Check your email to set up your account and track orders."
          : "Order placed successfully!",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error processing guest order:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
