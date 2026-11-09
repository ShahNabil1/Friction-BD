import { useState, useEffect } from "react";
import { Banknote, CreditCard, Smartphone, Loader2, Gift, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { POSCartItem, POSCustomer } from "@/hooks/usePOSCart";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";

interface POSCheckoutProps {
  items: POSCartItem[];
  customer: POSCustomer | null;
  discount: number;
  subtotal: number;
  total: number;
  onSuccess: (orderId: string) => void;
  onClear: () => void;
}

type PaymentMethod = "cash" | "card" | "mobile_banking";

const POINTS_VALUE = 0.75; // 1 point = 0.75 BDT
const MIN_REDEEM_THRESHOLD = 100; // Minimum points to redeem

export function POSCheckout({
  items,
  customer,
  discount,
  subtotal,
  total,
  onSuccess,
  onClear,
}: POSCheckoutProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);

  // Loyalty points state
  const [availablePoints, setAvailablePoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState<string>("");
  const [pointsError, setPointsError] = useState<string>("");

  // Fetch customer loyalty points
  useEffect(() => {
    if (customer?.id) {
      supabase
        .from("customers")
        .select("loyalty_points")
        .eq("id", customer.id)
        .single()
        .then(({ data }) => {
          setAvailablePoints(data?.loyalty_points ?? 0);
        });
    } else {
      setAvailablePoints(0);
    }
    setRedeemPoints("");
    setPointsError("");
  }, [customer?.id]);

  const parsedRedeemPoints = parseInt(redeemPoints) || 0;
  const pointsMonetaryValue = Math.floor(parsedRedeemPoints * POINTS_VALUE);
  const remainingDue = Math.max(0, total - pointsMonetaryValue);

  // Validate points input
  useEffect(() => {
    if (!redeemPoints || parsedRedeemPoints === 0) {
      setPointsError("");
      return;
    }
    if (availablePoints < MIN_REDEEM_THRESHOLD) {
      setPointsError(`Minimum ${MIN_REDEEM_THRESHOLD} points required to redeem.`);
    } else if (parsedRedeemPoints > availablePoints) {
      setPointsError(`Cannot exceed available balance (${availablePoints} pts).`);
    } else if (pointsMonetaryValue > total) {
      setPointsError(`Points value (৳${pointsMonetaryValue}) exceeds bill total.`);
    } else {
      setPointsError("");
    }
  }, [redeemPoints, availablePoints, parsedRedeemPoints, pointsMonetaryValue, total]);

  const hasValidPoints = parsedRedeemPoints > 0 && !pointsError;

  const paymentMethods = [
    { id: "cash" as const, label: "Cash", icon: Banknote },
    { id: "card" as const, label: "Card", icon: CreditCard },
    { id: "mobile_banking" as const, label: "bKash/Nagad", icon: Smartphone },
  ];

  const handleCheckout = async () => {
    if (items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        product_name: item.product.title,
        product_image: item.product.images?.[0] || null,
        quantity: item.quantity,
        price: item.unitPrice,
        size: item.selectedSize || null,
        color: item.selectedColor || null,
      }));

      // Defensive: verify customerId still exists in customers table; drop it if not.
      let safeCustomerId: string | null = customer?.customerId || null;
      if (safeCustomerId) {
        const { data: existsRow } = await supabase
          .from("customers")
          .select("id")
          .eq("id", safeCustomerId)
          .maybeSingle();
        if (!existsRow) safeCustomerId = null;
      }

      const { data: orderId, error } = await supabase.rpc("create_manual_order", {
        p_user_id: user?.id || null,
        p_customer_id: safeCustomerId,
        p_customer_name: customer?.name || "Walk-in Customer",
        p_customer_phone: customer?.phone || "N/A",
        p_customer_email: customer?.email || null,
        p_shipping_address: customer?.address
          ? { address: customer.address }
          : null,
        p_delivery_fee: 0,
        p_payment_status: "paid",
        p_payment_method: selectedPayment,
        p_items: orderItems,
      });


      if (error) throw error;

      // Update the order with POS-specific fields + loyalty data
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          source: "pos",
          status: "delivered",
          discount: discount,
          subtotal: subtotal,
          total_amount: total,
          points_redeemed: hasValidPoints ? parsedRedeemPoints : 0,
          points_monetary_value: hasValidPoints ? pointsMonetaryValue : 0,
          payment_method: hasValidPoints && remainingDue > 0
            ? `points+${selectedPayment}`
            : hasValidPoints && remainingDue === 0
              ? "points"
              : selectedPayment,
        })
        .eq("id", orderId);

      if (updateError) throw updateError;

      // Deduct redeemed points from customer
      const loyaltyCustomerId = customer?.customerId;
      if (hasValidPoints && loyaltyCustomerId) {
        const { error: pointsError } = await supabase
          .from("customers")
          .update({
            loyalty_points: availablePoints - parsedRedeemPoints,
            updated_at: new Date().toISOString(),
          })
          .eq("id", loyaltyCustomerId);

        if (pointsError) console.error("Failed to deduct points:", pointsError);
      }

      toast({
        title: "Order Complete",
        description: `Order #${orderId.slice(0, 8).toUpperCase()} processed successfully`,
      });

      onSuccess(orderId);
    } catch (error: any) {
      console.error("POS checkout error:", error);
      toast({
        title: "Checkout Failed",
        description: error.message || "Failed to process order",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const canRedeem = customer?.id && availablePoints >= MIN_REDEEM_THRESHOLD;

  return (
    <div className="space-y-4 p-4">
      {/* Loyalty Points Section */}
      {customer?.id && (
        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-foreground">Loyalty Points</h3>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Available: <strong className="text-foreground">{availablePoints} pts</strong></span>
            <span>Value: <strong className="text-foreground">৳{Math.floor(availablePoints * POINTS_VALUE)}</strong></span>
          </div>

          {!canRedeem && availablePoints > 0 && (
            <p className="text-xs text-muted-foreground">
              Min. {MIN_REDEEM_THRESHOLD} points needed to redeem.
            </p>
          )}

          {canRedeem && (
            <div className="space-y-1.5">
              <Label htmlFor="redeem-points" className="text-xs">Redeem Points</Label>
              <Input
                id="redeem-points"
                type="number"
                min={0}
                max={availablePoints}
                placeholder={`Enter points (max ${availablePoints})`}
                value={redeemPoints}
                onChange={(e) => setRedeemPoints(e.target.value)}
                className="h-8 text-sm"
              />
              {pointsError && (
                <div className="flex items-center gap-1 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>{pointsError}</span>
                </div>
              )}
              {hasValidPoints && (
                <div className="rounded bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1.5 text-xs space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Points Discount</span>
                    <span className="font-medium text-emerald-600">-৳{pointsMonetaryValue}</span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span className="text-foreground">Remaining Due</span>
                    <span className="text-foreground">৳{remainingDue.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment Method Selection */}
      {remainingDue > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {hasValidPoints ? "Pay Remaining Via" : "Payment Method"}
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {paymentMethods.map((method) => (
              <Button
                key={method.id}
                variant={selectedPayment === method.id ? "default" : "outline"}
                className={cn(
                  "flex h-auto flex-col gap-1 py-3",
                  selectedPayment === method.id && "ring-2 ring-primary ring-offset-2"
                )}
                onClick={() => setSelectedPayment(method.id)}
              >
                <method.icon className="h-5 w-5" />
                <span className="text-xs">{method.label}</span>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="lg"
          className="w-full"
          onClick={onClear}
          disabled={items.length === 0 || isProcessing}
        >
          Clear Cart
        </Button>
        <Button
          size="lg"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          onClick={handleCheckout}
          disabled={items.length === 0 || isProcessing || !!pointsError}
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>Pay {formatPrice(remainingDue > 0 ? remainingDue : total)}</>
          )}
        </Button>
      </div>
    </div>
  );
}
