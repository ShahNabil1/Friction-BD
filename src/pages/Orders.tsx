import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Package, Calendar, Eye, Loader2, ShoppingBag, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { OrderDetailsDialog } from "@/components/orders/OrderDetailsDialog";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
  selected_variation?: { color?: string; size?: string } | null;
}

interface Order {
  id: string;
  order_number: string | null;
  total_amount: number;
  subtotal: number | null;
  shipping_cost: number | null;
  delivery_fee: number | null;
  discount: number | null;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  payment_status: string | null;
  payment_method: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_area: string | null;
  created_at: string;
}

const statusColors: Record<Order["status"], string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-bubu-green/20 text-bubu-green-foreground border-bubu-green/30",
  cancelled: "bg-bubu-red/10 text-bubu-red border-bubu-red/20",
};

const statusLabels: Record<Order["status"], string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, order_number, total_amount, subtotal, shipping_cost, delivery_fee, discount, status, payment_status, payment_method, customer_name, customer_phone, shipping_address, shipping_city, shipping_area, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setOrders((data as unknown as Order[]) || []);
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();
  }, [user]);

  const handleViewDetails = async (order: Order) => {
    setSelectedOrder(order);
    setLoadingItems(true);

    try {
      const { data, error } = await supabase
        .from("order_items")
        .select("id, product_name, product_image, qty, quantity, price, unit_price, selected_variation")
        .eq("order_id", order.id);

      if (error) throw error;
      
      // Normalize the data - use qty/price as fallback for quantity/unit_price
      const normalizedItems: OrderItem[] = (data || []).map((item: any) => ({
        id: item.id,
        product_name: item.product_name || "Unknown Product",
        product_image: item.product_image,
        quantity: item.quantity ?? item.qty ?? 1,
        unit_price: item.unit_price ?? item.price ?? 0,
        selected_variation: item.selected_variation,
      }));
      
      setOrderItems(normalizedItems);
    } catch (error) {
      console.error("Error fetching order items:", error);
      setOrderItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "all") return true;
    return order.status === activeTab;
  });

  const formatCurrency = (amount: number) => {
    // Values are stored as whole BDT integers, no division needed
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeaderNav />

      <main className="container py-8 md:py-12">
        <div className="mx-auto max-w-4xl">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary rounded-xl"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Order History</h1>
            <p className="text-muted-foreground">View and track your orders</p>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 flex w-full flex-wrap justify-center gap-2 md:w-auto md:flex-nowrap rounded-xl bg-muted/50 p-1">
              <TabsTrigger value="all" className="text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                All
              </TabsTrigger>
              <TabsTrigger value="pending" className="text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Pending
              </TabsTrigger>
              <TabsTrigger value="delivered" className="text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Delivered
              </TabsTrigger>
              <TabsTrigger value="cancelled" className="text-sm rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                Cancelled
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-0">
              {filteredOrders.length === 0 ? (
                <Card className="border-border/50 rounded-2xl">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                      <ShoppingBag className="h-10 w-10 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Orders Found
                    </h3>
                    <p className="text-muted-foreground text-center max-w-sm">
                      {activeTab === "all"
                        ? "You haven't placed any orders yet. Start shopping to see your orders here!"
                        : `No ${activeTab} orders found.`}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filteredOrders.map((order) => (
                    <Card key={order.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow rounded-2xl overflow-hidden">
                      <CardHeader className="pb-3 bg-primary/5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(order.created_at), "MMM dd, yyyy 'at' h:mm a")}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={`${statusColors[order.status]} font-medium rounded-lg`}
                          >
                            {statusLabels[order.status]}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-muted-foreground">Total Amount</p>
                            <p className="text-lg font-bold text-primary">
                              {formatCurrency(order.total_amount)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(order)}
                            className="border-primary/30 hover:bg-primary/5 rounded-xl"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        order={selectedOrder}
        orderItems={orderItems}
        loadingItems={loadingItems}
        onClose={() => setSelectedOrder(null)}
      />

      <Footer />
    </div>
  );
}
