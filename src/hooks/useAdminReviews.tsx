import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AdminReview {
  id: string;
  product_id: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  images: string[];
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  is_approved: boolean; // Keep for backward compatibility
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    title: string;
    images: string[];
  };
}

export function useAdminReviews() {
  return useQuery({
    queryKey: ["admin-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          product:products(id, title, images)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as AdminReview[];
    },
  });
}

export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin-products-for-reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, images")
        .eq("status", "active")
        .order("title");

      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpdateReviewStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "pending" | "approved" | "rejected" }) => {
      const isApproved = status === "approved";
      
      const { error } = await supabase
        .from("product_reviews")
        .update({ status, is_approved: isApproved })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
      const message = status === "approved" ? "Review approved" : status === "rejected" ? "Review rejected" : "Review status updated";
      toast.success(message);
    },
    onError: () => {
      toast.error("Failed to update review status");
    },
  });
}

// Keep old function for backward compatibility
export function useApproveReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const status = approved ? "approved" : "pending";
      
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_approved: approved, status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
      toast.success(approved ? "Review approved" : "Review hidden");
    },
    onError: () => {
      toast.error("Failed to update review");
    },
  });
}

export function useVerifyReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase
        .from("product_reviews")
        .update({ is_verified_purchase: verified })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { verified }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
      toast.success(verified ? "Marked as verified purchase" : "Removed verified status");
    },
    onError: () => {
      toast.error("Failed to update review");
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("product_reviews")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
      toast.success("Review deleted");
    },
    onError: () => {
      toast.error("Failed to delete review");
    },
  });
}

export function useCreateManualReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: {
      product_id: string;
      reviewer_name: string;
      rating: number;
      review_text?: string;
      images?: string[];
      is_verified_purchase?: boolean;
      created_at?: string;
    }) => {
      const { data, error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: review.product_id,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          review_text: review.review_text || null,
          images: review.images || [],
          is_verified_purchase: review.is_verified_purchase ?? false,
          status: "approved",
          is_approved: true,
          user_id: null, // Admin-created reviews have no user
          created_at: review.created_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["product-reviews"] });
      toast.success("Review created successfully");
    },
    onError: (error: any) => {
      console.error("Failed to create review:", error);
      toast.error(error?.message || "Failed to create review");
    },
  });
}
