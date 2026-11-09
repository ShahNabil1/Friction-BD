import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";

export interface StatusHistoryEntry {
  id: string;
  order_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  note: string | null;
}

export const useOrderStatusHistory = (orderId: string | null) => {
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("order_status_history")
        .select("*")
        .eq("order_id", orderId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      setHistory((data as StatusHistoryEntry[]) || []);
    } catch (error) {
      console.error("Error fetching status history:", error);
      setHistory([]);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const recordStatusChange = useCallback(
    async (oldStatus: string | null, newStatus: string, note?: string | null) => {
      if (!orderId || !user) return false;

      try {
        // Get user's name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const userName = profile?.full_name || profile?.email || user.email || "Unknown";

        const trimmed = (note ?? "").trim();
        const { error } = await supabase.from("order_status_history").insert({
          order_id: orderId,
          old_status: oldStatus,
          new_status: newStatus,
          changed_by: user.id,
          changed_by_name: userName,
          note: trimmed.length > 0 ? trimmed : null,
        });

        if (error) throw error;

        // Refresh history
        await fetchHistory();
        return true;
      } catch (error) {
        console.error("Error recording status change:", error);
        return false;
      }
    },
    [orderId, user, fetchHistory]
  );

  return { history, isLoading, recordStatusChange, refetch: fetchHistory };
};
