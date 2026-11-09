import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Loader2,
  Save,
  Palette,
  Ruler,
  Upload,
  Eye,
  ShieldCheck,
  ShieldOff,
  BadgeCheck,
  Gift,
  BoxSelect,
  RefreshCcw,
  Truck,
  CheckCircle2,
  Crown,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/admin/TagInput";
import { VariantStockTable, type VariantStock } from "@/components/admin/VariantStockTable";
import { useSyncProductVariants, useProductVariants } from "@/hooks/useProductVariants";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useBrands } from "@/hooks/useBrands";
import { useCategories } from "@/hooks/useCategories";
import {
  useAdminProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  type DbProduct,
  type ProductBenefit,
  type VariantPricing,
  DEFAULT_BENEFITS,
  BENEFIT_OPTIONS,
} from "@/hooks/useProducts";
import { normalizeSlug } from "@/lib/slug";
import { useUserRole } from "@/hooks/useUserRole";
import { SkuImportDialog } from "@/components/admin/SkuImportDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Benefits translation mapping for preview
const BENEFIT_TRANSLATIONS: Record<string, { icon: LucideIcon; bengali: string }> = {
  "1 Year Warranty": { icon: ShieldCheck, bengali: "১ বছরের ওয়ারেন্টি" },
  "No Warranty": { icon: ShieldOff, bengali: "ওয়ারেন্টি নেই" },
  "100% Original": { icon: BadgeCheck, bengali: "১০০% অরিজিনাল" },
  "Free Box & Bag": { icon: Gift, bengali: "সাথে ফ্রি বক্স এবং ব্যাগ" },
  "Open Box Check": { icon: BoxSelect, bengali: "ওপেন বক্স চেক সুবিধা" },
  "5 Days Replacement": { icon: RefreshCcw, bengali: "৫ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  "7 Days Replacement": { icon: RefreshCcw, bengali: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  "Fast Delivery": { icon: Truck, bengali: "সারা দেশে দ্রুত ডেলিভারি" },
};

// Preview component for benefits
function BenefitsPreview({ benefits }: { benefits: ProductBenefit[] }) {
  const validBenefits = benefits.filter((b) => b.title.trim());
  
  if (validBenefits.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-4">
        No benefits configured yet
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-orange-100 bg-orange-50/70 p-4">
      <div className="mb-3 flex items-center justify-center gap-2">
        <Crown className="h-4 w-4 text-amber-500" fill="currentColor" />
        <span className="text-sm font-bold text-foreground">Premium Benefits</span>
        <Crown className="h-4 w-4 text-amber-500" fill="currentColor" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {validBenefits.map((benefit, idx) => {
          const mapping = BENEFIT_TRANSLATIONS[benefit.title];
          const Icon = mapping?.icon || CheckCircle2;
          const displayText = mapping?.bengali || benefit.title;
          
          return (
            <div
              key={idx}
              className="flex items-start gap-2 rounded-lg bg-white/60 px-2 py-2"
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100">
                <Icon className="h-3 w-3 text-rose-600" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium leading-tight text-gray-800">
                  {displayText}
                </span>
                {benefit.desc && (
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    {benefit.desc}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


export default function AdminProducts() {
  const { data: products = [], isLoading } = useAdminProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const syncVariants = useSyncProductVariants();

  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSkuImportOpen, setIsSkuImportOpen] = useState(false);
  const [highlightedProductId, setHighlightedProductId] = useState<string | null>(null);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<DbProduct | null>(null);

  const { data: brands = [] } = useBrands();
  const { categories, mainCategories, getSubcategories } = useCategories();

  const { isSuperAdmin } = useUserRole();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price_cents: 0,
    compare_at_price_cents: null as number | null,
    buying_price: null as number | null,
    images: [] as string[],
    category: "",
    subcategory: "",
    mainCategoryId: "" as string,
    subCategoryId: "" as string,
    slug: "",
    sku: "",
    barcode: "",
    brandMode: "none" as "none" | "brand" | "other",
    brandSelect: "",
    brandOther: "",
    stock: 100,
    status: "active",
    isOnlineActive: true, // Website visibility toggle
    benefits: [...DEFAULT_BENEFITS] as ProductBenefit[],
    customBenefitMode: Array(6).fill(false) as boolean[],
    hasVariations: false,
    colors: [] as string[],
    sizes: [] as string[],
    variantStocks: [] as VariantStock[],
    metaTitle: "",
    metaDescription: "",
  });

  // Generate CODE128 compatible barcode (alphanumeric 8-10 chars)
  const generateBarcode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = 8 + Math.floor(Math.random() * 3); // 8-10 chars
    let barcode = "";
    for (let i = 0; i < length; i++) {
      barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((p) => ({ ...p, barcode }));
  };

  // Get subcategories for selected main category
  const availableSubcategories = useMemo(() => {
    if (!formData.mainCategoryId) return [];
    return getSubcategories(formData.mainCategoryId);
  }, [formData.mainCategoryId, getSubcategories]);

  // If brands finish loading after opening an edit modal, re-map a known brand
  useEffect(() => {
    if (!editingProduct) return;
    if (formData.brandMode !== "other") return;

    const raw = (formData.brandOther || "").trim();
    if (!raw) return;

    const isKnown = brands.some((b) => b.name.toLowerCase() === raw.toLowerCase());
    if (!isKnown) return;

    setFormData((p) => ({ ...p, brandMode: "brand", brandSelect: raw, brandOther: "" }));
  }, [brands, editingProduct, formData.brandMode, formData.brandOther]);

  const handleOpenEdit = async (product: DbProduct) => {
    setEditingProduct(product);

    const dbBrand = (product.brand || "").trim();
    const isKnown = dbBrand && brands.some((b) => b.name.toLowerCase() === dbBrand.toLowerCase());

    // Determine main and sub category from the saved category_id or slugs
    let mainCatId = "";
    let subCatId = "";
    
    // First try to find by matching slug (subcategory or category)
    const matchedCategory = categories.find(
      (c) => c.slug === product.subcategory || c.slug === product.category
    );
    
    if (matchedCategory) {
      if (matchedCategory.parent_id) {
        // It's a subcategory - set both main and sub
        mainCatId = matchedCategory.parent_id;
        subCatId = matchedCategory.id;
      } else {
        // It's a main category
        mainCatId = matchedCategory.id;
        subCatId = "";
      }
    }

    // Parse benefits from product or use defaults
    const productBenefits: ProductBenefit[] = Array.isArray(product.benefits) && product.benefits.length > 0
      ? product.benefits
      : [...DEFAULT_BENEFITS];

    // Determine which benefits are custom (not in predefined options)
    const customModes = productBenefits.map(
      (b) => !BENEFIT_OPTIONS.some((opt) => opt.title === b.title)
    );

    // Parse colors and sizes
    const colors = Array.isArray(product.color_options) 
      ? product.color_options.map(c => typeof c === 'string' ? c : c.name).filter(Boolean)
      : [];
    const sizes = Array.isArray(product.size_options) ? product.size_options : [];
    const hasVariations = colors.length > 0 || sizes.length > 0;

    // Fetch existing variants from product_variants table
    let variantStocks: VariantStock[] = [];
    if (hasVariations) {
      try {
        const { data: existingVariants, error } = await supabase
          .from("product_variants")
          .select("*")
          .eq("product_id", product.id);

        if (error) {
          console.error("Error fetching variants:", error);
        } else if (existingVariants && existingVariants.length > 0) {
          // Map existing variants to VariantStock format - include barcode!
          variantStocks = existingVariants.map((v) => ({
            color: v.color || undefined,
            size: v.size || undefined,
            stock_quantity: v.stock_quantity || 0,
            sku: v.sku || undefined,
            barcode: v.barcode || undefined, // Load barcode from DB
            price_cents: v.price_cents ?? null,
            compare_at_price_cents: v.compare_at_price_cents ?? null,
          }));
        }
      } catch (err) {
        console.error("Failed to fetch variants:", err);
      }
    }

    // If no variants found in DB, generate empty ones from colors/sizes
    if (variantStocks.length === 0 && hasVariations) {
      // Generate all combinations
      if (colors.length > 0 && sizes.length > 0) {
        for (const color of colors) {
          for (const size of sizes) {
            variantStocks.push({
              color,
              size,
              stock_quantity: 0,
              sku: undefined,
              price_cents: null,
              compare_at_price_cents: null,
            });
          }
        }
      } else if (colors.length > 0) {
        for (const color of colors) {
          variantStocks.push({
            color,
            size: undefined,
            stock_quantity: 0,
            sku: undefined,
            price_cents: null,
            compare_at_price_cents: null,
          });
        }
      } else if (sizes.length > 0) {
        for (const size of sizes) {
          variantStocks.push({
            color: undefined,
            size,
            stock_quantity: 0,
            sku: undefined,
            price_cents: null,
            compare_at_price_cents: null,
          });
        }
      }
    }

    // Fetch admin-only buying price for super admins
    let loadedBuyingPrice: number | null = null;
    if (isSuperAdmin) {
      try {
        const { data: costRow } = await supabase
          .from("product_costs")
          .select("buying_price")
          .eq("product_id", product.id)
          .maybeSingle();
        loadedBuyingPrice = costRow?.buying_price ?? null;
      } catch (err) {
        console.error("Failed to fetch product cost:", err);
      }
    }

    setFormData({
      title: product.title,
      description: product.description,
      price_cents: product.price_cents,
      compare_at_price_cents: product.compare_at_price_cents,
      buying_price: loadedBuyingPrice,
      images: product.images,
      category: product.category,
      subcategory: product.subcategory,
      mainCategoryId: mainCatId,
      subCategoryId: subCatId,
      slug: product.slug,
      sku: product.sku || "",
      barcode: (product as any).barcode || "",
      brandMode: dbBrand ? (isKnown ? "brand" : "other") : "none",
      brandSelect: isKnown ? dbBrand : "",
      brandOther: !isKnown ? dbBrand : "",
      stock: product.stock,
      status: product.status,
      isOnlineActive: (product as any).is_online_active ?? true,
      benefits: productBenefits,
      customBenefitMode: customModes.length >= 6 ? customModes : Array(6).fill(false),
      hasVariations,
      colors,
      sizes,
      variantStocks,
      metaTitle: (product as any).meta_title || "",
      metaDescription: (product as any).meta_description || "",
    });

    setIsAddDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      price_cents: 0,
      compare_at_price_cents: null,
      buying_price: null,
      images: [],
      category: "",
      subcategory: "",
      mainCategoryId: "",
      subCategoryId: "",
      slug: "",
      sku: "",
      barcode: "",
      brandMode: "none",
      brandSelect: "",
      brandOther: "",
      stock: 100,
      status: "active",
      isOnlineActive: true,
      benefits: [...DEFAULT_BENEFITS],
      customBenefitMode: Array(6).fill(false),
      hasVariations: false,
      colors: [],
      sizes: [],
      variantStocks: [],
      metaTitle: "",
      metaDescription: "",
    });
    setEditingProduct(null);
  };

  const handleSave = async () => {
    // Validate required fields (slug is now auto-generated)
    if (!formData.title.trim() || formData.price_cents <= 0) {
      return;
    }

    const brand =
      formData.brandMode === "brand"
        ? formData.brandSelect
        : formData.brandMode === "other"
          ? formData.brandOther
          : "";

    // Convert colors to the color_options format (simple name-only for now)
    const colorOptions = formData.hasVariations && formData.colors.length > 0
      ? formData.colors.map((name, index) => ({ name, swatch: "gold" as const, imageIndex: index < formData.images.length ? index : 0 }))
      : [];

    // Clean up variants to VariantPricing format for DB storage
    const cleanedVariants = formData.hasVariations
      ? formData.variantStocks
          .filter((v) => {
            const colorValid = !v.color || formData.colors.includes(v.color);
            const sizeValid = !v.size || formData.sizes.includes(v.size);
            return colorValid && sizeValid;
          })
          .map(v => ({
            color: v.color,
            size: v.size,
            price_cents: v.price_cents ?? null,
            compare_at_price_cents: v.compare_at_price_cents ?? null,
          }))
      : [];

    // Calculate total stock from variants
    const totalStock = formData.hasVariations && formData.variantStocks.length > 0
      ? formData.variantStocks.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
      : formData.stock;

    // Build product data
    const productData: Partial<DbProduct> & { is_online_active?: boolean; barcode?: string | null; meta_title?: string | null; meta_description?: string | null } = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      price_cents: formData.price_cents,
      compare_at_price_cents: formData.compare_at_price_cents || null,
      images: formData.images,
      category: normalizeSlug(formData.category),
      subcategory: normalizeSlug(formData.subcategory),
      sku: formData.sku.trim() || null,
      barcode: formData.barcode.trim() || null,
      brand: brand.trim(),
      // Existing stock is controlled by outlet_inventory triggers; editing product details must not reset live stock.
      stock: editingProduct ? editingProduct.stock : totalStock,
      status: formData.status,
      is_online_active: formData.isOnlineActive,
      benefits: formData.benefits.map(b => ({ title: b.title.trim(), desc: b.desc.trim() })),
      color_options: colorOptions,
      size_options: formData.hasVariations ? formData.sizes : [],
      variants: cleanedVariants,
      meta_title: formData.metaTitle.trim() || null,
      meta_description: formData.metaDescription.trim() || null,
    };

    try {
      let savedProductId: string;
      
      if (editingProduct) {
        // For updates, keep existing slug unless title changed significantly
        if (formData.slug) {
          productData.slug = normalizeSlug(formData.slug);
        }
        await updateProduct.mutateAsync({ id: editingProduct.id, ...productData });
        savedProductId = editingProduct.id;
      } else {
        // For new products, slug will be auto-generated in the mutation
        const result = await createProduct.mutateAsync(productData);
        savedProductId = result.id;
      }

      // Sync variant stocks to product_variants table
      if (formData.hasVariations && formData.variantStocks.length > 0) {
        await syncVariants.mutateAsync({
          productId: savedProductId,
          variants: formData.variantStocks,
          productSku: formData.sku.trim() || undefined,
        });
      }

      // Persist admin-only buying price into the secured product_costs table
      if (isSuperAdmin) {
        if (formData.buying_price !== null && formData.buying_price !== undefined) {
          await supabase
            .from("product_costs")
            .upsert(
              { product_id: savedProductId, buying_price: formData.buying_price },
              { onConflict: "product_id" }
            );
        } else if (editingProduct) {
          await supabase
            .from("product_costs")
            .delete()
            .eq("product_id", savedProductId);
        }
      }

      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      // Error is already handled by mutation's onError
      console.error("Save failed:", error);
    }
  };

  const handleDelete = async (product: { id: string; title: string }) => {
    await deleteProduct.mutateAsync({ id: product.id, title: product.title });
  };

  // Handle barcode scan - find product by SKU
  const handleBarcodeScanned = (code: string) => {
    const normalizedCode = code.trim().toUpperCase();
    
    // Search by SKU first
    let foundProduct = products.find(
      (p) => p.sku?.toUpperCase() === normalizedCode
    );
    
    // If not found by SKU, try title partial match
    if (!foundProduct) {
      foundProduct = products.find(
        (p) => p.title.toLowerCase().includes(normalizedCode.toLowerCase())
      );
    }
    
    if (foundProduct) {
      setSearchTerm(foundProduct.sku || foundProduct.title);
      setHighlightedProductId(foundProduct.id);
      
      // Clear highlight after 3 seconds
      setTimeout(() => setHighlightedProductId(null), 3000);
      
      // Scroll to product row
      setTimeout(() => {
        const row = document.getElementById(`product-row-${foundProduct!.id}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 100);
    } else {
      // Show toast for not found
      alert(`No product found with SKU: ${code}`);
    }
  };

  const filteredProducts = products.filter(
    (product) =>
      product.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Mobile Header - WooCommerce Style */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Products</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="h-9 w-9"
              >
                <Search className="h-5 w-5" />
              </Button>
              {/* Add Product button hidden on mobile - desktop only feature */}
            </div>
          </div>
          
          {/* Mobile Search - Expandable */}
          {mobileSearchOpen && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Desktop Header */}
        <div className="hidden md:flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Products</h1>
            <p className="text-muted-foreground">
              Manage your product catalog (Supabase-backed)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsSkuImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import SKUs
            </Button>
            <Dialog
              open={isAddDialogOpen}
              onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-[95vw] md:max-w-4xl max-h-[90vh] overflow-y-auto p-4 md:p-6 rounded-xl">
              <DialogHeader className="flex flex-row items-start justify-between pr-10">
                <div className="space-y-1.5">
                  <DialogTitle className="text-lg md:text-xl">
                    {editingProduct ? "Edit Product" : "Add New Product"}
                  </DialogTitle>
                  <DialogDescription className="text-xs md:text-sm">
                    {editingProduct
                      ? "Update product information"
                      : "Add a new product to your catalog"}
                  </DialogDescription>
                </div>
              </DialogHeader>
              <div className="grid gap-3 md:gap-4 py-4 md:grid-cols-2">
                {/* Title */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Product Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                    }}
                    placeholder="Luxury Watch"
                  />
                  <p className="text-xs text-muted-foreground">
                    URL slug will be auto-generated from title (e.g., "luxury-watch")
                  </p>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <Label>Price (৳) *</Label>
                  <Input
                    type="number"
                    value={formData.price_cents || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, price_cents: Number(e.target.value) })
                    }
                    placeholder="5999"
                  />
                </div>

                {/* Compare at Price */}
                <div className="space-y-2">
                  <Label>Compare at (৳)</Label>
                  <Input
                    type="number"
                    value={formData.compare_at_price_cents || ""}
                    onChange={(e) =>
                      setFormData({ 
                        ...formData, 
                        compare_at_price_cents: e.target.value ? Number(e.target.value) : null 
                      })
                    }
                    placeholder="7999"
                  />
                  <p className="text-xs text-muted-foreground">Original price for sale items</p>
                </div>

                {/* Buying Price - Super Admin Only */}
                {isSuperAdmin && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      Buying Price (৳)
                      <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">
                        Super Admin Only
                      </Badge>
                    </Label>
                    <Input
                      type="number"
                      value={formData.buying_price || ""}
                      onChange={(e) =>
                        setFormData({ 
                          ...formData, 
                          buying_price: e.target.value ? Number(e.target.value) : null 
                        })
                      }
                      placeholder="e.g., 4500"
                    />
                    <p className="text-xs text-muted-foreground">Cost price (only visible to you)</p>
                  </div>
                )}

                {/* Total Stock (Read-Only Summary) */}
                <div className="space-y-2">
                  <Label>Total Stock</Label>
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border bg-muted/50">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {formData.hasVariations && formData.variantStocks.length > 0
                        ? formData.variantStocks.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
                        : formData.stock}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (managed via Inventory page)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Stock is managed per-outlet in Inventory Management
                  </p>
                </div>

                {/* Website Visibility Toggle */}
                <div className="space-y-2">
                  <Label>Website Visibility</Label>
                  <div className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Show on Website</span>
                    </div>
                    <Switch
                      checked={formData.isOnlineActive}
                      onCheckedChange={(checked) => setFormData({ ...formData, isOnlineActive: checked })}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Disabled products won't appear on the storefront but remain available in POS
                  </p>
                </div>

                {/* SKU */}
                <div className="space-y-2">
                  <Label>SKU (Stock Keeping Unit)</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value.toUpperCase() })
                    }
                    placeholder="e.g., WATCH-001"
                  />
                  <p className="text-xs text-muted-foreground">Internal inventory code</p>
                </div>

                {/* Barcode */}
                <div className="space-y-2">
                  <Label>Barcode (ISBN/UPC/EAN)</Label>
                  <div className="relative">
                    <Input
                      value={formData.barcode}
                      onChange={(e) =>
                        setFormData({ ...formData, barcode: e.target.value.replace(/\D/g, "") })
                      }
                      placeholder="Scan or enter barcode..."
                      className="pr-10"
                    />
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                            onClick={generateBarcode}
                          >
                            <Wand2 className="h-4 w-4 text-primary" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Auto-generate CODE128 Barcode</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-xs text-muted-foreground">For POS scanning and label printing</p>
                </div>

                {/* Brand */}
                <div className="space-y-2">
                  <Label>Brand</Label>
                  <Select
                    value={formData.brandMode === "none" ? "none" : formData.brandMode === "brand" ? formData.brandSelect : "other"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setFormData((p) => ({ ...p, brandMode: "none", brandSelect: "", brandOther: "" }));
                        return;
                      }
                      if (v === "other") {
                        setFormData((p) => ({ ...p, brandMode: "other", brandSelect: "" }));
                        return;
                      }
                      setFormData((p) => ({ ...p, brandMode: "brand", brandSelect: v, brandOther: "" }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a brand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Brand</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.name}>
                          {b.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="other">Other (Custom)</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.brandMode === "other" && (
                    <Input
                      value={formData.brandOther}
                      onChange={(e) => setFormData((p) => ({ ...p, brandOther: e.target.value }))}
                      placeholder="Type custom brand name"
                      className="mt-2"
                    />
                  )}
                </div>

                {/* Main Category */}
                <div className="space-y-2">
                  <Label>Main Category *</Label>
                  <Select
                    value={formData.mainCategoryId || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setFormData((p) => ({ 
                          ...p, 
                          mainCategoryId: "", 
                          subCategoryId: "",
                          category: "", 
                          subcategory: "" 
                        }));
                        return;
                      }
                      const selected = categories.find((c) => c.id === v);
                      setFormData((p) => ({
                        ...p,
                        mainCategoryId: v,
                        subCategoryId: "",
                        category: selected?.slug || "",
                        subcategory: "",
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select main category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {mainCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sub-Category */}
                <div className="space-y-2">
                  <Label>Sub-Category</Label>
                  <Select
                    value={formData.subCategoryId || "none"}
                    onValueChange={(v) => {
                      if (v === "none") {
                        setFormData((p) => ({ ...p, subCategoryId: "", subcategory: "" }));
                        return;
                      }
                      const selected = categories.find((c) => c.id === v);
                      setFormData((p) => ({
                        ...p,
                        subCategoryId: v,
                        subcategory: selected?.slug || "",
                      }));
                    }}
                    disabled={!formData.mainCategoryId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.mainCategoryId ? "Select sub-category" : "Select main first"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {availableSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={sub.id}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Images - Full Width */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Images</Label>
                  <ImageUploader
                    bucket="ecommerce-assets"
                    folder="products"
                    value={formData.images}
                    onChange={(next) => setFormData((p) => ({ ...p, images: next }))}
                    multiple
                    maxFiles={10}
                  />
                </div>

                {/* Description - Full Width */}
                <div className="space-y-2 md:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>

                {/* SEO Section - Full Width */}
                <div className="space-y-4 rounded-lg border border-input bg-muted/30 p-4 md:col-span-2">
                  <div>
                    <Label className="text-base font-semibold">SEO — Search Engine Preview</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Customize how this product appears on Google and social shares. Leave blank to auto-generate from the product title and description.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta-title">Meta Title</Label>
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          formData.metaTitle.length > 60
                            ? "text-destructive font-semibold"
                            : formData.metaTitle.length > 50
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {formData.metaTitle.length} / 60
                      </span>
                    </div>
                    <Input
                      id="meta-title"
                      value={formData.metaTitle}
                      onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value.slice(0, 70) })}
                      placeholder={formData.title ? `${formData.title} — Friction` : "e.g. Premium Leather Oxford Shoes — Friction"}
                      maxLength={70}
                    />
                    <p className="text-[11px] text-muted-foreground">Ideal: 50–60 characters. Include the main keyword.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta-description">Meta Description</Label>
                      <span
                        className={cn(
                          "text-[11px] tabular-nums",
                          formData.metaDescription.length > 160
                            ? "text-destructive font-semibold"
                            : formData.metaDescription.length > 140
                            ? "text-amber-600"
                            : "text-muted-foreground"
                        )}
                      >
                        {formData.metaDescription.length} / 160
                      </span>
                    </div>
                    <Textarea
                      id="meta-description"
                      value={formData.metaDescription}
                      onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value.slice(0, 180) })}
                      placeholder="Short, compelling summary shown in Google search results and social previews."
                      rows={2}
                      maxLength={180}
                    />
                    <p className="text-[11px] text-muted-foreground">Ideal: 140–160 characters. Mention key benefits & call to action.</p>
                  </div>

                  {/* Google preview */}
                  <div className="rounded-md border bg-background p-3">
                    <p className="text-[11px] text-muted-foreground mb-1">Google preview</p>
                    <p className="text-[#1a0dab] text-base leading-snug truncate">
                      {(formData.metaTitle || `${formData.title || "Product Title"} — Friction`).slice(0, 60)}
                    </p>
                    <p className="text-[#006621] text-xs">bubu.com.bd › product › {formData.slug || "your-product"}</p>
                    <p className="text-[13px] text-foreground/80 mt-0.5 line-clamp-2">
                      {(formData.metaDescription ||
                        (formData.description
                          ? `${formData.description.slice(0, 155)}…`
                          : "Add a meta description to control how this product appears in search results."))}
                    </p>
                  </div>
                </div>


                {/* Product Variations Section - Full Width */}
                <div className="space-y-4 rounded-lg border border-input bg-muted/30 p-4 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base font-semibold">Product Variations</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Enable if this product has color or size options
                      </p>
                    </div>
                    <Switch
                      checked={formData.hasVariations}
                      onCheckedChange={(checked) => setFormData({ ...formData, hasVariations: checked })}
                    />
                  </div>
                  
                {formData.hasVariations && (
                    <div className="grid gap-4 pt-2 border-t">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Colors */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Palette className="h-4 w-4 text-muted-foreground" />
                            <Label>Available Colors</Label>
                          </div>
                          <TagInput
                            value={formData.colors}
                            onChange={(colors) => setFormData({ ...formData, colors })}
                            placeholder="Type color name, press Enter"
                          />
                        </div>
                        
                        {/* Sizes */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Ruler className="h-4 w-4 text-muted-foreground" />
                            <Label>Available Sizes</Label>
                          </div>
                          <TagInput
                            value={formData.sizes}
                            onChange={(sizes) => setFormData({ ...formData, sizes })}
                            placeholder="Type size, press Enter"
                          />
                        </div>
                      </div>

                      {/* Variant Stock Table */}
                      {(formData.colors.length > 0 || formData.sizes.length > 0) && (
                        <VariantStockTable
                          colors={formData.colors}
                          sizes={formData.sizes}
                          basePrice={formData.price_cents}
                          baseCompareAtPrice={formData.compare_at_price_cents}
                          baseStock={formData.stock}
                          variants={formData.variantStocks}
                          onChange={(variantStocks) => setFormData({ ...formData, variantStocks })}
                        />
                      )}
                    </div>
                  )}
                </div>

                {/* Premium Benefits Section - Full Width */}
                <div className="space-y-3 rounded-lg border border-input bg-muted/30 p-4 md:col-span-2">
                  <Label className="text-base font-semibold">Premium Benefits</Label>
                  <p className="text-xs text-muted-foreground">
                    Configure the 6 benefit points shown on the product page. Select a predefined title for Bengali translation, or choose "Custom" for your own.
                  </p>
                  <div className="grid gap-3 md:grid-cols-2">
                    {formData.benefits.map((benefit, index) => (
                      <div key={index} className="grid grid-cols-2 gap-2">
                        {formData.customBenefitMode[index] ? (
                          <div className="flex gap-1">
                            <Input
                              value={benefit.title}
                              onChange={(e) => {
                                const newBenefits = [...formData.benefits];
                                newBenefits[index] = { ...newBenefits[index], title: e.target.value };
                                setFormData({ ...formData, benefits: newBenefits });
                              }}
                              placeholder="Custom title"
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="shrink-0 h-10 w-10"
                              onClick={() => {
                                const newModes = [...formData.customBenefitMode];
                                newModes[index] = false;
                                const newBenefits = [...formData.benefits];
                                newBenefits[index] = { ...newBenefits[index], title: DEFAULT_BENEFITS[index]?.title || "" };
                                setFormData({ ...formData, customBenefitMode: newModes, benefits: newBenefits });
                              }}
                              title="Switch to dropdown"
                            >
                              ×
                            </Button>
                          </div>
                        ) : (
                          <Select
                            value={benefit.title || "__select__"}
                            onValueChange={(value) => {
                              if (value === "__custom__") {
                                const newModes = [...formData.customBenefitMode];
                                newModes[index] = true;
                                const newBenefits = [...formData.benefits];
                                newBenefits[index] = { ...newBenefits[index], title: "" };
                                setFormData({ ...formData, customBenefitMode: newModes, benefits: newBenefits });
                              } else if (value !== "__select__") {
                                const newBenefits = [...formData.benefits];
                                newBenefits[index] = { ...newBenefits[index], title: value };
                                setFormData({ ...formData, benefits: newBenefits });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={`Benefit ${index + 1}`} />
                            </SelectTrigger>
                            <SelectContent>
                              {BENEFIT_OPTIONS.map((opt) => (
                                <SelectItem key={opt.title} value={opt.title}>
                                  {opt.title}
                                </SelectItem>
                              ))}
                              <SelectItem value="__custom__" className="text-primary font-medium">
                                ✏️ Custom...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        <Input
                          value={benefit.desc}
                          onChange={(e) => {
                            const newBenefits = [...formData.benefits];
                            newBenefits[index] = { ...newBenefits[index], desc: e.target.value };
                            setFormData({ ...formData, benefits: newBenefits });
                          }}
                          placeholder="Description (optional)"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Live Preview */}
                  <div className="mt-4 rounded-lg border border-dashed border-primary/30 bg-orange-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <Eye className="h-4 w-4" />
                      Storefront Preview (Bengali)
                    </div>
                    <BenefitsPreview benefits={formData.benefits} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={createProduct.isPending || updateProduct.isPending}>
                  {(createProduct.isPending || updateProduct.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <Save className="mr-2 h-4 w-4" />
                  {editingProduct ? "Update" : "Add"} Product
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* SKU Import Dialog */}
        <SkuImportDialog open={isSkuImportOpen} onOpenChange={setIsSkuImportOpen} />

        {/* Desktop Search - Hidden on Mobile */}
        <div className="hidden md:block relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, brand, or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile Product List - WooCommerce Style */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No products found</p>
              <p className="text-sm text-muted-foreground mt-2">Use desktop to add products</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border bg-card p-3",
                    highlightedProductId === product.id && "ring-2 ring-primary"
                  )}
                >
                  {/* Product Image */}
                  {product.images[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.title}
                      className="h-14 w-14 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight line-clamp-1">{product.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{product.category}</p>
                    <div className="mt-1">
                      {product.stock === 0 ? (
                        <span className="text-xs font-medium text-destructive">Out of Stock</span>
                      ) : product.stock <= 10 ? (
                        <span className="text-xs font-medium text-amber-600">Only {product.stock} left</span>
                      ) : (
                        <span className="text-xs font-medium text-green-600">In Stock ({product.stock})</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm text-primary">{formatCurrency(product.price_cents)}</p>
                    {product.status === "draft" && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">
                        Draft
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Desktop Products Table - Hidden on Mobile */}
        <Card className="border-border/50 hidden md:block">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Package className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No products found</p>
                <p className="text-sm text-muted-foreground mt-2">Add your first product to get started</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product) => (
                      <TableRow 
                        key={product.id}
                        id={`product-row-${product.id}`}
                        className={highlightedProductId === product.id ? "bg-primary/10 animate-pulse" : ""}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.title}
                                className="h-12 w-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                                <Package className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{product.title}</p>
                              <p className="text-xs text-muted-foreground">{product.brand}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(product.price_cents)}
                        </TableCell>
                        <TableCell>
                          {product.stock === 0 ? (
                            <Badge variant="destructive">Out of Stock</Badge>
                          ) : product.stock <= 10 ? (
                            <Badge
                              variant="outline"
                              className="bg-amber-500/10 text-amber-600"
                            >
                              {product.stock} left
                            </Badge>
                          ) : (
                            <span>{product.stock}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.status === "active" ? "default" : "secondary"}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Product?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently
                                    delete the product from your catalog.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete({ id: product.id, title: product.title })}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
