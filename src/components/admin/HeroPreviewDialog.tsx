import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { HeroSlide } from "@/hooks/useStoreSettings";

// Theme presets (same as HeroSection)
const SLIDE_THEMES = [
  {
    themeClass: "bg-gradient-to-br from-primary to-maroon text-primary-foreground",
    titleClass: "text-gold",
    subtitleClass: "text-muted-foreground",
    ctaClass: "bg-gold text-maroon",
  },
  {
    themeClass: "bg-hero-gradient text-foreground",
    titleClass: "text-maroon",
    subtitleClass: "text-muted-foreground",
    ctaClass: "bg-primary text-primary-foreground",
  },
  {
    themeClass: "bg-midnight text-midnight-foreground",
    titleClass: "text-gold",
    subtitleClass: "text-midnight-foreground/80",
    ctaClass: "bg-background text-foreground",
  },
  {
    themeClass: "bg-gradient-to-br from-maroon to-primary text-primary-foreground",
    titleClass: "text-gold",
    subtitleClass: "text-primary-foreground/80",
    ctaClass: "bg-gold text-maroon",
  },
  {
    themeClass: "bg-gradient-to-br from-gold/20 to-background text-foreground",
    titleClass: "text-maroon",
    subtitleClass: "text-muted-foreground",
    ctaClass: "bg-primary text-primary-foreground",
  },
];

interface HeroPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slides: HeroSlide[];
}

export function HeroPreviewDialog({ open, onOpenChange, slides }: HeroPreviewDialogProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const goToPrev = () => {
    setCurrentSlide((prev) => (prev === 0 ? slides.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
  };

  if (slides.length === 0) return null;

  const slide = slides[currentSlide];
  const theme = SLIDE_THEMES[currentSlide % SLIDE_THEMES.length];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle>Hero Slider Preview</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          {/* Preview Container */}
          <div className={cn("relative h-[300px] md:h-[400px]", theme.themeClass)}>
            <div className="container grid h-full grid-cols-1 items-center gap-4 py-6 md:grid-cols-2 md:gap-8 md:py-10">
              {/* Text Content */}
              <div className="order-2 md:order-1 text-center md:text-left px-4">
                <h1
                  className={cn(
                    "text-balance text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl",
                    theme.titleClass,
                  )}
                >
                  {slide.title || "Slide Title"}
                </h1>
                <p
                  className={cn(
                    "mt-2 text-pretty text-xs sm:text-sm md:text-base",
                    theme.subtitleClass,
                  )}
                >
                  {slide.subtitle || "Slide subtitle goes here"}
                </p>
                <div className="mt-4">
                  <span
                    className={cn(
                      "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold",
                      theme.ctaClass,
                    )}
                  >
                    {slide.buttonText || "Shop Now"}
                  </span>
                </div>
              </div>

              {/* Image */}
              <div className="order-1 md:order-2 flex justify-center">
                <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-background/5 shadow-lg">
                  {slide.image ? (
                    <img
                      src={slide.image}
                      alt={slide.title}
                      className="h-[140px] w-auto object-contain p-3 sm:h-[180px] md:h-[280px] md:p-6"
                    />
                  ) : (
                    <div className="flex h-[140px] w-[200px] items-center justify-center bg-muted/20 sm:h-[180px] sm:w-[260px] md:h-[280px] md:w-[400px]">
                      <span className="text-muted-foreground text-sm">No image</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <button
            onClick={goToPrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow hover:bg-background"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-foreground shadow hover:bg-background"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                className={cn(
                  "h-2 w-2 rounded-full transition-all",
                  i === currentSlide ? "bg-gold w-4" : "bg-background/50 hover:bg-background/70",
                )}
              />
            ))}
          </div>
        </div>

        <div className="p-4 pt-2 text-center text-sm text-muted-foreground">
          Slide {currentSlide + 1} of {slides.length} — Click arrows or dots to navigate
        </div>
      </DialogContent>
    </Dialog>
  );
}
