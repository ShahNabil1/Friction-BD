import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration (must match send-sms-otp)
const RATE_LIMIT_MAX_ATTEMPTS_PHONE = 5;
const RATE_LIMIT_MAX_ATTEMPTS_IP = 15;
const RATE_LIMIT_WINDOW_MINUTES = 10;

// Extract client IP from request headers
function getClientIP(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP.trim();
  
  return "unknown";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const clientIP = getClientIP(req);

  try {
    const { phone } = await req.json();

    if (!phone) {
      return new Response(
        JSON.stringify({ error: "Phone number required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalize phone number
    let normalizedPhone = phone.replace(/[^\d+]/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "+880" + normalizedPhone.slice(1);
    } else if (normalizedPhone.startsWith("1")) {
      normalizedPhone = "+880" + normalizedPhone;
    } else if (normalizedPhone.startsWith("880")) {
      normalizedPhone = "+" + normalizedPhone;
    } else if (!normalizedPhone.startsWith("+880")) {
      normalizedPhone = "+880" + normalizedPhone;
    }

    const windowCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

    // Check phone rate limit
    let phoneAttempts = 0;
    let phoneRemaining = RATE_LIMIT_MAX_ATTEMPTS_PHONE;
    let phoneIsLimited = false;
    let phoneRetryAfterMinutes = 0;

    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("sms_rate_limits")
      .select("attempts, window_start")
      .eq("phone", normalizedPhone)
      .single();

    if (rateLimitError && rateLimitError.code !== "PGRST116") {
      console.error("Rate limit check error:", rateLimitError);
    }

    if (rateLimitData) {
      const recordWindowStart = new Date(rateLimitData.window_start);
      const isWithinWindow = recordWindowStart > windowCutoff;

      if (isWithinWindow) {
        phoneAttempts = rateLimitData.attempts;
        phoneRemaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS_PHONE - phoneAttempts);
        phoneIsLimited = phoneAttempts >= RATE_LIMIT_MAX_ATTEMPTS_PHONE;

        if (phoneIsLimited) {
          phoneRetryAfterMinutes = Math.ceil(
            (recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 - Date.now()) / 60000
          );
        }
      }
    }

    // Check IP rate limit
    let ipAttempts = 0;
    let ipRemaining = RATE_LIMIT_MAX_ATTEMPTS_IP;
    let ipIsLimited = false;
    let ipRetryAfterMinutes = 0;

    if (clientIP !== "unknown") {
      const { data: ipRateLimitData, error: ipRateLimitError } = await supabase
        .from("sms_ip_rate_limits")
        .select("attempts, window_start")
        .eq("ip_address", clientIP)
        .single();

      if (ipRateLimitError && ipRateLimitError.code !== "PGRST116") {
        console.error("IP rate limit check error:", ipRateLimitError);
      }

      if (ipRateLimitData) {
        const recordWindowStart = new Date(ipRateLimitData.window_start);
        const isWithinWindow = recordWindowStart > windowCutoff;

        if (isWithinWindow) {
          ipAttempts = ipRateLimitData.attempts;
          ipRemaining = Math.max(0, RATE_LIMIT_MAX_ATTEMPTS_IP - ipAttempts);
          ipIsLimited = ipAttempts >= RATE_LIMIT_MAX_ATTEMPTS_IP;

          if (ipIsLimited) {
            ipRetryAfterMinutes = Math.ceil(
              (recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 - Date.now()) / 60000
            );
          }
        }
      }
    }

    // Combined status - limited if either is exceeded
    const isLimited = phoneIsLimited || ipIsLimited;
    const retryAfterMinutes = Math.max(phoneRetryAfterMinutes, ipRetryAfterMinutes);

    return new Response(
      JSON.stringify({
        phone: {
          attempts: phoneAttempts,
          remaining: phoneRemaining,
          max: RATE_LIMIT_MAX_ATTEMPTS_PHONE,
          isLimited: phoneIsLimited,
          retryAfterMinutes: phoneIsLimited ? phoneRetryAfterMinutes : 0,
        },
        ip: {
          attempts: ipAttempts,
          remaining: ipRemaining,
          max: RATE_LIMIT_MAX_ATTEMPTS_IP,
          isLimited: ipIsLimited,
          retryAfterMinutes: ipIsLimited ? ipRetryAfterMinutes : 0,
        },
        // Combined summary for simpler frontend consumption
        attempts: phoneAttempts,
        remaining: phoneRemaining,
        max: RATE_LIMIT_MAX_ATTEMPTS_PHONE,
        isLimited,
        retryAfterMinutes: isLimited ? retryAfterMinutes : 0,
        windowMinutes: RATE_LIMIT_WINDOW_MINUTES,
        limitType: phoneIsLimited ? "phone" : ipIsLimited ? "ip" : null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-otp-rate-limit:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
