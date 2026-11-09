import { useState, useEffect, useRef } from "react";
import {
  RotateCcw,
  ArrowLeftRight,
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  AlertTriangle,
  Loader2,
  X,
  ChevronLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/context/auth";
import { POSPinDialog } from "./POSPinDialog";
import { POSReturnReceiptModal } from "./POSReturnReceiptModal";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_id: string;
  title: string;
  product_name?: string;
  product_image?: string;
  price: number;
  qty: number;
  quantity?: number;
  selected_variation?: {
    size?: string;
    color?: string;
  };
  // Smart validation fields
  previouslyReturned: number;
  remainingReturnable: number;
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  created_at: string;
  outlet_id?: string;
  status?: string;
  customer_id?: string;
}

interface ReturnItem extends OrderItem {
  returnQty: number;
  reason: string;
  reasonNotes?: string;
}

interface ExchangeItem {
  id: string;
  product_id: string;
  variant_id?: string;
  title: string;
  image?: string;
  price: number;
  qty: number;
  size?: string;
  color?: string;
}

interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  stock_quantity: number;
  price_cents?: number;
}

interface ProductWithVariants {
  id: string;
  title: string;
  price_cents: number;
  images?: string[];
  stock: number;
  variants?: ProductVariant[];
}

interface POSReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outletId: string;
  onReturnComplete?: () => void;
}

const RETURN_REASONS = [
  { value: "wrong_size", label: "Wrong Size" },
  { value: "defective", label: "Defective" },
  { value: "changed_mind", label: "Changed Mind" },
  { value: "other", label: "Other" },
];

