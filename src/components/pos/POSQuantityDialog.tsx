import { useState, useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface POSQuantityDialogProps {
  open: boolean;
  onClose: () => void;
  currentQuantity: number;
  productName: string;
  maxStock?: number;
  onConfirm: (quantity: number) => void;
}

export function POSQuantityDialog({
  open,
  onClose,
  currentQuantity,
  productName,
  maxStock = 999,
  onConfirm,
}: POSQuantityDialogProps) {
  const [quantity, setQuantity] = useState(currentQuantity);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuantity(currentQuantity);
      setTimeout(() => {
        inputRef.current?.select();
      }, 50);
    }
  }, [open, currentQuantity]);

  const handleIncrement = () => {
    if (quantity >= maxStock) {
      toast.error("Stock limit reached", {
        description: `Only ${maxStock} available in stock`,
      });
      return;
    }
    setQuantity((q) => q + 1);
  };

  const handleDecrement = () => setQuantity((q) => Math.max(1, q - 1));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const clampedValue = Math.min(Math.max(1, value), maxStock);
    
    if (value > maxStock) {
      toast.error("Stock limit reached", {
        description: `Only ${maxStock} available in stock`,
      });
    }
    
    setQuantity(clampedValue);
  };

  const handleConfirm = () => {
    if (quantity >= 1 && quantity <= maxStock) {
      onConfirm(quantity);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    }
  };

  const isAtLimit = quantity >= maxStock;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="text-center">Update Quantity</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground text-center line-clamp-2">
            {productName}
          </p>
          
          {maxStock < 999 && (
            <p className="text-xs text-center text-amber-600">
              Max available: {maxStock}
            </p>
          )}
          
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={handleDecrement}
              disabled={quantity <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>
            
            <Input
              ref={inputRef}
              type="number"
              min={1}
              max={maxStock}
              value={quantity}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="h-14 w-20 text-center text-2xl font-bold"
            />
            
            <Button
              variant="outline"
              size="icon"
              className={`h-12 w-12 rounded-full ${isAtLimit ? "opacity-50 cursor-not-allowed" : ""}`}
              onClick={handleIncrement}
              disabled={isAtLimit}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-center">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleConfirm} className="flex-1 bg-primary">
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
