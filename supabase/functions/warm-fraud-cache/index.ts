import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CACHE_DURATION_HOURS = 24;

interface WarmCacheRequest {
  phone?: string;
  orderIds?: string[];
  hoursBack?: number;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const bdCourierApiKey = Deno.env.get("BD_COURIER_API_KEY");

    if (!bdCourierApiKey) {
      console.error("BD_COURIER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body: WarmCacheRequest = await req.json().catch(() => ({}));
    const { phone, orderIds, hoursBack = 48 } = body;

    let phonesToCheck: string[] = [];

    if (phone) {
      const normalized = phone.replace(/[\s\-\(\)]/g, "");
      if (normalized) {
        phonesToCheck = [normalized];
      }
    } else if (orderIds && orderIds.length > 0) {
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_phone")
        .in("id", orderIds)
        .not("customer_phone", "is", null);

      if (ordersError) {
        console.error("Error fetching orders:", ordersError);
      } else {
        phonesToCheck = orders
          .map((o) => o.customer_phone?.replace(/[\s\-\(\)]/g, ""))
          .filter((p): p is string => !!p);
      }
    } else {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursBack);

      const { data: recentOrders, error: ordersError } = await supabase
        .from("orders")
        .select("customer_phone")
        .gte("created_at", cutoffDate.toISOString())
        .not("customer_phone", "is", null);

      if (ordersError) {
        console.error("Error fetching recent orders:", ordersError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch orders" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const uniquePhones = [
        ...new Set(
          recentOrders
            .map((o) => o.customer_phone?.replace(/[\s\-\(\)]/g, ""))
            .filter((p): p is string => !!p)
        ),
      ];

      if (uniquePhones.length === 0) {
        return new Response(
          JSON.stringify({ message: "No orders to process", warmed: 0 }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);

      const { data: cachedPhones, error: cacheError } = await supabase
        .from("fraud_check_cache")
        .select("phone")
        .in("phone", uniquePhones)
        .gte("checked_at", cacheExpiry.toISOString());

      if (cacheError) {
        console.error("Error checking cache:", cacheError);
      }

      const cachedSet = new Set((cachedPhones || []).map((c) => c.phone));
      phonesToCheck = uniquePhones.filter((p) => !cachedSet.has(p));
    }

    if (phonesToCheck.length === 0) {
      return new Response(
        JSON.stringify({ message: "All phones already cached", warmed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let warmedCount = 0;
    const errors: string[] = [];

    for (const phoneNum of phonesToCheck) {
      try {
        const response = await fetch("https://api.bdcourier.com/courier-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${bdCourierApiKey}`,
          },
          body: JSON.stringify({ phone: phoneNum }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`API error for ${phoneNum}:`, errorText);
          errors.push(`${phoneNum}: API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const summary = data?.data?.summary || {};

        const extractedData = {
          total_order: summary.total_parcel ?? 0,
          success_delivery: summary.success_parcel ?? 0,
          cancel_order: summary.cancelled_parcel ?? 0,
          success_ratio: Number(summary.success_ratio ?? 0),
        };

        const courierBreakdown = Object.entries(data?.data || {})
          .filter(([key]) => key !== "summary")
          .map(([key, value]) => {
            const v = value as Record<string, unknown>;
            return {
              phone: phoneNum,
              courier_key: key,
              courier_name: (v?.name as string) ?? key,
              logo_url: (v?.logo as string) ?? null,
              total_parcel: Number(v?.total_parcel ?? 0),
              success_parcel: Number(v?.success_parcel ?? 0),
              cancelled_parcel: Number(v?.cancelled_parcel ?? 0),
              success_ratio: Number(v?.success_ratio ?? 0),
              checked_at: new Date().toISOString(),
            };
          });

        const { error: upsertError } = await supabase
          .from("fraud_check_cache")
          .upsert(
            {
              phone: phoneNum,
              total_order: extractedData.total_order,
              success_delivery: extractedData.success_delivery,
              cancel_order: extractedData.cancel_order,
              success_ratio: extractedData.success_ratio,
              checked_at: new Date().toISOString(),
            },
            { onConflict: "phone" }
          );

        if (upsertError) {
          console.error(`Cache error for ${phoneNum}:`, upsertError);
          errors.push(`${phoneNum}: Cache error`);
        }

        if (courierBreakdown.length > 0) {
          const { error: breakdownErr } = await supabase
            .from("fraud_courier_breakdown")
            .upsert(courierBreakdown, { onConflict: "phone,courier_key" });

          if (breakdownErr) {
            console.error(`Breakdown error for ${phoneNum}:`, breakdownErr);
          }
        }

        warmedCount++;

        if (phonesToCheck.indexOf(phoneNum) < phonesToCheck.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      } catch (err) {
        console.error(`Error processing ${phoneNum}:`, err);
        errors.push(`${phoneNum}: ${err instanceof Error ? err.message : "Unknown error"}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: `Warmed cache for ${warmedCount} phone(s)`,
        warmed: warmedCount,
        total: phonesToCheck.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in warm-fraud-cache:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