export function POSReturnModal({
  open,
  onOpenChange,
  outletId,
  onReturnComplete,
}: POSReturnModalProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [returnMode, setReturnMode] = useState<"refund" | "exchange">("exchange");
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [notes, setNotes] = useState("");
  const [searchResults, setSearchResults] = useState<Order[]>([]);

  // Exchange product search
  const [exchangeSearch, setExchangeSearch] = useState("");
  const [exchangeProducts, setExchangeProducts] = useState<ProductWithVariants[]>([]);
  const [isSearchingExchange, setIsSearchingExchange] = useState(false);
  
  // Variant selection state
  const [selectedProductForVariant, setSelectedProductForVariant] = useState<ProductWithVariants | null>(null);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);

  // Return receipt modal state
  const [showReturnReceipt, setShowReturnReceipt] = useState(false);
  const [returnReceiptData, setReturnReceiptData] = useState<{
    returnReceiptNumber: string;
    originalOrderNumber: string;
    returnedItems: Array<{
      title: string;
      price: number;
      qty: number;
      reason?: string;
      variation?: { size?: string; color?: string };
    }>;
    exchangeItems: Array<{ title: string; price: number; qty: number; size?: string; color?: string }>;
    returnType: "refund" | "exchange";
    refundAmount: number;
    exchangeAmount: number;
    balanceDue: number;
    customerName?: string;
    customerPhone?: string;
    processedBy?: string;
    // Loyalty clawback data
    pointsClawedBack?: number;
    refundDeduction?: number;
    pointsAdded?: number;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      resetModal();
    }
  }, [open]);

  const resetModal = () => {
    setSearchQuery("");
    setSelectedOrder(null);
    setOrderItems([]);
    setReturnItems([]);
    setExchangeItems([]);
    setReturnMode("exchange");
    setNotes("");
    setSearchResults([]);
    setExchangeSearch("");
    setExchangeProducts([]);
    setShowReturnReceipt(false);
    setReturnReceiptData(null);
    setSelectedProductForVariant(null);
    setProductVariants([]);
  };

  const handleSearchOrder = async () => {
    if (!searchQuery.trim()) return;

    // Clean the input (remove all #, trim spaces)
    const cleanTerm = searchQuery.replace(/#/g, "").trim();
    if (!cleanTerm) return;

    setIsSearching(true);
    try {
      const upper = cleanTerm.toUpperCase();

      // If the term looks like a receipt ID (UUID prefix shown in Sales History),
      // do an outlet-scoped fetch and filter client-side (UUID columns can't be ilike'd reliably).
      const looksLikeReceipt = /^[0-9a-fA-F]{6,12}$/.test(cleanTerm);

      let results: Order[] = [];

      if (looksLikeReceipt) {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, customer_phone, total_amount, created_at, outlet_id, status, customer_id"
          )
          .eq("outlet_id", outletId)
          .order("created_at", { ascending: false })
          .limit(200);

        if (error) throw error;

        results = (data || []).filter((o) => {
          const receipt = o.id.slice(0, 8).toUpperCase();
          const orderNo = (o.order_number || "").replace(/#/g, "").toUpperCase();
          return receipt.includes(upper) || orderNo.includes(upper);
        });
      } else {
        const { data, error } = await supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, customer_phone, total_amount, created_at, outlet_id, status, customer_id"
          )
          // Ensure it belongs to this shop
          .eq("outlet_id", outletId)
          // Search inside order_number OR phone (case-insensitive)
          .or(`order_number.ilike.%${cleanTerm}%,customer_phone.ilike.%${cleanTerm}%`)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        results = data || [];
      }

      setSearchResults(results);

      if (results.length === 0) {
        toast.info(`No order found for "${cleanTerm}"`);
        return;
      }

      // Scanner/receipt workflows: auto-select exact receipt match if present
      const exact = results.find((o) => {
        const receipt = o.id.slice(0, 8).toUpperCase();
        const orderNo = (o.order_number || "").replace(/#/g, "").toUpperCase();
        return receipt === upper || orderNo === upper;
      });

      if (exact) {
        await handleSelectOrder(exact);
      }
    } catch (error) {
      console.error("Error searching orders:", error);
      toast.error("Failed to search orders");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectOrder = async (order: Order) => {
    // Check if order is already fully returned
    if (order.status === "returned") {
      toast.warning("This order has already been fully returned.");
      return;
    }

    try {
      // Fetch order items AND previous returns in parallel
      const [orderItemsRes, previousReturnsRes] = await Promise.all([
        supabase.from("order_items").select("*").eq("order_id", order.id),
        supabase.from("order_returns").select("returned_items").eq("order_id", order.id),
      ]);

      if (orderItemsRes.error) throw orderItemsRes.error;

      // Calculate previously returned quantities per order_item_id
      const returnedQtyMap = new Map<string, number>();
      
      for (const returnRecord of previousReturnsRes.data || []) {
        const returnedItems = returnRecord.returned_items as Array<{ id: string; qty: number }> | null;
        if (returnedItems) {
          for (const ri of returnedItems) {
            const current = returnedQtyMap.get(ri.id) || 0;
            returnedQtyMap.set(ri.id, current + (ri.qty || 1));
          }
        }
      }

      // Map data to OrderItem type with remaining returnable quantity
      const items: OrderItem[] = (orderItemsRes.data || []).map((item) => {
        const soldQty = item.qty || item.quantity || 1;
        const previouslyReturned = returnedQtyMap.get(item.id) || 0;
        const remainingReturnable = Math.max(0, soldQty - previouslyReturned);

        return {
          id: item.id,
          product_id: item.product_id || "",
          title: item.title,
          product_name: item.product_name || undefined,
          product_image: item.product_image || undefined,
          price: item.price,
          qty: soldQty,
          quantity: item.quantity || undefined,
          selected_variation: item.selected_variation as { size?: string; color?: string } | undefined,
          previouslyReturned,
          remainingReturnable,
        };
      });

      // Check if ALL items are fully returned
      const allFullyReturned = items.every((item) => item.remainingReturnable <= 0);
      
      if (allFullyReturned) {
        toast.warning("This order has already been fully returned.", {
          description: "All items from this order have been returned previously.",
        });
        return;
      }

      setSelectedOrder(order);
      setSearchResults([]);
      setOrderItems(items);
    } catch (error) {
      console.error("Error fetching order items:", error);
      toast.error("Failed to fetch order items");
    }
  };

  const handleAddToReturn = (item: OrderItem) => {
    // Block if no remaining returnable quantity
    if (item.remainingReturnable <= 0) {
      toast.error("This item has already been fully returned.");
      return;
    }

    const existingIndex = returnItems.findIndex((ri) => ri.id === item.id);
    if (existingIndex >= 0) {
      // Already in return list
      return;
    }

    setReturnItems((prev) => [
      ...prev,
      {
        ...item,
        returnQty: 1,
        reason: "",
      },
    ]);
  };

  const handleUpdateReturnQty = (itemId: string, delta: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const originalItem = orderItems.find((oi) => oi.id === itemId);
          // Use remainingReturnable as the max, NOT total sold qty
          const maxQty = originalItem?.remainingReturnable || 1;
          const newQty = Math.max(1, Math.min(item.returnQty + delta, maxQty));
          return { ...item, returnQty: newQty };
        }
        return item;
      })
    );
  };

  const handleUpdateReturnReason = (itemId: string, reason: string) => {
    setReturnItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, reason } : item
      )
    );
  };

  const handleRemoveFromReturn = (itemId: string) => {
    setReturnItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Debounced exchange product search
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (!exchangeSearch.trim()) {
      setExchangeProducts([]);
      return;
    }
    
    // Clear existing timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounced search
    debounceRef.current = setTimeout(() => {
      handleSearchExchangeProducts(exchangeSearch);
    }, 300);
    
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [exchangeSearch]);

  const handleSearchExchangeProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;

    setIsSearchingExchange(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, slug, price_cents, images, stock")
        .or(`title.ilike.%${searchTerm}%,sku.ilike.%${searchTerm}%`)
        .eq("status", "active")
        .gt("stock", 0)
        .limit(10);

      if (error) throw error;
      
      // Cast images to string[] for type safety
      const products: ProductWithVariants[] = (data || []).map((p) => ({
        id: p.id,
        title: p.title,
        price_cents: p.price_cents,
        images: (p.images as string[]) || [],
        stock: p.stock || 0,
      }));
      
      setExchangeProducts(products);
    } catch (error) {
      console.error("Error searching products:", error);
    } finally {
      setIsSearchingExchange(false);
    }
  };

  // Fetch variants for a product
  const handleProductClick = async (product: ProductWithVariants) => {
    setIsLoadingVariants(true);
    setSelectedProductForVariant(product);
    
    try {
      // Fetch variants with outlet stock
      const { data: variants, error } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity, price_cents")
        .eq("product_id", product.id);
      
      if (error) throw error;
      
      if (!variants || variants.length === 0) {
        // No variants - add directly with product-level data
        handleAddExchangeItemDirect(product, null);
        setSelectedProductForVariant(null);
      } else {
        // Fetch outlet-specific stock for variants
        const { data: outletStock } = await supabase
          .from("outlet_inventory")
          .select("variant_id, quantity")
          .eq("outlet_id", outletId)
          .eq("product_id", product.id);
        
        // Map outlet stock to variants
        const stockMap = new Map<string, number>();
        for (const inv of outletStock || []) {
          if (inv.variant_id) {
            const current = stockMap.get(inv.variant_id) || 0;
            stockMap.set(inv.variant_id, current + inv.quantity);
          }
        }
        
        const variantsWithStock: ProductVariant[] = variants.map((v) => ({
          id: v.id,
          size: v.size || undefined,
          color: v.color || undefined,
          stock_quantity: stockMap.get(v.id) || 0,
          price_cents: v.price_cents || undefined,
        }));
        
        setProductVariants(variantsWithStock);
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast.error("Failed to load product variants");
      setSelectedProductForVariant(null);
    } finally {
      setIsLoadingVariants(false);
    }
  };

  // Add exchange item directly (no variants)
  const handleAddExchangeItemDirect = (product: ProductWithVariants, variant: ProductVariant | null) => {
    const price = variant?.price_cents || product.price_cents;
    const size = variant?.size;
    const color = variant?.color;
    
    // Check if same product+variant already exists
    const existingIndex = exchangeItems.findIndex(
      (ei) => 
        ei.product_id === product.id && 
        ei.variant_id === (variant?.id || undefined) &&
        ei.size === size &&
        ei.color === color
    );

    if (existingIndex >= 0) {
      setExchangeItems((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, qty: item.qty + 1 } : item
        )
      );
    } else {
      const itemTitle = variant 
        ? `${product.title}${size ? ` - ${size}` : ""}${color ? ` ${color}` : ""}`
        : product.title;
      
      setExchangeItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          product_id: product.id,
          variant_id: variant?.id,
          title: itemTitle,
          image: product.images?.[0],
          price: price,
          qty: 1,
          size,
          color,
        },
      ]);
    }
    
    // Clear selection states
    setExchangeProducts([]);
    setExchangeSearch("");
    setSelectedProductForVariant(null);
    setProductVariants([]);
  };

  // Handle variant selection
  const handleSelectVariant = (variant: ProductVariant) => {
    if (!selectedProductForVariant) return;
    
    if (variant.stock_quantity <= 0) {
      toast.error("This variant is out of stock");
      return;
    }
    
    handleAddExchangeItemDirect(selectedProductForVariant, variant);
  };

  // Cancel variant selection
  const handleCancelVariantSelection = () => {
    setSelectedProductForVariant(null);
    setProductVariants([]);
  };

  const handleRemoveExchangeItem = (itemId: string) => {
    setExchangeItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleUpdateExchangeQty = (itemId: string, delta: number) => {
    setExchangeItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? { ...item, qty: Math.max(1, item.qty + delta) }
          : item
      )
    );
  };

  // Calculate totals
  const returnTotal = returnItems.reduce(
    (sum, item) => sum + item.price * item.returnQty,
    0
  );
  const exchangeTotal = exchangeItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );
  const balanceDue = exchangeTotal - returnTotal; // Positive = customer pays, Negative = refund

  // Exchange not allowed if shop owes money (negative balance)
  const isExchangeDeficit = returnMode === "exchange" && balanceDue < 0;

  const canProcess =
    returnItems.length > 0 &&
    returnItems.every((item) => item.reason) &&
    (returnMode === "refund" || exchangeItems.length > 0) &&
    !isExchangeDeficit;

  const handleInitiateReturn = () => {
    if (!canProcess) {
      toast.error("Please select items and reasons for return");
      return;
    }
    setShowPinDialog(true);
  };

  const handleVerifyPin = async (pin: string): Promise<boolean> => {
    try {
      // Check PIN exists via secure RPC
      const { data: hasPin, error: hasPinError } = await supabase.rpc(
        "outlet_has_master_pin",
        { p_outlet_id: outletId }
      );
      if (hasPinError) throw hasPinError;

      if (!hasPin) {
        toast.error(
          "Security Alert: No Supervisor PIN configured! Please set a PIN in POS Management before processing returns.",
          { duration: 6000 }
        );
        return false;
      }

      // Verify PIN via secure RPC
      const { data: isValid, error } = await supabase.rpc("verify_outlet_master_pin", {
        p_outlet_id: outletId,
        p_pin: pin,
      });
      if (error) throw error;

      if (!isValid) {
        toast.error("Invalid Supervisor PIN. Access Denied.");
        return false;
      }

      await processReturn();
      return true;
    } catch (error) {
      console.error("Error verifying PIN:", error);
      toast.error("Failed to verify PIN. Please try again.");
      return false;
    }
  };

  // Calculate loyalty points impact for display in footer
  const POINTS_VALUE = 0.75;
  const returnPointsToClawBack = Math.floor(returnTotal / 100);
  const exchangePointsFromNew = returnMode === "exchange" ? Math.floor(exchangeTotal / 100) : 0;
  const netPointsChange = returnMode === "exchange" 
    ? exchangePointsFromNew - returnPointsToClawBack 
    : -returnPointsToClawBack;

  const processReturn = async () => {
    setIsProcessing(true);
    try {
      // Get user profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user?.id)
        .maybeSingle();

      // Generate return receipt number
      const returnReceiptNumber = `RET-${Date.now().toString(36).toUpperCase()}`;

      // === LOYALTY POINTS CLAWBACK LOGIC ===
      let pointsClawedBack = 0;
      let refundDeduction = 0;
      let pointsAdded = 0;
      let actualRefundAmount = returnMode === "refund" ? returnTotal : 0;

      if (selectedOrder?.customer_id) {
        // Fetch customer's current loyalty balance
        const { data: custData } = await supabase
          .from("customers")
          .select("loyalty_points")
          .eq("id", selectedOrder.customer_id)
          .single();

        const currentPoints = custData?.loyalty_points ?? 0;

        if (returnMode === "refund") {
          // Clawback: deduct points that were earned from this return's items
          const pointsEarnedFromReturn = Math.floor(returnTotal / 100);

          if (pointsEarnedFromReturn > 0) {
            if (currentPoints >= pointsEarnedFromReturn) {
              // Logic A: Sufficient points - deduct fully
              pointsClawedBack = pointsEarnedFromReturn;
              const newBalance = currentPoints - pointsEarnedFromReturn;
              await supabase
                .from("customers")
                .update({ loyalty_points: newBalance })
                .eq("id", selectedOrder.customer_id);
            } else {
              // Logic B: Insufficient points - deduct what's available, deduct rest from refund
              pointsClawedBack = currentPoints;
              const shortfallPoints = pointsEarnedFromReturn - currentPoints;
              refundDeduction = Math.ceil(shortfallPoints * POINTS_VALUE);
              actualRefundAmount = Math.max(0, returnTotal - refundDeduction);

              // Zero out customer points
              await supabase
                .from("customers")
                .update({ loyalty_points: 0 })
                .eq("id", selectedOrder.customer_id);
            }
          }
        } else if (returnMode === "exchange") {
          // Exchange: Net point adjustment
          const pointsFromOld = Math.floor(returnTotal / 100);
          const pointsFromNew = Math.floor(exchangeTotal / 100);
          const netPoints = pointsFromNew - pointsFromOld;

          if (netPoints > 0) {
            // Customer gains points
            pointsAdded = netPoints;
            await supabase
              .from("customers")
              .update({ loyalty_points: currentPoints + netPoints })
              .eq("id", selectedOrder.customer_id);
          } else if (netPoints < 0) {
            // Customer loses points (same clawback logic)
            const pointsToDeduct = Math.abs(netPoints);
            if (currentPoints >= pointsToDeduct) {
              pointsClawedBack = pointsToDeduct;
              await supabase
                .from("customers")
                .update({ loyalty_points: currentPoints - pointsToDeduct })
                .eq("id", selectedOrder.customer_id);
            } else {
              pointsClawedBack = currentPoints;
              const shortfall = pointsToDeduct - currentPoints;
              refundDeduction = Math.ceil(shortfall * POINTS_VALUE);
              await supabase
                .from("customers")
                .update({ loyalty_points: 0 })
                .eq("id", selectedOrder.customer_id);
            }
          }
        }
      }

      // Create return record
      const { error } = await supabase.from("order_returns").insert({
        order_id: selectedOrder?.id,
        outlet_id: outletId,
        return_receipt_number: returnReceiptNumber,
        return_type: returnMode,
        returned_items: returnItems.map((item) => ({
          id: item.id,
          product_id: item.product_id,
          title: item.title,
          price: item.price,
          qty: item.returnQty,
          reason: item.reason,
          variation: item.selected_variation,
        })),
        exchange_items:
          returnMode === "exchange"
            ? exchangeItems.map((item) => ({
                product_id: item.product_id,
                variant_id: item.variant_id,
                title: item.title,
                price: item.price,
                qty: item.qty,
                size: item.size,
                color: item.color,
              }))
            : [],
        original_amount: returnTotal,
        exchange_amount: returnMode === "exchange" ? exchangeTotal : 0,
        refund_amount: returnMode === "refund" ? actualRefundAmount : 0,
        balance_due: returnMode === "exchange" ? balanceDue : -actualRefundAmount,
        processed_by: user?.id,
        processed_by_name: profile?.full_name || "Staff",
        customer_name: selectedOrder?.customer_name,
        customer_phone: selectedOrder?.customer_phone,
        notes: notes + (refundDeduction > 0 ? ` | Points shortfall deduction: ৳${refundDeduction}` : ""),
      });

      if (error) throw error;

      // Update inventory for returned items (add back to stock)
      for (const item of returnItems) {
        // Find variant if exists
        const { data: variant } = await supabase
          .from("product_variants")
          .select("id")
          .eq("product_id", item.product_id)
          .eq("size", item.selected_variation?.size || "")
          .eq("color", item.selected_variation?.color || "")
          .maybeSingle();

        // Direct inventory update
        await supabase
          .from("outlet_inventory")
          .upsert(
            {
              outlet_id: outletId,
              product_id: item.product_id,
              variant_id: variant?.id || null,
              quantity: item.returnQty,
            },
            {
              onConflict: "outlet_id,product_id,variant_id",
            }
          );

        // Log the return
        await supabase.from("inventory_logs").insert({
          outlet_id: outletId,
          product_id: item.product_id,
          variant_id: variant?.id,
          qty_change: item.returnQty,
          action_type: "return",
          notes: `Return from order ${selectedOrder?.order_number}: ${item.reason}`,
          user_id: user?.id,
          user_name: profile?.full_name,
        });
      }

      // If exchange, deduct new items from inventory (variant-aware)
      if (returnMode === "exchange") {
        for (const item of exchangeItems) {
          let query = supabase
            .from("outlet_inventory")
            .select("id, quantity")
            .eq("outlet_id", outletId)
            .eq("product_id", item.product_id);
          
          if (item.variant_id) {
            query = query.eq("variant_id", item.variant_id);
          } else {
            query = query.is("variant_id", null);
          }
          
          const { data: currentInv } = await query.maybeSingle();
          
          if (currentInv) {
            await supabase
              .from("outlet_inventory")
              .update({
                quantity: Math.max(0, currentInv.quantity - item.qty),
              })
              .eq("id", currentInv.id);
            
            await supabase.from("inventory_logs").insert({
              outlet_id: outletId,
              product_id: item.product_id,
              variant_id: item.variant_id || null,
              qty_change: -item.qty,
              action_type: "exchange_out",
              notes: `Exchange for return ${returnReceiptNumber}`,
              user_id: user?.id,
              user_name: profile?.full_name,
            });
          }
        }
      }

      // Update original order status to 'returned' or 'exchanged'
      const newStatus = returnMode === "refund" ? "returned" : "exchanged";
      await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", selectedOrder!.id);

      // Build receipt data and show receipt modal
      setReturnReceiptData({
        returnReceiptNumber,
        originalOrderNumber: selectedOrder?.order_number || selectedOrder?.id.slice(0, 8).toUpperCase() || "",
        returnedItems: returnItems.map((item) => ({
          title: item.title,
          price: item.price,
          qty: item.returnQty,
          reason: RETURN_REASONS.find((r) => r.value === item.reason)?.label || item.reason,
          variation: item.selected_variation,
        })),
        exchangeItems: exchangeItems.map((item) => ({
          title: item.title,
          price: item.price,
          qty: item.qty,
          size: item.size,
          color: item.color,
        })),
        returnType: returnMode,
        refundAmount: returnMode === "refund" ? actualRefundAmount : 0,
        exchangeAmount: returnMode === "exchange" ? exchangeTotal : 0,
        balanceDue: returnMode === "exchange" ? balanceDue : -actualRefundAmount,
        customerName: selectedOrder?.customer_name,
        customerPhone: selectedOrder?.customer_phone,
        processedBy: profile?.full_name || "Staff",
        pointsClawedBack,
        refundDeduction,
        pointsAdded,
      });

      toast.success(`Return processed successfully!`);
      
      // Close the return modal and show receipt
      onOpenChange(false);
      setShowReturnReceipt(true);
      
      onReturnComplete?.();
    } catch (error) {
      console.error("Error processing return:", error);
      toast.error("Failed to process return");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
          {/* Fixed Header */}
          <DialogHeader className="p-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <RotateCcw className="h-5 w-5 text-primary" />
              Process Return
            </DialogTitle>
          </DialogHeader>

          {/* Mode Toggle - Fixed */}
          <div className="px-6 py-4 border-b bg-muted/30 shrink-0">
            <Tabs
              value={returnMode}
              onValueChange={(v) => setReturnMode(v as "refund" | "exchange")}
            >
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="exchange" className="gap-2">
                  <ArrowLeftRight className="h-4 w-4" />
                  Exchange Mode
                </TabsTrigger>
                <TabsTrigger value="refund" className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Refund Mode
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto max-h-[50vh]">
            <div className="p-6 space-y-6">
              {/* Order Search */}
              {!selectedOrder ? (
                <div className="space-y-4">
                  <Label>Search Order</Label>
                  <div className="flex gap-2">
                    <Input
                      autoFocus
                      placeholder="Scan Receipt # or Enter Phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchOrder()}
                    />
                    <Button onClick={handleSearchOrder} disabled={isSearching}>
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((order) => (
                          <div
                            key={order.id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
                              order.status === "returned" && "opacity-60 bg-muted/30"
                            )}
                            onClick={() => handleSelectOrder(order)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {order.order_number || order.id.slice(0, 8)}
                                  </p>
                                  {order.status === "returned" && (
                                    <Badge variant="secondary" className="text-xs">
                                      Returned
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {order.customer_name} • {order.customer_phone}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  ৳{order.total_amount.toLocaleString()}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              ) : (
                <>
                  {/* Selected Order Info */}
                  <div className="p-4 bg-muted/30 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" />
                        <span className="font-medium">
                          {selectedOrder.order_number ||
                            selectedOrder.id.slice(0, 8)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {selectedOrder.customer_name} •{" "}
                        {selectedOrder.customer_phone}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedOrder(null);
                        setOrderItems([]);
                        setReturnItems([]);
                      }}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Change
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Items */}
                    <div className="space-y-3">
                      <Label>Order Items</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {orderItems.map((item) => {
                          const isAdded = returnItems.some(
                            (ri) => ri.id === item.id
                          );
                          const isFullyReturned = item.remainingReturnable <= 0;
                          const isPartiallyReturned = item.previouslyReturned > 0 && item.remainingReturnable > 0;
                          
                          return (
                            <div
                              key={item.id}
                              className={cn(
                                "p-3 border rounded-lg flex justify-between items-center",
                                isAdded && "bg-muted/50 border-primary/30",
                                isFullyReturned && "opacity-60 bg-muted/30"
                              )}
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {item.title || item.product_name}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                                  <span>
                                    ৳{item.price.toLocaleString()} ×{" "}
                                    {item.qty || item.quantity}
                                  </span>
                                  {item.selected_variation && (
                                    <Badge variant="outline" className="text-xs">
                                      {item.selected_variation.size}{" "}
                                      {item.selected_variation.color}
                                    </Badge>
                                  )}
                                  {/* Smart validation badges */}
                                  {isFullyReturned && (
                                    <Badge variant="secondary" className="text-xs">
                                      Already Returned
                                    </Badge>
                                  )}
                                  {isPartiallyReturned && (
                                    <Badge variant="outline" className="text-xs border-primary/50 text-primary">
                                      {item.remainingReturnable} left to return
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant={isAdded ? "secondary" : isFullyReturned ? "ghost" : "outline"}
                                onClick={() => handleAddToReturn(item)}
                                disabled={isAdded || isFullyReturned}
                              >
                                {isAdded ? "Added" : isFullyReturned ? "Returned" : "Return"}
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Return Items with Reasons */}
                    <div className="space-y-3">
                      <Label>Items to Return</Label>
                      {returnItems.length === 0 ? (
                        <div className="p-8 border rounded-lg border-dashed text-center text-muted-foreground">
                          Select items to return
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {returnItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 border rounded-lg space-y-2"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">
                                    {item.title}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    ৳{item.price.toLocaleString()}
                                  </p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() => handleRemoveFromReturn(item.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateReturnQty(item.id, -1)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {item.returnQty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateReturnQty(item.id, 1)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>

                              <Select
                                value={item.reason}
                                onValueChange={(v) =>
                                  handleUpdateReturnReason(item.id, v)
                                }
                              >
                                <SelectTrigger
                                  className={cn(
                                    !item.reason && "border-destructive"
                                  )}
                                >
                                  <SelectValue placeholder="Select reason..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {RETURN_REASONS.map((reason) => (
                                    <SelectItem
                                      key={reason.value}
                                      value={reason.value}
                                    >
                                      {reason.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exchange Items (only in exchange mode) */}
                  {returnMode === "exchange" && (
                    <div className="space-y-3">
                      <Separator />
                      <Label>Exchange Items (New Products)</Label>
                      
                      {/* Variant Selection View */}
                      {selectedProductForVariant ? (
                        <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={handleCancelVariantSelection}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="flex-1">
                              <p className="font-medium">{selectedProductForVariant.title}</p>
                              <p className="text-sm text-muted-foreground">Select a variant</p>
                            </div>
                          </div>
                          
                          {isLoadingVariants ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {productVariants.map((variant) => {
                                const label = [variant.size, variant.color].filter(Boolean).join(" / ") || "Default";
                                const isOutOfStock = variant.stock_quantity <= 0;
                                
                                return (
                                  <Button
                                    key={variant.id}
                                    variant={isOutOfStock ? "ghost" : "outline"}
                                    size="sm"
                                    className={cn(
                                      "flex flex-col h-auto py-2 px-3",
                                      isOutOfStock && "opacity-50 cursor-not-allowed"
                                    )}
                                    onClick={() => handleSelectVariant(variant)}
                                    disabled={isOutOfStock}
                                  >
                                    <span className="font-medium">{label}</span>
                                    <span className={cn(
                                      "text-xs",
                                      isOutOfStock ? "text-destructive" : "text-muted-foreground"
                                    )}>
                                      {isOutOfStock ? "Out of stock" : `${variant.stock_quantity} in stock`}
                                    </span>
                                  </Button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Search Input - Live search, no button needed */}
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                              placeholder="Search products to exchange..."
                              value={exchangeSearch}
                              onChange={(e) => setExchangeSearch(e.target.value)}
                              className="pl-9"
                            />
                            {isSearchingExchange && (
                              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                            )}
                          </div>

                          {/* Exchange Product Search Results */}
                          {exchangeProducts.length > 0 && (
                            <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                              {exchangeProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="p-2 hover:bg-muted/50 rounded cursor-pointer flex justify-between items-center"
                                  onClick={() => handleProductClick(product)}
                                >
                                  <div>
                                    <p className="font-medium">{product.title}</p>
                                    <p className="text-sm text-muted-foreground">
                                      ৳{product.price_cents.toLocaleString()} • Stock:{" "}
                                      {product.stock}
                                    </p>
                                  </div>
                                  <Plus className="h-4 w-4 text-primary" />
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}

                      {/* Selected Exchange Items */}
                      {exchangeItems.length > 0 && (
                        <div className="space-y-2">
                          {exchangeItems.map((item) => (
                            <div
                              key={item.id}
                              className="p-3 border rounded-lg flex justify-between items-center"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">
                                  {item.title}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  ৳{item.price.toLocaleString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateExchangeQty(item.id, -1)
                                  }
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {item.qty}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() =>
                                    handleUpdateExchangeQty(item.id, 1)
                                  }
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive"
                                  onClick={() =>
                                    handleRemoveExchangeItem(item.id)
                                  }
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      placeholder="Additional notes about this return..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fixed Footer with Totals */}
          {selectedOrder && returnItems.length > 0 && (
            <div className="border-t p-6 bg-muted/30 shrink-0">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span>Return Value</span>
                  <span className="font-medium">
                    ৳{returnTotal.toLocaleString()}
                  </span>
                </div>
                {returnMode === "exchange" && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>Exchange Value</span>
                      <span className="font-medium">
                        ৳{exchangeTotal.toLocaleString()}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>
                        {balanceDue > 0 ? "Customer Pays" : balanceDue === 0 ? "Even Exchange" : "Refund Due"}
                      </span>
                      <span
                        className={
                          balanceDue > 0 ? "text-emerald-600" : balanceDue === 0 ? "text-muted-foreground" : "text-destructive"
                        }
                      >
                        ৳{Math.abs(balanceDue).toLocaleString()}
                      </span>
                    </div>
                    {isExchangeDeficit && (
                      <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                        <AlertTriangle className="h-3 w-3" />
                        Exchange amount cannot be lower than returned value. Please add more items.
                      </p>
                    )}
                  </>
                )}
                {returnMode === "refund" && (
                  <div className="flex justify-between font-bold text-lg">
                    <span>Refund Amount</span>
                    <span className="text-primary">
                      ৳{returnTotal.toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Loyalty Points Impact Warning */}
                {selectedOrder?.customer_id && returnPointsToClawBack > 0 && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-xs space-y-1">
                    <div className="flex items-center gap-1 font-semibold text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Loyalty Points Impact
                    </div>
                    {returnMode === "refund" && (
                      <p className="text-amber-600">
                        {returnPointsToClawBack} points will be clawed back from customer. If insufficient, the shortfall value will be deducted from refund.
                      </p>
                    )}
                    {returnMode === "exchange" && netPointsChange !== 0 && (
                      <p className="text-amber-600">
                        Net adjustment: {netPointsChange > 0 ? `+${netPointsChange}` : netPointsChange} points
                        {netPointsChange < 0 && " (deducted from balance, shortfall deducted from refund)"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleInitiateReturn}
                disabled={!canProcess || isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Confirm {returnMode === "refund" ? "Refund" : "Exchange"}
              </Button>

              {!returnItems.every((item) => item.reason) && (
                <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please select a reason for all return items
                </p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <POSPinDialog
        open={showPinDialog}
        onOpenChange={setShowPinDialog}
        onVerify={handleVerifyPin}
        title="Supervisor Authorization"
        description="Enter PIN to process return"
      />

      {/* Return Receipt Modal */}
      {returnReceiptData && (
        <POSReturnReceiptModal
          open={showReturnReceipt}
          onClose={() => {
            setShowReturnReceipt(false);
            setReturnReceiptData(null);
          }}
          returnReceiptNumber={returnReceiptData.returnReceiptNumber}
          originalOrderNumber={returnReceiptData.originalOrderNumber}
          returnedItems={returnReceiptData.returnedItems}
          exchangeItems={returnReceiptData.exchangeItems}
          returnType={returnReceiptData.returnType}
          refundAmount={returnReceiptData.refundAmount}
          exchangeAmount={returnReceiptData.exchangeAmount}
          balanceDue={returnReceiptData.balanceDue}
          customerName={returnReceiptData.customerName}
          customerPhone={returnReceiptData.customerPhone}
          processedBy={returnReceiptData.processedBy}
          pointsClawedBack={returnReceiptData.pointsClawedBack}
          refundDeduction={returnReceiptData.refundDeduction}
          pointsAdded={returnReceiptData.pointsAdded}
        />
      )}
    </>
  );
}
