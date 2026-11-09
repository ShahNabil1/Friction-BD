import { useAuth } from "@/context/auth";
import { Navigate, useLocation } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" className="text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/auth/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <>{children}</>;
};
