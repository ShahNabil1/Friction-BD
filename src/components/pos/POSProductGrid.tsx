import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { Search, ScanBarcode, Grid3X3, List } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAdminProducts, Product, dbToProduct } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface POSProductGridProps {
  onSelectProduct: (product: Product, size?: string, color?: string) => void;
}

export function POSProductGrid({ onSelectProduct }: POSProductGridProps) {
  const queryClient = useQueryClient();
  const { data: dbProducts, isLoading } = useAdminProducts();
  const { categories } = useCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const lastAutoAddedSku = useRef<string | null>(null);

  // Convert DB products to frontend Product type
  const products = useMemo(() => {
    if (!dbProducts) return [];
    return dbProducts.filter(p => p.status === "active").map(dbToProduct);
  }, [dbProducts]);

  // Realtime subscription for stock updates - invalidate products query when inventory changes
  useEffect(() => {
    const channel = supabase
      .channel("pos-products-stock-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "product_variants" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "outlet_inventory" },
        () => {
          // outlet_inventory changes trigger stock sync via DB trigger
          queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Check for exact SKU match and auto-add
  const checkExactSkuMatch = useCallback((query: string) => {
    if (!query.trim() || !products.length) return null;
    
    const normalizedQuery = query.trim().toUpperCase();
    const exactMatch = products.find(
      p => p.id.toUpperCase() === normalizedQuery || 
           (p.id && p.id.toUpperCase() === normalizedQuery)
    );
    
    return exactMatch;
  }, [products]);

  // Handle search input change with auto-add logic
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    
    // Check for exact SKU match (barcode scan simulation)
    if (value.trim()) {
      const exactMatch = checkExactSkuMatch(value);
      if (exactMatch && lastAutoAddedSku.current !== value.trim().toUpperCase()) {
        // Prevent duplicate auto-adds
        lastAutoAddedSku.current = value.trim().toUpperCase();
        
        // Auto-add to cart
        onSelectProduct(exactMatch);
        toast.success(`Added: ${exactMatch.title}`);
        
        // Clear search after short delay
        setTimeout(() => {
          setSearchQuery("");
          searchInputRef.current?.focus();
          lastAutoAddedSku.current = null;
        }, 100);
      }
    }
  }, [checkExactSkuMatch, onSelectProduct]);

  // Handle Enter key for search
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      const exactMatch = checkExactSkuMatch(searchQuery);
      if (exactMatch) {
        onSelectProduct(exactMatch);
        toast.success(`Added: ${exactMatch.title}`);
        setSearchQuery("");
        searchInputRef.current?.focus();
      }
    }
  }, [searchQuery, checkExactSkuMatch, onSelectProduct]);

  // Filter products - only when search query exists
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    
    let result = products;

    // Category filter
    if (selectedCategory) {
      result = result.filter(
        (p) =>
          p.category.toLowerCase() === selectedCategory.toLowerCase() ||
          p.subcategory?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Search filter (by name, SKU, brand, or ID)
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(
      (p) =>
        p.title.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query)
    );

    return result;
  }, [products, selectedCategory, searchQuery]);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get unique parent categories
  const parentCategories = useMemo(() => {
    return categories?.filter((c) => !c.parent_id) || [];
  }, [categories]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="flex h-full flex-col">
      {/* Search & Filters */}
      <div className="border-b bg-background p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              placeholder="Scan barcode or search by name, SKU..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
              autoFocus
            />
          </div>
          <div className="flex rounded-lg border">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-r-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="rounded-l-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Category Pills - only show when searching */}
        {isSearching && (
          <ScrollArea className="mt-3 w-full whitespace-nowrap">
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                className="shrink-0 rounded-full"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {parentCategories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.slug ? "default" : "outline"}
                  size="sm"
                  className="shrink-0 rounded-full"
                  onClick={() => setSelectedCategory(cat.slug)}
                >
                  {cat.name}
                </Button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Product Grid or Placeholder */}
      <ScrollArea className="flex-1">
        {!isSearching ? (
          /* Placeholder State - Scan First */
          <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8 text-center">
            <div className="rounded-full bg-muted p-6 mb-6">
              <ScanBarcode className="h-16 w-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Ready to Scan
            </h3>
            <p className="text-muted-foreground max-w-sm">
              Search by product name or scan a barcode to add items to the cart
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
              <kbd className="rounded bg-muted px-2 py-1 font-mono text-xs">
                Enter
              </kbd>
              <span>to quick-add exact matches</span>
            </div>
          </div>
        ) : isLoading ? (
          <div className={cn(
            "grid gap-3 p-4",
            viewMode === "grid" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-1"
          )}>
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground p-4">
            <Search className="h-10 w-10 mb-3 opacity-50" />
            <p className="font-medium">No products found</p>
            <p className="text-sm">Try a different search term or scan another barcode</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3 p-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-0.5"
                onClick={() => onSelectProduct(product)}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      No image
                    </div>
                  )}
                  {product.stock !== undefined && product.stock <= 5 && (
                    <Badge
                      variant="destructive"
                      className="absolute right-2 top-2 text-xs"
                    >
                      {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="line-clamp-2 text-sm font-medium">{product.title}</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-lg font-bold text-primary">
                      {formatPrice(product.price)}
                    </span>
                    {product.compareAtPrice && product.compareAtPrice > product.price && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(product.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2 p-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => onSelectProduct(product)}
              >
                <CardContent className="flex items-center gap-4 p-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{product.title}</p>
                    <p className="text-sm text-muted-foreground">{product.brand}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary">{formatPrice(product.price)}</p>
                    {product.stock !== undefined && (
                      <p className="text-xs text-muted-foreground">
                        Stock: {product.stock}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
