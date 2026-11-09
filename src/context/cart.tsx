import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type SelectedVariation = {
  color?: string;
  size?: string;
};

export type CartLine = {
  id: string;
  title: string;
  price: number; // cents
  qty: number;
  image?: string;
  variation?: SelectedVariation;
  slug?: string;
  category?: string;
  subcategory?: string;
  stock?: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  add: (item: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (id: string, qty: number, variation?: SelectedVariation) => void;
  remove: (id: string, variation?: SelectedVariation) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = "luxetime_cart_v2";

// Generate a unique key for cart line (product + variation)
function getLineKey(id: string, variation?: SelectedVariation): string {
  if (!variation || (!variation.color && !variation.size)) {
    return id;
  }
  const parts = [id];
  if (variation.color) parts.push(`c:${variation.color}`);
  if (variation.size) parts.push(`s:${variation.size}`);
  return parts.join("|");
}

// Sync live prices from products/variants
async function syncLivePrices(cartLines: CartLine[]): Promise<CartLine[]> {
  if (cartLines.length === 0) return cartLines;

  const productIds = [...new Set(cartLines.map((l) => l.id))];
  
  // Fetch products and their variants in parallel
  const [productsRes, variantsRes] = await Promise.all([
    supabase.from("products").select("id, price_cents, stock, status").in("id", productIds),
    supabase.from("product_variants").select("product_id, size, color, price_cents, stock_quantity").in("product_id", productIds)
  ]);

  const products = productsRes.data || [];
  const variants = variantsRes.data || [];

  // Create lookup maps
  const productMap = new Map(products.map((p) => [p.id, p]));
  const variantMap = new Map<string, typeof variants[0]>();
  variants.forEach((v) => {
    const key = `${v.product_id}|${v.size || ""}|${v.color || ""}`;
    variantMap.set(key, v);
  });

  // Update cart lines with live prices and filter out deleted products
  const syncedLines: CartLine[] = [];
  
  for (const line of cartLines) {
    const product = productMap.get(line.id);
    
    // Skip items where product no longer exists or is inactive (ghost cleanup)
    if (!product || product.status === "deleted") {
      console.log(`Removing ghost item: ${line.title} (product deleted)`);
      continue;
    }

    let livePrice = product.price_cents;
    let liveStock = product.stock || 0;

    // Check for variant-specific pricing
    if (line.variation?.size || line.variation?.color) {
      const variantKey = `${line.id}|${line.variation.size || ""}|${line.variation.color || ""}`;
      const variant = variantMap.get(variantKey);
      if (variant) {
        // Prefer variant price if set, otherwise use product price
        if (variant.price_cents && variant.price_cents > 0) {
          livePrice = variant.price_cents;
        }
        liveStock = variant.stock_quantity || 0;
      }
    }

    syncedLines.push({
      ...line,
      price: livePrice,
      stock: liveStock,
    });
  }

  return syncedLines;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [lines, setLines] = useState<CartLine[]>([]);
  const [initialized, setInitialized] = useState(false);

  // Immediately persist cart to both localStorage and Supabase
  const persistCart = useCallback(async (newLines: CartLine[]) => {
    // Always save to localStorage first (instant)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newLines));
    } catch {
      // ignore localStorage errors
    }

    // If user is logged in, sync to Supabase immediately (no debounce for removes)
    if (user) {
      try {
        const { error } = await supabase
          .from("customer_carts")
          .upsert(
            {
              user_id: user.id,
              cart_items: newLines as any,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        
        if (error) {
          console.error("Cart sync error:", error);
        }
      } catch (err) {
        console.error("Cart sync failed:", err);
      }
    }
  }, [user]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const loadLocalCart = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
          setInitialized(true);
          return;
        }
        const parsed = JSON.parse(raw) as CartLine[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Sync live prices on initial load
          const synced = await syncLivePrices(parsed);
          setLines(synced);
          // Update localStorage with synced prices
          localStorage.setItem(STORAGE_KEY, JSON.stringify(synced));
        }
      } catch {
        // ignore parse errors
      }
      setInitialized(true);
    };
    
    loadLocalCart();
  }, []);

  // Load cart from Supabase when user logs in
  useEffect(() => {
    if (!user || !initialized) return;

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("customer_carts")
          .select("cart_items")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error loading cart:", error);
          return;
        }

        if (data?.cart_items) {
          const supabaseCart = data.cart_items as unknown as CartLine[];
          
          // Sync live prices from database
          const syncedSupabaseCart = await syncLivePrices(supabaseCart);
          
          // Merge local cart with Supabase cart (prefer local for conflicts)
          setLines((localLines) => {
            if (localLines.length === 0) return syncedSupabaseCart;
            if (syncedSupabaseCart.length === 0) return localLines;

            // Merge: local items take precedence, add any supabase-only items
            const localKeys = new Set(localLines.map((l) => getLineKey(l.id, l.variation)));
            const merged = [...localLines];
            
            syncedSupabaseCart.forEach((item) => {
              const key = getLineKey(item.id, item.variation);
              if (!localKeys.has(key)) {
                merged.push(item);
              }
            });

            // Persist merged cart
            persistCart(merged);
            return merged;
          });
        }
      } catch (err) {
        console.error("Failed to load cart from Supabase:", err);
      }
    };

    loadFromSupabase();
  }, [user, initialized, persistCart]);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((sum, l) => sum + l.qty, 0);
    const subtotal = lines.reduce((sum, l) => sum + l.qty * l.price, 0);

    const add: CartContextValue["add"] = (item, qty = 1) => {
      setLines((prev) => {
        const lineKey = getLineKey(item.id, item.variation);
        const existing = prev.find((l) => getLineKey(l.id, l.variation) === lineKey);
        
        let newLines: CartLine[];
        if (!existing) {
          newLines = [...prev, { ...item, qty }];
        } else {
          newLines = prev.map((l) => 
            getLineKey(l.id, l.variation) === lineKey 
              ? { ...l, qty: l.qty + qty } 
              : l
          );
        }
        
        // Persist immediately
        persistCart(newLines);
        return newLines;
      });
    };

    const setQty: CartContextValue["setQty"] = (id, qty, variation) => {
      setLines((prev) => {
        const lineKey = getLineKey(id, variation);
        let newLines: CartLine[];
        
        if (qty <= 0) {
          newLines = prev.filter((l) => getLineKey(l.id, l.variation) !== lineKey);
        } else {
          newLines = prev.map((l) => 
            getLineKey(l.id, l.variation) === lineKey 
              ? { ...l, qty } 
              : l
          );
        }
        
        // Persist immediately
        persistCart(newLines);
        return newLines;
      });
    };

    const remove: CartContextValue["remove"] = (id, variation) => {
      const lineKey = getLineKey(id, variation);
      setLines((prev) => {
        const newLines = prev.filter((l) => getLineKey(l.id, l.variation) !== lineKey);
        
        // Persist immediately to both localStorage and Supabase
        persistCart(newLines);
        
        return newLines;
      });
    };
    
    const clear: CartContextValue["clear"] = () => {
      const emptyCart: CartLine[] = [];
      setLines(emptyCart);
      persistCart(emptyCart);
    };

    return { lines, count, subtotal, add, setQty, remove, clear };
  }, [lines, persistCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
