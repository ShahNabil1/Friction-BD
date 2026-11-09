import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface POSSaveDraftDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (label: string) => void;
  isLoading?: boolean;
}

export function POSSaveDraftDialog({
  open,
  onClose,
  onConfirm,
  isLoading = false,
}: POSSaveDraftDialogProps) {
  const [label, setLabel] = useState("");

  const handleConfirm = () => {
    const finalLabel = label.trim() || `Draft ${new Date().toLocaleTimeString()}`;
    onConfirm(finalLabel);
    setLabel("");
  };

  const handleClose = () => {
    setLabel("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5 text-primary" />
            Save Sale
          </DialogTitle>
          <DialogDescription>
            Save this transaction to resume later. Add a label to identify it easily.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Label htmlFor="draft-label">Label (optional)</Label>
          <Input
            id="draft-label"
            placeholder="e.g., Customer waiting, Hold for stock..."
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-2"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
