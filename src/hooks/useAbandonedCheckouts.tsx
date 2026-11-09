import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface AbandonedCheckout {
  id: string;
  session_id: string | null;
  customer_name: string | null;
  phone: string;
  address_details: {
    road_no?: string;
    village?: string;
    thana?: string;
    zilla?: string;
    notes?: string;
  } | null;
  cart_items: Array<{
    id: string;
    title: string;
    price: number;
    qty: number;
    image?: string;
    variation?: Record<string, string>;
  }>;
  total_amount: number | null;
  status: "pending" | "converted" | "dismissed";
  created_at: string;
  updated_at: string;
}

// Fetch all abandoned checkouts for admin (pending by default)
export function useAbandonedCheckouts(statusFilter?: "pending" | "converted" | "dismissed" | "all") {
  return useQuery({
    queryKey: ["admin", "abandoned-checkouts", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("abandoned_checkouts")
        .select("*")
        .order("created_at", { ascending: false });

      // Filter by status unless "all" is requested
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data as unknown as AbandonedCheckout[]) || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Upsert abandoned checkout (for frontend auto-save)
export function useSaveAbandonedCheckout() {
  return useMutation({
    mutationFn: async ({
      phone,
      customer_name,
      cart_items,
    }: {
      phone: string;
      customer_name?: string;
      cart_items: AbandonedCheckout["cart_items"];
    }) => {
      // First check if there's an existing pending checkout with this phone
      const { data: existing } = await supabase
        .from("abandoned_checkouts")
        .select("id")
        .eq("phone", phone)
        .eq("status", "pending")
        .maybeSingle();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from("abandoned_checkouts")
          .update({
            customer_name: customer_name || null,
            cart_items,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from("abandoned_checkouts").insert({
          phone,
          customer_name: customer_name || null,
          cart_items,
          status: "pending",
        });

        if (error) throw error;
      }
    },
  });
}

// Update abandoned checkout status
export function useUpdateAbandonedCheckoutStatus() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      status,
    }: {
      id: string;
      status: "converted" | "dismissed";
    }) => {
      const { error } = await supabase
        .from("abandoned_checkouts")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "abandoned-checkouts"] });
      toast({
        title: status === "converted" ? "Marked as Converted" : "Lead Dismissed",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Delete abandoned checkout
export function useDeleteAbandonedCheckout() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("abandoned_checkouts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "abandoned-checkouts"] });
      toast({ title: "Lead Deleted" });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
