import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/context/auth";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "moderator" | "customer";

// All available permission slugs
export const PERMISSION_SLUGS = [
  "dashboard",
  "orders",
  "lead_recovery",
  "courier",
  "inventory",
  "products",
  "categories",
  "brands",
  "reviews",
  "customers",
  "reports",
  "website",
] as const;

export type PermissionSlug = (typeof PERMISSION_SLUGS)[number];

// Map permission slugs to admin paths
export const PERMISSION_PATH_MAP: Record<PermissionSlug, string> = {
  dashboard: "/admin/dashboard",
  orders: "/admin/orders",
  lead_recovery: "/admin/abandoned-checkouts",
  courier: "/admin/courier",
  inventory: "/admin/inventory",
  products: "/admin/products",
  categories: "/admin/categories",
  brands: "/admin/brands",
  reviews: "/admin/reviews",
  customers: "/admin/customers",
  reports: "/admin/reports",
  website: "/admin/website",
};

// Role priority for picking highest privilege
const ROLE_PRIORITY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  customer: 1,
};

function getHighestRole(roles: string[]): AppRole {
  if (roles.length === 0) return "customer";
  return roles.reduce((highest, current) => {
    return (ROLE_PRIORITY[current] || 0) > (ROLE_PRIORITY[highest] || 0)
      ? current
      : highest;
  }, roles[0]) as AppRole;
}

interface UserRoleState {
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  permissions: string[];
  userPermissions: string[];
  error: string | null;
  retry: () => void;
}

export const useUserRole = (): UserRoleState => {
  const { user, isLoading: authLoading } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fetchCountRef = useRef(0);
  const lastUserIdRef = useRef<string | null>(null);

  const fetchRole = useCallback(async (userId: string) => {
    const currentFetch = ++fetchCountRef.current;

    try {
      setError(null);

      // Fetch all roles (handles multiple entries gracefully)
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      // Stale fetch guard
      if (currentFetch !== fetchCountRef.current) return;

      if (roleError) {
        console.error("Error fetching role:", roleError);
        setError("Failed to verify access. Please refresh.");
        setRole("customer");
        setPermissions([]);
        setUserPermissions([]);
        setIsLoading(false);
        return;
      }

      const roles = (roleData || []).map((r: any) => r.role as string);
      const currentRole = getHighestRole(roles);
      setRole(currentRole);

      // For super_admin, grant all permissions
      if (currentRole === "super_admin") {
        const allPaths = Object.values(PERMISSION_PATH_MAP);
        setPermissions(allPaths);
        setUserPermissions(PERMISSION_SLUGS as unknown as string[]);
      } else if (currentRole === "admin" || currentRole === "moderator") {
        // Fetch user-specific permissions from profiles table
        const { data: profileData } = await supabase
          .from("profiles")
          .select("permissions")
          .eq("id", userId)
          .maybeSingle();

        if (currentFetch !== fetchCountRef.current) return;

        const userPerms = (profileData?.permissions as string[]) || [];
        setUserPermissions(userPerms);

        const paths = userPerms
          .map((slug) => PERMISSION_PATH_MAP[slug as PermissionSlug])
          .filter(Boolean);
        setPermissions(paths);
      } else {
        setPermissions([]);
        setUserPermissions([]);
      }
    } catch (err) {
      if (currentFetch !== fetchCountRef.current) return;
      console.error("Error in useUserRole:", err);
      setError("Failed to verify access. Please refresh.");
      setRole("customer");
    } finally {
      if (currentFetch === fetchCountRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const retry = useCallback(() => {
    if (user) {
      setIsLoading(true);
      setError(null);
      fetchRole(user.id);
    }
  }, [user, fetchRole]);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) return;

    if (!user) {
      setRole(null);
      setPermissions([]);
      setUserPermissions([]);
      setIsLoading(false);
      setError(null);
      lastUserIdRef.current = null;
      return;
    }

    // Only refetch if user changed
    if (lastUserIdRef.current === user.id) return;
    lastUserIdRef.current = user.id;

    setIsLoading(true);
    fetchRole(user.id);
  }, [user, authLoading, fetchRole]);

  return {
    role,
    isLoading,
    isAdmin: role === "super_admin" || role === "admin" || role === "moderator",
    isSuperAdmin: role === "super_admin",
    permissions,
    userPermissions,
    error,
    retry,
  };
};
