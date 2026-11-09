import { Button } from "@/components/ui/button";
import { useProductsByShopCategory, formatPrice, productPath, type Product } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { AddToCartButton } from "@/components/cart/AddToCartButton";

export default function ShopCategoryPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { categories, isLoading: categoriesLoading } = useCategories();
  
  // Find category from database by slug
  const categoryInfo = useMemo(() => {
    const cat = categories.find((c) => c.slug === slug);
    if (cat) {
      return { name: cat.name, description: `Browse our ${cat.name.toLowerCase()} collection` };
    }
    return null;
  }, [categories, slug]);

  const { data: categoryProducts = [], isLoading: productsLoading } = useProductsByShopCategory(slug);

  useEffect(() => {
    if (categoryInfo) {
      document.title = `${categoryInfo.name} — Friction`;
    }
  }, [categoryInfo]);

  // Show loading while categories are being fetched
  if (categoriesLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <HeaderNav />
        <main className="container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!categoryInfo) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <HeaderNav />
        <main className="container py-16">
          <h1 className="text-3xl font-extrabold tracking-tight">Category Not Found</h1>
          <p className="mt-2 text-muted-foreground">We couldn't find the category you're looking for.</p>
          <div className="mt-6">
            <Button asChild variant="outline">
              <Link to="/categories">Browse Categories</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="container py-8 md:py-12">
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
                <Link to="/#categories">Categories</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{categoryInfo.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Page Header */}
        <header className="mt-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary md:text-4xl lg:text-5xl">
            {categoryInfo.name}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{categoryInfo.description}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {categoryProducts.length} product{categoryProducts.length !== 1 ? "s" : ""} available
          </p>
        </header>

        {/* Product Grid */}
        <section className="mt-10">
          {productsLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="rounded-2xl border border-input bg-card p-12 text-center">
              <p className="text-muted-foreground">No products available in this category yet.</p>
              <Button asChild variant="outline" className="mt-4">
                <Link to="/">Browse All Products</Link>
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
              {categoryProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const priceLabel = formatPrice(product.price);
  const compareLabel = product.compareAtPrice ? formatPrice(product.compareAtPrice) : null;

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-input bg-card shadow-soft transition-shadow hover:shadow-elegant">
      <Link to={productPath(product)} className="block">
        <div className="relative overflow-hidden">
          <img
            src={product.images[0] || "/placeholder.svg"}
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
          {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && (
            <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm animate-pulse md:text-xs">
              Only {product.stock} left!
            </span>
          )}
        </div>

        <div className="p-4">
          <h3 className="font-bold text-foreground line-clamp-2 text-base md:text-lg leading-snug">{product.title}</h3>
          <p className="mt-1 text-xs text-muted-foreground md:text-sm">{product.brand}</p>

          <div className="mt-2">
            <StarRating
              rating={product.rating || 0}
              reviewCount={product.reviewCount || 0}
              size="sm"
            />
          </div>

          <div className="mt-2 flex items-center gap-2">
            <span className="text-base font-extrabold text-maroon md:text-lg">{priceLabel}</span>
            {compareLabel && (
              <span className="text-xs text-muted-foreground line-through md:text-sm">{compareLabel}</span>
            )}
          </div>
        </div>
      </Link>

      <div className="absolute bottom-4 right-4">
        <AddToCartButton
          productId={product.id}
          productTitle={product.title}
          productPrice={product.price}
          productImage={product.images[0]}
          variant="icon"
        />
      </div>
    </article>
  );
}
