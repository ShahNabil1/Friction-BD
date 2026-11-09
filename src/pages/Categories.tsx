import { Link } from "react-router-dom";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { Footer } from "@/components/landing/Footer";
import { MobileBottomNav } from "@/components/landing/MobileBottomNav";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/motion/Reveal";

export default function CategoriesPage() {
  const { hierarchicalCategories, isLoading } = useCategories();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeaderNav />

      <main className="container py-8 md:py-12">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Shop by Category
          </h1>
          <p className="mt-2 text-muted-foreground">
            Browse our curated collections
          </p>
        </header>

        {isLoading ? (
          <div className="grid gap-6 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-12">
            {hierarchicalCategories.map((mainCategory) => (
              <Reveal key={mainCategory.id}>
                <section>
                  <h2 className="mb-6 text-xl font-bold text-foreground md:text-2xl">
                    {mainCategory.name}
                  </h2>
                  
                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {/* Main category card */}
                    <CategoryCard
                      name={`All ${mainCategory.name}`}
                      slug={mainCategory.slug}
                      imageUrl={mainCategory.image_url_optimized || mainCategory.image_url}
                      isMainCategory
                    />
                    
                    {/* Subcategory cards */}
                    {mainCategory.children?.map((subCategory) => (
                      <CategoryCard
                        key={subCategory.id}
                        name={subCategory.name}
                        slug={`${mainCategory.slug}/${subCategory.slug}`}
                        imageUrl={subCategory.image_url_optimized || subCategory.image_url}
                      />
                    ))}
                  </div>
                </section>
              </Reveal>
            ))}
          </div>
        )}
      </main>

      <Footer />
      <MobileBottomNav />
      <div className="h-16 md:hidden" />
    </div>
  );
}

function CategoryCard({
  name,
  slug,
  imageUrl,
  isMainCategory = false,
}: {
  name: string;
  slug: string;
  imageUrl: string | null;
  isMainCategory?: boolean;
}) {
  const fallbackImage = "/placeholder.svg";

  return (
    <Link
      to={`/${slug}`}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-soft transition-all duration-300 hover:shadow-elegant hover:-translate-y-1"
    >
      <div className="aspect-square overflow-hidden">
        <img
          src={imageUrl || fallbackImage}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className={`font-semibold text-white ${isMainCategory ? "text-base md:text-lg" : "text-sm md:text-base"}`}>
          {name}
        </h3>
        {isMainCategory && (
          <span className="mt-1 inline-block text-xs text-white/80">
            View all →
          </span>
        )}
      </div>
    </Link>
  );
}
