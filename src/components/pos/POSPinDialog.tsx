import { useState, useEffect, useRef } from "react";
import { Shield, X, Delete } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface POSPinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerify: (pin: string) => Promise<boolean>;
  title?: string;
  description?: string;
}

export function POSPinDialog({
  open,
  onOpenChange,
  onVerify,
  title = "Enter Supervisor PIN",
  description = "Authorization required to proceed",
}: POSPinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (open) {
      setPin("");
      setError("");
    }
  }, [open]);

  const handleNumberClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError("");

      // Auto-submit when 4 digits entered
      if (newPin.length === 4) {
        handleVerify(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError("");
  };

  const handleClear = () => {
    setPin("");
    setError("");
  };

  const handleVerify = async (pinToVerify: string) => {
    setIsVerifying(true);
    try {
      const isValid = await onVerify(pinToVerify);
      if (isValid) {
        onOpenChange(false);
      } else {
        setError("Invalid PIN");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
      }
    } catch (err) {
      setError("Verification failed");
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  const numpadButtons = [
    "1", "2", "3",
    "4", "5", "6",
    "7", "8", "9",
    "C", "0", "⌫",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[340px] p-0 gap-0">
        <DialogHeader className="p-6 pb-4 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-lg">{title}</DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>
        </DialogHeader>

        <div className="px-6 pb-4">
          {/* PIN Display */}
          <div
            className={cn(
              "flex justify-center gap-3 mb-6 transition-transform",
              shake && "animate-shake"
            )}
          >
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={cn(
                  "w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all",
                  index < pin.length
                    ? "border-primary bg-primary/5"
                    : "border-muted",
                  error && "border-destructive"
                )}
              >
                {index < pin.length ? "•" : ""}
              </div>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <p className="text-center text-sm text-destructive mb-4 font-medium">
              {error}
            </p>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-2">
            {numpadButtons.map((btn) => (
              <Button
                key={btn}
                variant={btn === "C" ? "outline" : btn === "⌫" ? "outline" : "secondary"}
                className={cn(
                  "h-14 text-xl font-semibold",
                  btn === "0" && "col-span-1"
                )}
                disabled={isVerifying}
                onClick={() => {
                  if (btn === "C") {
                    handleClear();
                  } else if (btn === "⌫") {
                    handleBackspace();
                  } else {
                    handleNumberClick(btn);
                  }
                }}
              >
                {btn === "⌫" ? <Delete className="h-5 w-5" /> : btn}
              </Button>
            ))}
          </div>
        </div>

        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
