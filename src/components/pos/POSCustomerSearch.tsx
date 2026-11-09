import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Search, User, Plus, Loader2, Phone, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { POSCustomer } from "@/hooks/usePOSCart";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface POSCustomerSearchProps {
  open: boolean;
  onClose: () => void;
  onSelectCustomer: (customer: POSCustomer) => void;
  /** When provided, enables "checkout interceptor" mode with Skip & auto-proceed */
  onProceedToPayment?: () => void;
  /** Called when user skips customer selection (walk-in) */
  onSkipCustomer?: () => void;
}

interface CustomerResult {
  id: string;
  user_id: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  loyalty_points?: number;
  // "customers" = real row in customers table; "profile" = only exists in profiles
  source?: "customers" | "profile";
}


export function POSCustomerSearch({
  open,
  onClose,
  onSelectCustomer,
  onProceedToPayment,
  onSkipCustomer,
}: POSCustomerSearchProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [allCustomers, setAllCustomers] = useState<CustomerResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Fetch all customers when modal opens
  useEffect(() => {
    if (open) {
      fetchCustomers();
      setHighlightedIndex(0);
    }
  }, [open]);

  // Reset highlighted index when search query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      // Query both customers table and profiles table, then merge
      const [customersRes, profilesRes] = await Promise.all([
        supabase
          .from("customers")
          .select("id, user_id, full_name, phone, email, loyalty_points")
          .order("full_name", { ascending: true })
          .limit(200),
        supabase
          .from("profiles")
          .select("id, user_id, full_name, phone, email")
          .order("full_name", { ascending: true })
          .limit(200),
      ]);

      if (customersRes.error) throw customersRes.error;

      const customersData: CustomerResult[] = (customersRes.data || []).map((c) => ({
        ...c,
        source: "customers" as const,
      }));
      const profilesData: CustomerResult[] = (profilesRes.data || []).map((p) => ({
        ...p,
        source: "profile" as const,
      }));

      // Merge: use customers as primary, add profiles not already present (by phone or user_id)
      const seenPhones = new Set(customersData.map((c) => c.phone).filter(Boolean));
      const seenUserIds = new Set(customersData.map((c) => c.user_id).filter(Boolean));

      const uniqueProfiles = profilesData.filter(
        (p) =>
          !(p.phone && seenPhones.has(p.phone)) &&
          !(p.user_id && seenUserIds.has(p.user_id))
      );

      setAllCustomers([...customersData, ...uniqueProfiles]);

    } catch (error) {
      console.error("Customer fetch error:", error);
      toast({
        title: "Error",
        description: "Failed to load customers",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter customers based on search query (by name, phone, or email)
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return allCustomers;
    
    const query = searchQuery.toLowerCase().trim();
    return allCustomers.filter(
      (customer) =>
        (customer.full_name && customer.full_name.toLowerCase().includes(query)) ||
        (customer.phone && customer.phone.includes(query)) ||
        (customer.email && customer.email.toLowerCase().includes(query))
    );
  }, [allCustomers, searchQuery]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  const handleSelectCustomer = useCallback(async (customer: CustomerResult) => {
    let realCustomerId: string | undefined = customer.source === "customers" ? customer.id : undefined;

    // Profile-only pick: resolve or create a matching row in the customers table
    // so the FK on orders.customer_id (-> customers.id) is always valid.
    if (!realCustomerId) {
      try {
        const cleanedPhone = (customer.phone || "").replace(/\D/g, "");
        if (cleanedPhone) {
          const { data: existing } = await supabase
            .from("customers")
            .select("id")
            .eq("phone", cleanedPhone)
            .maybeSingle();
          if (existing?.id) {
            realCustomerId = existing.id;
          }
        }
        if (!realCustomerId) {
          const { data: created, error: createErr } = await supabase
            .from("customers")
            .insert({
              full_name: customer.full_name || "Walk-in Customer",
              phone: cleanedPhone || null,
              email: customer.email || null,
              user_id: customer.user_id || null,
            })
            .select("id")
            .single();
          if (createErr) throw createErr;
          realCustomerId = created.id;
        }
      } catch (err: any) {
        console.error("Resolve customers row failed:", err);
        toast({
          title: "Customer link failed",
          description: err.message || "Could not link this profile to a customer record.",
          variant: "destructive",
        });
        return;
      }
    }

    onSelectCustomer({
      id: customer.user_id || realCustomerId || customer.id,
      customerId: realCustomerId,
      name: customer.full_name || "",
      phone: customer.phone || "",
      email: customer.email || undefined,
      loyaltyPoints: customer.loyalty_points ?? 0,
    });
    handleClose();
  }, [onSelectCustomer, toast]);


  // Keyboard navigation handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (filteredCustomers.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => 
        prev < filteredCustomers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredCustomers[highlightedIndex]) {
        handleSelectCustomer(filteredCustomers[highlightedIndex]);
      }
    }
  }, [filteredCustomers, highlightedIndex, handleSelectCustomer]);

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast({
        title: "Missing Information",
        description: "Customer name is required",
        variant: "destructive",
      });
      return;
    }

    // Validate Bangladesh phone format if provided
    if (newCustomer.phone.trim()) {
      const cleanPhone = newCustomer.phone.replace(/\D/g, "");
      if (cleanPhone.length !== 11 || !cleanPhone.startsWith("01")) {
        toast({
          title: "Invalid Phone",
          description: "Phone must be 11 digits starting with 01",
          variant: "destructive",
        });
        return;
      }
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          full_name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim() || null,
          address: newCustomer.address.trim() || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Customer Created",
        description: `${data.full_name} added successfully`,
      });

      // Auto-select the new customer
      const newCust: POSCustomer = {
        id: data.id,
        name: data.full_name,
        phone: data.phone || "",
        address: data.address || undefined,
        loyaltyPoints: 0,
      };
      onSelectCustomer(newCust);
      handleClose();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create customer",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setShowCreateForm(false);
    setNewCustomer({ name: "", phone: "", address: "" });
    setHighlightedIndex(0);
    onClose();
  };

  const handleShowCreateForm = () => {
    // Pre-fill name if search query looks like a name (not a phone number)
    if (searchQuery.trim() && !/^\d+$/.test(searchQuery.trim())) {
      setNewCustomer({ ...newCustomer, name: searchQuery.trim() });
    } else if (searchQuery.trim() && /^\d+$/.test(searchQuery.trim())) {
      setNewCustomer({ ...newCustomer, phone: searchQuery.trim() });
    }
    setShowCreateForm(true);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showCreateForm ? (
              <>
                <UserPlus className="h-5 w-5" />
                Create New Customer
              </>
            ) : (
              <>
                <User className="h-5 w-5" />
                Select Customer
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        {showCreateForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                placeholder="Enter customer name"
                value={newCustomer.name}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, name: e.target.value })
                }
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <BDPhoneInput
                id="phone"
                placeholder="01XXXXXXXXX"
                value={newCustomer.phone}
                onChange={(v) => setNewCustomer({ ...newCustomer, phone: v })}
                showValidationHint
              />
              <p className="text-xs text-muted-foreground">
                Bangladesh format: 11 digits starting with 013-019
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address (Optional)</Label>
              <Input
                id="address"
                placeholder="Enter address"
                value={newCustomer.address}
                onChange={(e) =>
                  setNewCustomer({ ...newCustomer, address: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
              >
                Back
              </Button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleCreateCustomer}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Customer
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Search Input with keyboard navigation */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-10"
                autoFocus
              />
            </div>


            {/* Customer List */}
            <ScrollArea className="h-72">
              {isLoading ? (
                <div className="space-y-2 p-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1 space-y-1.5">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="space-y-1 p-1">
                  {filteredCustomers.map((customer, index) => (
                    <button
                      key={customer.id}
                      ref={(el) => (itemRefs.current[index] = el)}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-lg p-3 text-left transition-colors",
                        "hover:bg-accent focus:outline-none",
                        highlightedIndex === index 
                          ? "bg-primary/10 ring-1 ring-primary" 
                          : ""
                      )}
                      onClick={() => handleSelectCustomer(customer)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                    >
                      <div className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                        highlightedIndex === index 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-primary/10 text-primary"
                      )}>
                        <User className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          "font-medium truncate",
                          highlightedIndex === index && "text-primary"
                        )}>
                          {customer.full_name || "Unnamed"}
                        </p>
                        {customer.phone && (
                          <p className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {customer.phone}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim() ? (
                <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No customer found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    No results for "{searchQuery}"
                  </p>
                  <Button
                    className="mt-4"
                    onClick={handleShowCreateForm}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Customer
                  </Button>
                </div>
              ) : allCustomers.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center text-center p-4">
                  <div className="rounded-full bg-muted p-4 mb-4">
                    <User className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-foreground">No customers yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create your first customer to get started
                  </p>
                  <Button
                    className="mt-4"
                    onClick={handleShowCreateForm}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Customer
                  </Button>
                </div>
              ) : null}
            </ScrollArea>

            {/* Bottom actions */}
            <div className="flex gap-2">
              {/* Create New Button */}
              {!isLoading && (allCustomers.length > 0 || !searchQuery.trim()) && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleShowCreateForm}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  New Customer
                </Button>
              )}
              {/* Walk-in / Skip button - only in interceptor mode */}
              {onProceedToPayment && (
                <Button
                  variant="ghost"
                  className="flex-1"
                  onClick={() => {
                    onSkipCustomer?.();
                    handleClose();
                    setTimeout(() => onProceedToPayment(), 100);
                  }}
                >
                  Skip & Pay
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
