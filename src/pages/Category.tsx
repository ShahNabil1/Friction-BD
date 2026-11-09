import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { useProductsByCategory, formatPrice, type Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { ArrowUpDown, Filter, Loader2, ShoppingCart, Star, X } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { normalizeSlug } from "@/lib/slug";

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCategoryTitle(category: string, subcategory?: string) {
  // Convert slug to title case
  const formatSlug = (slug: string) => 
    slug.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  
  if (subcategory) {
    return `${formatSlug(subcategory)}`;
  }
  return formatSlug(category);
}

type SortOption = "featured" | "price-asc" | "price-desc" | "rating" | "reviews";

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "reviews", label: "Most Reviews" },
];

export default function CategoryPage() {
  const { category = "", subcategory = "" } = useParams();
  const navigate = useNavigate();
  const { add } = useCart();

  // Auto-redirect /{category} to /{category}/all for consistent routing
  // Exclude reserved routes like "categories", "brands", "search" etc.
  const reservedRoutes = ["categories", "brands", "search", "checkout", "account", "orders", "track-order", "admin", "auth", "privacypolicy", "termsofservice"];
  
  useEffect(() => {
    if (category && !subcategory && !reservedRoutes.includes(category.toLowerCase())) {
      navigate(`/${category}/all`, { replace: true });
    }
  }, [category, subcategory, navigate]);

  // Fetch products from database (use "all" as wildcard for all subcategories)
  const effectiveSubcategory = subcategory === "all" ? undefined : subcategory;
  const { data: baseProducts = [], isLoading, error } = useProductsByCategory(category, effectiveSubcategory);

  // Filter & sort state
  const [sortBy, setSortBy] = useState<SortOption>("featured");
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500000]);
  const [minRating, setMinRating] = useState<number>(0);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Extract available brands and price range from base products
  const availableBrands = useMemo(() => {
    const brands = new Set(baseProducts.map((p) => p.brand));
    return Array.from(brands).sort();
  }, [baseProducts]);

  const priceStats = useMemo(() => {
    if (baseProducts.length === 0) return { min: 0, max: 500000 };
    const prices = baseProducts.map((p) => p.price);
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices)),
    };
  }, [baseProducts]);

  // Reset filters when category changes
  useEffect(() => {
    setPriceRange([priceStats.min, priceStats.max]);
    setSelectedBrands([]);
    setMinRating(0);
    setSortBy("featured");
  }, [category, subcategory, priceStats.min, priceStats.max]);

  // Apply filters and sorting
  const filteredProducts = useMemo(() => {
    let result = [...baseProducts];

    // Filter by brand
    if (selectedBrands.length > 0) {
      result = result.filter((p) => selectedBrands.includes(p.brand));
    }

    // Filter by price (prices are in cents/paisa)
    result = result.filter((p) => {
      return p.price >= priceRange[0] && p.price <= priceRange[1];
    });

    // Filter by rating
    if (minRating > 0) {
      result = result.filter((p) => p.rating >= minRating);
    }

    // Sort
    switch (sortBy) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "reviews":
        result.sort((a, b) => b.reviewCount - a.reviewCount);
        break;
      default:
        // featured - keep original order
        break;
    }

    return result;
  }, [baseProducts, selectedBrands, priceRange, minRating, sortBy]);

  const pageTitle = formatCategoryTitle(category, subcategory);

  useEffect(() => {
    document.title = `${pageTitle} — Fashion Elegance`;
  }, [pageTitle]);

  const activeFilterCount =
    selectedBrands.length +
    (priceRange[0] > priceStats.min || priceRange[1] < priceStats.max ? 1 : 0) +
    (minRating > 0 ? 1 : 0);

  const clearAllFilters = () => {
    setSelectedBrands([]);
    setPriceRange([priceStats.min, priceStats.max]);
    setMinRating(0);
  };

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="container py-16 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </main>
    );
  }

  // Error state
  if (error) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Error loading products</h1>
        <p className="mt-2 text-muted-foreground">
          {error instanceof Error ? error.message : "Something went wrong"}
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  if (baseProducts.length === 0) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">No products found</h1>
        <p className="mt-2 text-muted-foreground">
          We couldn't find any products in this category.
        </p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    );
  }

  const FilterContent = () => (
    <div className="grid gap-6">
      {/* Brand Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Brand</h3>
        <div className="grid gap-2">
          {availableBrands.map((brand) => (
            <label
              key={brand}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={selectedBrands.includes(brand)}
                onCheckedChange={() => toggleBrand(brand)}
              />
              {brand}
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Price Range</h3>
        <div className="px-1">
          <Slider
            value={priceRange}
            min={priceStats.min}
            max={priceStats.max}
            step={100}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mb-3"
          />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{formatPrice(priceRange[0])}</span>
            <span>{formatPrice(priceRange[1])}</span>
          </div>
        </div>
      </div>

      {/* Rating Filter */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Minimum Rating</h3>
        <div className="grid gap-2">
          {[4, 3, 2, 1].map((rating) => (
            <label
              key={rating}
              className="flex items-center gap-2 cursor-pointer text-sm"
            >
              <Checkbox
                checked={minRating === rating}
                onCheckedChange={(checked) => setMinRating(checked ? rating : 0)}
              />
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "h-3.5 w-3.5",
                      i < rating ? "text-gold" : "text-muted-foreground/30"
                    )}
                    fill={i < rating ? "currentColor" : "none"}
                  />
                ))}
                <span className="ml-1">& up</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button variant="outline" onClick={clearAllFilters} className="w-full">
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
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
            {subcategory ? (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to={`/${category}`}>{capitalize(category)}</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{capitalize(subcategory)}</BreadcrumbPage>
                </BreadcrumbItem>
              </>
            ) : (
              <BreadcrumbItem>
                <BreadcrumbPage>{capitalize(category)}</BreadcrumbPage>
              </BreadcrumbItem>
            )}
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <header className="mt-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            {pageTitle}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {filteredProducts.length} of {baseProducts.length} product
            {baseProducts.length !== 1 ? "s" : ""}
          </p>
        </header>

        {/* Filters & Sort Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {/* Mobile Filter Button */}
          <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" className="lg:hidden gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>

          {/* Sort Dropdown */}
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-[180px] gap-2">
              <ArrowUpDown className="h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Active Filter Badges */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {selectedBrands.map((brand) => (
                <Badge
                  key={brand}
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => toggleBrand(brand)}
                >
                  {brand}
                  <X className="h-3 w-3" />
                </Badge>
              ))}
              {(priceRange[0] > priceStats.min || priceRange[1] < priceStats.max) && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => setPriceRange([priceStats.min, priceStats.max])}
                >
                  {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
                  <X className="h-3 w-3" />
                </Badge>
              )}
              {minRating > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 cursor-pointer hover:bg-destructive/10"
                  onClick={() => setMinRating(0)}
                >
                  {minRating}+ Stars
                  <X className="h-3 w-3" />
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={clearAllFilters}
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="mt-8 flex gap-8">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 rounded-2xl border border-input bg-card p-5 shadow-soft">
              <h2 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </h2>
              <FilterContent />
            </div>
          </aside>

          {/* Product Grid */}
          <section className="flex-1">
            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-input bg-card p-8 text-center">
                <p className="text-muted-foreground">No products match your filters.</p>
                <Button variant="outline" onClick={clearAllFilters} className="mt-4">
                  Clear Filters
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    categorySlug={category}
                    subcategorySlug={subcategory}
                    onAddToCart={() => add({ 
                      id: p.id, 
                      title: p.title, 
                      price: p.price,
                      image: p.images?.[0],
                      slug: p.slug,
                      category: p.category,
                      subcategory: p.subcategory,
                    })}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function ProductCard({ 
  product, 
  categorySlug, 
  subcategorySlug, 
  onAddToCart 
}: { 
  product: Product; 
  categorySlug: string;
  subcategorySlug: string;
  onAddToCart: () => void;
}) {
  const navigate = useNavigate();
  const priceLabel = formatPrice(product.price);
  const compareLabel = product.compareAtPrice ? formatPrice(product.compareAtPrice) : null;

  // Build product link using current URL context if product fields are empty
  const productCategory = product.category?.toLowerCase().replace(/\s+/g, "-") || categorySlug || "products";
  const productSubcategory = product.subcategory?.toLowerCase().replace(/\s+/g, "-") || subcategorySlug || "all";
  const productSlug = normalizeSlug(product.slug);
  const productLink = `/${productCategory}/${productSubcategory}/${encodeURIComponent(productSlug)}`;

  // Check if product has variants (size or color options)
  const hasVariants = (product.sizeOptions && product.sizeOptions.length > 0) || 
                      (product.colorOptions && product.colorOptions.length > 0);

  const handleOrderNow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasVariants) {
      // Product has variants - redirect to product details page
      toast.info("Please select size/color options", {
        description: "This product has variants. Please choose your preferred options.",
      });
      navigate(productLink);
    } else {
      // Simple product - add to cart and go to checkout
      onAddToCart();
      navigate("/checkout");
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (hasVariants) {
      // Product has variants - redirect to product details page
      toast.info("Please select size/color options", {
        description: "This product has variants. Please choose your preferred options.",
      });
      navigate(productLink);
    } else {
      onAddToCart();
    }
  };

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-input bg-card shadow-soft transition-shadow hover:shadow-elegant">
      <Link to={productLink} className="block">
        <div className="relative overflow-hidden">
          <img
            src={product.images[0]}
            alt={product.title}
            className={cn(
              "w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105",
              "aspect-square",
            )}
            loading="lazy"
            decoding="async"
          />
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-maroon px-3 py-1 text-xs font-bold text-maroon-foreground">
              {product.badge}
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-foreground line-clamp-2 text-base md:text-lg leading-snug">{product.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{product.brand}</p>

          <div className="mt-2">
            <StarRating
              rating={product.rating || 0}
              reviewCount={product.reviewCount || 0}
              size="sm"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-lg font-extrabold text-maroon">{priceLabel}</span>
            {compareLabel && (
              <span className="text-sm text-muted-foreground line-through">{compareLabel}</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-4 flex flex-col gap-2 md:flex-row">
            <Button
              variant="outline"
              className="flex-1 border-maroon text-maroon hover:bg-maroon hover:text-white text-xs md:text-sm px-2 md:px-3 whitespace-nowrap rounded-xl"
              onClick={handleAddToCart}
              aria-label={`Add ${product.title} to cart`}
            >
              <ShoppingCart className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">Add to Cart</span>
            </Button>
            <Button
              className="flex-1 bg-maroon text-white hover:bg-maroon/90 text-xs md:text-sm px-2 md:px-3 whitespace-nowrap rounded-xl"
              onClick={handleOrderNow}
              aria-label={`Order ${product.title} now`}
            >
              <span className="truncate">Order Now</span>
            </Button>
          </div>
        </div>
      </Link>
    </article>
  );
}
