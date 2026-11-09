import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const CLOUD_NAME = "dmzuspsja";

type CloudinaryResource = {
  public_id: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  folder: string;
};

function clampMaxResults(n: number) {
  if (!Number.isFinite(n) || n <= 0) return 50;
  return Math.min(Math.max(Math.floor(n), 1), 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Supabase env not configured");
      return new Response(JSON.stringify({ error: "Server not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace(/^Bearer\s+/i, "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT validation failed", claimsError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { data: roleRow, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin", "moderator"])
      .maybeSingle();

    if (roleError) {
      console.error("Role check error", roleError.message);
      return new Response(JSON.stringify({ error: "Authorization check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!roleRow?.role) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

    const folder = (url.searchParams.get("folder") ?? body.folder ?? "") as string;
    const next_cursor = (url.searchParams.get("next_cursor") ?? body.next_cursor) as string | undefined;
    const max_results = clampMaxResults(
      Number(url.searchParams.get("max_results") ?? body.max_results ?? 50)
    );

    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");
    if (!API_KEY || !API_SECRET) {
      console.error("Cloudinary credentials not configured");
      return new Response(JSON.stringify({ error: "Cloudinary credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const baseUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image`;
    const params = new URLSearchParams({
      max_results: String(max_results),
      type: "upload",
    });

    if (folder) params.set("prefix", folder);
    if (next_cursor) params.set("next_cursor", next_cursor);

    const requestUrl = `${baseUrl}?${params.toString()}`;
    const auth = btoa(`${API_KEY}:${API_SECRET}`);

    const response = await fetch(requestUrl, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("Cloudinary Admin API error", response.status, errorText);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch from Cloudinary",
          status: response.status,
          details: errorText,
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const resources: CloudinaryResource[] = (data.resources || []).map((r: any) => ({
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in get-cloudinary-media:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
