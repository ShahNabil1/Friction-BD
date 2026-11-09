import { useState, useEffect, useRef } from "react";
import {
  Banknote,
  CreditCard,
  Wallet,
  QrCode,
  Plus,
  X,
  Check,
  Loader2,
  Gift,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import bkashLogo from "@/assets/brands/bkash.png";
import nagadLogo from "@/assets/brands/nagad.png";
import cardLogo from "@/assets/brands/card.png";
import banglaQrLogo from "@/assets/brands/bangla-qr.png";
import cashLogo from "@/assets/brands/cash.png";

export interface PaymentTender {
  method: string;
  label: string;
  amount: number;
}

export interface LoyaltyRedemption {
  pointsUsed: number;
  monetaryValue: number;
}

interface POSSplitPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tenders: PaymentTender[], changeAmount: number, loyaltyRedemption?: LoyaltyRedemption) => void;
  total: number;
  isProcessing?: boolean;
  customerLoyaltyPoints?: number;
  customerName?: string;
}

const METHODS = [
  { id: "cash", label: "Cash", img: cashLogo },
  { id: "bkash", label: "bKash", img: bkashLogo },
  { id: "nagad", label: "Nagad", img: nagadLogo },
  { id: "card", label: "Card", img: cardLogo },
  { id: "bangla_qr", label: "Bangla QR", img: banglaQrLogo },
] as const;

const POINTS_VALUE = 0.75;

