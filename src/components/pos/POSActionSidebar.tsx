import { useState } from "react";
import {
  X,
  Package,
  Plus,
  Banknote,
  CreditCard,
  Wallet,
  QrCode,
  Clock,
  Percent,
  User,
  Save,
  RotateCcw,
  Trash2,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { POSCartItem, POSCustomer, POSDiscount } from "@/hooks/usePOSCart";
import { POSContextMenu } from "./POSContextMenu";
import { POSSplitPaymentDialog, PaymentTender, LoyaltyRedemption } from "./POSSplitPaymentDialog";
import { POSTransactionSuccessDialog } from "./POSTransactionSuccessDialog";
import { POSCustomerSearch } from "./POSCustomerSearch";
import { POSCreditSaleDialog } from "./POSCreditSaleDialog";
import { POSPinDialog } from "./POSPinDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { cn } from "@/lib/utils";
import bkashLogo from "@/assets/brands/bkash.png";
import nagadLogo from "@/assets/brands/nagad.png";
import cardLogo from "@/assets/brands/card.png";
import banglaQrLogo from "@/assets/brands/bangla-qr.png";
import dueLogo from "@/assets/brands/due.jpg";
import cashLogo from "@/assets/brands/cash.png";

export interface CashPaymentData {
  tenderedAmount: number;
  changeAmount: number;
}

export interface CreditPaymentData {
  paidAmount: number;
  dueAmount: number;
}

interface POSActionSidebarProps {
  items: POSCartItem[];
  customer: POSCustomer | null;
  discount: number;
  subtotal: number;
  total: number;
  selectedItemIndex: number | null;
  onDeleteSelected: () => void;
  onOpenQuantity: () => void;
  onNewSale: () => void;
  onSetDiscount: (discount: POSDiscount | null) => void;
  onOpenDiscount: () => void;
  onOpenCustomerSearch: () => void;
  onSetCustomer: (customer: POSCustomer | null) => void;
  onPrintLast: () => void;
  onCheckoutSuccess: (orderId: string, paymentMethod: string, cashData?: CashPaymentData, creditData?: CreditPaymentData) => void;
  onSaveSale?: () => void;
  onOpenDrafts?: () => void;
  draftsCount?: number;
  outletId?: string;
  activeShortcut?: string | null;
}

type PaymentMethod = "cash" | "nagad" | "due" | "bangla_qr" | "card" | "bkash";

// Map method IDs to DB-friendly strings
const paymentMethodMap: Record<PaymentMethod, string> = {
  cash: "cash",
  card: "card",
  bkash: "mobile_banking",
  nagad: "mobile_banking",
  bangla_qr: "mobile_banking",
  due: "due",
};

export function POSActionSidebar({
  items,
  customer,
  discount,
  subtotal,
  total,
  selectedItemIndex,
  onDeleteSelected,
  onOpenQuantity,
  onNewSale,
  onSetDiscount,
  onOpenDiscount,
  onOpenCustomerSearch,
  onSetCustomer,
  onPrintLast,
  onCheckoutSuccess,
  onSaveSale,
  onOpenDrafts,
  draftsCount = 0,
  outletId,
  activeShortcut,
}: POSActionSidebarProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showSplitPaymentDialog, setShowSplitPaymentDialog] = useState(false);
  const [showQuickCustomerDialog, setShowQuickCustomerDialog] = useState(false);
  const [showCreditSaleDialog, setShowCreditSaleDialog] = useState(false);
  const [showCreditPinDialog, setShowCreditPinDialog] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [lastCashData, setLastCashData] = useState<CashPaymentData | null>(null);
  const [lastCreditData, setLastCreditData] = useState<CreditPaymentData | null>(null);
  const [lastPaymentTenders, setLastPaymentTenders] = useState<PaymentTender[]>([]);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Remove the duplicate inner paymentMethodMap (now at module level)

  // Proceed directly to payment (called after customer dialog)
  const proceedToPayment = (freshCustomer?: POSCustomer | null) => {
    if (selectedPayment === "due") {
      handleDuePayment(freshCustomer);
    } else {
      // All non-due payments go through the split payment dialog
      setShowSplitPaymentDialog(true);
    }
  };

  // Handle Due payment method selection - requires supervisor PIN
  // Accept optional freshCustomer for when called right after customer creation/selection
  const handleDuePayment = (freshCustomer?: POSCustomer | null) => {
    const activeCustomer = freshCustomer ?? customer;
    // Check if customer is Walk-in (no real customer selected)
    if (!activeCustomer || activeCustomer.name === "Walk-in Customer" || !activeCustomer.phone || activeCustomer.phone === "N/A") {
      toast({
        title: "Cannot Process Credit Sale",
        description: "Cannot give due to Walk-in Customer. Please select a registered customer.",
        variant: "destructive",
      });
      return;
    }
    // Require supervisor PIN authorization first
    setShowCreditPinDialog(true);
  };

  // Verify supervisor PIN for credit sale
  const verifyCreditPin = async (pin: string): Promise<boolean> => {
    if (!outletId) {
      toast({
        title: "No Outlet Selected",
        description: "Cannot verify PIN without outlet context",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: hasPin, error: hasPinError } = await supabase.rpc(
        "outlet_has_master_pin",
        { p_outlet_id: outletId }
      );
      if (hasPinError) throw hasPinError;

      if (!hasPin) {
        toast({
          title: "PIN Not Configured",
          description: "Supervisor PIN not set for this outlet. Contact Admin.",
          variant: "destructive",
        });
        return false;
      }

      const { data: isValid, error } = await supabase.rpc("verify_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: pin,
      });
      if (error) throw error;

      if (isValid) {
        setShowCreditPinDialog(false);
        setShowCreditSaleDialog(true);
        return true;
      }

      return false;
    } catch (error: any) {
      console.error("PIN verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Could not verify PIN",
        variant: "destructive",
      });
      return false;
    }
  };

  // Handle payment method selection - intercept "due"
  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setSelectedPayment(method);
  };

  // Main checkout trigger - intercept if no customer selected
  const handleCheckout = () => {
    if (items.length === 0) {
      toast({
        title: "Cart Empty",
        description: "Add items to cart before checkout",
        variant: "destructive",
      });
      return;
    }

    // If no customer is selected, show quick customer dialog first
    if (!customer) {
      setShowQuickCustomerDialog(true);
      return;
    }

    // Customer is selected - proceed to payment
    proceedToPayment();
  };

  // Deduct stock from outlet inventory for each cart item
  // Returns true if ALL deductions succeeded, false if ANY failed (transaction guard)
  const deductOutletStock = async (orderId: string): Promise<{ success: boolean; errors: string[] }> => {
    if (!outletId) {
      console.warn("No outlet ID - skipping stock deduction");
      return { success: false, errors: ["No outlet ID configured"] };
    }

    const stockErrors: string[] = [];
    const { getBestInventoryRowForDeduction } = await import("@/hooks/useOutletInventory");

    for (const item of items) {
      try {
        // Find the variant ID if size/color is specified
        let variantId: string | null = null;
        
        if (item.selectedSize || item.selectedColor) {
          const { data: variant } = await supabase
            .from("product_variants")
            .select("id")
            .eq("product_id", item.product.id)
            .eq("size", item.selectedSize || "")
            .eq("color", item.selectedColor || "")
            .maybeSingle();
          
          variantId = variant?.id || null;
        }

        // Get the best inventory row for deduction (highest quantity, handles duplicates)
        const bestRow = await getBestInventoryRowForDeduction(outletId, item.product.id, variantId);

        if (!bestRow) {
          stockErrors.push(`${item.product.title}: No inventory record found`);
          continue;
        }

        // Check if there's enough stock
        if (bestRow.quantity < item.quantity) {
          stockErrors.push(`${item.product.title}: Insufficient stock (have ${bestRow.quantity}, need ${item.quantity})`);
          continue;
        }

        // Deduct from the best row
        const newQty = bestRow.quantity - item.quantity;
        const { error: updateError } = await supabase
          .from("outlet_inventory")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", bestRow.id);

        if (updateError) {
          stockErrors.push(`${item.product.title}: ${updateError.message}`);
          continue;
        }

        // Log the stock deduction
        await supabase.from("inventory_logs").insert({
          outlet_id: outletId,
          product_id: item.product.id,
          variant_id: variantId,
          qty_change: -item.quantity,
          action_type: "pos_sale",
          notes: `POS Sale - Order ${orderId.slice(0, 8).toUpperCase()}`,
          user_id: user?.id,
          reference_id: orderId,
        });

      } catch (err: any) {
        stockErrors.push(`${item.product.title}: ${err.message}`);
      }
    }

    // Return result - if any errors, mark as failed
    return { 
      success: stockErrors.length === 0, 
      errors: stockErrors 
    };
  };

  // Credit sale data interface
  interface CreditSaleData {
    type: "full" | "partial";
    paidAmount: number;
    dueAmount: number;
  }

  // Process order with optional split tenders or credit sale data
  const processOrder = async (tenders?: PaymentTender[], changeAmount?: number, creditData?: CreditSaleData, loyaltyRedemption?: LoyaltyRedemption) => {
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

      // Determine payment status based on credit data
      let paymentStatus = "paid";
      if (creditData) {
        paymentStatus = creditData.type === "full" ? "unpaid" : "partial";
      }

      // Determine the primary payment method label for the order
      let primaryMethod = "cash";
      if (tenders && tenders.length > 0) {
        primaryMethod = tenders.length === 1 ? tenders[0].method : "split";
      } else if (creditData) {
        primaryMethod = "due";
      }

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
        p_shipping_address: customer?.address ? { address: customer.address } : null,
        p_delivery_fee: 0,
        p_payment_status: paymentStatus,
        p_payment_method: primaryMethod,
        p_items: orderItems,
      });


      if (error) throw error;

      let orderStatus = "paid";
      if (creditData) {
        orderStatus = "due";
      }

      const updateData: Record<string, unknown> = {
        source: "pos",
        status: orderStatus,
        discount: discount,
        subtotal: subtotal,
        total_amount: total,
        outlet_id: outletId || null,
      };

      // Add split payment details
      if (tenders && tenders.length > 0) {
        updateData.payment_details = tenders.map((t) => ({ method: t.method, label: t.label, amount: t.amount }));
        updateData.payment_method = tenders.length === 1 ? tenders[0].method : "split";
        updateData.paid_amount = total;
        updateData.due_amount = 0;

        // If any cash tender, store tendered/change
        const cashTender = tenders.find((t) => t.method === "cash");
        if (cashTender) {
          const totalTendered = tenders.reduce((s, t) => s + t.amount, 0);
          updateData.tendered_amount = totalTendered;
          updateData.change_amount = changeAmount || 0;
        }
      }

      // Add credit sale data if available
      if (creditData) {
        updateData.paid_amount = creditData.paidAmount;
        updateData.due_amount = creditData.dueAmount;
      }

      // Add loyalty redemption data to order
      if (loyaltyRedemption && loyaltyRedemption.pointsUsed > 0) {
        updateData.points_redeemed = loyaltyRedemption.pointsUsed;
        updateData.points_monetary_value = loyaltyRedemption.monetaryValue;
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update(updateData)
        .eq("id", orderId);

      if (updateError) throw updateError;

      // CRITICAL: Deduct loyalty points from customer balance
      const loyaltyCustomerId = customer?.customerId;
      if (loyaltyRedemption && loyaltyRedemption.pointsUsed > 0 && loyaltyCustomerId) {
        try {
          const { data: custData } = await supabase
            .from("customers")
            .select("loyalty_points")
            .eq("id", loyaltyCustomerId)
            .single();

          const currentPoints = custData?.loyalty_points ?? 0;
          const newBalance = Math.max(0, currentPoints - loyaltyRedemption.pointsUsed);

          await supabase
            .from("customers")
            .update({ loyalty_points: newBalance, updated_at: new Date().toISOString() })
            .eq("id", loyaltyCustomerId);
        } catch (loyaltyErr) {
          console.error("Failed to deduct loyalty points:", loyaltyErr);
        }
      }

      // CRITICAL: Deduct stock
      const stockResult = await deductOutletStock(orderId);

      if (!stockResult.success) {
        console.error("Stock deduction failed:", stockResult.errors);
        await supabase
          .from("orders")
          .update({ admin_notes: `⚠️ Stock deduction failed: ${stockResult.errors.join("; ")}` })
          .eq("id", orderId);

        toast({
          title: "Inventory Not Updated",
          description: stockResult.errors.slice(0, 2).join(" • ") || "Sale saved but stock was not deducted. Please review inventory.",
          variant: "destructive",
        });
      }

      // Loyalty points are awarded automatically by the DB trigger `award_loyalty_points`
      // when payment_status becomes 'paid'. No manual increment needed here.

      // Store for success dialog
      setLastOrderId(orderId);
      setLastPaymentTenders(tenders || []);
      const cashTender = tenders?.find((t) => t.method === "cash");
      setLastCashData(cashTender ? { tenderedAmount: cashTender.amount, changeAmount: changeAmount || 0 } : null);
      setLastCreditData(creditData ? { paidAmount: creditData.paidAmount, dueAmount: creditData.dueAmount } : null);
      
      // Close dialogs
      setShowSplitPaymentDialog(false);
      setShowCreditSaleDialog(false);
      
      // Show success overlay
      setShowSuccessDialog(true);
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

  // Handle split payment confirmation
  const handleSplitPaymentConfirm = (tenders: PaymentTender[], changeAmount: number, loyaltyRedemption?: LoyaltyRedemption) => {
    processOrder(tenders, changeAmount, undefined, loyaltyRedemption);
  };

  // Handle credit sale confirmation
  const handleCreditSaleConfirm = (type: "full" | "partial", paidAmount: number, dueAmount: number) => {
    processOrder(undefined, 0, { type, paidAmount, dueAmount });
  };

  // Determine the primary payment method label for success dialog
  const getLastPaymentMethodLabel = () => {
    if (lastPaymentTenders.length === 0) return "due";
    if (lastPaymentTenders.length === 1) return lastPaymentTenders[0].method;
    return "split";
  };

  // Handle success dialog close - trigger parent callback
  const handleSuccessClose = () => {
    setShowSuccessDialog(false);
    onCheckoutSuccess(lastOrderId, getLastPaymentMethodLabel(), lastCashData || undefined, lastCreditData || undefined);
  };

  // Handle print from success dialog — do NOT close modal
  const handlePrintFromSuccess = () => {
    onCheckoutSuccess(lastOrderId, getLastPaymentMethodLabel(), lastCashData || undefined, lastCreditData || undefined);
  };

  // Wrapped handlers to show toast when no item selected
  const handleQuantityClick = () => {
    if (selectedItemIndex === null) {
      toast({
        title: "No Item Selected",
        description: "Please select an item first",
        variant: "destructive",
      });
      return;
    }
    onOpenQuantity();
  };

  const handleDeleteClick = () => {
    if (selectedItemIndex === null) {
      toast({
        title: "No Item Selected",
        description: "Select an item to remove",
        variant: "destructive",
      });
      return;
    }
    onDeleteSelected();
    toast({
      title: "Item Removed",
      description: "Item has been removed from cart",
    });
  };

  // Top action buttons - Product Actions
  const productActions = [
    { icon: Package, label: "Quantity", onClick: handleQuantityClick, shortcut: "F4", tooltip: "Change quantity (F4)" },
    { icon: X, label: "Delete", onClick: handleDeleteClick, shortcut: "Del", tooltip: "Remove item (Delete/F5)" },
    { icon: Plus, label: "New Sale", onClick: onNewSale, shortcut: "F8", tooltip: "Start new sale (F8)" },
  ];

  // Payment methods
  const paymentMethods: { id: PaymentMethod; label: string; icon?: typeof Banknote; img?: string; shortcut?: string }[] = [
    { id: "cash", label: "Cash", img: cashLogo, shortcut: "F12" },
    { id: "nagad", label: "Nagad", img: nagadLogo },
    { id: "bkash", label: "bKash", img: bkashLogo },
    { id: "card", label: "Card", img: cardLogo },
    { id: "bangla_qr", label: "Bangla QR", img: banglaQrLogo },
    { id: "due", label: "Due", img: dueLogo },
  ];

  // Truncate customer name for button display
  const customerDisplayName = customer?.name 
    ? (customer.name.length > 12 ? customer.name.slice(0, 12) + "..." : customer.name)
    : "Customer";

  // Sale controls
  const saleControls: { icon: typeof Percent; label: string; onClick: () => void; shortcut?: string; isActive?: boolean }[] = [
    { icon: Percent, label: "Discount", onClick: onOpenDiscount },
    { icon: User, label: customerDisplayName, onClick: onOpenCustomerSearch, isActive: !!customer },
  ];


  // Neutral button style
  const neutralBtnClass = "h-12 flex-col gap-0.5 rounded-lg bg-muted/50 hover:bg-muted text-foreground border-0 shadow-none font-normal transition-colors";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-full w-full flex-col bg-muted/30 p-3 gap-3 overflow-y-auto">
        {/* Product Actions Card */}
        <Card className="p-3 shadow-sm">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Product Actions</p>
          <div className="grid grid-cols-4 gap-2">
            {productActions.map((btn) => {
              const isActive = activeShortcut === btn.shortcut || 
                (btn.shortcut === "Del" && (activeShortcut === "Delete" || activeShortcut === "F5"));
              return (
                <Tooltip key={btn.label}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        neutralBtnClass, 
                        "relative",
                        isActive && "bg-primary/20 ring-2 ring-primary scale-95 transition-transform"
                      )}
                      onClick={btn.onClick}
                    >
                      {btn.shortcut && (
                        <span className="absolute top-1 left-1.5 text-[9px] font-medium text-muted-foreground">{btn.shortcut}</span>
                      )}
                      <btn.icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
                      <span className="text-[10px]">{btn.label}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {btn.tooltip}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </Card>

      {/* Payment Methods Card */}
      <Card className="p-3 shadow-sm">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Payment Method</p>
        <div className="grid grid-cols-3 gap-2">
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant="ghost"
              className={cn(
                neutralBtnClass,
                "relative",
                selectedPayment === method.id && "bg-primary/10 ring-1 ring-primary text-primary"
              )}
              onClick={() => handlePaymentMethodSelect(method.id)}
            >
              {method.shortcut && (
                <span className="absolute top-1 left-1.5 text-[9px] font-medium text-muted-foreground">{method.shortcut}</span>
              )}
              {method.img ? (
                <img src={method.img} alt={method.label} className="h-10 w-auto object-contain" />
              ) : method.icon ? (
                <>
                  <method.icon className={cn("h-4 w-4", selectedPayment === method.id ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-[10px]">{method.label}</span>
                </>
              ) : null}
            </Button>
          ))}
        </div>
      </Card>

      {/* Sale Controls Card */}
      <Card className="p-3 shadow-sm">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Sale Controls</p>
        <div className="grid grid-cols-3 gap-2">
          {saleControls.map((btn) => (
            <Button
              key={btn.label}
              variant="ghost"
              className={cn(
                neutralBtnClass, 
                "relative",
                btn.isActive && "bg-primary/10 ring-1 ring-primary text-primary"
              )}
              onClick={btn.onClick}
            >
              {btn.shortcut && (
                <span className="absolute top-1 left-1.5 text-[9px] font-medium text-muted-foreground">{btn.shortcut}</span>
              )}
              <btn.icon className={cn("h-4 w-4", btn.isActive ? "text-primary" : "text-muted-foreground")} />
              <span className={cn("text-[10px] truncate max-w-full", btn.isActive && "text-primary font-medium")}>{btn.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Save & Open Sales Row */}
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            variant="ghost"
            className={cn(neutralBtnClass, "relative")}
            onClick={onSaveSale}
            disabled={items.length === 0}
          >
            <span className="absolute top-1 left-1.5 text-[9px] font-medium text-muted-foreground">F9</span>
            <Save className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px]">Save Sale</span>
          </Button>
          <Button
            variant="ghost"
            className={cn(neutralBtnClass, "relative")}
            onClick={onOpenDrafts}
          >
            {draftsCount > 0 && (
              <span className="absolute top-1 right-1.5 text-[9px] bg-primary text-primary-foreground rounded-full px-1.5 font-bold">
                {draftsCount}
              </span>
            )}
            <RotateCcw className="h-4 w-4 text-muted-foreground" />
            <span className="text-[10px]">Open Sales</span>
          </Button>
        </div>
      </Card>

      {/* Spacer */}
      <div className="flex-1 min-h-4" />

      {/* Total Summary Card */}
      <Card className="p-4 shadow-sm">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span className="font-medium">-{formatPrice(discount)}</span>
            </div>
          )}
          <div className="border-t pt-3 mt-2">
            <div className="flex justify-between items-baseline">
              <span className="text-sm font-medium text-muted-foreground">Total</span>
              <span className="text-2xl font-bold text-foreground">{formatPrice(total)}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        {/* Void Order */}
        <Button
          variant="ghost"
          className="h-11 flex-col gap-0.5 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive border-0 shadow-none font-normal transition-colors"
          onClick={onNewSale}
          disabled={items.length === 0}
        >
          <Trash2 className="h-4 w-4" />
          <span className="text-[9px]">Void</span>
        </Button>

        {/* More Menu */}
        <Button
          variant="ghost"
          className={cn(neutralBtnClass, "h-11")}
          onClick={() => setShowContextMenu(true)}
        >
          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-[9px]">More</span>
        </Button>
      </div>

      {/* Primary Payment Button */}
      <Button
        id="pos-payment-btn"
        className="h-14 w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-lg transition-all"
        onClick={handleCheckout}
        disabled={items.length === 0 || isProcessing}
      >
        {isProcessing ? (
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
        ) : (
          <span className="mr-2 text-xs font-medium opacity-75">F10</span>
        )}
        {isProcessing ? "Processing..." : "PAYMENT"}
      </Button>

        {/* Context Menu Sheet */}
        <POSContextMenu
          open={showContextMenu}
          onClose={() => setShowContextMenu(false)}
        />

        {/* Split Payment Dialog */}
        <POSSplitPaymentDialog
          open={showSplitPaymentDialog}
          onClose={() => setShowSplitPaymentDialog(false)}
          onConfirm={handleSplitPaymentConfirm}
          total={total}
          isProcessing={isProcessing}
          customerLoyaltyPoints={customer?.loyaltyPoints ?? 0}
          customerName={customer?.name}
        />

        {/* Transaction Success Dialog */}
        <POSTransactionSuccessDialog
          open={showSuccessDialog}
          onClose={handleSuccessClose}
          onPrint={handlePrintFromSuccess}
          changeAmount={lastCashData?.changeAmount || 0}
          paymentMethod={paymentMethodMap[selectedPayment]}
        />

        {/* Customer Search & Select Dialog (checkout interceptor) */}
        <POSCustomerSearch
          open={showQuickCustomerDialog}
          onClose={() => setShowQuickCustomerDialog(false)}
          onSelectCustomer={(c) => {
            onSetCustomer(c);
            // Pass fresh customer directly to avoid stale state
            setTimeout(() => proceedToPayment(c), 100);
          }}
          onProceedToPayment={() => proceedToPayment(customer)}
          onSkipCustomer={() => onSetCustomer(null)}
        />

        {/* Supervisor PIN Dialog for Credit Sale */}
        <POSPinDialog
          open={showCreditPinDialog}
          onOpenChange={setShowCreditPinDialog}
          onVerify={verifyCreditPin}
          title="Supervisor Authorization"
          description="Credit sale requires supervisor PIN"
        />

        {/* Credit Sale Dialog */}
        <POSCreditSaleDialog
          open={showCreditSaleDialog}
          onOpenChange={setShowCreditSaleDialog}
          total={total}
          customerName={customer?.name || "Customer"}
          onConfirm={handleCreditSaleConfirm}
          isProcessing={isProcessing}
        />
      </div>
    </TooltipProvider>
  );
}
