import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { cn } from "@/lib/utils";
import { useProducts, formatPrice, productPath, type Product } from "@/hooks/useProducts";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, ShoppingCart } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export function DealsAndProducts({
  selectedBrand,
  onClearBrand,
}: {
  selectedBrand: string | null;
  onClearBrand: () => void;
}) {
  const { add } = useCart();
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();

  const handleOrderNow = (p: Product) => {
    // Check if product has variants
    const hasVariants = (p.sizeOptions && p.sizeOptions.length > 0) || 
                        (p.colorOptions && p.colorOptions.length > 0);
    
    if (hasVariants) {
      // Redirect to product page for variant selection
      toast.info("Please select size/color options", {
        description: "This product has variants. Please choose your preferred options.",
      });
      navigate(productPath(p));
    } else {
      // Simple product - add to cart and checkout
      add({ 
        id: p.id, 
        title: p.title, 
        price: p.price, 
        image: p.images[0],
        slug: p.slug,
        category: p.category,
        subcategory: p.subcategory,
      }, 1);
      navigate("/checkout");
    }
  };

  const handleQuickBuy = (e: React.MouseEvent, p: Product) => {
    e.preventDefault();
    e.stopPropagation();
    
    const hasVariants = (p.sizeOptions && p.sizeOptions.length > 0) || 
                        (p.colorOptions && p.colorOptions.length > 0);
    
    if (hasVariants) {
      navigate(productPath(p));
    } else {
      add({ 
        id: p.id, 
        title: p.title, 
        price: p.price, 
        image: p.images[0],
        slug: p.slug,
        category: p.category,
        subcategory: p.subcategory,
      }, 1);
      toast.success("Added to cart!");
    }
  };

  // Calculate discount percentage
  const getDiscountPercent = (price: number, compareAt: number | null) => {
    if (!compareAt || compareAt <= price) return null;
    return Math.round(((compareAt - price) / compareAt) * 100);
  };

  // Filter products based on brand only
  const filteredProducts = selectedBrand
    ? products.filter((p) => p.brand === selectedBrand)
    : products;

  if (isLoading) {
    return (
      <section id="deals" className="bg-muted/30 py-10 md:py-16">
        <div className="container">
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section id="deals" className="bg-muted/30 py-10 md:py-16">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="font-serif text-2xl md:text-3xl font-bold text-primary tracking-tight">
              BRAND NEW COLLECTION
            </h2>
            <p className="text-muted-foreground mt-2">ORDER NOW!</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <p className="text-muted-foreground">No products available yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="deals" className="py-14 md:py-20 bg-background">
      <div className="container">
        {/* Section Header */}
        <div className="text-center mb-10 md:mb-14">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-bubu-red mb-3">New Arrivals</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Brand New Collection
          </h2>
          <div className="mx-auto mt-4 h-0.5 w-12 bg-bubu-red rounded-full" />
          
          {selectedBrand && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm shadow-sm">
              <span className="text-muted-foreground">Filtered:</span>
              <span className="font-semibold text-foreground">{selectedBrand}</span>
              <button
                type="button"
                className="ml-1 rounded-full px-2 py-0.5 text-bubu-red hover:bg-bubu-red/10 font-medium transition-colors"
                onClick={onClearBrand}
                aria-label="Clear brand filter"
              >
                ✕ Clear
              </button>
            </div>
          )}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:gap-6 lg:grid-cols-4">
          {filteredProducts.map((p) => {
            const discountPercent = getDiscountPercent(p.price, p.compareAtPrice);
            const isOutOfStock = (p.stock ?? 0) <= 0;
            
            return (
              <article
                key={p.id}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/60",
                  "transition-all duration-400 ease-out",
                  "hover:shadow-elegant hover:-translate-y-1.5",
                )}
              >
                {/* Image Container */}
                <div className="relative aspect-[4/5] overflow-hidden bg-muted/30">
                  <Link
                    to={productPath(p)}
                    className="block h-full w-full"
                  >
                    <img
                      src={p.images[0] || "/placeholder.svg"}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-108"
                      loading="lazy"
                    />
                  </Link>

                  {/* Badges */}
                  <div className="absolute left-2 top-2 z-10 flex flex-col gap-1">
                    {discountPercent && (
                      <Badge className="bg-bubu-red text-white font-bold px-2 py-0.5 text-[10px] rounded-lg shadow-md">
                        -{discountPercent}%
                      </Badge>
                    )}
                    {p.badge && !discountPercent && (
                      <Badge className="bg-primary text-primary-foreground font-bold px-2 py-0.5 text-[10px] rounded-lg shadow-md">
                        {p.badge}
                      </Badge>
                    )}
                  </div>

                  {!isOutOfStock && (p.stock ?? 0) <= 5 && (
                    <div className="absolute right-2 top-2 z-10">
                      <Badge className="bg-bubu-amber text-bubu-amber-foreground font-semibold px-2 py-0.5 text-[10px] rounded-lg animate-pulse">
                        Only {p.stock} left
                      </Badge>
                    </div>
                  )}

                  {/* Quick Buy Overlay */}
                  <div className="absolute inset-x-0 bottom-0 translate-y-full transition-all duration-300 group-hover:translate-y-0">
                    <Button
                      onClick={(e) => handleQuickBuy(e, p)}
                      disabled={isOutOfStock}
                      className="w-full rounded-none h-10 bg-primary/95 text-primary-foreground font-semibold text-sm hover:bg-primary backdrop-blur-sm"
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Quick Buy
                    </Button>
                  </div>
                </div>

                {/* Product Info */}
                <div className="flex flex-col flex-1 p-3 md:p-4 gap-2">
                  <Link
                    to={productPath(p)}
                    className="block font-semibold leading-snug text-sm md:text-[0.9rem] line-clamp-2 text-foreground hover:text-primary transition-colors"
                  >
                    {p.title}
                  </Link>

                  <StarRating
                    rating={p.rating || 0}
                    reviewCount={p.reviewCount || 0}
                    size="sm"
                  />

                  <div className="flex items-baseline gap-2 flex-wrap mt-auto">
                    <span className="text-base md:text-lg font-bold text-primary">
                      {formatPrice(p.price)}
                    </span>
                    {p.compareAtPrice && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatPrice(p.compareAtPrice)}
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={() => handleOrderNow(p)}
                    disabled={isOutOfStock}
                    size="sm"
                    className={cn(
                      "w-full h-9 rounded-xl text-xs md:text-sm font-semibold mt-1 transition-all duration-300",
                      isOutOfStock
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : "bg-bubu-red text-white hover:bg-bubu-red/90 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                    )}
                  >
                    {isOutOfStock ? "Out of Stock" : "ORDER NOW"}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>

        {/* View All */}
        <div className="mt-12 text-center">
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-primary text-primary font-semibold text-sm hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:-translate-y-0.5 shadow-soft hover:shadow-elegant"
          >
            View All Products
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
