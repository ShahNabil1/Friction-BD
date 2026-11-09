import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { AlertTriangle, Check, ChevronsUpDown, History, Loader2, MapPin, Package, Plus, Save, ScanLine, Search, Store, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useOutlets } from "@/hooks/useOutlets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CustomerCreateDialog, type ManualCustomer } from "@/components/admin/CustomerCreateDialog";
import { LocationSelect } from "@/components/checkout/LocationSelect";
import { BD_DISTRICTS, BD_DISTRICT_NAMES } from "@/data/bdLocations";

import { VariantSelectorDialog, type SelectedVariation as VariantSelection } from "@/components/admin/VariantSelectorDialog";
import { useAuth } from "@/context/auth";
import { fetchPosDraft, useCreatePosDraft, useDeletePosDraft, usePosDrafts, type PosDraftPayload } from "@/hooks/usePosDrafts";
import { cn } from "@/lib/utils";

type CustomerOption =
  | { kind: "profile"; id: string; full_name: string | null; phone: string | null; email: string | null; address: Record<string, string> | null }
  | { kind: "manual"; id: string; full_name: string | null; phone: string; email: string | null; address: Record<string, string> | null };

type UserAddress = {
  id: string;
  label: string | null;
  full_name: string;
  phone: string;
  house_no: string | null;
  flat_no: string | null;
  road_no: string | null;
  village: string | null;
  post_office: string | null;
  thana: string | null;
  upazilla: string | null;
  zilla: string | null;
  is_default: boolean | null;
};

type ProductRow = {
  id: string;
  title: string;
  sku: string | null;
  slug: string;
  price_cents: number;
  stock: number;
  images: string[];
  size_options?: string[] | null;
  color_options?: { name: string }[] | null;
};

type CustomerOrder = {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_status: string;
};

type SelectedVariation = {
  variant_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  price_cents: number | null;
};

type Line = {
  product: ProductRow;
  qty: number;
  variation?: SelectedVariation | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: (orderId: string) => void;
};

