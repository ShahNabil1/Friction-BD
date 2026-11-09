import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
function formatPrice(n: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export function CartDrawer({ trigger }: { trigger: ReactNode }) {
  const navigate = useNavigate();
  const { count, lines, subtotal, setQty, remove, clear } = useCart();

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>

      <SheetContent side="right" className="w-full sm:w-96 bg-background border-l border-border">
        <SheetHeader className="pb-4 border-b border-border">
          <SheetTitle className="font-serif text-xl flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Your Cart
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col h-[calc(100vh-10rem)]">
          {lines.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
              <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground font-medium">Your cart is empty</p>
              <p className="text-sm text-muted-foreground mt-1">Add some products to get started</p>
            </div>
          ) : (
            <>
              {/* Scrollable items area */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {lines.map((l) => {
                  // Build product path for navigation
                  const category = l.category?.toLowerCase().replace(/\s+/g, "-") || "products";
                  const subcategory = l.subcategory?.toLowerCase().replace(/\s+/g, "-") || "all";
                  const productPath = l.slug 
                    ? `/${category}/${subcategory}/${l.slug}` 
                    : null;
                  
                  return (
                    <div key={l.id} className="rounded-2xl border border-border bg-card p-4 transition-all hover:shadow-sm">
                      <div className="flex items-start gap-3">
                        {l.image && (
                          productPath ? (
                            <Link 
                              to={productPath} 
                              className="flex-shrink-0 cursor-pointer transition-opacity hover:opacity-80"
                            >
                              <img 
                                src={l.image} 
                                alt={l.title} 
                                className="h-16 w-16 rounded-xl object-cover border border-border"
                              />
                            </Link>
                          ) : (
                            <img 
                              src={l.image} 
                              alt={l.title} 
                              className="h-16 w-16 rounded-xl object-cover border border-border flex-shrink-0"
                            />
                          )
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            {productPath ? (
                              <Link 
                                to={productPath}
                                className="text-sm font-semibold leading-tight line-clamp-2 cursor-pointer hover:text-primary hover:underline transition-colors"
                              >
                                {l.title}
                              </Link>
                            ) : (
                              <p className="text-sm font-semibold leading-tight line-clamp-2">{l.title}</p>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 rounded-xl text-muted-foreground hover:text-bubu-red hover:bg-bubu-red/10 flex-shrink-0"
                              onClick={() => remove(l.id, l.variation)}
                              aria-label={`Remove ${l.title}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="mt-1 text-sm font-bold text-primary">{formatPrice(l.price)}</div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-1 py-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-xl"
                            onClick={() => setQty(l.id, l.qty - 1, l.variation)}
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <div className="min-w-8 text-center text-sm font-semibold">{l.qty}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className={cn(
                              "h-8 w-8 rounded-xl",
                              l.stock !== undefined && l.qty >= l.stock && "opacity-50 cursor-not-allowed"
                            )}
                            onClick={() => {
                              if (l.stock !== undefined && l.qty >= l.stock) {
                                toast.error("Stock limit reached", { 
                                  description: `Only ${l.stock} available in stock` 
                                });
                                return;
                              }
                              setQty(l.id, l.qty + 1, l.variation);
                            }}
                            disabled={l.stock !== undefined && l.qty >= l.stock}
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <div className="text-sm font-bold">{formatPrice(l.qty * l.price)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Fixed bottom section */}
              <div className="mt-4 pt-4 border-t border-border space-y-4">
                <div className="rounded-2xl border border-border bg-muted/30 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="text-lg font-bold text-primary">{formatPrice(subtotal)}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Shipping & taxes calculated at checkout</p>
                </div>

                <div className="grid gap-2">
                  <Button
                    variant="brand"
                    className="w-full h-12 rounded-xl bg-bubu-red text-bubu-red-foreground hover:bg-bubu-red/90"
                    disabled={lines.length === 0}
                    onClick={() => {
                      if (lines.length === 0) return;
                      navigate("/checkout");
                    }}
                  >
                    Checkout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full rounded-xl" 
                    onClick={clear} 
                    disabled={lines.length === 0}
                  >
                    Clear cart
                  </Button>
                </div>
              </div>
            </>
          )}

          <div
            className={cn(
              "sr-only",
              // ensures screen readers announce count changes while drawer is open
            )}
            aria-live="polite"
          >
            {count} items in cart
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}