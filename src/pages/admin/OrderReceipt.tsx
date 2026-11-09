import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Printer, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type OrderRow = {
  id: string;
  created_at: string;
  source: string;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  shipping_address: Record<string, string> | null;
  delivery_fee: number;
  total_amount: number;
  payment_status: string;
  payment_method: string | null;
};

type ItemRow = {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function formatAddress(address: Record<string, string> | null) {
  if (!address) return "";
  const parts = [
    address.house_no,
    address.flat_no,
    address.road_no,
    address.village,
    address.post_office,
    address.thana,
    address.upazilla,
    address.zilla,
  ].filter(Boolean);
  return parts.join(", ");
}

export default function OrderReceipt() {
  const { orderId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const format = (searchParams.get("format") || "a4") as "a4" | "thermal";

  const [isLoading, setIsLoading] = useState(true);
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<ItemRow[]>([]);

  useEffect(() => {
    if (!orderId) return;

    (async () => {
      setIsLoading(true);
      try {
        const { data: o, error: oErr } = await supabase
          .from("orders")
          .select(
            "id, created_at, source, status, customer_name, customer_phone, customer_email, shipping_address, delivery_fee, total_amount, payment_status, payment_method"
          )
          .eq("id", orderId)
          .single();
        if (oErr) throw oErr;

        const { data: it, error: itErr } = await supabase
          .from("order_items")
          .select("id, product_name, quantity, unit_price")
          .eq("order_id", orderId)
          .order("created_at", { ascending: true });
        if (itErr) throw itErr;

        setOrder(o as any);
        setItems((it as any) || []);
      } catch (e) {
        console.error(e);
        setOrder(null);
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [orderId]);

  const subtotal = useMemo(
    () => items.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0),
    [items]
  );

  const containerClass = format === "thermal" ? "receipt receipt-thermal" : "receipt receipt-a4";

  return (
    <div className="min-h-screen bg-background">
      <div className="print-hidden border-b bg-background">
        <div className="container py-4 flex items-center justify-between gap-3">
          <Button variant="ghost" asChild>
            <Link to="/admin/orders">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Orders
            </Link>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant={format === "a4" ? "default" : "outline"}
              onClick={() => setSearchParams({ format: "a4" })}
            >
              A4
            </Button>
            <Button
              variant={format === "thermal" ? "default" : "outline"}
              onClick={() => setSearchParams({ format: "thermal" })}
            >
              Thermal
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </div>
        </div>
      </div>

      <main className="container py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !order ? (
          <div className="text-center text-muted-foreground py-20">Receipt not found.</div>
        ) : (
          <div className={containerClass}>
            <header className="text-center">
              <h1 className="text-xl font-extrabold tracking-tight">Fashion Elegance</h1>
              <p className="text-sm text-muted-foreground">POS Receipt</p>
              <div className="mt-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Order:</span>{" "}
                  <span className="font-mono">#{(order as any).order_number || order.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span>{new Date(order.created_at).toLocaleString()}</span>
                </div>
              </div>
            </header>

            <Separator className="my-4" />

            <section className="text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-right">{order.customer_name || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Phone</span>
                <span className="text-right">{order.customer_phone || "N/A"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Payment</span>
                <span className="text-right">
                  {(order.payment_method || "").toUpperCase()} • {order.payment_status}
                </span>
              </div>
              {!!formatAddress(order.shipping_address) && (
                <div className="mt-2">
                  <div className="text-muted-foreground">Address</div>
                  <div className="mt-1">{formatAddress(order.shipping_address)}</div>
                </div>
              )}
            </section>

            <Separator className="my-4" />

            <section>
              <h2 className="text-sm font-semibold">Items</h2>
              <div className="mt-2 space-y-2">
                {items.map((i) => (
                  <div key={i.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{i.product_name}</div>
                      <div className="text-muted-foreground">
                        {i.quantity} × {formatCurrency(Number(i.unit_price))}
                      </div>
                    </div>
                    <div className="font-medium whitespace-nowrap">
                      {formatCurrency(Number(i.unit_price) * Number(i.quantity))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <Separator className="my-4" />

            <section className="text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className="font-medium">{formatCurrency(order.delivery_fee)}</span>
              </div>
              <div className="mt-2 flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-semibold">{formatCurrency(order.total_amount)}</span>
              </div>
            </section>

            <Separator className="my-4" />

            <footer className="text-center text-xs text-muted-foreground">
              Thank you for shopping with Fashion Elegance.
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
