import { useState, useEffect, useMemo } from "react";
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import {
  Package,
  MapPin,
  Phone,
  User,
  Check,
  Loader2,
  RefreshCw,
  PackageCheck,
  ChevronDown,
  ChevronUp,
  Truck,
  CalendarIcon,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  useOutletAssignedOrders,
  useOrderItemsForFulfillment,
  useUpdateOrderStatus,
} from "@/hooks/useOutletStock";
import { useOutlets } from "@/hooks/useOutlets";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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

interface POSOnlineOrdersProps {
  outletId: string | null;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Date preset options
type DatePreset = "today" | "yesterday" | "last7days" | "thisWeek" | "custom";

const getDateRangeFromPreset = (preset: DatePreset): { from: Date; to: Date } => {
  const today = new Date();
  
  switch (preset) {
    case "today":
      return { from: startOfDay(today), to: endOfDay(today) };
    case "yesterday":
      const yesterday = subDays(today, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case "last7days":
      return { from: startOfDay(subDays(today, 6)), to: endOfDay(today) };
    case "thisWeek":
      return { from: startOfWeek(today, { weekStartsOn: 0 }), to: endOfWeek(today, { weekStartsOn: 0 }) };
    case "custom":
    default:
      return { from: startOfDay(today), to: endOfDay(today) };
  }
};

const statusLabels: Record<string, string> = {
  confirmed: "Pending Packing",
  packaging: "Being Packed",
  ready_for_delivery: "Ready for Pickup",
  shipped: "Shipped",
};

const statusColors: Record<string, string> = {
  confirmed: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  packaging: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  ready_for_delivery: "bg-green-500/10 text-green-600 border-green-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
};

// Error formatting is now inline in confirmSendToSteadfast for better control

function OrderCard({
  order,
  outletName,
  onStatusUpdate,
  onSendToSteadfast,
  isUpdating,
  isSendingCourier,
}: {
  order: any;
  outletName: string;
  onStatusUpdate: (orderId: string, newStatus: string) => void;
  onSendToSteadfast: (order: any) => void;
  isUpdating: boolean;
  isSendingCourier: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const { data: items = [], isLoading: itemsLoading } = useOrderItemsForFulfillment(
    expanded ? order.id : null
  );

  const parseAddress = (address: string | null): string => {
    if (!address) return "No address";
    try {
      if (address.startsWith("{")) {
        const obj = JSON.parse(address);
        return [obj.house_no, obj.road_no, obj.village, obj.thana, obj.zilla]
          .filter(Boolean)
          .join(", ");
      }
      return address;
    } catch {
      return address;
    }
  };

  const getNextStatus = () => {
    switch (order.status) {
      case "confirmed":
        return "packaging";
      default:
        return null;
    }
  };

  const getActionLabel = () => {
    switch (order.status) {
      case "confirmed":
        return "Start Packing";
      default:
        return null;
    }
  };

  const nextStatus = getNextStatus();
  const actionLabel = getActionLabel();
  
  // Show courier button for packaging or ready_for_delivery status (and not already sent)
  const canSendToCourier = 
    (order.status === "packaging" || order.status === "ready_for_delivery") && 
    !order.courier_consignment_id;

  const alreadySentToCourier = !!order.courier_consignment_id;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div
          className="p-3 cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-semibold text-sm">
                  Order #{(order as any).order_number || order.id.slice(0, 8).toUpperCase()}
                </span>
                <Badge
                  variant="outline"
                  className={cn("text-[10px]", statusColors[order.status])}
                >
                  {statusLabels[order.status] || order.status}
                </Badge>
                {alreadySentToCourier && (
                  <Badge variant="secondary" className="text-[10px] gap-1">
                    <Truck className="h-2.5 w-2.5" />
                    Courier Booked
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {order.customer_name || "Guest"}
                </span>
                <span>{format(new Date(order.created_at), "MMM dd, h:mm a")}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-primary text-sm">
                {formatCurrency(order.total_amount)}
              </span>
              {expanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <>
            <Separator />
            <div className="p-3 space-y-3">
              {/* Customer Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="flex items-start gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span>{order.customer_phone || "No phone"}</span>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                  <span className="line-clamp-2">
                    {parseAddress(order.shipping_address)}
                    {order.shipping_area && `, ${order.shipping_area}`}
                    {order.shipping_city && `, ${order.shipping_city}`}
                  </span>
                </div>
              </div>

              {/* Tracking Info (if sent to courier) */}
              {alreadySentToCourier && (
                <div className="rounded-md bg-purple-500/5 border border-purple-500/20 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[10px] bg-purple-500/10 text-purple-600 border-purple-500/20">
                      <Truck className="h-2.5 w-2.5 mr-1" />
                      Steadfast
                    </Badge>
                  </div>
                  {order.courier_consignment_id && (
                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        <span className="text-muted-foreground">Consignment ID: </span>
                        <a
                          href={`https://www.steadfast.com.bd/user/consignment/${order.courier_consignment_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-purple-700 font-mono text-sm hover:underline"
                        >
                          {order.courier_consignment_id}
                        </a>
                      </div>
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-purple-600 transition-colors p-0.5"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard.writeText(order.courier_consignment_id!);
                        }}
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                  <div className="text-xs">
                    <span className="text-muted-foreground">Tracking: </span>
                    <span className="font-medium text-purple-600">
                      {order.courier_tracking_code || order.tracking_code || "N/A"}
                    </span>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div className="rounded-md bg-muted/30 p-2.5">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Items to Pack:
                </p>
                {itemsLoading ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No items found</p>
                ) : (
                  <div className="space-y-1.5">
                    {items.map((item: any) => (
                      <div key={item.id} className="flex items-center gap-2">
                        {item.product_image ? (
                          <img
                            src={item.product_image}
                            alt={item.product_name}
                            className="h-8 w-8 rounded object-cover"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                            <Package className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">
                            {item.product_name}
                          </p>
                          {item.selected_variation && (
                            <p className="text-[10px] text-muted-foreground">
                              {[
                                item.selected_variation.size,
                                item.selected_variation.color,
                              ]
                                .filter(Boolean)
                                .join(" / ")}
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-[10px]">
                          ×{item.quantity}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {nextStatus && actionLabel && (
                  <Button
                    onClick={() => onStatusUpdate(order.id, nextStatus)}
                    disabled={isUpdating || isSendingCourier}
                    className="w-full gap-2"
                    size="sm"
                  >
                    {isUpdating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <PackageCheck className="h-4 w-4" />
                        {actionLabel}
                      </>
                    )}
                  </Button>
                )}

                {/* Send to Steadfast Button */}
                {canSendToCourier && (
                  <Button
                    onClick={() => onSendToSteadfast(order)}
                    disabled={isUpdating || isSendingCourier}
                    variant="outline"
                    className="w-full gap-2 border-teal-500/50 text-teal-600 hover:bg-teal-500/10 hover:text-teal-700"
                    size="sm"
                  >
                    {isSendingCourier ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending to Courier...
                      </>
                    ) : (
                      <>
                        <Truck className="h-4 w-4" />
                        Send to Steadfast
                      </>
                    )}
                  </Button>
                )}

                {order.status === "ready_for_delivery" && !canSendToCourier && !alreadySentToCourier && (
                  <div className="flex items-center justify-center gap-2 py-2 text-green-600">
                    <Check className="h-4 w-4" />
                    <span className="text-sm font-medium">Ready for Courier Pickup</span>
                  </div>
                )}

                {alreadySentToCourier && order.status !== "shipped" && (
                  <div className="flex items-center justify-center gap-2 py-2 text-purple-600">
                    <Truck className="h-4 w-4" />
                    <span className="text-sm font-medium">Handed to Courier</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function POSOnlineOrders({ outletId }: POSOnlineOrdersProps) {
  const { toast } = useToast();
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [sendingCourierId, setSendingCourierId] = useState<string | null>(null);
  const [confirmOrder, setConfirmOrder] = useState<any | null>(null);
  
  // Date filter state - defaults to "today"
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [customDateRange, setCustomDateRange] = useState<{ from: Date; to: Date } | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  // Calculate the active date range
  const dateRange = useMemo(() => {
    if (datePreset === "custom" && customDateRange) {
      return customDateRange;
    }
    return getDateRangeFromPreset(datePreset);
  }, [datePreset, customDateRange]);

  const { data: outlets } = useOutlets();
  const currentOutlet = outlets?.find((o) => o.id === outletId);
  const outletName = currentOutlet?.name || "POS Outlet";

  const {
    data: orders = [],
    isLoading,
    refetch,
    isFetching,
  } = useOutletAssignedOrders(outletId, ["confirmed", "packaging", "ready_for_delivery", "shipped"], dateRange);

  const updateStatus = useUpdateOrderStatus();

  // Subscribe to real-time order updates for this outlet
  useEffect(() => {
    if (!outletId) return;

    const channel = supabase
      .channel(`pos-orders-${outletId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `outlet_id=eq.${outletId}`,
        },
        () => {
          // Refetch orders when any change happens to this outlet's orders
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [outletId, refetch]);

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      await updateStatus.mutateAsync({ orderId, newStatus });
      toast({
        title: "Order Updated",
        description: `Order status changed to ${newStatus.replace("_", " ")}`,
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update order",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleSendToSteadfast = async (order: any) => {
    // Show confirmation dialog first
    setConfirmOrder(order);
  };

  const confirmSendToSteadfast = async () => {
    if (!confirmOrder) return;
    
    const order = confirmOrder;
    setConfirmOrder(null);
    
    // ============================================
    // PRE-FLIGHT VALIDATION (Before API call)
    // ============================================
    
    // 1. Validate phone number exists
    if (!order.customer_phone || order.customer_phone.trim() === "") {
      toast({
        title: "Cannot Book Courier",
        description: "Customer phone number is missing. Please update the order with a valid phone number first.",
        variant: "destructive",
      });
      return;
    }
    
    // 2. Validate phone format (Bangladesh: 11 digits starting with 01)
    const cleanPhone = order.customer_phone.replace(/\D/g, "");
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
      toast({
        title: "Invalid Phone Number",
        description: `Phone "${order.customer_phone}" is invalid. Must be 11 digits starting with 01 (e.g., 01712345678).`,
        variant: "destructive",
      });
      return;
    }
    
    // 3. Validate address exists
    if (!order.shipping_address && !order.shipping_city) {
      toast({
        title: "Cannot Book Courier",
        description: "Shipping address is missing. Please update the order with a delivery address.",
        variant: "destructive",
      });
      return;
    }

    setSendingCourierId(order.id);

    try {
      // ============================================
      // AUTHENTICATION CHECK
      // ============================================
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to book couriers. Please refresh and try again.");
      }

      // ============================================
      // CALL EDGE FUNCTION (Independent of Admin)
      // ============================================
      console.log("Sending order to Steadfast:", {
        order_id: order.id,
        customer: order.customer_name,
        phone: order.customer_phone,
      });

      const { data, error } = await supabase.functions.invoke("send-to-steadfast", {
        body: { 
          order_id: order.id,
        },
      });

      // ============================================
      // IMPROVED ERROR HANDLING
      // ============================================
      if (error) {
        console.error("Supabase invoke error:", error);
        
        // Try to extract real error message from FunctionsHttpError
        let errorMessage = "Failed to connect to courier service.";
        
        const anyError = error as any;
        
        // Check for context.body (FunctionsHttpError pattern)
        if (anyError?.context?.body) {
          try {
            const body = typeof anyError.context.body === "string" 
              ? JSON.parse(anyError.context.body) 
              : anyError.context.body;
            errorMessage = body?.error || body?.message || errorMessage;
          } catch {
            if (typeof anyError.context.body === "string") {
              errorMessage = anyError.context.body;
            }
          }
        } else if (anyError?.message && anyError.message !== "{}") {
          errorMessage = anyError.message;
        }
        
        throw new Error(errorMessage);
      }

      // Check for error in response data
      if (data?.error) {
        console.error("Steadfast API error in response:", data);
        throw new Error(data.error);
      }

      // ============================================
      // SUCCESS
      // ============================================
      toast({
        title: "✅ Courier Booked!",
        description: `Consignment ID: ${data?.consignment_id || "N/A"} | Tracking: ${data?.tracking_code || "N/A"}`,
      });

      // Refetch to get updated order status
      refetch();

    } catch (error: unknown) {
      console.error("Steadfast booking error (full):", error);
      
      // Extract the most useful error message
      let displayMessage = "An unexpected error occurred. Please try again.";
      
      if (error instanceof Error) {
        displayMessage = error.message;
      } else if (typeof error === "object" && error !== null) {
        const objErr = error as Record<string, unknown>;
        displayMessage = (objErr.error || objErr.message || JSON.stringify(objErr)) as string;
        // Avoid showing empty object
        if (displayMessage === "{}" || displayMessage === "{}") {
          displayMessage = "Request failed. Check your permissions and network connection.";
        }
      }
      
      toast({
        title: "Courier Booking Failed",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setSendingCourierId(null);
    }
  };

  if (!outletId) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-sm">No outlet selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
      {/* Sticky Header */}
      <div className="flex-shrink-0 p-3 border-b bg-card sticky top-0 z-10 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            <h3 className="font-semibold text-sm">Online Orders</h3>
            {orders.length > 0 && (
              <Badge variant="secondary" className="h-5 text-[10px]">
                {orders.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isFetching}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>

        {/* Date Filter Row */}
        <div className="flex items-center gap-2">
          <Select
            value={datePreset}
            onValueChange={(value: DatePreset) => {
              setDatePreset(value);
              if (value !== "custom") {
                setCustomDateRange(null);
              }
            }}
          >
            <SelectTrigger className="h-8 text-xs w-[120px]">
              <SelectValue placeholder="Select date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="last7days">Last 7 Days</SelectItem>
              <SelectItem value="thisWeek">This Week</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Custom Date Picker */}
          {datePreset === "custom" && (
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 text-xs justify-start gap-1.5",
                    !customDateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customDateRange?.from ? (
                    customDateRange.to ? (
                      <>
                        {format(customDateRange.from, "MMM d")} - {format(customDateRange.to, "MMM d")}
                      </>
                    ) : (
                      format(customDateRange.from, "MMM d, yyyy")
                    )
                  ) : (
                    <span>Pick dates</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  defaultMonth={customDateRange?.from}
                  selected={{
                    from: customDateRange?.from,
                    to: customDateRange?.to,
                  }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setCustomDateRange({ from: range.from, to: range.to });
                      setIsCalendarOpen(false);
                    } else if (range?.from) {
                      setCustomDateRange({ from: range.from, to: range.from });
                    }
                  }}
                  numberOfMonths={1}
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Date display badge */}
          <Badge variant="outline" className="text-[10px] h-6 bg-muted/50">
            {format(dateRange.from, "MMM d")}
            {dateRange.from.toDateString() !== dateRange.to.toDateString() && (
              <> – {format(dateRange.to, "MMM d")}</>
            )}
          </Badge>
        </div>
      </div>

      {/* Scrollable Orders List */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="p-3 space-y-3 pb-24">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PackageCheck className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-sm font-medium">No orders for this date</p>
              <p className="text-xs mt-1">
                {datePreset === "today" 
                  ? "Orders assigned to this outlet today will appear here" 
                  : "Try selecting a different date range"}
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                outletName={outletName}
                onStatusUpdate={handleStatusUpdate}
                onSendToSteadfast={handleSendToSteadfast}
                isUpdating={updatingOrderId === order.id}
                isSendingCourier={sendingCourierId === order.id}
              />
            ))
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmOrder} onOpenChange={() => setConfirmOrder(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send to Steadfast Courier?</AlertDialogTitle>
            <AlertDialogDescription>
              This will book a courier pickup for order #{confirmOrder?.id?.slice(0, 8).toUpperCase()}.
              <br /><br />
              <strong>Customer:</strong> {confirmOrder?.customer_name || "Guest"}<br />
              <strong>Phone:</strong> {confirmOrder?.customer_phone || "N/A"}<br />
              <strong>COD Amount:</strong> {confirmOrder?.payment_status === "paid" ? "৳0 (Prepaid)" : formatCurrency(confirmOrder?.total_amount || 0)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmSendToSteadfast}
              className="bg-teal-600 hover:bg-teal-700"
            >
              <Truck className="h-4 w-4 mr-2" />
              Confirm & Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
