import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { redirectAfterLogin, startGoogleOAuth } from "@/lib/authRedirect";

/**
 * Handles OAuth return states (Google, etc.) and centralizes post-login redirects.
 */
export default function Callback() {
  const [status, setStatus] = useState<"loading" | "error" | "success">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const callbackError = searchParams.get("error");
  const callbackErrorDescription = searchParams.get("error_description");
  const nextPath = searchParams.get("next");

  useEffect(() => {
    const handleCallback = async () => {
      // Handle OAuth errors returned in the query string
      if (callbackError) {
        const message = decodeURIComponent(callbackErrorDescription || callbackError);
        setErrorMessage(message);
        setStatus("error");
        return;
      }

      try {
        // Exchange the code/token in the URL for a session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("OAuth callback error:", error);
          setErrorMessage(error.message);
          setStatus("error");
          return;
        }

        if (!data.session?.user) {
          setErrorMessage("No user session found. Please try logging in again.");
          setStatus("error");
          return;
        }

        setStatus("success");

        toast({
          title: "Welcome!",
          description: "You have successfully logged in.",
        });

        await redirectAfterLogin(navigate, data.session.user.id, nextPath);
      } catch (err) {
        console.error("Unexpected error in callback:", err);
        setErrorMessage("An unexpected error occurred. Please try again.");
        setStatus("error");
      }
    };

    handleCallback();
  }, [callbackError, callbackErrorDescription, nextPath, navigate, toast]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
        <AuthCard>
          <div className="flex flex-col items-center gap-4 py-8">
            <LoadingSpinner size="lg" className="text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Signing you in...</h2>
            <p className="text-sm text-muted-foreground text-center">
              Please wait while we complete your authentication.
            </p>
          </div>
        </AuthCard>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
        <AuthCard>
          <div className="flex flex-col items-center gap-4 py-8">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Google sign-in didn’t work</h2>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {errorMessage || "We couldn't complete your sign-in. Please try again."}
            </p>

            <div className="flex w-full flex-col gap-2 pt-2">
              <Button
                onClick={async () => {
                  setStatus("loading");
                  setErrorMessage(null);
                  const { error } = await startGoogleOAuth(nextPath);
                  if (error) {
                    setStatus("error");
                    setErrorMessage(error);
                  }
                }}
                variant="hero"
                className="w-full"
              >
                Retry Google Sign-In
              </Button>
              <Button
                onClick={() =>
                  navigate(nextPath ? `/auth/login?next=${encodeURIComponent(nextPath)}` : "/auth/login")
                }
                variant="outline"
                className="w-full"
              >
                Back to Login
              </Button>
            </div>
          </div>
        </AuthCard>
      </div>
    );
  }

  // Success state briefly shown before redirect
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <AuthCard>
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground">Success!</h2>
          <p className="text-sm text-muted-foreground text-center">Redirecting you now...</p>
        </div>
      </AuthCard>
    </div>
  );
}
