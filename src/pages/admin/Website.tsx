import { useState, useEffect, useCallback } from "react";
import {
  Image,
  MessageSquare,
  Tag,
  Save,
  Plus,
  Trash2,
  Loader2,
  Copy,
  Check,
  FolderOpen,
  ChevronDown,
  Truck,
  Gift,
  Award,
  Box,
  Shield,
  RefreshCw,
  Star,
  Heart,
  Zap,
  Clock,
  ThumbsUp,
  BadgeCheck,
  Layers,
  Eye,
  Sparkles,
  Package,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useStoreSettings, type TrustBadge, type HeroSlide, type SignatureSection, type OfferBanner } from "@/hooks/useStoreSettings";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HeroSliderManager } from "@/components/admin/HeroSliderManager";
import { HeroPreviewDialog } from "@/components/admin/HeroPreviewDialog";
import { SignatureSectionManager } from "@/components/admin/SignatureSectionManager";
import { OfferBannerManager } from "@/components/admin/OfferBannerManager";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AnalyticsTrackingTab } from "@/components/admin/AnalyticsTrackingTab";
import { InvoiceTermsManager } from "@/components/admin/InvoiceTermsManager";

// Available icons for trust badges
const ICON_OPTIONS = [
  { value: "Award", label: "Award", Icon: Award },
  { value: "Box", label: "Box", Icon: Box },
  { value: "Shield", label: "Shield", Icon: Shield },
  { value: "RefreshCw", label: "Refresh", Icon: RefreshCw },
  { value: "Star", label: "Star", Icon: Star },
  { value: "Heart", label: "Heart", Icon: Heart },
  { value: "Zap", label: "Zap", Icon: Zap },
  { value: "Clock", label: "Clock", Icon: Clock },
  { value: "ThumbsUp", label: "Thumbs Up", Icon: ThumbsUp },
  { value: "BadgeCheck", label: "Badge Check", Icon: BadgeCheck },
  { value: "Gift", label: "Gift", Icon: Gift },
  { value: "Truck", label: "Truck", Icon: Truck },
] as const;

interface SiteSettings {
  announcement_bar: {
    text: string;
    code: string;
    is_active: boolean;
  };
  contact_info: {
    phone: string;
    email: string;
    address: string;
  };
  footer_text: {
    copyright: string;
    about: string;
  };
  hero_slides: Array<{
    id: string;
    image_url: string;
    title: string;
    link: string;
  }>;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at?: string;
}

// Helper function to get icon component
function getIconComponent(iconName: string) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Award,
    Box,
    Shield,
    RefreshCw,
    Star,
    Heart,
    Zap,
    Clock,
    ThumbsUp,
    BadgeCheck,
    Gift,
    Truck,
  };
  return iconMap[iconName] || Award;
}

