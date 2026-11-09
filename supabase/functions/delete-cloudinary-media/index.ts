import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const CLOUD_NAME = "dmzuspsja";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "super_admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get credentials
    const API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
    const API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

    if (!API_KEY || !API_SECRET) {
      console.error("Cloudinary credentials not configured");
      return new Response(
        JSON.stringify({ error: "Cloudinary credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { public_ids } = body as { public_ids?: string[] };

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "public_ids array is required and cannot be empty" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (public_ids.length > 100) {
      return new Response(
        JSON.stringify({ error: "Cannot delete more than 100 resources at once" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Deleting ${public_ids.length} Cloudinary resources:`, public_ids);

    // Cloudinary Admin API - Delete Resources
    // https://cloudinary.com/documentation/admin_api#delete_resources
    const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/resources/image/upload`;
    const auth = btoa(`${API_KEY}:${API_SECRET}`);

    // Build form data with public_ids[]
    const formData = new URLSearchParams();
    public_ids.forEach((id) => {
      formData.append("public_ids[]", id);
    });

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Cloudinary delete error:", response.status, result);
      return new Response(
        JSON.stringify({ error: "Failed to delete resources", details: result }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Cloudinary delete result:", result);

    return new Response(
      JSON.stringify({
        success: true,
        deleted: result.deleted || {},
        deleted_counts: result.deleted_counts || {},
        partial: result.partial || false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in delete-cloudinary-media function:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
