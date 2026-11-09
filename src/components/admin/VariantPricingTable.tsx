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
import type { VariantPricing } from "@/hooks/useProducts";

interface VariantPricingTableProps {
  colors: string[];
  sizes: string[];
  basePrice: number;
  baseCompareAtPrice: number | null;
  variants: VariantPricing[];
  onChange: (variants: VariantPricing[]) => void;
}

export function VariantPricingTable({
  colors,
  sizes,
  basePrice,
  baseCompareAtPrice,
  variants,
  onChange,
}: VariantPricingTableProps) {
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
  ): VariantPricing | undefined => {
    return variants.find(
      (v) =>
        (v.color || undefined) === color && (v.size || undefined) === size
    );
  };

  // Update a specific variant
  const updateVariant = (
    color: string | undefined,
    size: string | undefined,
    field: "price_cents" | "compare_at_price_cents",
    value: number | null
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

      // Remove if both prices are null/empty
      if (
        newVariants[existingIndex].price_cents === null &&
        !newVariants[existingIndex].compare_at_price_cents
      ) {
        newVariants.splice(existingIndex, 1);
      }
    } else if (value !== null) {
      // Add new
      newVariants.push({
        color,
        size,
        price_cents: field === "price_cents" ? value : null,
        compare_at_price_cents:
          field === "compare_at_price_cents" ? value : undefined,
      });
    }

    onChange(newVariants);
  };

  if (combinations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add colors or sizes above to set variant-specific pricing.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <Label className="text-sm font-medium">Variant Pricing</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          Leave empty to use base price (৳{basePrice.toLocaleString()})
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Variant</TableHead>
              <TableHead className="font-semibold">Price (৳)</TableHead>
              <TableHead className="font-semibold">Compare At (৳)</TableHead>
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
                      className="w-28"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder={
                        baseCompareAtPrice?.toString() || "Optional"
                      }
                      value={variant?.compare_at_price_cents ?? ""}
                      onChange={(e) =>
                        updateVariant(
                          color,
                          size,
                          "compare_at_price_cents",
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                      className="w-28"
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
