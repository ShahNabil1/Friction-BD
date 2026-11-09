import { useCallback } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type ActionType =
  | "order_confirmed"
  | "order_status_changed"
  | "order_cancelled"
  | "order_amount_edited"
  | "order_deleted"
  | "order_created_manual"
  | "payment_marked_paid"
  | "sent_to_courier"
  | "stock_updated"
  | "stock_adjusted"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "brand_created"
  | "brand_updated"
  | "brand_deleted";

interface LogActivityParams {
  actionType: ActionType;
  entityType: "order" | "product" | "category" | "brand" | "outlet_inventory";
  entityId: string;
  details?: Record<string, Json>;
}

export const useActivityLog = () => {
  const { user } = useAuth();

  const logActivity = useCallback(
    async ({ actionType, entityType, entityId, details = {} }: LogActivityParams) => {
      if (!user) return;

      try {
        // Get user's name from profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        const userName = profile?.full_name || profile?.email || user.email || "Unknown";

        await supabase.from("activity_logs").insert({
          user_id: user.id,
          user_name: userName,
          action: actionType, // 'action' is required column
          action_type: actionType,
          entity_type: entityType,
          entity_id: entityId,
          details: details as Json,
        });
      } catch (error) {
        console.error("Failed to log activity:", error);
      }
    },
    [user]
  );

  return { logActivity };
};

// Standalone function for use in non-hook contexts
export const logActivityDirect = async (
  userId: string,
  userName: string,
  actionType: ActionType,
  entityType: "order" | "product" | "category" | "brand" | "outlet_inventory",
  entityId: string,
  details: Record<string, Json> = {}
) => {
  try {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      user_name: userName,
      action: actionType, // 'action' is required column
      action_type: actionType,
      entity_type: entityType,
      entity_id: entityId,
      details: details as Json,
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};
