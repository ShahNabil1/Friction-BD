import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, Wand2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface VariantStock {
  color?: string;
  size?: string;
  sku?: string;
  barcode?: string;
  stock_quantity: number; // Keep for DB compatibility, but defaults to 0
  price_cents?: number | null;
  compare_at_price_cents?: number | null;
}

interface VariantStockTableProps {
  colors: string[];
  sizes: string[];
  basePrice: number;
  baseCompareAtPrice: number | null;
  baseStock: number;
  variants: VariantStock[];
  onChange: (variants: VariantStock[]) => void;
}

export function VariantStockTable({
  colors,
  sizes,
  basePrice,
  baseCompareAtPrice,
  variants,
  onChange,
}: VariantStockTableProps) {
  // Generate all possible combinations
  const combinations = useMemo(() => {
    const result: Array<{ color?: string; size?: string; key: string }> = [];

    if (colors.length > 0 && sizes.length > 0) {
      // Both colors and sizes - create grid
      for (const color of colors) {
        for (const size of sizes) {
          result.push({ color, size, key: `${color}|${size}` });
        }
      }
    } else if (colors.length > 0) {
      // Only colors
      for (const color of colors) {
        result.push({ color, key: color });
      }
    } else if (sizes.length > 0) {
      // Only sizes
      for (const size of sizes) {
        result.push({ size, key: size });
      }
    }

    return result;
  }, [colors, sizes]);

  // Get current variant value
  const getVariantValue = (
    color?: string,
    size?: string
  ): VariantStock | undefined => {
    return variants.find(
      (v) =>
        (v.color || undefined) === color && (v.size || undefined) === size
    );
  };

  // Update a specific variant field
  const updateVariant = (
    color: string | undefined,
    size: string | undefined,
    field: keyof VariantStock,
    value: number | string | null
  ) => {
    const existingIndex = variants.findIndex(
      (v) =>
        (v.color || undefined) === color && (v.size || undefined) === size
    );

    const newVariants = [...variants];

    if (existingIndex >= 0) {
      // Update existing
      newVariants[existingIndex] = {
        ...newVariants[existingIndex],
        [field]: value,
      };
    } else {
      // Add new - stock defaults to 0 (managed via POS Inventory)
      newVariants.push({
        color,
        size,
        stock_quantity: 0, // Always 0 - stock managed per-outlet
        sku: field === "sku" ? (value as string) : undefined,
        barcode: field === "barcode" ? (value as string) : undefined,
        price_cents: field === "price_cents" ? (value as number) : null,
        compare_at_price_cents: field === "compare_at_price_cents" ? (value as number) : null,
      });
    }

    onChange(newVariants);
  };

  // Generate CODE128 compatible barcode for a specific variant (alphanumeric 8-10 chars)
  const generateVariantBarcode = (color?: string, size?: string) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = 8 + Math.floor(Math.random() * 3); // 8-10 chars
    let barcode = "";
    for (let i = 0; i < length; i++) {
      barcode += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    updateVariant(color, size, "barcode", barcode);
  };

  if (combinations.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Add colors or sizes above to configure variants.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Variant Details</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure SKU, barcode, and pricing for each variant. Stock is managed per-outlet in POS Inventory.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold min-w-[120px]">Variant</TableHead>
              <TableHead className="font-semibold w-24">SKU</TableHead>
              <TableHead className="font-semibold w-36">Barcode</TableHead>
              <TableHead className="font-semibold w-24">Price (৳)</TableHead>
              <TableHead className="font-semibold w-24">Compare (৳)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinations.map(({ color, size, key }) => {
              const variant = getVariantValue(color, size);
              const label = [color, size].filter(Boolean).join(" / ");

              return (
                <TableRow key={key}>
                  <TableCell className="font-medium">{label}</TableCell>
                  <TableCell>
                    <Input
                      placeholder="Auto"
                      value={variant?.sku ?? ""}
                      onChange={(e) =>
                        updateVariant(
                          color,
                          size,
                          "sku",
                          e.target.value.toUpperCase() || null
                        )
                      }
                      className="w-20 h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Input
                        placeholder="Scan..."
                        value={variant?.barcode ?? ""}
                        onChange={(e) =>
                          updateVariant(
                            color,
                            size,
                            "barcode",
                            e.target.value.toUpperCase() || null
                          )
                        }
                        className="w-24 h-8 text-sm"
                      />
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 shrink-0"
                              onClick={() => generateVariantBarcode(color, size)}
                            >
                              <Wand2 className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Generate Barcode</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder={basePrice.toString()}
                      value={variant?.price_cents ?? ""}
                      onChange={(e) =>
                        updateVariant(
                          color,
                          size,
                          "price_cents",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-24 h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder={baseCompareAtPrice?.toString() || "-"}
                      value={variant?.compare_at_price_cents ?? ""}
                      onChange={(e) =>
                        updateVariant(
                          color,
                          size,
                          "compare_at_price_cents",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-24 h-8 text-sm"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        💡 Leave price empty to use base price. SKU auto-generates if empty. Add stock via POS → Inventory → Receive Goods.
      </p>
    </div>
  );
}