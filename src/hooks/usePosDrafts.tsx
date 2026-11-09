import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/hooks/useProducts";

export type PosDraftLine = {
  product_id: string;
  qty: number;
  size?: string;
  color?: string;
  /** Raw POS unit price as saved (NO /100 conversion) */
  price?: number;
  /** Optional precomputed line total as saved (qty * price) */
  total?: number;
};

export type PosDraftPayload = {
  customer: { kind: "profile" | "manual"; id: string; name?: string; phone?: string } | null;
  lines: PosDraftLine[];
  shipping: Record<string, string>;
  deliveryFee: number;
  paymentStatus: string;
  paymentMethod: string;
  discount?: number;
};

export type PosDraftRow = {
  id: string;
  label: string;
  created_by: string;
  status: string;
  payload: PosDraftPayload;
  created_at: string;
  updated_at: string;
};

async function listPosDrafts(userId: string): Promise<PosDraftRow[]> {
  const { data, error } = await supabase
    .from("pos_drafts")
    .select("id, label, created_by, status, payload, created_at, updated_at")
    .eq("created_by", userId)
    .eq("status", "draft")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as any as PosDraftRow[]) || [];
}

export function usePosDrafts(userId: string | null) {
  return useQuery({
    queryKey: ["pos_drafts", userId],
    queryFn: () => listPosDrafts(userId!),
    enabled: !!userId,
  });
}

export function useCreatePosDraft(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { label: string; payload: PosDraftPayload }) => {
      if (!userId) throw new Error("Not signed in");
      const { data, error } = await supabase
        .from("pos_drafts")
        .insert({
          user_id: userId,
          name: input.label,
          label: input.label,
          created_by: userId,
          status: "draft",
          payload: input.payload as any,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_drafts", userId] }),
  });
}

export function useDeletePosDraft(userId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (draftId: string) => {
      const { error } = await supabase.from("pos_drafts").delete().eq("id", draftId);
      if (error) throw error;
      return true;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pos_drafts", userId] }),
  });
}

export async function fetchPosDraft(draftId: string): Promise<PosDraftRow> {
  const { data, error } = await supabase
    .from("pos_drafts")
    .select("id, label, created_by, status, payload, created_at, updated_at")
    .eq("id", draftId)
    .single();
  if (error) throw error;
  return data as any as PosDraftRow;
}

// Fetch products by IDs for loading drafts
export async function fetchProductsByIds(productIds: string[]): Promise<Product[]> {
  if (productIds.length === 0) return [];
  
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", productIds);
  
  if (error) throw error;
  
  // Transform to Product type
  return (data || []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    description: p.description || "",
    // IMPORTANT: POS expects raw BDT values (no /100). The column name is historical.
    price: p.price_cents,
    compareAtPrice: p.compare_at_price_cents ?? undefined,
    images: (p.images as string[]) || [],
    category: p.category || "",
    subcategory: p.subcategory || "",
    badge: p.badge || undefined,
    rating: p.rating || 0,
    reviewCount: p.review_count || 0,
    brand: p.brand || "",
    sizeOptions: (p.size_options as string[]) || [],
    colorOptions: (p.color_options as Array<{ name: string; swatch: "gold" | "silver" | "black"; imageIndex: number }>) || [],
    stock: p.stock || 0,
    sku: p.sku || undefined,
    status: p.status || "active",
    specs: (p.specs as Array<{ label: string; value: string }>) || [],
    faq: (p.faq as Array<{ q: string; a: string }>) || [],
    benefits: (p.benefits as Array<{ title: string; desc: string }>) || [],
    variants: (p.variants as Array<{ color?: string; size?: string; price_cents: number | null; compare_at_price_cents?: number | null }>) || [],
  }));
}
