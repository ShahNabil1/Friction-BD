import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";
import type { Json } from "@/integrations/supabase/types";

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  severity: "info" | "warning" | "critical";
  is_read: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
}

interface CreateNotificationParams {
  type: string;
  title: string;
  message: string;
  entityType?: string;
  entityId?: string;
  severity?: "info" | "warning" | "critical";
}

export const useAdminNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const typed = (data || []) as AdminNotification[];
      setNotifications(typed);
      setUnreadCount(typed.filter((n) => !n.is_read).length);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const channel = supabase
      .channel("admin-notifications-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "admin_notifications" },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications((prev) => [newNotification, ...prev].slice(0, 50));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "admin_notifications" },
        (payload) => {
          const updated = payload.new as AdminNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.is_read).length);
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from("admin_notifications")
        .update({ is_read: true })
        .in("id", unreadIds);

      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, [notifications]);

  const createNotification = useCallback(
    async ({
      type,
      title,
      message,
      entityType,
      entityId,
      severity = "info",
    }: CreateNotificationParams) => {
      if (!user) return;

      try {
        // Get user name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const userName = profile?.full_name || profile?.email || user.email || "Unknown";

        await supabase.from("admin_notifications").insert([
          {
            type,
            title,
            message,
            entity_type: entityType || null,
            entity_id: entityId || null,
            severity,
            created_by: user.id,
            created_by_name: userName,
          },
        ]);
      } catch (error) {
        console.error("Error creating notification:", error);
      }
    },
    [user]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    createNotification,
    refetch: fetchNotifications,
  };
};
