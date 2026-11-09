import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import { useCategories } from "@/hooks/useCategories";
import { Skeleton } from "@/components/ui/skeleton";

// Fallback static images for shoe categories
import sneakerImg from "@/assets/product-sneaker-red.jpg";
import sportsImg from "@/assets/product-sports-shoes.jpg";
import formalImg from "@/assets/product-formal-shoes.jpg";
import bootsImg from "@/assets/product-boots.jpg";
import womensImg from "@/assets/product-womens-heels.jpg";
import mensImg from "@/assets/product-sneaker-white.jpg";

const fallbackImages: Record<string, string> = {
  "mens": mensImg,
  "womens": womensImg,
  "sneakers": sneakerImg,
  "sports": sportsImg,
  "formal": formalImg,
  "boots": bootsImg,
};

export function FeaturedCategories() {
  const { categories, isLoading } = useCategories();

  // Filter categories marked as featured and sort by sort_order
  const featuredCategories = categories
    .filter((cat) => cat.is_featured)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((cat) => ({
      ...cat,
      image: cat.image_url_optimized || cat.image_url || fallbackImages[cat.slug] || sneakerImg,
      href: `/${cat.slug}/all`,
    }));

  // If no categories from DB yet, show loading or fallback
  if (isLoading) {
    return (
      <section id="categories" className="container pb-10 pt-10 md:pb-14" aria-label="Featured categories">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold tracking-tight">Featured Categories</h2>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="mx-auto aspect-square w-full max-w-[140px] rounded-full" />
              <Skeleton className="mx-auto mt-3 h-4 w-20" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // If no featured categories found (empty DB), use static fallback
  const displayCategories = featuredCategories.length > 0 ? featuredCategories : [
    { name: "Men's", image: mensImg, href: "/mens/all", slug: "mens" },
    { name: "Women's", image: womensImg, href: "/womens/all", slug: "womens" },
    { name: "Sneakers", image: sneakerImg, href: "/sneakers/all", slug: "sneakers" },
    { name: "Sports", image: sportsImg, href: "/sports/all", slug: "sports" },
    { name: "Formal", image: formalImg, href: "/formal/all", slug: "formal" },
    { name: "Boots", image: bootsImg, href: "/boots/all", slug: "boots" },
  ];

  return (
    <section id="categories" className="py-14 md:py-20 bg-background" aria-label="Featured categories">
      <div className="container">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-bubu-red mb-3">Shop by Category</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">Featured Categories</h2>
          <div className="mx-auto mt-4 h-0.5 w-12 bg-bubu-red rounded-full" />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
          {displayCategories.map((cat) => (
            <Link key={cat.slug} to={cat.href} className="group text-center">
              <div className={cn(
                "relative overflow-hidden rounded-2xl bg-muted aspect-square",
                "shadow-soft transition-all duration-500 ease-out",
                "group-hover:shadow-elegant group-hover:-translate-y-1.5",
              )}>
                <img
                  src={cat.image}
                  alt={cat.name}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                  loading="lazy"
                />
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-3">
                  <span className="text-white font-semibold text-sm drop-shadow-sm">{cat.name}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
