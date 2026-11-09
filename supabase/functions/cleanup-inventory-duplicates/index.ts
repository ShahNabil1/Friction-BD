import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authorization header to verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user has admin privileges
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["super_admin", "admin"])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin privileges required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { outlet_id } = await req.json();
    
    if (!outlet_id) {
      return new Response(
        JSON.stringify({ error: "outlet_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Starting cleanup for outlet: ${outlet_id}`);

    // Find all inventory entries for this outlet
    const { data: inventory, error: fetchError } = await supabase
      .from("outlet_inventory")
      .select("id, product_id, variant_id, quantity")
      .eq("outlet_id", outlet_id)
      .order("created_at", { ascending: true });

    if (fetchError) {
      throw fetchError;
    }

    // Group by product_id + variant_id
    const groups = new Map<string, typeof inventory>();
    
    for (const item of inventory || []) {
      const key = `${item.product_id}-${item.variant_id || "null"}`;
      const existing = groups.get(key);
      
      if (existing) {
        existing.push(item);
      } else {
        groups.set(key, [item]);
      }
    }

    // Find groups with duplicates
    let mergedCount = 0;
    const deletedIds: string[] = [];

    for (const [key, items] of groups) {
      if (items.length <= 1) continue;

      console.log(`Found ${items.length} duplicates for ${key}`);
      
      // Sum all quantities
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      
      // Keep the first item, delete the rest
      const [keepItem, ...duplicates] = items;
      
      // Update the first item with total quantity
      const { error: updateError } = await supabase
        .from("outlet_inventory")
        .update({ quantity: totalQuantity, updated_at: new Date().toISOString() })
        .eq("id", keepItem.id);

      if (updateError) {
        console.error(`Failed to update item ${keepItem.id}:`, updateError);
        continue;
      }

      // Delete duplicates
      const duplicateIds = duplicates.map(d => d.id);
      const { error: deleteError } = await supabase
        .from("outlet_inventory")
        .delete()
        .in("id", duplicateIds);

      if (deleteError) {
        console.error(`Failed to delete duplicates:`, deleteError);
        continue;
      }

      mergedCount++;
      deletedIds.push(...duplicateIds);
      
      console.log(`Merged ${items.length} rows into 1 with quantity ${totalQuantity}`);
    }

    // Log the cleanup action
    await supabase.from("inventory_logs").insert({
      outlet_id,
      action_type: "cleanup",
      qty_change: 0,
      notes: `Merged ${mergedCount} duplicate groups, deleted ${deletedIds.length} rows`,
      user_id: user.id,
    });

    console.log(`Cleanup complete. Merged ${mergedCount} groups.`);

    return new Response(
      JSON.stringify({
        success: true,
        merged_count: mergedCount,
        deleted_rows: deletedIds.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

