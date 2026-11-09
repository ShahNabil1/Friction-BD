import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CACHE_DURATION_HOURS = 24;

// Validate Bangladesh phone number format (11 digits starting with 01)
function isValidBangladeshPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^01\d{9}$/.test(cleaned);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  let normalizedPhoneForFallback: string | null = null;

  try {
    const { phone, skipCache } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");
    normalizedPhoneForFallback = normalizedPhone;

    // Validate phone number format before proceeding
    if (!isValidBangladeshPhone(normalizedPhone)) {
      return new Response(
        JSON.stringify({
          total_order: 0,
          success_delivery: 0,
          cancel_order: 0,
          success_ratio: null,
          cached: false,
          source: "invalid_phone",
          message: "Phone number is not a valid Bangladesh number (11 digits starting with 01)",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const readCached = async (freshOnly: boolean) => {
      const query = supabase
        .from("fraud_check_cache")
        .select("phone, total_order, success_delivery, cancel_order, success_ratio, checked_at")
        .eq("phone", normalizedPhone)
        .order("checked_at", { ascending: false })
        .limit(1);

      if (freshOnly) {
        const cacheExpiry = new Date();
        cacheExpiry.setHours(cacheExpiry.getHours() - CACHE_DURATION_HOURS);
        query.gte("checked_at", cacheExpiry.toISOString());
      }

      const { data, error } = await query.maybeSingle();
      if (error) return null;
      return data;
    };

    const readBreakdown = async () => {
      const { data, error } = await supabase
        .from("fraud_courier_breakdown")
        .select("courier_key, courier_name, logo_url, total_parcel, success_parcel, cancelled_parcel, success_ratio")
        .eq("phone", normalizedPhone);
      if (error) return [];
      return (data || []).map((r) => ({
        key: r.courier_key,
        name: r.courier_name,
        logo: r.logo_url,
        total_parcel: r.total_parcel,
        success_parcel: r.success_parcel,
        cancelled_parcel: r.cancelled_parcel,
        success_ratio: r.success_ratio,
      }));
    };

    if (!skipCache) {
      const cachedData = await readCached(true);
      if (cachedData) {
        const breakdown = await readBreakdown();
        return new Response(
          JSON.stringify({
            total_order: cachedData.total_order,
            success_delivery: cachedData.success_delivery,
            cancel_order: cachedData.cancel_order,
            success_ratio: cachedData.success_ratio,
            cached: true,
            checked_at: cachedData.checked_at,
            source: "cache",
            courier_breakdown: breakdown,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const apiKey = Deno.env.get("BD_COURIER_API_KEY");
    if (!apiKey) {
      console.error("BD_COURIER_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const response = await fetch("https://api.bdcourier.com/courier-check", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phone: normalizedPhone }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      const fallback = await readCached(false);
      if (fallback) {
        console.error(`Live API failed (${response.status}) - returning cached fallback`);
        return new Response(
          JSON.stringify({
            total_order: fallback.total_order,
            success_delivery: fallback.success_delivery,
            cancel_order: fallback.cancel_order,
            success_ratio: fallback.success_ratio,
            cached: true,
            stale: true,
            checked_at: fallback.checked_at,
            source: "cache_fallback",
            api_error: {
              status: response.status,
              details: responseText,
            },
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to check fraud status",
          details: responseText,
          status: response.status,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (_e) {
      console.error("Failed to parse response as JSON:", _e);
      return new Response(
        JSON.stringify({ error: "Invalid response from API", details: responseText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const summary = data?.data?.summary || {};

    const courierBreakdown = Object.entries(data?.data || {})
      .filter(([key]) => key !== "summary")
      .map(([key, value]) => {
        const v: any = value;
        return {
          key,
          name: v?.name ?? key,
          logo: v?.logo ?? null,
          total_parcel: Number(v?.total_parcel ?? 0),
          success_parcel: Number(v?.success_parcel ?? 0),
          cancelled_parcel: Number(v?.cancelled_parcel ?? 0),
          success_ratio: Number(v?.success_ratio ?? 0),
        };
      });

    const extractedData = {
      total_order: summary.total_parcel ?? 0,
      success_delivery: summary.success_parcel ?? 0,
      cancel_order: summary.cancelled_parcel ?? 0,
      success_ratio: Number(summary.success_ratio ?? 0),
    };

    const { error: upsertError } = await supabase
      .from("fraud_check_cache")
      .upsert({
        phone: normalizedPhone,
        total_order: extractedData.total_order,
        success_delivery: extractedData.success_delivery,
        cancel_order: extractedData.cancel_order,
        success_ratio: extractedData.success_ratio,
        checked_at: new Date().toISOString(),
      }, {
        onConflict: "phone",
      });

    if (upsertError) {
      console.error("Failed to cache fraud data:", upsertError);
    }

    if (courierBreakdown.length > 0) {
      const breakdownRows = courierBreakdown.map((c) => ({
        phone: normalizedPhone,
        courier_key: c.key,
        courier_name: c.name,
        logo_url: c.logo,
        total_parcel: c.total_parcel,
        success_parcel: c.success_parcel,
        cancelled_parcel: c.cancelled_parcel,
        success_ratio: c.success_ratio,
        checked_at: new Date().toISOString(),
      }));

      const { error: breakdownError } = await supabase
        .from("fraud_courier_breakdown")
        .upsert(breakdownRows, { onConflict: "phone,courier_key" });

      if (breakdownError) {
        console.error("Failed to store courier breakdown:", breakdownError);
      }
    }

    return new Response(
      JSON.stringify({
        ...extractedData,
        cached: false,
        stale: false,
        source: "api",
        checked_at: new Date().toISOString(),
        bdcourier_summary: summary,
        courier_breakdown: courierBreakdown,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in check-fraud-status:", error);
    const message = error instanceof Error ? error.message : "Internal server error";

    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (normalizedPhoneForFallback) {
        const { data: cached } = await supabase
          .from("fraud_check_cache")
          .select("phone, total_order, success_delivery, cancel_order, success_ratio, checked_at")
          .eq("phone", normalizedPhoneForFallback)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cached) {
          return new Response(
            JSON.stringify({
              total_order: cached.total_order,
              success_delivery: cached.success_delivery,
              cancel_order: cached.cancel_order,
              success_ratio: cached.success_ratio,
              cached: true,
              stale: true,
              checked_at: cached.checked_at,
              source: "cache_fallback",
              error: message,
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    } catch (_ignored) {
      // ignore
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
