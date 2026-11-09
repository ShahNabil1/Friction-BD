import { useState, useEffect, useCallback, useRef } from "react";
import { format, startOfMonth, endOfDay, startOfDay, isWithinInterval } from "date-fns";
import {
  User,
  Phone,
  ShoppingBag,
  Loader2,
  RotateCcw,
  CreditCard,
  Printer,
  Package,
  Calendar,
  Hash,
  MapPin,
  TrendingUp,
  ArrowLeftRight,
  Search,
  X,
  CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { usePrintReceipt } from "@/hooks/usePrintReceipt";
import type { CRMCustomer } from "@/pages/admin/POSCRM";

interface OrderRow {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string | null;
  payment_status: string | null;
  source: string | null;
  outlet_id: string | null;
  discount: number | null;
  subtotal: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  tendered_amount: number | null;
  change_amount: number | null;
  paid_amount: number | null;
  due_amount: number | null;
  points_redeemed: number | null;
  points_monetary_value: number | null;
}

interface OrderItem {
  id: string;
  order_id: string;
  product_name: string | null;
  title: string;
  qty: number;
  price: number;
  selected_variation: any;
}

interface ReturnRow {
  id: string;
  created_at: string;
  return_type: string;
  reason: string | null;
  refund_amount: number | null;
  exchange_amount: number | null;
  balance_due: number | null;
  returned_items: any;
  exchange_items: any;
  original_amount: number;
  order_id: string | null;
  return_receipt_number: string | null;
}

interface CreditOrder {
  id: string;
  created_at: string;
  total_amount: number;
  paid_amount: number | null;
  due_amount: number | null;
  payment_status: string | null;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 0 }).format(amount);

