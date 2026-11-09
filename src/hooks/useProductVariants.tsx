import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ProductVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  barcode: string | null;
  stock_quantity: number;
  price_cents: number | null;
  compare_at_price_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface VariantStockData {
  color?: string;
  size?: string;
  sku?: string;
  barcode?: string;
  stock_quantity: number;
  price_cents?: number | null;
  compare_at_price_cents?: number | null;
}

// Fetch all variants for a product
export function useProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-variants", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", productId)
        .order("color", { ascending: true })
        .order("size", { ascending: true });

      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!productId,
    staleTime: 1000 * 60, // 1 minute
  });
}

// Get variant stock for specific size/color combination
export function getVariantStock(
  variants: ProductVariant[],
  color?: string | null,
  size?: string | null
): number | null {
  if (!variants || variants.length === 0) return null;
  
  const variant = variants.find(
    (v) =>
      (v.color || null) === (color || null) &&
      (v.size || null) === (size || null)
  );
  
  return variant ? variant.stock_quantity : null;
}

// Check if a specific variant is in stock
export function isVariantInStock(
  variants: ProductVariant[],
  color?: string | null,
  size?: string | null,
  fallbackStock?: number
): boolean {
  const variantStock = getVariantStock(variants, color, size);
  
  // If we have variant-level stock, use it
  if (variantStock !== null) {
    return variantStock > 0;
  }
  
  // Fallback to product-level stock
  return (fallbackStock ?? 0) > 0;
}

// Get available stock for cart validation
export function getAvailableStock(
  variants: ProductVariant[],
  color?: string | null,
  size?: string | null,
  fallbackStock?: number
): number {
  const variantStock = getVariantStock(variants, color, size);
  
  if (variantStock !== null) {
    return variantStock;
  }
  
  return fallbackStock ?? 0;
}

// Sync variants to database (upsert all, delete removed)
export function useSyncProductVariants() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      productId,
      variants,
      productSku,
    }: {
      productId: string;
      variants: VariantStockData[];
      productSku?: string;
    }) => {
      // First, get existing variants
      const { data: existing, error: fetchError } = await supabase
        .from("product_variants")
        .select("id, color, size")
        .eq("product_id", productId);

      if (fetchError) throw fetchError;

      // Build map of existing variants
      const existingMap = new Map(
        (existing || []).map((v) => [`${v.color || ""}|${v.size || ""}`, v.id])
      );

      // Prepare upserts - separate new variants from existing ones
      const upsertsRaw = variants.map((v, idx) => {
        const key = `${v.color || ""}|${v.size || ""}`;
        const existingId = existingMap.get(key);

        // Auto-generate SKU if not provided
        const autoSku = v.sku || (productSku
          ? `${productSku}-${v.color?.toUpperCase().slice(0, 3) || ""}${v.size?.toUpperCase() || ""}-${idx + 1}`.replace(/--+/g, "-")
          : null);

        // Build the base object WITHOUT id.
        // Do not write stock_quantity here: stock is managed exclusively via outlet_inventory.
        const baseVariant = {
          product_id: productId,
          color: v.color || null,
          size: v.size || null,
          sku: autoSku,
          barcode: v.barcode?.trim() || null, // Persist barcode from form input
          price_cents: v.price_cents ?? null,
          compare_at_price_cents: v.compare_at_price_cents ?? null,
        };

        // Only include id if it exists (for updates)
        if (existingId) {
          return { id: existingId, ...baseVariant };
        }

        return baseVariant;
      });

      // SAFETY: never send id: null/undefined (it breaks inserts)
      const upserts = upsertsRaw.map((row: any) => {
        if (row && Object.prototype.hasOwnProperty.call(row, "id") && !row.id) {
          const { id, ...rest } = row;
          return rest;
        }
        return row;
      });

      // Find variants to delete (exist in DB but not in new list)
      const newKeys = new Set(variants.map((v) => `${v.color || ""}|${v.size || ""}`));
      const toDelete = (existing || [])
        .filter((v) => !newKeys.has(`${v.color || ""}|${v.size || ""}`))
        .map((v) => v.id);

      // Delete removed variants
      if (toDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from("product_variants")
          .delete()
          .in("id", toDelete);

        if (deleteError) throw deleteError;
      }

      // Split into updates (have id) and inserts (no id)
      const toUpdate = upserts.filter((r: any) => r.id);
      const toInsert = upserts.filter((r: any) => !r.id);

      // Update existing variants
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from("product_variants")
          .upsert(toUpdate as any, { onConflict: "id" });

        if (updateError) throw updateError;
      }

      // Insert new variants (no id field — DB generates it)
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from("product_variants")
          .insert(toInsert as any);

        if (insertError) throw insertError;
      }

      return { synced: upserts.length, deleted: toDelete.length };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-variants", variables.productId] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
    },
    onError: (error: Error) => {
      console.error("Variant sync error:", error);
      toast({
        title: "Variant Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
