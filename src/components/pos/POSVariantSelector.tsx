import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Product } from "@/hooks/useProducts";
import { useOutletVariantStock } from "@/hooks/useOutletInventory";
import { useProductVariants } from "@/hooks/useProductVariants";
import { cn } from "@/lib/utils";
import { AlertCircle, Package } from "lucide-react";

interface POSVariantSelectorProps {
  open: boolean;
  product: Product | null;
  outletId: string | null;
  onClose: () => void;
  onConfirm: (size?: string, color?: string, stock?: number, variantPrice?: number | null) => void;
}

export function POSVariantSelector({
  open,
  product,
  outletId,
  onClose,
  onConfirm,
}: POSVariantSelectorProps) {
  const [selectedSize, setSelectedSize] = useState<string | undefined>();
  const [selectedColor, setSelectedColor] = useState<string | undefined>();

  // Fetch product variants
  const { data: variants = [] } = useProductVariants(product?.id);

  // Find the variant_id for the selected combination
  const selectedVariant = variants.find(
    v =>
      (v.size || null) === (selectedSize || null) &&
      (v.color || null) === (selectedColor || null)
  );

  // Fetch outlet-specific stock for this variant
  const { data: outletStock = 0, isLoading: stockLoading } = useOutletVariantStock(
    outletId,
    product?.id,
    selectedVariant?.id || null
  );

  // Reset selection when product changes
  useEffect(() => {
    if (open) {
      setSelectedSize(undefined);
      setSelectedColor(undefined);
    }
  }, [open, product?.id]);

  if (!product) return null;

  const hasSizes = product.sizeOptions && product.sizeOptions.length > 0;
  const hasColors = product.colorOptions && product.colorOptions.length > 0;

  const handleConfirm = () => {
    // Pass the outlet stock AND variant-specific price (if any)
    const variantPrice = selectedVariant?.price_cents ?? null;
    onConfirm(selectedSize, selectedColor, outletStock, variantPrice);
    setSelectedSize(undefined);
    setSelectedColor(undefined);
    onClose();
  };

  const handleClose = () => {
    setSelectedSize(undefined);
    setSelectedColor(undefined);
    onClose();
  };

  // If no variants, just confirm immediately
  if (!hasSizes && !hasColors) {
    // This shouldn't open, but handle gracefully
    onConfirm();
    return null;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Helper to check stock for a specific variant at this outlet
  const getVariantOutletStock = (size?: string, color?: string): number => {
    const variant = variants.find(
      v =>
        (v.size || null) === (size || null) &&
        (v.color || null) === (color || null)
    );
    // We can't easily check each variant's outlet stock without multiple queries
    // For now, return -1 to indicate unknown (will be checked on selection)
    return variant ? -1 : 0;
  };

  // Check if selected combination has stock
  const hasStock = selectedVariant ? outletStock > 0 : false;
  const isVariantSelected = (hasSizes ? !!selectedSize : true) && (hasColors ? !!selectedColor : true);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Select Variant</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product Preview */}
          <div className="flex gap-3">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
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
              <p className="font-medium line-clamp-2">{product.title}</p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatPrice(selectedVariant?.price_cents ?? product.price)}
              </p>
              {selectedVariant?.price_cents && selectedVariant.price_cents !== product.price && (
                <p className="text-xs text-muted-foreground line-through">
                  Base: {formatPrice(product.price)}
                </p>
              )}
            </div>
          </div>

          {/* Size Options */}
          {hasSizes && (
            <div>
              <p className="mb-2 text-sm font-medium">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizeOptions.map((size) => (
                  <Button
                    key={size}
                    variant={selectedSize === size ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "min-w-[3rem]",
                      selectedSize === size && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Color Options */}
          {hasColors && (
            <div>
              <p className="mb-2 text-sm font-medium">Color</p>
              <div className="flex flex-wrap gap-2">
                {product.colorOptions.map((color) => (
                  <Button
                    key={color.name}
                    variant={selectedColor === color.name ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      selectedColor === color.name && "ring-2 ring-primary ring-offset-2"
                    )}
                    onClick={() => setSelectedColor(color.name)}
                  >
                    {color.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Outlet Stock Status */}
          {isVariantSelected && (
            <div className={cn(
              "flex items-center gap-2 p-3 rounded-lg text-sm",
              stockLoading ? "bg-muted" : hasStock ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              {stockLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Checking stock...</span>
                </>
              ) : hasStock ? (
                <>
                  <Package className="h-4 w-4" />
                  <span>{outletStock} in stock at this outlet</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>Not available at this outlet</span>
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              (hasSizes && !selectedSize) || 
              (hasColors && !selectedColor) ||
              stockLoading ||
              (isVariantSelected && !hasStock)
            }
          >
            {isVariantSelected && !hasStock ? "Out of Stock" : "Add to Cart"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
