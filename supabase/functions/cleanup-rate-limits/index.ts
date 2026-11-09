import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { error: phoneError, count: phoneCount } = await supabase
      .from("sms_rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", oneHourAgo);

    if (phoneError) {
      console.error("Error cleaning phone rate limits:", phoneError);
    }

    const { error: ipError, count: ipCount } = await supabase
      .from("sms_ip_rate_limits")
      .delete({ count: "exact" })
      .lt("window_start", oneHourAgo);

    if (ipError) {
      console.error("Error cleaning IP rate limits:", ipError);
    }

    const result = {
      success: true,
      cleaned: {
        phone_records: phoneCount ?? 0,
        ip_records: ipCount ?? 0,
      },
      cleaned_at: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Cleanup error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: "Cleanup failed", details: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
