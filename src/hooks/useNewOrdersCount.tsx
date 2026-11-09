import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const LAST_SEEN_KEY = "admin_orders_last_seen";

export function useNewOrdersCount() {
  const [newOrdersCount, setNewOrdersCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const channelIdRef = useRef(crypto.randomUUID());

  // Get the last seen timestamp from localStorage
  const getLastSeen = useCallback((): string => {
    const stored = localStorage.getItem(LAST_SEEN_KEY);
    if (stored) return stored;
    // Default to 24 hours ago if never seen
    const defaultTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return defaultTime;
  }, []);

  // Mark orders as seen (call this when visiting the orders page)
  const markOrdersAsSeen = useCallback(() => {
    localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    setNewOrdersCount(0);
  }, []);

  // Fetch count of new orders since last seen
  const fetchNewOrdersCount = useCallback(async () => {
    try {
      const lastSeen = getLastSeen();
      
      const { count, error } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastSeen);

      if (error) throw error;
      setNewOrdersCount(count || 0);
    } catch (error) {
      console.error("Error fetching new orders count:", error);
    } finally {
      setIsLoading(false);
    }
  }, [getLastSeen]);

  // Initial fetch
  useEffect(() => {
    fetchNewOrdersCount();
  }, [fetchNewOrdersCount]);

  // Real-time subscription for new orders
  useEffect(() => {
    const channel = supabase
      .channel(`new-orders-count-${channelIdRef.current}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        () => {
          // Increment count when a new order arrives
          setNewOrdersCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    newOrdersCount,
    isLoading,
    markOrdersAsSeen,
    refetch: fetchNewOrdersCount,
  };
}
