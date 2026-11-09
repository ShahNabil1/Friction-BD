import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Search, Package, Plus, Loader2, Building2, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useOutlets, useUserOutlet } from "@/hooks/useOutlets";
import { useAdminProducts, type DbProduct } from "@/hooks/useProducts";
import { useProductVariants, type ProductVariant } from "@/hooks/useProductVariants";
import { useAddOutletStock, useOutletInventoryList } from "@/hooks/useOutletInventory";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";

export default function InventoryStockIn() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { isSuperAdmin, role } = useUserRole();
  const { data: allOutlets = [], isLoading: outletsLoading } = useOutlets();
  const { data: userOutlet } = useUserOutlet();
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const addStock = useAddOutletStock();

  // Determine if user can select outlet or is locked
  const canSelectOutlet = isSuperAdmin || role === "admin";
  const lockedOutletId = !canSelectOutlet ? userOutlet?.outletId : null;

  // Form state
  const [selectedOutletId, setSelectedOutletId] = useState<string>(lockedOutletId || "");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<DbProduct | null>(null);
  // Map of variantId -> quantity (use "__default__" key when product has no variants)
  const [variantQuantities, setVariantQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-set outlet for locked users
  const effectiveOutletId = lockedOutletId || selectedOutletId;

  // Fetch variants for selected product
  const { data: variants = [] } = useProductVariants(selectedProduct?.id);

  // Fetch current inventory for the outlet
  const { data: currentInventory = [] } = useOutletInventoryList(effectiveOutletId || null);

  // Filter products by search
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const query = searchTerm.toLowerCase();
    return products
      .filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.sku?.toLowerCase().includes(query) ||
          p.brand?.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [products, searchTerm]);

  // Determine if product has variants
  const hasVariants = variants.length > 0;

  const selectedVariantIds = useMemo(
    () => Object.keys(variantQuantities).filter((id) => id !== "__default__"),
    [variantQuantities]
  );

  const totalUnits = useMemo(
    () => Object.values(variantQuantities).reduce((sum, q) => sum + (q > 0 ? q : 0), 0),
    [variantQuantities]
  );

  const toggleVariant = (variantId: string) => {
    setVariantQuantities((prev) => {
      const next = { ...prev };
      if (next[variantId] !== undefined) {
        delete next[variantId];
      } else {
        next[variantId] = 1;
      }
      return next;
    });
  };

  const setVariantQty = (variantId: string, qty: number) => {
    setVariantQuantities((prev) => ({ ...prev, [variantId]: qty }));
  };

  const selectAllVariants = () => {
    setVariantQuantities((prev) => {
      const next: Record<string, number> = {};
      for (const v of variants) {
        next[v.id] = prev[v.id] && prev[v.id] > 0 ? prev[v.id] : 1;
      }
      return next;
    });
  };

  const clearAllVariants = () => setVariantQuantities({});

  // Handle product selection
  const handleSelectProduct = (product: DbProduct) => {
    setSelectedProduct(product);
    setVariantQuantities({});
    setSearchTerm("");
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!effectiveOutletId || !selectedProduct) {
      toast({
        title: "Missing Information",
        description: "Please select an outlet and product",
        variant: "destructive",
      });
      return;
    }

    const entries: Array<{ variantId: string | null; quantity: number; label: string }> = [];

    if (hasVariants) {
      if (selectedVariantIds.length === 0) {
        toast({
          title: "Select Variant",
          description: "Please select at least one variant",
          variant: "destructive",
        });
        return;
      }
      for (const vId of selectedVariantIds) {
        const qty = variantQuantities[vId] || 0;
        const v = variants.find((x) => x.id === vId);
        const label = [v?.size, v?.color].filter(Boolean).join(" / ") || "Variant";
        if (qty <= 0) {
          toast({
            title: "Invalid Quantity",
            description: `Enter quantity for ${label}`,
            variant: "destructive",
          });
          return;
        }
        entries.push({ variantId: vId, quantity: qty, label });
      }
    } else {
      const qty = variantQuantities["__default__"] || 0;
      if (qty <= 0) {
        toast({
          title: "Invalid Quantity",
          description: "Please enter a quantity greater than 0",
          variant: "destructive",
        });
        return;
      }
      entries.push({ variantId: null, quantity: qty, label: "Default" });
    }

    setIsSubmitting(true);
    let successCount = 0;
    const failures: string[] = [];

    try {
      for (const entry of entries) {
        try {
          await addStock.mutateAsync({
            outletId: effectiveOutletId,
            productId: selectedProduct.id,
            variantId: entry.variantId,
            quantity: entry.quantity,
            notes: notes.trim() || undefined,
          });
          successCount++;
        } catch (err: any) {
          failures.push(`${entry.label}: ${err.message || "failed"}`);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Stock Added",
          description: `Added stock to ${successCount} variant${successCount > 1 ? "s" : ""} of ${selectedProduct.title}${failures.length ? ` • ${failures.length} failed` : ""}`,
        });
      }

      if (failures.length > 0 && successCount === 0) {
        toast({
          title: "Failed",
          description: failures.join(" | "),
          variant: "destructive",
        });
      }

      if (successCount > 0 && failures.length === 0) {
        setSelectedProduct(null);
        setVariantQuantities({});
        setNotes("");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get outlet name
  const selectedOutlet = allOutlets.find((o) => o.id === effectiveOutletId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pos/inventory")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Receive Goods (Stock In)</h1>
                <p className="text-xs text-muted-foreground">
                  {selectedOutlet?.name || "Add inventory"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Select Outlet */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                    1
                  </div>
                  <CardTitle className="text-base">Select Outlet</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {canSelectOutlet ? (
                  <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose outlet to receive stock" />
                    </SelectTrigger>
                    <SelectContent>
                      {allOutlets.map((outlet) => (
                        <SelectItem key={outlet.id} value={outlet.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            {outlet.name}
                            {outlet.is_main_branch && (
                              <Badge variant="secondary" className="text-xs">
                                Main
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{userOutlet?.outlet?.name || "Your Outlet"}</span>
                    <Badge variant="secondary" className="text-xs">Locked</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Search & Select Product */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium",
                    effectiveOutletId ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    2
                  </div>
                  <CardTitle className="text-base">Search Product</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by product name, SKU, or brand..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    disabled={!effectiveOutletId}
                  />
                </div>

                {/* Search Results */}
                {filteredProducts.length > 0 && (
                  <ScrollArea className="h-64 rounded-lg border">
                    <div className="p-2 space-y-1">
                      {filteredProducts.map((product) => (
                        <button
                          key={product.id}
                          onClick={() => handleSelectProduct(product)}
                          className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted text-left transition-colors"
                        >
                          {product.images?.[0] ? (
                            <img
                              src={product.images[0]}
                              alt={product.title}
                              className="h-10 w-10 rounded object-cover"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                              <Package className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{product.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {product.sku || "No SKU"} • {product.brand || "No Brand"}
                            </p>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(product.price_cents)}
                          </p>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                )}

                {/* Selected Product */}
                {selectedProduct && (
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      {selectedProduct.images?.[0] ? (
                        <img
                          src={selectedProduct.images[0]}
                          alt={selectedProduct.title}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold">{selectedProduct.title}</p>
                            <p className="text-sm text-muted-foreground">
                              SKU: {selectedProduct.sku || "N/A"}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedProduct(null);
                              setVariantQuantities({});
                            }}
                          >
                            Change
                          </Button>
                        </div>
                        <Badge className="mt-2" variant="secondary">
                          {formatCurrency(selectedProduct.price_cents)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 3: Select Variants (multi) */}
            {selectedProduct && hasVariants && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                        3
                      </div>
                      <CardTitle className="text-base">Select Variants</CardTitle>
                      {selectedVariantIds.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {selectedVariantIds.length} selected
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllVariants}>
                        Select All
                      </Button>
                      {selectedVariantIds.length > 0 && (
                        <Button type="button" variant="ghost" size="sm" onClick={clearAllVariants}>
                          Clear
                        </Button>
                      )}
                    </div>
                  </div>
                  <CardDescription>
                    Pick one or more variants and set the quantity for each.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                    {variants.map((variant) => {
                      const isSelected = variantQuantities[variant.id] !== undefined;
                      return (
                        <button
                          key={variant.id}
                          type="button"
                          onClick={() => toggleVariant(variant.id)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isSelected
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted"
                          )}
                        >
                          <div className="text-left">
                            <p className="font-medium text-sm">
                              {[variant.size, variant.color].filter(Boolean).join(" / ") || "Default"}
                            </p>
                            {variant.sku && (
                              <p className="text-xs text-muted-foreground">{variant.sku}</p>
                            )}
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Step 4: Enter Quantities */}
            {selectedProduct && ((hasVariants && selectedVariantIds.length > 0) || !hasVariants) && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-medium">
                      {hasVariants ? "4" : "3"}
                    </div>
                    <CardTitle className="text-base">Enter Quantity</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {hasVariants ? (
                    <div className="space-y-2">
                      {selectedVariantIds.map((vId) => {
                        const v = variants.find((x) => x.id === vId);
                        if (!v) return null;
                        const label = [v.size, v.color].filter(Boolean).join(" / ") || "Default";
                        return (
                          <div
                            key={vId}
                            className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{label}</p>
                              {v.sku && (
                                <p className="text-xs text-muted-foreground truncate">{v.sku}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setVariantQty(vId, Math.max(1, (variantQuantities[vId] || 1) - 1))
                                }
                              >
                                -
                              </Button>
                              <Input
                                type="number"
                                min="1"
                                value={variantQuantities[vId] ?? 1}
                                onChange={(e) =>
                                  setVariantQty(vId, parseInt(e.target.value) || 0)
                                }
                                className="w-20 text-center"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() =>
                                  setVariantQty(vId, (variantQuantities[vId] || 0) + 1)
                                }
                              >
                                +
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                onClick={() => toggleVariant(vId)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Quantity to Add</Label>
                      <Input
                        type="number"
                        min="1"
                        value={variantQuantities["__default__"] ?? 1}
                        onChange={(e) =>
                          setVariantQty("__default__", parseInt(e.target.value) || 0)
                        }
                        className="text-lg"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Notes (Optional)</Label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g., Supplier delivery, Purchase Order #123"
                      className="h-[42px] resize-none"
                    />
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting || totalUnits <= 0}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    Add {totalUnits} unit{totalUnits === 1 ? "" : "s"}
                    {hasVariants && selectedVariantIds.length > 1
                      ? ` across ${selectedVariantIds.length} variants`
                      : ""}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar: Current Inventory */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {selectedOutlet?.name || "Outlet"} Inventory
                </CardTitle>
                <CardDescription>
                  Current stock at this location
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!effectiveOutletId ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Select an outlet to view inventory
                  </p>
                ) : currentInventory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No inventory at this outlet yet
                  </p>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {currentInventory.slice(0, 20).map((item: any) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded border bg-muted/30"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.product?.title || "Unknown"}
                            </p>
                            {item.variant && (
                              <p className="text-xs text-muted-foreground">
                                {[item.variant.size, item.variant.color].filter(Boolean).join(" / ")}
                              </p>
                            )}
                          </div>
                          <Badge variant="secondary">{item.quantity}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
