import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "./useActivityLog";

export interface Category {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  image_url_optimized: string | null;
  parent_id: string | null;
  sort_order: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
  parent?: Category | null;
  children?: Category[];
}

export interface CategoryFormData {
  name: string;
  slug: string;
  image_url?: string | null;
  parent_id?: string | null;
  sort_order?: number;
  is_featured?: boolean;
}

export const useCategories = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { logActivity } = useActivityLog();

  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Category[];
    },
  });

  // Build hierarchical structure
  const buildHierarchy = (cats: Category[]): Category[] => {
    const map = new Map<string, Category>();
    const roots: Category[] = [];

    // First pass: create map
    cats.forEach((cat) => {
      map.set(cat.id, { ...cat, children: [] });
    });

    // Second pass: build tree
    cats.forEach((cat) => {
      const node = map.get(cat.id)!;
      if (cat.parent_id && map.has(cat.parent_id)) {
        const parent = map.get(cat.parent_id)!;
        parent.children = parent.children || [];
        parent.children.push(node);
        node.parent = parent;
      } else {
        roots.push(node);
      }
    });

    return roots;
  };

  const hierarchicalCategories = buildHierarchy(categories);

  // Get main categories (no parent)
  const mainCategories = categories.filter((c) => !c.parent_id);

  // Get subcategories for a given parent
  const getSubcategories = (parentId: string) =>
    categories.filter((c) => c.parent_id === parentId);

  // Create category mutation
  const createCategory = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const { data: result, error } = await supabase
        .from("categories")
        .insert({
          name: data.name,
          slug: data.slug,
          image_url: data.image_url || null,
          parent_id: data.parent_id || null,
          sort_order: data.sort_order || 0,
          is_featured: data.is_featured || false,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      await logActivity({
        actionType: "category_created",
        entityType: "category",
        entityId: data.id,
        details: { name: data.name },
      });
      toast({
        title: "Category created",
        description: "The category has been created successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update category mutation
  const updateCategory = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const { data: result, error } = await supabase
        .from("categories")
        .update({
          name: data.name,
          slug: data.slug,
          image_url: data.image_url,
          parent_id: data.parent_id || null,
          sort_order: data.sort_order,
          is_featured: data.is_featured,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return { ...result, inputName: data.name };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      await logActivity({
        actionType: "category_updated",
        entityType: "category",
        entityId: data.id,
        details: { name: data.inputName },
      });
      toast({
        title: "Category updated",
        description: "The category has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete category mutation
  const deleteCategory = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase.from("categories").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      await logActivity({
        actionType: "category_deleted",
        entityType: "category",
        entityId: data.id,
        details: { name: data.name },
      });
      toast({
        title: "Category deleted",
        description: "The category has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error deleting category",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    categories,
    hierarchicalCategories,
    mainCategories,
    getSubcategories,
    isLoading,
    error,
    createCategory,
    updateCategory,
    deleteCategory,
  };
};
