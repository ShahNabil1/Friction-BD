import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ProtectedPOSRouteProps {
  children: React.ReactNode;
}

export const ProtectedPOSRoute = ({ children }: ProtectedPOSRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: roleLoading, role, isSuperAdmin } = useUserRole();
  const location = useLocation();
  const [canAccessPOS, setCanAccessPOS] = useState<boolean | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);

  useEffect(() => {
    const checkPOSAccess = async () => {
      // If auth is still loading, wait for it
      if (authLoading) return;

      // If no user after auth loading is done, stop checking - will redirect to login
      if (!user) {
        setCheckingAccess(false);
        return;
      }

      // If role is still loading, wait for it
      if (roleLoading) return;

      // Super admins and admins have automatic access
      if (isSuperAdmin || role === "admin") {
        setCanAccessPOS(true);
        setCheckingAccess(false);
        return;
      }

      // For moderators and other users, check the can_access_pos flag
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("can_access_pos")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error checking POS access:", error);
          setCanAccessPOS(false);
        } else {
          setCanAccessPOS(data?.can_access_pos === true);
        }
      } catch (err) {
        console.error("Error checking POS access:", err);
        setCanAccessPOS(false);
      } finally {
        setCheckingAccess(false);
      }
    };

    checkPOSAccess();
  }, [user, authLoading, roleLoading, role, isSuperAdmin]);

  // Only show loading if auth is still checking OR if we have a user and are checking access
  const isStillLoading = authLoading || (user && (roleLoading || checkingAccess));

  if (isStillLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-primary" />
          <p className="text-muted-foreground">Verifying POS access...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - redirect to login with return path
  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth/login?next=${encodeURIComponent(next)}`} replace />;
  }

  // No POS access - redirect to 403 page
  if (!canAccessPOS) {
    return <Navigate to="/admin/unauthorized" replace />;
  }

  return <>{children}</>;
};
