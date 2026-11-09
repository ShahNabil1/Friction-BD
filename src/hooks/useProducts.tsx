import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { normalizeSlug, generateSlug } from "@/lib/slug";
import { useActivityLog } from "./useActivityLog";

export interface ProductBenefit {
  title: string;
  desc: string;
}

// Predefined benefit options with Bengali translations
export const BENEFIT_OPTIONS = [
  { title: "1 Year Warranty", bengali: "১ বছরের ওয়ারেন্টি" },
  { title: "No Warranty", bengali: "ওয়ারেন্টি নেই" },
  { title: "100% Original", bengali: "১০০% অরিজিনাল" },
  { title: "Free Box & Bag", bengali: "সাথে ফ্রি বক্স এবং ব্যাগ" },
  { title: "Open Box Check", bengali: "ওপেন বক্স চেক সুবিধা" },
  { title: "5 Days Replacement", bengali: "৫ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  { title: "7 Days Replacement", bengali: "৭ দিনের রিপ্লেসমেন্ট গ্যারান্টি" },
  { title: "Fast Delivery", bengali: "সারা দেশে দ্রুত ডেলিভারি" },
] as const;

export const DEFAULT_BENEFITS: ProductBenefit[] = [
  { title: "No Warranty", desc: "Check carefully before buying" },
  { title: "100% Original", desc: "Authentic product guarantee" },
  { title: "Free Box & Bag", desc: "Premium packaging included" },
  { title: "Open Box Check", desc: "Allowing checking before payment" },
  { title: "7 Days Replacement", desc: "Easy replacement policy" },
  { title: "Fast Delivery", desc: "Delivery within 2-3 days" },
];

// Variant pricing structure
export interface VariantPricing {
  color?: string;
  size?: string;
  price_cents: number | null;
  compare_at_price_cents?: number | null;
}

export interface DbProduct {
  id: string;
  title: string;
  description: string;
  brand: string;
  sku: string | null;
  barcode: string | null;
  slug: string;
  category: string;
  subcategory: string;
  shop_category: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock: number;
  badge: string | null;
  status: string;
  images: string[];
  tags: string[];
  color_options: Array<{ name: string; swatch: "gold" | "silver" | "black"; imageIndex: number }>;
  size_options: string[];
  specs: Array<{ label: string; value: string }>;
  faq: Array<{ q: string; a: string }>;
  variants: VariantPricing[];
  benefits: ProductBenefit[];
  rating: number;
  review_count: number;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

// For compatibility with existing Product type used in components
export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  subcategory: string;
  slug: string;
  shopCategory?: string;
  badge?: string;
  price: number;
  compareAtPrice?: number;
  images: string[];
  rating: number;
  reviewCount: number;
  colorOptions: Array<{ name: string; swatch: "gold" | "silver" | "black"; imageIndex: number }>;
  sizeOptions: string[];
  description: string;
  specs: Array<{ label: string; value: string }>;
  faq: Array<{ q: string; a: string }>;
  benefits: ProductBenefit[];
  variants: VariantPricing[];
  stock?: number;
  barcode?: string;
  metaTitle?: string;
  metaDescription?: string;
}

// Get variant price based on selected color and size
export function getVariantPrice(
  product: Product,
  color?: string,
  size?: string
): { price: number; compareAtPrice?: number } {
  if (!product.variants || product.variants.length === 0) {
    return { price: product.price, compareAtPrice: product.compareAtPrice };
  }

  // Find exact match first (both color and size)
  if (color && size) {
    const exactMatch = product.variants.find(
      (v) => v.color === color && v.size === size && v.price_cents !== null
    );
    if (exactMatch && exactMatch.price_cents !== null) {
      return {
        price: exactMatch.price_cents,
        compareAtPrice: exactMatch.compare_at_price_cents ?? product.compareAtPrice,
      };
    }
  }

  // Try color-only match
  if (color) {
    const colorMatch = product.variants.find(
      (v) => v.color === color && !v.size && v.price_cents !== null
    );
    if (colorMatch && colorMatch.price_cents !== null) {
      return {
        price: colorMatch.price_cents,
        compareAtPrice: colorMatch.compare_at_price_cents ?? product.compareAtPrice,
      };
    }
  }

  // Try size-only match
  if (size) {
    const sizeMatch = product.variants.find(
      (v) => v.size === size && !v.color && v.price_cents !== null
    );
    if (sizeMatch && sizeMatch.price_cents !== null) {
      return {
        price: sizeMatch.price_cents,
        compareAtPrice: sizeMatch.compare_at_price_cents ?? product.compareAtPrice,
      };
    }
  }

  // Fallback to base price
  return { price: product.price, compareAtPrice: product.compareAtPrice };
}

// Convert DB product to frontend Product type
export function dbToProduct(dbProduct: DbProduct): Product {
  // Parse benefits - handle both array and null/undefined
  let benefits: ProductBenefit[] = DEFAULT_BENEFITS;
  if (Array.isArray(dbProduct.benefits) && dbProduct.benefits.length > 0) {
    benefits = dbProduct.benefits;
  }

  // Parse variants
  let variants: VariantPricing[] = [];
  if (Array.isArray(dbProduct.variants)) {
    variants = dbProduct.variants;
  }

  // Ensure arrays have defaults for null values
  const images = Array.isArray(dbProduct.images) ? dbProduct.images : [];
  const colorOptions = Array.isArray(dbProduct.color_options) ? dbProduct.color_options : [];
  const sizeOptions = Array.isArray(dbProduct.size_options) ? dbProduct.size_options : [];
  const specs = Array.isArray(dbProduct.specs) ? dbProduct.specs : [];
  const faq = Array.isArray(dbProduct.faq) ? dbProduct.faq : [];

  return {
    id: dbProduct.id,
    title: dbProduct.title,
    brand: dbProduct.brand || "",
    category: dbProduct.category || "",
    subcategory: dbProduct.subcategory || "",
    slug: dbProduct.slug,
    shopCategory: dbProduct.shop_category ?? undefined,
    badge: dbProduct.badge ?? undefined,
    price: dbProduct.price_cents,
    compareAtPrice: dbProduct.compare_at_price_cents ?? undefined,
    images,
    rating: Number(dbProduct.rating) || 0,
    reviewCount: dbProduct.review_count || 0,
    colorOptions,
    sizeOptions,
    description: dbProduct.description || "",
    specs,
    faq,
    benefits,
    variants,
    stock: dbProduct.stock ?? 0,
    barcode: dbProduct.barcode ?? undefined,
    metaTitle: dbProduct.meta_title ?? undefined,
    metaDescription: dbProduct.meta_description ?? undefined,
  };
}

// Fetch all active products (public website only)
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, brand, category, subcategory, slug, shop_category, badge, price_cents, compare_at_price_cents, images, rating, review_count, color_options, size_options, description, specs, faq, benefits, variants, stock, is_online_active")
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as DbProduct[]).map(dbToProduct);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Fetch products by category/subcategory slug with STRICT EXACT MATCHING
export function useProductsByCategory(categorySlug: string, subcategorySlug?: string) {
  return useQuery({
    queryKey: ["products", "category", categorySlug, subcategorySlug],
    queryFn: async () => {
      // Normalize slugs for comparison - always lowercase
      const normalizedCatSlug = (categorySlug || "").toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, "-");
      const normalizedSubSlug = subcategorySlug?.toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, "-");

      // If category is "all", return all products visible on website
      if (normalizedCatSlug === "all") {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("status", "active")
          .or("is_online_active.eq.true,is_online_active.is.null")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        return ((data || []) as unknown as DbProduct[]).map(dbToProduct);
      }

      // Map category slugs to EXACT category values (strict matching only)
      // Each key maps to an array of EXACT values that should match
      const categoryMapping: Record<string, string[]> = {
        "mens": ["mens", "men", "men's"],
        "womens": ["womens", "women", "women's"],
        "sneakers": ["sneakers", "sneaker"],
        "sports": ["sports", "sport"],
        "formal": ["formal", "dress"],
        "boots": ["boots", "boot"],
        "perfumes": ["perfumes", "perfume", "fragrance"],
        "smart-watches": ["smart-watches", "smartwatches", "smart watches"],
        "analog-watches": ["analog-watches", "analog watches", "watches"],
        "watches": ["watches", "watch"],
      };

      // Get possible category values to match EXACTLY
      const possibleCatValues = categoryMapping[normalizedCatSlug] || [normalizedCatSlug];
      
      // Fetch all active products visible on website (true or null = visible)
      const { data: allProducts, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter products using STRICT EXACT MATCHING (no partial matches)
      const filteredProducts = ((allProducts || []) as unknown as DbProduct[]).filter(p => {
        // Normalize product category and subcategory to lowercase for comparison
        const pCategory = (p.category || "").toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, "-");
        const pSubcategory = (p.subcategory || "").toLowerCase().trim().replace(/['']/g, "").replace(/\s+/g, "-");
        
        // STRICT: Check if product category EXACTLY matches any of the possible values
        const categoryMatches = possibleCatValues.some(v => 
          pCategory === v || pSubcategory === v
        );

        // If subcategory specified and not "all", also check subcategory EXACT match
        if (normalizedSubSlug && normalizedSubSlug !== "all") {
          const subValues = categoryMapping[normalizedSubSlug] || [normalizedSubSlug];
          const subMatches = subValues.some(v =>
            pSubcategory === v || pCategory === v
          );
          return categoryMatches || subMatches;
        }

        return categoryMatches;
      });

      return filteredProducts.map(dbToProduct);
    },
    enabled: !!categorySlug,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch products by shop category (public website only)
export function useProductsByShopCategory(shopCategory: string) {
  return useQuery({
    queryKey: ["products", "shopCategory", shopCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_category", shopCategory)
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data as unknown as DbProduct[]).map(dbToProduct);
    },
    enabled: !!shopCategory,
    staleTime: 1000 * 60 * 5,
  });
}

