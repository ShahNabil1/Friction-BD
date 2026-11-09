import { CartFab } from "@/components/cart/CartFab";
import { AnnouncementBar } from "@/components/landing/AnnouncementBar";
import { DealsAndProducts } from "@/components/landing/DealsAndProducts";
import { FeaturedBrands } from "@/components/landing/FeaturedBrands";
import { FeaturedReviewsSection } from "@/components/landing/FeaturedReviewsSection";
import { FeatureHighlight } from "@/components/landing/FeatureHighlight";
import { FeaturedCategories } from "@/components/landing/FeaturedCategories";
import { Footer } from "@/components/landing/Footer";
import { HeaderNav } from "@/components/landing/HeaderNav";
import { HeroSection } from "@/components/landing/HeroSection";
import { MobileBottomNav } from "@/components/landing/MobileBottomNav";
import { PromotionalBanner } from "@/components/landing/PromotionalBanner";
import { Reveal } from "@/components/motion/Reveal";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { brandSlugToName, isBrandSlug, brandNameToSlug } from "@/lib/brands";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);

  useEffect(() => {
    const brand = searchParams.get("brand");
    if (!brand) {
      setSelectedBrand(null);
      return;
    }
    if (isBrandSlug(brand)) {
      setSelectedBrand(brandSlugToName[brand]);
    }
  }, [searchParams]);

  const handleSelectBrand = useCallback(
    (brand: string) => {
      setSelectedBrand(brand);
      const slug = brandNameToSlug(brand);
      if (slug) setSearchParams({ brand: slug });
      window.location.hash = "#deals";
    },
    [setSearchParams],
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AnnouncementBar />
      <HeaderNav />

      <main>
        <HeroSection />

        <Reveal>
          <FeaturedCategories />
        </Reveal>

        <Reveal>
          <DealsAndProducts
            selectedBrand={selectedBrand}
            onClearBrand={() => {
              setSelectedBrand(null);
              setSearchParams({});
            }}
          />
        </Reveal>

        <Reveal>
          <PromotionalBanner />
        </Reveal>

        <Reveal>
          <FeatureHighlight />
        </Reveal>

        <Reveal>
          <FeaturedReviewsSection />
        </Reveal>

        <Reveal>
          <FeaturedBrands selectedBrand={selectedBrand} onSelectBrand={handleSelectBrand} />
        </Reveal>
      </main>

      <Footer />
      <CartFab />
      <MobileBottomNav />
      {/* Add bottom padding on mobile to account for nav bar */}
      <div className="h-16 md:hidden" />
    </div>
  );
};

export default Index;
