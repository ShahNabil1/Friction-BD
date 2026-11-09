import { useState, useCallback, useMemo, useEffect } from "react";
import { Product } from "@/hooks/useProducts";
import { toast } from "sonner";

const POS_CART_STORAGE_KEY = "pos_active_cart";

export interface POSCartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  unitPrice: number;
  maxStock: number; // Maximum available stock for this variant at current outlet
}

export interface POSCustomer {
  id?: string;
  customerId?: string; // customers table primary key (for loyalty etc.)
  name: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints?: number;
}

export interface POSDiscount {
  type: "fixed" | "percentage";
  value: number;
}

// Load initial cart state from localStorage
function loadCartFromStorage(): POSCartItem[] {
  try {
    const stored = localStorage.getItem(POS_CART_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load POS cart from localStorage:", e);
  }
  return [];
}

export function usePOSCart() {
  const [items, setItems] = useState<POSCartItem[]>(() => loadCartFromStorage());
  const [customer, setCustomer] = useState<POSCustomer | null>(null);
  const [discountData, setDiscountData] = useState<POSDiscount | null>(null);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    try {
      if (items.length > 0) {
        localStorage.setItem(POS_CART_STORAGE_KEY, JSON.stringify(items));
      } else {
        localStorage.removeItem(POS_CART_STORAGE_KEY);
      }
    } catch (e) {
      console.error("Failed to save POS cart to localStorage:", e);
    }
  }, [items]);

  const addItem = useCallback((product: Product, size?: string, color?: string, maxStock: number = 999, variantPrice?: number | null) => {
    setItems((prev) => {
      // Check if same product with same variant exists
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === size &&
          item.selectedColor === color
      );

      if (existingIndex >= 0) {
        const existingItem = prev[existingIndex];
        // Check stock limit before incrementing
        if (existingItem.quantity >= existingItem.maxStock) {
          toast.error("Stock limit reached", {
            description: `Only ${existingItem.maxStock} available in stock`,
          });
          return prev;
        }
        // Increment quantity
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: updated[existingIndex].quantity + 1,
        };
        return updated;
      }

      // Check if there's any stock before adding new item
      if (maxStock <= 0) {
        toast.error("Out of stock", {
          description: "This item is not available at this outlet",
        });
        return prev;
      }

      // Use variant-specific price if available, otherwise fall back to product price
      const effectivePrice = (variantPrice && variantPrice > 0) ? variantPrice : product.price;

      // Add new item
      return [
        ...prev,
        {
          product,
          quantity: 1,
          selectedSize: size,
          selectedColor: color,
          unitPrice: effectivePrice,
          maxStock,
        },
      ];
    });
  }, []);

  const updateQuantity = useCallback((index: number, quantity: number) => {
    if (quantity < 1) {
      removeItem(index);
      return;
    }
    setItems((prev) => {
      const item = prev[index];
      if (!item) return prev;
      
      // Check stock limit
      if (quantity > item.maxStock) {
        toast.error("Stock limit reached", {
          description: `Only ${item.maxStock} available in stock`,
        });
        return prev;
      }
      
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity };
      return updated;
    });
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setDiscountData(null);
  }, []);

  const setDiscount = useCallback((discount: POSDiscount | null) => {
    setDiscountData(discount);
  }, []);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [items]);

  // Calculate actual discount amount based on type
  const discount = useMemo(() => {
    if (!discountData) return 0;
    if (discountData.type === "fixed") {
      return Math.min(discountData.value, subtotal);
    } else {
      // Percentage
      return Math.floor((subtotal * discountData.value) / 100);
    }
  }, [discountData, subtotal]);

  const total = Math.max(0, subtotal - discount);

  return {
    items,
    customer,
    discount,
    discountData,
    subtotal,
    total,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
    setCustomer,
    setDiscount,
  };
}
