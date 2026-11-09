import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Package,
  Phone,
  MapPin,
  ArrowRight,
  Home,
  ShoppingBag,
  MessageCircle,
} from "lucide-react";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(n);
}

interface OrderItem {
  title: string;
  qty: number;
  price: number;
  image?: string;
  variation?: Record<string, string>;
}

interface OrderData {
  orderId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  totalAmount: number;
  shippingCost: number;
  items: OrderItem[];
  isNewUser?: boolean;
}

export default function OrderSuccessPage() {
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState<OrderData | null>(null);

  useEffect(() => {
    // Get order data from sessionStorage (set during checkout)
    const storedData = sessionStorage.getItem("lastOrder");
    if (storedData) {
      try {
        setOrderData(JSON.parse(storedData));
        // Clear after reading so refresh doesn't show stale data
        sessionStorage.removeItem("lastOrder");
      } catch {
        // Invalid data, redirect home
        navigate("/");
      }
    } else {
      // No order data, redirect home
      navigate("/");
    }
  }, [navigate]);

  if (!orderData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 text-muted-foreground mx-auto animate-pulse" />
          <p className="mt-4 text-muted-foreground">Loading order details...</p>
        </div>
      </div>
    );
  }

  const orderIdShort = orderData.orderId.slice(0, 8).toUpperCase();
  const whatsappNumber = "8801929110024";
  const phoneNumber = "+8801929110024";
  const whatsappMessage = encodeURIComponent(
    `Hi, I just placed an order. Order ID: ${orderIdShort}. Can you confirm my order?`
  );

  return (
    <div className="min-h-screen bg-background">
      <HeaderNav />

      <main className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {/* Success Header */}
        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-foreground">
            অর্ডার সম্পন্ন হয়েছে!
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Thank you for your order, {orderData.customerName}!
          </p>
          {orderData.isNewUser && (
            <p className="text-sm text-primary mt-2">
              📧 Check your email to set up your account and track future orders.
            </p>
          )}
        </div>

        {/* Order ID Card */}
        <Card className="mb-6 border-2 border-primary/20 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <CardContent className="p-6 text-center bg-primary/5">
            <p className="text-sm text-muted-foreground mb-1">Order ID</p>
            <p className="font-mono text-2xl font-bold text-primary tracking-wider">
              #{orderIdShort}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Save this ID for tracking and reference
            </p>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-6 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <CardHeader className="bg-muted/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Order Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {orderData.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  {item.image && (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-12 h-12 object-cover rounded-lg border"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.title}</p>
                    {item.variation && Object.keys(item.variation).length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {Object.entries(item.variation)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{formatPrice(item.price)}</p>
                    <p className="text-xs text-muted-foreground">×{item.qty}</p>
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {formatPrice(
                    orderData.items.reduce((sum, i) => sum + i.price * i.qty, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {orderData.shippingCost === 0
                    ? "Free"
                    : formatPrice(orderData.shippingCost)}
                </span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span className="text-primary">
                  {formatPrice(orderData.totalAmount)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card className="mb-6 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <CardHeader className="bg-muted/50 pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              What's Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="font-medium">Order Confirmation</p>
                  <p className="text-sm text-muted-foreground">
                    We'll call you within 24 hours to confirm your order.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="font-medium">Order Processing</p>
                  <p className="text-sm text-muted-foreground">
                    Your order will be prepared and handed to our courier partner.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="font-medium">Delivery</p>
                  <p className="text-sm text-muted-foreground">
                    Expect delivery within 2-5 business days depending on your location.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact & Track Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <Button
            asChild
            size="lg"
            className="rounded-xl h-14 text-base"
          >
            <Link to="/track-order">
              <Package className="mr-2 h-5 w-5" />
              Track Your Order
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-xl h-14 text-base border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
          >
            <a
              href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp Us
            </a>
          </Button>

          <Button
            asChild
            variant="outline"
            size="lg"
            className="rounded-xl h-14 text-base"
          >
            <a href={`tel:${phoneNumber}`}>
              <Phone className="mr-2 h-5 w-5" />
              Call Us
            </a>
          </Button>

          <Button
            asChild
            variant="ghost"
            size="lg"
            className="rounded-xl h-14 text-base"
          >
            <Link to="/">
              <Home className="mr-2 h-5 w-5" />
              Continue Shopping
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {/* Trust Message */}
        <div className="text-center text-sm text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-500 delay-400">
          <p>
            ❤️ Thank you for shopping with Friction!
          </p>
          <p className="mt-1">
            Questions? Contact us anytime via WhatsApp or phone.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
