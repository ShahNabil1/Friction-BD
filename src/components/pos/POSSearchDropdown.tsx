import { useRef, useEffect, useState, useCallback, useMemo, forwardRef, useImperativeHandle } from "react";
import { Search, ScanBarcode, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminProducts, Product, dbToProduct } from "@/hooks/useProducts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface POSSearchDropdownProps {
  onSelectProduct: (product: Product, size?: string, color?: string, maxStock?: number, variantPrice?: number | null) => void;
  outletId?: string;
}

export interface POSSearchDropdownRef {
  focus: () => void;
}

// Extended product type to handle variant info
interface SearchableItem extends Product {
  isVariant?: boolean;
  variantId?: string;
  variantSize?: string;
  variantColor?: string;
  variantBarcode?: string;
  variantPrice?: number | null;
}

export const POSSearchDropdown = forwardRef<POSSearchDropdownRef, POSSearchDropdownProps>(
  function POSSearchDropdown({ onSelectProduct, outletId }, ref) {
  const queryClient = useQueryClient();
  const { data: dbProducts, isLoading } = useAdminProducts();
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const lastAutoAddedSku = useRef<string | null>(null);
  const isProcessingScan = useRef<boolean>(false);
  const lastScanProcessedAt = useRef<number>(0);
  
  // Store variants for barcode lookup
  const [variantMap, setVariantMap] = useState<Map<string, { 
    productId: string; 
    variantId: string; 
    size: string | null; 
    color: string | null; 
    barcode: string | null;
    sku: string | null;
    price_cents: number | null;
  }>>(new Map());

  // Expose focus method to parent via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      searchInputRef.current?.focus();
    },
  }));

  // Fetch variants for barcode lookup
  useEffect(() => {
    const fetchVariants = async () => {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, product_id, size, color, barcode, sku, price_cents");
      
      if (!error && data) {
        const map = new Map<string, any>();
        data.forEach(v => {
          // Index by barcode
          if (v.barcode?.trim()) {
            map.set(v.barcode.trim().toUpperCase(), {
              productId: v.product_id,
              variantId: v.id,
              size: v.size,
              color: v.color,
              barcode: v.barcode,
              sku: v.sku,
              price_cents: v.price_cents,
            });
          }
          // Also index by SKU
          if (v.sku?.trim()) {
            map.set(v.sku.trim().toUpperCase(), {
              productId: v.product_id,
              variantId: v.id,
              size: v.size,
              color: v.color,
              barcode: v.barcode,
              sku: v.sku,
              price_cents: v.price_cents,
            });
          }
        });
        setVariantMap(map);
      }
    };
    fetchVariants();
  }, []);

  // Real-time subscription for stock updates
  useEffect(() => {
    const channel = supabase
      .channel("pos-search-stock-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outlet_inventory" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => {
          // Refresh variant map when variants change
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Convert DB products to frontend Product type
  const products = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.filter((p) => p.status === "active").map(dbToProduct);
  }, [dbProducts]);

  // Filter products based on search (now includes barcode)
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        (p as any).barcode?.toLowerCase().includes(query)
    ).slice(0, 10); // Limit to 10 results
  }, [products, searchQuery]);

  // Reset highlighted index when search query or results change
  useEffect(() => {
    setHighlightedIndex(filteredProducts.length > 0 ? 0 : -1);
  }, [searchQuery, filteredProducts.length]);

  // Auto-scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && itemRefs.current[highlightedIndex]) {
      itemRefs.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex]);

  // Auto-focus search input
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setSearchQuery("");
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Check for exact SKU or barcode match - now checks variants first!
  const checkExactSkuMatch = useCallback(
    (query: string): { product: Product; size?: string; color?: string; variantPrice?: number | null } | null => {
      if (!query.trim() || !products.length) return null;
      const normalizedQuery = query.trim().toUpperCase();
      
      // STEP 1: Check variant barcode/sku map first
      const variantMatch = variantMap.get(normalizedQuery);
      if (variantMatch) {
        const parentProduct = products.find(p => p.id === variantMatch.productId);
        if (parentProduct) {
          return {
            product: parentProduct,
            size: variantMatch.size || undefined,
            color: variantMatch.color || undefined,
            variantPrice: variantMatch.price_cents,
          };
        }
      }
      
      // STEP 2: Check product barcode/sku
      const productMatch = products.find(
        (p) =>
          p.id.toUpperCase() === normalizedQuery ||
          (p as any).barcode?.toUpperCase() === normalizedQuery ||
          (p as any).sku?.toUpperCase() === normalizedQuery
      );
      
      if (productMatch) {
        return { product: productMatch };
      }
      
      return null;
    },
    [products, variantMap]
  );

  // Handle search input change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setIsOpen(value.trim().length > 0);

      // Check for exact SKU or barcode match (barcode scan)
      if (value.trim()) {
        const normalizedValue = value.trim().toUpperCase();
        const now = Date.now();

        // Prevent duplicate scans (some scanners emit the full value twice and/or add an Enter)
        if (isProcessingScan.current) return;
        if (
          lastAutoAddedSku.current === normalizedValue &&
          now - lastScanProcessedAt.current < 1200
        ) {
          return;
        }

        const match = checkExactSkuMatch(value);
        if (match) {
          // Set guards immediately BEFORE processing
          isProcessingScan.current = true;
          lastAutoAddedSku.current = normalizedValue;
          lastScanProcessedAt.current = now;

          // Build display name for toast
          const variantLabel = [match.color, match.size].filter(Boolean).join("/");
          const displayName = variantLabel
            ? `${match.product.title} (${variantLabel})`
            : match.product.title;

          // Add item
          onSelectProduct(
            match.product,
            match.size,
            match.color,
            undefined,
            match.variantPrice
          );
          toast.success(`Added: ${displayName}`);

          // Clear immediately so the scanner's trailing Enter doesn't add again
          setSearchQuery("");
          setIsOpen(false);
          setHighlightedIndex(-1);
          queueMicrotask(() => searchInputRef.current?.focus());

          // Release processing lock shortly after
          setTimeout(() => {
            isProcessingScan.current = false;
          }, 250);

          // Keep last value around briefly to ignore rapid duplicates
          setTimeout(() => {
            lastAutoAddedSku.current = null;
          }, 1200);
        }
      }
    },
    [checkExactSkuMatch, onSelectProduct]
  );

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!isOpen && searchQuery.trim()) {
          setIsOpen(true);
        }
        setHighlightedIndex((prev) => {
          const maxIndex = filteredProducts.length - 1;
          return prev < maxIndex ? prev + 1 : 0; // Loop to top
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) => {
          const maxIndex = filteredProducts.length - 1;
          return prev > 0 ? prev - 1 : maxIndex; // Loop to bottom
        });
      } else if (e.key === "Enter" && searchQuery.trim()) {
        e.preventDefault();

        // If we just processed a scanner match, ignore the scanner's trailing Enter
        const normalizedValue = searchQuery.trim().toUpperCase();
        const now = Date.now();
        if (
          lastAutoAddedSku.current === normalizedValue &&
          now - lastScanProcessedAt.current < 1200
        ) {
          return;
        }

        // If an item is highlighted, select it
        if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
          handleSelectProduct(filteredProducts[highlightedIndex]);
          return;
        }
        
        // Otherwise check for exact SKU/barcode match
        const match = checkExactSkuMatch(searchQuery);
        if (match) {
          const variantLabel = [match.color, match.size].filter(Boolean).join("/");
          const displayName = variantLabel 
            ? `${match.product.title} (${variantLabel})` 
            : match.product.title;
          
          onSelectProduct(match.product, match.size, match.color, undefined, match.variantPrice);
          toast.success(`Added: ${displayName}`);
          setSearchQuery("");
          setIsOpen(false);
          setHighlightedIndex(-1);
          searchInputRef.current?.focus();
        } else if (filteredProducts.length === 1) {
          // Auto-select if only one result
          handleSelectProduct(filteredProducts[0]);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setSearchQuery("");
        setIsOpen(false);
        setHighlightedIndex(-1);
        searchInputRef.current?.blur();
      }
    },
    [searchQuery, isOpen, highlightedIndex, checkExactSkuMatch, onSelectProduct, filteredProducts]
  );

  // Handle product selection from dropdown
  const handleSelectProduct = useCallback((product: Product) => {
    onSelectProduct(product);
    toast.success(`Added: ${product.title}`);
    setSearchQuery("");
    setIsOpen(false);
    setHighlightedIndex(-1);
    searchInputRef.current?.focus();
  }, [onSelectProduct]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Search Input */}
      <div className="relative">
        <ScanBarcode className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
        <Input
          ref={searchInputRef}
          placeholder="Scan barcode or search products... (F2)"
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => searchQuery.trim() && setIsOpen(true)}
          className="h-14 pl-12 pr-4 text-lg bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
          autoFocus
        />
      </div>

      {/* Dropdown Results */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-border bg-card shadow-xl">
          <ScrollArea className="max-h-80">
            {isLoading ? (
              <div className="flex items-center justify-center p-6 text-muted-foreground">
                <Search className="mr-2 h-4 w-4 animate-pulse" />
                Loading products...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-6 text-muted-foreground">
                <Package className="h-8 w-8 mb-2 opacity-50" />
                <p className="font-medium">No products found</p>
                <p className="text-sm text-muted-foreground">Try a different search term</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredProducts.map((product, index) => (
                  <button
                    key={product.id}
                    ref={(el) => (itemRefs.current[index] = el)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md p-3 text-left transition-colors",
                      "hover:bg-muted focus:bg-muted focus:outline-none",
                      highlightedIndex === index && "bg-primary/10 ring-1 ring-primary/20"
                    )}
                    onClick={() => handleSelectProduct(product)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    {/* Product Image */}
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                      {product.images?.[0] ? (
                        <img
                          src={product.images[0]}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">{product.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-sm text-muted-foreground">
                          {product.brand}
                        </span>
                        {product.stock !== undefined && (
                          <Badge
                            variant={product.stock > 5 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {product.stock} in stock
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right">
                      <p className="font-bold text-primary">
                        {formatPrice(product.price)}
                      </p>
                      {product.compareAtPrice && product.compareAtPrice > product.price && (
                        <p className="text-xs text-muted-foreground line-through">
                          {formatPrice(product.compareAtPrice)}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
});
