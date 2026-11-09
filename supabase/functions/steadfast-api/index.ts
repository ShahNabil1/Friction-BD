import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const STEADFAST_BASE_URL = "https://portal.packzy.com/api/v1";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const [
      { data: isAdmin, error: adminErr },
      { data: isSuperAdmin, error: superErr },
      { data: isModerator, error: modErr },
    ] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "super_admin" }),
      supabase.rpc("has_role", { _user_id: user.id, _role: "moderator" }),
    ]);

    if (adminErr || superErr || modErr) {
      console.error("Role check error:", adminErr ?? superErr ?? modErr);
      return new Response(
        JSON.stringify({ error: "Authorization check failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let hasAccess = isAdmin || isSuperAdmin;
    if (!hasAccess && isModerator) {
      const { data: hasCourierPermission } = await supabase.rpc("has_permission", {
        _user_id: user.id,
        _permission: "courier",
      });
      hasAccess = hasCourierPermission === true;
    }

    if (!hasAccess) {
      return new Response(
        JSON.stringify({ error: "Courier access required. Contact an admin to grant courier permissions." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestType = body.type;

    if (!requestType) {
      return new Response(
        JSON.stringify({ error: "Missing 'type' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("STEADFAST_API_KEY");
    const secretKey = Deno.env.get("STEADFAST_SECRET_KEY");

    if (!apiKey || !secretKey) {
      console.error("Missing Steadfast API credentials");
      return new Response(
        JSON.stringify({ error: "Steadfast API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const steadfastHeaders = {
      "Api-Key": apiKey,
      "Secret-Key": secretKey,
      "Content-Type": "application/json",
    };

    let endpoint: string;
    let method: string = "GET";
    let requestBody: string | null = null;

    switch (requestType) {
      case "balance":
        endpoint = "/get_balance";
        break;
      case "payments":
        endpoint = "/payments";
        break;
      case "returns":
        endpoint = "/get_return_requests";
        break;
      case "status_by_tracking":
        if (!body.tracking_code) {
          return new Response(
            JSON.stringify({ error: "Missing tracking_code parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        endpoint = `/status_by_trackingcode/${encodeURIComponent(body.tracking_code)}`;
        break;
      case "status_by_invoice":
        if (!body.invoice) {
          return new Response(
            JSON.stringify({ error: "Missing invoice parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        endpoint = `/status_by_invoice/${encodeURIComponent(body.invoice)}`;
        break;
      case "status_by_cid":
        if (!body.consignment_id) {
          return new Response(
            JSON.stringify({ error: "Missing consignment_id parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        endpoint = `/status_by_cid/${encodeURIComponent(body.consignment_id)}`;
        break;
      case "create_return":
        if (!body.consignment_id && !body.invoice && !body.tracking_code) {
          return new Response(
            JSON.stringify({ error: "Missing consignment_id, invoice, or tracking_code parameter" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        endpoint = "/create_return_request";
        method = "POST";
        requestBody = JSON.stringify({
          consignment_id: body.consignment_id || undefined,
          invoice: body.invoice || undefined,
          tracking_code: body.tracking_code || undefined,
          reason: body.reason || "Customer requested return",
        });
        break;
      case "bulk_status":
        if (!body.consignment_ids || !Array.isArray(body.consignment_ids)) {
          return new Response(
            JSON.stringify({ error: "Missing consignment_ids array" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const statuses: Record<string, unknown> = {};
        const errors: Record<string, string> = {};
        
        for (const cid of body.consignment_ids.slice(0, 50)) {
          try {
            const statusResponse = await fetch(`${STEADFAST_BASE_URL}/status_by_cid/${encodeURIComponent(cid)}`, {
              method: "GET",
              headers: steadfastHeaders,
            });
            const statusText = await statusResponse.text();
            try {
              const statusData = JSON.parse(statusText);
              if (statusResponse.ok && statusData.status === 200) {
                statuses[cid] = statusData.delivery_status;
              } else {
                errors[cid] = statusData.message || "Unknown error";
              }
            } catch {
              errors[cid] = "Invalid JSON response";
            }
          } catch (e) {
            errors[cid] = e instanceof Error ? e.message : "Request failed";
          }
        }
        
        return new Response(
          JSON.stringify({ success: true, data: { statuses, errors } }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      default:
        return new Response(
          JSON.stringify({ error: `Unknown request type: ${requestType}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    const steadfastResponse = await fetch(`${STEADFAST_BASE_URL}${endpoint}`, {
      method,
      headers: steadfastHeaders,
      body: requestBody,
    });

    const contentType = steadfastResponse.headers.get("content-type") || "";
    const rawText = await steadfastResponse.text();
    let responseData: unknown = null;

    try {
      responseData = rawText ? JSON.parse(rawText) : null;
    } catch {
      console.error(
        `Steadfast ${requestType} non-JSON response (status ${steadfastResponse.status}, content-type: ${contentType}). First 200 chars:`,
        rawText.slice(0, 200)
      );
      return new Response(
        JSON.stringify({
          error: "Steadfast returned a non-JSON response",
          status: steadfastResponse.status,
          content_type: contentType,
          preview: rawText.slice(0, 200),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!steadfastResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Steadfast API error",
          details: responseData,
          status: steadfastResponse.status,
        }),
        {
          status: steadfastResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ success: true, data: responseData }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Steadfast API proxy error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
