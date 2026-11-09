import { format } from "date-fns";
import { Package, MapPin, CreditCard, Loader2, Phone, User, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { generateInvoicePDF } from "@/lib/invoiceGenerator";
import { useStoreSettings } from "@/hooks/useStoreSettings";

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
  order_number?: string | null;
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

interface OrderDetailsDialogProps {
  order: Order | null;
  orderItems: OrderItem[];
  loadingItems: boolean;
  onClose: () => void;
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  delivered: "bg-bubu-green/20 text-bubu-green-foreground border-bubu-green/30",
  cancelled: "bg-bubu-red/10 text-bubu-red border-bubu-red/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  paid: "bg-bubu-green/20 text-bubu-green-foreground border-bubu-green/30",
  failed: "bg-bubu-red/10 text-bubu-red border-bubu-red/20",
};

const formatCurrency = (amount: number) => {
  // Values are stored as whole BDT integers, no division needed
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// Parse shipping address from JSON string or object
const parseShippingAddress = (address: string | Record<string, string> | null): string => {
  if (!address) return "";
  
  try {
    // If it's a string, try to parse it as JSON
    const addressObj = typeof address === "string" ? JSON.parse(address) : address;
    
    // Build address parts, filtering out empty values
    const parts: string[] = [];
    
    // Road/Street line
    const roadParts = [
      addressObj.road_no && `Road ${addressObj.road_no}`,
      addressObj.road,
      addressObj.house_no && `House ${addressObj.house_no}`,
      addressObj.flat_no && `Flat ${addressObj.flat_no}`,
    ].filter(Boolean);
    if (roadParts.length > 0) parts.push(roadParts.join(", "));
    
    // Village/Area
    if (addressObj.village || addressObj.area) {
      parts.push(addressObj.village || addressObj.area);
    }
    
    // Thana/Upazilla, District line
    const locationParts = [
      addressObj.thana,
      addressObj.upazilla,
      addressObj.zilla || addressObj.district,
    ].filter(Boolean);
    if (locationParts.length > 0) parts.push(locationParts.join(", "));
    
    // Post office/postal code
    if (addressObj.post_office) {
      parts.push(`P.O: ${addressObj.post_office}`);
    }
    if (addressObj.postal_code) {
      parts.push(addressObj.postal_code);
    }
    
    return parts.join("\n") || "";
  } catch {
    // If parsing fails, return the string as-is (but clean it up)
    if (typeof address === "string") {
      return address;
    }
    return "";
  }
};

export function OrderDetailsDialog({
  order,
  orderItems,
  loadingItems,
  onClose,
}: OrderDetailsDialogProps) {
  const { settings: storeSettings } = useStoreSettings();
  
  if (!order) return null;

  const subtotal = order.subtotal || 0;
  const deliveryCharge = order.shipping_cost || order.delivery_fee || 0;
  const discount = order.discount || 0;

  // Build full address - try to parse JSON first, then fall back to simple fields
  const parsedAddress = parseShippingAddress(order.shipping_address);
  const simpleAddressParts = [
    order.shipping_address && typeof order.shipping_address === "string" && !order.shipping_address.startsWith("{") ? order.shipping_address : null,
    order.shipping_area,
    order.shipping_city,
  ].filter(Boolean);
  const fullAddress = parsedAddress || simpleAddressParts.join(", ") || "Not provided";

  const handleDownloadPDF = async () => {
    // Pass custom invoice terms from store settings
    await generateInvoicePDF(order, orderItems, storeSettings?.invoice_terms);
  };

  return (
    <Dialog open={!!order} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl bg-background rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header Section */}
        <DialogHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Package className="h-5 w-5 text-primary" />
                Order #{order.order_number || order.id.slice(0, 8).toUpperCase()}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {format(new Date(order.created_at), "MMMM dd, yyyy 'at' h:mm a")}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                disabled={loadingItems || orderItems.length === 0}
                className="rounded-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                Invoice
              </Button>
              <Badge
                variant="outline"
                className={`${statusColors[order.status]} font-medium rounded-lg`}
              >
                {statusLabels[order.status]}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Separator />

        {/* Customer & Shipping Info - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {/* Left Column - Delivery Address */}
          <Card className="border-border/50 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Delivery Address</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">{order.customer_name || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{order.customer_phone || "N/A"}</span>
                </div>
                <p className="text-muted-foreground pl-5 whitespace-pre-line">{fullAddress}</p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column - Payment Info */}
          <Card className="border-border/50 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CreditCard className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">Payment Details</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium capitalize">
                    {order.payment_method === "cod" 
                      ? "Cash on Delivery" 
                      : order.payment_method || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Status</span>
                  <Badge
                    variant="outline"
                    className={`${paymentStatusColors[order.payment_status || "pending"]} text-xs rounded-lg`}
                  >
                    {(order.payment_status || "pending").charAt(0).toUpperCase() + 
                     (order.payment_status || "pending").slice(1)}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Order Items Section */}
        <div className="py-4">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            Order Items
          </h4>

          {loadingItems ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : orderItems.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No items found for this order
            </p>
          ) : (
            <div className="space-y-3">
              {orderItems.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
                >
                  {item.product_image ? (
                    <img
                      src={item.product_image}
                      alt={item.product_name}
                      className="h-16 w-16 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product_name}</p>
                    {item.selected_variation && (item.selected_variation.size || item.selected_variation.color) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[
                          item.selected_variation.size,
                          item.selected_variation.color,
                        ].filter(Boolean).join(" / ")}
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      Qty: {item.quantity} × {formatCurrency(item.unit_price)}
                    </p>
                  </div>
                  <p className="font-semibold text-sm flex-shrink-0">
                    {formatCurrency(item.quantity * item.unit_price)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Financial Summary Section */}
        <div className="py-4">
          <Card className="border-border/50 rounded-xl bg-muted/20">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 text-sm">Order Summary</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivery Charge</span>
                  <span className="text-muted-foreground">+ {formatCurrency(deliveryCharge)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-bubu-green">- {formatCurrency(discount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between items-center pt-1">
                  <span className="font-bold text-base">Grand Total</span>
                  <span className="font-bold text-lg text-primary">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
