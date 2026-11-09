import { Sparkles, ArrowRight } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { cn } from "@/lib/utils";

export function PromotionalBanner() {
  const { settings, isLoading } = useStoreSettings();
  const data = settings.offer_banner;

  if (!isLoading && !data.isEnabled) {
    return null;
  }

  return (
    <section id="offers" className="py-14 md:py-20 bg-muted/30">
      <div className="container">
        <div
          className={cn(
            "relative overflow-hidden rounded-3xl px-8 py-12 md:px-14 md:py-16",
            "bg-gradient-to-br from-primary via-primary to-maroon",
            "shadow-elegant",
          )}
          style={data.image ? {
            backgroundImage: `linear-gradient(135deg, hsl(var(--primary) / 0.92), hsl(var(--maroon) / 0.95)), url(${data.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          } : undefined}
        >
          {/* Decorative circles */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/5" aria-hidden />
          <div className="pointer-events-none absolute -left-8 -bottom-12 h-40 w-40 rounded-full bg-white/5" aria-hidden />

          {/* Sheen */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/2 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-80 animate-shine"
            aria-hidden
          />

          <div className="relative grid gap-8 md:grid-cols-12 md:items-center">
            <div className="md:col-span-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-xs font-bold tracking-wide text-white/90 uppercase mb-5">
                <Sparkles className="h-3.5 w-3.5 text-bubu-amber" />
                {data.badge || "Seasonal Collection"}
              </div>
              <h2 className="font-serif text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl leading-tight">
                {data.title || "Authentic & Best Priced — Midnight Gold Editions"}
              </h2>
              <p className="mt-4 max-w-xl text-white/75 text-sm md:text-base leading-relaxed">
                {data.desc || "Limited bundles across watches & fragrances. Premium packaging included — perfect for gifting."}
              </p>
            </div>

            <div className="md:col-span-4 md:text-right">
              <a
                href={data.link || "#deals"}
                className="inline-flex items-center gap-2 rounded-full bg-white text-primary px-7 py-3.5 font-bold text-sm shadow-elegant transition-all duration-300 hover:-translate-y-0.5 hover:shadow-soft"
              >
                {data.btnText || "Shop Offers"}
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
