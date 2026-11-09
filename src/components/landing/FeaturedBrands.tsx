import { useNavigate } from "react-router-dom";
import { useBrands } from "@/hooks/useBrands";
import { getThumbnail } from "@/lib/cloudinary";

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function BrandCard({
  name,
  slug,
  logo,
}: {
  name: string;
  slug: string;
  logo: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(`/brands/${slug}`)}
      className="group relative flex h-24 w-40 flex-shrink-0 items-center justify-center rounded-xl border border-transparent bg-white p-4 shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1.5 hover:border-primary/20 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:h-28 md:w-48 lg:h-32 lg:w-56"
      aria-label={`View ${name}`}
    >
      <img
        src={getThumbnail(logo, 220)}
        alt={`${name} logo`}
        className="h-10 w-auto max-w-[100px] object-contain opacity-60 grayscale transition-all duration-300 ease-in-out group-hover:opacity-100 group-hover:grayscale-0 md:h-14 md:max-w-[120px] lg:h-16 lg:max-w-[140px]"
        loading="lazy"
        decoding="async"
      />
    </button>
  );
}

export function FeaturedBrands({
  selectedBrand,
  onSelectBrand,
}: {
  selectedBrand: string | null;
  onSelectBrand: (brand: string) => void;
}) {
  const { data: brands = [] } = useBrands();

  const brandList = brands
    .filter((b) => !!b.name && !!b.logo_url)
    .slice(0, 12)
    .map((b) => ({
      name: b.name,
      slug: b.slug || slugify(b.name),
      logo: b.logo_url || "",
    }));

  if (brandList.length === 0) return null;

  // Duplicate for seamless infinite scroll
  const duplicatedBrands = [...brandList, ...brandList];

  return (
    <section
      id="brands"
      className="bg-[#f8f9fa] py-12 md:py-16"
      aria-label="Featured brands"
    >
      <div className="container">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground md:text-3xl lg:text-4xl">
            Featured Brands
          </h2>
          <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-primary" />
          <p className="mt-4 text-muted-foreground">
            Explore our curated collection of premium brands
          </p>
        </div>
      </div>

      {/* Marquee Container */}
      <div className="group/marquee relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-[#f8f9fa] to-transparent md:w-24" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-[#f8f9fa] to-transparent md:w-24" />

        {/* Scrolling track */}
        <div className="flex w-max animate-marquee gap-4 py-4 group-hover/marquee:[animation-play-state:paused] md:gap-6">
          {duplicatedBrands.map((b, idx) => (
            <BrandCard
              key={`${b.slug}-${idx}`}
              name={b.name}
              slug={b.slug}
              logo={b.logo}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
