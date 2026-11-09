import type { NavigateFunction } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "admin" | "moderator" | "customer";

export function sanitizeNextPath(nextPath?: string | null): string | null {
  if (!nextPath) return null;

  // Only allow internal, relative paths.
  if (!nextPath.startsWith("/")) return null;
  if (nextPath.startsWith("//")) return null;
  if (nextPath.includes("://")) return null;

  return nextPath;
}

export async function getUserRole(userId: string): Promise<AppRole> {
  try {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    const role = (data as any)?.role as AppRole | undefined;
    return role || "customer";
  } catch {
    return "customer";
  }
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const { data } = await supabase
      .from("profiles")
      .select("permissions")
      .eq("id", userId)
      .maybeSingle();

    return (data?.permissions as string[]) || [];
  } catch {
    return [];
  }
}

export async function redirectAfterLogin(
  navigate: NavigateFunction,
  userId: string,
  nextPath?: string | null,
) {
  const safeNext = sanitizeNextPath(nextPath);
  const role = await getUserRole(userId);

  const isAdminRole = role === "super_admin" || role === "admin" || role === "moderator";

  // Check if user has POS access and should be redirected there
  if (role === "moderator") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("can_access_pos, assigned_outlet_id")
      .eq("id", userId)
      .maybeSingle();

    // If moderator has POS access but NO admin permissions, redirect directly to POS
    const permissions = await getUserPermissions(userId);
    
    if (profile?.can_access_pos === true && permissions.length === 0) {
      // POS-only user - force redirect to POS
      navigate("/pos", { replace: true });
      return;
    }
  }

  // Handle /pos route specifically - it requires special permission check
  if (safeNext === "/pos") {
    if (role === "super_admin" || role === "admin") {
      // Super admins and admins have automatic POS access
      navigate("/pos", { replace: true });
      return;
    }
    
    // For moderators, check can_access_pos flag
    if (role === "moderator") {
      const { data } = await supabase
        .from("profiles")
        .select("can_access_pos")
        .eq("id", userId)
        .maybeSingle();
      
      if (data?.can_access_pos === true) {
        navigate("/pos", { replace: true });
        return;
      }
    }
    
    // No POS access - redirect to unauthorized
    navigate("/admin/unauthorized", { replace: true });
    return;
  }

  if (isAdminRole) {
    // Admins always go to admin dashboard
    // If they have a specific admin path AND it's valid, use it
    if (safeNext?.startsWith("/admin")) {
      // For moderators, we need to verify they have permission
      if (role === "moderator" || role === "admin") {
        const permissions = await getUserPermissions(userId);
        const targetSlug = getSlugFromPath(safeNext);
        
        // If they have permission for the target path, go there
        if (targetSlug && permissions.includes(targetSlug)) {
          navigate(safeNext, { replace: true });
          return;
        }
        
        // Otherwise, find their first allowed page
        if (permissions.length > 0) {
          const firstAllowedPath = `/admin/${permissions[0]}`;
          navigate(firstAllowedPath, { replace: true });
          return;
        }
      }
      
      // Super admin can go anywhere
      if (role === "super_admin") {
        navigate(safeNext, { replace: true });
        return;
      }
    }
    
    // Default: go to admin dashboard
    navigate("/admin/dashboard", { replace: true });
    return;
  }

  // Customer role: NEVER allow access to admin routes or POS
  // Redirect to home page
  if (safeNext && !safeNext.startsWith("/admin") && !safeNext.startsWith("/auth") && safeNext !== "/pos") {
    // Allow customers to go to their intended non-admin path (e.g., /checkout)
    navigate(safeNext, { replace: true });
    return;
  }

  // Default for customers: go to home page
  navigate("/", { replace: true });
}

// Helper to extract permission slug from admin path
function getSlugFromPath(path: string): string | null {
  const match = path.match(/^\/admin\/([^/?]+)/);
  return match ? match[1] : null;
}

export async function startGoogleOAuth(nextPath?: string | null): Promise<{ error?: string }> {
  const safeNext = sanitizeNextPath(nextPath);
  const callbackUrl = `${window.location.origin}/auth/callback${
    safeNext ? `?next=${encodeURIComponent(safeNext)}` : ""
  }`;

  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
      },
    });

    return error ? { error: error.message } : {};
  } catch {
    return { error: "Unable to start Google sign-in. Please try again." };
  }
}
