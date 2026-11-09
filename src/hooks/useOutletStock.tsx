import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OrderItem {
  product_id?: string | null;
  product_name: string;
  quantity: number;
  selected_variation?: { size?: string; color?: string } | null;
}

export interface OutletStockAvailability {
  outlet_id: string;
  outlet_name: string;
  is_main_branch: boolean;
  has_all_items: boolean;
  items: {
    product_id: string;
    product_name: string;
    required_qty: number;
    available_qty: number;
    has_stock: boolean;
  }[];
}

// Fetch outlet stock availability for order items
export function useOutletStockForOrder(orderItems: OrderItem[]) {
  return useQuery({
    queryKey: ["outlet-stock-availability", orderItems.map(i => i.product_id).join(",")],
    queryFn: async () => {
      if (!orderItems.length) return [];

      // Get all outlets
      const { data: outlets, error: outletsError } = await supabase
        .from("outlets")
        .select("id, name, is_main_branch")
        .eq("is_active", true)
        .order("is_main_branch", { ascending: false })
        .order("name");

      if (outletsError) throw outletsError;
      if (!outlets?.length) return [];

      // Get product IDs from order items
      const productIds = orderItems
        .filter(item => item.product_id)
        .map(item => item.product_id as string);

      if (!productIds.length) return [];

      // Get all outlet inventory for these products
      const { data: inventory, error: inventoryError } = await supabase
        .from("outlet_inventory")
        .select(`
          outlet_id,
          product_id,
          variant_id,
          quantity,
          variant:product_variants(id, size, color)
        `)
        .in("product_id", productIds);

      if (inventoryError) throw inventoryError;

      // Build availability map per outlet
      const result: OutletStockAvailability[] = outlets.map(outlet => {
        const outletInventory = inventory?.filter(inv => inv.outlet_id === outlet.id) || [];
        
        const items = orderItems
          .filter(item => item.product_id)
          .map(item => {
            // Find matching inventory entry (considering variant)
            let availableQty = 0;
            
            if (item.selected_variation?.size || item.selected_variation?.color) {
              // Find variant-specific stock
              const matchingInv = outletInventory.find(inv => {
                if (inv.product_id !== item.product_id) return false;
                if (!inv.variant) return false;
                const variant = inv.variant as { size?: string; color?: string };
                const sizeMatch = !item.selected_variation?.size || variant.size === item.selected_variation.size;
                const colorMatch = !item.selected_variation?.color || variant.color === item.selected_variation.color;
                return sizeMatch && colorMatch;
              });
              availableQty = matchingInv?.quantity || 0;
            } else {
              // Sum all non-variant stock for this product
              const productInv = outletInventory.filter(
                inv => inv.product_id === item.product_id && !inv.variant_id
              );
              availableQty = productInv.reduce((sum, inv) => sum + inv.quantity, 0);
            }

            return {
              product_id: item.product_id as string,
              product_name: item.product_name,
              required_qty: item.quantity,
              available_qty: availableQty,
              has_stock: availableQty >= item.quantity,
            };
          });

        return {
          outlet_id: outlet.id,
          outlet_name: outlet.name,
          is_main_branch: outlet.is_main_branch,
          has_all_items: items.every(i => i.has_stock),
          items,
        };
      });

      return result;
    },
    enabled: orderItems.length > 0 && orderItems.some(i => i.product_id),
  });
}

// Assign order to outlet and update status
export function useAssignOrderToOutlet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      outletId,
      newStatus = "confirmed",
    }: {
      orderId: string;
      outletId: string;
      newStatus?: string;
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          outlet_id: outletId,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
      queryClient.invalidateQueries({ queryKey: ["outlet-assigned-orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-status-history"] });
    },
  });
}

// Fetch orders assigned to a specific outlet with date filtering
export function useOutletAssignedOrders(
  outletId: string | null, 
  statuses: string[] = ["confirmed", "packaging"],
  dateRange?: { from: Date; to: Date } | null
) {
  return useQuery({
    queryKey: ["outlet-assigned-orders", outletId, statuses.join(","), dateRange?.from?.toISOString(), dateRange?.to?.toISOString()],
    queryFn: async () => {
      if (!outletId) return [];

      let query = supabase
        .from("orders")
        .select(`
          id,
          customer_name,
          customer_phone,
          shipping_address,
          shipping_city,
          shipping_area,
          total_amount,
          status,
          created_at,
          source,
          courier_consignment_id,
          courier_tracking_code,
          tracking_code,
          payment_status
        `)
        .eq("outlet_id", outletId)
        .in("status", statuses)
        .neq("source", "pos")
        .order("created_at", { ascending: true });

      // Apply date range filter if provided
      if (dateRange?.from) {
        const startOfDay = new Date(dateRange.from);
        startOfDay.setHours(0, 0, 0, 0);
        query = query.gte("created_at", startOfDay.toISOString());
      }
      
      if (dateRange?.to) {
        const endOfDay = new Date(dateRange.to);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!outletId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// Fetch order items for an order
export function useOrderItemsForFulfillment(orderId: string | null) {
  return useQuery({
    queryKey: ["order-items-fulfillment", orderId],
    queryFn: async () => {
      if (!orderId) return [];

      const { data, error } = await supabase
        .from("order_items")
        .select(`
          id,
          product_id,
          product_name,
          product_image,
          qty,
          quantity,
          selected_variation
        `)
        .eq("order_id", orderId);

      if (error) throw error;
      
      return (data || []).map((item: any) => ({
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || "Unknown Product",
        product_image: item.product_image,
        quantity: item.quantity || item.qty || 1,
        selected_variation: item.selected_variation,
      }));
    },
    enabled: !!orderId,
  });
}

// Update order status (for POS packing flow)
export function useUpdateOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      newStatus,
    }: {
      orderId: string;
      newStatus: string;
    }) => {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["outlet-assigned-orders"] });
    },
  });
}
