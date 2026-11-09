import { useState, useEffect, useRef } from "react";
import { Star } from "lucide-react";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FeaturedReview {
  id: string;
  customer_name: string;
  rating: number;
  image: string;
  review_text?: string;
}

export function FeaturedReviewsSection() {
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const autoplayPlugin = useRef(
    Autoplay({ delay: 5000, stopOnInteraction: false, stopOnMouseEnter: true })
  );

  useEffect(() => {
    fetchReviews();
  }, []);

  useEffect(() => {
    if (!api) return;

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("featured_reviews")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data?.featured_reviews) {
        const parsed = Array.isArray(data.featured_reviews)
          ? (data.featured_reviews as unknown as FeaturedReview[])
          : [];
        setReviews(parsed);
      }
    } catch (error) {
      console.error("Error fetching featured reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || reviews.length === 0) {
    return null;
  }

  return (
    <section className="py-14 md:py-20 bg-muted/30">
      <div className="container">
        {/* Header */}
        <div className="mb-10 text-center">
          <span className="inline-block text-xs font-bold tracking-[0.2em] uppercase text-bubu-red mb-3">Testimonials</span>
          <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground tracking-tight">Customer Reviews</h2>
          <div className="mx-auto mt-4 h-0.5 w-12 bg-bubu-red rounded-full" />
          <p className="mt-4 text-muted-foreground text-sm">Real feedback from our valued customers</p>
        </div>

        <Carousel
          setApi={setApi}
          opts={{ align: "start", loop: true }}
          plugins={[autoplayPlugin.current]}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {reviews.map((review) => (
              <CarouselItem
                key={review.id}
                className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3"
              >
                <div className="relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-elegant hover:-translate-y-1 transition-all duration-300">
                  {/* Image */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-muted">
                    <img
                      src={review.image}
                      alt={`Review by ${review.customer_name}`}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  </div>

                  {/* Info overlay at bottom */}
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    {/* Stars */}
                    <div className="flex items-center gap-0.5 mb-2">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-3.5 w-3.5",
                            i < review.rating
                              ? "fill-bubu-amber text-bubu-amber"
                              : "text-white/30"
                          )}
                        />
                      ))}
                    </div>

                    {review.review_text && (
                      <p className="text-xs text-white/80 line-clamp-2 mb-2 italic">
                        "{review.review_text}"
                      </p>
                    )}

                    <p className="font-bold text-white text-sm">{review.customer_name}</p>
                    <p className="text-[10px] text-white/60">✓ Verified Customer</p>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          <CarouselPrevious className="hidden md:flex -left-4 bg-card border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary" />
          <CarouselNext className="hidden md:flex -right-4 bg-card border-border text-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary" />
        </Carousel>

        {/* Dots */}
        <div className="mt-7 flex items-center justify-center gap-2">
          {Array.from({ length: count }).map((_, i) => (
            <button
              key={i}
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                current === i
                  ? "h-2.5 w-8 bg-bubu-red"
                  : "h-2.5 w-2.5 bg-bubu-red/30 hover:bg-bubu-red/50"
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
