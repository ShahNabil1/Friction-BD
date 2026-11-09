import { useState, useEffect, useMemo, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Store,
  Globe,
  Filter,
  Package,
  Receipt,
  Calendar,
  ChevronDown,
  RotateCcw,
  ArrowRightLeft,
  CreditCard,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useUserOutlet } from "@/hooks/useOutlets";
import { useUserRole } from "@/hooks/useUserRole";
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";

interface Order {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_id: string | null;
  total_amount: number;
  status: string;
  source: string | null;
  payment_method: string | null;
  payment_details: any;
  created_at: string;
  discount: number | null;
  subtotal: number | null;
  due_amount: number | null;
  points_redeemed: number | null;
  points_monetary_value: number | null;
}

interface OrderItem {
  id: string;
  product_name: string | null;
  product_image: string | null;
  qty: number;
  price: number;
  selected_variation: { size?: string; color?: string } | null;
}

interface ReturnRecord {
  id: string;
  return_type: string;
  refund_amount: number | null;
  exchange_amount: number | null;
  created_at: string;
}

type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

export default function POSSalesHistory() {
  const navigate = useNavigate();
  const { data: userOutlet } = useUserOutlet();
  const { isSuperAdmin, role } = useUserRole();
  const { printReceipt } = usePrintReceipt();

  const [orders, setOrders] = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "pos" | "online">("pos");

  // Date range state - default to today
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Get current outlet ID
  const currentOutletId = useMemo(() => {
    if (isSuperAdmin || role === "admin") {
      return localStorage.getItem("pos_current_outlet");
    }
    return userOutlet?.outlet?.id || null;
  }, [isSuperAdmin, role, userOutlet]);

  // Handle date preset changes
  const handleDatePreset = (preset: DatePreset) => {
    const today = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "yesterday":
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case "this_week":
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case "this_month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      default:
        return;
    }

    setDatePreset(preset);
    setDateRange({ from, to });
    setShowDatePicker(false);
  };

  const getPresetLabel = () => {
    switch (datePreset) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
      case "custom":
        return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
      default:
        return "Select Date";
    }
  };

  // Fetch orders for the current outlet within date range
  useEffect(() => {
    const fetchOrders = async () => {
      if (!currentOutletId) {
        setIsLoadingOrders(false);
        return;
      }

      setIsLoadingOrders(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, customer_name, customer_phone, customer_id, total_amount, status, source, payment_method, payment_details, created_at, discount, subtotal, due_amount, points_redeemed, points_monetary_value"
          )
          .eq("outlet_id", currentOutletId)
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        setOrders(data || []);

        // Auto-select first order
        if (data && data.length > 0) {
          setSelectedOrder(data[0]);
        } else {
          setSelectedOrder(null);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoadingOrders(false);
      }
    };

    // Fetch returns for the same date range
    const fetchReturns = async () => {
      if (!currentOutletId) return;

      try {
        const { data, error } = await supabase
          .from("order_returns")
          .select("id, return_type, refund_amount, exchange_amount, created_at")
          .eq("outlet_id", currentOutletId)
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString());

        if (error) throw error;
        setReturns(data || []);
      } catch (error) {
        console.error("Error fetching returns:", error);
      }
    };

    fetchOrders();
    fetchReturns();
  }, [currentOutletId, dateRange]);

  // Fetch order items when selected order changes
  useEffect(() => {
    const fetchOrderItems = async () => {
      if (!selectedOrder) {
        setOrderItems([]);
        return;
      }

      setIsLoadingItems(true);
      try {
        const { data, error } = await supabase
          .from("order_items")
          .select("id, product_name, product_image, qty, price, selected_variation")
          .eq("order_id", selectedOrder.id);

        if (error) throw error;
        setOrderItems((data as OrderItem[]) || []);
      } catch (error) {
        console.error("Error fetching order items:", error);
        setOrderItems([]);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchOrderItems();
  }, [selectedOrder]);

  // Filter orders based on search and tab
  const filteredOrders = useMemo(() => {
    let result = orders;

    // Tab filter
    if (activeTab === "pos") {
      result = result.filter((o) => o.source === "pos");
    } else if (activeTab === "online") {
      result = result.filter((o) => o.source !== "pos");
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(query) ||
          o.customer_name?.toLowerCase().includes(query) ||
          o.customer_phone?.includes(query)
      );
    }

    return result;
  }, [orders, activeTab, searchQuery]);

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const posOrders = orders.filter((o) => o.source === "pos");
    const onlineOrders = orders.filter((o) => o.source !== "pos");
    const returnedOrders = orders.filter((o) => o.status === "returned");

    const posCount = posOrders.length;
    const posAmount = posOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const onlineCount = onlineOrders.length;
    const onlineAmount = onlineOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0);

    const totalDue = orders.reduce((sum, o) => sum + (o.due_amount || 0), 0);

    const refundReturns = returns.filter((r) => r.return_type === "refund");
    const exchangeReturns = returns.filter((r) => r.return_type === "exchange");

    const refundCount = refundReturns.length;
    const refundAmount = refundReturns.reduce((sum, r) => sum + (r.refund_amount || 0), 0);

    const exchangeCount = exchangeReturns.length;
    const exchangeAmount = exchangeReturns.reduce((sum, r) => sum + (r.exchange_amount || 0), 0);

    // Net sales = Total - Refunds
    const totalGross = posAmount + onlineAmount;
    const netSales = totalGross - refundAmount;

    return {
      posCount,
      posAmount,
      onlineCount,
      onlineAmount,
      totalDue,
      refundCount,
      refundAmount,
      exchangeCount,
      exchangeAmount,
      totalGross,
      netSales,
      totalOrders: orders.length,
    };
  }, [orders, returns]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatCompact = (amount: number) => {
    if (amount >= 1000) {
      return `৳${(amount / 1000).toFixed(1)}k`;
    }
    return `৳${amount}`;
  };

  const getReceiptNumber = (id: string) => {
    return `#${id.slice(0, 8).toUpperCase()}`;
  };

  const getPaymentMethodLabel = (method: string | null, paymentDetails?: { method: string; label?: string; amount: number }[] | null) => {
    // For split payments, show individual method names
    if (method === "split" && paymentDetails && Array.isArray(paymentDetails) && paymentDetails.length > 0) {
      const methodNames: Record<string, string> = {
        cash: "Cash",
        card: "Card",
        mobile_banking: "Mobile",
        bkash: "bKash",
        nagad: "Nagad",
        rocket: "Rocket",
        due: "Due",
        loyalty_points: "Loyalty Points",
      };
      return paymentDetails
        .map((p) => p.label || methodNames[p.method] || p.method)
        .join(", ");
    }

    const methods: Record<string, string> = {
      cash: "Cash",
      card: "Card",
      mobile_banking: "Mobile",
      due: "Due",
    };
    return methods[method || ""] || method || "N/A";
  };

  // Calculate totals for selected order items
  const itemsTotal = orderItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  const totalQuantity = orderItems.reduce((sum, item) => sum + item.qty, 0);

  // Handle reprint receipt
  const handlePrintReceipt = async (order: Order, e?: MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    try {
      // Fetch the order items for this order
      const { data: items, error } = await supabase
        .from("order_items")
        .select("product_name, qty, price, selected_variation")
        .eq("order_id", order.id);

      if (error) throw error;

      // Fetch customer loyalty points if customer is linked
      let customerLoyaltyPoints = 0;
      if (order.customer_id) {
        const { data: custData } = await supabase
          .from("customers")
          .select("loyalty_points")
          .eq("id", order.customer_id)
          .single();
        customerLoyaltyPoints = custData?.loyalty_points ?? 0;
      }

      printReceipt({
        orderId: order.id,
        items: (items || []).map(item => ({
          product_name: item.product_name,
          qty: item.qty,
          price: item.price,
          selected_variation: item.selected_variation as { size?: string; color?: string } | null,
        })),
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
        },
        subtotal: order.subtotal || order.total_amount,
        discount: order.discount || 0,
        total: order.total_amount,
        paymentMethod: order.payment_method,
        dueAmount: order.due_amount,
        createdAt: order.created_at,
        pointsRedeemed: order.points_redeemed ?? 0,
        pointsMonetaryValue: Number(order.points_monetary_value ?? 0),
        customerLoyaltyPoints,
      });

      toast.success("Receipt sent to printer");
    } catch (error) {
      console.error("Error printing receipt:", error);
      toast.error("Failed to print receipt");
    }
  };

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate("/pos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg hidden sm:block">Sales History</span>
          </div>
        </div>

        {/* Tab Filters */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as typeof activeTab)}
          className="hidden sm:block"
        >
          <TabsList className="h-9">
            <TabsTrigger value="all" className="text-xs gap-1.5 px-3">
              <Filter className="h-3.5 w-3.5" />
              All
            </TabsTrigger>
            <TabsTrigger value="pos" className="text-xs gap-1.5 px-3">
              <Store className="h-3.5 w-3.5" />
              POS
            </TabsTrigger>
            <TabsTrigger value="online" className="text-xs gap-1.5 px-3">
              <Globe className="h-3.5 w-3.5" />
              Online
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Search */}
        <div className="relative w-48 sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Date Range Picker */}
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 min-w-[120px]">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{getPresetLabel()}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex">
              {/* Presets */}
              <div className="border-r p-2 space-y-1">
                <Button
                  variant={datePreset === "today" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("today")}
                >
                  Today
                </Button>
                <Button
                  variant={datePreset === "yesterday" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("yesterday")}
                >
                  Yesterday
                </Button>
                <Button
                  variant={datePreset === "this_week" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("this_week")}
                >
                  This Week
                </Button>
                <Button
                  variant={datePreset === "this_month" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("this_month")}
                >
                  This Month
                </Button>
              </div>
              {/* Calendar for custom range */}
              <div className="p-2">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({
                        from: startOfDay(range.from),
                        to: endOfDay(range.to),
                      });
                      setDatePreset("custom");
                    } else if (range?.from) {
                      setDateRange({
                        from: startOfDay(range.from),
                        to: endOfDay(range.from),
                      });
                      setDatePreset("custom");
                    }
                  }}
                  numberOfMonths={1}
                  className="pointer-events-auto"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Section - Orders List */}
        <div className="flex-1 min-h-0 border-b">
          <ScrollArea className="h-full">
            {isLoadingOrders ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8">
                <Receipt className="h-12 w-12 mb-4 opacity-50" />
                <p className="font-medium">No sales found</p>
                <p className="text-sm">
                  {searchQuery
                    ? "Try a different search term"
                    : `No orders for ${getPresetLabel().toLowerCase()}`}
                </p>
              </div>
            ) : (
              <div className="p-2">
                <table className="w-full">
                  <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                    <tr className="text-xs text-muted-foreground">
                      <th className="text-left py-2 px-3 font-medium">Receipt #</th>
                      <th className="text-left py-2 px-3 font-medium">Date/Time</th>
                      <th className="text-left py-2 px-3 font-medium hidden md:table-cell">Customer</th>
                      <th className="text-left py-2 px-3 font-medium hidden sm:table-cell">Payment</th>
                      <th className="text-right py-2 px-3 font-medium">Amount</th>
                      <th className="text-center py-2 px-3 font-medium hidden sm:table-cell">Source</th>
                      <th className="text-center py-2 px-3 font-medium">Status</th>
                      <th className="text-center py-2 px-3 font-medium w-12">Print</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className={cn(
                          "cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/50",
                          selectedOrder?.id === order.id && "bg-primary/10 hover:bg-primary/15"
                        )}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <td className="py-3 px-3">
                          <span className="font-mono font-medium text-sm">
                            {getReceiptNumber(order.id)}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-sm">
                            {format(new Date(order.created_at), "MMM d, yyyy")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(order.created_at), "h:mm a")}
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell">
                          <div className="text-sm font-medium">
                            {order.customer_name || "Walk-in"}
                          </div>
                          {order.customer_phone && (
                            <div className="text-xs text-muted-foreground">
                              {order.customer_phone}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">
                          <span className="text-sm">
                            {getPaymentMethodLabel(order.payment_method, order.payment_details)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className="font-semibold text-sm">
                            {formatPrice(order.total_amount)}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center hidden sm:table-cell">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-[10px]",
                              order.source === "pos"
                                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700"
                                : "border-blue-500/50 bg-blue-500/10 text-blue-700"
                            )}
                          >
                            {order.source === "pos" ? "POS" : "Online"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] capitalize",
                              order.status === "paid" && "bg-emerald-100 text-emerald-700",
                              order.status === "delivered" && "bg-emerald-100 text-emerald-700",
                              order.status === "due" && "bg-red-100 text-red-700",
                              order.status === "cancelled" && "bg-gray-100 text-gray-700",
                              order.status === "returned" && "bg-red-100 text-red-700",
                              order.status === "exchanged" && "bg-amber-100 text-amber-700",
                              order.status === "shipped" && "bg-blue-100 text-blue-700",
                              order.status === "processing" && "bg-yellow-100 text-yellow-700"
                            )}
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10"
                            onClick={(e) => handlePrintReceipt(order, e)}
                            title="Reprint Receipt"
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Bottom Section - Order Items Detail */}
        <div className="h-[35%] min-h-[180px] flex flex-col bg-card">
          {/* Selected Order Header */}
          <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
            <div className="flex items-center gap-3">
              <Package className="h-4 w-4 text-primary" />
              <span className="font-medium text-sm">
                {selectedOrder
                  ? `Items for ${getReceiptNumber(selectedOrder.id)}`
                  : "Select an order to view items"}
              </span>
            </div>
            {selectedOrder && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{totalQuantity} items</span>
                <span className="font-medium text-foreground">
                  {formatPrice(itemsTotal)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1.5"
                  onClick={() => handlePrintReceipt(selectedOrder)}
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Reprint</span>
                </Button>
              </div>
            )}
          </div>

          {/* Items Table */}
          <ScrollArea className="flex-1">
            {!selectedOrder ? (
              <div className="flex h-full items-center justify-center text-muted-foreground p-4">
                <p className="text-sm">Click on an order above to view its items</p>
              </div>
            ) : isLoadingItems ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            ) : orderItems.length === 0 ? (
              <div className="flex h-full items-center justify-center text-muted-foreground p-4">
                <p className="text-sm">No items found for this order</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm">
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left py-2 px-4 font-medium">Product</th>
                    <th className="text-left py-2 px-4 font-medium hidden sm:table-cell">Variant</th>
                    <th className="text-center py-2 px-4 font-medium">Qty</th>
                    <th className="text-right py-2 px-4 font-medium hidden sm:table-cell">Unit</th>
                    <th className="text-right py-2 px-4 font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => (
                    <tr key={item.id} className="border-b border-border/30">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name || "Product"}
                              className="h-10 w-10 rounded-md object-cover bg-muted"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium text-sm line-clamp-1">
                            {item.product_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {[item.selected_variation?.size, item.selected_variation?.color]
                            .filter(Boolean)
                            .join(" / ") || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-medium">{item.qty}</span>
                      </td>
                      <td className="py-3 px-4 text-right hidden sm:table-cell">
                        <span className="text-sm">{formatPrice(item.price)}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold">{formatPrice(item.price * item.qty)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Sticky Summary Footer - Dashboard Style */}
      <footer className="shrink-0 border-t bg-slate-900 text-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Left Side - Metrics */}
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm">
            {/* POS Sales */}
            <div className="flex items-center gap-2">
              <Store className="h-4 w-4 text-emerald-400" />
              <span className="text-slate-400">POS:</span>
              <span className="font-semibold">
                {summaryMetrics.posCount}
              </span>
              <span className="text-emerald-400 font-medium">
                ({formatCompact(summaryMetrics.posAmount)})
              </span>
            </div>

            {/* Online Sales */}
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-400" />
              <span className="text-slate-400">Online:</span>
              <span className="font-semibold">
                {summaryMetrics.onlineCount}
              </span>
              <span className="text-blue-400 font-medium">
                ({formatCompact(summaryMetrics.onlineAmount)})
              </span>
            </div>

            {/* Due Amount */}
            {summaryMetrics.totalDue > 0 && (
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-red-400" />
                <span className="text-slate-400">Due:</span>
                <span className="text-red-400 font-semibold">
                  {formatCompact(summaryMetrics.totalDue)}
                </span>
              </div>
            )}

            {/* Returns */}
            {summaryMetrics.refundCount > 0 && (
              <div className="flex items-center gap-2">
                <RotateCcw className="h-4 w-4 text-orange-400" />
                <span className="text-slate-400">Returns:</span>
                <span className="font-semibold">{summaryMetrics.refundCount}</span>
                <span className="text-orange-400 font-medium">
                  ({formatCompact(summaryMetrics.refundAmount)})
                </span>
              </div>
            )}

            {/* Exchanges */}
            {summaryMetrics.exchangeCount > 0 && (
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-purple-400" />
                <span className="text-slate-400">Exchanges:</span>
                <span className="font-semibold">{summaryMetrics.exchangeCount}</span>
              </div>
            )}
          </div>

          {/* Right Side - Net Total */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs text-slate-400 uppercase tracking-wide">Net Sales</div>
              <div className="text-xl font-bold text-emerald-400">
                {formatPrice(summaryMetrics.netSales)}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
