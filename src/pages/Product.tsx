import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";
import { useCart, type SelectedVariation } from "@/context/cart";
import { RelatedProducts } from "@/components/products/RelatedProducts";
import { CustomerReviews } from "@/components/products/CustomerReviews";
import { useReviewStats } from "@/hooks/useProductReviews";
import { useProductBySlug, formatPrice, productPath, getVariantPrice } from "@/hooks/useProducts";
import { useProductVariants } from "@/hooks/useProductVariants";
import { useGlobalProductStock } from "@/hooks/useOutletInventory";
import { Minus, Plus, Star, Loader2, ShoppingCart, Ban } from "lucide-react";
import { PremiumBenefits } from "@/components/products/PremiumBenefits";
import { SizeChartDialog } from "@/components/products/SizeChartDialog";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { trackAddToCart, trackViewContent } from "@/services/Analytics";

// WhatsApp SVG Icon
const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setOgMeta(property: string, content: string) {
  let el = document.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

function setJsonLd(id: string, data: object) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement("script");
    el.id = id;
    el.setAttribute("type", "application/ld+json");
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const total = 5;
  return (
    <div className="inline-flex items-center gap-1" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: total }).map((_, i) => {
        const filled = i < full || (i === full && half);
        return <Star key={i} className={cn("h-4 w-4", filled ? "text-gold" : "text-muted-foreground/40")} fill={filled ? "currentColor" : "none"} />;
      })}
    </div>
  );
}

function Swatch({ tone }: { tone: "gold" | "silver" | "black" }) {
  const cls =
    tone === "gold"
      ? "bg-gold"
      : tone === "silver"
        ? "bg-muted"
        : "bg-foreground";

  return <span className={cn("h-4 w-4 rounded-full", cls)} aria-hidden />;
}

