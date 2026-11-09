import { Link } from "react-router-dom";
import { useProductsByCategory, formatPrice, productPath, type Product } from "@/hooks/useProducts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating } from "@/components/ui/star-rating";

interface RelatedProductsProps {
  category: string;
  currentProductId: string;
}

export function RelatedProducts({ category, currentProductId }: RelatedProductsProps) {
  const { data: products = [] } = useProductsByCategory(category);
  
  // Filter out current product and limit to 4
  const relatedProducts = products
    .filter((p) => p.id !== currentProductId)
    .slice(0, 4);

  if (relatedProducts.length === 0) return null;

  return (
    <section className="mt-12" aria-label="Related products">
      <h2 className="mb-6 font-serif text-xl font-bold tracking-tight md:text-2xl">
        Related Products
      </h2>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {relatedProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

function ProductCard({ product }: { product: Product }) {
  return (
    <Link to={productPath(product)} className="group">
      <Card className="overflow-hidden rounded-2xl border-border/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <div className="relative aspect-square overflow-hidden bg-muted">
          <img
            src={product.images[0] || "/placeholder.svg"}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
          {product.badge && (
            <Badge className="absolute left-2 top-2 rounded-full bg-bubu-red text-bubu-red-foreground">
              {product.badge}
            </Badge>
          )}
          {(product.stock ?? 0) > 0 && (product.stock ?? 0) <= 5 && (
            <Badge className="absolute right-2 top-2 rounded-full bg-amber-500 text-white animate-pulse">
              Only {product.stock} left!
            </Badge>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="line-clamp-2 text-base font-bold leading-snug md:text-lg">
            {product.title}
          </h3>
          <div className="mt-1.5">
            <StarRating
              rating={product.rating || 0}
              reviewCount={product.reviewCount || 0}
              size="sm"
            />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-bold text-primary">
              {formatPrice(product.price)}
            </span>
            {product.compareAtPrice && (
              <span className="text-xs text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}