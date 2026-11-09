import { useState, useEffect, useRef } from "react";
import { X, Percent, Lock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { POSDiscount } from "@/hooks/usePOSCart";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface POSDiscountDialogProps {
  open: boolean;
  onClose: () => void;
  currentDiscount: POSDiscount | null;
  subtotal: number;
  outletId: string | null;
  onConfirm: (discount: POSDiscount | null) => void;
}

export function POSDiscountDialog({
  open,
  onClose,
  currentDiscount,
  subtotal,
  outletId,
  onConfirm,
}: POSDiscountDialogProps) {
  const [discountType, setDiscountType] = useState<"fixed" | "percentage">(
    currentDiscount?.type || "fixed"
  );
  const [discountValue, setDiscountValue] = useState<string>(
    currentDiscount?.value?.toString() || ""
  );
  const [error, setError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  // PIN verification state
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [pinError, setPinError] = useState("");
  const [pendingDiscount, setPendingDiscount] = useState<POSDiscount | null>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (open) {
      setDiscountType(currentDiscount?.type || "fixed");
      setDiscountValue(currentDiscount?.value?.toString() || "");
      setError("");
      setShowPinVerification(false);
      setPin(["", "", "", ""]);
      setPinError("");
      setPendingDiscount(null);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentDiscount]);

  // Focus first PIN input when PIN verification is shown
  useEffect(() => {
    if (showPinVerification) {
      setTimeout(() => {
        pinInputRefs.current[0]?.focus();
      }, 50);
    }
  }, [showPinVerification]);

  // Validate input
  const validateAndSetValue = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setError("");

    if (discountType === "percentage" && numValue > 100) {
      setError("Percentage cannot exceed 100%");
    } else if (discountType === "fixed" && numValue > subtotal) {
      setError(`Amount cannot exceed subtotal (৳${subtotal})`);
    }

    setDiscountValue(value);
  };

  const handleConfirm = () => {
    const numValue = parseFloat(discountValue) || 0;

    // Final validation
    if (discountType === "percentage" && numValue > 100) {
      setError("Percentage cannot exceed 100%");
      return;
    }
    if (discountType === "fixed" && numValue > subtotal) {
      setError(`Amount cannot exceed subtotal (৳${subtotal})`);
      return;
    }

    if (numValue <= 0) {
      // No discount to apply, skip PIN
      onConfirm(null);
      onClose();
      return;
    }

    // Store the pending discount and show PIN verification
    setPendingDiscount({ type: discountType, value: numValue });
    setShowPinVerification(true);
    setPinError("");
  };

  // PIN input handlers
  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setPinError("");

    // Auto-advance to next input
    if (value && index < 3) {
      pinInputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 4 digits are entered
    if (index === 3 && value) {
      const fullPin = [...newPin.slice(0, 3), value.slice(-1)].join("");
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
    if (e.key === "Enter") {
      const fullPin = pin.join("");
      if (fullPin.length === 4) {
        verifyPin(fullPin);
      }
    }
  };

  const verifyPin = async (enteredPin: string) => {
    if (!outletId) {
      setPinError("Outlet not selected");
      return;
    }

    setIsVerifying(true);
    setPinError("");

    try {
      const { data: hasPin, error: hasPinError } = await supabase.rpc(
        "outlet_has_master_pin",
        { p_outlet_id: outletId }
      );
      if (hasPinError) throw hasPinError;

      if (!hasPin) {
        setPinError("No supervisor PIN configured for this outlet");
        setPin(["", "", "", ""]);
        return;
      }

      const { data: isValid, error } = await supabase.rpc("verify_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: enteredPin,
      });
      if (error) throw error;

      if (isValid) {
        // SUCCESS: Apply the discount
        onConfirm(pendingDiscount);
        toast.success("Discount applied successfully");
        onClose();
      } else {
        setPinError("Invalid Supervisor PIN. Access Denied.");
        setPin(["", "", "", ""]);
        setTimeout(() => {
          pinInputRefs.current[0]?.focus();
        }, 50);
      }
    } catch (err) {
      console.error("PIN verification error:", err);
      setPinError("Verification failed. Please try again.");
      setPin(["", "", "", ""]);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !error) {
      handleConfirm();
    }
  };

  const handleClear = () => {
    setDiscountValue("");
    setError("");
    onConfirm(null);
    onClose();
  };

  const handlePresetClick = (value: number) => {
    setDiscountValue(value.toString());
    setError("");
    
    // Validate preset
    if (discountType === "percentage" && value > 100) {
      setError("Percentage cannot exceed 100%");
    } else if (discountType === "fixed" && value > subtotal) {
      setError(`Amount cannot exceed subtotal (৳${subtotal})`);
    }
  };

  const handleTypeChange = (type: "fixed" | "percentage") => {
    setDiscountType(type);
    setDiscountValue("");
    setError("");
  };

  const handleBackFromPin = () => {
    setShowPinVerification(false);
    setPin(["", "", "", ""]);
    setPinError("");
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  // Preset values based on type
  const fixedPresets = [50, 100, 200, 500];
  const percentagePresets = [5, 10, 15, 20];
  const presets = discountType === "fixed" ? fixedPresets : percentagePresets;

  // Calculate preview
  const previewDiscount = (() => {
    const numValue = parseFloat(discountValue) || 0;
    if (numValue <= 0) return 0;
    if (discountType === "fixed") {
      return Math.min(numValue, subtotal);
    } else {
      return Math.floor((subtotal * numValue) / 100);
    }
  })();

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-sm p-0 rounded-2xl overflow-hidden border-0 shadow-2xl">
        {/* Header */}
        <div className="px-5 py-4 border-b bg-card">
          <h2 className="text-lg font-semibold text-foreground">
            {showPinVerification ? "Supervisor Authorization" : "Apply Discount"}
          </h2>
        </div>

        {!showPinVerification ? (
          // ===== DISCOUNT INPUT VIEW =====
          <div className="p-5 space-y-5">
            {/* Type Toggle */}
            <div className="flex rounded-xl bg-muted p-1">
              <button
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  discountType === "fixed"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleTypeChange("fixed")}
              >
                <span className="text-base font-bold">৳</span>
                Fixed Amount
              </button>
              <button
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
                  discountType === "percentage"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => handleTypeChange("percentage")}
              >
                <Percent className="h-4 w-4" />
                Percentage
              </button>
            </div>

            {/* Input Field */}
            <div className="relative">
              {discountType === "fixed" && (
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
                  ৳
                </span>
              )}
              <Input
                ref={inputRef}
                type="number"
                min={0}
                max={discountType === "percentage" ? 100 : subtotal}
                value={discountValue}
                onChange={(e) => validateAndSetValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={discountType === "fixed" ? "Enter amount" : "Enter percentage"}
                className={cn(
                  "h-16 text-center text-3xl font-bold border-2 rounded-xl",
                  discountType === "fixed" ? "pl-10 pr-4" : "pl-4 pr-10",
                  error ? "border-destructive focus-visible:ring-destructive" : "border-input"
                )}
              />
              {discountType === "percentage" && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted-foreground">
                  %
                </span>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive text-center font-medium">
                {error}
              </p>
            )}

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-2">
              {presets.map((value) => (
                <Button
                  key={value}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePresetClick(value)}
                  className={cn(
                    "h-11 text-sm font-semibold rounded-lg transition-all",
                    parseFloat(discountValue) === value && "ring-2 ring-primary bg-primary/10"
                  )}
                >
                  {discountType === "fixed" ? `৳${value}` : `${value}%`}
                </Button>
              ))}
            </div>

            {/* Preview */}
            {previewDiscount > 0 && !error && (
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 text-center">
                <p className="text-sm text-muted-foreground">You'll save</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  ৳{previewDiscount}
                </p>
              </div>
            )}

            {/* Clear Button */}
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleClear}
            >
              Clear Discount
            </Button>
          </div>
        ) : (
          // ===== PIN VERIFICATION VIEW =====
          <div className="p-5 space-y-5">
            {/* Lock Icon & Message */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Lock className="h-7 w-7 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="font-medium text-foreground">Enter Supervisor PIN</p>
                <p className="text-sm text-muted-foreground">
                  Authorize discount of{" "}
                  <span className="font-semibold text-primary">
                    {pendingDiscount?.type === "fixed" 
                      ? `৳${pendingDiscount.value}` 
                      : `${pendingDiscount?.value}%`}
                  </span>
                </p>
              </div>
            </div>

            {/* PIN Input Grid */}
            <div className="flex justify-center gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Input
                  key={index}
                  ref={(el) => (pinInputRefs.current[index] = el)}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={pin[index]}
                  onChange={(e) => handlePinChange(index, e.target.value)}
                  onKeyDown={(e) => handlePinKeyDown(index, e)}
                  disabled={isVerifying}
                  className={cn(
                    "w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl",
                    pinError ? "border-destructive" : "border-input",
                    "focus:border-primary focus:ring-primary"
                  )}
                />
              ))}
            </div>

            {/* PIN Error */}
            {pinError && (
              <p className="text-sm text-destructive text-center font-medium">
                {pinError}
              </p>
            )}

            {/* Verifying indicator */}
            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Verifying...</span>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-0 flex gap-3">
          {!showPinVerification ? (
            <>
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-12 rounded-xl font-medium"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={!!error}
                className="flex-1 h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90"
              >
                Apply Discount
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleBackFromPin}
                disabled={isVerifying}
                className="flex-1 h-12 rounded-xl font-medium"
              >
                Back
              </Button>
              <Button
                onClick={() => {
                  const fullPin = pin.join("");
                  if (fullPin.length === 4) {
                    verifyPin(fullPin);
                  } else {
                    setPinError("Please enter 4-digit PIN");
                  }
                }}
                disabled={isVerifying || pin.join("").length !== 4}
                className="flex-1 h-12 rounded-xl font-semibold bg-primary hover:bg-primary/90"
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify & Apply"
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
