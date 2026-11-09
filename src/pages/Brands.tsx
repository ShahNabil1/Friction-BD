import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Image as ImageIcon, Search, ArrowRight, Zap } from "lucide-react";
import { useBrands } from "@/hooks/useBrands";
import { Input } from "@/components/ui/input";
import { getThumbnail } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export default function BrandsPage() {
  const { data: brands = [], isLoading } = useBrands();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(term));
  }, [brands, q]);

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* HERO */}
      <header className="relative overflow-hidden border-b border-border bg-primary text-primary-foreground">
        {/* Decorative grid */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary-foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Red diagonal accent */}
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-[420px] w-[420px] rotate-12 bg-[hsl(var(--bubu-red))] opacity-90 blur-[2px]"
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%)" }}
        />
        <div
          aria-hidden
          className="absolute -right-10 top-32 h-2 w-72 rotate-[-18deg] bg-[hsl(var(--bubu-red))]"
        />

        <div className="container relative max-w-7xl py-16 md:py-24">
          <nav className="text-xs uppercase tracking-[0.2em] text-primary-foreground/60">
            <Link to="/" className="hover:text-primary-foreground">Home</Link>
            <span className="mx-2">/</span>
            <span className="text-primary-foreground">Brands</span>
          </nav>

          <div className="mt-6 flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--bubu-red))] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white">
              <Zap className="h-3 w-3 fill-current" /> Friction
            </span>
            <span className="text-xs uppercase tracking-[0.25em] text-primary-foreground/60">
              {brands.length} {brands.length === 1 ? "Brand" : "Brands"}
            </span>
          </div>

          <h1 className="mt-5 text-5xl font-black uppercase leading-[0.95] tracking-tight md:text-7xl lg:text-8xl">
            Shop by
            <br />
            <span className="text-[hsl(var(--bubu-red))]">Brand.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-primary-foreground/70 md:text-lg">
            The athletes you train with. The labels you live in. Every brand on Friction is
            authentic, in-stock, and ready to move.
          </p>

          {/* Search */}
          <div className="mt-8 max-w-md">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-foreground/50" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search brands…"
                className="h-12 rounded-full border-primary-foreground/20 bg-white/5 pl-11 text-primary-foreground placeholder:text-primary-foreground/40 focus-visible:ring-[hsl(var(--bubu-red))]"
              />
            </div>
          </div>
        </div>
      </header>

      {/* GRID */}
      <section className="container max-w-7xl py-12 md:py-16" aria-label="All brands">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--bubu-red))]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
            <p className="mt-4 text-muted-foreground">
              {q ? `No brands match "${q}"` : "No brands available yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((brand) => {
              const slug = brand.slug || slugify(brand.name);
              return (
                <Link
                  key={brand.id}
                  to={`/brands/${slug}`}
                  className={cn(
                    "group relative flex aspect-[4/5] flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6",
                    "transition-all duration-300 hover:-translate-y-1 hover:border-foreground hover:shadow-[0_20px_40px_-20px_hsl(var(--foreground)/0.3)]",
                  )}
                >
                  {/* Top: logo */}
                  <div className="flex h-32 items-center justify-center">
                    {brand.logo_url ? (
                      <img
                        src={getThumbnail(brand.logo_url, 320)}
                        alt={`${brand.name} logo`}
                        className="max-h-full max-w-[70%] object-contain grayscale transition-all duration-500 group-hover:scale-110 group-hover:grayscale-0"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-muted">
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  {/* Diagonal red sweep on hover */}
                  <div
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-[hsl(var(--bubu-red))] transition-transform duration-500 group-hover:scale-x-100"
                  />

                  {/* Bottom: name + CTA */}
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight">
                      {brand.name}
                    </h3>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs uppercase tracking-widest text-muted-foreground">
                        Explore
                      </span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-[hsl(var(--bubu-red))]" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
