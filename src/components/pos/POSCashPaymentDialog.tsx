import { useState, useEffect, useRef } from "react";
import { Wallet, Check, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface POSCashPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (tenderedAmount: number, changeAmount: number) => void;
  total: number;
  isProcessing?: boolean;
}

export function POSCashPaymentDialog({
  open,
  onClose,
  onConfirm,
  total,
  isProcessing = false,
}: POSCashPaymentDialogProps) {
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTenderedAmount(total.toString());
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, total]);

  const parsedTendered = parseFloat(tenderedAmount) || 0;
  const changeAmount = parsedTendered - total;
  const isValid = parsedTendered >= total;

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);

  const handleConfirm = () => {
    if (isValid) {
      onConfirm(parsedTendered, changeAmount);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && isValid && !isProcessing) {
      e.preventDefault();
      handleConfirm();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  // Quick amount chips — deduplicated, always >= total
  const quickAmounts = [
    total,
    Math.ceil(total / 100) * 100,
    Math.ceil(total / 500) * 500,
    Math.ceil(total / 1000) * 1000,
  ]
    .filter((v, i, arr) => arr.indexOf(v) === i && v >= total)
    .slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-[420px] gap-0 overflow-hidden rounded-2xl border-0 p-0 shadow-2xl"
        onKeyDown={handleKeyDown}
      >
        {/* ── Hero: Total Payable ── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(275,41%,18%)] via-[hsl(275,38%,24%)] to-[hsl(275,35%,30%)] px-6 py-7 text-white">
          {/* Decorative background icon */}
          <Wallet className="pointer-events-none absolute -right-4 -top-4 h-28 w-28 rotate-12 text-white/[0.06]" />

          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/60">
            Total Payable
          </p>
          <p className="mt-1 text-4xl font-extrabold tracking-tight">
            ৳{total.toLocaleString("en-BD")}
          </p>
        </div>

        <div className="space-y-5 px-6 pb-6 pt-5">
          {/* ── Cash Received Input ── */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cash Received
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground/50">
                ৳
              </span>
              <input
                ref={inputRef}
                type="number"
                value={tenderedAmount}
                onChange={(e) => setTenderedAmount(e.target.value)}
                className={cn(
                  "h-16 w-full rounded-xl bg-muted/40 pl-10 pr-4 text-center text-[32px] font-bold tracking-tight outline-none transition-all",
                  "border-2 border-transparent",
                  "focus:border-primary/40 focus:bg-background focus:shadow-[0_0_0_4px_hsl(275_41%_18%/0.08)]",
                  "placeholder:text-muted-foreground/30"
                )}
                placeholder="0"
                min={0}
              />
            </div>
          </div>

          {/* ── Quick Amount Chips ── */}
          <div className="grid grid-cols-4 gap-2">
            {quickAmounts.map((amount, i) => {
              const isExact = amount === total;
              const isActive = parsedTendered === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setTenderedAmount(amount.toString())}
                  className={cn(
                    "relative flex h-11 items-center justify-center rounded-xl text-sm font-semibold transition-all",
                    "border-2 active:scale-[0.96]",
                    isActive
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border/60 bg-muted/30 text-foreground hover:border-primary/30 hover:bg-muted/60"
                  )}
                >
                  {isExact ? "Exact" : `৳${amount.toLocaleString("en-BD")}`}
                </button>
              );
            })}
          </div>

          {/* ── Change Display ── */}
          <div
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all",
              isValid
                ? changeAmount > 0
                  ? "bg-emerald-50 dark:bg-emerald-950/30"
                  : "bg-muted/40"
                : "bg-red-50 dark:bg-red-950/30"
            )}
          >
            <div
              className={cn(
                "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                isValid
                  ? changeAmount > 0
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400"
                    : "bg-muted text-muted-foreground"
                  : "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-400"
              )}
            >
              {isValid ? (
                changeAmount > 0 ? (
                  <Wallet className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )
              ) : (
                <Minus className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <p
                className={cn(
                  "text-[11px] font-medium uppercase tracking-wide",
                  isValid
                    ? changeAmount > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {isValid
                  ? changeAmount > 0
                    ? "Change to Return"
                    : "No Change"
                  : "Insufficient Amount"}
              </p>
              <p
                className={cn(
                  "text-2xl font-extrabold tracking-tight",
                  isValid
                    ? changeAmount > 0
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-foreground/60"
                    : "text-red-700 dark:text-red-300"
                )}
              >
                {isValid
                  ? `৳${changeAmount.toLocaleString("en-BD")}`
                  : `৳${(total - parsedTendered).toLocaleString("en-BD")} short`}
              </p>
            </div>
          </div>

          {/* ── Action Buttons ── */}
          <div className="space-y-2 pt-1">
            <Button
              onClick={handleConfirm}
              disabled={!isValid || isProcessing}
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
                  Confirm Payment
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
