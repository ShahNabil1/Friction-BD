import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Steadfast statuses to our internal order statuses.
// IMPORTANT: partial_delivered is preserved as its own status — never collapse it to "delivered".
const statusMapping: Record<string, string> = {
  pending: "shipped",
  in_review: "processing",
  delivered_approval_pending: "shipped",
  partial_delivered_approval_pending: "shipped",
  cancelled_approval_pending: "shipped",
  unknown_approval_pending: "shipped",
  delivered: "delivered",
  partial_delivered: "partial_delivered",
  cancelled: "cancelled",
  hold: "hold",
  returned: "returned",
  unknown: "shipped",
};


serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse the incoming webhook payload
    const payload = await req.json().catch(() => ({}));
    
    // Log the incoming webhook for debugging
    console.log("=== Steadfast Webhook Received ===");
    console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
    console.log("Payload:", JSON.stringify(payload));

    // Steadfast webhook payload structure (typical fields)
    const {
      consignment_id,
      tracking_code,
      status,
      invoice,
      recipient_name,
      recipient_phone,
      cod_amount,
      note,
    } = payload;

    if (!consignment_id) {
      console.error("Missing consignment_id in webhook payload");
      return new Response(
        JSON.stringify({ error: "Missing consignment_id", received: payload }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing webhook for consignment_id: ${consignment_id}, status: ${status}`);

    // Find the order by courier_consignment_id
    const { data: order, error: findError } = await supabase
      .from("orders")
      .select("id, status, courier_consignment_id")
      .eq("courier_consignment_id", String(consignment_id))
      .maybeSingle();

    if (findError) {
      console.error("Error finding order:", findError);
      return new Response(
        JSON.stringify({ error: "Database error", details: findError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!order) {
      console.warn(`No order found for consignment_id: ${consignment_id}`);
      // Return 200 to acknowledge receipt even if we don't have the order
      // This prevents Steadfast from retrying unnecessarily
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Webhook received but no matching order found",
          consignment_id 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map the Steadfast status to our order status
    const steadfastStatus = (status || "").toLowerCase().replace(/\s+/g, "_");
    const newOrderStatus = statusMapping[steadfastStatus] || order.status;

    console.log(`Order ${order.id}: Steadfast status "${steadfastStatus}" -> Order status "${newOrderStatus}"`);

    // Parse partial delivered/delivery charge amounts if provided by Steadfast
    const codCollected = payload.cod_collected_amount ?? payload.partial_delivered_amount ?? payload.delivered_amount ?? null;
    const deliveryCharge = payload.delivery_charge ?? payload.actual_delivery_charge ?? null;

    const updatePayload: Record<string, unknown> = {
      courier_status: steadfastStatus,
      courier_last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (newOrderStatus !== order.status) updatePayload.status = newOrderStatus;
    if (codCollected != null && !Number.isNaN(Number(codCollected))) {
      updatePayload.courier_cod_collected = Math.round(Number(codCollected));
    }
    if (deliveryCharge != null && !Number.isNaN(Number(deliveryCharge))) {
      updatePayload.courier_delivery_charge = Math.round(Number(deliveryCharge));
    }

    const { error: updateError } = await supabase
      .from("orders")
      .update(updatePayload)
      .eq("id", order.id);

    if (updateError) {
      console.error("Error updating order:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update order", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Persist the webhook event for audit/timeline UI
    const { error: eventInsertError } = await supabase
      .from("courier_webhook_events")
      .insert({
        order_id: order.id,
        consignment_id: String(consignment_id),
        tracking_code: tracking_code ?? null,
        courier_status: steadfastStatus,
        mapped_order_status: newOrderStatus,
        cod_collected: codCollected != null && !Number.isNaN(Number(codCollected)) ? Math.round(Number(codCollected)) : null,
        delivery_charge: deliveryCharge != null && !Number.isNaN(Number(deliveryCharge)) ? Math.round(Number(deliveryCharge)) : null,
        note: note ?? null,
        raw_payload: payload ?? {},
      });
    if (eventInsertError) {
      console.error("Failed to persist webhook event:", eventInsertError.message);
    }


    return new Response(
      JSON.stringify({
        success: true,
        message: "Webhook processed successfully",
        order_id: order.id,
        previous_status: order.status,
        new_status: newOrderStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error processing Steadfast webhook:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
