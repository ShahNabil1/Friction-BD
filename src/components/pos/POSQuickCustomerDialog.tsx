import { useState, useEffect, useRef } from "react";
import { User, Phone, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { POSCustomer } from "@/hooks/usePOSCart";

interface POSQuickCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCustomerSet: (customer: POSCustomer | null) => void;
  onProceedToPayment: () => void;
}

export function POSQuickCustomerDialog({
  open,
  onOpenChange,
  onCustomerSet,
  onProceedToPayment,
}: POSQuickCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setName("");
      setPhone("");
      setIsLoading(false);
    }
  }, [open]);

  // Validate Bangladesh phone format (11 digits starting with 01)
  const isValidPhone = (phoneNumber: string): boolean => {
    const cleaned = phoneNumber.replace(/\D/g, "");
    return cleaned.length === 11 && cleaned.startsWith("01");
  };

  const handleSaveAndPay = async () => {
    // At least name or phone should be provided for saving
    if (!name.trim() && !phone.trim()) {
      toast({
        title: "Enter Customer Info",
        description: "Please enter a name or phone number",
        variant: "destructive",
      });
      return;
    }

    // Validate phone if provided
    const cleanedPhone = phone.replace(/\D/g, "");
    if (phone.trim() && !isValidPhone(cleanedPhone)) {
      toast({
        title: "Invalid Phone",
        description: "Phone must be 11 digits starting with 01",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let customerId: string;
      let customerName: string;
      let customerPhone: string | undefined;

      if (cleanedPhone) {
        // Step A: Check if customer with this phone already exists in customers table
        const { data: existingCustomer, error: searchError } = await supabase
          .from("customers")
          .select("id, full_name, phone, email")
          .eq("phone", cleanedPhone)
          .maybeSingle();

        if (searchError) {
          throw new Error(searchError.message || "Failed to search customers");
        }

        if (existingCustomer) {
          // Step B: Customer exists - use them
          customerId = existingCustomer.id;
          customerName = existingCustomer.full_name;
          customerPhone = existingCustomer.phone || cleanedPhone;
          
          toast({
            title: "Existing Customer Found",
            description: `Selected: ${existingCustomer.full_name}`,
          });
        } else {
          // Step C: New customer - create in customers table
          const { data: newCustomer, error: insertError } = await supabase
            .from("customers")
            .insert({
              full_name: name.trim() || "Walk-in Customer",
              phone: cleanedPhone,
            })
            .select("id, full_name, phone")
            .single();

          if (insertError) {
            // Extract real error message
            const errorMsg = insertError.message || insertError.details || "Permission denied or database error";
            throw new Error(errorMsg);
          }

          customerId = newCustomer.id;
          customerName = newCustomer.full_name;
          customerPhone = newCustomer.phone || undefined;
          
          toast({
            title: "Customer Created",
            description: `New customer saved: ${newCustomer.full_name}`,
          });
        }
      } else {
        // No phone provided - create customer with name only
        const { data: newCustomer, error: insertError } = await supabase
          .from("customers")
          .insert({
            full_name: name.trim() || "Walk-in Customer",
          })
          .select("id, full_name, phone")
          .single();

        if (insertError) {
          const errorMsg = insertError.message || insertError.details || "Permission denied or database error";
          throw new Error(errorMsg);
        }

        customerId = newCustomer.id;
        customerName = newCustomer.full_name;
        customerPhone = newCustomer.phone || undefined;
        
        toast({
          title: "Customer Created",
          description: `Saved: ${newCustomer.full_name}`,
        });
      }

      // Step D: Set customer in cart state
      onCustomerSet({
        id: customerId,
        customerId: customerId,
        name: customerName,
        phone: customerPhone,
      });

      // Invalidate customer queries so new customer appears in search
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["pos-customers"] });

      onOpenChange(false);
      // Proceed to payment after a brief delay
      setTimeout(() => {
        onProceedToPayment();
      }, 100);
    } catch (error) {
      console.error("Error saving customer:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error) 
          : "Failed to save customer";
      
      toast({
        title: "Failed to Save Customer",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onCustomerSet(null);
    onOpenChange(false);
    // Proceed to payment
    setTimeout(() => {
      onProceedToPayment();
    }, 100);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter key triggers save if there's input, otherwise skip
    if (e.key === "Enter") {
      e.preventDefault();
      if (name.trim() || phone.trim()) {
        handleSaveAndPay();
      } else {
        handleSkip();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onKeyDown={handleKeyDown}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Who is this sale for?
          </DialogTitle>
          <DialogDescription>
            Add customer info for records (optional). Press Enter or click "Skip" for walk-in sales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="quick-customer-name">Name</Label>
            <Input
              id="quick-customer-name"
              ref={nameInputRef}
              placeholder="Customer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quick-customer-phone">Phone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <BDPhoneInput
                id="quick-customer-phone"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(v) => setPhone(v)}
                className="pl-10"
                disabled={isLoading}
                showValidationHint
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="ghost"
            onClick={handleSkip}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            Skip & Pay
          </Button>
          <Button
            type="button"
            onClick={handleSaveAndPay}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save & Pay"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
