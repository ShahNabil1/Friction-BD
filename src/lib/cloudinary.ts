// Cloudinary configuration for Friction
export const CLOUDINARY_CLOUD_NAME = "dmzuspsja";

/**
 * Transform a Cloudinary URL to add optimizations
 * Supports automatic format conversion (WebP/AVIF) and responsive sizing
 */
export function optimizeCloudinaryUrl(
  url: string,
  options: {
    width?: number;
    height?: number;
    quality?: "auto" | "auto:low" | "auto:eco" | "auto:good" | "auto:best" | number;
    format?: "auto" | "webp" | "avif" | "jpg" | "png";
    crop?: "fill" | "fit" | "scale" | "thumb" | "crop" | "pad" | "limit";
    gravity?: "auto" | "face" | "center" | "north" | "south" | "east" | "west";
  } = {}
): string {
  // If not a Cloudinary URL, return as-is
  if (!url || !url.includes("res.cloudinary.com")) {
    return url;
  }

  const {
    width,
    height,
    quality = "auto",
    format = "auto",
    crop = "fill",
    gravity = "auto",
  } = options;

  // Build transformation string
  const transforms: string[] = [];

  if (width) transforms.push(`w_${width}`);
  if (height) transforms.push(`h_${height}`);
  if (crop) transforms.push(`c_${crop}`);
  // Only add gravity for crop modes that support it
  if (gravity && (crop === "fill" || crop === "thumb" || crop === "crop")) {
    transforms.push(`g_${gravity}`);
  }
  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  // Add progressive loading for JPGs
  if (format !== "webp" && format !== "avif") {
    transforms.push("fl_progressive");
  }

  const transformString = transforms.join(",");

  // Insert transformation after /upload/
  return url.replace(
    /\/upload\//,
    `/upload/${transformString}/`
  );
}

/**
 * Generate srcSet for responsive images
 */
export function generateSrcSet(
  url: string,
  widths: number[] = [320, 480, 640, 800, 1024, 1280]
): string {
  if (!url || !url.includes("res.cloudinary.com")) {
    return "";
  }

  return widths
    .map((w) => `${optimizeCloudinaryUrl(url, { width: w })} ${w}w`)
    .join(", ");
}

/**
 * Get optimized thumbnail URL
 */
export function getThumbnail(url: string, size: number = 150): string {
  return optimizeCloudinaryUrl(url, {
    width: size,
    height: size,
    crop: "thumb",
    gravity: "auto",
  });
}

/**
 * Get optimized product image URL
 */
export function getProductImage(
  url: string,
  size: "small" | "medium" | "large" | "full" = "medium"
): string {
  const sizeMap = {
    small: { width: 300, height: 300 },
    medium: { width: 600, height: 600 },
    large: { width: 900, height: 900 },
    full: { width: 1200, height: 1200 },
  };

  const { width, height } = sizeMap[size];

  return optimizeCloudinaryUrl(url, {
    width,
    height,
    crop: "fill",
    gravity: "auto",
  });
}

/**
 * Get optimized hero/banner image URL
 */
export function getHeroImage(url: string, width: number = 1920): string {
  return optimizeCloudinaryUrl(url, {
    width,
    height: Math.round(width * 0.5), // 2:1 aspect ratio
    crop: "fill",
    gravity: "auto",
  });
}

/**
 * Get optimized category card image
 */
export function getCategoryImage(url: string): string {
  return optimizeCloudinaryUrl(url, {
    width: 400,
    height: 400,
    crop: "fill",
    gravity: "auto",
  });
}
