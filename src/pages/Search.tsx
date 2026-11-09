import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSearchProducts, formatPrice, productPath, type Product } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { ShoppingCart, Star, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useCart } from "@/context/cart";

type SortKey = "relevance" | "price_asc" | "price_desc" | "rating_desc";

export default function SearchPage() {
  const { add } = useCart();
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") ?? "").trim();

  const [brand, setBrand] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("relevance");

  const { data: searchResults = [], isLoading } = useSearchProducts(q);

  const allBrands = useMemo(() => {
    const set = new Set(searchResults.map((p) => p.brand));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [searchResults]);

  const results = useMemo(() => {
    const branded = brand === "all" ? searchResults : searchResults.filter((p) => p.brand === brand);

    const sorted = [...branded];
    if (sort === "price_asc") sorted.sort((a, b) => a.price - b.price);
    if (sort === "price_desc") sorted.sort((a, b) => b.price - a.price);
    if (sort === "rating_desc") sorted.sort((a, b) => b.rating - a.rating);
    return sorted;
  }, [searchResults, brand, sort]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />
      <main className="container py-8 md:py-12">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Home</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Search</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <header className="mt-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-primary md:text-4xl">Search Results</h1>
          <p className="mt-3 text-muted-foreground">
            {q ? (
              <>
                Showing results for <span className="font-semibold text-foreground">"{q}"</span>
              </>
            ) : (
              "Type in the search bar to find products."
            )}
          </p>
        </header>

        {q ? (
          <section className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="w-full sm:w-56">
                  <Select value={brand} onValueChange={setBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All brands</SelectItem>
                      {allBrands.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-56">
                  <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="price_asc">Price: Low → High</SelectItem>
                      <SelectItem value="price_desc">Price: High → Low</SelectItem>
                      <SelectItem value="rating_desc">Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{results.length} result{results.length !== 1 ? "s" : ""}</p>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : results.length === 0 ? (
              <div className="mt-10 rounded-2xl border border-input bg-card p-12 text-center">
                <p className="text-muted-foreground">No results found. Try a different keyword.</p>
                <Button asChild variant="outline" className="mt-4">
                  <Link to="/">Back to home</Link>
                </Button>
              </div>
            ) : (
              <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-6">
                {results.map((p) => (
                  <article
                    key={p.id}
                    className="group relative overflow-hidden rounded-3xl border border-input bg-card shadow-soft transition-shadow hover:shadow-elegant"
                  >
                    <Link to={productPath(p)} className="block">
                      <div className="relative overflow-hidden">
                        <img
                          src={p.images[0] || "/placeholder.svg"}
                          alt={p.title}
                          className={cn(
                            "w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105",
                            "aspect-square",
                          )}
                          loading="lazy"
                          decoding="async"
                        />
                        {p.badge && (
                          <span className="absolute left-3 top-3 rounded-full bg-muted px-3 py-1 text-xs font-bold text-foreground">
                            {p.badge}
                          </span>
                        )}
                      </div>

                      <div className="p-4">
                        <h3 className="font-semibold text-foreground line-clamp-2 text-sm md:text-base">{p.title}</h3>
                        <p className="mt-1 text-xs text-muted-foreground md:text-sm">{p.brand}</p>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="inline-flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 text-primary" fill="currentColor" />
                            <span className="text-xs text-muted-foreground">{p.rating}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">({p.reviewCount})</span>
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-base font-extrabold text-foreground md:text-lg">{formatPrice(p.price)}</span>
                          {p.compareAtPrice ? (
                            <span className="text-xs text-muted-foreground line-through md:text-sm">
                              {formatPrice(p.compareAtPrice)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>

                    <div className="absolute bottom-4 right-4">
                      <Button
                        variant="brand"
                        size="icon"
                        className="h-10 w-10 rounded-full shadow-elegant"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          add({ 
                            id: p.id, 
                            title: p.title, 
                            price: p.price,
                            image: p.images?.[0],
                            slug: p.slug,
                            category: p.category,
                            subcategory: p.subcategory,
                          });
                        }}
                        aria-label={`Add ${p.title} to cart`}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
