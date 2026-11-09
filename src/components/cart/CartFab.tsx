import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart";
import { ShoppingBag } from "lucide-react";
import { CartDrawer } from "@/components/cart/CartDrawer";

export function CartFab() {
  const { count } = useCart();

  return (
    <CartDrawer
      trigger={
        <button
          type="button"
          className={cn(
            "fixed bottom-6 right-6 z-[70]",
            "hidden md:grid h-14 w-14 place-items-center rounded-full",
            "bg-background shadow-lg",
            "border border-input",
          )}
          aria-label="Open cart"
        >
          <span className="relative">
            <ShoppingBag className="h-6 w-6 text-maroon" />
            <span
              className={cn(
                "absolute -right-2 -top-2 grid h-5 min-w-5 place-items-center rounded-full px-1",
                "bg-destructive text-destructive-foreground text-[11px] font-extrabold",
              )}
              aria-label={`${count} items in cart`}
            >
              {count}
            </span>
          </span>
        </button>
      }
    />
  );
}
