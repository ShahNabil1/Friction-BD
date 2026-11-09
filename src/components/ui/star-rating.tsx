import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  reviewCount?: number;
  className?: string;
}

const sizeClasses = {
  sm: "h-3 w-3",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export function StarRating({
  rating,
  maxStars = 5,
  size = "sm",
  showCount = true,
  reviewCount = 0,
  className,
}: StarRatingProps) {
  const starSize = sizeClasses[size];
  const roundedRating = Math.round(rating * 2) / 2; // Round to nearest 0.5

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {Array.from({ length: maxStars }).map((_, i) => {
          const fillLevel = Math.min(Math.max(roundedRating - i, 0), 1);
          
          return (
            <span key={i} className="relative">
              {/* Background (empty) star */}
              <Star
                className={cn(starSize, "text-muted-foreground/30")}
                fill="none"
                strokeWidth={1.5}
              />
              {/* Foreground (filled) star - overlaid with clip */}
              {fillLevel > 0 && (
                <span
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${fillLevel * 100}%` }}
                >
                  <Star
                    className={cn(starSize, "text-bubu-green")}
                    fill="currentColor"
                    strokeWidth={0}
                  />
                </span>
              )}
            </span>
          );
        })}
      </div>
      {showCount && (
        <span className="text-xs text-muted-foreground">
          {reviewCount > 0 ? `(${reviewCount})` : "(0)"}
        </span>
      )}
    </div>
  );
}
