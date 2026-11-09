import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useBrands } from "@/hooks/useBrands";
import { useProducts } from "@/hooks/useProducts";
import heroImg from "@/assets/hero-luxury-collage.jpg";
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Loader2, Image as ImageIcon } from "lucide-react";
import { getThumbnail, getProductImage } from "@/lib/cloudinary";

function setMeta(name: string, content: string) {
  let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
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

export default function BrandPage() {
  const { slug = "" } = useParams();
  const { data: brands = [], isLoading: brandsLoading } = useBrands();
  const { data: products = [], isLoading: productsLoading } = useProducts();

  const brand = useMemo(() => {
    return brands.find((b) => {
      const brandSlug = b.slug || b.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
      return brandSlug === slug;
    });
  }, [brands, slug]);

  const brandProducts = useMemo(() => {
    if (!brand) return [];
    return products.filter((p) => p.brand?.toLowerCase() === brand.name.toLowerCase());
  }, [brand, products]);

  useEffect(() => {
    if (!brand) return;

    const title = `${brand.name} — Brand Collection`;
    const description = `Explore ${brand.name} watches & perfumes — curated picks, authentic quality, and limited-time deals.`;

    document.title = title;
    setMeta("description", description);

    const canonical = `${window.location.origin}/brands/${slug}`;
    setCanonical(canonical);
  }, [brand, slug]);

  if (brandsLoading) {
    return (
      <main className="container flex items-center justify-center py-32">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </main>
    );
  }

  if (!brand) {
    return (
      <main className="container py-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Brand not found</h1>
        <p className="mt-2 text-muted-foreground">We couldn't find that brand.</p>
        <div className="mt-6">
          <Button asChild variant="outline">
            <Link to="/brands">Browse all brands</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="relative overflow-hidden border-b border-input">
        <div className="absolute inset-0">
          <img src={heroImg} alt="Luxury collage background" className="h-full w-full object-cover" loading="eager" decoding="async" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/85 to-background/40" />
        </div>

        <div className="container relative py-12 md:py-16">
          <nav className="text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground">
              Home
            </Link>
            <span aria-hidden> / </span>
            <Link to="/brands" className="hover:text-foreground">
              Brands
            </Link>
            <span aria-hidden> / </span>
            <span className="text-foreground">{brand.name}</span>
          </nav>

          <div className="mt-4 flex items-center gap-4">
            {brand.logo_url ? (
              <div className="h-16 w-16 overflow-hidden rounded-xl border bg-background/80 p-2 shadow-soft">
                <img
                  src={getThumbnail(brand.logo_url, 100)}
                  alt={`${brand.name} logo`}
                  className="h-full w-full object-contain"
                />
              </div>
            ) : null}
            <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">{brand.name}</h1>
          </div>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Curated highlights from {brand.name} — built for timeless style and everyday confidence.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild variant="hero">
              <Link to={`/?brand=${slug}#deals`}>Shop featured products</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/brands">Browse brands</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="container py-10 md:py-14" aria-label={`${brand.name} products`}>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Featured from {brand.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">A tight edit of best sellers and signature pieces.</p>
          </div>
        </div>

        {productsLoading ? (
          <div className="mt-8 flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : brandProducts.length ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {brandProducts.map((p) => {
              const firstImage = p.images[0] || "";
              const priceFormatted = `৳${(p.price / 100).toLocaleString()}`;
              const comparePrice = p.compareAtPrice ? `৳${(p.compareAtPrice / 100).toLocaleString()}` : null;

              return (
                <article
                  key={p.id}
                  className={cn(
                    "group overflow-hidden rounded-3xl border border-input bg-card shadow-soft",
                    "transition-all duration-300 ease-in-out hover:-translate-y-2 hover:shadow-elegant",
                  )}
                >
                  <Link to={`/products/${p.slug}`}>
                    <div className="relative overflow-hidden">
                      {firstImage ? (
                        <img
                          src={getProductImage(firstImage, "medium")}
                          alt={p.title}
                          className={cn(
                            "w-full object-cover transition-transform duration-300 ease-in-out group-hover:scale-105",
                            "aspect-square md:h-64",
                          )}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="flex aspect-square items-center justify-center bg-muted/20 md:h-64">
                          <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                        </div>
                      )}

                      {p.badge && (
                        <div className="absolute left-3 top-3 rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold text-gold-foreground shadow-soft md:left-4 md:top-4 md:px-3 md:text-xs">
                          {p.badge}
                        </div>
                      )}
                    </div>

                    <div className="p-3 md:p-6">
                      <h3
                        className={cn(
                          "font-semibold leading-snug",
                          "text-sm md:text-base",
                          "overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
                        )}
                      >
                        {p.title}
                      </h3>

                      <div className="mt-2 flex items-baseline justify-between gap-2 md:mt-3 md:justify-start">
                        <div className="text-sm font-extrabold text-foreground md:text-lg">{priceFormatted}</div>
                        {comparePrice ? (
                          <div className="text-xs text-muted-foreground line-through md:text-sm">{comparePrice}</div>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-input bg-card p-8 shadow-soft">
            <p className="font-semibold">No products yet for {brand.name}.</p>
            <p className="mt-1 text-sm text-muted-foreground">Add inventory and we'll show it here.</p>
          </div>
        )}
      </section>

      <section className="container pb-14">
        <div className="rounded-3xl border border-input bg-card p-7 shadow-soft md:p-10">
          <h2 className="text-2xl font-extrabold tracking-tight">Explore more</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Prefer browsing by category? Jump back into watches, perfumes, and curated deals.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild variant="brand">
              <Link to="/#deals">Today's deals</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/#perfumes">Perfumes</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/#smart">Smart watches</Link>
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
