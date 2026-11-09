import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { 
  Loader2, 
  ShoppingBag, 
  ArrowLeft, 
  Plus, 
  Minus,
  MapPin, 
  Check,
  Truck,
  Shield,
  Box,
  Award,
  RefreshCw,
  Tag,
  Star,
  Heart,
  Zap,
  Clock,
  ThumbsUp,
  BadgeCheck,
  Gift,
  PartyPopper,
  X,
  Ticket,
  ChevronRight,
  ChevronLeft,
  Trash2
} from "lucide-react";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCart } from "@/context/cart";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAddresses } from "@/hooks/useAddresses";
import { AddressCard, type Address } from "@/components/account/AddressCard";
import { AddressFormDialog, type AddressFormData } from "@/components/account/AddressFormDialog";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { trackInitiateCheckout, trackPurchase } from "@/services/Analytics";
import { LocationSelect } from "@/components/checkout/LocationSelect";
import { BD_DISTRICTS, BD_DISTRICT_NAMES } from "@/data/bdLocations";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";

// Generate or retrieve session ID for tracking guest users
function getSessionId(): string {
  const key = "abandoned_checkout_session_id";
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
}

// All prices are in BDT (whole integers, no decimals)
function formatPrice(n: number) {
  return new Intl.NumberFormat("en-BD", { style: "currency", currency: "BDT", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n);
}

// Icon mapping for dynamic trust badges
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Award,
  Box,
  Shield,
  RefreshCw,
  Star,
  Heart,
  Zap,
  Clock,
  ThumbsUp,
  BadgeCheck,
  Gift,
  Truck,
};

type CouponData = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount?: number;
} | null;

