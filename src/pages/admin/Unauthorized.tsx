import { ShieldX, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const handleGoBack = () => {
    if (isAdmin) {
      navigate("/admin/dashboard");
    } else if (user) {
      navigate("/account");
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10">
          <ShieldX className="h-10 w-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">403 - Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page. Please contact your administrator if you believe this is an error.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={handleGoBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
          <Button onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
