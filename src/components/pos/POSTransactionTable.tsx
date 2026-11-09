import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { POSCartItem } from "@/hooks/usePOSCart";
import { cn } from "@/lib/utils";

interface POSTransactionTableProps {
  items: POSCartItem[];
  selectedIndex: number | null;
  onSelectItem: (index: number | null) => void;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
}

export function POSTransactionTable({
  items,
  selectedIndex,
  onSelectItem,
  onUpdateQuantity,
  onRemoveItem,
}: POSTransactionTableProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-transparent">
        <div className="rounded-2xl bg-muted/50 p-8 mb-4">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
        </div>
        <h3 className="text-base font-medium text-muted-foreground mb-1">
          No items yet
        </h3>
        <p className="text-sm text-muted-foreground/70 max-w-xs">
          Search or scan a barcode to add products
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 bg-background">
      <Table>
        <TableHeader className="sticky top-0 bg-muted z-10">
          <TableRow className="hover:bg-transparent border-b border-border">
            <TableHead className="w-[50%] text-muted-foreground">Product</TableHead>
            <TableHead className="w-[20%] text-center text-muted-foreground">Quantity</TableHead>
            <TableHead className="w-[15%] text-right text-muted-foreground">Price</TableHead>
            <TableHead className="w-[15%] text-right text-muted-foreground">Total</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow
              key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
              className={cn(
                "cursor-pointer transition-colors border-b border-border",
                selectedIndex === index
                  ? "bg-primary/10"
                  : "hover:bg-muted/50"
              )}
              onClick={() => onSelectItem(selectedIndex === index ? null : index)}
            >
              {/* Product Info */}
              <TableCell className="py-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                    {item.product.images?.[0] ? (
                      <img
                        src={item.product.images[0]}
                        alt={item.product.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        N/A
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{item.product.title}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.selectedSize && (
                        <Badge variant="secondary" className="text-xs">
                          {item.selectedSize}
                        </Badge>
                      )}
                      {item.selectedColor && (
                        <Badge variant="secondary" className="text-xs">
                          {item.selectedColor}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </TableCell>

              {/* Quantity Controls */}
              <TableCell>
                <div className="flex items-center justify-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(index, item.quantity - 1);
                    }}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center font-semibold text-lg text-foreground">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateQuantity(index, item.quantity + 1);
                    }}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </TableCell>

              {/* Unit Price */}
              <TableCell className="text-right font-medium text-muted-foreground">
                {formatPrice(item.unitPrice)}
              </TableCell>

              {/* Line Total */}
              <TableCell className="text-right font-bold text-primary">
                {formatPrice(item.unitPrice * item.quantity)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ScrollArea>
  );
}
