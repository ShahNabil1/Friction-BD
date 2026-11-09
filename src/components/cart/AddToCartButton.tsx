import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { cn } from "@/lib/utils";
import { ShoppingCart, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface AddToCartButtonProps {
  productId: string;
  productTitle: string;
  productPrice: number;
  productImage?: string;
  productSlug?: string;
  productCategory?: string;
  productSubcategory?: string;
  variant?: "default" | "outline" | "icon";
  className?: string;
  onSuccess?: () => void;
  stock?: number;
}

export function AddToCartButton({
  productId,
  productTitle,
  productPrice,
  productImage,
  productSlug,
  productCategory,
  productSubcategory,
  variant = "outline",
  className,
  onSuccess,
  stock,
}: AddToCartButtonProps) {
  const { add, lines } = useCart();
  const [state, setState] = useState<"idle" | "adding" | "added">("idle");

  // Check if out of stock
  const isOutOfStock = stock !== undefined && stock <= 0;

  // Get current quantity in cart for this product
  const currentCartQty = lines.filter(l => l.id === productId).reduce((sum, l) => sum + l.qty, 0);
  
  // Check if adding more would exceed stock
  const wouldExceedStock = stock !== undefined && currentCartQty >= stock;

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (state !== "idle") return;
      
      // Prevent adding if out of stock
      if (isOutOfStock) {
        toast.error("Out of Stock", { description: "This product is currently unavailable" });
        return;
      }
      
      // Prevent overselling
      if (wouldExceedStock) {
        toast.error("Stock limit reached", { description: `Only ${stock} available in stock` });
        return;
      }

      setState("adding");

      // Simulate a brief delay for visual feedback
      setTimeout(() => {
        add({ 
          id: productId, 
          title: productTitle, 
          price: productPrice, 
          image: productImage,
          slug: productSlug,
          category: productCategory,
          subcategory: productSubcategory,
          stock: stock,
        }, 1);

        setState("added");

        // Trigger cart shake animation
        const cartIcon = document.getElementById("cart-icon-header");
        if (cartIcon) {
          cartIcon.classList.add("animate-cart-shake");
          setTimeout(() => {
            cartIcon.classList.remove("animate-cart-shake");
          }, 500);
        }

        // Show rich toast
        toast.custom(
          (t) => (
            <div className="flex items-center gap-3 rounded-xl border-l-4 border-l-bubu-green bg-background p-4 shadow-lg">
              {productImage && (
                <img
                  src={productImage}
                  alt={productTitle}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{productTitle}</p>
                <p className="text-xs text-muted-foreground">Successfully added to bag</p>
              </div>
              <Check className="h-5 w-5 text-bubu-green flex-shrink-0" />
            </div>
          ),
          {
            duration: 3000,
            position: "top-right",
          }
        );

        onSuccess?.();

        // Reset after animation
        setTimeout(() => {
          setState("idle");
        }, 2000);
      }, 300);
    },
    [add, productId, productTitle, productPrice, productImage, productSlug, productCategory, productSubcategory, state, onSuccess, isOutOfStock, wouldExceedStock, stock]
  );

  // Disabled state for out of stock
  const isDisabled = state === "adding" || isOutOfStock;

  if (variant === "icon") {
    return (
      <Button
        type="button"
        variant={isOutOfStock ? "secondary" : "brand"}
        size="icon"
        className={cn(
          "h-10 w-10 rounded-xl shadow-md transition-all duration-300",
          state === "added" && "bg-bubu-green hover:bg-bubu-green",
          isOutOfStock && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        disabled={isDisabled}
        aria-label={isOutOfStock ? "Out of stock" : `Add ${productTitle} to cart`}
      >
        {state === "adding" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : state === "added" ? (
          <Check className="h-4 w-4" />
        ) : isOutOfStock ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <ShoppingCart className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={isOutOfStock ? "secondary" : variant}
      className={cn(
        "w-full transition-all duration-300 rounded-xl",
        "px-2 py-1.5 text-[11px] gap-1 md:px-4 md:py-2 md:text-sm md:gap-2",
        !isOutOfStock && variant === "outline" && "border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        state === "added" && "bg-bubu-green border-bubu-green text-bubu-green-foreground hover:bg-bubu-green",
        isOutOfStock && "opacity-60 cursor-not-allowed bg-muted text-muted-foreground border-muted",
        className
      )}
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={isOutOfStock ? "Out of stock" : `Add ${productTitle} to cart`}
    >
      {isOutOfStock ? (
        <>
          <AlertCircle className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Out of Stock</span>
        </>
      ) : state === "adding" ? (
        <>
          <Loader2 className="h-3 w-3 md:h-3.5 md:w-3.5 animate-spin flex-shrink-0" />
          <span className="whitespace-nowrap">Adding...</span>
        </>
      ) : state === "added" ? (
        <>
          <Check className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Added ✔</span>
        </>
      ) : (
        <>
          <ShoppingCart className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
          <span className="whitespace-nowrap">Add to Cart</span>
        </>
      )}
    </Button>
  );
}