import { useState, useRef, useCallback } from "react";
import { Wallet, Upload, X, Loader2, Shield, Delete } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getThumbnail } from "@/lib/cloudinary";

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dmzuspsja";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
const CLOUDINARY_UPLOAD_PRESET = "Bubu_lifestyle";

const EXPENSE_CATEGORIES = [
  { value: "food", label: "Food & Beverages" },
  { value: "transport", label: "Transport" },
  { value: "utilities", label: "Utilities / Bills" },
  { value: "maintenance", label: "Maintenance" },
  { value: "supplies", label: "Office Supplies" },
  { value: "salary", label: "Salary / Wages" },
  { value: "rent", label: "Rent" },
  { value: "other", label: "Other" },
];

interface POSExpenseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string | null;
  onSuccess?: () => void;
}

export function POSExpenseModal({
  open,
  onOpenChange,
  outletId,
  onSuccess,
}: POSExpenseModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [receiptUrl, setReceiptUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // PIN verification state
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [shake, setShake] = useState(false);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  const resetForm = () => {
    setCategory("");
    setDescription("");
    setAmount("");
    setReceiptUrl("");
    setPin("");
    setPinError("");
    setShowPinVerification(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Upload image to Cloudinary
  const handleUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      form.append("folder", "expenses");

      const baseName = file.name.replace(/\.[^/.]+$/, "") || "receipt";
      form.append(
        "public_id",
        `${Date.now()}-${Math.random().toString(16).slice(2)}-${baseName.replace(/[^a-zA-Z0-9._-]/g, "-")}`
      );

      const res = await fetch(CLOUDINARY_UPLOAD_URL, { method: "POST", body: form });
      if (!res.ok) throw new Error("Upload failed");

      const json = await res.json();
      if (!json.secure_url) throw new Error("No URL returned");

      setReceiptUrl(json.secure_url);
      toast({ title: "Receipt Uploaded", description: "Image uploaded successfully" });
    } catch (err: any) {
      toast({
        title: "Upload Failed",
        description: err.message || "Unable to upload image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUpload(file);
    }
    e.target.value = "";
  };

  // Validate form and show PIN dialog
  const handleSubmit = () => {
    if (!category) {
      toast({ title: "Category Required", description: "Please select a category", variant: "destructive" });
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      toast({ title: "Amount Required", description: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (!outletId) {
      toast({ title: "No Outlet", description: "Outlet not selected", variant: "destructive" });
      return;
    }

    // Show PIN verification
    setShowPinVerification(true);
  };

  // Handle PIN entry
  const handlePinClick = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setPinError("");

      if (newPin.length === 4) {
        verifyPinAndSave(newPin);
      }
    }
  };

  const handlePinBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setPinError("");
  };

  const handlePinClear = () => {
    setPin("");
    setPinError("");
  };

  // Verify PIN and save expense
  const verifyPinAndSave = async (enteredPin: string) => {
    if (!outletId) return;

    setIsVerifyingPin(true);
    try {
      // Verify PIN via secure RPC (PIN is hashed and never returned to client)
      const { data: isValid, error } = await supabase.rpc("verify_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: enteredPin,
      });

      if (error) throw error;

      if (!isValid) {
        setPinError("Invalid PIN or no PIN configured for this outlet");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin("");
        return;
      }

      // PIN is valid - save expense
      await saveExpense();
    } catch (err: any) {
      setPinError("Verification failed");
      setPin("");
    } finally {
      setIsVerifyingPin(false);
    }
  };

  // Save expense to database
  const saveExpense = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("expenses").insert({
        outlet_id: outletId,
        category,
        description: description.trim() || null,
        amount: Math.round(parseFloat(amount)),
        receipt_url: receiptUrl || null,
        created_by: user?.id || null,
        created_by_name: user?.user_metadata?.full_name || user?.email || "Unknown",
      });

      if (error) throw error;

      toast({ title: "Expense Saved", description: `৳${amount} expense recorded` });
      handleClose();
      onSuccess?.();
    } catch (err: any) {
      toast({
        title: "Failed to Save",
        description: err.message || "Unable to save expense",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const numpadButtons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "⌫"];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-[420px]">
        {!showPinVerification ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Add Expense
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Category */}
              <div className="space-y-2">
                <Label>Expense Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Description / Reason</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Lunch for staff"
                  rows={2}
                />
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label>Amount (৳) *</Label>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 500"
                  min="1"
                />
              </div>

              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label>Receipt (Optional)</Label>
                {receiptUrl ? (
                  <div className="relative inline-block">
                    <img
                      src={getThumbnail(receiptUrl, 200)}
                      alt="Receipt"
                      className="h-24 w-24 object-cover rounded-md border"
                    />
                    <button
                      type="button"
                      onClick={() => setReceiptUrl("")}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors",
                      isUploading && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload receipt</span>
                      </div>
                    )}
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isUploading}>
                Save Expense
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* PIN Verification Screen */
          <div className="py-4">
            <div className="text-center mb-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Supervisor PIN Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter PIN to authorize ৳{amount} expense
              </p>
            </div>

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
                    index < pin.length ? "border-primary bg-primary/5" : "border-muted",
                    pinError && "border-destructive"
                  )}
                >
                  {index < pin.length ? "•" : ""}
                </div>
              ))}
            </div>

            {/* Error Message */}
            {pinError && (
              <p className="text-center text-sm text-destructive mb-4 font-medium">
                {pinError}
              </p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 px-4">
              {numpadButtons.map((btn) => (
                <Button
                  key={btn}
                  variant={btn === "C" ? "outline" : btn === "⌫" ? "outline" : "secondary"}
                  className="h-14 text-xl font-semibold"
                  disabled={isVerifyingPin || isSaving}
                  onClick={() => {
                    if (btn === "C") handlePinClear();
                    else if (btn === "⌫") handlePinBackspace();
                    else handlePinClick(btn);
                  }}
                >
                  {btn === "⌫" ? <Delete className="h-5 w-5" /> : btn}
                </Button>
              ))}
            </div>

            <div className="mt-6 px-4">
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowPinVerification(false)}
                disabled={isVerifyingPin || isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Back"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
