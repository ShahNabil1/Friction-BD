import { useState, useEffect, useMemo } from "react";
import { Loader2, Package, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ProductVariant = {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  price_cents: number | null;
  compare_at_price_cents: number | null;
};

export type SelectedVariation = {
  variant_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  price_cents: number | null;
};

type ProductInfo = {
  id: string;
  title: string;
  price_cents: number;
  images: string[];
  stock: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductInfo | null;
  onConfirm: (product: ProductInfo, variation: SelectedVariation) => void;
};

export function VariantSelectorDialog({ open, onOpenChange, product, onConfirm }: Props) {
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);

  // Extract unique colors and sizes
  const colors = useMemo(() => {
    const uniqueColors = new Set<string>();
    variants.forEach((v) => {
      if (v.color) uniqueColors.add(v.color);
    });
    return Array.from(uniqueColors).sort();
  }, [variants]);

  const sizes = useMemo(() => {
    const uniqueSizes = new Set<string>();
    variants.forEach((v) => {
      if (v.size) uniqueSizes.add(v.size);
    });
    // Sort sizes intelligently (handle numeric and text sizes)
    return Array.from(uniqueSizes).sort((a, b) => {
      const numA = parseFloat(a);
      const numB = parseFloat(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [variants]);

  // Find the variant that matches the current selection
  const selectedVariant = useMemo(() => {
    if (!variants.length) return null;
    
    // If product has both colors and sizes, require both
    if (colors.length > 0 && sizes.length > 0) {
      return variants.find(
        (v) => v.color === selectedColor && v.size === selectedSize
      ) || null;
    }
    
    // If only colors
    if (colors.length > 0 && sizes.length === 0) {
      return variants.find((v) => v.color === selectedColor) || null;
    }
    
    // If only sizes
    if (sizes.length > 0 && colors.length === 0) {
      return variants.find((v) => v.size === selectedSize) || null;
    }
    
    return null;
  }, [variants, selectedColor, selectedSize, colors.length, sizes.length]);

  // Check if a specific variant combo is in stock
  const getVariantStock = (color: string | null, size: string | null): number => {
    const variant = variants.find(
      (v) => (v.color || null) === color && (v.size || null) === size
    );
    return variant?.stock_quantity ?? 0;
  };

  // Check if a color has any stock (for any size)
  const colorHasStock = (color: string): boolean => {
    return variants.some((v) => v.color === color && v.stock_quantity > 0);
  };

  // Check if a size has stock for the selected color
  const sizeHasStock = (size: string): boolean => {
    if (colors.length === 0) {
      return variants.some((v) => v.size === size && v.stock_quantity > 0);
    }
    return variants.some(
      (v) => v.size === size && v.color === selectedColor && v.stock_quantity > 0
    );
  };

  // Fetch variants when product changes
  useEffect(() => {
    if (!open || !product) {
      setVariants([]);
      setSelectedColor(null);
      setSelectedSize(null);
      return;
    }

    const fetchVariants = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id)
          .order("color", { ascending: true })
          .order("size", { ascending: true });

        if (error) throw error;
        setVariants((data as ProductVariant[]) || []);
      } catch (e) {
        console.error("Failed to fetch variants:", e);
        setVariants([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVariants();
  }, [open, product]);

  // Reset selection when colors/sizes change
  useEffect(() => {
    setSelectedColor(null);
    setSelectedSize(null);
  }, [product?.id]);

  const handleConfirm = () => {
    if (!product || !selectedVariant) return;

    const variation: SelectedVariation = {
      variant_id: selectedVariant.id,
      size: selectedVariant.size,
      color: selectedVariant.color,
      sku: selectedVariant.sku,
      stock_quantity: selectedVariant.stock_quantity,
      price_cents: selectedVariant.price_cents,
    };

    onConfirm(product, variation);
    onOpenChange(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const isValid = selectedVariant && selectedVariant.stock_quantity > 0;
  const requiresColor = colors.length > 0;
  const requiresSize = sizes.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Select Variation</DialogTitle>
          <DialogDescription>
            Choose the size and color for this product before adding to order.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Product Info */}
            {product && (
              <div className="flex items-center gap-3 rounded-md border p-3 bg-muted/30">
                {product.images?.[0] && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="h-14 w-14 rounded-md object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{product.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(product.price_cents)}
                  </p>
                </div>
              </div>
            )}

            {/* Color Selection */}
            {requiresColor && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Color <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const hasStock = colorHasStock(color);
                    const isSelected = selectedColor === color;
                    return (
                      <Button
                        key={color}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={!hasStock}
                        onClick={() => {
                          setSelectedColor(color);
                          // Reset size when color changes
                          setSelectedSize(null);
                        }}
                        className={cn(
                          "relative",
                          !hasStock && "opacity-50 line-through"
                        )}
                      >
                        {color}
                        {!hasStock && (
                          <span className="ml-1 text-xs">(Out)</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {requiresSize && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Size <span className="text-destructive">*</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => {
                    const hasStock = sizeHasStock(size);
                    const isSelected = selectedSize === size;
                    const stock = getVariantStock(selectedColor, size);
                    
                    return (
                      <Button
                        key={size}
                        type="button"
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        disabled={!hasStock}
                        onClick={() => setSelectedSize(size)}
                        className={cn(
                          "relative min-w-[60px]",
                          !hasStock && "opacity-50 line-through"
                        )}
                      >
                        <span>{size}</span>
                        {hasStock && requiresColor && selectedColor && (
                          <Badge
                            variant="secondary"
                            className="ml-1 text-[10px] px-1"
                          >
                            {stock}
                          </Badge>
                        )}
                        {!hasStock && (
                          <span className="ml-1 text-xs">(Out)</span>
                        )}
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Variant Info */}
            {selectedVariant && (
              <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Selected Variant</span>
                  <Badge
                    variant={selectedVariant.stock_quantity > 0 ? "default" : "destructive"}
                    className={cn(
                      selectedVariant.stock_quantity > 0 && "bg-green-600"
                    )}
                  >
                    {selectedVariant.stock_quantity > 0 ? (
                      <>
                        <Package className="mr-1 h-3 w-3" />
                        {selectedVariant.stock_quantity} in stock
                      </>
                    ) : (
                      <>
                        <AlertCircle className="mr-1 h-3 w-3" />
                        Out of Stock
                      </>
                    )}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {[selectedVariant.color, selectedVariant.size]
                    .filter(Boolean)
                    .join(" / ")}
                  {selectedVariant.sku && (
                    <span className="ml-2 font-mono text-xs">
                      SKU: {selectedVariant.sku}
                    </span>
                  )}
                </p>
                {selectedVariant.price_cents && (
                  <p className="text-sm font-medium text-primary">
                    Price: {formatCurrency(selectedVariant.price_cents)}
                  </p>
                )}
              </div>
            )}

            {/* Validation Message */}
            {!isValid && (requiresColor || requiresSize) && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {!selectedColor && requiresColor && "Select a color. "}
                {!selectedSize && requiresSize && "Select a size. "}
                {selectedVariant && selectedVariant.stock_quantity === 0 && "Selected variant is out of stock."}
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid}>
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
