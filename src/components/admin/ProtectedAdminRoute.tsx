import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { getPermissionFromPath, getFirstAllowedPath } from "@/lib/permissions";

interface ProtectedAdminRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export const ProtectedAdminRoute = ({
  children,
  requiredPermission,
}: ProtectedAdminRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const { isLoading: roleLoading, isAdmin, isSuperAdmin, userPermissions, error: roleError, retry: retryRole } = useUserRole();
  const location = useLocation();

  // Wait for BOTH auth and role to finish loading before making any decisions
  const isStillLoading = authLoading || roleLoading;

  if (isStillLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-primary" />
          <p className="text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  // Show error with retry if role fetch failed
  if (roleError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="text-destructive font-medium">{roleError}</p>
          <Button onClick={retryRole} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Only redirect after loading is complete
  if (!user) {
    return <Navigate to="/auth/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/account" replace />;
  }

  // Super admins have access to everything
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Check if current path requires a specific permission
  const currentPermission = getPermissionFromPath(location.pathname);
  
  // Super admin only pages
  if (location.pathname === "/admin/users" || location.pathname === "/admin/employee-activity") {
    const firstAllowed = getFirstAllowedPath(userPermissions);
    return <Navigate to={firstAllowed} replace />;
  }

  // Check page-level permission
  if (currentPermission && !userPermissions.includes(currentPermission)) {
    const firstAllowed = getFirstAllowedPath(userPermissions);
    return <Navigate to={firstAllowed} replace />;
  }

  // Check explicit required permission prop
  if (requiredPermission && !userPermissions.includes(requiredPermission)) {
    const firstAllowed = getFirstAllowedPath(userPermissions);
    return <Navigate to={firstAllowed} replace />;
  }

  return <>{children}</>;
};