export function ManualOrderDialog({ open, onOpenChange, onOrderCreated }: Props) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isPlacing, setIsPlacing] = useState(false);

  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerOption | null>(null);

  // Address lookup for profile customers
  const [customerAddresses, setCustomerAddresses] = useState<UserAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);

  // Order history preview for selected customer
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  const [quickAddOpen, setQuickAddOpen] = useState(false);

  // Variant selector for products with variants
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false);
  const [pendingVariantProduct, setPendingVariantProduct] = useState<ProductRow | null>(null);

  // POS drafts (Hold/Resume)
  const [draftsOpen, setDraftsOpen] = useState(false);
  const [holdOpen, setHoldOpen] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const { data: drafts = [], isLoading: draftsLoading } = usePosDrafts(user?.id || null);
  const createDraft = useCreatePosDraft(user?.id || null);
  const deleteDraft = useDeletePosDraft(user?.id || null);

  // Scanning
  const scanInputRef = useRef<HTMLInputElement | null>(null);
  const [scanValue, setScanValue] = useState("");
  const lastAutoScanRef = useRef<string>("");

  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
  const productSearchInputRef = useRef<HTMLInputElement | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const [shipping, setShipping] = useState<Record<string, string>>({
    street_address: "",
    thana: "",
    district: "",
    notes: "",
  });

  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [paymentStatus, setPaymentStatus] = useState<string>("pending");
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");

  // Outlet / Fulfillment Source selection
  const { data: outlets = [], isLoading: outletsLoading } = useOutlets();
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [outletStock, setOutletStock] = useState<Record<string, number>>({}); // variantId/productId -> qty
  const [isLoadingOutletStock, setIsLoadingOutletStock] = useState(false);

  // Calculate subtotal using variant price if available
  const subtotal = useMemo(() => lines.reduce((sum, l) => {
    const price = l.variation?.price_cents || l.product.price_cents;
    return sum + price * l.qty;
  }, 0), [lines]);
  const total = useMemo(() => subtotal + (Number.isFinite(deliveryFee) ? deliveryFee : 0), [subtotal, deliveryFee]);

  const reset = () => {
    setSelectedCustomer(null);
    setCustomerAddresses([]);
    setSelectedAddressId(null);
    setCustomerOrders([]);
    setDraftLabel("");
    setScanValue("");
    setProductQuery("");
    setProducts([]);
    setLines([]);
    setShipping({ street_address: "", thana: "", district: "", notes: "" });
    setDeliveryFee(0);
    setPaymentStatus("pending");
    setPaymentMethod("cod");
    setPendingVariantProduct(null);
    setVariantSelectorOpen(false);
    setSelectedOutletId(null);
    setOutletStock({});
  };

  // Fetch outlet stock for current cart items when outlet or lines change
  const fetchOutletStock = useCallback(async (outletId: string, cartLines: Line[]) => {
    if (!outletId || cartLines.length === 0) {
      setOutletStock({});
      return;
    }

    setIsLoadingOutletStock(true);
    try {
      const productIds = cartLines.map((l) => l.product.id);
      
      const { data: inventory, error } = await supabase
        .from("outlet_inventory")
        .select(`
          product_id,
          variant_id,
          quantity,
          variant:product_variants(id, size, color)
        `)
        .eq("outlet_id", outletId)
        .in("product_id", productIds);

      if (error) throw error;

      // Build stock map: key = variantId or productId (for non-variant items)
      const stockMap: Record<string, number> = {};
      
      for (const inv of inventory || []) {
        if (inv.variant_id) {
          stockMap[inv.variant_id] = inv.quantity;
        } else {
          // Non-variant product stock
          stockMap[`product_${inv.product_id}`] = inv.quantity;
        }
      }

      setOutletStock(stockMap);
    } catch (e: any) {
      console.error("Failed to fetch outlet stock:", e);
    } finally {
      setIsLoadingOutletStock(false);
    }
  }, []);

  // Fetch stock when outlet or lines change
  useEffect(() => {
    if (selectedOutletId && lines.length > 0) {
      fetchOutletStock(selectedOutletId, lines);
    } else {
      setOutletStock({});
    }
  }, [selectedOutletId, lines, fetchOutletStock]);

  // Get stock for a specific line item at the selected outlet
  const getLineStock = useCallback((line: Line): number | null => {
    if (!selectedOutletId) return null;
    
    if (line.variation?.variant_id) {
      return outletStock[line.variation.variant_id] ?? 0;
    } else {
      return outletStock[`product_${line.product.id}`] ?? 0;
    }
  }, [selectedOutletId, outletStock]);

  // Check if any items have insufficient stock
  const stockWarnings = useMemo(() => {
    if (!selectedOutletId) return [];
    
    return lines
      .map((line) => {
        const availableStock = getLineStock(line);
        if (availableStock === null) return null;
        if (line.qty > availableStock) {
          return {
            product: line.product.title,
            variant: line.variation ? [line.variation.color, line.variation.size].filter(Boolean).join(" / ") : null,
            requested: line.qty,
            available: availableStock,
          };
        }
        return null;
      })
      .filter(Boolean) as { product: string; variant: string | null; requested: number; available: number }[];
  }, [lines, selectedOutletId, getLineStock]);

  useEffect(() => {
    if (!open) return;

    // Focus scan input for POS workflows
    const t = window.setTimeout(() => {
      scanInputRef.current?.focus();
    }, 50);

    (async () => {
      setIsLoading(true);
      try {
        const [{ data: profiles, error: pErr }, { data: manual, error: cErr }] = await Promise.all([
          supabase.from("profiles").select("id, full_name, phone, email"),
          supabase.from("customers").select("id, full_name, phone, email, address"),
        ]);

        if (pErr) throw pErr;
        if (cErr) throw cErr;

        const profileOptions: CustomerOption[] = (profiles || []).map((p: any) => ({
          kind: "profile",
          id: p.id,
          full_name: p.full_name,
          phone: p.phone,
          email: p.email,
          address: null, // Address is stored in user_addresses table, not profiles
        }));

        const manualOptions: CustomerOption[] = (manual || []).map((c: any) => ({
          kind: "manual",
          id: c.id,
          full_name: c.full_name,
          phone: c.phone,
          email: c.email,
          address: c.address,
        }));

        setCustomers([...profileOptions, ...manualOptions]);
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Failed to load customers", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    })();

    return () => window.clearTimeout(t);
  }, [open, toast]);

  // Fetch addresses when a profile customer is selected
  const fetchCustomerAddresses = useCallback(async (profileId: string) => {
    setIsLoadingAddresses(true);
    setCustomerAddresses([]);
    setSelectedAddressId(null);
    
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("id, label, full_name, phone, house_no, flat_no, road_no, village, post_office, thana, upazilla, zilla, is_default")
        .eq("user_id", profileId)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      const addresses = (data as UserAddress[]) || [];
      setCustomerAddresses(addresses);

      // Auto-select the default address if available
      const defaultAddr = addresses.find((a) => a.is_default);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        // Combine legacy fields into a single street_address for simplified form
        const streetParts = [
          defaultAddr.house_no,
          defaultAddr.flat_no,
          defaultAddr.road_no,
          defaultAddr.village,
        ].filter(Boolean).join(", ");
        setShipping({
          street_address: streetParts,
          thana: defaultAddr.thana || defaultAddr.upazilla || "",
          district: defaultAddr.zilla || "",
          notes: "",
        });
      }
    } catch (e: any) {
      console.error("Failed to fetch customer addresses:", e);
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  // Fetch customer order history
  const fetchCustomerOrders = useCallback(async (customer: CustomerOption) => {
    setIsLoadingOrders(true);
    setCustomerOrders([]);
    
    try {
      const column = customer.kind === "manual" ? "customer_id" : "user_id";
      const { data, error } = await supabase
        .from("orders")
        .select("id, created_at, total_amount, status, payment_status")
        .eq(column, customer.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) throw error;
      setCustomerOrders((data as CustomerOrder[]) || []);
    } catch (e: any) {
      console.error("Failed to fetch customer orders:", e);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Handle customer selection
  const handleCustomerSelect = useCallback((customer: CustomerOption) => {
    setSelectedCustomer(customer);
    
    // Reset shipping when changing customer
    setShipping({ street_address: "", thana: "", district: "", notes: "" });
    setCustomerAddresses([]);
    setSelectedAddressId(null);
    
    // Fetch order history for the selected customer
    fetchCustomerOrders(customer);

    if (customer.kind === "profile") {
      // Fetch addresses from user_addresses table for profile customers
      fetchCustomerAddresses(customer.id);
    } else if (customer.kind === "manual" && customer.address) {
      // For manual customers, combine legacy fields into simplified format
      const addr = customer.address;
      const streetParts = [
        addr.house_no,
        addr.flat_no,
        addr.road_no,
        addr.village,
        addr.street_address,
      ].filter(Boolean).join(", ");
      setShipping({
        street_address: streetParts || addr.street_address || "",
        thana: addr.thana || addr.upazilla || "",
        district: addr.zilla || addr.district || "",
        notes: addr.notes || "",
      });
    }
  }, [fetchCustomerAddresses, fetchCustomerOrders]);

  const buildDraftPayload = useCallback((): PosDraftPayload => {
    return {
      customer: selectedCustomer ? { kind: selectedCustomer.kind, id: selectedCustomer.id } : null,
      lines: lines.map((l) => ({ product_id: l.product.id, qty: l.qty })),
      shipping,
      deliveryFee,
      paymentStatus,
      paymentMethod,
    };
  }, [deliveryFee, lines, paymentMethod, paymentStatus, selectedCustomer, shipping]);

  const applyDraftPayload = useCallback(
    async (payload: PosDraftPayload) => {
      // customer
      if (payload.customer) {
        const found = customers.find((c) => c.kind === payload.customer!.kind && c.id === payload.customer!.id) || null;
        setSelectedCustomer(found);
      } else {
        setSelectedCustomer(null);
      }

      setShipping(payload.shipping || {});
      setDeliveryFee(Number(payload.deliveryFee || 0));
      setPaymentStatus(payload.paymentStatus || "pending");
      setPaymentMethod(payload.paymentMethod || "cod");

      // products
      const ids = (payload.lines || []).map((l) => l.product_id).filter(Boolean);
      if (ids.length === 0) {
        setLines([]);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select("id, title, sku, slug, price_cents, stock, images")
        .in("id", ids);
      if (error) throw error;

      const byId = new Map((data as any as ProductRow[]).map((p) => [p.id, p]));
      const nextLines: Line[] = (payload.lines || [])
        .map((l) => {
          const p = byId.get(l.product_id);
          if (!p) return null;
          return { product: p, qty: Math.max(1, Number(l.qty || 1)) } as Line;
        })
        .filter(Boolean) as Line[];

      setLines(nextLines);
    },
    [customers]
  );

  const handleHoldDraft = async () => {
    if (!user) {
      toast({ title: "Not signed in", description: "Please sign in first", variant: "destructive" });
      return;
    }
    if (!draftLabel.trim()) {
      toast({ title: "Label required", description: "Give this draft a label", variant: "destructive" });
      return;
    }

    try {
      await createDraft.mutateAsync({ label: draftLabel.trim(), payload: buildDraftPayload() });
      toast({ title: "Draft saved" });
      setHoldOpen(false);
      setDraftLabel("");
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save draft", variant: "destructive" });
    }
  };

  const handleResumeDraft = async (draftId: string) => {
    try {
      const draft = await fetchPosDraft(draftId);
      await applyDraftPayload(draft.payload as any);
      toast({ title: "Draft resumed" });
      setDraftsOpen(false);
      scanInputRef.current?.focus();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to resume draft", variant: "destructive" });
    }
  };

  // Add product with variant (called from VariantSelectorDialog)
  const addProductWithVariant = useCallback((p: ProductRow, variation: SelectedVariation) => {
    setLines((prev) => {
      // For variant products, check by variant_id
      const existing = prev.find(
        (l) => l.product.id === p.id && l.variation?.variant_id === variation.variant_id
      );
      if (existing) {
        return prev.map((l) =>
          l.product.id === p.id && l.variation?.variant_id === variation.variant_id
            ? { ...l, qty: l.qty + 1 }
            : l
        );
      }
      return [...prev, { product: p, qty: 1, variation }];
    });
    // Clear search
    setProductQuery("");
    setProducts([]);
    setHighlightedProductIndex(-1);
    setTimeout(() => productSearchInputRef.current?.focus(), 0);
  }, []);

  // Check if product has variants and handle selection flow
  const handleProductSelect = useCallback(async (p: ProductRow) => {
    // Check if this product has variants
    const { data: variants, error } = await supabase
      .from("product_variants")
      .select("id")
      .eq("product_id", p.id)
      .limit(1);

    if (error) {
      console.error("Failed to check variants:", error);
      // Fallback to simple add
      setLines((prev) => {
        const existing = prev.find((l) => l.product.id === p.id && !l.variation);
        if (existing) return prev.map((l) => (l.product.id === p.id && !l.variation ? { ...l, qty: l.qty + 1 } : l));
        return [...prev, { product: p, qty: 1 }];
      });
      setProductQuery("");
      setProducts([]);
      setHighlightedProductIndex(-1);
      return;
    }

    if (variants && variants.length > 0) {
      // Product has variants - open the selector
      setPendingVariantProduct(p);
      setVariantSelectorOpen(true);
    } else {
      // Simple product - add directly
      setLines((prev) => {
        const existing = prev.find((l) => l.product.id === p.id && !l.variation);
        if (existing) return prev.map((l) => (l.product.id === p.id && !l.variation ? { ...l, qty: l.qty + 1 } : l));
        return [...prev, { product: p, qty: 1 }];
      });
      setProductQuery("");
      setProducts([]);
      setHighlightedProductIndex(-1);
      setTimeout(() => productSearchInputRef.current?.focus(), 0);
    }
  }, []);

  const searchProducts = useCallback(
    async (q: string) => {
      setProductQuery(q);
      if (!q.trim()) {
        setProducts([]);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("products")
          .select("id, title, sku, slug, price_cents, stock, images, size_options, color_options")
          .eq("status", "active")
          .gt("stock", 0)
          .or(`title.ilike.%${q}%,sku.ilike.%${q}%,slug.ilike.%${q}%`)
          .order("created_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        setProducts((data as any as ProductRow[]) || []);
      } catch (e: any) {
        toast({ title: "Error", description: e?.message || "Product search failed", variant: "destructive" });
      }
    },
    [toast]
  );

  const resolveScanCode = useCallback(
    async (raw: string) => {
      const code = raw.trim();
      if (!code) return;

      // avoid repeated auto-add loops while keeping the same value in the input
      if (lastAutoScanRef.current === code) return;
      lastAutoScanRef.current = code;

      // Search by SKU exact match first
      const base = supabase
        .from("products")
        .select("id, title, sku, slug, price_cents, stock, images")
        .eq("status", "active")
        .gt("stock", 0);

      const { data: skuMatch, error: skuErr } = await base.eq("sku", code).maybeSingle();
      if (skuErr) throw skuErr;

      if (skuMatch) {
        handleProductSelect(skuMatch as any as ProductRow);
        setScanValue("");
        lastAutoScanRef.current = "";
        return;
      }

      // Fallback: try slug exact
      const { data: slugMatch, error: slugErr } = await base.eq("slug", code).maybeSingle();
      if (slugErr) throw slugErr;
      if (slugMatch) {
        handleProductSelect(slugMatch as any as ProductRow);
        setScanValue("");
        lastAutoScanRef.current = "";
        return;
      }

      // Fuzzy fallback list (shows below)
      setProductQuery(code);
      await searchProducts(code);
    },
    [handleProductSelect, searchProducts]
  );
  // Auto-add when using keyboard-wedge scanners (no need to press Enter)
  useEffect(() => {
    if (!open) return;
    const el = scanInputRef.current;
    if (!el) return;

    // Only auto-process while the scan input has focus (prevents accidental triggers)
    if (document.activeElement !== el) return;

    const value = scanValue.trim();
    if (value.length < 6) return;

    const t = window.setTimeout(() => {
      void resolveScanCode(value);
    }, 180);

    return () => window.clearTimeout(t);
  }, [open, resolveScanCode, scanValue]);

  const updateQty = (productId: string, qty: number) => {
    setLines((prev) => prev.map((l) => (l.product.id === productId ? { ...l, qty: Math.max(1, qty) } : l)));
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.product.id !== productId));
  };

  // Deduct stock from outlet inventory after order creation
  const deductOutletInventory = async (orderId: string) => {
    if (!selectedOutletId) return;

    const stockErrors: string[] = [];

    for (const line of lines) {
      try {
        const variantId = line.variation?.variant_id || null;

        // Find the inventory record
        let inventoryQuery = supabase
          .from("outlet_inventory")
          .select("id, quantity")
          .eq("outlet_id", selectedOutletId)
          .eq("product_id", line.product.id);

        if (variantId) {
          inventoryQuery = inventoryQuery.eq("variant_id", variantId);
        } else {
          inventoryQuery = inventoryQuery.is("variant_id", null);
        }

        const { data: inventory, error: fetchError } = await inventoryQuery.maybeSingle();

        if (fetchError || !inventory) {
          stockErrors.push(`${line.product.title}: No inventory record`);
          continue;
        }

        // Deduct stock
        const newQty = Math.max(0, inventory.quantity - line.qty);
        const { error: updateError } = await supabase
          .from("outlet_inventory")
          .update({ quantity: newQty, updated_at: new Date().toISOString() })
          .eq("id", inventory.id);

        if (updateError) {
          stockErrors.push(`${line.product.title}: ${updateError.message}`);
          continue;
        }

        // Log the deduction
        await supabase.from("inventory_logs").insert({
          outlet_id: selectedOutletId,
          product_id: line.product.id,
          variant_id: variantId,
          qty_change: -line.qty,
          action_type: "manual_order",
          notes: `Manual Order - ${orderId.slice(0, 8).toUpperCase()}`,
          user_id: user?.id,
          reference_id: orderId,
        });
      } catch (err: any) {
        stockErrors.push(`${line.product.title}: ${err.message}`);
      }
    }

    if (stockErrors.length > 0) {
      console.error("Stock deduction errors:", stockErrors);
      toast({
        title: "Stock Sync Warning",
        description: "Some inventory updates failed. Please verify stock levels.",
        variant: "destructive",
      });
    }
  };

  const placeOrder = async () => {
    if (!selectedCustomer) {
      toast({ title: "Select customer", description: "Please select a customer first", variant: "destructive" });
      return;
    }
    if (lines.length === 0) {
      toast({ title: "No products", description: "Add at least one product", variant: "destructive" });
      return;
    }
    if (!selectedOutletId) {
      toast({ title: "Select fulfillment outlet", description: "Please select an outlet to fulfill this order", variant: "destructive" });
      return;
    }

    setIsPlacing(true);
    try {
      const isProfile = selectedCustomer.kind === "profile";
      const customerName = selectedCustomer.full_name || "Customer";

      const items = lines.map((l) => ({
        product_id: l.product.id,
        quantity: l.qty,
        product_name: l.variation
          ? `${l.product.title} - ${[l.variation.color, l.variation.size].filter(Boolean).join(" / ")}`
          : l.product.title,
        product_image: l.product.images?.[0] || null,
        selected_variation: l.variation
          ? {
              variant_id: l.variation.variant_id,
              size: l.variation.size,
              color: l.variation.color,
              sku: l.variation.sku,
            }
          : null,
      }));

      const { data: orderId, error } = await supabase.rpc(
        "create_manual_order",
        {
          p_user_id: isProfile ? selectedCustomer.id : null,
          p_customer_id: isProfile ? null : selectedCustomer.id,
          p_customer_name: customerName,
          p_customer_email: selectedCustomer.email,
          p_customer_phone: selectedCustomer.phone,
          p_shipping_address: {
            ...shipping,
            // Mirror keys used by the Checkout page so downstream systems
            // (Steadfast, invoices) receive the exact same shape.
            zilla: shipping.district || "",
            upazilla: shipping.thana || "",
          },
          p_delivery_fee: deliveryFee,
          p_payment_status: paymentStatus,
          p_payment_method: paymentMethod,
          p_items: items,
        } as any
      );

      if (error) throw error;

      // Assign order to selected outlet and set status to confirmed
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          outlet_id: selectedOutletId,
          status: "confirmed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orderId);

      if (updateError) {
        console.error("Failed to assign outlet:", updateError);
      }

      // Deduct inventory from the selected outlet
      await deductOutletInventory(String(orderId));

      toast({
        title: "Order created",
        description: `Manual order #${String(orderId).slice(0, 8).toUpperCase()} placed and assigned to outlet`,
      });

      onOrderCreated?.(String(orderId));
      onOpenChange(false);
      reset();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to place manual order", variant: "destructive" });
    } finally {
      setIsPlacing(false);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount);

  const selectedLabel = selectedCustomer
    ? `${selectedCustomer.full_name || "(No name)"} • ${selectedCustomer.phone || ""}${selectedCustomer.kind === "manual" ? " (Manual)" : ""}`
    : "Select a customer";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="w-[95vw] max-w-5xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl">
        {/* Mobile Header - Compact */}
        <DialogHeader className="pb-3 md:pb-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <DialogTitle className="text-lg md:text-xl">Create Manual Order</DialogTitle>
              <DialogDescription className="text-xs md:text-sm">Take a phone/offline order</DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={() => setHoldOpen(true)} disabled={!user || createDraft.isPending} className="flex-1 md:flex-none">
                {createDraft.isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                Hold
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setDraftsOpen(true)} disabled={!user} className="flex-1 md:flex-none">
                <History className="mr-1.5 h-3.5 w-3.5" />
                Resume
                {drafts.length > 0 ? <Badge variant="secondary" className="ml-1.5 text-xs">{drafts.length}</Badge> : null}
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Hold draft dialog */}
        <Dialog open={holdOpen} onOpenChange={setHoldOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Hold cart</DialogTitle>
              <DialogDescription>Save this cart as a draft to resume later.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Draft label *</Label>
              <Input value={draftLabel} onChange={(e) => setDraftLabel(e.target.value)} placeholder='e.g., "John 3pm"' />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setHoldOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleHoldDraft} disabled={!draftLabel.trim() || createDraft.isPending}>
                {createDraft.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Draft
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Resume drafts dialog */}
        <Dialog open={draftsOpen} onOpenChange={setDraftsOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Resume a draft</DialogTitle>
              <DialogDescription>Select a saved cart to resume.</DialogDescription>
            </DialogHeader>

            {draftsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : drafts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No drafts found.</p>
            ) : (
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.label}</p>
                      <p className="text-xs text-muted-foreground">Updated {new Date(d.updated_at).toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="secondary" onClick={() => void handleResumeDraft(d.id)}>
                        Resume
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={async () => {
                          try {
                            await deleteDraft.mutateAsync(d.id);
                            toast({ title: "Draft deleted" });
                          } catch (e: any) {
                            toast({ title: "Error", description: e?.message || "Failed to delete draft", variant: "destructive" });
                          }
                        }}
                        disabled={deleteDraft.isPending}
                        aria-label="Delete draft"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Main form content with grid layout */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-2">
          {/* Customer selection - Full width */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-3">
              <div className="flex-1 space-y-2">
                <Label>Customer</Label>
                <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      <span className="truncate">{selectedLabel}</span>
                      <ChevronsUpDown className="h-4 w-4 opacity-60" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover" 
                    align="start"
                    onOpenAutoFocus={(e) => {
                      // Focus the CommandInput when popover opens for immediate keyboard navigation
                      e.preventDefault();
                      const container = e.currentTarget as HTMLElement;
                      const input = container.querySelector('[cmdk-input]') as HTMLInputElement;
                      input?.focus();
                    }}
                  >
                    <Command
                      onKeyDown={(e) => {
                        // Close popover on Escape
                        if (e.key === "Escape") {
                          e.preventDefault();
                          setCustomerPopoverOpen(false);
                        }
                      }}
                    >
                      <CommandInput placeholder="Search customers..." />
                      <CommandList>
                        <CommandEmpty>No customers found.</CommandEmpty>
                        <CommandGroup heading="Customers">
                          {customers.map((c) => {
                            const label = `${c.full_name || "(No name)"} • ${c.phone || ""}`;
                            const selected = selectedCustomer?.id === c.id && selectedCustomer?.kind === c.kind;
                            return (
                              <CommandItem
                                key={`${c.kind}:${c.id}`}
                                value={label}
                                onSelect={() => {
                                  handleCustomerSelect(c);
                                  setCustomerPopoverOpen(false);
                                }}
                              >
                                <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                                <span className="truncate">{label}</span>
                                {c.kind === "manual" && (
                                  <Badge variant="secondary" className="ml-2">Manual</Badge>
                                )}
                              </CommandItem>
                            );
                          })}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <Button type="button" variant="secondary" onClick={() => setQuickAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Quick Add
              </Button>
            </div>

            {/* Address Selection for Profile Customers */}
            {selectedCustomer?.kind === "profile" && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Saved Addresses
                </Label>
                {isLoadingAddresses ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading addresses...
                  </div>
                ) : customerAddresses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No saved addresses for this customer.</p>
                ) : (
                  <Select
                    value={selectedAddressId || ""}
                    onValueChange={(val) => {
                      setSelectedAddressId(val);
                      const addr = customerAddresses.find((a) => a.id === val);
                      if (addr) {
                        // Combine legacy fields into simplified format
                        const streetParts = [
                          addr.house_no,
                          addr.flat_no,
                          addr.road_no,
                          addr.village,
                        ].filter(Boolean).join(", ");
                        setShipping({
                          street_address: streetParts,
                          thana: addr.thana || addr.upazilla || "",
                          district: addr.zilla || "",
                          notes: "",
                        });
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a saved address" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          <div className="flex items-center gap-2">
                            {addr.is_default && <Badge variant="secondary" className="text-xs">Default</Badge>}
                            <span>{addr.label || "Address"}</span>
                            <span className="text-muted-foreground">
                              — {[addr.house_no, addr.village, addr.thana, addr.zilla].filter(Boolean).join(", ") || "No details"}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Order History Preview */}
            {selectedCustomer && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Order History
                </Label>
                {isLoadingOrders ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading orders...
                  </div>
                ) : customerOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No previous orders from this customer.</p>
                ) : (
                  <ScrollArea className="max-h-40 rounded-md border">
                    <div className="p-2 space-y-2">
                      {customerOrders.map((order) => (
                        <div key={order.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-muted-foreground">
                                #{(order as any).order_number || order.id.slice(0, 8)}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs",
                                  order.status === "delivered" && "bg-green-100 text-green-700 border-green-200",
                                  order.status === "cancelled" && "bg-red-100 text-red-700 border-red-200",
                                  order.status === "pending" && "bg-yellow-100 text-yellow-700 border-yellow-200",
                                  order.status === "processing" && "bg-blue-100 text-blue-700 border-blue-200"
                                )}
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(order.created_at), "MMM dd, yyyy")}
                            </p>
                          </div>
                          <span className="font-semibold text-primary">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>

          {/* Product selection - Full width */}
          <div className="space-y-3">
            <Separator />
            <Label className="text-sm md:text-base font-semibold">Products</Label>

            {/* Product Search - Stacked on mobile */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Scan SKU / Barcode</Label>
                <div className="relative">
                  <ScanLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={scanInputRef}
                    value={scanValue}
                    onChange={(e) => setScanValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void resolveScanCode(scanValue);
                      }
                    }}
                    placeholder="Scan or type code, press Enter…"
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Search (title / SKU / slug)</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    ref={productSearchInputRef}
                    value={productQuery}
                    onChange={(e) => {
                      searchProducts(e.target.value);
                      setHighlightedProductIndex(-1);
                    }}
                    onKeyDown={(e) => {
                      if (products.length === 0) return;
                      
                      if (e.key === "ArrowDown") {
                        e.preventDefault();
                        setHighlightedProductIndex((prev) => 
                          prev < products.length - 1 ? prev + 1 : 0
                        );
                      } else if (e.key === "ArrowUp") {
                        e.preventDefault();
                        setHighlightedProductIndex((prev) => 
                          prev > 0 ? prev - 1 : products.length - 1
                        );
                      } else if (e.key === "Enter") {
                        e.preventDefault();
                        if (highlightedProductIndex >= 0 && highlightedProductIndex < products.length) {
                          handleProductSelect(products[highlightedProductIndex]);
                        }
                      } else if (e.key === "Escape") {
                        setProductQuery("");
                        setProducts([]);
                        setHighlightedProductIndex(-1);
                      }
                    }}
                    placeholder="Search products…"
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {products.length > 0 && (
              <div className="max-h-48 overflow-auto rounded-md border bg-card">
                {products.map((p, index) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleProductSelect(p)}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-muted",
                      index === highlightedProductIndex && "bg-accent"
                    )}
                  >
                    <span className="truncate">{p.title}</span>
                    <span className="text-sm text-muted-foreground">{formatCurrency(p.price_cents)}</span>
                  </button>
                ))}
              </div>
            )}

            {lines.length === 0 ? (
              <p className="text-xs md:text-sm text-muted-foreground">No products selected yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 md:max-h-64 overflow-y-auto">
                {lines.map((l, idx) => {
                  const lineKey = l.variation?.variant_id || `${l.product.id}-${idx}`;
                  const price = l.variation?.price_cents || l.product.price_cents;
                  const stock = l.variation?.stock_quantity ?? l.product.stock;
                  const firstImage = l.product.images?.[0];
                  return (
                    <div key={lineKey} className="flex items-center gap-2 md:gap-3 rounded-lg border p-2 md:p-3 bg-card">
                      {/* Product Image */}
                      {firstImage ? (
                        <img 
                          src={firstImage} 
                          alt={l.product.title}
                          className="h-10 w-10 md:h-12 md:w-12 rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 md:h-12 md:w-12 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight line-clamp-1">{l.product.title}</p>
                        {l.variation && (
                          <p className="text-[10px] md:text-xs text-primary">
                            {[l.variation.color, l.variation.size].filter(Boolean).join(" / ")}
                          </p>
                        )}
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {formatCurrency(price)} × {l.qty} = {formatCurrency(price * l.qty)}
                        </p>
                      </div>
                      
                      {/* Qty & Delete */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          min={1}
                          max={stock}
                          value={l.qty}
                          onChange={(e) => {
                            const newQty = Math.min(Number(e.target.value), stock);
                            if (l.variation) {
                              setLines((prev) =>
                                prev.map((line) =>
                                  line.variation?.variant_id === l.variation?.variant_id
                                    ? { ...line, qty: Math.max(1, newQty) }
                                    : line
                                )
                              );
                            } else {
                              updateQty(l.product.id, newQty);
                            }
                          }}
                          className="w-14 md:w-16 h-8 text-center text-sm"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            if (l.variation) {
                              setLines((prev) =>
                                prev.filter(
                                  (line) => line.variation?.variant_id !== l.variation?.variant_id
                                )
                              );
                            } else {
                              removeLine(l.product.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Fulfillment Source - Outlet Selection */}
          <div className="space-y-3">
            <Separator />
            <Label className="text-sm md:text-base font-semibold flex items-center gap-2">
              <Store className="h-4 w-4" />
              Fulfillment Source *
            </Label>
            
            <div className="space-y-2">
              <Select
                value={selectedOutletId || ""}
                onValueChange={setSelectedOutletId}
              >
                <SelectTrigger className={cn(!selectedOutletId && "border-destructive")}>
                  <SelectValue placeholder="Select outlet to fulfill from..." />
                </SelectTrigger>
                <SelectContent>
                  {outletsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    outlets
                      .filter((o) => o.is_active)
                      .map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          <div className="flex items-center gap-2">
                            <span>{outlet.name}</span>
                            {outlet.is_main_branch && (
                              <Badge variant="secondary" className="text-xs">Main</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                  )}
                </SelectContent>
              </Select>
              
              {!selectedOutletId && lines.length > 0 && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please select an outlet to check stock availability
                </p>
              )}

              {isLoadingOutletStock && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Checking stock...
                </p>
              )}

              {/* Stock Warnings */}
              {stockWarnings.length > 0 && (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 space-y-1">
                  <p className="text-xs font-medium text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Insufficient Stock Warning
                  </p>
                  {stockWarnings.map((warn, idx) => (
                    <p key={idx} className="text-xs text-destructive/80">
                      • {warn.product}{warn.variant ? ` (${warn.variant})` : ""}: 
                      Only {warn.available} available, requested {warn.requested}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Order details - Stacked on mobile */}
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm">Delivery Fee</Label>
              <Input type="number" min={0} value={deliveryFee} onChange={(e) => setDeliveryFee(Number(e.target.value || 0))} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm">Payment Status</Label>
              <Select value={paymentStatus} onValueChange={setPaymentStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs md:text-sm">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cod">Cash on Delivery</SelectItem>
                  <SelectItem value="bkash">bKash</SelectItem>
                  <SelectItem value="nagad">Nagad</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Shipping Address Section - Full width */}
          <div className="space-y-3">
            <Separator />
            <Label className="text-sm md:text-base font-semibold">Shipping Details</Label>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Full Address *</Label>
                <Textarea
                  placeholder="আপনার সম্পূর্ণ ঠিকানা (House, Road, Village/Area)"
                  value={shipping.street_address || ""}
                  onChange={(e) => setShipping((p) => ({ ...p, street_address: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="grid gap-3 grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">District *</Label>
                  <LocationSelect
                    value={shipping.district || ""}
                    onChange={(val) => setShipping((p) => ({
                      ...p,
                      district: val,
                      // Reset thana if it does not belong to the newly picked district
                      thana: (BD_DISTRICTS[val] || []).includes(p.thana || "") ? p.thana : "",
                    }))}
                    options={BD_DISTRICT_NAMES}
                    placeholder="জেলা নির্বাচন করুন"
                    searchPlaceholder="জেলা খুঁজুন…"
                    emptyMessage="কোনো জেলা পাওয়া যায়নি"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Thana / Upazilla *</Label>
                  <LocationSelect
                    value={shipping.thana || ""}
                    onChange={(val) => setShipping((p) => ({ ...p, thana: val }))}
                    options={shipping.district ? (BD_DISTRICTS[shipping.district] || []) : []}
                    placeholder="থানা / উপজেলা নির্বাচন করুন"
                    searchPlaceholder="থানা খুঁজুন…"
                    emptyMessage="কোনো থানা পাওয়া যায়নি"
                    disabled={!shipping.district}
                    disabledReason="আগে জেলা নির্বাচন করুন"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Customer Note (Optional)</Label>
                <Textarea
                  placeholder="Special delivery instructions"
                  value={shipping.notes || ""}
                  onChange={(e) => setShipping((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          </div>

          {/* Order Summary - Full width */}
          <div className="rounded-lg border bg-muted/30 p-3 md:p-4">
            <div className="flex justify-between text-xs md:text-sm">
              <span>Subtotal</span>
              <span className="font-medium">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs md:text-sm mt-1">
              <span>Delivery Fee</span>
              <span className="font-medium">{formatCurrency(deliveryFee)}</span>
            </div>
            <Separator className="my-2 md:my-3" />
            <div className="flex justify-between text-sm md:text-base">
              <span className="font-semibold">Total</span>
              <span className="font-semibold text-primary">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4 md:mt-6 pt-3 md:pt-4 border-t">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPlacing}>
            Cancel
          </Button>
          <Button 
            onClick={placeOrder} 
            disabled={isPlacing || isLoading || !selectedOutletId || stockWarnings.length > 0}
          >
            {isPlacing ? "Placing..." : "Place Order"}
          </Button>
        </DialogFooter>

        <CustomerCreateDialog
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          compact
          onCreated={(c: ManualCustomer) => {
            const opt: CustomerOption = { kind: "manual", id: c.id, full_name: c.full_name, phone: c.phone, email: c.email, address: (c.address as any) || null };
            setCustomers((prev) => [opt, ...prev]);
            setSelectedCustomer(opt);
            setQuickAddOpen(false);
          }}
        />

        <VariantSelectorDialog
          open={variantSelectorOpen}
          onOpenChange={(open) => {
            setVariantSelectorOpen(open);
            if (!open) setPendingVariantProduct(null);
          }}
          product={pendingVariantProduct}
          onConfirm={(product, variation) => {
            addProductWithVariant(product as ProductRow, variation as SelectedVariation);
            setPendingVariantProduct(null);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