export function POSSplitPaymentDialog({
  open,
  onClose,
  onConfirm,
  total,
  isProcessing = false,
  customerLoyaltyPoints = 0,
  customerName,
}: POSSplitPaymentDialogProps) {
  const [tenders, setTenders] = useState<PaymentTender[]>([]);
  const [selectedMethod, setSelectedMethod] = useState("cash");
  const [inputAmount, setInputAmount] = useState("");
  const [loyaltyRedemption, setLoyaltyRedemption] = useState<LoyaltyRedemption | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // No separate effectiveTotal needed - loyalty is tracked as a tender

  // Reset on open
  useEffect(() => {
    if (open) {
      setTenders([]);
      setSelectedMethod("cash");
      setLoyaltyRedemption(null);
      setInputAmount(total.toString());
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [open, total]);

  const totalPaid = tenders.reduce((s, t) => s + t.amount, 0);
  const remaining = Math.max(0, total - totalPaid);
  const overpaid = Math.max(0, totalPaid - total);
  const isFullyPaid = totalPaid >= total;

  // Update input when remaining changes
  useEffect(() => {
    if (remaining > 0 && tenders.length > 0) {
      setInputAmount(remaining.toString());
    }
  }, [remaining, tenders.length]);

  // Loyalty points eligibility
  const canRedeemPoints = customerLoyaltyPoints >= 100 && !loyaltyRedemption;
  const pointsMonetaryValue = Math.floor(customerLoyaltyPoints * POINTS_VALUE);

  const handleClaimPoints = () => {
    const currentDue = total - totalPaid;
    if (currentDue <= 0) return;

    const amountToRedeem = Math.min(pointsMonetaryValue, currentDue);
    const pointsUsed = Math.ceil(amountToRedeem / POINTS_VALUE);

    setLoyaltyRedemption({ pointsUsed, monetaryValue: amountToRedeem });

    // Add as a tender entry
    const loyaltyTender: PaymentTender = {
      method: "loyalty_points",
      label: "Loyalty Points",
      amount: amountToRedeem,
    };
    setTenders((prev) => [...prev, loyaltyTender]);
    // Update input to show remaining after loyalty
    const newRemaining = currentDue - amountToRedeem;
    setInputAmount(newRemaining > 0 ? newRemaining.toString() : "");
  };

  const handleRemoveLoyalty = () => {
    setLoyaltyRedemption(null);
    setTenders((prev) => prev.filter((t) => t.method !== "loyalty_points"));
  };

  const methodLabel = (id: string) => METHODS.find((m) => m.id === id)?.label || id;

  const handleAddTender = () => {
    const amount = parseFloat(inputAmount) || 0;
    if (amount <= 0) return;

    const newTender: PaymentTender = {
      method: selectedMethod,
      label: methodLabel(selectedMethod),
      amount,
    };
    setTenders((prev) => [...prev, newTender]);
    setInputAmount("");
    // Focus back to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  const handleRemoveTender = (index: number) => {
    const tender = tenders[index];
    if (tender.method === "loyalty_points") {
      handleRemoveLoyalty();
      return;
    }
    setTenders((prev) => prev.filter((_, i) => i !== index));
  };

  const handleConfirm = () => {
    if (!isFullyPaid) return;
    const hasCash = tenders.some((t) => t.method === "cash");
    const change = hasCash ? overpaid : 0;
    onConfirm(tenders, change, loyaltyRedemption || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isFullyPaid && tenders.length > 0) {
        handleConfirm();
      } else {
        handleAddTender();
      }
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Quick amount chips for the current remaining
  const quickAmounts = remaining > 0
    ? [
        remaining,
        Math.ceil(remaining / 100) * 100,
        Math.ceil(remaining / 500) * 500,
        Math.ceil(remaining / 1000) * 1000,
      ]
        .filter((v, i, arr) => arr.indexOf(v) === i && v >= remaining)
        .slice(0, 4)
    : [];

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-[460px] gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* Hero: Total Payable */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(275,41%,18%)] via-[hsl(275,38%,24%)] to-[hsl(275,35%,30%)] px-6 py-6 text-white">
          <Wallet className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-12 text-white/[0.06]" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
            Total Payable
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">
            ৳{total.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="space-y-4 px-6 pb-6 pt-5">
          {/* Loyalty Points Card - only show if eligible */}
          {canRedeemPoints && (
            <div className="rounded-xl border-2 border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 dark:border-amber-700/40 p-3">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
                  <Gift className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    Loyalty Points
                  </p>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
                    {customerLoyaltyPoints} pts &middot; Value: ৳{pointsMonetaryValue.toLocaleString("en-BD")}
                  </p>
                </div>
                <Button
                  type="button"
                  onClick={handleClaimPoints}
                  className="h-8 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold px-3 shadow-sm"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Redeem
                </Button>
              </div>
            </div>
          )}

          {/* Redeemed loyalty banner */}
          {loyaltyRedemption && (
            <div className="flex items-center justify-between rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 px-3 py-2">
              <div className="flex items-center gap-2">
                <Gift className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                  {loyaltyRedemption.pointsUsed} pts redeemed &middot; ৳{loyaltyRedemption.monetaryValue.toLocaleString("en-BD")} off
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemoveLoyalty}
                className="rounded-full p-0.5 text-amber-500 hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Payment Method Selector */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Payment Method
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              {METHODS.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(method.id);
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg p-2 text-[10px] font-medium transition-all border-2",
                    selectedMethod === method.id
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-transparent bg-muted/40 text-muted-foreground hover:bg-muted/60"
                  )}
                >
                  <img src={method.img} alt={method.label} className="h-10 w-auto object-contain" />
                </button>
              ))}
            </div>
          </div>

          {/* Amount Input + Add Button */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Amount
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-bold text-muted-foreground/50">
                  ৳
                </span>
                <input
                  ref={inputRef}
                  type="number"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value)}
                  className={cn(
                    "h-14 w-full rounded-xl bg-muted/40 pl-9 pr-4 text-center text-[28px] font-bold tracking-tight outline-none transition-all",
                    "border-2 border-transparent",
                    "focus:border-primary/40 focus:bg-background focus:shadow-[0_0_0_4px_hsl(275_41%_18%/0.08)]",
                    "placeholder:text-muted-foreground/30"
                  )}
                  placeholder="0"
                  min={0}
                  disabled={isFullyPaid}
                />
              </div>
              <Button
                onClick={handleAddTender}
                disabled={!inputAmount || parseFloat(inputAmount) <= 0 || isFullyPaid}
                className="h-14 px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              >
                <Plus className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Quick Amounts (only when there's remaining) */}
          {remaining > 0 && quickAmounts.length > 0 && (
            <div className="grid grid-cols-4 gap-1.5">
              {quickAmounts.map((amount) => {
                const isExact = amount === remaining;
                const isActive = parseFloat(inputAmount) === amount;
                return (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setInputAmount(amount.toString())}
                    className={cn(
                      "flex h-9 items-center justify-center rounded-lg text-xs font-semibold transition-all border-2 active:scale-[0.96]",
                      isActive
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 bg-muted/30 text-foreground hover:border-primary/30"
                    )}
                  >
                    {isExact ? "Exact" : `৳${amount.toLocaleString("en-BD")}`}
                  </button>
                );
              })}
            </div>
          )}

          {/* Payment Stack (added tenders) */}
          {tenders.length > 0 && (
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Payments Added
              </label>
              <div className="space-y-1">
                {tenders.map((tender, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{tender.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground tabular-nums">
                        ৳{tender.amount.toLocaleString("en-BD")}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTender(i)}
                        className="rounded-full p-0.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Display */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 transition-all",
              isFullyPaid
                ? overpaid > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : "bg-emerald-50 dark:bg-emerald-950/30"
                : "bg-amber-50 dark:bg-amber-950/30"
            )}
          >
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                isFullyPaid
                  ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400"
                  : "bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-400"
              )}
            >
              {isFullyPaid ? <Check className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wide",
                  isFullyPaid
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {isFullyPaid
                  ? overpaid > 0
                    ? "Change to Return"
                    : "Fully Paid"
                  : "Remaining Due"}
              </p>
              <p
                className={cn(
                  "text-2xl font-extrabold tracking-tight",
                  isFullyPaid
                    ? "text-emerald-700 dark:text-emerald-300"
                    : "text-amber-700 dark:text-amber-300"
                )}
              >
                ৳{(isFullyPaid ? overpaid : remaining).toLocaleString("en-BD")}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleConfirm}
              disabled={!isFullyPaid || tenders.length === 0 || isProcessing}
              className={cn(
                "h-[52px] w-full rounded-xl text-base font-bold shadow-lg transition-all",
                "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]",
                "disabled:opacity-40 disabled:shadow-none"
              )}
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Processing…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Check className="h-5 w-5" />
                  Complete Sale
                </span>
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="mx-auto block text-sm font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              Cancel
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
