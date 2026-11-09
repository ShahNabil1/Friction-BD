import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Package, Loader2, Calendar, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";

interface Order {
  id: string;
  order_number?: string | null;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
  source: string;
}

interface CustomerOrderHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerId: string;
  customerName: string;
  isManual: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "delivered":
      return "bg-green-100 text-green-700 border-green-200";
    case "pending":
      return "bg-yellow-100 text-yellow-700 border-yellow-200";
    case "cancelled":
      return "bg-red-100 text-red-700 border-red-200";
    case "processing":
      return "bg-blue-100 text-blue-700 border-blue-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

export function CustomerOrderHistoryDialog({
  open,
  onOpenChange,
  customerId,
  customerName,
  isManual,
}: CustomerOrderHistoryDialogProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open && customerId) {
      fetchOrders();
    }
  }, [open, customerId]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const column = isManual ? "customer_id" : "user_id";
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_number, created_at, total_amount, status, payment_status, source")
        .eq(column, customerId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  };

  const totalSpent = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Order History
          </DialogTitle>
          <DialogDescription>
            All orders placed by {customerName || "this customer"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No orders found</p>
            <p className="text-sm text-muted-foreground/70">
              This customer hasn't placed any orders yet.
            </p>
          </div>
        ) : (
          <>
            {/* Summary */}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold">{orders.length}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Spent</p>
                <p className="text-xl font-bold text-primary">
                  {formatCurrency(totalSpent)}
                </p>
              </div>
            </div>

            {/* Orders List */}
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 pr-2">
                {orders.map((order) => (
                  <Card key={order.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          {/* Order ID */}
                          <div className="mb-2 flex items-center gap-2">
                            <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="font-mono text-xs text-muted-foreground">
                              {order.order_number || `${order.id.slice(0, 8)}...`}
                            </span>
                            {order.source === "manual" && (
                              <Badge variant="outline" className="text-xs">
                                Manual
                              </Badge>
                            )}
                          </div>

                          {/* Date */}
                          <div className="mb-2 flex items-center gap-2 text-sm">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </div>

                          {/* Status Badges */}
                          <div className="flex flex-wrap gap-2">
                            <Badge className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Payment: {order.payment_status}
                            </Badge>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right">
                          <p className="text-lg font-bold text-primary">
                            {formatCurrency(order.total_amount)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
