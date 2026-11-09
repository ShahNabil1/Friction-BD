import heroShoesImg from "@/assets/hero-shoes.jpg";
import sneakerImg from "@/assets/product-sneaker-red.jpg";
import sportsImg from "@/assets/product-sports-shoes.jpg";
import {
  Carousel,
  CarouselApi,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useStoreSettings, type HeroSlide } from "@/hooks/useStoreSettings";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";

const FALLBACK_IMAGES = [heroShoesImg, sneakerImg, sportsImg];

export function HeroSection() {
  const { settings: storeSettings, isLoading } = useStoreSettings();

  const slides = useMemo(() => {
    const dbSlides = storeSettings.hero_slides || [];

    if (dbSlides.length > 0) {
      return dbSlides.map((slide, index) => {
        const rawImage = slide.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length];
        // Optimize Cloudinary images with highest quality, no cropping
        const optimizedImage = rawImage.includes("res.cloudinary.com")
          ? optimizeCloudinaryUrl(rawImage, {
              quality: "auto:best",
              format: "auto",
              crop: "scale", // Scale preserves aspect ratio, no cropping
            })
          : rawImage;
        return {
          id: slide.id,
          image: optimizedImage,
          title: slide.title || "",
          subtitle: slide.subtitle || "",
          link: slide.link || "/categories",
        };
      });
    }

    // Fallback slides
    return [
      { id: "fallback-1", image: heroShoesImg, title: "New Arrivals", subtitle: "Discover our latest collection", link: "/categories" },
      { id: "fallback-2", image: sneakerImg, title: "Premium Sneakers", subtitle: "Style meets comfort", link: "/categories" },
    ];
  }, [storeSettings.hero_slides]);

  const [api, setApi] = useState<CarouselApi>();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setActive(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    const prefersReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const interval = window.setInterval(() => {
      api.scrollNext();
    }, 5000);

    return () => window.clearInterval(interval);
  }, [api]);

  if (isLoading) {
    return (
      <section className="relative w-full">
        <div className="w-full h-[250px] sm:h-[350px] md:h-[450px] lg:h-[500px] bg-muted animate-pulse" />
      </section>
    );
  }

  return (
    <section id="top" aria-label="Hero promotions" className="relative w-full">
      <Carousel
        setApi={setApi}
        opts={{ loop: true }}
        className="relative w-full"
      >
        <CarouselContent className="ml-0">
          {slides.map((slide, idx) => (
            <CarouselItem key={slide.id} className="pl-0">
              <div className="relative w-full h-[300px] sm:h-[420px] md:h-[540px] lg:h-[640px]">
                {/* Background Image */}
                <img
                  src={slide.image}
                  alt={slide.title || `Banner ${idx + 1}`}
                  className="w-full h-full object-cover"
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding={idx === 0 ? "sync" : "async"}
                />
                
                {/* Premium gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/10" />
                
                {/* Content */}
                {(slide.title || slide.subtitle) && (
                  <div className="absolute inset-0 flex items-center">
                    <div className="container">
                      <div className="max-w-xl text-white">
                        {slide.subtitle && (
                          <p className="text-xs sm:text-sm font-bold tracking-[0.2em] uppercase text-white/70 mb-3 animate-fade-in-up">
                            {slide.subtitle}
                          </p>
                        )}
                        {slide.title && (
                          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-5 leading-[1.15] drop-shadow-lg animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
                            {slide.title}
                          </h1>
                        )}
                        <div className="flex flex-wrap items-center gap-3 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
                          <Link to={slide.link || "/categories"}>
                            <Button
                              size="lg"
                              className="bg-bubu-red text-white hover:bg-bubu-red/90 font-semibold px-7 rounded-full shadow-elegant hover:-translate-y-0.5 transition-all duration-300"
                            >
                              Shop Now
                              <ArrowRight className="ml-1 h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to="/categories">
                            <Button
                              size="lg"
                              variant="ghost"
                              className="text-white border-2 border-white/50 hover:bg-white/10 hover:border-white font-semibold px-7 rounded-full transition-all duration-300"
                            >
                              View Collection
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {/* Navigation Arrows */}
        <CarouselPrevious
          variant="ghost"
          className={cn(
            "left-4 top-1/2 h-11 w-11 -translate-y-1/2 md:left-6 md:h-13 md:w-13",
            "border border-white/30 bg-black/30 text-white backdrop-blur-sm rounded-full",
            "transition-all duration-300 hover:bg-white hover:text-foreground hover:border-white/80",
            "hidden md:flex",
          )}
        />
        <CarouselNext
          variant="ghost"
          className={cn(
            "right-4 top-1/2 h-11 w-11 -translate-y-1/2 md:right-6 md:h-13 md:w-13",
            "border border-white/30 bg-black/30 text-white backdrop-blur-sm rounded-full",
            "transition-all duration-300 hover:bg-white hover:text-foreground hover:border-white/80",
            "hidden md:flex",
          )}
        />

        {/* Pagination Dots */}
        <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 md:bottom-7">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => api?.scrollTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === active
                  ? "h-2.5 w-8 bg-white"
                  : "h-2.5 w-2.5 bg-white/50 hover:bg-white/80",
              )}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </Carousel>
    </section>
  );
}
