import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const STEADFAST_BASE_URL = "https://portal.packzy.com/api/v1";

interface CourierStatus {
  consignment_id?: string;
  tracking_code?: string;
  invoice?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  delivery_status?: string;
  status?: string;
  note?: string;
  updated_at?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { tracking_code, order_id, phone } = body;

    if (!tracking_code && !order_id && !phone) {
      return new Response(
        JSON.stringify({ error: "Please provide tracking_code, order_id, or phone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let orderQuery = supabase.from("orders").select(
      "id, courier_tracking_code, courier_consignment_id, status, customer_phone, customer_name"
    );

    if (tracking_code) {
      orderQuery = orderQuery.eq("courier_tracking_code", tracking_code);
    } else if (order_id) {
      orderQuery = orderQuery.eq("id", order_id);
    } else if (phone) {
      orderQuery = orderQuery.ilike("customer_phone", `%${phone}%`);
    }

    const { data: orders, error: dbError } = await orderQuery.limit(1);

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to find order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!orders || orders.length === 0) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const order = orders[0];

    if (!order.courier_tracking_code && !order.courier_consignment_id) {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            order_status: order.status,
            courier_status: null,
            message: "This order has not been dispatched to courier yet.",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("STEADFAST_API_KEY");
    const secretKey = Deno.env.get("STEADFAST_SECRET_KEY");

    if (!apiKey || !secretKey) {
      console.error("Missing Steadfast API credentials");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            order_status: order.status,
            courier_status: null,
            tracking_code: order.courier_tracking_code,
            message: "Courier status temporarily unavailable",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const steadfastHeaders = {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };

    let courierStatus: CourierStatus | null = null;
    let courierError: string | null = null;

    const endpoint = order.courier_tracking_code
      ? `/status_by_trackingcode/${encodeURIComponent(order.courier_tracking_code)}`
      : `/status_by_cid/${encodeURIComponent(order.courier_consignment_id!)}`;

    try {
      const steadfastResponse = await fetch(`${STEADFAST_BASE_URL}${endpoint}`, {
        method: "GET",
        headers: steadfastHeaders,
      });

      const rawText = await steadfastResponse.text();
      
      try {
        const responseData = JSON.parse(rawText);

        if (steadfastResponse.ok && responseData.status === 200) {
          courierStatus = responseData.delivery_status || responseData;
        } else {
          courierError = responseData.message || "Could not fetch courier status";
        }
      } catch {
        console.error("Invalid JSON from Steadfast:", rawText.slice(0, 200));
        courierError = "Invalid response from courier service";
      }
    } catch (err) {
      console.error("Steadfast fetch error:", err);
      courierError = "Failed to connect to courier service";
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_status: order.status,
          tracking_code: order.courier_tracking_code,
          consignment_id: order.courier_consignment_id,
          courier_status: courierStatus,
          courier_error: courierError,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Public track order error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