const statusColor = (s: string) => {
  switch (s.toLowerCase()) {
    case "delivered": return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "pending": return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    case "cancelled": return "bg-red-500/10 text-red-700 border-red-500/20";
    case "processing": return "bg-blue-500/10 text-blue-700 border-blue-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CRMCustomer;
}

export function CRMCustomerDetailDialog({ open, onOpenChange, customer }: Props) {
  const { printReceipt } = usePrintReceipt();
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [orderItems, setOrderItems] = useState<Map<string, OrderItem[]>>(new Map());
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [creditOrders, setCreditOrders] = useState<CreditOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [outletNames, setOutletNames] = useState<Map<string, string>>(new Map());

  // Filter state
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const highlightRef = useRef<HTMLDivElement | null>(null);

  

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Build OR filter: match by customer_id OR customer_phone (POS orders often lack customer_id)
      const filters: string[] = [`customer_id.eq.${customer.id}`];
      if (customer.phone) {
        filters.push(`customer_phone.eq.${customer.phone}`);
      }

      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, status, payment_method, payment_status, source, outlet_id, discount, subtotal, customer_name, customer_phone, tendered_amount, change_amount, paid_amount, due_amount, points_redeemed, points_monetary_value")
        .or(filters.join(","))
        .order("created_at", { ascending: false });

      const fetchedOrders = (ordersData || []) as OrderRow[];
      setOrders(fetchedOrders);

      const orderIds = fetchedOrders.map((o) => o.id);
      if (orderIds.length > 0) {
        const { data: items } = await supabase
          .from("order_items")
          .select("id, order_id, product_name, title, qty, price, selected_variation")
          .in("order_id", orderIds);

        const itemMap = new Map<string, OrderItem[]>();
        (items || []).forEach((item: any) => {
          const existing = itemMap.get(item.order_id) || [];
          existing.push(item);
          itemMap.set(item.order_id, existing);
        });
        setOrderItems(itemMap);

        const outletIds = [...new Set(fetchedOrders.map((o) => o.outlet_id).filter(Boolean))] as string[];
        if (outletIds.length > 0) {
          const { data: outlets } = await supabase
            .from("outlets")
            .select("id, name")
            .in("id", outletIds);
          const map = new Map<string, string>();
          (outlets || []).forEach((o: any) => map.set(o.id, o.name));
          setOutletNames(map);
        }
      }

      // Fetch returns with exchange fields
      const { data: returnsData } = await supabase
        .from("order_returns")
        .select("id, created_at, return_type, reason, refund_amount, exchange_amount, balance_due, returned_items, exchange_items, original_amount, order_id, return_receipt_number")
        .or(`customer_phone.eq.${customer.phone},order_id.in.(${orderIds.join(",")})`)
        .order("created_at", { ascending: false });

      if (orderIds.length > 0) {
        const { data: returnsByOrder } = await supabase
          .from("order_returns")
          .select("id, created_at, return_type, reason, refund_amount, exchange_amount, balance_due, returned_items, exchange_items, original_amount, order_id, return_receipt_number")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false });

        const allReturns = [...(returnsData || []), ...(returnsByOrder || [])];
        const uniqueReturns = Array.from(new Map(allReturns.map((r: any) => [r.id, r])).values());
        setReturns(uniqueReturns as ReturnRow[]);
      } else {
        setReturns((returnsData || []) as ReturnRow[]);
      }

      const credits = fetchedOrders.filter(
        (o) => o.payment_method === "due" || (o.due_amount != null && Number(o.due_amount) > 0)
      );
      setCreditOrders(credits as CreditOrder[]);
    } catch (error) {
      console.error("Error fetching customer data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [customer.id, customer.phone]);

  useEffect(() => {
    if (open) {
      fetchData();
      setActiveTab("orders");
      setDateFrom(undefined);
      setDateTo(undefined);
      setSearchQuery("");
      setHighlightedId(null);
    }
  }, [open, fetchData]);

  // Scroll to highlighted element
  useEffect(() => {
    if (highlightedId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightedId, activeTab]);

  const handleReprint = (order: OrderRow) => {
    const items = orderItems.get(order.id) || [];
    printReceipt({
      orderId: order.id,
      items: items.map((i) => ({
        product_name: i.product_name || i.title,
        qty: i.qty,
        price: i.price,
        selected_variation: i.selected_variation,
      })),
      customer: { name: order.customer_name || customer.full_name, phone: order.customer_phone || customer.phone },
      subtotal: order.subtotal || order.total_amount,
      discount: order.discount || 0,
      total: order.total_amount,
      paymentMethod: order.payment_method,
      tenderedAmount: order.tendered_amount,
      changeAmount: order.change_amount,
      paidAmount: order.paid_amount,
      dueAmount: order.due_amount,
      createdAt: order.created_at,
      pointsRedeemed: order.points_redeemed ?? 0,
      pointsMonetaryValue: Number(order.points_monetary_value ?? 0),
      customerLoyaltyPoints: customer.loyalty_points ?? 0,
    });
  };

  // Date filter helper
  const isInDateRange = (dateStr: string) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(dateStr);
    const from = dateFrom ? startOfDay(dateFrom) : new Date(0);
    const to = dateTo ? endOfDay(dateTo) : new Date(9999, 11, 31);
    return d >= from && d <= to;
  };

  // Search/scan handler
  const handleScanSearch = () => {
    const term = searchQuery.replace(/#/g, "").trim().toUpperCase();
    if (!term) return;

    // Search in orders
    const matchedOrder = orders.find((o) => {
      const receipt = o.id.slice(0, 8).toUpperCase();
      return receipt.includes(term) || receipt === term;
    });

    if (matchedOrder) {
      setDateFrom(undefined);
      setDateTo(undefined);
      setHighlightedId(matchedOrder.id);
      setActiveTab("orders");
      return;
    }

    // Search in returns by return_receipt_number or order_id
    const matchedReturn = returns.find((r) => {
      const receiptNum = (r.return_receipt_number || "").toUpperCase();
      const orderId = (r.order_id || "").slice(0, 8).toUpperCase();
      return receiptNum.includes(term) || orderId.includes(term) || r.id.slice(0, 8).toUpperCase().includes(term);
    });

    if (matchedReturn) {
      setDateFrom(undefined);
      setDateTo(undefined);
      setHighlightedId(matchedReturn.id);
      setActiveTab(matchedReturn.return_type === "exchange" ? "exchanges" : "refunds");
      return;
    }

    setHighlightedId(null);
  };

  const clearFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearchQuery("");
    setHighlightedId(null);
  };

  // Filtered data
  const filteredOrders = orders.filter((o) => isInDateRange(o.created_at));
  const refunds = returns.filter((r) => r.return_type === "refund" && isInDateRange(r.created_at));
  const exchanges = returns.filter((r) => r.return_type === "exchange" && isInDateRange(r.created_at));
  const filteredCredits = creditOrders.filter((o) => isInDateRange(o.created_at));

  const totalDue = creditOrders.reduce((s, o) => s + (Number(o.due_amount) || 0), 0);
  const hasFilters = dateFrom || dateTo || searchQuery;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Profile Header */}
        <div className="bg-primary/5 border-b px-6 py-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
                {customer.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="text-xl">{customer.full_name}</span>
                <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground font-normal">
                  {customer.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </span>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {customer.source === "manual" ? "POS" : "Online"}
                  </Badge>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="sr-only">Customer profile details</DialogDescription>
          </DialogHeader>

          {/* LTV Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="rounded-lg bg-background border px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Orders</p>
              <p className="text-lg font-bold">{customer.total_orders}</p>
            </div>
            <div className="rounded-lg bg-background border px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Lifetime Value</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(customer.total_spent)}</p>
            </div>
            <div className="rounded-lg bg-background border px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Outstanding Due</p>
              <p className={`text-lg font-bold ${totalDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                {formatCurrency(totalDue)}
              </p>
            </div>
            <div className="rounded-lg bg-background border px-3 py-2 text-center">
              <p className="text-xs text-muted-foreground">Loyalty Points</p>
              <p className="text-lg font-bold text-amber-600">{(customer.loyalty_points || 0).toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">≈ {formatCurrency((customer.loyalty_points || 0) * 0.75)}</p>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-4 py-3 border-b bg-muted/20 space-y-2 shrink-0">
          {/* Scan/Search */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scan Receipt / Search Order ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanSearch()}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Button size="sm" className="h-9" onClick={handleScanSearch}>
              <Search className="h-4 w-4" />
            </Button>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2 flex-wrap">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, "MMM dd, yy") : "From"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            <span className="text-xs text-muted-foreground">→</span>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, "MMM dd, yy") : "To"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarPicker
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>

            {hasFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
            <TabsTrigger
              value="orders"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ShoppingBag className="h-3.5 w-3.5 mr-1" />
              Orders ({filteredOrders.length})
            </TabsTrigger>
            <TabsTrigger
              value="refunds"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Refunds ({refunds.length})
            </TabsTrigger>
            <TabsTrigger
              value="exchanges"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 mr-1" />
              Exchanges ({exchanges.length})
            </TabsTrigger>
            <TabsTrigger
              value="credit"
              className="flex-1 rounded-none border-b-2 border-transparent py-3 text-xs data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <CreditCard className="h-3.5 w-3.5 mr-1" />
              Credit ({filteredCredits.length})
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[35vh]">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : (
              <>
                {/* Orders Tab */}
                <TabsContent value="orders" className="m-0 p-4">
                  {filteredOrders.length === 0 ? (
                    <EmptyState icon={ShoppingBag} message="No orders found" />
                  ) : (
                    <div className="space-y-3">
                      {filteredOrders.map((order) => {
                        const items = orderItems.get(order.id) || [];
                        const isHighlighted = highlightedId === order.id;
                        return (
                          <div
                            key={order.id}
                            ref={isHighlighted ? highlightRef : undefined}
                          >
                            <Card className={cn(
                              "border-border/50 transition-all duration-500",
                              isHighlighted && "ring-2 ring-primary border-primary bg-primary/5"
                            )}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                      <span className="font-mono text-xs text-muted-foreground">
                                        #{order.id.slice(0, 8).toUpperCase()}
                                      </span>
                                      <Badge className={statusColor(order.status)}>{order.status}</Badge>
                                      {order.source && (
                                        <Badge variant="outline" className="text-xs">
                                          {order.source === "pos" ? "POS" : order.source === "manual" ? "Manual" : "Web"}
                                        </Badge>
                                      )}
                                      {order.outlet_id && outletNames.get(order.outlet_id) && (
                                        <Badge variant="outline" className="text-xs">
                                          <MapPin className="h-3 w-3 mr-0.5" />
                                          {outletNames.get(order.outlet_id)}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                                      <Calendar className="h-3.5 w-3.5" />
                                      {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
                                    </p>
                                    {items.length > 0 && (
                                      <div className="text-sm space-y-0.5">
                                        {items.map((item) => (
                                          <div key={item.id} className="flex justify-between text-muted-foreground">
                                            <span className="truncate">
                                              {item.product_name || item.title} × {item.qty}
                                            </span>
                                            <span className="shrink-0 ml-2">{formatCurrency(item.price * item.qty)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <p className="text-lg font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs gap-1"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleReprint(order);
                                      }}
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      Reprint
                                    </Button>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Refunds Tab */}
                <TabsContent value="refunds" className="m-0 p-4">
                  {refunds.length === 0 ? (
                    <EmptyState icon={RotateCcw} message="No refunds found" />
                  ) : (
                    <div className="space-y-3">
                      {refunds.map((r) => {
                        const items = Array.isArray(r.returned_items) ? r.returned_items : [];
                        const isHighlighted = highlightedId === r.id;
                        return (
                          <div key={r.id} ref={isHighlighted ? highlightRef : undefined}>
                            <Card className={cn(
                              "border-border/50 transition-all duration-500",
                              isHighlighted && "ring-2 ring-primary border-primary bg-primary/5"
                            )}>
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">Refund</Badge>
                                      {r.return_receipt_number && (
                                        <span className="font-mono text-xs text-muted-foreground">{r.return_receipt_number}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(r.created_at), "MMM dd, yyyy")}
                                      </span>
                                    </div>
                                    {r.reason && (
                                      <p className="text-sm text-muted-foreground mb-1">Reason: {r.reason}</p>
                                    )}
                                    {items.length > 0 && (
                                      <div className="text-sm space-y-0.5 text-muted-foreground">
                                        {items.map((item: any, idx: number) => (
                                          <p key={idx} className="truncate">
                                            {item.product_name || item.title || "Product"} × {item.qty || 1}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-sm text-muted-foreground">Refund</p>
                                    <p className="text-lg font-bold text-red-600">
                                      {formatCurrency(r.refund_amount || r.original_amount || 0)}
                                    </p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Exchanges Tab */}
                <TabsContent value="exchanges" className="m-0 p-4">
                  {exchanges.length === 0 ? (
                    <EmptyState icon={ArrowLeftRight} message="No exchanges found" />
                  ) : (
                    <div className="space-y-3">
                      {exchanges.map((r) => {
                        const returnedItems = Array.isArray(r.returned_items) ? r.returned_items : [];
                        const exchangeItemsList = Array.isArray(r.exchange_items) ? r.exchange_items : [];
                        const isHighlighted = highlightedId === r.id;
                        const balance = r.balance_due || 0;
                        return (
                          <div key={r.id} ref={isHighlighted ? highlightRef : undefined}>
                            <Card className={cn(
                              "border-border/50 transition-all duration-500",
                              isHighlighted && "ring-2 ring-primary border-primary bg-primary/5"
                            )}>
                              <CardContent className="p-4 space-y-2">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Badge className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">Exchange</Badge>
                                      {r.return_receipt_number && (
                                        <span className="font-mono text-xs text-muted-foreground">{r.return_receipt_number}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {format(new Date(r.created_at), "MMM dd, yyyy")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <p className="text-xs text-muted-foreground">
                                      {balance > 0 ? "Customer Paid" : balance === 0 ? "Even" : "Refunded"}
                                    </p>
                                    <p className={cn("text-lg font-bold", balance > 0 ? "text-emerald-600" : balance < 0 ? "text-red-600" : "text-muted-foreground")}>
                                      {formatCurrency(Math.abs(balance))}
                                    </p>
                                  </div>
                                </div>

                                {/* Returned → New */}
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Returned</p>
                                    {returnedItems.map((item: any, idx: number) => (
                                      <p key={idx} className="truncate text-muted-foreground">
                                        {item.title || "Product"} × {item.qty || 1}
                                      </p>
                                    ))}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-muted-foreground mb-1">Received</p>
                                    {exchangeItemsList.map((item: any, idx: number) => (
                                      <p key={idx} className="truncate text-muted-foreground">
                                        {item.title || "Product"} × {item.qty || 1}
                                      </p>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Credit Tab */}
                <TabsContent value="credit" className="m-0 p-4">
                  {filteredCredits.length === 0 ? (
                    <EmptyState icon={CreditCard} message="No credit history" />
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Credit Sales</p>
                          <p className="text-xl font-bold">{filteredCredits.length}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Total Due</p>
                          <p className={`text-xl font-bold ${totalDue > 0 ? "text-red-600" : "text-emerald-600"}`}>
                            {formatCurrency(totalDue)}
                          </p>
                        </div>
                      </div>

                      {filteredCredits.map((o) => (
                        <Card key={o.id} className="border-border/50">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="font-mono text-xs text-muted-foreground mb-1">
                                  #{o.id.slice(0, 8).toUpperCase()}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {format(new Date(o.created_at), "MMM dd, yyyy")}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="flex items-center gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground text-xs">Total</p>
                                    <p className="font-semibold">{formatCurrency(o.total_amount)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Paid</p>
                                    <p className="font-semibold text-emerald-600">{formatCurrency(o.paid_amount || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground text-xs">Due</p>
                                    <p className="font-bold text-red-600">{formatCurrency(o.due_amount || 0)}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/30" />
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
