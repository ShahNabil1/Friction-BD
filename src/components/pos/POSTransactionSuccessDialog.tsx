import { useEffect, useRef } from "react";
import { Printer, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface POSTransactionSuccessDialogProps {
  open: boolean;
  onClose: () => void;
  onPrint: () => void;
  changeAmount: number;
  paymentMethod: string;
}

export function POSTransactionSuccessDialog({
  open,
  onClose,
  onPrint,
  changeAmount,
  paymentMethod,
}: POSTransactionSuccessDialogProps) {
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => nextButtonRef.current?.focus(), 100);
    }
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onClose();
    }
  };

  const formatPrice = (amount: number) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);

  const isCash = paymentMethod === "cash";
  const showChange = isCash && changeAmount > 0;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent
        className="max-w-sm p-0 overflow-hidden border-0 gap-0"
        onKeyDown={handleKeyDown}
      >
        {/* Hero header */}
        <div className="relative bg-gradient-to-br from-[hsl(275,41%,18%)] via-[hsl(275,38%,24%)] to-[hsl(275,35%,30%)] px-6 pt-8 pb-6 text-center overflow-hidden">
          {/* Decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/5 blur-3xl pointer-events-none" />

          {/* Minimal success bar */}
          <div className="relative mx-auto mb-4 flex flex-col items-center gap-2">
            <div className="h-1 w-12 rounded-full bg-emerald-400 animate-fade-in-up" />
          </div>

          <h2 className="text-lg font-semibold text-white/80 tracking-wide uppercase">
            Payment Successful
          </h2>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-4">
          {/* Change amount — hero display */}
          {showChange && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mb-2">
                Change to Return
              </p>
              <p className="text-5xl font-extrabold text-emerald-600 tabular-nums">
                ৳{changeAmount.toLocaleString()}
              </p>
            </div>
          )}

          {/* No change / exact */}
          {isCash && changeAmount === 0 && (
            <div className="rounded-2xl bg-muted/50 border border-border p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">No Change — Exact Payment</p>
            </div>
          )}

          {/* Non-cash confirmation */}
          {!isCash && (
            <div className="rounded-2xl bg-[hsl(275,41%,18%)]/5 border border-[hsl(275,41%,18%)]/15 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Paid via{" "}
                <span className="font-semibold capitalize text-foreground">
                  {paymentMethod === "mobile_banking" ? "bKash / Nagad" : paymentMethod === "split" ? "Split Payment" : paymentMethod}
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              variant="outline"
              size="lg"
              className="w-full h-12"
              onClick={onPrint}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>

            <Button
              ref={nextButtonRef}
              size="lg"
              className="w-full h-14 text-base font-semibold bg-[hsl(275,41%,18%)] hover:bg-[hsl(275,41%,22%)] text-white"
              onClick={onClose}
            >
              Next Sale
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-[10px] font-mono">Enter</kbd> for next sale
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
