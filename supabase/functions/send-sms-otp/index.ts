import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limit configuration
const RATE_LIMIT_MAX_ATTEMPTS_PHONE = 5; // Max OTP requests per phone per window
const RATE_LIMIT_MAX_ATTEMPTS_IP = 15; // Max OTP requests per IP per window (higher to account for shared IPs)
const RATE_LIMIT_WINDOW_MINUTES = 10; // Time window in minutes

interface AuthHookPayload {
  user: {
    id: string;
    phone: string;
    email?: string;
  };
  sms?: {
    otp: string;
  };
}

// Extract client IP from request headers
function getClientIP(req: Request): string {
  // Check common proxy headers
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // Take the first IP if multiple are present
    return forwardedFor.split(",")[0].trim();
  }
  
  const realIP = req.headers.get("x-real-ip");
  if (realIP) return realIP.trim();
  
  const cfConnectingIP = req.headers.get("cf-connecting-ip");
  if (cfConnectingIP) return cfConnectingIP.trim();
  
  // Fallback
  return "unknown";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Initialize Supabase client with service role for rate limit table access
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const clientIP = getClientIP(req);

  try {
    const payload: AuthHookPayload = await req.json();
    
    console.log("Received auth hook payload:", JSON.stringify(payload, null, 2));
    console.log("Client IP:", clientIP);

    const phone = payload.user?.phone;
    const otp = payload.sms?.otp;

    if (!phone || !otp) {
      console.error("Missing phone or OTP in payload");
      return new Response(
        JSON.stringify({ error: "Missing phone or OTP" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- IP-Based Rate Limiting Check ---
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
        const windowCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        const isWithinWindow = recordWindowStart > windowCutoff;

        if (isWithinWindow && ipRateLimitData.attempts >= RATE_LIMIT_MAX_ATTEMPTS_IP) {
          const minutesRemaining = Math.ceil(
            (recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 - Date.now()) / 60000
          );
          console.warn(`IP rate limit exceeded for: ${clientIP}. Attempts: ${ipRateLimitData.attempts}`);
          return new Response(
            JSON.stringify({
              error: "Too many OTP requests from this network",
              message: `Please wait ${minutesRemaining} minute(s) before requesting another OTP.`,
              retry_after_minutes: minutesRemaining,
              limit_type: "ip",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // --- Phone-Based Rate Limiting Check ---
    const { data: rateLimitData, error: rateLimitError } = await supabase
      .from("sms_rate_limits")
      .select("attempts, window_start")
      .eq("phone", phone)
      .single();

    if (rateLimitError && rateLimitError.code !== "PGRST116") {
      console.error("Rate limit check error:", rateLimitError);
    }

    let currentAttempts = 0;
    let isWithinWindow = false;

    if (rateLimitData) {
      const recordWindowStart = new Date(rateLimitData.window_start);
      const windowCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
      
      isWithinWindow = recordWindowStart > windowCutoff;
      
      if (isWithinWindow) {
        currentAttempts = rateLimitData.attempts;
        
        if (currentAttempts >= RATE_LIMIT_MAX_ATTEMPTS_PHONE) {
          const minutesRemaining = Math.ceil(
            (recordWindowStart.getTime() + RATE_LIMIT_WINDOW_MINUTES * 60 * 1000 - Date.now()) / 60000
          );
          console.warn(`Rate limit exceeded for phone: ${phone}. Attempts: ${currentAttempts}`);
          return new Response(
            JSON.stringify({ 
              error: "Too many OTP requests", 
              message: `Please wait ${minutesRemaining} minute(s) before requesting another OTP.`,
              retry_after_minutes: minutesRemaining,
              limit_type: "phone",
            }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Update or insert phone rate limit record
    if (rateLimitData && isWithinWindow) {
      await supabase
        .from("sms_rate_limits")
        .update({ attempts: currentAttempts + 1 })
        .eq("phone", phone);
    } else {
      await supabase
        .from("sms_rate_limits")
        .upsert({ 
          phone, 
          attempts: 1, 
          window_start: new Date().toISOString() 
        }, { 
          onConflict: "phone" 
        });
    }

    // Update or insert IP rate limit record
    if (clientIP !== "unknown") {
      const { data: existingIpData } = await supabase
        .from("sms_ip_rate_limits")
        .select("attempts, window_start")
        .eq("ip_address", clientIP)
        .single();

      if (existingIpData) {
        const recordWindowStart = new Date(existingIpData.window_start);
        const windowCutoff = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);
        const ipIsWithinWindow = recordWindowStart > windowCutoff;

        if (ipIsWithinWindow) {
          await supabase
            .from("sms_ip_rate_limits")
            .update({ attempts: existingIpData.attempts + 1 })
            .eq("ip_address", clientIP);
        } else {
          await supabase
            .from("sms_ip_rate_limits")
            .upsert({
              ip_address: clientIP,
              attempts: 1,
              window_start: new Date().toISOString(),
            }, {
              onConflict: "ip_address",
            });
        }
      } else {
        await supabase
          .from("sms_ip_rate_limits")
          .insert({
            ip_address: clientIP,
            attempts: 1,
            window_start: new Date().toISOString(),
          });
      }
    }

    // --- End Rate Limiting ---

    // Get API credentials from secrets
    const apiKey = Deno.env.get("BULKSMSBD_API_KEY");
    const senderId = Deno.env.get("BULKSMSBD_SENDER_ID");

    if (!apiKey || !senderId) {
      console.error("Missing BulkSMSBD credentials");
      return new Response(
        JSON.stringify({ error: "SMS service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number - remove + prefix if present for the API
    const formattedPhone = phone.replace(/^\+/, "");
    
    // Construct the SMS message with branded template
    const message = `[Friction BD] Your verification code is ${otp}. Please do not share this with anyone.`;
    
    // Build the API URL with query parameters
    const smsApiUrl = new URL("http://bulksmsbd.net/api/smsapi");
    smsApiUrl.searchParams.set("api_key", apiKey);
    smsApiUrl.searchParams.set("type", "text");
    smsApiUrl.searchParams.set("number", formattedPhone);
    smsApiUrl.searchParams.set("senderid", senderId);
    smsApiUrl.searchParams.set("message", message);

    console.log(`Sending SMS to ${formattedPhone} (phone attempt ${currentAttempts + 1}/${RATE_LIMIT_MAX_ATTEMPTS_PHONE})`);

    // Send the SMS
    const smsResponse = await fetch(smsApiUrl.toString(), {
      method: "GET",
    });

    const smsResult = await smsResponse.text();
    console.log("BulkSMSBD API response:", smsResult);

    // Parse the response if it's JSON
    let parsedResult;
    try {
      parsedResult = JSON.parse(smsResult);
    } catch {
      parsedResult = { raw_response: smsResult };
    }

    // Check if SMS was sent successfully
    if (parsedResult.response_code === 202 || smsResponse.ok) {
      console.log("SMS sent successfully");
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      console.error("Failed to send SMS:", parsedResult);
      return new Response(
        JSON.stringify({ error: "Failed to send SMS", details: parsedResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-sms-otp:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
