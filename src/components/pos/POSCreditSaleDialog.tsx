import { useState, useEffect } from "react";
import { Calculator, CreditCard, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface POSCreditSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  customerName: string;
  onConfirm: (type: "full" | "partial", paidAmount: number, dueAmount: number) => void;
  isProcessing?: boolean;
}

export function POSCreditSaleDialog({
  open,
  onOpenChange,
  total,
  customerName,
  onConfirm,
  isProcessing = false,
}: POSCreditSaleDialogProps) {
  const [creditType, setCreditType] = useState<"full" | "partial">("full");
  const [payingNow, setPayingNow] = useState<string>("");
  const [dueAmount, setDueAmount] = useState<number>(total);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCreditType("full");
      setPayingNow("");
      setDueAmount(total);
    }
  }, [open, total]);

  // Calculate due amount when paying now changes
  useEffect(() => {
    if (creditType === "full") {
      setDueAmount(total);
    } else {
      const paying = parseFloat(payingNow) || 0;
      setDueAmount(Math.max(0, total - paying));
    }
  }, [creditType, payingNow, total]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleConfirm = () => {
    const paidAmount = creditType === "full" ? 0 : Math.min(parseFloat(payingNow) || 0, total);
    const remaining = total - paidAmount;
    onConfirm(creditType, paidAmount, remaining);
  };

  const paidValue = creditType === "full" ? 0 : (parseFloat(payingNow) || 0);
  const isValidPartial = creditType === "partial" && paidValue > 0 && paidValue < total;
  const canConfirm = creditType === "full" || isValidPartial;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Credit Sale Options
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 pb-10 space-y-6">
          {/* Customer Info */}
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-semibold text-lg">{customerName}</p>
          </div>

          {/* Total Bill */}
          <div className="text-center border-b pb-4">
            <p className="text-sm text-muted-foreground">Total Bill</p>
            <p className="text-3xl font-bold text-primary">{formatPrice(total)}</p>
          </div>

          {/* Credit Type Selection */}
          <div className="space-y-3">
            <Label>How would you like to process this credit sale?</Label>
            <RadioGroup
              value={creditType}
              onValueChange={(v) => setCreditType(v as "full" | "partial")}
              className="grid gap-3"
            >
              <div
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  creditType === "full"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                onClick={() => setCreditType("full")}
              >
                <RadioGroupItem value="full" id="full" />
                <div className="flex-1">
                  <Label htmlFor="full" className="cursor-pointer font-medium">
                    Full Credit
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Customer pays nothing now, full amount is due later
                  </p>
                </div>
                <Wallet className="h-5 w-5 text-muted-foreground" />
              </div>

              <div
                className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  creditType === "partial"
                    ? "border-primary bg-primary/5"
                    : "border-muted hover:border-muted-foreground/30"
                }`}
                onClick={() => setCreditType("partial")}
              >
                <RadioGroupItem value="partial" id="partial" />
                <div className="flex-1">
                  <Label htmlFor="partial" className="cursor-pointer font-medium">
                    Partial Payment
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Customer pays some amount now, rest is due later
                  </p>
                </div>
                <Calculator className="h-5 w-5 text-muted-foreground" />
              </div>
            </RadioGroup>
          </div>

          {/* Partial Payment Input */}
          {creditType === "partial" && (
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="payingNow">Amount Paying Now</Label>
                <Input
                  id="payingNow"
                  type="number"
                  placeholder="Enter amount..."
                  value={payingNow}
                  onChange={(e) => setPayingNow(e.target.value)}
                  className="text-lg h-12"
                  autoFocus
                  min={1}
                  max={total - 1}
                />
              </div>

              {/* Summary */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Bill</span>
                  <span>{formatPrice(total)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Paying Now</span>
                  <span className="text-green-600 font-medium">
                    {formatPrice(parseFloat(payingNow) || 0)}
                  </span>
                </div>
                <div className="border-t pt-2 flex justify-between font-semibold">
                  <span>Remaining Due</span>
                  <span className="text-destructive">{formatPrice(dueAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Full Credit Summary */}
          {creditType === "full" && (
            <div className="bg-destructive/10 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground">Full Amount Due</p>
              <p className="text-2xl font-bold text-destructive">{formatPrice(total)}</p>
            </div>
          )}
        </div>

        <div className="border-t p-6 shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 bg-background">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || isProcessing}>
            {isProcessing ? "Processing..." : "Confirm Credit Sale"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
