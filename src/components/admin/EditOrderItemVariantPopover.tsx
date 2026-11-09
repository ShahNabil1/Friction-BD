import { useState, useEffect } from "react";
import { Loader2, Pencil, Check, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface Variant {
  id: string;
  size: string | null;
  color: string | null;
  stock_quantity: number;
  sku: string | null;
}

interface OrderItem {
  id: string;
  product_id?: string | null;
  product_name: string;
  selected_variation?: { color?: string; size?: string } | null;
}

interface EditOrderItemVariantPopoverProps {
  orderItem: OrderItem;
  orderStatus: string;
  disabled?: boolean;
  onVariantChanged: () => void;
}

export function EditOrderItemVariantPopover({
  orderItem,
  orderStatus,
  disabled = false,
  onVariantChanged,
}: EditOrderItemVariantPopoverProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [oldVariantId, setOldVariantId] = useState<string | null>(null);

  // Check if order status allows editing
  const canEdit = !["shipped", "delivered", "cancelled", "returned"].includes(orderStatus);

  // Fetch variants when popover opens
  useEffect(() => {
    if (open && orderItem.product_id) {
      fetchVariants();
    }
  }, [open, orderItem.product_id]);

  const fetchVariants = async () => {
    if (!orderItem.product_id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_variants")
        .select("id, size, color, stock_quantity, sku")
        .eq("product_id", orderItem.product_id)
        .order("size")
        .order("color");

      if (error) throw error;
      setVariants(data || []);

      // Find current variant ID based on selected_variation
      if (orderItem.selected_variation && data) {
        const currentSize = orderItem.selected_variation.size || "";
        const currentColor = orderItem.selected_variation.color || "";
        const current = data.find(
          (v) =>
            (v.size || "") === currentSize &&
            (v.color || "") === currentColor
        );
        if (current) {
          setOldVariantId(current.id);
        }
      }
    } catch (error) {
      console.error("Error fetching variants:", error);
      toast({
        title: "Error",
        description: "Failed to load variants",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSwapVariant = async () => {
    if (!selectedVariantId) return;

    const newVariant = variants.find((v) => v.id === selectedVariantId);
    if (!newVariant) return;

    setIsSwapping(true);
    try {
      const { data, error } = await supabase.rpc("swap_order_item_variant", {
        p_order_item_id: orderItem.id,
        p_old_variant_id: oldVariantId,
        p_new_variant_id: selectedVariantId,
        p_new_size: newVariant.size || null,
        p_new_color: newVariant.color || null,
      });

      if (error) throw error;

      toast({
        title: "Variant Updated",
        description: `Changed to ${[newVariant.size, newVariant.color].filter(Boolean).join(" / ") || "Default"}`,
      });

      setOpen(false);
      onVariantChanged();
    } catch (error) {
      console.error("Error swapping variant:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update variant",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  // Don't show edit button if product has no product_id (legacy item) or order can't be edited
  if (!orderItem.product_id || !canEdit) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          disabled={disabled}
          title="Change variant"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="font-medium text-sm">Change Variant</h4>
            <p className="text-xs text-muted-foreground">
              Select a new size/color for this item
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : variants.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">
                No variants found for this product
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-2 max-h-60 overflow-y-auto pr-1">
                {variants.map((variant) => {
                  const isCurrentVariant = variant.id === oldVariantId;
                  const isOutOfStock = variant.stock_quantity < 1 && !isCurrentVariant;
                  const isSelected = variant.id === selectedVariantId;
                  const variantLabel = [variant.size, variant.color].filter(Boolean).join(" / ") || "Default";

                  return (
                    <button
                      key={variant.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariantId(variant.id)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-lg border text-left transition-colors",
                        isSelected && "border-primary bg-primary/5",
                        isCurrentVariant && !isSelected && "border-muted bg-muted/30",
                        isOutOfStock && "opacity-50 cursor-not-allowed",
                        !isSelected && !isCurrentVariant && !isOutOfStock && "hover:border-primary/50 hover:bg-muted/20"
                      )}
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-sm">{variantLabel}</span>
                        {variant.sku && (
                          <span className="text-xs text-muted-foreground font-mono">
                            SKU: {variant.sku}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentVariant && (
                          <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30">
                            Current
                          </Badge>
                        )}
                        {isOutOfStock ? (
                          <Badge variant="outline" className="text-xs bg-red-500/10 text-red-600 border-red-500/30">
                            Out of Stock
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            {variant.stock_quantity} left
                          </Badge>
                        )}
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                  disabled={isSwapping}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSwapVariant}
                  disabled={!selectedVariantId || selectedVariantId === oldVariantId || isSwapping}
                >
                  {isSwapping ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Apply Change"
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
