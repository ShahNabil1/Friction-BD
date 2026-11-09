import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Package, Calendar, ArrowLeft, Loader2, MapPin, Truck, CheckCircle, XCircle, Clock, Phone, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { CourierTrackingStatus } from "@/components/tracking/CourierTrackingStatus";
import { format } from "date-fns";

interface OrderItem {
  id: string;
  product_name: string;
  product_image: string | null;
  quantity: number;
  unit_price: number;
}

interface Order {
  id: string;
  order_number: string | null;
  total_amount: number;
  delivery_fee: number;
  status: string;
  created_at: string;
  customer_name: string | null;
  customer_phone: string | null;
  courier_tracking_code: string | null;
  courier_consignment_id: string | null;
  shipping_address: Record<string, string> | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  confirmed: "bg-teal-500/10 text-teal-600 border-teal-500/20",
  packaging: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  ready_for_delivery: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
  delivered: "bg-green-500/10 text-green-600 border-green-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
  returned: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  hold: "bg-orange-500/10 text-orange-600 border-orange-500/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  confirmed: "Confirmed",
  packaging: "Packaging",
  shipped: "Shipped",
  ready_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
  hold: "On Hold",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-5 w-5" />,
  processing: <Package className="h-5 w-5" />,
  confirmed: <CheckCircle className="h-5 w-5" />,
  packaging: <Package className="h-5 w-5" />,
  shipped: <Truck className="h-5 w-5" />,
  ready_for_delivery: <Truck className="h-5 w-5" />,
  delivered: <CheckCircle className="h-5 w-5" />,
  cancelled: <XCircle className="h-5 w-5" />,
  returned: <XCircle className="h-5 w-5" />,
  hold: <Clock className="h-5 w-5" />,
};

