import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CLOUD_NAME = "dmzuspsja";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");
    
    if (!API_KEY || !API_SECRET) {
      console.error("Cloudinary credentials not configured");
      return new Response(
        JSON.stringify({ error: "Cloudinary credentials not configured. Please add CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET secrets." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { folder = "", max_results = 100, next_cursor } = body;

    const baseUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image`;
    const params = new URLSearchParams({
      max_results: String(max_results),
      type: "upload",
    });
    
    if (folder) {
      params.set("prefix", folder);
    }
    if (next_cursor) {
      params.set("next_cursor", next_cursor);
    }

    const url = `${baseUrl}?${params.toString()}`;
    const auth = btoa(`${API_KEY}:${API_SECRET}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudinary API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Failed to fetch from Cloudinary", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const resources = (data.resources || []).map((r: any) => ({
      public_id: r.public_id,
      url: r.secure_url,
      format: r.format,
      width: r.width,
      height: r.height,
      bytes: r.bytes,
      created_at: r.created_at,
      folder: r.folder || "",
    }));

    return new Response(
      JSON.stringify({
        resources,
        next_cursor: data.next_cursor || null,
        total_count: data.total_count,
        rate_limit_remaining: data.rate_limit_remaining,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in cloudinary-media function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