// Fetch single product by slug (flexible matching) - for public product detail pages
export function useProductBySlug(categorySlug: string, subcategorySlug: string, productSlug: string) {
  return useQuery({
    queryKey: ["products", "single", categorySlug, subcategorySlug, productSlug],
    queryFn: async () => {
      const decodedSlug = decodeURIComponent(productSlug || "");
      const normalizedRequested = normalizeSlug(decodedSlug);

      // Try exact slug match first (must be active AND visible on website - true or null)
      const { data: exactMatch, error: exactError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", decodedSlug)
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .maybeSingle();

      if (exactError) throw exactError;
      if (exactMatch) {
        return dbToProduct(exactMatch as unknown as DbProduct);
      }

      // Try normalized slug match
      const { data: normalizedMatch, error: normalizedError } = await supabase
        .from("products")
        .select("*")
        .eq("slug", normalizedRequested)
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .maybeSingle();

      if (normalizedError) throw normalizedError;
      if (normalizedMatch) {
        return dbToProduct(normalizedMatch as unknown as DbProduct);
      }

      // Try fuzzy match with ilike
      const { data: fuzzyMatches, error: fuzzyError } = await supabase
        .from("products")
        .select("*")
        .ilike("slug", `%${normalizedRequested}%`)
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .order("created_at", { ascending: false })
        .limit(5);

      if (fuzzyError) throw fuzzyError;
      
      if (fuzzyMatches && fuzzyMatches.length > 0) {
        return dbToProduct(fuzzyMatches[0] as unknown as DbProduct);
      }

      return null;
    },
    enabled: !!productSlug,
    staleTime: 1000 * 60 * 5,
  });
}

// Search products (public website only - true or null = visible)
export function useSearchProducts(query: string) {
  return useQuery({
    queryKey: ["products", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("id, title, brand, category, subcategory, slug, shop_category, badge, price_cents, compare_at_price_cents, images, rating, review_count, color_options, size_options, description, specs, faq, benefits, variants, stock, is_online_active")
        .eq("status", "active")
        .or("is_online_active.eq.true,is_online_active.is.null")
        .or(`title.ilike.%${query}%,brand.ilike.%${query}%,description.ilike.%${query}%,category.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data as unknown as DbProduct[]).map(dbToProduct);
    },
    enabled: query.trim().length > 0,
    staleTime: 1000 * 60 * 2,
  });
}

// Admin: Fetch all products including inactive
export function useAdminProducts() {
  return useQuery({
    queryKey: ["admin", "products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as DbProduct[];
    },
    staleTime: 1000 * 60,
  });
}

// Admin: Create product with proper error handling
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  return useMutation({
    mutationFn: async (product: Partial<DbProduct>) => {
      // Generate unique slug if not provided
      let slug = product.slug || generateSlug(product.title || "");
      
      // Check if slug already exists
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      
      if (existing) {
        // Append random suffix to make unique
        slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
      }

      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, slug } as any)
        .select()
        .single();

      if (error) {
        console.error("Supabase insert error:", error);
        throw new Error(error.message || "Failed to create product");
      }
      
      if (!data) {
        throw new Error("No data returned from Supabase");
      }
      
      return data;
    },
    onSuccess: async (data) => {
      // Force immediate refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await logActivity({
        actionType: "product_created",
        entityType: "product",
        entityId: data.id,
        details: { name: data.title },
      });
      toast({ title: "Product Created", description: "Product saved to database successfully" });
    },
    onError: (error: Error) => {
      console.error("Create product error:", error);
      toast({ 
        title: "Save Failed", 
        description: `Database error: ${error.message}`, 
        variant: "destructive" 
      });
    },
  });
}

// Admin: Update product with proper error handling
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<DbProduct> & { id: string }) => {
      // Generate unique slug if title changed but slug not provided
      let slug = updates.slug;
      if (updates.title && !slug) {
        slug = generateSlug(updates.title);
      }
      
      if (slug) {
        // Check if slug already exists (excluding current product)
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("slug", slug)
          .neq("id", id)
          .maybeSingle();
        
        if (existing) {
          // Append random suffix to make unique
          slug = `${slug}-${Math.random().toString(36).substring(2, 8)}`;
        }
        updates.slug = slug;
      }

      const { data, error } = await supabase
        .from("products")
        .update(updates as any)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        console.error("Supabase update error:", error);
        throw new Error(error.message || "Failed to update product");
      }
      
      if (!data) {
        throw new Error("No data returned from Supabase");
      }
      
      return data;
    },
    onSuccess: async (data) => {
      // Force immediate refetch
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await logActivity({
        actionType: "product_updated",
        entityType: "product",
        entityId: data.id,
        details: { name: data.title },
      });
      toast({ title: "Product Updated", description: "Changes saved to database successfully" });
    },
    onError: (error: Error) => {
      console.error("Update product error:", error);
      toast({ 
        title: "Update Failed", 
        description: `Database error: ${error.message}`, 
        variant: "destructive" 
      });
    },
  });
}

// Admin: Delete product
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  return useMutation({
    mutationFn: async (input: { id: string; title: string }) => {
      const { error } = await supabase.from("products").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "products"] });
      await logActivity({
        actionType: "product_deleted",
        entityType: "product",
        entityId: data.id,
        details: { name: data.title },
      });
      toast({ title: "Product Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// Helper functions - all prices are in BDT (whole integers, no decimals)
export function formatPrice(amount: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function productPath(product: Product) {
  // Handle case where category or subcategory might be empty
  const category = product.category?.toLowerCase().replace(/\s+/g, "-") || "products";
  const subcategory = product.subcategory?.toLowerCase().replace(/\s+/g, "-") || "all";
  return `/${category}/${subcategory}/${product.slug}`;
}

export const shopCategories = {
  "analog-watches": { name: "Analog Watches", description: "Classic timepieces for every occasion" },
  "smart-watches": { name: "Smart Watches", description: "Connected tech on your wrist" },
  "luxury-perfumes": { name: "Luxury Perfumes", description: "Exquisite fragrances for the discerning" },
  "pocket-perfumes": { name: "Pocket Perfumes", description: "Travel-size scents on the go" },
  "straps": { name: "Watch Straps", description: "Premium replacement bands" },
  "gift-sets": { name: "Gift Sets", description: "Curated collections for special moments" },
} as const;

export type ShopCategorySlug = keyof typeof shopCategories;
