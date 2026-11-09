import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";
import { useEffect } from "react";

export interface VariantInventory {
  variant_id: string;
  outlet_id: string;
  quantity: number;
  variant?: {
    id: string;
    size: string | null;
    color: string | null;
    sku: string | null;
  };
}

export interface ProductInventorySummary {
  product_id: string;
  total_stock: number;
  outlets: {
    outlet_id: string;
    outlet_name: string;
    quantity: number;
  }[];
}

export interface OutletVariantStock {
  outlet_id: string;
  outlet_name: string;
  variant_id: string | null;
  product_id: string;
  size: string | null;
  color: string | null;
  quantity: number;
}

async function getInventoryRow(outletId: string, productId: string, variantId: string | null) {
  let query = supabase
    .from("outlet_inventory")
    .select("id, quantity")
    .eq("outlet_id", outletId)
    .eq("product_id", productId);

  query = variantId ? query.eq("variant_id", variantId) : query.is("variant_id", null);

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

// Get total stock for a product across all outlets (for website display)
export function useGlobalProductStock(productId: string | undefined) {
  return useQuery({
    queryKey: ["global-product-stock", productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from("outlet_inventory")
        .select(`
          quantity,
          variant_id,
          variant:product_variants(id, size, color)
        `)
        .eq("product_id", productId);

      if (error) throw error;

      // Group by variant and sum quantities
      const variantTotals = new Map<string, { size: string | null; color: string | null; total: number }>();
      
      for (const row of data || []) {
        const key = row.variant_id || "base";
        const existing = variantTotals.get(key);
        const variant = row.variant as { size: string | null; color: string | null } | null;
        
        if (existing) {
          existing.total += row.quantity;
        } else {
          variantTotals.set(key, {
            size: variant?.size || null,
            color: variant?.color || null,
            total: row.quantity,
          });
        }
      }

      return {
        productId,
        totalStock: Array.from(variantTotals.values()).reduce((sum, v) => sum + v.total, 0),
        variants: Array.from(variantTotals.entries()).map(([id, data]) => ({
          variantId: id === "base" ? null : id,
          size: data.size,
          color: data.color,
          stock: data.total,
        })),
      };
    },
    enabled: !!productId,
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Get outlet-specific stock for a variant (for POS validation)
export function useOutletVariantStock(outletId: string | null, productId: string | undefined, variantId: string | null = null) {
  return useQuery({
    queryKey: ["outlet-variant-stock", outletId, productId, variantId],
    queryFn: async () => {
      if (!outletId || !productId) return 0;

      let query = supabase
        .from("outlet_inventory")
        .select("quantity")
        .eq("outlet_id", outletId)
        .eq("product_id", productId);

      if (variantId) {
        query = query.eq("variant_id", variantId);
      } else {
        query = query.is("variant_id", null);
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;
      return data?.quantity || 0;
    },
    enabled: !!outletId && !!productId,
    staleTime: 1000 * 10, // 10 seconds
  });
}

// Get all inventory for an outlet (grouped by product/variant)
export function useOutletInventoryList(outletId: string | null) {
  const queryClient = useQueryClient();

  // Set up real-time subscription for product_variants price changes
  useEffect(() => {
    if (!outletId) return;

    const channel = supabase
      .channel(`inventory-variants-${outletId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "product_variants",
        },
        () => {
          // Invalidate and refetch when variant prices change
          queryClient.invalidateQueries({ queryKey: ["outlet-inventory-list", outletId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [outletId, queryClient]);

  return useQuery({
    queryKey: ["outlet-inventory-list", outletId],
    queryFn: async () => {
      if (!outletId) return [];

      const { data, error } = await supabase
        .from("outlet_inventory")
        .select(`
          id,
          outlet_id,
          product_id,
          variant_id,
          quantity,
          product:products(id, title, sku, images, price_cents, is_online_active),
          variant:product_variants(id, size, color, sku, price_cents)
        `)
        .eq("outlet_id", outletId)
        .gt("quantity", 0)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!outletId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Get inventory summary for a product across all outlets (for admin view)
export function useProductInventorySummary(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-inventory-summary", productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from("outlet_inventory")
        .select(`
          quantity,
          outlet_id,
          variant_id,
          outlet:outlets(id, name, is_main_branch),
          variant:product_variants(id, size, color, sku)
        `)
        .eq("product_id", productId);

      if (error) throw error;

      // Group by outlet
      const outletTotals = new Map<string, { name: string; isMain: boolean; total: number; variants: any[] }>();
      
      for (const row of data || []) {
        const outlet = row.outlet as { id: string; name: string; is_main_branch: boolean } | null;
        if (!outlet) continue;

        const existing = outletTotals.get(outlet.id);
        if (existing) {
          existing.total += row.quantity;
          existing.variants.push({
            variantId: row.variant_id,
            variant: row.variant,
            quantity: row.quantity,
          });
        } else {
          outletTotals.set(outlet.id, {
            name: outlet.name,
            isMain: outlet.is_main_branch,
            total: row.quantity,
            variants: [{
              variantId: row.variant_id,
              variant: row.variant,
              quantity: row.quantity,
            }],
          });
        }
      }

      return {
        productId,
        totalStock: Array.from(outletTotals.values()).reduce((sum, o) => sum + o.total, 0),
        outlets: Array.from(outletTotals.entries())
          .map(([id, data]) => ({
            outletId: id,
            outletName: data.name,
            isMainBranch: data.isMain,
            totalQuantity: data.total,
            variants: data.variants,
          }))
          .sort((a, b) => (b.isMainBranch ? 1 : 0) - (a.isMainBranch ? 1 : 0)),
      };
    },
    enabled: !!productId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Add stock to outlet inventory (stock-in operation)
export function useAddOutletStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      outletId,
      productId,
      variantId,
      quantity,
      notes,
    }: {
      outletId: string;
      productId: string;
      variantId: string | null;
      quantity: number;
      notes?: string;
    }) => {
      // Get user's name
      let userName = "Unknown";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        userName = profile?.full_name || "Unknown";
      }

      // Upsert outlet inventory. variant_id can be NULL, so never compare it to a fake UUID.
      const existing = await getInventoryRow(outletId, productId, variantId);

      if (existing) {
        // Update existing row
        const { error } = await supabase
          .from("outlet_inventory")
          .update({ 
            quantity: existing.quantity + quantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new row
        const { error } = await supabase
          .from("outlet_inventory")
          .insert({
            outlet_id: outletId,
            product_id: productId,
            variant_id: variantId,
            quantity,
          });

        if (error) throw error;
      }

      // Log the stock-in operation
      const { error: logError } = await supabase
        .from("inventory_logs")
        .insert({
          outlet_id: outletId,
          product_id: productId,
          variant_id: variantId,
          qty_change: quantity,
          action_type: "stock_in",
          notes: notes || "Stock received",
          user_id: user?.id,
          user_name: userName,
        });

      if (logError) console.error("Failed to log inventory change:", logError);

      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["outlet-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["outlet-inventory-list", variables.outletId] });
      queryClient.invalidateQueries({ queryKey: ["product-inventory-summary", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["global-product-stock", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Adjust outlet stock (can be positive or negative)
export function useAdjustOutletStock() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      outletId,
      productId,
      variantId,
      newQuantity,
      reason,
    }: {
      outletId: string;
      productId: string;
      variantId: string | null;
      newQuantity: number;
      reason?: string;
    }) => {
      // Get user's name
      let userName = "Unknown";
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        userName = profile?.full_name || "Unknown";
      }

      // Get current quantity. variant_id can be NULL, so never compare it to a fake UUID.
      const existing = await getInventoryRow(outletId, productId, variantId);

      const oldQuantity = existing?.quantity || 0;
      const change = newQuantity - oldQuantity;

      if (existing) {
        const { error } = await supabase
          .from("outlet_inventory")
          .update({ 
            quantity: newQuantity,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else if (newQuantity > 0) {
        const { error } = await supabase
          .from("outlet_inventory")
          .insert({
            outlet_id: outletId,
            product_id: productId,
            variant_id: variantId,
            quantity: newQuantity,
          });

        if (error) throw error;
      }

      // Log the adjustment
      if (change !== 0) {
        await supabase
          .from("inventory_logs")
          .insert({
            outlet_id: outletId,
            product_id: productId,
            variant_id: variantId,
            qty_change: change,
            action_type: "adjustment",
            notes: reason || "Manual adjustment",
            user_id: user?.id,
            user_name: userName,
          });
      }

      return { success: true, change };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["outlet-inventory"] });
      queryClient.invalidateQueries({ queryKey: ["outlet-inventory-list", variables.outletId] });
      queryClient.invalidateQueries({ queryKey: ["product-inventory-summary", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["global-product-stock", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Get AGGREGATED stock for a specific variant at a specific outlet (for POS cart validation)
// This sums all inventory rows for the same product/variant to handle duplicate entries
export async function getOutletVariantStockDirect(
  outletId: string,
  productId: string,
  size?: string | null,
  color?: string | null
): Promise<number> {
  // First, find the variant ID if we have size/color
  let variantId: string | null = null;

  if (size || color) {
    const { data: variant } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", productId)
      .eq("size", size || "")
      .eq("color", color || "")
      .maybeSingle();

    variantId = variant?.id || null;
  }

  // Get ALL stock rows for this variant at this outlet (handles duplicates)
  let query = supabase
    .from("outlet_inventory")
    .select("quantity")
    .eq("outlet_id", outletId)
    .eq("product_id", productId);

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data } = await query;
  
  // Sum all quantities from duplicate rows
  if (!data || data.length === 0) return 0;
  return data.reduce((sum, row) => sum + (row.quantity || 0), 0);
}

// Get the inventory row with highest stock for a product/variant (for deduction purposes)
export async function getBestInventoryRowForDeduction(
  outletId: string,
  productId: string,
  variantId: string | null
): Promise<{ id: string; quantity: number } | null> {
  let query = supabase
    .from("outlet_inventory")
    .select("id, quantity")
    .eq("outlet_id", outletId)
    .eq("product_id", productId)
    .gt("quantity", 0)
    .order("quantity", { ascending: false })
    .limit(1);

  if (variantId) {
    query = query.eq("variant_id", variantId);
  } else {
    query = query.is("variant_id", null);
  }

  const { data } = await query;
  return data?.[0] || null;
}
