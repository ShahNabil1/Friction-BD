import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CreditCard, Search, DollarSign, Calendar, Phone, User, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOutlets, useUserOutlet } from "@/hooks/useOutlets";
import { useUserRole } from "@/hooks/useUserRole";

interface CreditOrder {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  items: any[];
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  created_at: string;
  outlet_id: string | null;
  payment_status: string | null;
}

export default function POSCreditPayments() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSuperAdmin, role } = useUserRole();
  const { data: userOutlet } = useUserOutlet();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [payDueOrder, setPayDueOrder] = useState<CreditOrder | null>(null);
  const [payAmount, setPayAmount] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: outlets = [] } = useOutlets();
  
  // Get current outlet ID for non-admin users
  const currentOutletId = useMemo(() => {
    if (isSuperAdmin || role === "admin") {
      return localStorage.getItem("pos_current_outlet");
    }
    return userOutlet?.outlet?.id || null;
  }, [isSuperAdmin, role, userOutlet]);

  // Fetch orders with due amounts
  const { data: creditOrders = [], refetch } = useQuery({
    queryKey: ["credit-orders", selectedOutlet],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("id, order_number, customer_name, customer_phone, items, total_amount, paid_amount, due_amount, created_at, outlet_id, payment_status")
        .gt("due_amount", 0)
        .order("created_at", { ascending: false });

      if (selectedOutlet !== "all") {
        query = query.eq("outlet_id", selectedOutlet);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CreditOrder[];
    },
  });

  // Filter by search
  const filteredOrders = creditOrders.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      (order.customer_name?.toLowerCase().includes(searchLower) ?? false) ||
      (order.customer_phone?.includes(searchQuery) ?? false) ||
      (order.order_number?.toLowerCase().includes(searchLower) ?? false)
    );
  });

  // Stats
  const totalDue = creditOrders.reduce((sum, o) => sum + (o.due_amount || 0), 0);
  const totalCustomers = new Set(creditOrders.map((o) => o.customer_phone).filter(Boolean)).size;

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getItemNames = (items: any[]) => {
    if (!Array.isArray(items)) return "-";
    return items.map((item: any) => item.product_name || item.title || "Item").join(", ");
  };

  const getTotalQty = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((sum: number, item: any) => sum + (item.quantity || item.qty || 1), 0);
  };

  const handlePayDue = async () => {
    if (!payDueOrder) return;
    
    const amount = parseFloat(payAmount) || 0;
    if (amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
        variant: "destructive",
      });
      return;
    }

    if (amount > payDueOrder.due_amount) {
      toast({
        title: "Exceeds Due",
        description: "Payment amount cannot exceed due amount",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const newPaidAmount = (payDueOrder.paid_amount || 0) + amount;
      const newDueAmount = payDueOrder.due_amount - amount;
      const newPaymentStatus = newDueAmount <= 0 ? "paid" : "partial";
      
      // FIX 3: Auto-update order status when due is fully cleared
      // If due becomes 0, change status from 'due' to 'paid'
      const newOrderStatus = newDueAmount <= 0 ? "paid" : undefined;

      const updatePayload: Record<string, unknown> = {
        paid_amount: newPaidAmount,
        due_amount: newDueAmount,
        payment_status: newPaymentStatus,
        updated_at: new Date().toISOString(),
      };
      
      // Only update status if due is fully cleared
      if (newOrderStatus) {
        updatePayload.status = newOrderStatus;
      }

      const { error } = await supabase
        .from("orders")
        .update(updatePayload)
        .eq("id", payDueOrder.id);

      if (error) throw error;

      toast({
        title: "Payment Recorded",
        description: `${formatPrice(amount)} payment recorded. ${newDueAmount > 0 ? `Remaining: ${formatPrice(newDueAmount)}` : "Fully paid!"}`,
      });

      setPayDueOrder(null);
      setPayAmount("");
      refetch();
    } catch (error: any) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Check if user can see outlet filter (only super admin / admin)
  const canFilterOutlets = isSuperAdmin || role === "admin";

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
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
            <CreditCard className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg">Credit Payments</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search customer or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </header>

      <ScrollArea className="flex-1">
        <div className="space-y-6 p-6">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Outstanding</p>
                <p className="text-2xl font-bold text-destructive">{formatPrice(totalDue)}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Orders</p>
                <p className="text-2xl font-bold">{creditOrders.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-card rounded-xl border p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <User className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Customers with Dues</p>
                <p className="text-2xl font-bold">{totalCustomers}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters - Only show outlet filter for admins */}
        {canFilterOutlets && (
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Table */}
        <div className="bg-card rounded-xl border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Total Bill</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Due</TableHead>
                <TableHead className="text-center">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    No credit orders found
                  </TableCell>
                </TableRow>
              ) : (
                filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{format(new Date(order.created_at), "dd/MM/yyyy")}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.customer_name || "Unknown"}</span>
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{order.customer_phone}</span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="truncate" title={getItemNames(order.items)}>
                          {getItemNames(order.items)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{getTotalQty(order.items)} pcs</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-right text-green-600 font-medium">
                      {formatPrice(order.paid_amount || 0)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-destructive">
                        {formatPrice(order.due_amount)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          setPayDueOrder(order);
                          setPayAmount(String(order.due_amount));
                        }}
                      >
                        Pay Due
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pay Due Dialog */}
        <Dialog open={!!payDueOrder} onOpenChange={(open) => !open && setPayDueOrder(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                Record Payment
              </DialogTitle>
            </DialogHeader>

            {payDueOrder && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer</span>
                    <span className="font-medium">{payDueOrder.customer_name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phone</span>
                    <span>{payDueOrder.customer_phone || "-"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Bill</span>
                    <span>{formatPrice(payDueOrder.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Already Paid</span>
                    <span className="text-green-600">{formatPrice(payDueOrder.paid_amount || 0)}</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-2">
                    <span>Outstanding Due</span>
                    <span className="text-destructive">{formatPrice(payDueOrder.due_amount)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payAmount">Payment Amount</Label>
                  <Input
                    id="payAmount"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="text-lg h-12"
                    autoFocus
                    max={payDueOrder.due_amount}
                  />
                  <p className="text-xs text-muted-foreground">
                    Max: {formatPrice(payDueOrder.due_amount)}
                  </p>
                </div>

                {parseFloat(payAmount) > 0 && parseFloat(payAmount) < payDueOrder.due_amount && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                    <p className="text-amber-800">
                      After this payment, remaining due:{" "}
                      <strong>{formatPrice(payDueOrder.due_amount - (parseFloat(payAmount) || 0))}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setPayDueOrder(null)} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handlePayDue} disabled={isProcessing}>
                {isProcessing ? "Processing..." : "Confirm Payment"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </ScrollArea>
    </div>
  );
}
