import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CAPIEventRequest {
  event_name: string;
  event_id: string;
  event_source_url: string;
  user_data: {
    em?: string;
    ph?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbc?: string;
    fbp?: string;
  };
  custom_data: {
    currency?: string;
    value?: number;
    content_ids?: string[];
    content_name?: string;
    content_type?: string;
    num_items?: number;
    order_id?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: CAPIEventRequest = await req.json();

    const { data: settings, error: settingsError } = await supabase
      .from("store_settings")
      .select("meta_pixel_id")
      .limit(1)
      .maybeSingle();

    if (settingsError) {
      console.error("Failed to fetch store settings:", settingsError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to fetch settings" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tokenRow } = await supabase
      .from("secure_settings")
      .select("value")
      .eq("key", "meta_conversion_token")
      .maybeSingle();

    const pixelId = settings?.meta_pixel_id;
    const accessToken = tokenRow?.value;

    if (!pixelId || !accessToken) {
      return new Response(
        JSON.stringify({ success: false, error: "Meta Pixel not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("cf-connecting-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    const eventData = {
      event_name: body.event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id: body.event_id,
      event_source_url: body.event_source_url,
      action_source: "website",
      user_data: {
        ...body.user_data,
        client_ip_address: clientIp,
        client_user_agent: userAgent,
      },
      custom_data: body.custom_data,
    };

    const capiPayload = {
      data: [eventData],
    };

    const graphApiUrl = `https://graph.facebook.com/v19.0/${pixelId}/events`;
    const response = await fetch(graphApiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...capiPayload,
        access_token: accessToken,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Meta CAPI error:", result);
      return new Response(
        JSON.stringify({ success: false, error: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("CAPI Event error:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
