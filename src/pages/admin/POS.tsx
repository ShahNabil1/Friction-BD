import { useState, useCallback, useEffect, useRef } from "react";
import { Store, Building2, Package, Calculator, RotateCcw, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNavigate } from "react-router-dom";
import { Product } from "@/hooks/useProducts";
import { usePOSCart, POSCartItem } from "@/hooks/usePOSCart";
import { usePosDrafts, useCreatePosDraft, useDeletePosDraft, PosDraftRow, PosDraftPayload, fetchProductsByIds } from "@/hooks/usePosDrafts";
import { POSTransactionTable } from "@/components/pos/POSTransactionTable";
import { POSSearchDropdown, POSSearchDropdownRef } from "@/components/pos/POSSearchDropdown";
import { POSActionSidebar } from "@/components/pos/POSActionSidebar";
import { POSInvoiceModal } from "@/components/pos/POSInvoiceModal";
import { POSCustomerSearch } from "@/components/pos/POSCustomerSearch";
import { POSVariantSelector } from "@/components/pos/POSVariantSelector";
import { POSQuantityDialog } from "@/components/pos/POSQuantityDialog";
import { POSDiscountDialog } from "@/components/pos/POSDiscountDialog";
import { POSSaveDraftDialog } from "@/components/pos/POSSaveDraftDialog";
import { POSOpenDraftsSheet } from "@/components/pos/POSOpenDraftsSheet";
import { POSOutletSelector } from "@/components/pos/POSOutletSelector";
import { POSOnlineOrders } from "@/components/pos/POSOnlineOrders";
import { POSCalculator } from "@/components/pos/POSCalculator";
import { POSReturnModal } from "@/components/pos/POSReturnModal";
import { POSExpenseModal } from "@/components/pos/POSExpenseModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { useOutlets, useUserOutlet, Outlet } from "@/hooks/useOutlets";
import { useOutletAssignedOrders } from "@/hooks/useOutletStock";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function POSPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isSuperAdmin, role } = useUserRole();
  const posCart = usePOSCart();
  const searchRef = useRef<POSSearchDropdownRef>(null);

  // Outlet context
  const { data: allOutlets = [], isLoading: outletsLoading } = useOutlets();
  const { data: userOutlet, isLoading: userOutletLoading } = useUserOutlet();
  const [currentOutlet, setCurrentOutlet] = useState<Outlet | null>(null);
  const [showOutletSelector, setShowOutletSelector] = useState(false);

  // Determine if user can switch outlets (only super_admin and admin)
  const canSwitchOutlet = isSuperAdmin || role === "admin";
  const isLockedToOutlet = !canSwitchOutlet && !!userOutlet?.outlet;
  const availableOutlets = canSwitchOutlet ? allOutlets : userOutlet?.outlet ? [userOutlet.outlet] : [];

  // Initialize outlet on load
  useEffect(() => {
    if (outletsLoading || userOutletLoading) return;
    if (currentOutlet) return; // Already selected

    // Non-admin staff with assigned outlet - force lock to their outlet
    if (isLockedToOutlet && userOutlet?.outlet) {
      setCurrentOutlet(userOutlet.outlet);
      return;
    }

    // Check localStorage for previously selected outlet (only for admins)
    if (canSwitchOutlet) {
      const savedOutletId = localStorage.getItem("pos_current_outlet");
      if (savedOutletId) {
        const savedOutlet = allOutlets.find(o => o.id === savedOutletId);
        if (savedOutlet) {
          setCurrentOutlet(savedOutlet);
          return;
        }
      }

      // Super admin or admin with multiple outlets - show selector
      if (allOutlets.length > 1) {
        setShowOutletSelector(true);
        return;
      }
    }

    // User has assigned outlet
    if (userOutlet?.outlet) {
      setCurrentOutlet(userOutlet.outlet);
      return;
    }

    // Only one outlet exists
    if (allOutlets.length === 1) {
      setCurrentOutlet(allOutlets[0]);
      return;
    }

    // Default to main branch for super admin
    if (canSwitchOutlet) {
      const mainBranch = allOutlets.find(o => o.is_main_branch);
      if (mainBranch) {
        setCurrentOutlet(mainBranch);
      }
    }
  }, [allOutlets, userOutlet, outletsLoading, userOutletLoading, canSwitchOutlet, isLockedToOutlet, currentOutlet]);

  // Persist outlet selection (only for users who can switch)
  useEffect(() => {
    if (currentOutlet && canSwitchOutlet) {
      localStorage.setItem("pos_current_outlet", currentOutlet.id);
    }
  }, [currentOutlet, canSwitchOutlet]);

  const handleSelectOutlet = (outlet: Outlet) => {
    // Prevent locked users from changing outlet
    if (isLockedToOutlet) return;
    setCurrentOutlet(outlet);
    setShowOutletSelector(false);
  };

  // Drafts
  const { data: drafts = [], isLoading: draftsLoading } = usePosDrafts(user?.id || null);
  const createDraft = useCreatePosDraft(user?.id || null);
  const deleteDraft = useDeletePosDraft(user?.id || null);
  const [deletingDraftId, setDeletingDraftId] = useState<string | null>(null);
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);

  // Online orders for this outlet
  const { data: onlineOrders = [] } = useOutletAssignedOrders(
    currentOutlet?.id || null,
    ["confirmed", "packaging", "ready_for_delivery"]
  );

  // Active tab state
  const [activeTab, setActiveTab] = useState<"sale" | "orders">("sale");

  // Modal states
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showVariantSelector, setShowVariantSelector] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string>("");
  const [lastOrderItems, setLastOrderItems] = useState<POSCartItem[]>([]);
  const [lastPaymentMethod, setLastPaymentMethod] = useState<string>("cash");
  const [lastTenderedAmount, setLastTenderedAmount] = useState<number | null>(null);
  const [lastChangeAmount, setLastChangeAmount] = useState<number | null>(null);
  const [lastPaidAmount, setLastPaidAmount] = useState<number | null>(null);
  const [lastDueAmount, setLastDueAmount] = useState<number | null>(null);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showSaveDraftDialog, setShowSaveDraftDialog] = useState(false);
  const [showOpenDraftsSheet, setShowOpenDraftsSheet] = useState(false);
  
  // Selected item for table actions
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);

  // Calculator state
  const [showCalculator, setShowCalculator] = useState(false);

  // Return modal state
  const [showReturnModal, setShowReturnModal] = useState(false);

  // Expense modal state
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  // Track active shortcut key for visual feedback
  const [activeShortcut, setActiveShortcut] = useState<string | null>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2 - Focus search
      if (e.key === "F2") {
        e.preventDefault();
        setActiveShortcut("F2");
        searchRef.current?.focus();
      }
      // F4 - Quantity dialog
      if (e.key === "F4") {
        e.preventDefault();
        setActiveShortcut("F4");
        if (selectedItemIndex !== null) {
          setShowQuantityDialog(true);
        } else {
          toast({
            title: "No Item Selected",
            description: "Please select an item first",
            variant: "destructive",
          });
        }
      }
      // F5 or Delete - Remove selected item
      if (e.key === "F5" || e.key === "Delete") {
        e.preventDefault();
        setActiveShortcut(e.key === "F5" ? "F5" : "Delete");
        if (selectedItemIndex !== null) {
          posCart.removeItem(selectedItemIndex);
          setSelectedItemIndex(null);
          toast({
            title: "Item Removed",
            description: "Item has been removed from cart",
          });
        } else {
          toast({
            title: "No Item Selected",
            description: "Please select an item first",
            variant: "destructive",
          });
        }
      }
      // F7 - Transfer (placeholder)
      if (e.key === "F7") {
        e.preventDefault();
        setActiveShortcut("F7");
        // Transfer functionality - can be implemented later
      }
      // F8 - New Sale
      if (e.key === "F8") {
        e.preventDefault();
        setActiveShortcut("F8");
        handleNewSale();
      }
      // F9 - Save Sale
      if (e.key === "F9") {
        e.preventDefault();
        setActiveShortcut("F9");
        if (posCart.items.length > 0) {
          setShowSaveDraftDialog(true);
        }
      }
      // F10 - Quick checkout / Payment
      if (e.key === "F10") {
        e.preventDefault();
        setActiveShortcut("F10");
        if (posCart.items.length > 0) {
          // Trigger checkout - handled by sidebar component
          document.getElementById("pos-payment-btn")?.click();
        }
      }
      // F12 - Cash payment (auto-select)
      if (e.key === "F12") {
        e.preventDefault();
        setActiveShortcut("F12");
        // Cash is default, just trigger payment
        if (posCart.items.length > 0) {
          document.getElementById("pos-payment-btn")?.click();
        }
      }
      // Escape - Clear selection
      if (e.key === "Escape") {
        setSelectedItemIndex(null);
      }
    };

    const handleKeyUp = () => {
      setActiveShortcut(null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedItemIndex, posCart, toast]);

  // State for new sale confirmation
  const [showNewSaleConfirm, setShowNewSaleConfirm] = useState(false);

  // Handle new sale with confirmation
  const handleNewSale = useCallback(() => {
    if (posCart.items.length > 0) {
      setShowNewSaleConfirm(true);
    } else {
      // Cart is empty, just reset
      posCart.clearCart();
      setSelectedItemIndex(null);
    }
  }, [posCart]);

  const confirmNewSale = useCallback(() => {
    posCart.clearCart();
    setSelectedItemIndex(null);
    setShowNewSaleConfirm(false);
    toast({
      title: "Sale Cleared",
      description: "Ready for new transaction",
    });
    // Focus search input for next customer
    setTimeout(() => {
      searchRef.current?.focus();
    }, 100);
  }, [posCart, toast]);

  // Handle product selection - for products without variants, fetch stock directly
  const handleSelectProduct = useCallback(async (product: Product) => {
    const hasSizes = product.sizeOptions && product.sizeOptions.length > 0;
    const hasColors = product.colorOptions && product.colorOptions.length > 0;

    if (hasSizes || hasColors) {
      setSelectedProduct(product);
      setShowVariantSelector(true);
    } else {
      // For products without variants, fetch stock directly from outlet
      if (currentOutlet) {
        const { getOutletVariantStockDirect } = await import("@/hooks/useOutletInventory");
        const stock = await getOutletVariantStockDirect(
          currentOutlet.id,
          product.id,
          null,
          null
        );
        posCart.addItem(product, undefined, undefined, stock);
      } else {
        posCart.addItem(product);
      }
    }
  }, [posCart, currentOutlet]);

  // Handle variant confirmation - now receives stock AND variant price from selector
  const handleConfirmVariant = useCallback(
    (size?: string, color?: string, stock?: number, variantPrice?: number | null) => {
      if (selectedProduct) {
        posCart.addItem(selectedProduct, size, color, stock || 0, variantPrice);
      }
      setSelectedProduct(null);
    },
    [selectedProduct, posCart]
  );

  // Handle successful checkout
  const handleCheckoutSuccess = useCallback(
    (orderId: string, paymentMethod: string, cashData?: { tenderedAmount: number; changeAmount: number }, creditData?: { paidAmount: number; dueAmount: number }) => {
      setLastOrderId(orderId);
      setLastOrderItems([...posCart.items]);
      setLastPaymentMethod(paymentMethod);
      setLastTenderedAmount(cashData?.tenderedAmount ?? null);
      setLastChangeAmount(cashData?.changeAmount ?? null);
      setLastPaidAmount(creditData?.paidAmount ?? null);
      setLastDueAmount(creditData?.dueAmount ?? null);
      setShowInvoice(true);
    },
    [posCart.items]
  );

  // Handle invoice close
  const handleInvoiceClose = useCallback(() => {
    setShowInvoice(false);
    posCart.clearCart();
    setSelectedItemIndex(null);
  }, [posCart]);

  // Delete selected item
  const handleDeleteSelected = useCallback(() => {
    if (selectedItemIndex !== null) {
      posCart.removeItem(selectedItemIndex);
      setSelectedItemIndex(null);
    }
  }, [selectedItemIndex, posCart]);

  // Open quantity dialog
  const handleOpenQuantity = useCallback(() => {
    if (selectedItemIndex !== null) {
      setShowQuantityDialog(true);
    }
  }, [selectedItemIndex]);

  // Handle quantity update from dialog
  const handleQuantityConfirm = useCallback((newQty: number) => {
    if (selectedItemIndex !== null) {
      posCart.updateQuantity(selectedItemIndex, newQty);
    }
  }, [selectedItemIndex, posCart]);

  // Open discount dialog
  const handleOpenDiscount = useCallback(() => {
    setShowDiscountDialog(true);
  }, []);

  // Print last receipt
  const handlePrintLast = useCallback(() => {
    if (lastOrderId) {
      setShowInvoice(true);
    }
  }, [lastOrderId]);

  // Save draft
  const handleSaveDraft = useCallback(async (label: string) => {
    if (posCart.items.length === 0) return;
    
    const payload: PosDraftPayload = {
      customer: posCart.customer 
        ? { 
            kind: "manual", 
            id: posCart.customer.id || "", 
            name: posCart.customer.name,
            phone: posCart.customer.phone,
          } 
        : null,
      lines: posCart.items.map((item) => ({
        product_id: item.product.id,
        qty: item.quantity,
        size: item.selectedSize,
        color: item.selectedColor,
        // Save raw POS prices (NO /100 conversion) so drafts restore exactly
        price: item.unitPrice,
        total: item.unitPrice * item.quantity,
      })),
      shipping: {},
      deliveryFee: 0,
      paymentStatus: "pending",
      paymentMethod: "cash",
      discount: posCart.discount,
    };

    try {
      await createDraft.mutateAsync({ label, payload });
      toast({
        title: "Sale Saved",
        description: `Draft "${label}" saved successfully`,
      });
      posCart.clearCart();
      setSelectedItemIndex(null);
      setShowSaveDraftDialog(false);
    } catch (error: any) {
      toast({
        title: "Failed to save draft",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [posCart, createDraft, toast]);

  // Load draft into cart
  const handleLoadDraft = useCallback(async (draft: PosDraftRow) => {
    if (!draft.payload?.lines || draft.payload.lines.length === 0) {
      toast({
        title: "Empty Draft",
        description: "This draft has no items",
        variant: "destructive",
      });
      return;
    }

    setIsLoadingDraft(true);
    setShowOpenDraftsSheet(false);

    try {
      // Fetch all products by their IDs
      const productIds = draft.payload.lines.map((line) => line.product_id);
      const products = await fetchProductsByIds(productIds);

      // Create a map for quick lookup
      const productMap = new Map(products.map((p) => [p.id, p]));

      // Clear current cart first
      posCart.clearCart();

      // Restore customer if present
      if (draft.payload.customer) {
        posCart.setCustomer({
          id: draft.payload.customer.id,
          name: draft.payload.customer.name || "Customer",
          phone: draft.payload.customer.phone || "",
        });
      }

      // Import stock fetching utility
      const { getOutletVariantStockDirect } = await import("@/hooks/useOutletInventory");
      const { supabase } = await import("@/integrations/supabase/client");

      // Add items to cart with their quantities and variants
      let loadedCount = 0;
      for (const line of draft.payload.lines) {
        const product = productMap.get(line.product_id);
        if (product && currentOutlet) {
          // Fetch current stock for this variant
          const stock = await getOutletVariantStockDirect(
            currentOutlet.id,
            product.id,
            line.size || null,
            line.color || null
          );
          
          // Prefer saved raw price from the draft (restores EXACT amount)
          let variantPrice: number | null = typeof line.price === "number" ? line.price : null;

          // Fallback: fetch current variant-specific price only if draft didn't store it
          if (variantPrice === null && (line.size || line.color)) {
            const { data: variantData } = await supabase
              .from("product_variants")
              .select("price_cents")
              .eq("product_id", product.id)
              .eq("size", line.size || "")
              .eq("color", line.color || "")
              .maybeSingle();
            // IMPORTANT: do NOT divide by 100
            variantPrice = variantData?.price_cents ?? null;
          }
          
          // Add item with quantity (up to available stock)
          const qtyToAdd = Math.min(line.qty, stock);
          for (let i = 0; i < qtyToAdd; i++) {
            posCart.addItem(product, line.size, line.color, stock, variantPrice);
          }
          if (qtyToAdd < line.qty) {
            toast({
              title: "Stock Changed",
              description: `${product.title} now has only ${stock} in stock (was ${line.qty} in draft)`,
              variant: "destructive",
            });
          }
          loadedCount++;
        } else if (product) {
          // No outlet selected, add without stock validation
          const savedPrice: number | null = typeof line.price === "number" ? line.price : null;
          for (let i = 0; i < line.qty; i++) {
            posCart.addItem(product, line.size, line.color, 999, savedPrice);
          }
          loadedCount++;
        }
      }

      // Restore discount if present
      if (draft.payload.discount && draft.payload.discount > 0) {
        // Legacy drafts store discount as number - convert to fixed type
        posCart.setDiscount({ type: "fixed", value: draft.payload.discount });
      }

      toast({
        title: "Draft Loaded",
        description: `Loaded ${loadedCount} product(s) from "${draft.label}"`,
      });

      // Delete the draft after successful loading
      try {
        await deleteDraft.mutateAsync(draft.id);
      } catch (error) {
        // Ignore delete errors
      }
    } catch (error: any) {
      console.error("Failed to load draft:", error);
      toast({
        title: "Failed to load draft",
        description: error.message || "Could not fetch products",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDraft(false);
    }
  }, [posCart, deleteDraft, toast]);

  // Delete draft
  const handleDeleteDraft = useCallback(async (draftId: string) => {
    setDeletingDraftId(draftId);
    try {
      await deleteDraft.mutateAsync(draftId);
      toast({
        title: "Draft Deleted",
        description: "The saved sale has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Failed to delete draft",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingDraftId(null);
    }
  }, [deleteDraft, toast]);

  // Open drafts handler for sidebar
  const handleOpenDrafts = useCallback(() => {
    setShowOpenDraftsSheet(true);
  }, []);

  // Save sale handler for sidebar
  const handleOpenSaveDraft = useCallback(() => {
    if (posCart.items.length > 0) {
      setShowSaveDraftDialog(true);
    }
  }, [posCart.items.length]);

  // Show outlet selector if needed (only for admins with multiple outlets)
  if (showOutletSelector && canSwitchOutlet && allOutlets.length > 1) {
    return (
      <POSOutletSelector
        outlets={availableOutlets}
        onSelectOutlet={handleSelectOutlet}
        isLoading={outletsLoading || userOutletLoading}
        canSwitchOutlet={canSwitchOutlet}
        isLocked={isLockedToOutlet}
      />
    );
  }

  // Loading state
  if (outletsLoading || userOutletLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Loading POS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Header - Clean minimal style */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground text-sm">POS Terminal</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Expense Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowExpenseModal(true)}
            title="Add Expense"
          >
            <Wallet className="h-4 w-4" />
          </Button>
          {/* Return Button */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => setShowReturnModal(true)}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          {/* Calculator */}
          <Popover open={showCalculator} onOpenChange={setShowCalculator}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Calculator className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent 
              className="w-auto p-0 border-0 shadow-none bg-transparent" 
              align="end"
              sideOffset={8}
            >
              <POSCalculator onClose={() => setShowCalculator(false)} />
            </PopoverContent>
          </Popover>
          {/* Current Outlet Indicator */}
          {currentOutlet && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-2"
              onClick={() => canSwitchOutlet && allOutlets.length > 1 && setShowOutletSelector(true)}
              disabled={!canSwitchOutlet || allOutlets.length <= 1}
            >
              <Building2 className="h-3.5 w-3.5" />
              <span className="text-sm">{currentOutlet.name}</span>
              {currentOutlet.is_main_branch && (
                <Badge variant="secondary" className="h-5 text-[10px]">Main</Badge>
              )}
              {isLockedToOutlet && (
                <Badge variant="outline" className="h-5 text-[10px]">Locked</Badge>
              )}
            </Button>
          )}
          <div className="text-sm text-muted-foreground font-medium hidden sm:block">Friction</div>
        </div>
      </header>

      {/* Main Layout with Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "sale" | "orders")} className="flex-1 flex flex-col min-h-0">
        {/* Tab Header */}
        <div className="border-b bg-card px-4">
          <TabsList className="h-10 bg-transparent gap-2">
            <TabsTrigger value="sale" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2">
              <Store className="h-4 w-4" />
              New Sale
            </TabsTrigger>
            <TabsTrigger value="orders" className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary gap-2 relative">
              <Package className="h-4 w-4" />
              Online Orders
              {onlineOrders.length > 0 && (
                <Badge variant="destructive" className="h-5 min-w-[20px] text-[10px] px-1.5 absolute -top-1 -right-2">
                  {onlineOrders.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Sale Tab Content */}
        <TabsContent value="sale" className="flex-1 flex min-h-0 m-0">
          <div className={cn(
            "flex flex-1 min-h-0",
            isMobile && "flex-col"
          )}>
            {/* Left Panel - Transaction Area */}
            <div className={cn(
              "flex flex-col min-h-0 bg-background",
              isMobile ? "flex-1" : "flex-1"
            )}>
              {/* Search Bar */}
              <div className="border-b p-3 bg-card">
                <POSSearchDropdown ref={searchRef} onSelectProduct={handleSelectProduct} outletId={currentOutlet?.id} />
              </div>

              {/* Transaction Table / Empty State */}
              <div className="flex-1 overflow-hidden flex flex-col bg-muted/20">
                <POSTransactionTable
                  items={posCart.items}
                  selectedIndex={selectedItemIndex}
                  onSelectItem={setSelectedItemIndex}
                  onUpdateQuantity={posCart.updateQuantity}
                  onRemoveItem={posCart.removeItem}
                />
              </div>
            </div>

            {/* Right Panel - Action Sidebar */}
            <div className={cn(
              "shrink-0 border-l bg-muted/30",
              isMobile ? "h-auto border-l-0 border-t" : "w-[340px]"
            )}>
              <POSActionSidebar
                items={posCart.items}
                customer={posCart.customer}
                discount={posCart.discount}
                subtotal={posCart.subtotal}
                total={posCart.total}
                selectedItemIndex={selectedItemIndex}
                onDeleteSelected={handleDeleteSelected}
                onOpenQuantity={handleOpenQuantity}
                onNewSale={handleNewSale}
                onSetDiscount={posCart.setDiscount}
                onOpenDiscount={handleOpenDiscount}
                onOpenCustomerSearch={() => setShowCustomerSearch(true)}
                onSetCustomer={posCart.setCustomer}
                onPrintLast={handlePrintLast}
                onCheckoutSuccess={handleCheckoutSuccess}
                onSaveSale={handleOpenSaveDraft}
                onOpenDrafts={handleOpenDrafts}
                draftsCount={drafts.length}
                outletId={currentOutlet?.id}
                activeShortcut={activeShortcut}
              />
            </div>
          </div>
        </TabsContent>

        {/* Online Orders Tab Content */}
        <TabsContent value="orders" className="flex-1 m-0">
          <POSOnlineOrders outletId={currentOutlet?.id || null} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <POSQuantityDialog
        open={showQuantityDialog}
        onClose={() => setShowQuantityDialog(false)}
        currentQuantity={selectedItemIndex !== null ? posCart.items[selectedItemIndex]?.quantity || 1 : 1}
        productName={selectedItemIndex !== null ? posCart.items[selectedItemIndex]?.product.title || "" : ""}
        maxStock={selectedItemIndex !== null ? posCart.items[selectedItemIndex]?.maxStock : undefined}
        onConfirm={handleQuantityConfirm}
      />

      <POSDiscountDialog
        open={showDiscountDialog}
        onClose={() => setShowDiscountDialog(false)}
        currentDiscount={posCart.discountData}
        subtotal={posCart.subtotal}
        outletId={currentOutlet?.id || null}
        onConfirm={posCart.setDiscount}
      />

      <POSCustomerSearch
        open={showCustomerSearch}
        onClose={() => setShowCustomerSearch(false)}
        onSelectCustomer={posCart.setCustomer}
      />

      <POSVariantSelector
        open={showVariantSelector}
        product={selectedProduct}
        outletId={currentOutlet?.id || null}
        onClose={() => {
          setShowVariantSelector(false);
          setSelectedProduct(null);
        }}
        onConfirm={handleConfirmVariant}
      />

      <POSInvoiceModal
        open={showInvoice}
        onClose={handleInvoiceClose}
        orderId={lastOrderId}
        items={lastOrderItems}
        customer={posCart.customer}
        subtotal={posCart.subtotal}
        discount={posCart.discount}
        total={posCart.total}
        paymentMethod={lastPaymentMethod}
        tenderedAmount={lastTenderedAmount}
        changeAmount={lastChangeAmount}
        paidAmount={lastPaidAmount}
        dueAmount={lastDueAmount}
      />

      <POSSaveDraftDialog
        open={showSaveDraftDialog}
        onClose={() => setShowSaveDraftDialog(false)}
        onConfirm={handleSaveDraft}
        isLoading={createDraft.isPending}
      />

      <POSOpenDraftsSheet
        open={showOpenDraftsSheet}
        onClose={() => setShowOpenDraftsSheet(false)}
        drafts={drafts}
        isLoading={draftsLoading}
        onSelectDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
        isDeletingId={deletingDraftId}
      />

      {/* Return Modal */}
      <POSReturnModal
        open={showReturnModal}
        onOpenChange={setShowReturnModal}
        outletId={currentOutlet?.id || ""}
        onReturnComplete={() => {
          toast({
            title: "Return Processed",
            description: "The return has been recorded successfully",
          });
        }}
      />

      {/* Expense Modal */}
      <POSExpenseModal
        open={showExpenseModal}
        onOpenChange={setShowExpenseModal}
        outletId={currentOutlet?.id || null}
      />

      {/* New Sale Confirmation Dialog */}
      <AlertDialog open={showNewSaleConfirm} onOpenChange={setShowNewSaleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard Current Sale?</AlertDialogTitle>
            <AlertDialogDescription>
              You have items in your cart. Starting a new sale will discard all current items and customer selection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmNewSale} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Discard & Start New
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
