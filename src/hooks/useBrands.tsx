import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useActivityLog } from "./useActivityLog";

export type BrandRow = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at?: string;
};

async function fetchBrands(): Promise<BrandRow[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("id, name, slug, logo_url, created_at, updated_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return (data as BrandRow[]) || [];
}

export function useBrands() {
  return useQuery({ queryKey: ["brands"], queryFn: fetchBrands });
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useCreateBrand() {
  const qc = useQueryClient();
  const { logActivity } = useActivityLog();
  
  return useMutation({
    mutationFn: async (input: { name: string; logo_url?: string | null }) => {
      const slug = generateSlug(input.name);
      const { data, error } = await supabase
        .from("brands")
        .insert({ name: input.name, slug, logo_url: input.logo_url ?? null })
        .select("id")
        .single();
      if (error) throw error;
      return { ...data, name: input.name };
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      await logActivity({
        actionType: "brand_created",
        entityType: "brand",
        entityId: data.id,
        details: { name: data.name },
      });
    },
  });
}

export function useUpdateBrand() {
  const qc = useQueryClient();
  const { logActivity } = useActivityLog();
  
  return useMutation({
    mutationFn: async (input: { id: string; name: string; logo_url?: string | null }) => {
      const slug = generateSlug(input.name);
      const { error } = await supabase
        .from("brands")
        .update({ name: input.name, slug, logo_url: input.logo_url ?? null })
        .eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      await logActivity({
        actionType: "brand_updated",
        entityType: "brand",
        entityId: data.id,
        details: { name: data.name },
      });
    },
  });
}

export function useDeleteBrand() {
  const qc = useQueryClient();
  const { logActivity } = useActivityLog();
  
  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase.from("brands").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: async (data) => {
      qc.invalidateQueries({ queryKey: ["brands"] });
      await logActivity({
        actionType: "brand_deleted",
        entityType: "brand",
        entityId: data.id,
        details: { name: data.name },
      });
    },
  });
}
