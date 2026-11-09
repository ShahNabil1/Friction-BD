import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { dbToProduct, type Product } from "@/hooks/useProducts";

export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    queryFn: async (): Promise<Product[]> => {
      if (!query.trim()) return [];

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .or(
          `title.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%,subcategory.ilike.%${query}%`
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []).map((p) => dbToProduct(p as any));
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 30, // 30 seconds - shorter for search freshness
  });
}
