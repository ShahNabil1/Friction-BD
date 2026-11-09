import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Phone } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GoogleOAuthButton } from "@/components/auth/GoogleOAuthButton";
import { startGoogleOAuth } from "@/lib/authRedirect";
import { useToast } from "@/hooks/use-toast";

export function SignInRequiredDialog({
  open,
  onOpenChange,
  actionLabel = "continue",
  nextPath,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel?: string;
  nextPath?: string;
}) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const handleGoogle = async () => {
    setIsGoogleLoading(true);
    const { error } = await startGoogleOAuth(nextPath);
    if (error) {
      toast({ title: "Google Sign In Failed", description: error, variant: "destructive" });
      setIsGoogleLoading(false);
    }
    // on success: redirect to /auth/callback
  };

  const nextQuery = nextPath ? `?next=${encodeURIComponent(nextPath)}` : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-background rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif">Sign in required</DialogTitle>
          <DialogDescription>
            Please sign in to {actionLabel}. Use your phone number and OTP for quick access.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <GoogleOAuthButton onClick={handleGoogle} isLoading={isGoogleLoading} />

          <div className="relative py-2" aria-hidden="true">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-background px-2 text-xs text-muted-foreground">OR</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={() => {
              onOpenChange(false);
              navigate(`/auth/login${nextQuery}`);
            }}
          >
            <Phone className="mr-2 h-4 w-4" />
            Sign in with Phone
          </Button>

          <Button variant="ghost" className="w-full rounded-xl" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}