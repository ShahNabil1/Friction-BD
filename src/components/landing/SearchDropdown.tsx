import { cn } from "@/lib/utils";
import { formatPrice, productPath, type Product } from "@/hooks/useProducts";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

interface SearchDropdownProps {
  query: string;
  results: Product[];
  activeIndex: number;
  onHoverIndex: (index: number) => void;
  onSelect: () => void;
  className?: string;
}

export function SearchDropdown({
  query,
  results,
  activeIndex,
  onHoverIndex,
  onSelect,
  className,
}: SearchDropdownProps) {
  const displayed = results.slice(0, 6);
  const hasMore = results.length > 6;

  if (!query.trim()) return null;

  if (results.length === 0) {
    return (
      <div
        className={cn(
          "absolute left-0 right-0 top-full mt-2 z-50",
          "rounded-xl border border-input bg-background shadow-xl",
          "p-4 text-center",
          className,
        )}
        role="status"
        aria-live="polite"
      >
        <p className="text-sm text-muted-foreground">No products found for "{query}"</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "absolute left-0 right-0 top-full mt-2 z-50",
        "rounded-xl border border-input bg-background shadow-xl",
        "max-h-[400px] overflow-y-auto",
        className,
      )}
      role="listbox"
      aria-label="Search results"
    >
      <div className="divide-y divide-border">
        {displayed.map((product, idx) => {
          const isActive = idx === activeIndex;
          return (
            <Link
              key={product.id}
              to={productPath(product)}
              // Prevent input blur on touch/mouse down so the tap can register
              onPointerDown={(e) => e.preventDefault()}
              onMouseDown={(e) => e.preventDefault()}
              onClick={onSelect}
              onMouseEnter={() => onHoverIndex(idx)}
              className={cn(
                "flex items-center gap-4 p-3",
                "transition-colors hover:bg-accent",
                isActive && "bg-accent",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
              )}
              role="option"
              aria-selected={isActive}
              id={`search-result-${idx}`}
            >
              <img
                src={product.images[0]}
                alt={product.title}
                className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{product.title}</p>
                <p className="text-sm font-bold text-primary">{formatPrice(product.price)}</p>
              </div>
              <div
                role="button"
                tabIndex={0}
                aria-label={`Go to ${product.title}`}
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect();
                  window.location.href = productPath(product);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect();
                    window.location.href = productPath(product);
                  }
                }}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 active:bg-primary/30 transition-colors touch-manipulation"
              >
                <ChevronRight className="w-5 h-5 text-primary" />
              </div>
            </Link>
          );
        })}
      </div>

      {hasMore && (
        <div className="border-t border-border p-3 text-center">
          <Link
            to={`/search?q=${encodeURIComponent(query)}`}
            onClick={onSelect}
            className="text-sm font-semibold text-primary hover:underline"
          >
            See All Results ({results.length})
          </Link>
        </div>
      )}
    </div>
  );
}