export default function ProductPage() {
  const navigate = useNavigate();

  const { category = "", subcategory = "", slug = "" } = useParams();
  const { add } = useCart();

  const { data: product, isLoading } = useProductBySlug(category, subcategory, slug);
  
  // Fetch product variants for stock checking (legacy)
  const { data: variants = [] } = useProductVariants(product?.id);
  
  // Fetch global stock from outlet_inventory (sum across all outlets)
  const { data: globalStock } = useGlobalProductStock(product?.id);
  
  // Get live review stats from database
  const reviewStats = useReviewStats(product?.id);

  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);

  // Determine if product has variations
  const hasColors = product?.colorOptions && product.colorOptions.length > 0;
  const hasSizes = product?.sizeOptions && product.sizeOptions.length > 0;
  const hasVariations = hasColors || hasSizes;
  
  // Use outlet_inventory stock if available, otherwise fall back to product_variants
  const hasOutletStock = globalStock && globalStock.variants && globalStock.variants.length > 0;
  const hasVariantStock = hasOutletStock || variants.length > 0;

  // Check stock for specific color+size combination using outlet_inventory
  const getOptionStock = (color?: string | null, size?: string | null): number => {
    // First try outlet_inventory (decentralized stock)
    if (hasOutletStock && globalStock) {
      if (!color && !size) return globalStock.totalStock;

      return globalStock.variants
        .filter((v) => {
          const colorMatch = color ? (v.color || null) === color : true;
          const sizeMatch = size ? (v.size || null) === size : true;
          return colorMatch && sizeMatch;
        })
        .reduce((sum, v) => sum + v.stock, 0);
    }
    
    // Fallback to product_variants table
    if (variants.length > 0) {
      if (!color && !size) {
        return variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
      }

      return variants
        .filter((v) => {
          const colorMatch = color ? (v.color || null) === color : true;
          const sizeMatch = size ? (v.size || null) === size : true;
          return colorMatch && sizeMatch;
        })
        .reduce((sum, v) => sum + (v.stock_quantity || 0), 0);
    }
    
    return product?.stock ?? 0;
  };

  // Check if a color is available for any size (or overall)
  const isColorAvailable = (color: string): boolean => {
    if (!hasVariantStock) return true;
    if (hasSizes && product?.sizeOptions) {
      // Check if any size has stock for this color
      return product.sizeOptions.some(size => getOptionStock(color, size) > 0);
    }
    // No sizes, just check color
    return getOptionStock(color, null) > 0;
  };

  // Check if a size is available for selected color (or overall)
  const isSizeAvailable = (size: string): boolean => {
    if (!hasVariantStock) return true;
    if (selectedColor) {
      // Check if this size has stock for selected color
      return getOptionStock(selectedColor, size) > 0;
    }
    // No color selected, check if any color has stock for this size
    if (hasColors && product?.colorOptions) {
      return product.colorOptions.some(c => getOptionStock(c.name, size) > 0);
    }
    // No colors, just check size
    return getOptionStock(null, size) > 0;
  };

  useEffect(() => {
    setActiveImageIdx(0);
    setSelectedColor(null);
    setSelectedSize(null);
    setQty(1);
  }, [category, subcategory, slug]);

  useEffect(() => {
    if (!product) return;
    const fallbackTitle = `${product.title} — Friction`;
    const fallbackDescription = `${product.description} Shop ${product.brand} with fast delivery and curated deals.`;
    const title = product.metaTitle?.trim() || fallbackTitle;
    const description = (product.metaDescription?.trim() || fallbackDescription).slice(0, 160);
    const canonical = `${window.location.origin}${productPath(product)}`;
    const priceUsd = (product.price / 100).toFixed(2);

    // Basic meta
    document.title = title;
    setMeta("description", description);
    setCanonical(canonical);

    // OG tags
    setOgMeta("og:title", title);
    setOgMeta("og:description", description);
    setOgMeta("og:type", "product");
    setOgMeta("og:url", canonical);
    setOgMeta("og:image", product.images[0] || "");
    setOgMeta("og:site_name", "Friction");

    // Twitter card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", title);
    setMeta("twitter:description", description);
    setMeta("twitter:image", product.images[0] || "");

    
    // JSON-LD Product + AggregateRating
    const jsonLdData = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.title,
      description: product.description,
      image: product.images,
      brand: {
        "@type": "Brand",
        name: product.brand,
      },
      sku: product.id,
      offers: {
        "@type": "Offer",
        url: canonical,
        priceCurrency: "USD",
        price: priceUsd,
        availability: "https://schema.org/InStock",
        seller: {
          "@type": "Organization",
          name: "Friction",
        },
      },
      aggregateRating: reviewStats.totalReviews > 0 ? {
        "@type": "AggregateRating",
        ratingValue: reviewStats.averageRating.toFixed(1),
        reviewCount: reviewStats.totalReviews.toString(),
        bestRating: "5",
        worstRating: "1",
      } : undefined,
    };
    setJsonLd("product-jsonld", jsonLdData);
    
    return () => {
      removeJsonLd("product-jsonld");
    };
  }, [product]);

  // Color selection changes active image
  useEffect(() => {
    if (!product || !selectedColor) return;
    const colorOption = product.colorOptions.find(c => c.name === selectedColor);
    if (colorOption) {
      setActiveImageIdx(colorOption.imageIndex);
    }
  }, [product, selectedColor]);

  // Build variation object for cart
  const getSelectedVariation = (): SelectedVariation | undefined => {
    if (!hasVariations) return undefined;
    const variation: SelectedVariation = {};
    if (hasColors && selectedColor) variation.color = selectedColor;
    if (hasSizes && selectedSize) variation.size = selectedSize;
    return Object.keys(variation).length > 0 ? variation : undefined;
  };

  // Validate variation selection
  const validateVariation = (): boolean => {
    if (!hasVariations) return true;
    if (hasColors && !selectedColor) {
      toast.error("অনুগ্রহ করে একটি রং নির্বাচন করুন", { description: "Please select a color" });
      return false;
    }
    if (hasSizes && !selectedSize) {
      toast.error("অনুগ্রহ করে একটি সাইজ নির্বাচন করুন", { description: "Please select a size" });
      return false;
    }
    return true;
  };

  // Get current price based on selected variant
  const currentPricing = product ? getVariantPrice(product, selectedColor ?? undefined, selectedSize ?? undefined) : null;

  // Check if selected variant is out of stock
  const selectedVariantStock = hasVariantStock && hasVariations
    ? getOptionStock(selectedColor, selectedSize)
    : (product?.stock ?? 0);
  const isOutOfStock = selectedVariantStock <= 0;

  // Add to cart handler
  const handleAddToCart = () => {
    if (!product || !currentPricing) return;
    if (!validateVariation()) return;
    
    if (isOutOfStock) {
      toast.error("Out of Stock", { description: "This product is currently unavailable" });
      return;
    }
    
    add({ 
      id: product.id, 
      title: product.title, 
      price: currentPricing.price,
      image: product.images[0],
      variation: getSelectedVariation(),
      slug: product.slug,
      category: product.category,
      subcategory: product.subcategory,
      stock: selectedVariantStock, // Pass variant-specific stock for cart validation
    }, qty);
    
    // Track AddToCart event
    trackAddToCart(product.id, product.title, currentPricing.price / 100);
    
    toast.success("Added to cart!", { 
      description: `${product.title}${selectedColor ? ` - ${selectedColor}` : ''}${selectedSize ? ` - ${selectedSize}` : ''}` 
    });
  };

  // WhatsApp order handler
  const handleWhatsAppOrder = () => {
    if (!product || !currentPricing) return;
    if (!validateVariation()) return;
    
    const variationText = [
      selectedColor ? `Color: ${selectedColor}` : null,
      selectedSize ? `Size: ${selectedSize}` : null,
    ].filter(Boolean).join(", ");
    
    const message = encodeURIComponent(
      `Hi! I want to order:\n\n*${product.title}*${variationText ? `\n${variationText}` : ''}\nPrice: ${formatPrice(currentPricing.price)}\nQuantity: ${qty}\n\nPlease confirm availability.`
    );
    window.open(`https://wa.me/8801929110024?text=${message}`, "_blank");
  };

  // Buy now handler - no auth barrier, direct to checkout
  const handleBuyNow = () => {
    if (!product || !currentPricing) return;
    if (!validateVariation()) return;
    
    if (isOutOfStock) {
      toast.error("Out of Stock", { description: "This product is currently unavailable" });
      return;
    }
    
    add({ 
      id: product.id, 
      title: product.title, 
      price: currentPricing.price,
      image: product.images[0],
      variation: getSelectedVariation(),
      slug: product.slug,
      category: product.category,
      subcategory: product.subcategory,
      stock: selectedVariantStock, // Pass variant-specific stock
    }, qty);
    
    // Track AddToCart event for buy now
    trackAddToCart(product.id, product.title, currentPricing.price / 100);
    
    // Go directly to checkout - no auth check
    navigate("/checkout");
  };

  // Track ViewContent when product loads
  useEffect(() => {
    if (product && currentPricing) {
      trackViewContent(product.id, product.title, currentPricing.price / 100);
    }
  }, [product?.id]);

  if (isLoading) {
    return (
      <main className="container py-16">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Product not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find that product.</p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  // Use variant pricing if available
  const displayPrice = currentPricing?.price ?? product.price;
  const displayCompareAt = currentPricing?.compareAtPrice ?? product.compareAtPrice;
  const priceLabel = formatPrice(displayPrice);
  const compareLabel = displayCompareAt ? formatPrice(displayCompareAt) : null;

  return (
    <main className="min-h-screen bg-background text-foreground pb-24 md:pb-0">
      <div className="container py-8 md:py-10">
        {/* Breadcrumbs */}
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={`/${category}/all`}>{capitalize(category.replace(/-/g, " "))}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            {subcategory && subcategory !== "all" && (
              <>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/${category}/${subcategory}`}>{capitalize(subcategory.replace(/-/g, " "))}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
              </>
            )}
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{product.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <section className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12" aria-label="Product details">
          {/* Gallery */}
          <div className="grid gap-4 min-w-0">
            {/* Mobile slider */}
            <div className="lg:hidden">
              <Carousel opts={{ loop: true }}>
                <CarouselContent className="ml-0">
                  {product.images.map((src, i) => (
                    <CarouselItem key={src || i} className="pl-0">
                      <div className="relative overflow-hidden rounded-2xl border border-input bg-card">
                        <img
                          src={src || "/placeholder.svg"}
                          alt={`${product.title} image ${i + 1}`}
                          className="aspect-square w-full object-contain p-4"
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>
            </div>

            {/* Desktop main + thumbs */}
            <div className="hidden lg:block">
              <div className="group relative overflow-hidden rounded-2xl border border-input bg-card">
                <img
                  src={product.images[activeImageIdx] || "/placeholder.svg"}
                  alt={product.title}
                  className={cn(
                    "aspect-square w-full object-contain p-8",
                    "transition-transform duration-500 ease-out",
                    "group-hover:scale-110",
                  )}
                  loading="eager"
                  decoding="async"
                />
                {product.badge && (
                  <span className="absolute left-4 top-4 rounded-2xl bg-bubu-red px-3 py-1 text-xs font-bold text-bubu-red-foreground">
                    {product.badge}
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1" aria-label="Product image thumbnails">
                {product.images.map((src, idx) => (
                  <button
                    key={src || idx}
                    type="button"
                    onClick={() => setActiveImageIdx(idx)}
                    className={cn(
                      "relative overflow-hidden rounded-xl border border-input bg-card",
                      "h-20 w-20 flex-none",
                      "transition-all duration-200",
                      idx === activeImageIdx ? "ring-2 ring-primary ring-offset-2" : "hover:opacity-80",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    )}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={src || "/placeholder.svg"} alt="" className="h-full w-full object-contain p-2" loading="lazy" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Info Column - Redesigned */}
          <div className="flex flex-col gap-5 min-w-0">
            {/* Title & Price Section */}
            <header className="space-y-3">
              <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-3xl lg:text-4xl">
                {product.title}
              </h1>
              
              {product.brand && (
                <p className="text-sm text-muted-foreground">Brand: <span className="font-medium text-foreground">{product.brand}</span></p>
              )}

              <div className="flex flex-wrap items-baseline gap-3">
                <span className="text-3xl font-extrabold text-bubu-red">{priceLabel}</span>
                {compareLabel && (
                  <span className="text-lg text-muted-foreground line-through">{compareLabel}</span>
                )}
                {displayCompareAt && displayCompareAt > displayPrice && (
                  <span className="rounded-2xl bg-bubu-green/20 px-2 py-0.5 text-xs font-semibold text-bubu-green-foreground">
                    Save {formatPrice(displayCompareAt - displayPrice)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Stars rating={reviewStats.averageRating} />
                <span className="text-sm text-muted-foreground">
                  ({reviewStats.totalReviews} review{reviewStats.totalReviews !== 1 ? 's' : ''})
                </span>
              </div>
            </header>

            {/* Color Options */}
            {hasColors && (
              <div className="space-y-2">
                <p className="text-sm font-semibold">Color <span className="text-destructive">*</span></p>
                <div className="flex flex-wrap items-center gap-2">
                  {product.colorOptions.map((c) => {
                    const colorAvailable = isColorAvailable(c.name);
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => colorAvailable && setSelectedColor(c.name)}
                        disabled={!colorAvailable}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-2xl border px-3 py-2",
                          "transition-all duration-200 relative",
                          selectedColor === c.name 
                            ? "border-primary bg-primary/5 ring-1 ring-primary" 
                            : colorAvailable
                              ? "border-input bg-background hover:border-primary/50"
                              : "border-muted bg-muted/50 cursor-not-allowed opacity-50",
                        )}
                        aria-label={colorAvailable ? `Select ${c.name}` : `${c.name} - Out of stock`}
                      >
                        <Swatch tone={c.swatch} />
                        <span className="text-xs font-medium">{c.name}</span>
                        {!colorAvailable && (
                          <span className="absolute inset-0 flex items-center justify-center">
                            <span className="h-px w-full bg-destructive/60 rotate-[-20deg]" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Options */}
            {hasSizes && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Size <span className="text-destructive">*</span></p>
                  <SizeChartDialog />
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.sizeOptions.map((opt) => {
                    const sizeAvailable = isSizeAvailable(opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => sizeAvailable && setSelectedSize(opt)}
                        disabled={!sizeAvailable}
                        className={cn(
                          "min-w-[3rem] rounded-2xl border px-4 py-2.5 text-sm font-semibold relative",
                          "transition-all duration-200",
                          selectedSize === opt 
                            ? "border-primary bg-primary text-primary-foreground shadow-md" 
                            : sizeAvailable
                              ? "border-input bg-background hover:border-primary/50 hover:bg-muted/50"
                              : "border-muted bg-muted/30 text-muted-foreground cursor-not-allowed line-through",
                        )}
                        aria-label={sizeAvailable ? `Select size ${opt}` : `Size ${opt} - Out of stock`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Size Chart Link (when no sizes defined) */}
            {!hasSizes && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Need help with sizing?</span>
                <SizeChartDialog />
              </div>
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">Quantity</p>
              <div className="inline-flex items-center gap-1 rounded-2xl border border-input bg-background">
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-l-lg" 
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-12 text-center text-sm font-semibold">{qty}</div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="h-10 w-10 rounded-r-lg" 
                  onClick={() => setQty((q) => q + 1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Action Buttons - Row 1: Buy Now + Add to Cart */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                className={cn(
                  "h-12 rounded-2xl",
                  isOutOfStock 
                    ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" 
                    : "bg-bubu-red text-bubu-red-foreground hover:bg-bubu-red/90"
                )}
                onClick={handleBuyNow}
                disabled={isOutOfStock}
              >
                {isOutOfStock ? "Out of Stock" : "Buy Now"}
              </Button>
              <Button
                variant={isOutOfStock ? "secondary" : "outline"}
                className={cn(
                  "h-12 rounded-2xl",
                  isOutOfStock 
                    ? "opacity-60 cursor-not-allowed" 
                    : "border-primary text-primary hover:bg-primary/5"
                )}
                onClick={handleAddToCart}
                disabled={isOutOfStock}
              >
                <ShoppingCart className="mr-2 h-4 w-4" />
                {isOutOfStock ? "Unavailable" : "Add to Cart"}
              </Button>
            </div>

            {/* WhatsApp Button - Row 2 */}
            <Button
              className="h-12 w-full rounded-2xl bg-[#25D366] text-white hover:bg-[#1da851]"
              onClick={handleWhatsAppOrder}
            >
              <WhatsAppIcon className="mr-2 h-5 w-5" />
              Order via WhatsApp
            </Button>

            {/* Premium Benefits Box */}
            <PremiumBenefits benefits={product.benefits} />
          </div>
        </section>

        {/* Related Products */}
        <RelatedProducts category={category} currentProductId={product.id} />

        {/* Customer Reviews */}
        <CustomerReviews 
          productId={product.id} 
          productRating={product.rating} 
          reviewCount={product.reviewCount} 
        />
      </div>

      {/* Sticky Mobile Cart Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-input bg-background p-3 shadow-lg md:hidden">
        <div className="flex items-center gap-3">
          {/* Price Display */}
          <div className="flex-shrink-0">
            <p className="text-lg font-extrabold text-bubu-red">{priceLabel}</p>
            {compareLabel && (
              <p className="text-xs text-muted-foreground line-through">{compareLabel}</p>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-1 gap-2">
            <Button
              type="button"
              variant={isOutOfStock ? "secondary" : "outline"}
              className={cn(
                "flex-1 rounded-2xl",
                isOutOfStock 
                  ? "opacity-60 cursor-not-allowed" 
                  : "border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              )}
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="mr-1.5 h-4 w-4" />
              {isOutOfStock ? "N/A" : "Cart"}
            </Button>
            <Button
              type="button"
              className={cn(
                "flex-1 rounded-2xl",
                isOutOfStock 
                  ? "bg-muted text-muted-foreground cursor-not-allowed opacity-60" 
                  : "bg-bubu-red text-bubu-red-foreground hover:bg-bubu-red/90"
              )}
              onClick={handleBuyNow}
              disabled={isOutOfStock}
            >
              {isOutOfStock ? "Out of Stock" : "Buy Now"}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}