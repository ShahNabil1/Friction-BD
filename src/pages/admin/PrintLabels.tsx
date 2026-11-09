import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Barcode from "react-barcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { LabelPrintPortal } from "@/components/pos/LabelPrintPortal";
import { useAdminProducts, DbProduct } from "@/hooks/useProducts";
import { formatPrice } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { Search, Printer, X, Plus, Minus, Tag, ArrowLeft } from "lucide-react";

// Hardcoded label size: 35mm x 25mm thermal stickers
const LABEL_WIDTH = 35;
const LABEL_HEIGHT = 25;

// A printable item can be either a product or a specific variant
interface PrintableItem {
  id: string; // unique key: product_id or product_id|variant_id
  productId: string;
  variantId?: string;
  title: string; // Product title or "Product - Color / Size"
  price: number; // Variant price or product price
  barcode: string; // Variant barcode or product barcode/SKU
  sku?: string;
  image?: string;
}

interface QueueItem {
  item: PrintableItem;
  quantity: number;
}

interface DbVariant {
  id: string;
  product_id: string;
  size: string | null;
  color: string | null;
  sku: string | null;
  barcode: string | null;
  price_cents: number | null;
}

const PrintLabels = () => {
  const { data: products = [], isLoading: productsLoading } = useAdminProducts();
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Queue state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Variants state
  const [variants, setVariants] = useState<DbVariant[]>([]);
  const [variantsLoading, setVariantsLoading] = useState(true);

  // Fetch all variants on mount
  useEffect(() => {
    const fetchVariants = async () => {
      setVariantsLoading(true);
      try {
        const { data, error } = await supabase
          .from("product_variants")
          .select("id, product_id, size, color, sku, barcode, price_cents");
        
        if (error) throw error;
        setVariants(data || []);
      } catch (err) {
        console.error("Failed to fetch variants:", err);
      } finally {
        setVariantsLoading(false);
      }
    };
    fetchVariants();
  }, []);

  // Build printable items list: products without variants shown as-is, 
  // products WITH variants show each variant as separate item
  const printableItems = useMemo(() => {
    const items: PrintableItem[] = [];
    
    for (const product of products) {
      const productVariants = variants.filter(v => v.product_id === product.id);
      
      if (productVariants.length === 0) {
        // No variants - show the product itself
        const barcode = product.barcode?.trim() || product.sku?.trim() || product.id.slice(0, 12).toUpperCase();
        items.push({
          id: product.id,
          productId: product.id,
          title: product.title,
          price: product.price_cents,
          barcode,
          sku: product.sku || undefined,
          image: product.images?.[0],
        });
      } else {
        // Has variants - show each variant as separate item
        for (const variant of productVariants) {
          const variantLabel = [variant.color, variant.size].filter(Boolean).join(" / ");
          const displayTitle = variantLabel ? `${product.title} - ${variantLabel}` : product.title;
          
          // Use variant barcode, fallback to variant SKU, then product barcode/SKU
          const barcode = 
            variant.barcode?.trim() || 
            variant.sku?.trim() || 
            product.barcode?.trim() || 
            product.sku?.trim() || 
            variant.id.slice(0, 12).toUpperCase();
          
          // Use variant price if set, otherwise product price
          const price = variant.price_cents ?? product.price_cents;
          
          items.push({
            id: `${product.id}|${variant.id}`,
            productId: product.id,
            variantId: variant.id,
            title: displayTitle,
            price,
            barcode,
            sku: variant.sku || product.sku || undefined,
            image: product.images?.[0],
          });
        }
      }
    }
    
    return items;
  }, [products, variants]);

  // Filter items for search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return printableItems.slice(0, 15);
    const query = searchQuery.toLowerCase();
    return printableItems.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.barcode.toLowerCase().includes(query)
    );
  }, [printableItems, searchQuery]);

  // Add item to queue
  const addToQueue = (item: PrintableItem) => {
    setQueue((prev) => {
      const existing = prev.find((q) => q.item.id === item.id);
      if (existing) {
        return prev.map((q) =>
          q.item.id === item.id
            ? { ...q, quantity: q.quantity + 1 }
            : q
        );
      }
      return [...prev, { item, quantity: 1 }];
    });
    setSearchQuery("");
  };

  // Update quantity in queue
  const updateQuantity = (itemId: string, delta: number) => {
    setQueue((prev) =>
      prev
        .map((q) =>
          q.item.id === itemId
            ? { ...q, quantity: Math.max(0, q.quantity + delta) }
            : q
        )
        .filter((q) => q.quantity > 0)
    );
  };

  // Remove from queue
  const removeFromQueue = (itemId: string) => {
    setQueue((prev) => prev.filter((q) => q.item.id !== itemId));
  };

  // Generate all labels for print
  const allLabels = useMemo(() => {
    const labels: { item: PrintableItem; index: number }[] = [];
    queue.forEach((q) => {
      for (let i = 0; i < q.quantity; i++) {
        labels.push({ item: q.item, index: i });
      }
    });
    return labels;
  }, [queue]);

  // Handle print
  const handlePrint = () => {
    window.print();
  };

  const isLoading = productsLoading || variantsLoading;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pos/management")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Tag className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Barcode Label Printer</h1>
                <p className="text-xs text-muted-foreground">Generate & print product labels</p>
              </div>
            </div>
          </div>
          <Button
            onClick={handlePrint}
            disabled={queue.length === 0}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print ({allLabels.length})
          </Button>
        </div>
      </header>

      {/* Print styles for 35x25mm thermal labels */}
      <style>
        {`
          #label-print-portal {
            display: none;
          }

          @media print {
            @page {
              size: 35mm 25mm;
              margin: 0 !important;
            }

            html, body {
              margin: 0 !important;
              padding: 0 !important;
              width: 35mm !important;
              height: 25mm !important;
              overflow: hidden !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }

            #root {
              display: none !important;
            }

            #label-print-portal {
              display: block !important;
            }

            .label-print-area {
              position: absolute;
              top: 0;
              left: 0;
              width: 35mm !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .single-sticker {
              width: 35mm !important;
              height: 25mm !important;
              max-width: 35mm !important;
              max-height: 25mm !important;
              min-width: 35mm !important;
              min-height: 25mm !important;
              background: white !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              text-align: center !important;
              overflow: hidden !important;
              page-break-after: always !important;
              break-after: page !important;
              padding: 1mm !important;
              box-sizing: border-box !important;
              margin: 0 !important;
            }

            .single-sticker:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }

            .label-product-name {
              font-size: 11px !important;
              font-weight: 700 !important;
              line-height: 1.15 !important;
              max-width: 32mm !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              margin: 0 !important;
              text-align: center !important;
            }

            .label-variant-name {
              font-size: 9px !important;
              font-weight: 600 !important;
              line-height: 1.15 !important;
              max-width: 32mm !important;
              overflow: hidden !important;
              text-overflow: ellipsis !important;
              white-space: nowrap !important;
              margin: 0 0 0.3mm 0 !important;
              text-align: center !important;
            }

            .label-price {
              font-size: 14px !important;
              font-weight: 800 !important;
              margin: 0 0 0.4mm 0 !important;
              text-align: center !important;
            }

            .label-barcode {
              width: 31mm !important;
              max-width: 31mm !important;
              height: 13mm !important;
              max-height: 13mm !important;
              overflow: hidden !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
            }

            .label-barcode svg {
              width: 31mm !important;
              height: 13mm !important;
              max-width: 31mm !important;
              max-height: 13mm !important;
              display: block !important;
              margin: 0 auto !important;
            }

            .label-barcode text {
              font-size: 11px !important;
              font-weight: 700 !important;
            }
          }
        `}
      </style>

      {/* Print-only DOM */}
      {allLabels.length > 0 && (
        <LabelPrintPortal>
          <div className="label-print-area">
            {allLabels.map((label) => (
              <div
                key={`${label.item.id}-${label.index}`}
                className="single-sticker"
              >
                {label.item.title.includes(" - ") ? (
                  <>
                    <p className="label-product-name font-semibold">{label.item.title.split(" - ")[0]}</p>
                    <p className="label-variant-name">{label.item.title.split(" - ").slice(1).join(" - ")}</p>
                  </>
                ) : (
                  <p className="label-product-name font-semibold">{label.item.title}</p>
                )}
                <p className="label-price">{formatPrice(label.item.price)}</p>
                <div className="label-barcode">
                  <Barcode
                    value={label.item.barcode}
                    format="CODE128"
                    width={1}
                    height={30}
                    fontSize={11}
                    textMargin={0}
                    margin={0}
                    displayValue={true}
                  />
                </div>
              </div>
            ))}
          </div>
        </LabelPrintPortal>
      )}

      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Products & Variants */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Add Products / Variants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, SKU, or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-64">
                  <div className="space-y-1">
                    {isLoading ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Loading products...
                      </p>
                    ) : filteredItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No items found
                      </p>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addToQueue(item)}
                          className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-muted transition-colors text-left"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.barcode} • {formatPrice(item.price)}
                            </p>
                          </div>
                          <Plus className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Print Queue */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  Print Queue
                  {queue.length > 0 && (
                    <Badge variant="secondary">{allLabels.length} labels</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {queue.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Add items to print their labels
                  </p>
                ) : (
                  <ScrollArea className="h-48">
                    <div className="space-y-2">
                      {queue.map((q) => (
                        <div
                          key={q.item.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex-1 min-w-0 mr-2">
                            <p className="text-sm font-medium truncate">
                              {q.item.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatPrice(q.item.price)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(q.item.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm font-medium">
                              {q.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(q.item.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeFromQueue(q.item.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Live Preview */}
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Live Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-muted/30 rounded-lg p-4 min-h-[400px]">
                {queue.length === 0 ? (
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                    <p className="text-sm">Add items to see preview</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div
                      id="print-area"
                      ref={printRef}
                      className="space-y-2 flex flex-col items-center"
                    >
                      {allLabels.slice(0, 20).map((label) => (
                        <div
                          key={`${label.item.id}-${label.index}`}
                          className="single-sticker bg-white flex flex-col items-center justify-center text-black border border-gray-300"
                          style={{
                            width: `${LABEL_WIDTH}mm`,
                            height: `${LABEL_HEIGHT}mm`,
                            padding: "1mm",
                            boxSizing: "border-box",
                            overflow: "hidden",
                          }}
                        >
                        {label.item.title.includes(" - ") ? (
                          <>
                            <p
                              className="label-product-name font-semibold text-center truncate w-full leading-tight"
                              style={{ fontSize: "8px", maxWidth: `${LABEL_WIDTH - 4}mm`, marginBottom: "0.2mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {label.item.title.split(" - ")[0]}
                            </p>
                            <p
                              className="label-variant-name text-center truncate w-full leading-tight"
                              style={{ fontSize: "7px", maxWidth: `${LABEL_WIDTH - 4}mm`, marginBottom: "0.3mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                            >
                              {label.item.title.split(" - ").slice(1).join(" - ")}
                            </p>
                          </>
                        ) : (
                          <p
                            className="label-product-name font-semibold text-center truncate w-full leading-tight"
                            style={{ fontSize: "8px", maxWidth: `${LABEL_WIDTH - 4}mm`, marginBottom: "0.5mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                          >
                            {label.item.title}
                          </p>
                        )}
                          <p
                            className="label-price font-bold"
                            style={{ fontSize: "10px", marginBottom: "0.5mm" }}
                          >
                            {formatPrice(label.item.price)}
                          </p>
                          <div
                            className="label-barcode"
                            style={{
                              maxWidth: `${LABEL_WIDTH - 4}mm`,
                              overflow: "hidden",
                            }}
                          >
                            <Barcode
                              value={label.item.barcode}
                              format="CODE128"
                              width={1}
                              height={24}
                              fontSize={8}
                              textMargin={0}
                              margin={0}
                              displayValue={true}
                            />
                          </div>
                        </div>
                      ))}
                      {allLabels.length > 20 && (
                        <p className="text-xs text-muted-foreground py-2">
                          Showing first 20 of {allLabels.length} labels...
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrintLabels;
