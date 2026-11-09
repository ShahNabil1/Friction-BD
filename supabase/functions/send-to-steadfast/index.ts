import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const STEADFAST_API_KEY = Deno.env.get("STEADFAST_API_KEY");
    const STEADFAST_SECRET_KEY = Deno.env.get("STEADFAST_SECRET_KEY");

    if (!STEADFAST_API_KEY || !STEADFAST_SECRET_KEY) {
      console.error("Steadfast API credentials not configured");
      return new Response(
        JSON.stringify({ error: "Steadfast API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader?.toLowerCase().startsWith("bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace(/^bearer\s+/i, "");

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsError || !userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check roles in parallel
    const [
      { data: isAdmin, error: adminErr },
      { data: isSuperAdmin, error: superErr },
      { data: isModerator, error: modErr },
    ] = await Promise.all([
      supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: userId, _role: "moderator" }),
    ]);

    if (adminErr || superErr || modErr) {
      console.error("Role check error:", adminErr ?? superErr ?? modErr);
      return new Response(
        JSON.stringify({ error: "Authorization check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Admins and super admins have full access
    let hasAccess = isAdmin || isSuperAdmin;

    // Moderators need 'courier' permission
    if (!hasAccess && isModerator) {
      const { data: hasCourierPermission } = await supabase.rpc("has_permission", {
        _user_id: userId,
        _permission: "courier",
      });
      hasAccess = hasCourierPermission === true;
    }

    // POS staff (can_access_pos = true) can also book couriers for their outlet orders
    if (!hasAccess) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("can_access_pos, assigned_outlet_id")
        .eq("id", userId)
        .maybeSingle();

      if (profile?.can_access_pos === true) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Courier access required. You need admin/moderator role with courier permission, or POS staff access." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { order_id } = body;

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select("*, order_items(*)")
      .eq("id", order_id)
      .single();

    if (orderError || !order) {
      console.error("Order not found:", orderError);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (order.courier_consignment_id) {
      return new Response(
        JSON.stringify({ error: "Order already sent to courier", consignment_id: order.courier_consignment_id }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let fullAddress = "";
    let customerNote = "";
    let addr: any = {};
    
    if (order.shipping_address) {
      if (typeof order.shipping_address === "string") {
        try {
          addr = JSON.parse(order.shipping_address);
        } catch {
          fullAddress = order.shipping_address;
        }
      } else if (typeof order.shipping_address === "object") {
        addr = order.shipping_address;
      }
    }
    
    if (addr.notes && typeof addr.notes === "string" && addr.notes.trim()) {
      customerNote = addr.notes.trim();
    }
    
    if (!fullAddress && typeof addr === "object" && addr !== null) {
      if (addr.street_address) {
        const simplifiedParts = [
          addr.street_address,
          addr.thana,
          addr.district,
        ].filter(part => part && typeof part === "string" && part.trim() !== "");
        fullAddress = simplifiedParts.join(", ");
      } else {
        const legacyParts = [
          addr.house_no,
          addr.flat_no,
          addr.road_no || addr.road,
          addr.village,
          addr.area,
          addr.post_office,
          addr.thana || addr.upazilla,
          addr.zilla || addr.district || addr.city,
        ].filter(part => part && typeof part === "string" && part.trim() !== "");
        fullAddress = legacyParts.join(", ");
      }
    }
    
    if (!fullAddress) {
      const fallbackParts = [
        order.shipping_area,
        order.shipping_city,
      ].filter(Boolean);
      fullAddress = fallbackParts.join(", ");
    }

    if (!fullAddress || fullAddress.trim() === "") {
      console.error("Shipping address is missing for order:", order_id);
      return new Response(
        JSON.stringify({ error: "Shipping address is missing. Please add an address before sending to courier." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build item_description (Steadfast dedicated field) and total_lot
    let itemDescription = "";
    let totalLot = 0;
    const orderItems = order.order_items || [];
    if (orderItems.length > 0) {
      itemDescription = orderItems.map((item: any) => {
        const name = item.title || item.product_name || "Item";
        const qty = Number(item.qty || item.quantity || 1);
        totalLot += qty;

        let variationStr = "";
        const variation = item.selected_variation || item.variation;
        if (variation && typeof variation === "object") {
          const varParts = Object.entries(variation)
            .filter(([_, v]) => v)
            .map(([_, v]) => `${v}`);
          if (varParts.length > 0) {
            variationStr = ` (${varParts.join("/")})`;
          }
        }

        return `${name}${variationStr} x${qty}`;
      }).join(", ");
    } else if (Array.isArray(order.items)) {
      // Fallback: parse items JSONB snapshot
      itemDescription = (order.items as any[]).map((item: any) => {
        const name = item.title || item.product_name || item.name || "Item";
        const qty = Number(item.qty || item.quantity || 1);
        totalLot += qty;
        return `${name} x${qty}`;
      }).join(", ");
    }

    // Steadfast note field is for delivery instructions only
    let noteContent = order.payment_status === "paid"
      ? "PREPAID - Do NOT collect cash"
      : "COD - Collect cash on delivery";
    if (customerNote) {
      noteContent += ` | ${customerNote}`;
    }

    const codAmountToSend = order.payment_status === "paid" ? 0 : Number(order.total_amount) || 0;

    // Sanitize invoice: alphanumeric + hyphen + underscore only
    const rawInvoice = order.order_number || order.id.slice(0, 8).toUpperCase();
    const readableInvoice = String(rawInvoice).replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);

    // Strict phone validation: exactly 11 digits, starts with 01
    const cleanPhone = String(order.customer_phone || "").replace(/\D/g, "");
    if (!/^01[3-9]\d{8}$/.test(cleanPhone)) {
      return new Response(
        JSON.stringify({ error: `Invalid Bangladeshi phone number: "${order.customer_phone}". Must be 11 digits starting with 013-019.` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Recipient name: max 100 chars
    const recipientName = String(order.customer_name || "Customer").trim().slice(0, 100);

    // Address: max 250 chars
    const cleanAddress = fullAddress.trim().replace(/\s+/g, " ").slice(0, 250);

    const steadfastPayload: Record<string, unknown> = {
      invoice: readableInvoice,
      recipient_name: recipientName,
      recipient_phone: cleanPhone,
      recipient_address: cleanAddress,
      cod_amount: Math.max(0, Math.round(codAmountToSend)),
      note: noteContent.slice(0, 250),
    };

    if (itemDescription) {
      steadfastPayload.item_description = itemDescription.slice(0, 500);
    }
    if (totalLot > 0) {
      steadfastPayload.total_lot = totalLot;
    }

    // Optional email
    if (order.customer_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(order.customer_email)) {
      steadfastPayload.recipient_email = order.customer_email;
    }

    console.log("Steadfast payload:", JSON.stringify(steadfastPayload));

    const steadfastResponse = await fetch("https://portal.packzy.com/api/v1/create_order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": STEADFAST_API_KEY,
        "Secret-Key": STEADFAST_SECRET_KEY,
      },
      body: JSON.stringify(steadfastPayload),
    });


    const steadfastRaw = await steadfastResponse.text();
    let steadfastResult: any = null;
    try {
      steadfastResult = steadfastRaw ? JSON.parse(steadfastRaw) : null;
    } catch {
      console.error(
        "Steadfast returned non-JSON response",
        steadfastResponse.status,
        steadfastResponse.headers.get("content-type"),
        steadfastRaw.slice(0, 200)
      );
      return new Response(
        JSON.stringify({
          error: "Steadfast returned a non-JSON response",
          status: steadfastResponse.status,
          preview: steadfastRaw.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!steadfastResponse.ok || steadfastResult.status !== 200) {
      const errorMessage = steadfastResult.message || steadfastResult.errors || "Failed to create Steadfast order";
      console.error("Steadfast API error:", errorMessage);
      return new Response(
        JSON.stringify({ error: errorMessage, details: steadfastResult }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const consignmentId = steadfastResult.consignment?.consignment_id;
    const trackingCode = steadfastResult.consignment?.tracking_code;

    if (!consignmentId) {
      console.error("No consignment_id in Steadfast response");
      return new Response(
        JSON.stringify({ error: "Invalid response from Steadfast", details: steadfastResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        courier_consignment_id: consignmentId,
        courier_tracking_code: trackingCode,
        status: "shipped",
        tracking_code: trackingCode,
        courier_status: steadfastResult.consignment?.status || "in_review",
        courier_last_synced_at: new Date().toISOString(),
      })
      .eq("id", order_id);


    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ 
          error: "Order sent to Steadfast but failed to update database",
          consignment_id: consignmentId,
          tracking_code: trackingCode 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order successfully sent to Steadfast",
        consignment_id: consignmentId,
        tracking_code: trackingCode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-to-steadfast function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
