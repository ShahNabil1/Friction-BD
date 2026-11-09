import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";

export interface OrderNote {
  id: string;
  order_id: string;
  note: string;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

export const useOrderNotes = (orderId: string | null) => {
  const [notes, setNotes] = useState<OrderNote[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();

  const fetchNotes = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from("order_notes")
        .select("*")
        .eq("order_id", orderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setNotes((data as OrderNote[]) || []);
    } catch (error) {
      console.error("Error fetching order notes:", error);
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const addNote = useCallback(
    async (noteText: string) => {
      if (!orderId || !user || !noteText.trim()) return false;
      setIsAdding(true);

      try {
        // Get user's name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const userName = profile?.full_name || profile?.email || user.email || "Unknown";

        const { error } = await supabase.from("order_notes").insert({
          order_id: orderId,
          note: noteText.trim(),
          created_by: user.id,
          created_by_name: userName,
        });

        if (error) throw error;

        // Refresh notes
        await fetchNotes();
        return true;
      } catch (error) {
        console.error("Error adding note:", error);
        return false;
      } finally {
        setIsAdding(false);
      }
    },
    [orderId, user, fetchNotes]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      try {
        const { error } = await supabase
          .from("order_notes")
          .delete()
          .eq("id", noteId);

        if (error) throw error;

        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        return true;
      } catch (error) {
        console.error("Error deleting note:", error);
        return false;
      }
    },
    []
  );

  return { notes, isLoading, isAdding, addNote, deleteNote, refetch: fetchNotes };
};
