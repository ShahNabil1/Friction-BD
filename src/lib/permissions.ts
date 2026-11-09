import { PERMISSION_PATH_MAP, PermissionSlug } from "@/hooks/useUserRole";

/**
 * Extract permission slug from an admin path
 * e.g., /admin/orders -> orders
 */
export function getPermissionFromPath(path: string): PermissionSlug | null {
  const match = path.match(/^\/admin\/([^/?]+)/);
  if (!match) return null;

  const section = match[1];

  // Special cases: some paths don't require permission checks
  if (section === "onboarding") return null;
  if (section === "unauthorized") return null;
  
  // Super admin only paths
  if (section === "users") return null;
  if (section === "pos-management") return null;

  // Map path sections to permission slugs
  const pathToPermission: Record<string, PermissionSlug> = {
    dashboard: "dashboard",
    orders: "orders",
    "abandoned-checkouts": "lead_recovery",
    courier: "courier",
    inventory: "inventory",
    products: "products",
    categories: "categories",
    brands: "brands",
    reviews: "reviews",
    customers: "customers",
    reports: "reports",
    website: "website",
  };

  return pathToPermission[section] || null;
}

/**
 * Get the first allowed admin path based on user permissions
 */
export function getFirstAllowedPath(userPermissions: string[]): string {
  if (userPermissions.length === 0) return "/admin/dashboard";

  // Try to find the first allowed path
  for (const perm of userPermissions) {
    const path = PERMISSION_PATH_MAP[perm as PermissionSlug];
    if (path) return path;
  }

  return "/admin/dashboard";
}