export default function TrackOrder() {
  const [searchValue, setSearchValue] = useState("");
  const [searchType, setSearchType] = useState<"phone" | "tracking">("phone");
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!searchValue.trim()) {
      setError(searchType === "phone" ? "Please enter your phone number" : "Please enter a tracking code");
      return;
    }

    setIsLoading(true);
    setError(null);
    setOrders([]);
    setSelectedOrder(null);
    setOrderItems([]);
    setHasSearched(true);

    try {
      let query = supabase.from("orders").select("*");

      if (searchType === "phone") {
        // Search by phone number
        query = query.ilike("customer_phone", `%${searchValue.trim()}%`);
      } else {
        // Search by tracking code (courier tracking code or order ID)
        query = query.or(
          `courier_tracking_code.ilike.%${searchValue.trim()}%,id.ilike.%${searchValue.trim()}%,order_number.ilike.%${searchValue.trim()}%`
        );
      }

      const { data: orderData, error: orderError } = await query
        .order("created_at", { ascending: false })
        .limit(10);

      if (orderError) throw orderError;

      if (!orderData || orderData.length === 0) {
        setError(
          searchType === "phone"
            ? "No orders found with this phone number. Please check and try again."
            : "No orders found with this tracking code. Please check and try again."
        );
        return;
      }

      setOrders(orderData as unknown as Order[]);
      
      // Auto-select if only one order
      if (orderData.length === 1) {
        await selectOrder(orderData[0] as unknown as Order);
      }
    } catch (err) {
      console.error("Error tracking order:", err);
      setError("An error occurred while searching. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectOrder = async (order: Order) => {
    setSelectedOrder(order);

    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      if (itemsError) throw itemsError;
      setOrderItems((itemsData as unknown as OrderItem[]) || []);
    } catch (err) {
      console.error("Error fetching order items:", err);
      setOrderItems([]);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusStep = (status: string) => {
    const steps = ["pending", "processing", "confirmed", "packaging", "shipped", "delivered"];
    if (status === "cancelled" || status === "returned") return -1;
    return steps.indexOf(status);
  };

  const formatAddress = (address: Record<string, string> | null) => {
    if (!address) return null;
    const parts = [
      address.house_no && `House: ${address.house_no}`,
      address.flat_no && `Flat: ${address.flat_no}`,
      address.road_no && `Road: ${address.road_no}`,
      address.village,
      address.post_office && `P.O: ${address.post_office}`,
      address.thana,
      address.upazilla,
      address.zilla,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : null;
  };

  return (
    <div className="min-h-screen bg-background">
      <HeaderNav />

      <main className="container py-8 md:py-12">
        <div className="mx-auto max-w-2xl">
          <Link
            to="/"
            className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <MapPin className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">Track Your Order</h1>
            <p className="mt-2 text-muted-foreground">
              Enter your phone number or tracking code to check order status
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8 border-border/50">
            <CardContent className="pt-6">
              <Tabs value={searchType} onValueChange={(v) => setSearchType(v as "phone" | "tracking")}>
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="phone" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Phone Number
                  </TabsTrigger>
                  <TabsTrigger value="tracking" className="gap-2">
                    <Hash className="h-4 w-4" />
                    Tracking Code
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="phone" className="mt-0">
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <BDPhoneInput
                        placeholder="01XXXXXXXXX"
                        value={searchValue}
                        onChange={(v) => setSearchValue(v)}
                        className="pl-10"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Track"
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="tracking" className="mt-0">
                  <form onSubmit={handleSearch} className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Enter tracking code or order ID"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value.toUpperCase())}
                        className="pl-10 uppercase"
                      />
                    </div>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Track"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="mb-8 border-destructive/50 bg-destructive/5">
              <CardContent className="flex items-center gap-3 py-4">
                <XCircle className="h-5 w-5 text-destructive" />
                <p className="text-sm text-destructive">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Multiple Orders Found */}
          {orders.length > 1 && !selectedOrder && (
            <Card className="mb-8 border-border/50">
              <CardHeader>
                <CardTitle className="text-lg">
                  {orders.length} Orders Found
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {orders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="w-full rounded-lg border p-4 text-left transition-colors hover:bg-muted/50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium font-mono">
                          #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(order.created_at), "MMM dd, yyyy")}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={statusColors[order.status] || "bg-gray-500/10 text-gray-600"}
                        >
                          {statusLabels[order.status] || order.status}
                        </Badge>
                        <p className="mt-1 text-sm font-semibold text-primary">
                          {formatCurrency(order.total_amount)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Order Result */}
          {selectedOrder && (
            <Card className="border-border/50 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Package className="h-5 w-5 text-primary" />
                      Order #{selectedOrder.order_number || selectedOrder.id.slice(0, 8).toUpperCase()}
                    </CardTitle>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedOrder.created_at), "MMM dd, yyyy 'at' h:mm a")}
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`${statusColors[selectedOrder.status] || "bg-gray-500/10 text-gray-600"} font-medium`}
                  >
                    {statusLabels[selectedOrder.status] || selectedOrder.status}
                  </Badge>
                </div>

                {/* Courier Tracking Code Display */}
                {selectedOrder.courier_tracking_code && (
                  <div className="mt-4 flex items-center gap-3 rounded-lg bg-primary/5 p-3">
                    <Truck className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Courier Tracking Code</p>
                      <p className="font-mono font-semibold text-primary">
                        {selectedOrder.courier_tracking_code}
                      </p>
                    </div>
                  </div>
                )}

                {orders.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => setSelectedOrder(null)}
                  >
                    ← View All Orders
                  </Button>
                )}
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Status Timeline */}
                {selectedOrder.status !== "cancelled" && selectedOrder.status !== "returned" ? (
                  <div className="py-4">
                    <div className="relative flex justify-between">
                      {["pending", "processing", "shipped", "delivered"].map((step, index) => {
                        const currentStep = getStatusStep(selectedOrder.status);
                        const stepIndex = ["pending", "processing", "shipped", "delivered"].indexOf(step);
                        const isCompleted = currentStep >= 0 && (
                          (step === "pending" && currentStep >= 0) ||
                          (step === "processing" && currentStep >= 1) ||
                          (step === "shipped" && currentStep >= 4) ||
                          (step === "delivered" && currentStep >= 5)
                        );
                        const isCurrent = 
                          (step === "pending" && currentStep === 0) ||
                          (step === "processing" && currentStep >= 1 && currentStep <= 3) ||
                          (step === "shipped" && currentStep === 4) ||
                          (step === "delivered" && currentStep === 5);
                        
                        return (
                          <div key={step} className="flex flex-col items-center relative z-10">
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                                isCompleted || isCurrent
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30 bg-background text-muted-foreground"
                              } ${isCurrent ? "ring-4 ring-primary/20" : ""}`}
                            >
                              {statusIcons[step]}
                            </div>
                            <span
                              className={`mt-2 text-xs font-medium ${
                                isCompleted || isCurrent ? "text-primary" : "text-muted-foreground"
                              }`}
                            >
                              {statusLabels[step]}
                            </span>
                          </div>
                        );
                      })}
                      {/* Progress Line */}
                      <div className="absolute top-5 left-[10%] right-[10%] h-0.5 bg-muted-foreground/20">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              (getStatusStep(selectedOrder.status) >= 4 ? 2 : getStatusStep(selectedOrder.status) >= 1 ? 1 : 0) / 3 * 100 + 
                              (getStatusStep(selectedOrder.status) === 5 ? 33 : 0),
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-3 rounded-lg bg-destructive/10 py-6">
                    <XCircle className="h-6 w-6 text-destructive" />
                    <span className="font-medium text-destructive">
                      This order has been {selectedOrder.status}
                    </span>
                  </div>
                )}

                {/* Live Courier Tracking Status */}
                {(selectedOrder.courier_tracking_code || selectedOrder.courier_consignment_id) && (
                  <CourierTrackingStatus
                    orderId={selectedOrder.id}
                    trackingCode={selectedOrder.courier_tracking_code}
                    consignmentId={selectedOrder.courier_consignment_id}
                  />
                )}

                {/* Shipping Address */}
                {formatAddress(selectedOrder.shipping_address) && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="mb-2 flex items-center gap-2 font-semibold">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        Shipping Address
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedOrder.customer_name && <span className="font-medium text-foreground">{selectedOrder.customer_name}<br /></span>}
                        {formatAddress(selectedOrder.shipping_address)}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                {/* Order Items */}
                <div>
                  <h4 className="mb-3 font-semibold">Order Items</h4>
                  {orderItems.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      Loading items...
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {orderItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex gap-3 rounded-lg bg-muted/30 p-3"
                        >
                          {item.product_image ? (
                            <img
                              src={item.product_image}
                              alt={item.product_name}
                              className="h-16 w-16 rounded-md object-cover"
                            />
                          ) : (
                            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-muted">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                            </p>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Total */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(selectedOrder.total_amount - (selectedOrder.delivery_fee || 0))}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>{formatCurrency(selectedOrder.delivery_fee || 0)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-xl font-bold text-primary">
                      {formatCurrency(selectedOrder.total_amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {hasSearched && orders.length === 0 && !error && !isLoading && (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-center text-muted-foreground">
                  No orders found. Please check your details and try again.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
