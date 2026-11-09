import { Minus, Plus, Trash2, User, Percent } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { POSCartItem, POSCustomer } from "@/hooks/usePOSCart";
import { cn } from "@/lib/utils";

interface POSCartProps {
  items: POSCartItem[];
  customer: POSCustomer | null;
  discount: number;
  subtotal: number;
  total: number;
  onUpdateQuantity: (index: number, quantity: number) => void;
  onRemoveItem: (index: number) => void;
  onSetCustomer: (customer: POSCustomer | null) => void;
  onSetDiscount: (discount: number) => void;
  onOpenCustomerSearch: () => void;
}

export function POSCart({
  items,
  customer,
  discount,
  subtotal,
  total,
  onUpdateQuantity,
  onRemoveItem,
  onSetCustomer,
  onSetDiscount,
  onOpenCustomerSearch,
}: POSCartProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Customer Section */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Customer
          </h3>
          {customer && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs text-destructive hover:text-destructive"
              onClick={() => onSetCustomer(null)}
            >
              Clear
            </Button>
          )}
        </div>
        {customer ? (
          <div className="mt-2 rounded-lg bg-muted/50 p-3">
            <p className="font-medium">{customer.name}</p>
            <p className="text-sm text-muted-foreground">{customer.phone}</p>
          </div>
        ) : (
          <Button
            variant="outline"
            className="mt-2 w-full justify-start"
            onClick={onOpenCustomerSearch}
          >
            <User className="mr-2 h-4 w-4" />
            Add Customer (Optional)
          </Button>
        )}
      </div>

      {/* Cart Items */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {items.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-muted-foreground">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={`${item.product.id}-${item.selectedSize}-${item.selectedColor}-${index}`}
                  className="group rounded-lg border bg-card p-3"
                >
                  <div className="flex gap-3">
                    {/* Product Image */}
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
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

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-1 text-sm font-medium">
                        {item.product.title}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-1">
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
                      <p className="mt-1 text-sm font-semibold text-primary">
                        {formatPrice(item.unitPrice)}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Controls */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => onUpdateQuantity(index, item.quantity - 1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className={cn(
                          "h-8 w-8",
                          item.quantity >= item.maxStock && "opacity-50 cursor-not-allowed"
                        )}
                        onClick={() => onUpdateQuantity(index, item.quantity + 1)}
                        disabled={item.quantity >= item.maxStock}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </p>
                      {item.maxStock < 10 && (
                        <p className="text-xs text-muted-foreground">
                          {item.maxStock - item.quantity} left
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Discount Section */}
      {items.length > 0 && (
        <div className="border-t p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                placeholder="Discount amount"
                value={discount || ""}
                onChange={(e) => onSetDiscount(Number(e.target.value) || 0)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="border-t bg-muted/30 p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-green-600">
              <span>Discount</span>
              <span>- {formatPrice(discount)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
