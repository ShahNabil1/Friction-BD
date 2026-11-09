import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface TrustBadge {
  title: string;
  subtitle?: string;
  icon: string;
}

export interface HeroSlide {
  id: string;
  image: string;
  // Legacy fields - kept for backward compatibility
  title?: string;
  subtitle?: string;
  buttonText?: string;
  link?: string;
}

export interface SignatureSection {
  isEnabled: boolean;
  image: string;
  badge: string;
  title: string;
  desc: string;
  price: string;
  features: string[];
  link: string;
}

export interface OfferBanner {
  isEnabled: boolean;
  image: string;
  badge: string;
  title: string;
  desc: string;
  btnText: string;
  link: string;
}

export interface StoreSettings {
  id: string;
  delivery_inside_dhaka: number;
  delivery_outside_dhaka: number;
  is_free_shipping_active: boolean;
  trust_badges: TrustBadge[];
  hero_slides: HeroSlide[];
  signature_section: SignatureSection;
  offer_banner: OfferBanner;
  meta_pixel_id: string | null;
  google_analytics_id: string | null;
  invoice_terms: string[];
}

const DEFAULT_HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    image: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=1200&q=80",
    title: "Step into Comfort",
    subtitle: "Discover premium footwear for every occasion.",
    buttonText: "Shop Now",
    link: "/category/sneakers",
  },
  {
    id: "2",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80",
    title: "Walk in Style",
    subtitle: "Fresh drops every week. Your next favorite pair awaits.",
    buttonText: "Explore",
    link: "/category/mens",
  },
];

const DEFAULT_SIGNATURE_SECTION: SignatureSection = {
  isEnabled: true,
  image: "https://images.unsplash.com/photo-1460353581641-37baddab0fa2?w=800&q=80",
  badge: "Signature Drop",
  title: "The Classic Signature Loafer",
  desc: "Timeless elegance meets everyday comfort. Handcrafted from premium leather for the modern gentleman.",
  price: "2,500",
  features: ["Genuine leather upper", "Memory foam insole", "Anti-slip rubber sole", "Lightweight & breathable"],
  link: "/product/classic-signature-loafer",
};

const DEFAULT_OFFER_BANNER: OfferBanner = {
  isEnabled: true,
  image: "https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=1200&q=80",
  badge: "Winter Sale",
  title: "Step Up Your Game — Up to 40% Off Sneakers",
  desc: "Limited-time deals on premium footwear. Free shipping on orders over ৳3,000!",
  btnText: "Shop the Sale",
  link: "/category/sneakers",
};

const DEFAULT_INVOICE_TERMS: string[] = [
  "Returns are accepted within 3 days of delivery for unused items in original packaging.",
  "Exchange requests must be initiated within 3 days of receiving the product.",
  "Refunds will be processed within 7-10 business days after receiving the returned item.",
  "Delivery charges are non-refundable unless the return is due to a defective product.",
  "For any queries, contact us at 01929-110024.",
];

const DEFAULT_SETTINGS: Omit<StoreSettings, "id"> = {
  delivery_inside_dhaka: 60,
  delivery_outside_dhaka: 100,
  is_free_shipping_active: false,
  trust_badges: [
    { title: "১ বছরের ওয়ারেন্টি", subtitle: "1 Year Warranty", icon: "Award" },
    { title: "ব্যাগ এন্ড বক্স ফ্রি", subtitle: "Free Bag & Box", icon: "Box" },
    { title: "১০০% অরিজিনাল", subtitle: "100% Original", icon: "Shield" },
    { title: "৭ দিনের রিপ্লেসমেন্ট", subtitle: "7 Days Replacement", icon: "RefreshCw" },
  ],
  hero_slides: DEFAULT_HERO_SLIDES,
  signature_section: DEFAULT_SIGNATURE_SECTION,
  offer_banner: DEFAULT_OFFER_BANNER,
  meta_pixel_id: null,
  google_analytics_id: null,
  invoice_terms: DEFAULT_INVOICE_TERMS,
};

// Helper function to map DB row to StoreSettings (defined outside hook to avoid re-creation)
function mapRowToSettings(row: any): StoreSettings {
  return {
    id: row.id,
    delivery_inside_dhaka: row.delivery_inside_dhaka ?? DEFAULT_SETTINGS.delivery_inside_dhaka,
    delivery_outside_dhaka: row.delivery_outside_dhaka ?? DEFAULT_SETTINGS.delivery_outside_dhaka,
    is_free_shipping_active: row.is_free_shipping_active ?? DEFAULT_SETTINGS.is_free_shipping_active,
    trust_badges:
      (row.trust_badges as unknown as TrustBadge[]) ?? DEFAULT_SETTINGS.trust_badges,
    hero_slides: (row.hero_slides as unknown as HeroSlide[]) ?? DEFAULT_SETTINGS.hero_slides,
    signature_section:
      (row.signature_section as unknown as SignatureSection) ??
      DEFAULT_SETTINGS.signature_section,
    offer_banner:
      (row.offer_banner as unknown as OfferBanner) ?? DEFAULT_SETTINGS.offer_banner,
    meta_pixel_id: row.meta_pixel_id ?? null,
    google_analytics_id: row.google_analytics_id ?? null,
    invoice_terms: (row.invoice_terms as unknown as string[]) ?? DEFAULT_SETTINGS.invoice_terms,
  };
}

export function useStoreSettings() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const channelIdRef = useRef(crypto.randomUUID());

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("*")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings(mapRowToSettings(data));
      } else {
        // No settings exist - will use defaults
        setSettings(null);
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
    
    // Use a unique channel name to avoid conflicts with React Strict Mode double-mounting
    const channelName = `store_settings_${channelIdRef.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'store_settings' },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchSettings]);

  const updateSettings = useCallback(async (updates: Partial<Omit<StoreSettings, "id">>) => {
    setIsSaving(true);
    try {
      // Cast updates for Supabase compatibility
      const dbUpdates: Record<string, unknown> = { ...updates };
      if (updates.trust_badges) {
        dbUpdates.trust_badges = JSON.parse(JSON.stringify(updates.trust_badges));
      }
      if (updates.hero_slides) {
        dbUpdates.hero_slides = JSON.parse(JSON.stringify(updates.hero_slides));
      }
      if (updates.signature_section) {
        dbUpdates.signature_section = JSON.parse(JSON.stringify(updates.signature_section));
      }
      if (updates.offer_banner) {
        dbUpdates.offer_banner = JSON.parse(JSON.stringify(updates.offer_banner));
      }
      if (updates.invoice_terms) {
        dbUpdates.invoice_terms = JSON.parse(JSON.stringify(updates.invoice_terms));
      }

      if (settings?.id) {
        // Update existing (and verify at least one row was updated)
        const { data, error } = await supabase
          .from("store_settings")
          .update(dbUpdates)
          .eq("id", settings.id)
          .select("*")
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          throw new Error(
            "Store settings update did not affect any rows (unexpected)."
          );
        }

        setSettings(mapRowToSettings(data));
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("store_settings")
          .insert([dbUpdates])
          .select()
          .single();

        if (error) throw error;
        
        if (data) {
          setSettings(mapRowToSettings(data));
          return;
        }
      }

      toast({
        title: "Settings Saved",
        description: "Store settings have been updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [settings, toast]);

  // Return effective settings (with defaults if no settings exist)
  const effectiveSettings: Omit<StoreSettings, "id"> = settings || DEFAULT_SETTINGS;

  return {
    settings: effectiveSettings,
    rawSettings: settings,
    isLoading,
    isSaving,
    updateSettings,
    refetch: fetchSettings,
  };
}
