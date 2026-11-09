import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { useCart } from "@/context/cart";
import { Minus, Plus, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export type QuickViewProduct = {
  id: string;
  title: string;
  priceLabel: string;
  compareAtPriceLabel?: string;
  gallery: { src: string; alt: string }[];
  variants: {
    label: string;
    options: string[];
  }[];
  shipping: {
    delivery: string;
    returns: string;
    authenticity: string;
  };
  priceCents: number;
  slug?: string;
  category?: string;
  subcategory?: string;
};

type QuickViewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: QuickViewProduct | null;
};

export function QuickViewDialog({ open, onOpenChange, product }: QuickViewDialogProps) {
  const navigate = useNavigate();
  const { add } = useCart();

  const initialVariantState = useMemo(() => {
    if (!product) return {} as Record<string, string>;
    return Object.fromEntries(product.variants.map((v) => [v.label, v.options[0] ?? ""])) as Record<string, string>;
  }, [product]);

  const [variants, setVariants] = useState<Record<string, string>>(initialVariantState);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setVariants(initialVariantState);
    setQty(1);
  }, [initialVariantState, open]);

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden rounded-2xl p-0">
        <div className="grid gap-0 md:grid-cols-2">
          <div className="bg-background p-5 md:p-6">
            <Carousel opts={{ loop: true }} className="relative">
              <CarouselContent className="ml-0">
                {product.gallery.map((img) => (
                  <CarouselItem key={img.src} className="pl-0">
                    <div className="relative overflow-hidden rounded-xl border border-input bg-card">
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="h-[260px] w-full object-contain p-4 sm:h-[320px]"
                        loading="lazy"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                variant="ghost"
                className={cn(
                  "left-2 top-1/2 h-9 w-9 -translate-y-1/2",
                  "border border-input bg-background/70 text-foreground shadow-sm rounded-xl",
                )}
              />
              <CarouselNext
                variant="ghost"
                className={cn(
                  "right-2 top-1/2 h-9 w-9 -translate-y-1/2",
                  "border border-input bg-background/70 text-foreground shadow-sm rounded-xl",
                )}
              />
            </Carousel>
          </div>

          <div className="p-5 md:p-6">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl font-extrabold tracking-tight">{product.title}</DialogTitle>
              <DialogDescription className="text-sm">
                <span className="font-extrabold text-primary">{product.priceLabel}</span>
                {product.compareAtPriceLabel ? (
                  <span className="ml-2 text-muted-foreground line-through">{product.compareAtPriceLabel}</span>
                ) : null}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 grid gap-4">
              {product.variants.map((v) => (
                <div key={v.label} className="grid gap-2">
                  <div className="text-sm font-semibold">{v.label}</div>
                  <Select
                    value={variants[v.label]}
                    onValueChange={(value) => setVariants((prev) => ({ ...prev, [v.label]: value }))}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder={`Select ${v.label}`} />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border shadow-lg z-[100]">
                      {v.options.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}

              <div className="grid gap-2">
                <div className="text-sm font-semibold">Quantity</div>
                <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-input bg-background px-2 py-1 shadow-sm">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                  >
                    <Minus />
                  </Button>
                  <div className="min-w-8 text-center text-sm font-semibold">{qty}</div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => setQty((q) => q + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  className="w-full rounded-xl"
                  variant="brand"
                  onClick={() => {
                    add({ 
                      id: product.id, 
                      title: product.title, 
                      price: product.priceCents,
                      slug: product.slug,
                      category: product.category,
                      subcategory: product.subcategory,
                    }, qty);
                    onOpenChange(false);
                  }}
                >
                  Add to Cart
                </Button>
                <Button
                  className="w-full rounded-xl bg-bubu-red text-bubu-red-foreground hover:bg-bubu-red/90"
                  onClick={() => {
                    add({ 
                      id: product.id, 
                      title: product.title, 
                      price: product.priceCents,
                      slug: product.slug,
                      category: product.category,
                      subcategory: product.subcategory,
                    }, qty);
                    onOpenChange(false);
                    navigate("/checkout");
                  }}
                >
                  Buy Now
                </Button>
              </div>

              <Accordion type="single" collapsible className="mt-1">
                <AccordionItem value="shipping">
                  <AccordionTrigger className="text-sm">
                    <span className="inline-flex items-center gap-2">
                      <Truck className="h-4 w-4 text-bubu-green" /> Shipping & Returns
                    </span>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    <div className="grid gap-2">
                      <p>
                        <span className="font-semibold text-foreground">Delivery:</span> {product.shipping.delivery}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Returns:</span> {product.shipping.returns}
                      </p>
                      <p>
                        <span className="font-semibold text-foreground">Authenticity:</span> {product.shipping.authenticity}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}