export default function AdminWebsite() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("announcement");
  const [settings, setSettings] = useState<SiteSettings>({
    announcement_bar: { text: "", code: "", is_active: true },
    contact_info: { phone: "", email: "", address: "" },
    footer_text: { copyright: "", about: "" },
    hero_slides: [],
  });
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage",
    discount_value: 0,
    min_order_amount: 0,
    max_uses: null as number | null,
    expires_at: null as string | null,
  });

  // Checkout settings (store_settings table)
  const {
    settings: storeSettings,
    isLoading: isLoadingStoreSettings,
    isSaving: isSavingStoreSettings,
    updateSettings: updateStoreSettings,
  } = useStoreSettings();

  // Local state for checkout settings form
  const [checkoutForm, setCheckoutForm] = useState({
    delivery_inside_dhaka: 60,
    delivery_outside_dhaka: 100,
    is_free_shipping_active: false,
    trust_badges: [] as TrustBadge[],
  });

  // Local state for hero slides
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [isSavingHero, setIsSavingHero] = useState(false);
  const [showHeroPreview, setShowHeroPreview] = useState(false);

  // Local state for signature section
  const [signatureSection, setSignatureSection] = useState<SignatureSection>({
    isEnabled: true,
    image: "",
    badge: "Signature Drop",
    title: "",
    desc: "",
    price: "",
    features: [],
    link: "#",
  });
  const [isSavingSignature, setIsSavingSignature] = useState(false);

  // Local state for offer banner
  const [offerBanner, setOfferBanner] = useState<OfferBanner>({
    isEnabled: true,
    image: "",
    badge: "Seasonal Collection",
    title: "",
    desc: "",
    btnText: "Shop Offers",
    link: "#offers",
  });
  const [isSavingBanner, setIsSavingBanner] = useState(false);

  // Local state for invoice terms
  const [invoiceTerms, setInvoiceTerms] = useState<string[]>([]);
  const [isSavingInvoiceTerms, setIsSavingInvoiceTerms] = useState(false);

  // Track if we've done the initial sync
  const [hasInitializedCheckout, setHasInitializedCheckout] = useState(false);

  // Sync checkout form and hero slides with fetched settings - only on INITIAL load
  useEffect(() => {
    if (storeSettings && !hasInitializedCheckout && !isLoadingStoreSettings) {
      setCheckoutForm({
        delivery_inside_dhaka: storeSettings.delivery_inside_dhaka,
        delivery_outside_dhaka: storeSettings.delivery_outside_dhaka,
        is_free_shipping_active: storeSettings.is_free_shipping_active,
        trust_badges: storeSettings.trust_badges || [],
      });
      setHeroSlides(storeSettings.hero_slides || []);
      if (storeSettings.signature_section) {
        setSignatureSection(storeSettings.signature_section);
      }
      if (storeSettings.offer_banner) {
        setOfferBanner(storeSettings.offer_banner);
      }
      setInvoiceTerms(storeSettings.invoice_terms || []);
      setHasInitializedCheckout(true);
    }
  }, [storeSettings, hasInitializedCheckout, isLoadingStoreSettings]);

  const handleSaveInvoiceTerms = async () => {
    setIsSavingInvoiceTerms(true);
    try {
      await updateStoreSettings({ invoice_terms: invoiceTerms });
    } catch {
      // Error handled in hook
    } finally {
      setIsSavingInvoiceTerms(false);
    }
  };

  const handleSaveHeroSlides = async () => {
    setIsSavingHero(true);
    try {
      await updateStoreSettings({ hero_slides: heroSlides });
    } catch {
      // Error handled in hook
    } finally {
      setIsSavingHero(false);
    }
  };

  const handleSaveSignatureSection = async () => {
    setIsSavingSignature(true);
    try {
      await updateStoreSettings({ signature_section: signatureSection });
    } catch {
      // Error handled in hook
    } finally {
      setIsSavingSignature(false);
    }
  };

  const handleSaveOfferBanner = async () => {
    setIsSavingBanner(true);
    try {
      await updateStoreSettings({ offer_banner: offerBanner });
    } catch {
      // Error handled in hook
    } finally {
      setIsSavingBanner(false);
    }
  };

  // Media Library state
  interface CloudinaryResource {
    public_id: string;
    url: string;
    format: string;
    width: number;
    height: number;
    bytes: number;
    created_at: string;
    folder: string;
  }
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaResources, setMediaResources] = useState<CloudinaryResource[]>([]);
  const [mediaFolder, setMediaFolder] = useState("");
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [mediaNextCursor, setMediaNextCursor] = useState<string | null>(null);
  
  // Bulk selection state
  const [selectedPublicIds, setSelectedPublicIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadMedia = async (opts: { reset: boolean }) => {
    setMediaLoading(true);
    if (opts.reset) {
      setSelectedPublicIds(new Set()); // Clear selection on reload
    }
    try {
      const { data, error } = await supabase.functions.invoke("get-cloudinary-media", {
        body: {
          folder: mediaFolder,
          max_results: 100,
          next_cursor: opts.reset ? undefined : mediaNextCursor,
        },
      });

      if (error) throw error;

      const resources = (data?.resources || []) as CloudinaryResource[];
      setMediaResources((prev) => (opts.reset ? resources : [...prev, ...resources]));
      setMediaNextCursor(data?.next_cursor || null);

      if (opts.reset && !resources.length) {
        toast({
          title: "No images found",
          description: mediaFolder ? `No images in folder "${mediaFolder}"` : "No images in your Cloudinary account",
        });
      }
    } catch (e: any) {
      toast({
        title: "Failed to load media",
        description: e?.message || "Unable to fetch from Cloudinary",
        variant: "destructive",
      });
    } finally {
      setMediaLoading(false);
    }
  };

  const toggleSelection = useCallback((publicId: string) => {
    setSelectedPublicIds((prev) => {
      const next = new Set(prev);
      if (next.has(publicId)) {
        next.delete(publicId);
      } else {
        next.add(publicId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPublicIds(new Set(mediaResources.map((r) => r.public_id)));
  }, [mediaResources]);

  const clearSelection = useCallback(() => {
    setSelectedPublicIds(new Set());
  }, []);

  const handleDeleteSelected = async () => {
    if (selectedPublicIds.size === 0) return;
    
    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-cloudinary-media", {
        body: { public_ids: Array.from(selectedPublicIds) },
      });

      if (error) throw error;

      toast({
        title: "Images Deleted",
        description: `Successfully deleted ${selectedPublicIds.size} image(s)`,
      });

      // Clear selection and refresh
      setSelectedPublicIds(new Set());
      setShowDeleteConfirm(false);
      
      // Refresh media list
      setMediaResources([]);
      setMediaNextCursor(null);
      await loadMedia({ reset: true });
    } catch (e: any) {
      toast({
        title: "Delete failed",
        description: e?.message || "Unable to delete images from Cloudinary",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchCoupons();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*");

      if (error) throw error;

      const settingsMap: Record<string, any> = {};
      data?.forEach((item) => {
        settingsMap[item.setting_key] = item.setting_value;
      });

      // Use DB values if they exist, otherwise use defaults
      setSettings((prev) => ({
        announcement_bar: settingsMap.announcement_bar ?? { text: "", code: "", is_active: true },
        contact_info: settingsMap.contact_info ?? prev.contact_info,
        footer_text: settingsMap.footer_text ?? prev.footer_text,
        hero_slides: settingsMap.hero_slides ?? prev.hero_slides,
      }));
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setCoupons((data as Coupon[]) || []);
    } catch (error) {
      console.error("Error fetching coupons:", error);
    }
  };

  const handleSaveSetting = async (key: string, value: any) => {
    setIsSaving(true);
    try {
      // Use update if exists, insert if not
      const { data: existing } = await supabase
        .from("site_settings")
        .select("id")
        .eq("setting_key", key)
        .maybeSingle();

      let error;
      if (existing?.id) {
        // Update existing row
        const result = await supabase
          .from("site_settings")
          .update({ setting_value: value, updated_at: new Date().toISOString() })
          .eq("setting_key", key);
        error = result.error;
      } else {
        // Insert new row
        const result = await supabase
          .from("site_settings")
          .insert({ setting_key: key, setting_value: value });
        error = result.error;
      }

      if (error) throw error;

      toast({
        title: "Settings Saved",
        description: `${key.replace("_", " ")} has been updated`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddCoupon = async () => {
    if (!newCoupon.code || newCoupon.discount_value <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase.from("coupons").insert({
        code: newCoupon.code.toUpperCase(),
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_order_amount: newCoupon.min_order_amount,
        max_uses: newCoupon.max_uses,
        expires_at: newCoupon.expires_at,
        is_active: true,
      });

      if (error) throw error;

      toast({
        title: "Coupon Created",
        description: `Coupon ${newCoupon.code.toUpperCase()} has been created`,
      });

      setNewCoupon({ 
        code: "", 
        discount_type: "percentage", 
        discount_value: 0, 
        min_order_amount: 0,
        max_uses: null,
        expires_at: null,
      });
      fetchCoupons();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: isActive })
        .eq("id", id);

      if (error) throw error;

      setCoupons((prev) =>
        prev.map((c) => (c.id === id ? { ...c, is_active: isActive } : c))
      );

      toast({
        title: isActive ? "Coupon Activated" : "Coupon Deactivated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", id);

      if (error) throw error;

      setCoupons((prev) => prev.filter((c) => c.id !== id));

      toast({
        title: "Coupon Deleted",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Website Management</h1>
          <p className="text-muted-foreground">
            Manage site settings, banners, and coupons
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Mobile Dropdown Navigation */}
          <div className="mb-6 md:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="announcement">Announcement</SelectItem>
                <SelectItem value="checkout">Checkout Settings</SelectItem>
                <SelectItem value="invoice">Invoice Terms</SelectItem>
                <SelectItem value="coupons">Coupons</SelectItem>
                <SelectItem value="analytics">Analytics & Tracking</SelectItem>
                <SelectItem value="media">Media Library</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Desktop Tabs */}
          <TabsList className="mb-6 hidden h-auto w-full flex-row justify-start gap-1 bg-muted/50 p-1 md:flex md:flex-wrap">
            <TabsTrigger value="announcement" className="whitespace-nowrap px-4 text-sm">Announcement</TabsTrigger>
            <TabsTrigger value="hero" className="whitespace-nowrap px-4 text-sm">Hero Slider</TabsTrigger>
            <TabsTrigger value="signature" className="whitespace-nowrap px-4 text-sm">Signature</TabsTrigger>
            <TabsTrigger value="banner" className="whitespace-nowrap px-4 text-sm">Offer Banner</TabsTrigger>
            <TabsTrigger value="checkout" className="whitespace-nowrap px-4 text-sm">Checkout</TabsTrigger>
            <TabsTrigger value="invoice" className="whitespace-nowrap px-4 text-sm">Invoice</TabsTrigger>
            <TabsTrigger value="coupons" className="whitespace-nowrap px-4 text-sm">Coupons</TabsTrigger>
            <TabsTrigger value="analytics" className="whitespace-nowrap px-4 text-sm">Analytics</TabsTrigger>
            <TabsTrigger value="media" className="whitespace-nowrap px-4 text-sm">Media</TabsTrigger>
          </TabsList>

          {/* Announcement Bar */}
          <TabsContent value="announcement" className="mt-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  Announcement Bar
                </CardTitle>
                <CardDescription>
                  Configure the promotional banner at the top of the site
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="announcement-active"
                    checked={settings.announcement_bar.is_active}
                    onCheckedChange={(checked) =>
                      setSettings({
                        ...settings,
                        announcement_bar: { ...settings.announcement_bar, is_active: checked },
                      })
                    }
                  />
                  <Label htmlFor="announcement-active">Show Announcement Bar</Label>
                </div>

                <div className="space-y-2">
                  <Label>Announcement Text</Label>
                  <Input
                    placeholder="Get 5% Flat Discount on all products!"
                    value={settings.announcement_bar.text}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        announcement_bar: { ...settings.announcement_bar, text: e.target.value },
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Coupon Code (if any)</Label>
                  <Input
                    placeholder="FLAT5"
                    value={settings.announcement_bar.code}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        announcement_bar: { ...settings.announcement_bar, code: e.target.value },
                      })
                    }
                  />
                </div>

                <Button
                  onClick={() => handleSaveSetting("announcement_bar", settings.announcement_bar)}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hero Slider */}
          <TabsContent value="hero" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5 text-primary" />
                  Homepage Hero Slider
                </CardTitle>
                <CardDescription>
                  Manage the banner carousel on your homepage. Upload images via Cloudinary and customize text overlays.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <HeroSliderManager
                  slides={heroSlides}
                  onChange={setHeroSlides}
                />
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button
                onClick={handleSaveHeroSlides}
                disabled={isSavingHero}
                size="lg"
              >
                {isSavingHero ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Hero Slides
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() => setShowHeroPreview(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Slides
              </Button>
            </div>

            <HeroPreviewDialog
              open={showHeroPreview}
              onOpenChange={setShowHeroPreview}
              slides={heroSlides}
            />
          </TabsContent>

          {/* Signature Product Section */}
          <TabsContent value="signature" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Signature Product Section
                </CardTitle>
                <CardDescription>
                  Configure the featured product highlight that appears on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SignatureSectionManager
                  data={signatureSection}
                  onChange={setSignatureSection}
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveSignatureSection}
              disabled={isSavingSignature}
              size="lg"
            >
              {isSavingSignature ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Signature Section
            </Button>
          </TabsContent>

          {/* Offer Banner Section */}
          <TabsContent value="banner" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Promotional Offer Banner
                </CardTitle>
                <CardDescription>
                  Configure the seasonal offer banner that appears on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OfferBannerManager
                  data={offerBanner}
                  onChange={setOfferBanner}
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveOfferBanner}
              disabled={isSavingBanner}
              size="lg"
            >
              {isSavingBanner ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Offer Banner
            </Button>
          </TabsContent>

          {/* Checkout Settings */}
          <TabsContent value="checkout" className="mt-6 space-y-6">
            {/* Delivery Fees */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Delivery Fees
                </CardTitle>
                <CardDescription>
                  Configure shipping costs for different locations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="delivery_inside">Inside Dhaka (BDT)</Label>
                    <Input
                      id="delivery_inside"
                      type="number"
                      value={checkoutForm.delivery_inside_dhaka}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          delivery_inside_dhaka: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="delivery_outside">Outside Dhaka (BDT)</Label>
                    <Input
                      id="delivery_outside"
                      type="number"
                      value={checkoutForm.delivery_outside_dhaka}
                      onChange={(e) =>
                        setCheckoutForm({
                          ...checkoutForm,
                          delivery_outside_dhaka: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-3">
                    <Gift className="h-5 w-5 text-green-600" />
                    <div>
                      <Label htmlFor="free-shipping" className="text-green-800 font-medium">
                        Free Shipping Mode
                      </Label>
                      <p className="text-sm text-green-600">
                        Enable to offer free delivery on all orders
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="free-shipping"
                    checked={checkoutForm.is_free_shipping_active}
                    onCheckedChange={(checked) =>
                      setCheckoutForm({
                        ...checkoutForm,
                        is_free_shipping_active: checked,
                      })
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Trust Badges */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Trust Badges
                </CardTitle>
                <CardDescription>
                  Customize the "Why Choose Us" section on checkout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {checkoutForm.trust_badges.map((badge, index) => {
                  const IconComponent = getIconComponent(badge.icon);
                  return (
                    <div key={index} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <IconComponent className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 grid gap-2 sm:grid-cols-3">
                        <Input
                          placeholder="Bengali Title"
                          value={badge.title}
                          onChange={(e) => {
                            const updated = [...checkoutForm.trust_badges];
                            updated[index] = { ...badge, title: e.target.value };
                            setCheckoutForm({ ...checkoutForm, trust_badges: updated });
                          }}
                        />
                        <Input
                          placeholder="English Subtitle"
                          value={badge.subtitle || ""}
                          onChange={(e) => {
                            const updated = [...checkoutForm.trust_badges];
                            updated[index] = { ...badge, subtitle: e.target.value };
                            setCheckoutForm({ ...checkoutForm, trust_badges: updated });
                          }}
                        />
                        <Select
                          value={badge.icon}
                          onValueChange={(value) => {
                            const updated = [...checkoutForm.trust_badges];
                            updated[index] = { ...badge, icon: value };
                            setCheckoutForm({ ...checkoutForm, trust_badges: updated });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Icon" />
                          </SelectTrigger>
                          <SelectContent>
                            {ICON_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                <div className="flex items-center gap-2">
                                  <opt.Icon className="h-4 w-4" />
                                  {opt.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          const updated = checkoutForm.trust_badges.filter((_, i) => i !== index);
                          setCheckoutForm({ ...checkoutForm, trust_badges: updated });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setCheckoutForm({
                      ...checkoutForm,
                      trust_badges: [
                        ...checkoutForm.trust_badges,
                        { title: "", subtitle: "", icon: "Award" },
                      ],
                    });
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Badge
                </Button>
              </CardContent>
            </Card>

            {/* Save Button */}
            <Button
              onClick={async () => {
                try {
                  await updateStoreSettings(checkoutForm);
                } catch {
                  // Error handled in hook
                }
              }}
              disabled={isSavingStoreSettings}
              size="lg"
            >
              {isSavingStoreSettings ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Checkout Settings
            </Button>
          </TabsContent>

          {/* Invoice Terms */}
          <TabsContent value="invoice" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Invoice Terms & Conditions
                </CardTitle>
                <CardDescription>
                  Customize the terms and conditions that appear at the bottom of customer invoices/receipts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <InvoiceTermsManager
                  terms={invoiceTerms}
                  onChange={setInvoiceTerms}
                />
              </CardContent>
            </Card>

            <Button
              onClick={handleSaveInvoiceTerms}
              disabled={isSavingInvoiceTerms}
              size="lg"
            >
              {isSavingInvoiceTerms ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Invoice Terms
            </Button>
          </TabsContent>


          {/* Coupons */}
          <TabsContent value="coupons" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-primary" />
                  Create Coupon
                </CardTitle>
                <CardDescription>
                  Create discount coupons with optional conditions like minimum order amount, usage limits, and expiry dates.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Code, Type, Value */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Code *</Label>
                    <Input
                      placeholder="SALE20"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type *</Label>
                    <Select
                      value={newCoupon.discount_type}
                      onValueChange={(value) => setNewCoupon({ ...newCoupon, discount_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage (%)</SelectItem>
                        <SelectItem value="fixed">Fixed Amount (৳)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Value * {newCoupon.discount_type === "percentage" ? "(%)" : "(৳)"}
                    </Label>
                    <Input
                      type="number"
                      placeholder={newCoupon.discount_type === "percentage" ? "20" : "100"}
                      value={newCoupon.discount_value || ""}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: Number(e.target.value) })}
                    />
                  </div>
                </div>

                {/* Row 2: Minimum Order, Max Uses, Expiry */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Minimum Order (৳)</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 2599"
                      value={newCoupon.min_order_amount || ""}
                      onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: Number(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no minimum
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Usage Limit</Label>
                    <Input
                      type="number"
                      placeholder="e.g., 100"
                      value={newCoupon.max_uses || ""}
                      onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: e.target.value ? Number(e.target.value) : null })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for unlimited
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={newCoupon.expires_at ? newCoupon.expires_at.split("T")[0] : ""}
                      onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value ? `${e.target.value}T23:59:59` : null })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty for no expiry
                    </p>
                  </div>
                </div>

                {/* Conditional Coupon Preview */}
                {(newCoupon.min_order_amount > 0 || newCoupon.max_uses || newCoupon.expires_at) && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-sm font-medium text-primary">Coupon Condition Preview:</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {newCoupon.min_order_amount > 0 && (
                        <>Buy ৳{newCoupon.min_order_amount}+ to get {newCoupon.discount_type === "percentage" ? `${newCoupon.discount_value}% off` : `৳${newCoupon.discount_value} off`}. </>
                      )}
                      {newCoupon.max_uses && <>Limited to {newCoupon.max_uses} uses. </>}
                      {newCoupon.expires_at && <>Expires: {new Date(newCoupon.expires_at).toLocaleDateString()}.</>}
                    </p>
                  </div>
                )}

                <Button onClick={handleAddCoupon} className="w-full sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Coupon
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>All Coupons</CardTitle>
                <CardDescription>
                  Manage your discount coupons. Toggle to activate/deactivate.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Discount</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Uses</TableHead>
                      <TableHead>Expiry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {coupons.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No coupons created yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      coupons.map((coupon) => {
                        const isExpired = coupon.expires_at && new Date(coupon.expires_at) < new Date();
                        const isMaxedOut = coupon.max_uses && coupon.current_uses >= coupon.max_uses;
                        return (
                          <TableRow key={coupon.id} className={isExpired || isMaxedOut ? "opacity-60" : ""}>
                            <TableCell className="font-mono font-bold">{coupon.code}</TableCell>
                            <TableCell>
                              <Badge variant={coupon.discount_type === "percentage" ? "default" : "secondary"}>
                                {coupon.discount_type === "percentage"
                                  ? `${coupon.discount_value}%`
                                  : `৳${coupon.discount_value}`}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {coupon.min_order_amount > 0 ? (
                                <span className="text-xs text-muted-foreground">
                                  Min: ৳{coupon.min_order_amount}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">No minimum</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className={isMaxedOut ? "text-destructive font-medium" : ""}>
                                {coupon.current_uses}{coupon.max_uses ? `/${coupon.max_uses}` : ""}
                              </span>
                            </TableCell>
                            <TableCell>
                              {coupon.expires_at ? (
                                <span className={isExpired ? "text-destructive font-medium" : "text-xs"}>
                                  {new Date(coupon.expires_at).toLocaleDateString()}
                                  {isExpired && " (Expired)"}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">Never</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={coupon.is_active}
                                onCheckedChange={(checked) => handleToggleCoupon(coupon.id, checked)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteCoupon(coupon.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics & Tracking */}
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTrackingTab />
          </TabsContent>

          {/* Media Library */}
          <TabsContent value="media" className="mt-6 space-y-6">
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Image className="h-5 w-5 text-primary" />
                      Cloudinary Media Library
                    </CardTitle>
                    <CardDescription>
                      Browse images from your Cloudinary account. Click to copy URL, or select to bulk delete.
                    </CardDescription>
                  </div>
                  {selectedPublicIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">
                        {selectedPublicIds.size} selected
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearSelection}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        Delete Selected ({selectedPublicIds.size})
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <Label>Folder (optional)</Label>
                    <Input
                      placeholder="e.g. products or brands"
                      value={mediaFolder}
                      onChange={(e) => setMediaFolder(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button
                      onClick={() => {
                        setMediaResources([]);
                        setMediaNextCursor(null);
                        loadMedia({ reset: true });
                      }}
                      disabled={mediaLoading}
                    >
                      {mediaLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderOpen className="mr-2 h-4 w-4" />}
                      Load Images
                    </Button>
                    {mediaResources.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={selectedPublicIds.size === mediaResources.length ? clearSelection : selectAll}
                      >
                        {selectedPublicIds.size === mediaResources.length ? (
                          <>
                            <Square className="mr-2 h-4 w-4" />
                            Deselect All
                          </>
                        ) : (
                          <>
                            <CheckSquare className="mr-2 h-4 w-4" />
                            Select All
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {mediaResources.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {mediaResources.map((resource) => {
                      const isSelected = selectedPublicIds.has(resource.public_id);
                      return (
                        <div
                          key={resource.public_id}
                          className={`group relative aspect-square overflow-hidden rounded-lg border-2 bg-muted transition-all hover:shadow-md ${
                            isSelected 
                              ? "border-destructive ring-2 ring-destructive/30" 
                              : "border-border/50 hover:border-primary"
                          }`}
                        >
                          <img
                            src={resource.url.replace("/upload/", "/upload/w_300,h_300,c_fill,f_auto,q_auto/")}
                            alt={resource.public_id}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          
                          {/* Checkbox overlay - visible on hover or when selected */}
                          <div
                            className={`absolute left-2 top-2 z-10 transition-opacity ${
                              isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(resource.public_id)}
                              className="h-5 w-5 border-2 border-white bg-white/80 shadow-md data-[state=checked]:bg-destructive data-[state=checked]:border-destructive"
                            />
                          </div>

                          {/* Copy overlay - center */}
                          <button
                            type="button"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                await navigator.clipboard.writeText(resource.url);
                                setCopiedUrl(resource.public_id);
                                toast({ title: "URL Copied!", description: "Image URL copied to clipboard" });
                                setTimeout(() => setCopiedUrl(null), 2000);
                              } catch {
                                toast({ title: "Copy failed", variant: "destructive" });
                              }
                            }}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 focus:outline-none"
                          >
                            {copiedUrl === resource.public_id ? (
                              <Check className="h-6 w-6 text-green-400" />
                            ) : (
                              <Copy className="h-6 w-6 text-white" />
                            )}
                          </button>

                          {/* Selected overlay */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-destructive/20 pointer-events-none" />
                          )}

                          {/* File info */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 pointer-events-none">
                            <p className="truncate text-xs text-white">{resource.public_id.split("/").pop()}</p>
                            <p className="text-xs text-white/70">{Math.round(resource.bytes / 1024)} KB</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {!!mediaNextCursor && mediaResources.length > 0 && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => loadMedia({ reset: false })}
                      disabled={mediaLoading}
                    >
                      {mediaLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ChevronDown className="mr-2 h-4 w-4" />
                      )}
                      Load more
                    </Button>
                  </div>
                )}

                {!mediaLoading && mediaResources.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Image className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Click "Load Images" to browse your Cloudinary media</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedPublicIds.size} image(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected images will be permanently deleted from your Cloudinary account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
