import { useMemo } from "react";
import { optimizeCloudinaryUrl, generateSrcSet } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  sizes?: string;
  className?: string;
  priority?: boolean;
  objectFit?: "cover" | "contain" | "fill" | "none";
  aspectRatio?: string;
}

/**
 * Optimized image component that automatically applies Cloudinary transformations
 * for WebP/AVIF format conversion and responsive sizes
 */
export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw",
  className,
  priority = false,
  objectFit = "cover",
  aspectRatio,
}: OptimizedImageProps) {
  const optimizedSrc = useMemo(() => {
    return optimizeCloudinaryUrl(src, { width, height });
  }, [src, width, height]);

  const srcSet = useMemo(() => {
    return generateSrcSet(src);
  }, [src]);

  const isCloudinary = src?.includes("res.cloudinary.com");

  return (
    <img
      src={optimizedSrc}
      srcSet={isCloudinary ? srcSet : undefined}
      sizes={isCloudinary ? sizes : undefined}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      className={cn(
        objectFit === "cover" && "object-cover",
        objectFit === "contain" && "object-contain",
        objectFit === "fill" && "object-fill",
        className
      )}
      style={aspectRatio ? { aspectRatio } : undefined}
    />
  );
}

/**
 * Product image with preset optimizations
 */
export function ProductImage({
  src,
  alt,
  size = "medium",
  className,
  priority = false,
}: {
  src: string;
  alt: string;
  size?: "small" | "medium" | "large" | "full";
  className?: string;
  priority?: boolean;
}) {
  const sizeMap = {
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 900, height: 900 },
    full: { width: 1200, height: 1200 },
  };

  const { width, height } = sizeMap[size];

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      sizes={
        size === "small"
          ? "(max-width: 640px) 50vw, 150px"
          : size === "medium"
          ? "(max-width: 640px) 100vw, 300px"
          : "(max-width: 1024px) 100vw, 600px"
      }
    />
  );
}

/**
 * Category card image with preset optimizations
 */
export function CategoryImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={400}
      className={className}
      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 200px"
    />
  );
}

/**
 * Hero/banner image with preset optimizations
 */
export function HeroImage({
  src,
  alt,
  className,
  priority = true,
}: {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={1920}
      height={960}
      className={className}
      priority={priority}
      sizes="100vw"
    />
  );
}
