import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import {
  Search,
  Eye,
  Loader2,
  Package,
  Mail,
  Phone,
  MapPin,
  History,
  Send,
  Pencil,
  Check,
  X,
  Truck,
  CheckSquare,
  Square,
  Lock,
  Download,
  Trash2,
  Plus,
  Filter,
  PhoneMissed,
  Copy,
  ExternalLink,

} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CourierWebhookTimeline } from "@/components/admin/CourierWebhookTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ManualOrderDialog } from "@/components/admin/ManualOrderDialog";
import { CustomerFraudCheck } from "@/components/admin/CustomerFraudCheck";
import { FraudRiskBadge } from "@/components/admin/FraudRiskBadge";
import { InlineFraudBadge } from "@/components/admin/InlineFraudBadge";
import { OrderLockBanner } from "@/components/admin/OrderLockBanner";
import { OrderNotesSection } from "@/components/admin/OrderNotesSection";
import { OrderStatusTimeline } from "@/components/admin/OrderStatusTimeline";
import { OrderFulfillmentSection } from "@/components/admin/OrderFulfillmentSection";
import { useOrderLock } from "@/hooks/useOrderLock";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useFraudCache } from "@/hooks/useFraudCache";
import { useWarmFraudCache } from "@/hooks/useWarmFraudCache";
import { useAdminNotifications } from "@/hooks/useAdminNotifications";
import { useOrderStatusHistory } from "@/hooks/useOrderStatusHistory";
import { generateInvoicePDF } from "@/lib/invoiceGenerator";
import { useUserRole } from "@/hooks/useUserRole";
import { EditOrderItemVariantPopover } from "@/components/admin/EditOrderItemVariantPopover";
import { OrderMobileList } from "@/components/admin/OrderMobileCards";
import { OrderStatusFilterDrawer } from "@/components/admin/OrderStatusFilterDrawer";
import { LocationSelect } from "@/components/checkout/LocationSelect";
import { BD_DISTRICTS, BD_DISTRICT_NAMES } from "@/data/bdLocations";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";

function formatEdgeFunctionInvokeError(err: unknown) {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;

  if (err instanceof Error) {
    const anyErr = err as any;
    // Check for FunctionsHttpError context structure
    const ctx = anyErr?.context;
    const body = ctx?.body;
    if (body) {
      if (typeof body === "string") return body;
      if (typeof body === "object") {
        return body.error || body.message || JSON.stringify(body);
      }
    }
    // Also check for nested error structure from supabase functions
    if (anyErr?.message) return anyErr.message;
    if (anyErr?.error) return typeof anyErr.error === "string" ? anyErr.error : JSON.stringify(anyErr.error);
    return err.message || "Unknown error occurred";
  }

  // Handle plain objects with error/message properties
  if (typeof err === "object") {
    const objErr = err as Record<string, unknown>;
    if (objErr.error) return typeof objErr.error === "string" ? objErr.error : JSON.stringify(objErr.error);
    if (objErr.message) return typeof objErr.message === "string" ? objErr.message : JSON.stringify(objErr.message);
  }

  try {
    const jsonStr = JSON.stringify(err);
    return jsonStr === "{}" ? "Permission denied or unknown error" : jsonStr;
  } catch {
    return "Unknown error";
  }
}

interface OrderItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  selected_variation?: { color?: string; size?: string } | null;
}

interface Order {
  id: string;
  order_number?: string | null;
  user_id: string | null;
  customer_id?: string | null;
  source?: string | null;
  items?: any[] | null;
  total_amount: number;
  delivery_fee?: number | null;
  payment_status?: string | null;
  payment_method?: string | null;
  status: string;
  tracking_code: string | null;
  courier_consignment_id?: string | null;
  courier_tracking_code?: string | null;
  courier_status?: string | null;
  courier_cod_collected?: number | null;
  courier_delivery_charge?: number | null;
  courier_last_synced_at?: string | null;

  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  shipping_address: Record<string, string> | null;
  created_at: string;
  updated_at: string;
  locked_by?: string | null;
  locked_by_name?: string | null;
  lock_expiration?: string | null;
  outlet_id?: string | null;
}

const statusOptions = [
  { value: "incomplete", label: "Incomplete", color: "bg-yellow-500/10 text-yellow-700" },
  { value: "pending", label: "Pending", color: "bg-amber-500/10 text-amber-600" },
  { value: "processing", label: "Processing", color: "bg-blue-500/10 text-blue-600" },
  { value: "hold", label: "On Hold", color: "bg-orange-500/10 text-orange-600" },
  { value: "confirmed", label: "Confirmed", color: "bg-teal-500/10 text-teal-600" },
  { value: "packaging", label: "Packaging", color: "bg-indigo-500/10 text-indigo-600" },
  { value: "shipped", label: "Shipped", color: "bg-purple-500/10 text-purple-600" },
  { value: "ready_for_delivery", label: "Ready for Delivery", color: "bg-cyan-500/10 text-cyan-600" },
  { value: "delivered", label: "Delivered", color: "bg-green-500/10 text-green-600" },
  { value: "partial_delivered", label: "Partially Delivered", color: "bg-lime-500/10 text-lime-700" },
  { value: "cancelled", label: "Cancelled", color: "bg-red-500/10 text-red-600" },
  { value: "returned", label: "Returned", color: "bg-gray-500/10 text-gray-600" },
];

// Only these statuses are available for manual selection in the dropdown
// Other statuses are triggered automatically by workflow buttons
const manualStatusOptions = statusOptions.filter((s) =>
  ["pending", "hold", "cancelled", "returned"].includes(s.value)
);

const tabStatuses = [
  "all",
  "incomplete",
  "pending",
  "hold",
  "confirmed",
  "packaging",
  "shipped",
  "delivered",
  "partial_delivered",
  "cancelled",
  "returned",
];