type AvailableCoupon = {
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  expires_at: string | null;
  max_uses: number | null;
  current_uses: number;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { lines, subtotal, clear, setQty, remove } = useCart();
  const {
    addresses,
    isLoading: isLoadingAddresses,
    isSaving: isSavingAddress,
    addAddress,
    getDefaultAddress,
    refetch: refetchAddresses,
  } = useAddresses();

  // Fetch dynamic store settings
  const { settings: storeSettings, isLoading: isLoadingSettings } = useStoreSettings();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  // Default to manual address if no user OR user has no saved addresses
  const [useManualAddress, setUseManualAddress] = useState(true);
  
  // Shipping selection
  const [shippingOption, setShippingOption] = useState<string>("inside_dhaka");
  
  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [availableCoupons, setAvailableCoupons] = useState<AvailableCoupon[]>([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  
  const [form, setForm] = useState({
    full_name: "",
    email: user?.email || "",
    phone: "",
    house_no: "",
    road_no: "",
    village: "",
    thana: "",
    zilla: "",
    notes: "",
  });

  // Shipping options from store settings
  // Note: Delivery fees are stored in BDT (e.g., 60 = 60 BDT)
  // Do NOT multiply by 100 - formatPrice displays values directly
  const shippingOptions = useMemo(() => [
    { 
      id: "inside_dhaka", 
      label: "ঢাকার ভিতরে (Inside Dhaka)", 
      price: storeSettings.delivery_inside_dhaka,
      originalPrice: storeSettings.delivery_inside_dhaka,
    },
    { 
      id: "outside_dhaka", 
      label: "ঢাকার বাইরে (Outside Dhaka)", 
      price: storeSettings.delivery_outside_dhaka,
      originalPrice: storeSettings.delivery_outside_dhaka,
    },
  ], [storeSettings]);

  // Calculate shipping cost (0 if free shipping is active)
  // All prices are in BDT (whole integers) - no paisa conversion needed
  const selectedShipping = shippingOptions.find(o => o.id === shippingOption);
  const originalShippingCostBDT = selectedShipping?.originalPrice || 0;
  const shippingCostBDT = storeSettings.is_free_shipping_active ? 0 : (selectedShipping?.price || 0);
  
  // Calculate discount - all values in BDT
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discount_type === "percentage") {
      return Math.round((subtotal * appliedCoupon.discount_value) / 100);
    }
    // Fixed amount - already in BDT
    return appliedCoupon.discount_value;
  };
  
  const discountAmount = calculateDiscount();
  // All values in BDT for calculation
  const total = Math.max(0, subtotal + shippingCostBDT - discountAmount);

  // Track InitiateCheckout when page loads
  useEffect(() => {
    if (lines.length > 0) {
      const productIds = lines.map(l => l.id);
      trackInitiateCheckout(productIds, subtotal, lines.reduce((sum, l) => sum + l.qty, 0));
    }
  }, []);

  // Fetch available coupons for all users (including guests)
  useEffect(() => {
    const fetchAvailableCoupons = async () => {
      setIsLoadingCoupons(true);
      try {
        const { data, error } = await supabase
          .from("coupons")
          .select("code, discount_type, discount_value, min_order_amount, expires_at, max_uses, current_uses")
          .eq("is_active", true)
          .order("discount_value", { ascending: false });

        if (error) throw error;

        // Filter out expired and maxed out coupons
        const validCoupons = (data || []).filter((coupon) => {
          const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
          const isMaxedOut = coupon.max_uses && coupon.current_uses >= coupon.max_uses;
          return !isExpired && !isMaxedOut;
        });

        setAvailableCoupons(validCoupons as AvailableCoupon[]);
      } catch (err) {
        console.error("Error fetching coupons:", err);
      } finally {
        setIsLoadingCoupons(false);
      }
    };

    fetchAvailableCoupons();
  }, []);

  // Update form email when user changes
  useEffect(() => {
    if (user?.email && !form.email) {
      setForm((prev) => ({ ...prev, email: user.email || "" }));
    }
  }, [user]);

  // Select default address when addresses load (only for logged in users)
  useEffect(() => {
    if (!user || !isLoadingAddresses) return;
    if (addresses.length > 0 && !selectedAddress) {
      const defaultAddr = getDefaultAddress();
      if (defaultAddr) {
        setSelectedAddress(defaultAddr);
        setUseManualAddress(false);
        setForm((prev) => ({
          ...prev,
          full_name: defaultAddr.full_name || prev.full_name,
          phone: defaultAddr.phone || prev.phone,
        }));
      }
    }
  }, [user, addresses, isLoadingAddresses, selectedAddress, getDefaultAddress]);

  // Abandoned checkout auto-save via edge function
  const abandonedCheckoutSavedRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string>(getSessionId());

  // Function to save abandoned checkout data
  const saveAbandonedCheckout = useCallback((phoneDigits: string, isInitialSave: boolean = false) => {
    if (lines.length === 0) return;
    
    // Build address details from form
    const addressDetails = {
      road_no: form.road_no || undefined,
      village: form.village || undefined,
      thana: form.thana || undefined,
      zilla: form.zilla || undefined,
      notes: form.notes || undefined,
    };

    // Save silently in background via edge function (bypasses RLS)
    supabase.functions.invoke("save-abandoned-checkout", {
      body: {
        phone: phoneDigits,
        customer_name: form.full_name || undefined,
        session_id: sessionIdRef.current,
        address_details: addressDetails,
        cart_items: lines.map((line) => ({
          id: line.id,
          title: line.title,
          price: line.price,
          qty: line.qty,
          image: line.image,
          variation: line.variation,
        })),
      },
    }).catch((err) => {
      // Silently ignore errors - this is a background save
      console.error("Abandoned checkout save error:", err);
    });
  }, [form, lines]);

  // Auto-save abandoned checkout when phone reaches 11 digits (immediate trigger)
  useEffect(() => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    
    // Only save if phone is valid (11 digits) and we have cart items
    if (phoneDigits.length === 11 && lines.length > 0) {
      // Avoid duplicate saves for the same phone number on initial trigger
      if (abandonedCheckoutSavedRef.current !== phoneDigits) {
        abandonedCheckoutSavedRef.current = phoneDigits;
        saveAbandonedCheckout(phoneDigits, true);
      }
    }
  }, [form.phone, lines, saveAbandonedCheckout]);

  // Debounced auto-save for name and address changes (after phone is valid)
  const triggerDebouncedSave = useCallback(() => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11 || lines.length === 0) return;

    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce updates to avoid too many API calls
    debounceTimerRef.current = setTimeout(() => {
      saveAbandonedCheckout(phoneDigits, false);
    }, 1500); // 1.5 second debounce
  }, [form.phone, lines, saveAbandonedCheckout]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle blur event for auto-saving additional details
  const handleFieldBlur = useCallback((fieldName: string) => {
    const phoneDigits = form.phone.replace(/\D/g, "");
    // Only trigger save if phone is valid
    if (phoneDigits.length === 11 && lines.length > 0) {
      triggerDebouncedSave();
    }
  }, [form.phone, lines, triggerDebouncedSave]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setUseManualAddress(false);
    setForm((prev) => ({
      ...prev,
      full_name: address.full_name || prev.full_name,
      phone: address.phone || prev.phone,
    }));
  };

  const handleAddNewAddress = async (data: AddressFormData) => {
    try {
      await addAddress(data);
      setShowAddressForm(false);
      await refetchAddresses();
    } catch {
      // Error handled in hook
    }
  };

  // Apply coupon logic
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast({ title: "Error", description: "Please enter a coupon code", variant: "destructive" });
      return;
    }

    setIsApplyingCoupon(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("code, discount_type, discount_value, min_order_amount, max_uses, current_uses, expires_at, is_active")
        .eq("code", couponCode.trim().toUpperCase())
        .single();

      if (error || !data) {
        toast({ title: "Invalid Coupon", description: "This coupon code doesn't exist", variant: "destructive" });
        return;
      }

      // Check if active
      if (!data.is_active) {
        toast({ title: "Expired Coupon", description: "This coupon is no longer active", variant: "destructive" });
        return;
      }

      // Check expiry
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        toast({ title: "Expired Coupon", description: "This coupon has expired", variant: "destructive" });
        return;
      }

      // Check max uses
      if (data.max_uses && data.current_uses >= data.max_uses) {
        toast({ title: "Coupon Limit Reached", description: "This coupon has reached its usage limit", variant: "destructive" });
        return;
      }

      // Check min order amount - min_order_amount is stored in BDT, subtotal is in paisa
      const minAmountPaisa = data.min_order_amount ? Number(data.min_order_amount) * 100 : 0;
      if (subtotal < minAmountPaisa) {
        toast({ 
          title: "Minimum Not Met", 
          description: `Minimum order amount is ${formatPrice(minAmountPaisa)}`, 
          variant: "destructive" 
        });
        return;
      }

      // Success!
      setAppliedCoupon({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: Number(data.discount_value),
        min_order_amount: Number(data.min_order_amount) || 0,
      });
      
      // Show formatted discount message
      const discountDisplay = data.discount_type === 'percentage' 
        ? `${data.discount_value}%` 
        : formatPrice(Number(data.discount_value) * 100); // Convert BDT to paisa for display
      toast({ title: "Coupon Applied! 🎉", description: `Discount of ${discountDisplay} applied` });
      
    } catch (err) {
      console.error("Coupon error:", err);
      toast({ title: "Error", description: "Failed to apply coupon", variant: "destructive" });
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  // Direct apply coupon from available list (already validated)
  const handleApplyCouponDirect = (coupon: AvailableCoupon) => {
    setAppliedCoupon({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: Number(coupon.discount_value),
      min_order_amount: coupon.min_order_amount,
    });
    
    const discountDisplay = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%` 
      : formatPrice(Number(coupon.discount_value) * 100);
    toast({ title: "Coupon Applied! 🎉", description: `Discount of ${discountDisplay} applied` });
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    toast({ title: "Coupon Removed" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (lines.length === 0) {
      toast({ title: "Cart is empty", description: "Add some products to your cart first", variant: "destructive" });
      return;
    }

    if (!form.full_name || !form.phone) {
      toast({ title: "Missing fields", description: "Please fill in name and phone number", variant: "destructive" });
      return;
    }

    // Validate Bangladesh phone format (11 digits starting with 01)
    const phoneDigits = form.phone.replace(/\D/g, "");
    if (phoneDigits.length !== 11 || !phoneDigits.startsWith("01")) {
      toast({ 
        title: "Invalid phone number", 
        description: "Please enter a valid Bangladesh phone number (11 digits starting with 01)", 
        variant: "destructive" 
      });
      return;
    }

    // Email is optional - no validation required

    // Check if manual form has valid address data
    const hasValidManualAddress = form.zilla && form.zilla.trim().length > 0;

    // For logged-in users: need either a selected address OR valid manual form data
    if (user && !selectedAddress && !hasValidManualAddress) {
      toast({ title: "Address required", description: "Please select a saved address or fill in the district field", variant: "destructive" });
      return;
    }

    // For guests or manual address mode: district is required
    if (!selectedAddress && !hasValidManualAddress) {
      toast({ title: "Missing fields", description: "Please fill in the district", variant: "destructive" });
      return;
    }

    // Determine if we should use manual address mode
    // If user has no selected address but filled the form, treat as manual
    const shouldUseManualAddress = useManualAddress || (!selectedAddress && hasValidManualAddress);

    setIsSubmitting(true);

    try {
      let addressToUse = selectedAddress;

      // Auto-save address for logged-in users using manual form
      if (user && shouldUseManualAddress) {
        // First, unset all other defaults
        await supabase
          .from("user_addresses")
          .update({ is_default: false })
          .eq("user_id", user.id);

        // Save the new address
        const { data: newAddress, error: addressError } = await supabase
          .from("user_addresses")
          .insert({
            user_id: user.id,
            label: "Home",
            full_name: form.full_name,
            phone: form.phone,
            house_no: "",
            flat_no: "",
            road_no: form.road_no || "",
            village: form.village || "",
            post_office: "",
            thana: form.thana || "",
            upazilla: "",
            zilla: form.zilla,
            is_default: true,
          } as any)
          .select()
          .single();

        if (addressError) {
          console.error("Error saving address:", addressError);
          // Continue with order even if address save fails
        } else if (newAddress) {
          addressToUse = newAddress as unknown as Address;
          // Refetch addresses in background
          refetchAddresses();
        }
      }

      const shippingAddress = (!user || shouldUseManualAddress)
        ? {
            house_no: "",
            road_no: form.road_no,
            village: form.village,
            thana: form.thana,
            zilla: form.zilla,
            notes: form.notes,
          }
        : {
            house_no: addressToUse?.house_no || "",
            flat_no: addressToUse?.flat_no || "",
            road_no: addressToUse?.road_no || "",
            village: addressToUse?.village || "",
            post_office: addressToUse?.post_office || "",
            thana: addressToUse?.thana || "",
            upazilla: addressToUse?.upazilla || "",
            zilla: addressToUse?.zilla || "",
            notes: form.notes,
          };

      const cartItems = lines.map((line) => ({
        id: line.id,
        title: line.title,
        price: line.price,
        qty: line.qty,
        image: line.image,
        variation: line.variation,
      }));

      if (user) {
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            user_id: user.id,
            total_amount: total,
            delivery_fee: shippingCostBDT,
            status: "pending",
            customer_name: form.full_name,
            customer_email: form.email || user.email,
            customer_phone: form.phone,
            shipping_address: shippingAddress,
            coupon_code: appliedCoupon?.code || null,
            discount: discountAmount,
          } as any)
          .select()
          .single();

        if (orderError) throw orderError;

        const orderItems = lines.map((line) => ({
          order_id: order.id,
          product_id: line.id,
          title: line.title, // Required field
          product_name: line.title,
          product_image: line.image || null,
          price: line.price * line.qty, // Required: total line price
          qty: line.qty, // Required field
          quantity: line.qty,
          unit_price: line.price,
          selected_variation: line.variation || null,
        }));

        const { error: itemsError } = await supabase.from("order_items").insert(orderItems as any);
        if (itemsError) throw itemsError;

        // Update coupon usage count
        if (appliedCoupon) {
          try {
            const { data: couponData } = await supabase
              .from("coupons")
              .select("current_uses")
              .eq("code", appliedCoupon.code)
              .single();
            
            if (couponData) {
              await supabase
                .from("coupons")
                .update({ current_uses: (couponData.current_uses || 0) + 1 })
                .eq("code", appliedCoupon.code);
            }
          } catch (e) {
            console.error("Coupon usage update error:", e);
          }
        }

        try {
          await supabase.functions.invoke("send-order-email", {
            body: {
              orderId: order.id,
              status: "pending",
              customerEmail: form.email || user.email,
              customerName: form.full_name,
              totalAmount: total,
              sendAdminNotification: true,
            },
          });
        } catch (emailError) {
          console.error("Email error:", emailError);
        }

        // Track Purchase event
        trackPurchase(
          order.id,
          lines.map(l => l.id),
          total / 100,
          lines.reduce((sum, l) => sum + l.qty, 0),
          form.email || user.email,
          form.phone
        );

        // Remove any incomplete (abandoned) order rows for this phone – the real order supersedes them
        const phoneDigits = form.phone.replace(/\D/g, "");
        if (phoneDigits.length === 11) {
          try {
            await supabase
              .from("orders")
              .delete()
              .eq("customer_phone", phoneDigits)
              .eq("status", "incomplete");
          } catch {
            // Silently ignore errors
          }
        }


        // Save order data for success page
        sessionStorage.setItem("lastOrder", JSON.stringify({
          orderId: order.id,
          customerName: form.full_name,
          customerEmail: form.email || user.email,
          customerPhone: form.phone,
          totalAmount: total,
          shippingCost: shippingCostBDT,
          items: cartItems,
          isNewUser: false,
        }));

        clear();
        toast({ title: "Order Placed!", description: `Order #${(order as any).order_number || order.id.slice(0, 8).toUpperCase()} confirmed` });
        navigate("/order-success");

      } else {
        const { data, error } = await supabase.functions.invoke("process-guest-order", {
          body: {
            email: form.email,
            full_name: form.full_name,
            phone: form.phone,
            shipping_address: shippingAddress,
            cart_items: cartItems,
            notes: form.notes,
            shipping_cost: shippingCostBDT,
            coupon_code: appliedCoupon?.code || null,
            discount_amount: discountAmount,
            total_amount: total,
          },
        });

        if (error) throw error;

        if (!data?.success) {
          throw new Error(data?.error || "Failed to process order");
        }

        // Track Purchase event for guest
        trackPurchase(
          data.orderId,
          lines.map(l => l.id),
          total / 100,
          lines.reduce((sum, l) => sum + l.qty, 0),
          form.email,
          form.phone
        );

        // Remove any incomplete (abandoned) order rows for this phone – the real order supersedes them
        const phoneDigits = form.phone.replace(/\D/g, "");
        if (phoneDigits.length === 11) {
          try {
            await supabase
              .from("orders")
              .delete()
              .eq("customer_phone", phoneDigits)
              .eq("status", "incomplete");
          } catch {
            // Silently ignore errors
          }
        }


        // Save order data for success page
        sessionStorage.setItem("lastOrder", JSON.stringify({
          orderId: data.orderId,
          customerName: form.full_name,
          customerEmail: form.email,
          customerPhone: form.phone,
          totalAmount: total,
          shippingCost: shippingCostBDT,
          items: cartItems,
          isNewUser: data.isNewUser,
        }));

        clear();
        toast({ title: "Order Placed!", description: `Order confirmed successfully!` });
        navigate("/order-success");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast({ title: "Error", description: error.message || "Failed to place order", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (lines.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <HeaderNav />
        <main className="container py-16 text-center">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mt-6 font-serif text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add some products before checking out</p>
          <Button asChild className="mt-6 rounded-xl">
            <Link to="/">Continue Shopping</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HeaderNav />
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        {/* Back Link */}
        <Button variant="ghost" asChild className="mb-4 -ml-2 rounded-xl">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Continue Shopping
          </Link>
        </Button>

        <form onSubmit={handleSubmit}>
          {/* Two-Column Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            
            {/* LEFT COLUMN: Customer Details, Shipping, Payment */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-5">
              
              {/* Page Header */}
              <div className="mb-2">
                <h1 className="font-serif text-2xl md:text-3xl font-bold">চেকআউট</h1>
                <p className="text-muted-foreground text-sm mt-1">Complete your order details below</p>
              </div>

              {/* Section 1: Billing / Shipping Address */}
              <Card className="shadow-sm border rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-primary/5 rounded-t-2xl">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-primary" />
                    Billing Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Email field removed - Name and Phone only */}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-sm font-medium">Full Name *</Label>
                      <Input id="full_name" name="full_name" value={form.full_name} onChange={handleChange} required className="h-11 rounded-xl" placeholder="আপনার নাম" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-medium">Phone *</Label>
                      <BDPhoneInput id="phone" name="phone" value={form.phone} onChange={(v) => setForm((p) => ({ ...p, phone: v }))} required className="h-11 rounded-xl" placeholder="আপনার মোবাইল নাম্বার" showValidationHint />
                    </div>
                  </div>

                  {!user ? (
                    // Guest - show manual form
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="road_no" className="text-sm">Full Address</Label>
                        <Input id="road_no" name="road_no" value={form.road_no} onChange={handleChange} className="h-11 rounded-xl" placeholder="আপনার সম্পূর্ণ ঠিকানা" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zilla" className="text-sm font-medium">District (Zilla) *</Label>
                          <LocationSelect
                            id="zilla"
                            value={form.zilla}
                            onChange={(v) => setForm((p) => ({ ...p, zilla: v, thana: BD_DISTRICTS[v]?.includes(p.thana) ? p.thana : "" }))}
                            options={BD_DISTRICT_NAMES}
                            placeholder="জেলা নির্বাচন করুন"
                            searchPlaceholder="Search district…"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="thana" className="text-sm">Thana / Upazilla</Label>
                          <LocationSelect
                            id="thana"
                            value={form.thana}
                            onChange={(v) => setForm((p) => ({ ...p, thana: v }))}
                            options={form.zilla ? (BD_DISTRICTS[form.zilla] ?? []) : []}
                            placeholder="থানা / উপজেলা নির্বাচন করুন"
                            searchPlaceholder="Search thana / upazilla…"
                            disabled={!form.zilla}
                            disabledReason="আগে জেলা নির্বাচন করুন"
                          />
                        </div>
                      </div>
                    </>
                  ) : isLoadingAddresses ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : addresses.length === 0 || useManualAddress ? (
                    <>
                      {addresses.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setUseManualAddress(false)} className="mb-2 rounded-xl">
                          <ArrowLeft className="mr-1.5 h-4 w-4" /> Use saved address
                        </Button>
                      )}
                      <div className="space-y-2">
                        <Label htmlFor="road_no" className="text-sm">Full Address</Label>
                        <Input id="road_no" name="road_no" value={form.road_no} onChange={handleChange} className="h-11 rounded-xl" placeholder="আপনার সম্পূর্ণ ঠিকানা" />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="zilla" className="text-sm font-medium">District (Zilla) *</Label>
                          <LocationSelect
                            id="zilla"
                            value={form.zilla}
                            onChange={(v) => setForm((p) => ({ ...p, zilla: v, thana: BD_DISTRICTS[v]?.includes(p.thana) ? p.thana : "" }))}
                            options={BD_DISTRICT_NAMES}
                            placeholder="জেলা নির্বাচন করুন"
                            searchPlaceholder="Search district…"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="thana" className="text-sm">Thana / Upazilla</Label>
                          <LocationSelect
                            id="thana"
                            value={form.thana}
                            onChange={(v) => setForm((p) => ({ ...p, thana: v }))}
                            options={form.zilla ? (BD_DISTRICTS[form.zilla] ?? []) : []}
                            placeholder="থানা / উপজেলা নির্বাচন করুন"
                            searchPlaceholder="Search thana / upazilla…"
                            disabled={!form.zilla}
                            disabledReason="আগে জেলা নির্বাচন করুন"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        {addresses.map((address) => (
                          <AddressCard
                            key={address.id}
                            address={address}
                            selectable
                            selected={selectedAddress?.id === address.id}
                            onSelect={handleAddressSelect}
                            compact
                          />
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowAddressForm(true)} className="rounded-xl">
                          <Plus className="mr-1.5 h-4 w-4" /> Add New
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setUseManualAddress(true)} className="rounded-xl">
                          <MapPin className="mr-1.5 h-4 w-4" /> Enter Manually
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Order Notes */}
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="notes" className="text-sm">Order Notes (optional)</Label>
                    <Textarea id="notes" name="notes" value={form.notes} onChange={handleChange} rows={2} placeholder="Special delivery instructions..." className="resize-none rounded-xl" />
                  </div>
                </CardContent>
              </Card>

              {/* Section 2: Shipping Method */}
              <Card className="shadow-sm border rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-primary/5 rounded-t-2xl">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Shipping Method
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 pt-4">
                  {/* Free Shipping Banner */}
                  {storeSettings.is_free_shipping_active && (
                    <div className="flex items-center gap-2 rounded-xl border-2 border-bubu-green bg-bubu-green/10 p-3 text-bubu-green-foreground">
                      <PartyPopper className="h-5 w-5 text-bubu-green" />
                      <span className="font-medium">🎉 Free Delivery Applied!</span>
                    </div>
                  )}
                  
                  <RadioGroup value={shippingOption} onValueChange={setShippingOption} className="space-y-2">
                    {shippingOptions.map((option) => (
                      <label
                        key={option.id}
                        className={`flex items-center justify-between rounded-xl border-2 p-4 cursor-pointer transition-all ${
                          shippingOption === option.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <span className="font-medium">{option.label}</span>
                        </div>
                        {storeSettings.is_free_shipping_active ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm line-through text-muted-foreground">{formatPrice(option.originalPrice)}</span>
                            <span className="font-bold text-bubu-green">FREE</span>
                          </div>
                        ) : (
                          <span className="font-bold text-primary">{formatPrice(option.price)}</span>
                        )}
                      </label>
                    ))}
                  </RadioGroup>
                  
                  {/* Estimated Delivery Date */}
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                    <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>
                      <span className="font-medium">Estimated Delivery:</span>{" "}
                      {shippingOption === "inside_dhaka" 
                        ? "১-২ কার্যদিবস (1-2 working days)" 
                        : "২-৩ কার্যদিবস (2-3 working days)"}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Section 3: Payment Method */}
              <Card className="shadow-sm border rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-primary/5 rounded-t-2xl">
                  <CardTitle className="text-base">Payment Method</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-3 rounded-xl border-2 border-bubu-green bg-bubu-green/10 p-4">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-bubu-green">
                      <Check className="h-4 w-4 text-bubu-green-foreground" />
                    </div>
                    <span className="font-medium">Cash On Delivery (COD)</span>
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* RIGHT COLUMN: Order Summary Sidebar */}
            <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24">
              <Card className="shadow-md border bg-card rounded-2xl overflow-hidden">
                <CardHeader className="pb-3 bg-primary/5 rounded-t-2xl border-b">
                  <CardTitle className="text-lg flex items-center gap-2 font-serif">
                    <ShoppingBag className="h-5 w-5 text-primary" />
                    Your Order
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {/* Cart Items - Interactive */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {lines.map((line) => {
                      // Build product path for navigation
                      const category = line.category?.toLowerCase().replace(/\s+/g, "-") || "products";
                      const subcategory = line.subcategory?.toLowerCase().replace(/\s+/g, "-") || "all";
                      const productPath = line.slug 
                        ? `/${category}/${subcategory}/${line.slug}` 
                        : null;
                      
                      return (
                        <div key={`${line.id}-${line.variation?.color}-${line.variation?.size}`} className="rounded-xl border bg-muted/30 p-3">
                          <div className="flex gap-3">
                            {line.image && (
                              productPath ? (
                                <Link 
                                  to={productPath} 
                                  className="relative z-10 block flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <img 
                                    src={line.image} 
                                    alt={line.title} 
                                    className="h-14 w-14 rounded-lg object-cover border pointer-events-none"
                                  />
                                </Link>
                              ) : (
                                <img 
                                  src={line.image} 
                                  alt={line.title} 
                                  className="h-14 w-14 rounded-lg object-cover border flex-shrink-0"
                                />
                              )
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  {productPath ? (
                                    <Link 
                                      to={productPath}
                                      className="relative z-10 block font-medium text-sm truncate cursor-pointer hover:text-primary hover:underline transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {line.title}
                                    </Link>
                                  ) : (
                                    <p className="font-medium text-sm truncate">{line.title}</p>
                                  )}
                                  {line.variation && (
                                    <p className="text-xs text-muted-foreground">
                                      {[line.variation.color, line.variation.size].filter(Boolean).join(" / ")}
                                    </p>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
                                  onClick={() => remove(line.id, line.variation)}
                                  aria-label={`Remove ${line.title}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="mt-2 flex items-center justify-between">
                                <div className="inline-flex items-center gap-1 rounded-full border bg-background px-1 py-0.5">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => setQty(line.id, line.qty - 1, line.variation)}
                                    aria-label="Decrease quantity"
                                  >
                                    {line.qty === 1 ? (
                                      <Trash2 className="h-3 w-3 text-destructive" />
                                    ) : (
                                      <Minus className="h-3 w-3" />
                                    )}
                                  </Button>
                                  <span className="min-w-6 text-center text-sm font-semibold">{line.qty}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 rounded-full"
                                    onClick={() => setQty(line.id, line.qty + 1, line.variation)}
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                                <p className="font-semibold text-sm">{formatPrice(line.price * line.qty)}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Continue Shopping Link */}
                  <div className="flex justify-center pt-1 pb-2">
                    <button
                      type="button"
                      onClick={() => window.history.back()}
                      className="text-sm text-primary hover:underline flex items-center gap-1.5 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Continue Shopping
                    </button>
                  </div>

                  <Separator />

                  {/* Coupon Section */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Discount Code
                    </Label>
                    
                    {/* Applied Coupon Badge */}
                    {appliedCoupon ? (
                      <div className="flex items-center justify-between rounded-xl border-2 border-bubu-green bg-bubu-green/10 p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bubu-green">
                            <Ticket className="h-4 w-4 text-bubu-green-foreground" />
                          </div>
                          <div>
                            <p className="font-bold text-bubu-green text-sm">{appliedCoupon.code}</p>
                            <p className="text-xs text-bubu-green/80">
                              {appliedCoupon.discount_type === 'percentage' 
                                ? `${appliedCoupon.discount_value}% off` 
                                : `৳${appliedCoupon.discount_value} off`}
                              {appliedCoupon.min_order_amount && appliedCoupon.min_order_amount > 0 && (
                                <> on ৳{appliedCoupon.min_order_amount}+</>
                              )}
                            </p>
                          </div>
                        </div>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon"
                          onClick={removeCoupon} 
                          className="h-8 w-8 rounded-full hover:bg-destructive/10 text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        {/* Coupon Input */}
                        <div className="flex gap-2">
                          <Input
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            placeholder="Enter coupon code"
                            className="h-10 flex-1 uppercase text-sm rounded-xl"
                          />
                          <Button 
                            type="button" 
                            onClick={handleApplyCoupon}
                            disabled={isApplyingCoupon || !couponCode.trim()}
                            className="h-10 px-4 rounded-xl"
                          >
                            {isApplyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                          </Button>
                        </div>

                        {/* Available Coupons for All Users */}
                        {availableCoupons.length > 0 && (() => {
                          // Calculate actual discount for each coupon to find the best one
                          const getCouponDiscount = (coupon: AvailableCoupon) => {
                            const meetsMin = !coupon.min_order_amount || subtotal >= coupon.min_order_amount * 100;
                            if (!meetsMin) return 0;
                            if (coupon.discount_type === 'percentage') {
                              return Math.round((subtotal * Number(coupon.discount_value)) / 100);
                            }
                            return Number(coupon.discount_value) * 100; // Convert BDT to paisa
                          };
                          
                          // Find coupon with best discount
                          let bestCouponCode: string | null = null;
                          let bestDiscount = 0;
                          availableCoupons.forEach((coupon) => {
                            const discount = getCouponDiscount(coupon);
                            if (discount > bestDiscount) {
                              bestDiscount = discount;
                              bestCouponCode = coupon.code;
                            }
                          });

                          return (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground font-medium">Available Coupons:</p>
                              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {availableCoupons.map((coupon) => {
                                  const meetsMinimum = !coupon.min_order_amount || subtotal >= coupon.min_order_amount * 100;
                                  const isBestDeal = coupon.code === bestCouponCode;
                                  return (
                                    <button
                                      key={coupon.code}
                                      type="button"
                                      onClick={() => {
                                        if (meetsMinimum) {
                                          setCouponCode(coupon.code);
                                          handleApplyCouponDirect(coupon);
                                        }
                                      }}
                                      disabled={!meetsMinimum}
                                      className={`w-full flex items-center justify-between rounded-lg border p-2.5 text-left transition-all ${
                                        isBestDeal && meetsMinimum
                                          ? 'border-bubu-green bg-bubu-green/10 hover:border-bubu-green hover:bg-bubu-green/20 ring-1 ring-bubu-green/30'
                                          : meetsMinimum 
                                            ? 'border-primary/30 bg-primary/5 hover:border-primary hover:bg-primary/10 cursor-pointer' 
                                            : 'border-border bg-muted/30 opacity-60 cursor-not-allowed'
                                      }`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <div className={`flex h-7 w-7 items-center justify-center rounded-full ${
                                          isBestDeal && meetsMinimum ? 'bg-bubu-green/30' : meetsMinimum ? 'bg-primary/20' : 'bg-muted'
                                        }`}>
                                          <Ticket className={`h-3.5 w-3.5 ${
                                            isBestDeal && meetsMinimum ? 'text-bubu-green' : meetsMinimum ? 'text-primary' : 'text-muted-foreground'
                                          }`} />
                                        </div>
                                        <div>
                                          <div className="flex items-center gap-1.5">
                                            <p className="font-mono font-bold text-xs">{coupon.code}</p>
                                            {isBestDeal && meetsMinimum && (
                                              <span className="inline-flex items-center gap-0.5 rounded-full bg-bubu-green px-1.5 py-0.5 text-[9px] font-bold text-bubu-green-foreground animate-fade-in">
                                                <Star className="h-2.5 w-2.5 fill-current" />
                                                BEST
                                              </span>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-muted-foreground">
                                            {coupon.discount_type === 'percentage' 
                                              ? `${coupon.discount_value}% off` 
                                              : `৳${coupon.discount_value} off`}
                                            {coupon.min_order_amount > 0 && (
                                              <> • Min: ৳{coupon.min_order_amount}</>
                                            )}
                                          </p>
                                        </div>
                                      </div>
                                      {meetsMinimum ? (
                                        <ChevronRight className={`h-4 w-4 ${isBestDeal ? 'text-bubu-green' : 'text-primary'}`} />
                                      ) : (
                                        <span className="text-[10px] text-muted-foreground">
                                          Add ৳{((coupon.min_order_amount * 100) - subtotal) / 100} more
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        
                        {isLoadingCoupons && (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <Separator />

                  {/* Price Breakdown - all values in BDT */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping</span>
                      {storeSettings.is_free_shipping_active ? (
                        <div className="flex items-center gap-2">
                          <span className="line-through text-muted-foreground">{formatPrice(originalShippingCostBDT)}</span>
                          <span className="font-medium text-bubu-green">FREE</span>
                        </div>
                      ) : (
                        <span>{formatPrice(shippingCostBDT)}</span>
                      )}
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between text-bubu-green">
                        <span>Discount</span>
                        <span>-{formatPrice(discountAmount)}</span>
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">{formatPrice(total)}</span>
                  </div>

                  {/* Place Order Button */}
                  <Button type="submit" variant="brand" size="lg" className="w-full h-12 text-base rounded-xl bg-bubu-red text-bubu-red-foreground hover:bg-bubu-red/90" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Placing Order...
                      </>
                    ) : (
                      "অর্ডার কনফার্ম করুন"
                    )}
                  </Button>
                  
                  <p className="text-center text-xs text-muted-foreground">
                    Total: {formatPrice(total)}
                  </p>
                </CardContent>
              </Card>

              {/* Trust Badges - Below Order Summary */}
              {storeSettings.trust_badges && storeSettings.trust_badges.length > 0 && (
                <div className="mt-5 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4">
                  <h3 className="text-center font-semibold text-primary mb-3 text-sm">Why Choose Us?</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {storeSettings.trust_badges.map((badge, idx) => {
                      const IconComponent = ICON_MAP[badge.icon] || Award;
                      return (
                        <div key={idx} className="flex items-center gap-2 rounded-xl bg-background p-2.5 shadow-sm">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                            <IconComponent className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs leading-tight truncate">{badge.title}</p>
                            {badge.subtitle && (
                              <p className="text-[10px] text-muted-foreground truncate">{badge.subtitle}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>
        </form>
      </main>
      <Footer />

      {/* Add Address Dialog */}
      <AddressFormDialog
        open={showAddressForm}
        onOpenChange={setShowAddressForm}
        onSubmit={handleAddNewAddress}
        editingAddress={null}
        isSaving={isSavingAddress}
      />
    </div>
  );
}
