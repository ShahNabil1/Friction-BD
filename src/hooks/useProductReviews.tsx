import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string | null;
  reviewer_name: string;
  rating: number;
  review_text: string | null;
  images: string[];
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  created_at: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  distribution: { [key: number]: number };
}

export function useProductReviews(productId: string | undefined) {
  return useQuery({
    queryKey: ["product-reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      
      const { data, error } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "approved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductReview[];
    },
    enabled: !!productId,
  });
}

export function useReviewStats(productId: string | undefined) {
  const { data: reviews = [] } = useProductReviews(productId);
  
  const stats: ReviewStats = {
    averageRating: 0,
    totalReviews: reviews.length,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  };

  if (reviews.length > 0) {
    let total = 0;
    reviews.forEach((review) => {
      total += review.rating;
      stats.distribution[review.rating] = (stats.distribution[review.rating] || 0) + 1;
    });
    stats.averageRating = total / reviews.length;
  }

  return stats;
}

// Check if user can write a review (must have purchased and delivered order)
export function useCanWriteReview(productId: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["can-write-review", productId, user?.id],
    queryFn: async () => {
      if (!productId || !user) return { canWrite: false, reason: "login" };

      // Check if user already reviewed this product
      const { data: existingReview } = await supabase
        .from("product_reviews")
        .select("id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingReview) {
        return { canWrite: false, reason: "already_reviewed" };
      }

      // Check if user has a delivered order containing this product
      const { data: orders } = await supabase
        .from("orders")
        .select(`
          id,
          status,
          order_items!inner(product_id)
        `)
        .eq("user_id", user.id)
        .eq("status", "delivered");

      const hasDeliveredOrder = orders?.some((order) =>
        order.order_items?.some((item: { product_id: string | null }) => item.product_id === productId)
      );

      if (!hasDeliveredOrder) {
        return { canWrite: false, reason: "not_purchased" };
      }

      return { canWrite: true, reason: null };
    },
    enabled: !!productId && !!user,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (review: {
      product_id: string;
      reviewer_name: string;
      rating: number;
      review_text?: string;
      images?: string[];
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Must be logged in to write a review");

      const { data, error } = await supabase
        .from("product_reviews")
        .insert({
          product_id: review.product_id,
          reviewer_name: review.reviewer_name,
          rating: review.rating,
          review_text: review.review_text || null,
          images: review.images || [],
          user_id: user.id,
          status: "pending",
          is_verified_purchase: true, // User has been verified via useCanWriteReview
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["product-reviews", variables.product_id] });
      queryClient.invalidateQueries({ queryKey: ["can-write-review", variables.product_id] });
    },
  });
}