export default function AdminOrders() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (typeof window === "undefined") return "pending";
    return localStorage.getItem("admin-orders-tab") || "pending";
  });
  const [mobileStatusFilters, setMobileStatusFilters] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(() => {
    if (typeof window === "undefined") return 50;
    const stored = parseInt(localStorage.getItem("admin-orders-page-size") || "50", 10);
    return [50, 100, 150, 200].includes(stored) ? stored : 50;
  });
  const [sourceFilter, setSourceFilter] = useState<"all" | "web" | "manual">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedConsignment, setCopiedConsignment] = useState(false);
  const [showWebhookTimeline, setShowWebhookTimeline] = useState(false);

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [customerHistory, setCustomerHistory] = useState<Order[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [trackingCode, setTrackingCode] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState("");
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Delete order state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk selection state
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Bulk delete state
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Edit mode state
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [editForm, setEditForm] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    shipping_address: {} as Record<string, string>,
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Edit total amount state
  const [isEditingTotal, setIsEditingTotal] = useState(false);
  const [editableTotal, setEditableTotal] = useState<number>(0);
  const [isSavingTotal, setIsSavingTotal] = useState(false);

  // Payment status update state
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);

  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const { createNotification } = useAdminNotifications();
  const { isSuperAdmin } = useUserRole();

  // Status history hook for recording changes
  const { recordStatusChange } = useOrderStatusHistory(selectedOrder?.id || null);

  // Auto-warm fraud cache for recent orders on page load (rate-limited)
  useWarmFraudCache();

  // Batch fetch fraud cache for all order phone numbers
  const allPhoneNumbers = orders.map((o) => o.customer_phone);
  const { getCacheForPhone } = useFraudCache(allPhoneNumbers);

  // Order locking hook
  const {
    isLocked,
    isLockedByMe,
    lockedByName,
    lockExpiration,
    acquireLock,
    releaseLock,
  } = useOrderLock({
    orderId: selectedOrder?.id || null,
    onLockLost: () => {
      toast({
        title: "Lock Lost",
        description: "Another user has taken over this order",
        variant: "destructive",
      });
    },
  });

  // Determine if editing should be disabled (locked by someone else, OR sent to Steadfast — courier now owns updates)
  const isSentToCourier = !!selectedOrder?.courier_consignment_id;
  const isEditingDisabled = (isLocked && !isLockedByMe) || isSentToCourier;

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    setSelectedOrderIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(orderId);
      } else {
        newSet.delete(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean, ordersToSelect: Order[]) => {
    if (checked) {
      setSelectedOrderIds(new Set(ordersToSelect.map((o) => o.id)));
    } else {
      setSelectedOrderIds(new Set());
    }
  };

  const fetchOrders = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) throw new Error(`Authentication error: ${sessionError.message}`);
      if (!session) throw new Error("No active session found. Please log in again.");
      
      // Exclude POS orders - they should only appear in POS Sales History
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, user_id, customer_id, source, items, total_amount, delivery_fee, payment_status, payment_method, status, tracking_code, courier_consignment_id, courier_tracking_code, courier_status, courier_cod_collected, courier_delivery_charge, courier_last_synced_at, customer_name, customer_email, customer_phone, shipping_address, created_at, updated_at, locked_by, locked_by_name, lock_expiration, outlet_id")
        .neq("source", "pos")
        .order("created_at", { ascending: false });

      if (error) throw new Error(`Database error: ${error.message}`);
      
      setOrders((data as unknown as Order[]) || []);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    
    fetchOrders();

    // Real-time subscription for order updates
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          // Prepend new order to the list immediately (exclude POS orders)
          const newOrder = payload.new as Order;
          
          // Skip POS orders - they should only appear in POS Sales History
          if (newOrder.source === "pos") return;
          
          setOrders((prev) => {
            // Avoid duplicates
            if (prev.some((o) => o.id === newOrder.id)) return prev;
            return [newOrder, ...prev];
          });
          
          // Show toast notification for new orders
          toast({
            title: "🆕 New Order Received!",
            description: `Order from ${newOrder.customer_name || "Guest"} - ৳${newOrder.total_amount?.toLocaleString()}`,
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        (payload) => {
          // Update the order in place
          const updatedOrder = payload.new as Order;
          setOrders((prev) =>
            prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
          );
          
          // Also update selectedOrder if it's the same order
          setSelectedOrder((prev) => 
            prev?.id === updatedOrder.id ? updatedOrder : prev
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        (payload) => {
          // Remove deleted order from list
          const deletedId = payload.old.id;
          setOrders((prev) => prev.filter((o) => o.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const handleViewDetails = useCallback(async (order: Order) => {
    setSelectedOrder(order);
    setPendingStatus(null);
    setStatusNote("");
    setTrackingCode(order.tracking_code || "");
    setIsEditingCustomer(false);
    setIsEditingTotal(false);
    setEditableTotal(order.total_amount);
    setLoadingItems(true);

    console.log("Admin OrderDetails modal: selected order", order);

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_id, product_name, product_image, qty, quantity, price, unit_price, selected_variation, products ( id, title, images )")
        .eq("order_id", order.id);

      if (error) throw error;
      
      console.log("Fetched order items for order:", order.id, data);
      
      // Normalize the data - use qty/price as fallback for quantity/unit_price
      const normalizedItems: OrderItem[] = (data || []).map((item: any) => ({
        // products join is best-effort (product_id can be null for manual/custom items)
        id: item.id,
        product_id: item.product_id,
        product_name: item.product_name || item.products?.title || "Unknown Product",
        product_image:
          item.product_image ||
          (Array.isArray(item.products?.images) ? item.products.images?.[0] ?? null : null),
        quantity: item.quantity ?? item.qty ?? 1,
        unit_price: item.unit_price ?? item.price ?? 0,
        selected_variation: item.selected_variation,
      }));

      // Fallback: Some historical orders may only have the JSON 'items' field
      // (or were created during a previous checkout bug). If we have items there,
      // render them so the admin can still see line items.
      if (normalizedItems.length === 0 && Array.isArray((order as any)?.items) && (order as any).items.length > 0) {
        const fallbackItems: OrderItem[] = (order as any).items.map((it: any, idx: number) => ({
          id: `fallback-${order.id}-${idx}`,
          product_id: it.product_id ?? it.id ?? null,
          product_name: it.product_name ?? it.title ?? "Unknown Product",
          product_image: it.product_image ?? it.image ?? null,
          quantity: it.quantity ?? it.qty ?? 1,
          unit_price: it.unit_price ?? it.price ?? 0,
          selected_variation:
            it.selected_variation ??
            it.variation ??
            ((it.size || it.color) ? { size: it.size ?? undefined, color: it.color ?? undefined } : null),
        }));

        console.log("Order items fallback from orders.items:", (order as any).items);
        setOrderItems(fallbackItems);
      } else {
        setOrderItems(normalizedItems);
      }
    } catch (error) {
      console.error("Error fetching order items:", error);
      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  }, []);

  // Acquire lock when opening order details
  useEffect(() => {
    if (selectedOrder) {
      acquireLock();
    }
  }, [selectedOrder?.id]);

  // Handle closing the order dialog
  const handleCloseOrderDialog = useCallback(async () => {
    if (selectedOrder && isLockedByMe) {
      await releaseLock();
    }
    setSelectedOrder(null);
  }, [selectedOrder, isLockedByMe, releaseLock]);

  // Handle delete order
  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from("orders")
        .delete()
        .eq("id", orderToDelete.id);

      if (error) throw error;

      // Log activity for order deletion
      await logActivity({
        actionType: "order_deleted",
        entityType: "order",
        entityId: orderToDelete.id,
        details: { customer_name: orderToDelete.customer_name, total_amount: orderToDelete.total_amount },
      });

      // Remove from local state immediately
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id));
      
      // Close the modal if it's open for this order
      if (selectedOrder?.id === orderToDelete.id) {
        setSelectedOrder(null);
      }

      toast({
        title: "Order Deleted",
        description: `Order #${orderToDelete.order_number || orderToDelete.id.slice(0, 8).toUpperCase()} has been permanently deleted.`,
      });
    } catch (error) {
      console.error("Error deleting order:", error);
      toast({
        title: "Delete Failed",
        description: error instanceof Error ? error.message : "Failed to delete order",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmOpen(false);
      setOrderToDelete(null);
    }
  };

  const openDeleteConfirm = (order: Order) => {
    setOrderToDelete(order);
    setDeleteConfirmOpen(true);
  };

  // Handle bulk delete orders (super_admin only)
  const handleBulkDeleteOrders = async () => {
    if (selectedOrderIds.size === 0) return;
    
    setIsBulkDeleting(true);

    const results: { success: number; failed: number; errors: string[] } = {
      success: 0,
      failed: 0,
      errors: [],
    };

    try {
      // Process deletions
      for (const orderId of selectedOrderIds) {
        try {
          const { error } = await supabase
            .from("orders")
            .delete()
            .eq("id", orderId);

          if (error) {
            results.failed++;
            results.errors.push(`Order ${orderId.slice(0, 8)}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (err) {
          results.failed++;
          results.errors.push(`Order ${orderId.slice(0, 8)}: ${err instanceof Error ? err.message : "Unknown error"}`);
        }
      }

      // Update local state - remove all successfully deleted orders
      if (results.success > 0) {
        const deletedIds = new Set<string>();
        // Re-check which ones were actually deleted (those without errors)
        for (const orderId of selectedOrderIds) {
          if (!results.errors.some(e => e.includes(orderId.slice(0, 8)))) {
            deletedIds.add(orderId);
          }
        }
        setOrders((prev) => prev.filter((o) => !deletedIds.has(o.id)));
      }

      // Show results
      if (results.success > 0 && results.failed === 0) {
        toast({
          title: "Bulk Delete Complete",
          description: `Successfully deleted ${results.success} order${results.success !== 1 ? "s" : ""}`,
        });
      } else if (results.success > 0 && results.failed > 0) {
        toast({
          title: "Partial Success",
          description: `Deleted ${results.success} orders, ${results.failed} failed`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Bulk Delete Failed",
          description: `Failed to delete ${results.failed} order${results.failed !== 1 ? "s" : ""}`,
          variant: "destructive",
        });
      }

      // Clear selection
      setSelectedOrderIds(new Set());
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete orders",
        variant: "destructive",
      });
    } finally {
      setIsBulkDeleting(false);
      setBulkDeleteConfirmOpen(false);
    }
  };

  const handleViewCustomerHistory = async (userId: string) => {
    setSelectedCustomerId(userId);
    setHistoryOpen(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCustomerHistory((data as unknown as Order[]) || []);
    } catch (error) {
      console.error("Error fetching customer history:", error);
      setCustomerHistory([]);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string, note?: string | null) => {
    setUpdatingStatus(true);

    const order = orders.find((o) => o.id === orderId);
    const oldStatus = order?.status || "unknown";

    // Guard: once sent to Steadfast, status is owned by the courier webhook/API only.
    if (order?.courier_consignment_id) {
      toast({
        title: "Courier-managed order",
        description: "এই অর্ডারটি Steadfast-এ পাঠানো হয়েছে। এখন থেকে স্ট্যাটাস শুধুমাত্র Steadfast এর Webhook/API থেকে আপডেট হবে, ম্যানুয়ালি পরিবর্তন করা যাবে না।",
        variant: "destructive",
      });
      setUpdatingStatus(false);
      return;
    }

    // Guard: moving from incomplete/pending into a fulfillment status requires an assigned outlet
    // so the order shows up in the correct fulfillment-centre filter and stock is deducted from the right branch.
    const fulfillmentStatuses = ["confirmed", "processing", "packaging", "ready_for_delivery", "shipped"];
    if (
      fulfillmentStatuses.includes(newStatus) &&
      (oldStatus === "incomplete" || oldStatus === "pending") &&
      !order?.outlet_id
    ) {
      toast({
        title: "Fulfillment outlet প্রয়োজন",
        description: "এই অর্ডারটি কনফার্ম করার আগে উপরের 'Fulfillment Source' সেকশন থেকে একটি আউটলেট সিলেক্ট করে 'Confirm & Assign to Outlet' চাপুন।",
        variant: "destructive",
      });
      setUpdatingStatus(false);
      return;
    }



    try {
      const updateData: Record<string, string | null> = { 
        status: newStatus,
        // Release lock on status change
        locked_by: null,
        locked_by_name: null,
        lock_expiration: null,
      };
      if (newStatus === "shipped" && trackingCode) {
        updateData.tracking_code = trackingCode;
      }

      const { error } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (error) throw error;

      // Log activity
      const actionType = newStatus === "confirmed" 
        ? "order_confirmed" 
        : newStatus === "cancelled" 
          ? "order_cancelled" 
          : "order_status_changed";
      
      await logActivity({
        actionType,
        entityType: "order",
        entityId: orderId,
        details: { old_status: oldStatus, new_status: newStatus },
      });

      // Record status change in history table
      await recordStatusChange(oldStatus, newStatus, note);

      // Create notification for critical actions (cancellations)
      if (newStatus === "cancelled" && order) {
        await createNotification({
          type: "order_cancelled",
          title: "Order Cancelled",
          message: `Order #${orderId.slice(0, 8).toUpperCase()} (${order.customer_name || "Guest"}) was cancelled. Value: ৳${order.total_amount.toLocaleString()}`,
          entityType: "order",
          entityId: orderId,
          severity: "critical",
        });
      }

      // Send email notification via edge function
      try {
        if (order) {
          await supabase.functions.invoke("send-order-email", {
            body: {
              orderId,
              status: newStatus,
              trackingCode: newStatus === "shipped" ? trackingCode : undefined,
              customerEmail: order.customer_email,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              totalAmount: order.total_amount,
            },
          });
        }
      } catch (emailError) {
        console.error("Error sending email:", emailError);
      }

      toast({
        title: "Status Updated",
        description: `Order status changed to ${newStatus}`,
      });

      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, ...updateData } : o))
      );
      
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus, ...updateData });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartEditCustomer = () => {
    if (!selectedOrder) return;

    // Parse shipping_address if it's a JSON string
    let addr: Record<string, string> = {};
    const raw = selectedOrder.shipping_address as any;
    if (raw) {
      if (typeof raw === "string") {
        try {
          addr = JSON.parse(raw);
        } catch {
          addr = { street_address: raw };
        }
      } else if (typeof raw === "object") {
        addr = { ...raw };
      }
    }

    // Backward compat: consolidate legacy fields into street_address if new field missing
    if (!addr.street_address) {
      const legacyStreet = [addr.house_no && `House ${addr.house_no}`, addr.road_no && `Road ${addr.road_no}`, addr.road, addr.village, addr.area]
        .filter((x) => x && String(x).trim() !== "")
        .join(", ");
      if (legacyStreet) addr.street_address = legacyStreet;
    }
    if (!addr.district && addr.zilla) addr.district = addr.zilla;
    if (!addr.thana && addr.upazilla) addr.thana = addr.upazilla;

    setEditForm({
      customer_name: selectedOrder.customer_name || "",
      customer_phone: selectedOrder.customer_phone || "",
      customer_email: selectedOrder.customer_email || "",
      shipping_address: addr,
    });
    setIsEditingCustomer(true);
  };

  const handleCancelEdit = () => {
    setIsEditingCustomer(false);
  };

  const handleSaveCustomerEdit = async () => {
    if (!selectedOrder) return;
    setIsSavingEdit(true);

    try {
      const { error } = await supabase
        .from("orders")
        .update({
          customer_name: editForm.customer_name,
          customer_phone: editForm.customer_phone,
          customer_email: editForm.customer_email,
          shipping_address: typeof editForm.shipping_address === 'object' ? JSON.stringify(editForm.shipping_address) : editForm.shipping_address,
        } as any)
        .eq("id", selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Customer Info Updated",
        description: "Order details have been saved",
      });

      // Update local state
      const updatedOrder = {
        ...selectedOrder,
        customer_name: editForm.customer_name,
        customer_phone: editForm.customer_phone,
        customer_email: editForm.customer_email,
        shipping_address: editForm.shipping_address,
      };
      setSelectedOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o))
      );
      setIsEditingCustomer(false);
    } catch (error) {
      console.error("Error updating customer info:", error);
      toast({
        title: "Error",
        description: "Failed to update customer information",
        variant: "destructive",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleSaveTotalAmount = async () => {
    if (!selectedOrder) return;
    setIsSavingTotal(true);

    const oldAmount = selectedOrder.total_amount;

    try {
      const { error } = await supabase
        .from("orders")
        .update({ 
          total_amount: editableTotal,
          // Release lock on edit
          locked_by: null,
          locked_by_name: null,
          lock_expiration: null,
        })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Log activity
      await logActivity({
        actionType: "order_amount_edited",
        entityType: "order",
        entityId: selectedOrder.id,
        details: { old_amount: oldAmount, new_amount: editableTotal },
      });

      toast({
        title: "Total Updated",
        description: `Order total changed to ${formatCurrency(editableTotal)}`,
      });

      // Update local state
      const updatedOrder = { ...selectedOrder, total_amount: editableTotal };
      setSelectedOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o))
      );
      setIsEditingTotal(false);
    } catch (error) {
      console.error("Error updating total amount:", error);
      toast({
        title: "Error",
        description: "Failed to update order total",
        variant: "destructive",
      });
    } finally {
      setIsSavingTotal(false);
    }
  };

  const handleUpdatePaymentStatus = async (newStatus: string) => {
    if (!selectedOrder) return;
    setIsUpdatingPaymentStatus(true);

    const oldPaymentStatus = selectedOrder.payment_status || "pending";

    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: newStatus })
        .eq("id", selectedOrder.id);

      if (error) throw error;

      // Log activity for payment marked as paid
      if (newStatus === "paid") {
        await logActivity({
          actionType: "payment_marked_paid",
          entityType: "order",
          entityId: selectedOrder.id,
          details: { old_status: oldPaymentStatus, new_status: newStatus },
        });
      }

      toast({
        title: "Payment Status Updated",
        description: `Payment status changed to ${newStatus}`,
      });

      // Update local state
      const updatedOrder = { ...selectedOrder, payment_status: newStatus };
      setSelectedOrder(updatedOrder);
      setOrders((prev) =>
        prev.map((o) => (o.id === selectedOrder.id ? updatedOrder : o))
      );
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPaymentStatus(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    // Mobile filters take priority when set, otherwise use desktop tab
    let matchesTab: boolean;
    if (mobileStatusFilters.length > 0) {
      matchesTab = mobileStatusFilters.includes(order.status || "");
    } else {
      matchesTab = activeTab === "all" || order.status === activeTab;
    }

    const src = order.source || "web";
    const matchesSource =
      sourceFilter === "all" ||
      (sourceFilter === "manual" ? src === "manual" : src !== "manual");

    const matchesSearch =
      !searchTerm ||
      order.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_phone?.includes(searchTerm) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);

    return matchesTab && matchesSource && matchesSearch;
  });

  // Persist tab & page size
  useEffect(() => {
    localStorage.setItem("admin-orders-tab", activeTab);
  }, [activeTab]);
  useEffect(() => {
    localStorage.setItem("admin-orders-page-size", String(pageSize));
  }, [pageSize]);

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, sourceFilter, pageSize, mobileStatusFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Orders eligible for bulk send-to-courier (kept for the send action logic)
  const eligibleForBulkSend = paginatedOrders.filter(
    (order) => !order.courier_consignment_id && order.status !== "cancelled" && order.status !== "delivered"
  );
  // "Select all" should target every visible order on the current page,
  // including manual orders and any status — bulk delete/edit needs full coverage.
  const selectableOrders = paginatedOrders;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    return (
      statusOptions.find((s) => s.value === status)?.color ||
      "bg-gray-500/10 text-gray-600"
    );
  };

  const formatAddress = (address: Record<string, string> | string | null) => {
    if (!address) return "No address provided";
    
    // Parse JSON string if needed
    let addressObj: Record<string, string>;
    if (typeof address === "string") {
      try {
        addressObj = JSON.parse(address);
      } catch {
        // If it's a plain string (not JSON), return it directly
        return address || "No address provided";
      }
    } else {
      addressObj = address;
    }
    
    // Filter out empty values and build formatted address
    const parts = [
      addressObj.street_address,
      addressObj.house_no && `House: ${addressObj.house_no}`,
      addressObj.road_no && `Road: ${addressObj.road_no}`,
      addressObj.road,
      addressObj.village,
      addressObj.area,
      addressObj.thana || addressObj.upazilla,
      addressObj.district || addressObj.zilla,
      addressObj.post_office && `P.O: ${addressObj.post_office}`,
    ].filter((part) => part && String(part).trim() !== "");
    
    return parts.join(", ") || "No address provided";
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Mobile Header - App Style */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Orders</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="h-10 w-10"
              >
                <Search className="h-5 w-5" />
              </Button>


              <OrderStatusFilterDrawer
                statuses={tabStatuses
                  .filter((s) => s !== "all")
                  .map((status) => ({
                    value: status,
                    label: status.replace("_", " "),
                    color: getStatusColor(status),
                    count: orders.filter((o) => o.status === status).length,
                  }))}
                selectedStatuses={mobileStatusFilters}
                onApplyFilters={(statuses) => {
                  setMobileStatusFilters(statuses);
                  if (statuses.length > 0) {
                    setActiveTab("all");
                  }
                }}
                totalOrders={orders.length}
                trigger={
                  <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                    <Filter className="h-5 w-5" />
                    {mobileStatusFilters.length > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {mobileStatusFilters.length}
                      </span>
                    )}
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setManualOrderOpen(true)}
                className="h-10 w-10"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>
          
          {/* Mobile Search - Expandable */}
          {mobileSearchOpen && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          )}

          {/* Mobile Source Filter */}
          <div className="mt-3">
            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Order Management</h1>
            <p className="text-muted-foreground">Manage and track all customer orders</p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Button variant="brand" onClick={() => setManualOrderOpen(true)}>
              + Create Manual Order
            </Button>

            <Select value={sourceFilter} onValueChange={(v) => setSourceFilter(v as any)}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or order ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Desktop Tabs - Hidden on mobile */}
        <Tabs value={activeTab} onValueChange={(val) => {
          setActiveTab(val);
          // Clear mobile filters when using desktop tabs
          setMobileStatusFilters([]);
        }}>
          <div className="hidden w-full overflow-x-auto md:block [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
            <TabsList className="inline-flex w-max">
              {tabStatuses.map((status) => (
                <TabsTrigger key={status} value={status} className="capitalize">
                  {status === "all" ? "All" : status.replace("_", " ")}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {status === "all"
                      ? orders.length
                      : orders.filter((o) => o.status === status).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Mobile Active Filters Display */}
          {mobileStatusFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 md:hidden">
              <span className="text-sm text-muted-foreground">Filtering:</span>
              {mobileStatusFilters.map((status) => (
                <Badge
                  key={status}
                  variant="outline"
                  className={cn("capitalize", getStatusColor(status))}
                >
                  {status.replace("_", " ")}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileStatusFilters([])}
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Clear all
              </Button>
            </div>
          )}

          <TabsContent value={activeTab} className="mt-4">
            {/* Bulk Action Bar */}
            {selectedOrderIds.size > 0 && (
              <Card className="mb-4 border-primary/30 bg-primary/5">
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={selectedOrderIds.size === selectableOrders.length && selectableOrders.length > 0}
                      onCheckedChange={(checked) => handleSelectAll(!!checked, selectableOrders)}
                    />
                    <span className="font-medium">
                      {selectedOrderIds.size} order{selectedOrderIds.size !== 1 ? "s" : ""} selected
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isSuperAdmin && (
                      <Button
                        variant="destructive"
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                        disabled={isBulkDeleting}
                        className="gap-2"
                      >
                        {isBulkDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        {isBulkDeleting
                          ? "Deleting..."
                          : `Delete ${selectedOrderIds.size}`}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border/50">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No orders found</p>
                  </div>
                ) : (
                  <>
                    {/* Mobile Card View */}
                    <OrderMobileList
                      orders={paginatedOrders}
                      selectedOrderIds={selectedOrderIds}
                      isSuperAdmin={isSuperAdmin}
                      getCacheForPhone={getCacheForPhone}
                      onSelectOrder={handleSelectOrder}
                      onViewDetails={handleViewDetails}
                      onViewCustomerHistory={handleViewCustomerHistory}
                      onDelete={openDeleteConfirm}
                      getStatusColor={getStatusColor}
                      formatCurrency={formatCurrency}
                    />

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <Table className="table-fixed w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[5%]">
                              <Checkbox
                                checked={
                                  selectableOrders.length > 0 &&
                                  selectedOrderIds.size === selectableOrders.length
                                }
                                onCheckedChange={(checked) => handleSelectAll(!!checked, selectableOrders)}
                                aria-label="Select all eligible orders"
                              />
                            </TableHead>
                            <TableHead className="w-[15%]">Date</TableHead>
                            <TableHead className="w-[25%]">Customer</TableHead>
                            <TableHead className="w-[12%]">Total</TableHead>
                            <TableHead className="w-[15%] text-center">Status</TableHead>
                            <TableHead className="w-[15%] text-center">Processing</TableHead>
                            <TableHead className="w-[13%] text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paginatedOrders.map((order) => {
                            const isEligibleForBulk =
                              !order.courier_consignment_id &&
                              order.status !== "cancelled" &&
                              order.status !== "delivered";
                            
                            // Check if order is currently locked
                            const isOrderLocked = order.locked_by && 
                              order.lock_expiration && 
                              new Date(order.lock_expiration) > new Date();
                            
                            return (
                            <TableRow key={order.id} className={isOrderLocked ? "bg-amber-500/5" : ""}>
                              <TableCell>
                                {isEligibleForBulk ? (
                                  <Checkbox
                                    checked={selectedOrderIds.has(order.id)}
                                    onCheckedChange={(checked) =>
                                      handleSelectOrder(order.id, !!checked)
                                    }
                                    aria-label={`Select order ${order.id}`}
                                  />
                                ) : (
                                  <div className="w-4" />
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-col">
                                  <span className="text-sm text-foreground whitespace-nowrap">
                                    {format(new Date(order.created_at), "MMM dd, yyyy")}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(new Date(order.created_at), "hh:mm a")}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">
                                    {order.customer_name || "Guest"}
                                  </span>
                                  {!order.user_id && (
                                    <Badge variant="outline" className="text-xs">Guest</Badge>
                                  )}
                                  <InlineFraudBadge data={getCacheForPhone(order.customer_phone)} compact />
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-primary">
                                {formatCurrency(order.total_amount)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge
                                  variant="outline"
                                  className={getStatusColor(order.status)}
                                >
                                  {order.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                {isOrderLocked ? (
                                  <div className="flex items-center justify-center gap-1.5">
                                    <Lock className="h-3.5 w-3.5 text-amber-500" />
                                    <span className="text-xs text-amber-600 font-medium truncate max-w-[80px]" title={order.locked_by_name || undefined}>
                                      {order.locked_by_name?.split(" ")[0] || "Someone"}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleViewDetails(order)}
                                    title="View Details"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {order.user_id && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleViewCustomerHistory(order.user_id as string)}
                                      title="Customer History"
                                    >
                                      <History className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {isSuperAdmin && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => openDeleteConfirm(order)}
                                      title="Delete Order"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Pagination Controls */}
                    <div className="flex flex-col gap-3 border-t border-border/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Rows per page:</span>
                        <Select
                          value={String(pageSize)}
                          onValueChange={(v) => setPageSize(parseInt(v, 10))}
                        >
                          <SelectTrigger className="h-8 w-[80px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[50, 100, 150, 200].map((n) => (
                              <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <span className="ml-2">
                          {(safePage - 1) * pageSize + 1}-
                          {Math.min(safePage * pageSize, filteredOrders.length)} of {filteredOrders.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={safePage <= 1}
                        >
                          Previous
                        </Button>
                        <span className="text-sm font-medium">
                          Page {safePage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                          disabled={safePage >= totalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Order Details Dialog - Floating card on mobile */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && handleCloseOrderDialog()}>
        <DialogContent className="w-[92vw] max-w-2xl max-h-[85vh] overflow-y-auto p-4 md:p-6 rounded-xl">
          {/* Mobile Header - Scrolls with content (NOT sticky) */}
          <div className="md:hidden">
            <div className="flex items-start justify-between gap-2 pr-8">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-sm truncate">
                    #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8).toUpperCase()}
                  </span>
                  {isLockedByMe && (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] px-1.5 py-0">
                      <Lock className="h-2.5 w-2.5 mr-0.5" />
                      Editing
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedOrder && format(new Date(selectedOrder.created_at), "MMM dd, yyyy • h:mm a")}
                </p>
              </div>
              {selectedOrder && (
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-8 px-2.5 text-xs shrink-0"
                  onClick={() => {
                    if (selectedOrder) {
                      generateInvoicePDF(
                        {
                          ...selectedOrder,
                          status: selectedOrder.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled",
                        },
                        orderItems.map(item => ({
                          ...item,
                          quantity: item.quantity || 1,
                          unit_price: item.unit_price || 0,
                        }))
                      );
                    }
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
            <Separator className="mt-3 mb-4" />
          </div>

          {/* Desktop Header - Hidden on mobile */}
          <DialogHeader className="hidden md:block">
            <div className="flex items-start justify-between gap-3">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Order #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8).toUpperCase()}
                  {isLockedByMe && (
                    <Badge variant="outline" className="ml-2 bg-green-500/10 text-green-600 border-green-500/30">
                      <Lock className="h-3 w-3 mr-1" />
                      Editing
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  {selectedOrder &&
                    format(new Date(selectedOrder.created_at), "MMMM dd, yyyy 'at' h:mm a")}
                </DialogDescription>
              </div>
              {selectedOrder && (
                <div className="print-hidden">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (selectedOrder) {
                        generateInvoicePDF(
                          {
                            ...selectedOrder,
                            status: selectedOrder.status as "pending" | "processing" | "shipped" | "delivered" | "cancelled",
                          },
                          orderItems.map(item => ({
                            ...item,
                            quantity: item.quantity || 1,
                            unit_price: item.unit_price || 0,
                          }))
                        );
                      }
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Invoice
                  </Button>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 md:space-y-6">
              {/* Lock Banner - Show when locked by someone else */}
              {isEditingDisabled && lockedByName && (
                <OrderLockBanner lockedByName={lockedByName} lockExpiration={lockExpiration} />
              )}

              {/* Fraud Check - Auto-triggered on modal open */}
              <CustomerFraudCheck phone={selectedOrder.customer_phone} />

              {/* Fulfillment Source - Outlet Assignment */}
              <OrderFulfillmentSection
                orderId={selectedOrder.id}
                currentOutletId={selectedOrder.outlet_id}
                currentStatus={selectedOrder.status}
                orderItems={orderItems.map(item => ({
                  product_id: item.product_id,
                  product_name: item.product_name,
                  quantity: item.quantity,
                  selected_variation: item.selected_variation,
                }))}
                disabled={isEditingDisabled}
                onStatusChanged={async (info) => {
                  if (info) {
                    await recordStatusChange(
                      info.oldStatus,
                      info.newStatus,
                      `Assigned to ${info.outletName}`
                    );
                  }
                  // Refresh order data
                  handleViewDetails(selectedOrder);
                  fetchOrders();
                }}
              />

              {/* Customer Info */}
              <div className="rounded-lg border p-3 md:p-4">
                <div className={cn(
                  "mb-3",
                  isEditingCustomer 
                    ? "flex flex-col gap-2 md:flex-row md:items-center md:justify-between" 
                    : "flex items-center justify-between"
                )}>
                  <h4 className="font-semibold">Customer & Shipping</h4>
                  {!isEditingCustomer ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleStartEditCustomer}
                      disabled={isEditingDisabled}
                      className="h-8 w-8"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : (
                    <div className="flex gap-2 justify-end w-full md:w-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCancelEdit}
                        disabled={isSavingEdit}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSaveCustomerEdit}
                        disabled={isSavingEdit}
                      >
                        {isSavingEdit ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Check className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                {isEditingCustomer ? (
                  <div className="grid gap-3 md:gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs md:text-sm">Name</Label>
                      <Input
                        value={editForm.customer_name}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, customer_name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs md:text-sm">Phone</Label>
                      <BDPhoneInput
                        value={editForm.customer_phone}
                        onChange={(val) =>
                          setEditForm((prev) => ({ ...prev, customer_phone: val }))
                        }
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs md:text-sm">Email</Label>
                      <Input
                        type="email"
                        value={editForm.customer_email}
                        onChange={(e) =>
                          setEditForm((prev) => ({ ...prev, customer_email: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-3 md:col-span-2">
                      <Label className="text-xs md:text-sm font-semibold">Shipping Address</Label>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Full Address *</Label>
                        <Textarea
                          placeholder="আপনার সম্পূর্ণ ঠিকানা (House, Road, Village/Area)"
                          value={editForm.shipping_address.street_address || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              shipping_address: { ...prev.shipping_address, street_address: e.target.value },
                            }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                      <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">District *</Label>
                          <LocationSelect
                            value={editForm.shipping_address.district || ""}
                            onChange={(val) =>
                              setEditForm((prev) => ({
                                ...prev,
                                shipping_address: {
                                  ...prev.shipping_address,
                                  district: val,
                                  thana: (BD_DISTRICTS[val] || []).includes(prev.shipping_address.thana || "")
                                    ? prev.shipping_address.thana
                                    : "",
                                },
                              }))
                            }
                            options={BD_DISTRICT_NAMES}
                            placeholder="জেলা নির্বাচন করুন"
                            searchPlaceholder="জেলা খুঁজুন…"
                            emptyMessage="কোনো জেলা পাওয়া যায়নি"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Thana / Upazilla *</Label>
                          <LocationSelect
                            value={editForm.shipping_address.thana || ""}
                            onChange={(val) =>
                              setEditForm((prev) => ({
                                ...prev,
                                shipping_address: { ...prev.shipping_address, thana: val },
                              }))
                            }
                            options={
                              editForm.shipping_address.district
                                ? BD_DISTRICTS[editForm.shipping_address.district] || []
                                : []
                            }
                            placeholder="থানা / উপজেলা নির্বাচন করুন"
                            searchPlaceholder="থানা খুঁজুন…"
                            emptyMessage="কোনো থানা পাওয়া যায়নি"
                            disabled={!editForm.shipping_address.district}
                            disabledReason="আগে জেলা নির্বাচন করুন"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">Customer Note (Optional)</Label>
                        <Textarea
                          placeholder="Special delivery instructions"
                          value={editForm.shipping_address.notes || ""}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              shipping_address: { ...prev.shipping_address, notes: e.target.value },
                            }))
                          }
                          rows={2}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Customer - stacked on mobile */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Customer</p>
                      <p className="font-medium text-sm">{selectedOrder.customer_name || "N/A"}</p>
                      <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="break-all">{selectedOrder.customer_email || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 shrink-0" />
                          {selectedOrder.customer_phone || "N/A"}
                        </div>
                      </div>
                    </div>
                    {/* Shipping Address - stacked below customer on mobile */}
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Shipping Address</p>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                        <span className="break-words">{formatAddress(selectedOrder.shipping_address)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Status Update */}
              <div className="space-y-3">
                <h4 className="font-semibold">Update Status</h4>
                {(() => {
                  const currentStatus = selectedOrder.status;
                  const isDelivered = currentStatus === "delivered";
                  const isPartialDelivered = currentStatus === "partial_delivered";
                  const isFinalDeliveryStatus = isDelivered || isPartialDelivered;
                  const effectivePending = pendingStatus ?? currentStatus;
                  const isChanged = effectivePending !== currentStatus;
                  const needsTracking = effectivePending === "shipped";
                  const canSubmit =
                    isChanged &&
                    !updatingStatus &&
                    !isEditingDisabled &&
                    !isFinalDeliveryStatus &&
                    (!needsTracking || trackingCode.trim().length > 0);

                  if (isFinalDeliveryStatus) {
                    const label = isDelivered ? "Delivered" : "Partially Delivered";
                    const chipCls = isDelivered
                      ? "border-green-500/30 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-lime-500/30 bg-lime-500/10 text-lime-700 dark:text-lime-400";
                    const dotCls = isDelivered ? "bg-green-500" : "bg-lime-500";
                    return (
                      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 ${chipCls}`}>
                        <div className={`h-2 w-2 rounded-full ${dotCls}`} />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          Status locked — cannot be changed
                        </span>
                      </div>
                    );
                  }



                  return (
                    <div className="space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <Select
                          value={effectivePending}
                          onValueChange={(value) => setPendingStatus(value)}
                          disabled={updatingStatus || isEditingDisabled}
                        >
                          <SelectTrigger className="w-full sm:w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {manualStatusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {needsTracking && (
                          <Input
                            placeholder="Enter tracking code..."
                            value={trackingCode}
                            onChange={(e) => setTrackingCode(e.target.value)}
                            className="flex-1"
                          />
                        )}
                      </div>

                      {isChanged && (
                        <div
                          className={cn(
                            "space-y-2 rounded-lg border p-3",
                            effectivePending === "hold" &&
                              "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20",
                            effectivePending === "cancelled" &&
                              "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20",
                            effectivePending !== "hold" &&
                              effectivePending !== "cancelled" &&
                              "border-border/60 bg-muted/30"
                          )}
                        >
                          <label
                            className={cn(
                              "text-xs font-medium",
                              effectivePending === "hold" && "text-amber-700 dark:text-amber-400",
                              effectivePending === "cancelled" && "text-rose-700 dark:text-rose-400",
                              effectivePending !== "hold" &&
                                effectivePending !== "cancelled" &&
                                "text-muted-foreground"
                            )}
                          >
                            Note{" "}
                            <span
                              className={cn(
                                effectivePending === "hold" && "text-amber-600/70 dark:text-amber-400/70",
                                effectivePending === "cancelled" && "text-rose-600/70 dark:text-rose-400/70",
                                effectivePending !== "hold" &&
                                  effectivePending !== "cancelled" &&
                                  "text-muted-foreground/70"
                              )}
                            >
                              (optional)
                            </span>
                          </label>
                          <Textarea
                            placeholder="Add a short note about this status change (e.g. reason for hold/cancel)..."
                            value={statusNote}
                            onChange={(e) => setStatusNote(e.target.value)}
                            rows={2}
                            className="resize-none bg-background text-sm"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setPendingStatus(null);
                                setStatusNote("");
                              }}
                              disabled={updatingStatus}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              onClick={async () => {
                                await handleUpdateStatus(
                                  selectedOrder.id,
                                  effectivePending,
                                  statusNote
                                );
                                setPendingStatus(null);
                                setStatusNote("");
                              }}
                              disabled={!canSubmit}
                            >
                              {needsTracking ? (
                                <><Send className="mr-2 h-4 w-4" />Update & Send</>
                              ) : (
                                "Update Status"
                              )}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>


              {/* Courier Info - Read-only display (booking done via POS) */}
              {selectedOrder.courier_consignment_id && (
                <>
                  <Separator />
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Truck className="h-4 w-4 text-green-600" />
                      <h4 className="font-semibold text-green-700">Sent to Steadfast</h4>
                    </div>
                    <p className="text-xs text-green-700/90 mb-3 leading-relaxed">
                      🔒 এই অর্ডারটি Steadfast-এ পাঠানো হয়েছে। স্ট্যাটাস, আউটলেট বা অন্য কোনো ডিটেইল এখান থেকে ম্যানুয়ালি পরিবর্তন করা যাবে না — সব আপডেট Steadfast এর Webhook/API থেকে স্বয়ংক্রিয়ভাবে আসবে।
                    </p>
                    <div className="grid gap-2 text-sm sm:grid-cols-2">
                      <div>
                        <span className="text-muted-foreground">Consignment ID:</span>
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://www.steadfast.com.bd/user/consignment/${selectedOrder.courier_consignment_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono font-medium text-green-700 hover:underline inline-flex items-center gap-1"
                          >
                            {selectedOrder.courier_consignment_id}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(String(selectedOrder.courier_consignment_id));
                              setCopiedConsignment(true);
                              setTimeout(() => setCopiedConsignment(false), 1500);
                            }}
                            className="text-muted-foreground hover:text-green-700 transition-colors"
                            title="Copy Consignment ID"
                          >
                            {copiedConsignment ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {selectedOrder.courier_tracking_code && (
                        <div>
                          <span className="text-muted-foreground">Tracking Code:</span>
                          <p className="font-mono font-medium">{selectedOrder.courier_tracking_code}</p>
                        </div>
                      )}

                      {selectedOrder.courier_status && (
                        <div>
                          <span className="text-muted-foreground">Courier Status:</span>
                          <p className="font-medium capitalize">
                            {selectedOrder.courier_status.replace(/_/g, " ")}
                          </p>
                        </div>
                      )}

                      {selectedOrder.courier_cod_collected != null && (
                        <div>
                          <span className="text-muted-foreground">COD Collected:</span>
                          <p className="font-semibold text-green-700">
                            ৳{selectedOrder.courier_cod_collected}
                            {selectedOrder.courier_status === "partial_delivered" && (
                              <span className="ml-2 text-xs font-normal text-lime-700">(Partial)</span>
                            )}
                          </p>
                        </div>
                      )}

                      {selectedOrder.courier_delivery_charge != null && (
                        <div>
                          <span className="text-muted-foreground">Delivery Charge:</span>
                          <p className="font-medium">৳{selectedOrder.courier_delivery_charge}</p>
                        </div>
                      )}

                      {selectedOrder.courier_last_synced_at && (
                        <div className="sm:col-span-2 text-xs text-muted-foreground">
                          Last synced: {new Date(selectedOrder.courier_last_synced_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowWebhookTimeline(true)}
                        className="w-full sm:w-auto bg-white/60 hover:bg-white border-green-500/40 text-green-800"
                      >
                        <History className="h-4 w-4 mr-2" />
                        View Webhook Payload Timeline
                      </Button>
                    </div>
                  </div>
                </>
              )}


              <Separator />

              {/* Order Items - WooCommerce style */}
              <div>
                <h4 className="mb-2 font-semibold text-sm md:text-base">Order Items</h4>
                {loadingItems ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : orderItems.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    No items found. This order has no stored line items.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 md:gap-3 rounded-lg bg-muted/30 p-2 md:p-3"
                      >
                        {/* Product Image - smaller on mobile */}
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-12 w-12 md:h-16 md:w-16 rounded-md object-cover shrink-0"
                          />
                        ) : (
                          <div className="flex h-12 w-12 md:h-16 md:w-16 items-center justify-center rounded-md bg-muted shrink-0">
                            <Package className="h-5 w-5 md:h-6 md:w-6 text-muted-foreground" />
                          </div>
                        )}
                        
                        {/* Product Info - flex-1 to take remaining space */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-1">
                            <p className="font-medium text-sm leading-tight line-clamp-2">
                              {item.product_name}
                            </p>
                            <EditOrderItemVariantPopover
                              orderItem={item}
                              orderStatus={selectedOrder.status}
                              disabled={isEditingDisabled}
                              onVariantChanged={() => handleViewDetails(selectedOrder)}
                            />
                          </div>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] md:text-xs text-muted-foreground">
                            {item.selected_variation && (
                              <span>
                                {[
                                  item.selected_variation.size && `${item.selected_variation.size}`,
                                  item.selected_variation.color && `${item.selected_variation.color}`,
                                ].filter(Boolean).join(" / ")}
                              </span>
                            )}
                            <span>×{item.quantity}</span>
                          </div>
                        </div>
                        
                        {/* Price - aligned right */}
                        <p className="font-semibold text-sm shrink-0">
                          {formatCurrency(item.quantity * item.unit_price)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <Separator className="my-4" />

                {/* Order Totals with Editable Amount */}
                <div className="space-y-3">
                  {/* Delivery Fee */}
                  {selectedOrder.delivery_fee != null && selectedOrder.delivery_fee > 0 && (
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Delivery Fee</span>
                      <span>{formatCurrency(selectedOrder.delivery_fee)}</span>
                    </div>
                  )}

                  {/* Payment Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Payment Status</span>
                      {/* Auto-collected indicator */}
                      {selectedOrder.status === "delivered" && selectedOrder.payment_status === "paid" && (
                        <Badge 
                          variant="outline" 
                          className="text-[10px] px-1.5 py-0 h-5 bg-green-50 text-green-700 border-green-200"
                        >
                          <Check className="h-3 w-3 mr-1" />
                          COD Collected
                        </Badge>
                      )}
                    </div>
                    <Select
                      value={selectedOrder.payment_status || "pending"}
                      onValueChange={handleUpdatePaymentStatus}
                      disabled={isUpdatingPaymentStatus}
                    >
                      <SelectTrigger className="w-32 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-amber-500" />
                            Unpaid
                          </span>
                        </SelectItem>
                        <SelectItem value="paid">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-green-500" />
                            Paid
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Total Amount - Editable */}
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total</span>
                    {isEditingTotal ? (
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">৳</span>
                          <Input
                            type="number"
                            value={editableTotal}
                            onChange={(e) => setEditableTotal(Number(e.target.value))}
                            className="w-32 pl-7 text-right font-bold"
                            autoFocus
                          />
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleSaveTotalAmount}
                          disabled={isSavingTotal}
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                        >
                          {isSavingTotal ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setIsEditingTotal(false);
                            setEditableTotal(selectedOrder.total_amount);
                          }}
                          disabled={isSavingTotal}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">
                          {formatCurrency(selectedOrder.total_amount)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditableTotal(selectedOrder.total_amount);
                            setIsEditingTotal(true);
                          }}
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* COD Info Hint */}
                  {!selectedOrder.courier_consignment_id && (
                    <p className="text-xs text-muted-foreground">
                      {selectedOrder.payment_status === "paid" 
                        ? "💳 Paid: Courier will collect ৳0 (no COD)"
                        : `💵 Unpaid: Courier will collect ${formatCurrency(selectedOrder.total_amount)} as COD`
                      }
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Internal Notes Section (Staff Only) */}
              <OrderNotesSection orderId={selectedOrder.id} />

              <Separator />

              {/* Status History Timeline */}
              <OrderStatusTimeline orderId={selectedOrder.id} />

              {/* Delete Order Button - Bottom of Modal (Super Admin Only) */}
              {isSuperAdmin && (
                <>
                  <Separator />
                  <div className="flex justify-start pt-2">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => openDeleteConfirm(selectedOrder)}
                      className="gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete Order
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Delete Order Permanently?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete order{" "}
                <strong>#{orderToDelete?.order_number || orderToDelete?.id.slice(0, 8).toUpperCase()}</strong>?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone and will remove the order from the customer's history, 
                including all order items, notes, and status history.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteOrder}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Permanently
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={bulkDeleteConfirmOpen} onOpenChange={setBulkDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete {selectedOrderIds.size} Order{selectedOrderIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to permanently delete <strong>{selectedOrderIds.size}</strong> selected order{selectedOrderIds.size !== 1 ? "s" : ""}?
              </p>
              <p className="text-destructive font-medium">
                This action cannot be undone. All order data including items, notes, and status history will be permanently removed.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteOrders}
              disabled={isBulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting {selectedOrderIds.size}...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete {selectedOrderIds.size} Order{selectedOrderIds.size !== 1 ? "s" : ""}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Customer History Sheet */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              Customer Order History
            </SheetTitle>
            <SheetDescription>
              All previous orders from this customer
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="mt-6 h-[calc(100vh-10rem)]">
            <div className="space-y-4 pr-4">
              {customerHistory.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No order history found
                </p>
              ) : (
                customerHistory.map((order) => (
                  <Card key={order.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-medium">
                            #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "MMM dd, yyyy")}
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge
                            variant="outline"
                            className={getStatusColor(order.status)}
                          >
                            {order.status.replace("_", " ")}
                          </Badge>
                          <p className="mt-1 font-semibold text-primary">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <ManualOrderDialog
        open={manualOrderOpen}
        onOpenChange={setManualOrderOpen}
        onOrderCreated={() => {
          // refresh list immediately
          fetchOrders();
        }}
      />

      <CourierWebhookTimeline
        orderId={selectedOrder?.id ?? null}
        orderNumber={selectedOrder?.order_number ?? null}
        open={showWebhookTimeline}
        onOpenChange={setShowWebhookTimeline}
      />

    </AdminLayout>
  );
}
