import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Package, LogOut, Phone, Settings, Monitor } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { startGoogleOAuth } from "@/lib/authRedirect";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";

interface UserDropdownProps {
  variant?: "desktop" | "mobile";
}

export function UserDropdown({ variant: _variant = "desktop" }: UserDropdownProps) {
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const navigate = useNavigate();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [profileName, setProfileName] = useState<string | null>(null);
  const [canAccessPos, setCanAccessPos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch profile data including POS access
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, can_access_pos, role")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.full_name) {
        setProfileName(data.full_name);
      } else {
        // Fallback to user metadata or phone
        setProfileName(
          user.user_metadata?.full_name || 
          user.phone?.slice(-4) ? `User ${user.phone?.slice(-4)}` :
          "User"
        );
      }

      // Check if user can access POS (via flag or staff role)
      const staffRoles = ["super_admin", "admin", "moderator", "store_manager"];
      const hasStaffRole = data?.role && staffRoles.includes(data.role);
      const hasPosFlag = data?.can_access_pos === true;
      setCanAccessPos(hasStaffRole || hasPosFlag);
    };
    fetchProfile();

    // Subscribe to real-time changes for this user's profile
    const channel = supabase
      .channel(`profile_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.new?.full_name) {
            setProfileName(payload.new.full_name as string);
          }
          // Update POS access on profile change
          const staffRoles = ["super_admin", "admin", "moderator", "store_manager"];
          const hasStaffRole = payload.new?.role && staffRoles.includes(payload.new.role as string);
          const hasPosFlag = payload.new?.can_access_pos === true;
          setCanAccessPos(hasStaffRole || hasPosFlag);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleSignOut = async () => {
    setIsLoading(true);
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error signing out",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setShowSignOutDialog(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    const { error } = await startGoogleOAuth();

    if (error) {
      toast({
        title: "Google Sign In Failed",
        description: error,
        variant: "destructive",
      });
      setIsGoogleLoading(false);
    }
  };

  if (!user) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Sign in"
            className="gap-1.5 text-sm font-medium transition-colors hover:text-primary"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Sign In</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-64 bg-background border border-border shadow-lg z-[100] p-4 rounded-2xl"
        >
          <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">Sign in to your account</p>
            <p className="text-xs text-muted-foreground -mt-2">Use your phone number for quick OTP access</p>
            <GoogleOAuthButton onClick={handleGoogleSignIn} isLoading={isGoogleLoading} />
            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/auth/login")}
              className="w-full rounded-xl"
            >
              <Phone className="mr-2 h-4 w-4" />
              Sign in with Phone
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="Profile Menu"
            className="gap-1.5 h-10 rounded-lg px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">My Profile</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="end" 
          className="w-56 bg-background border border-border shadow-lg z-[100]"
        >
          <DropdownMenuLabel className="font-bold text-foreground">
            {profileName || "Loading..."}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isAdmin && (
            <DropdownMenuItem
              onClick={() => navigate("/admin/dashboard")}
              className="cursor-pointer hover:bg-accent"
            >
              <Settings className="mr-2 h-4 w-4 text-primary" />
              <span>Admin Panel</span>
            </DropdownMenuItem>
          )}
          {canAccessPos && (
            <DropdownMenuItem
              onClick={() => navigate("/pos")}
              className="cursor-pointer hover:bg-accent"
            >
              <Monitor className="mr-2 h-4 w-4 text-primary" />
              <span>POS Terminal</span>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => navigate("/account")}
            className="cursor-pointer hover:bg-accent"
          >
            <User className="mr-2 h-4 w-4 text-primary" />
            <span>My Account</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => navigate("/orders")}
            className="cursor-pointer hover:bg-accent"
          >
            <Package className="mr-2 h-4 w-4 text-primary" />
            <span>Order History</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => setShowSignOutDialog(true)}
            className="cursor-pointer text-destructive hover:bg-destructive/10 focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="bg-background border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be redirected to the home page after signing out.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={isLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {isLoading ? "Signing out..." : "Sign Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
