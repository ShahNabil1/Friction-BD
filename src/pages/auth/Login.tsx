import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
import { GoogleOAuthButton, OrDivider } from "@/components/auth/GoogleOAuthButton";
import { redirectAfterLogin } from "@/lib/authRedirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ArrowLeft, Phone, AlertTriangle } from "lucide-react";
import bubuLogoColor from "@/assets/bubu-logo-color.png";

// Phone number schema - Bangladeshi format
const phoneSchema = z.object({
  phone: z
    .string()
    .min(11, "Phone number must be at least 11 digits")
    .regex(/^(\+880|880|0)?1[3-9]\d{8}$/, "Please enter a valid Bangladeshi phone number"),
});

type PhoneFormData = z.infer<typeof phoneSchema>;

// Normalize phone to E.164 format for Bangladesh
const normalizePhone = (phone: string): string => {
  // Remove all non-digit characters except +
  let cleaned = phone.replace(/[^\d+]/g, "");
  
  // Handle different formats
  if (cleaned.startsWith("+880")) {
    return cleaned;
  } else if (cleaned.startsWith("880")) {
    return "+" + cleaned;
  } else if (cleaned.startsWith("0")) {
    return "+880" + cleaned.slice(1);
  } else if (cleaned.startsWith("1")) {
    return "+880" + cleaned;
  }
  
  return "+880" + cleaned;
};

const Login = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [rateLimit, setRateLimit] = useState<{
    remaining: number;
    max: number;
    isLimited: boolean;
    retryAfterMinutes: number;
  } | null>(null);
  
  // Ref to prevent duplicate auto-submissions
  const hasAutoSubmittedRef = useRef(false);

  // Google OAuth handler
  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    if (error) {
      toast({ 
        title: "Google Sign-In Failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setIsGoogleLoading(false);
    }
    // Note: On success, the page redirects to Google, so no need to setIsGoogleLoading(false)
  };

  const RESEND_COOLDOWN_SECONDS = 60;

  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();

  const nextPath = useMemo(() => {
    const raw = new URLSearchParams(location.search).get("next");
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }, [location.search]);

  // Redirect if already logged in
  useEffect(() => {
    if (user && location.pathname.startsWith("/auth")) {
      redirectAfterLogin(navigate, user.id, nextPath);
    }
  }, [user, navigate, nextPath, location.pathname]);

  const form = useForm<PhoneFormData>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
  });

  const phoneValue = form.watch("phone");

  // Check rate limit status when phone changes
  const checkRateLimit = useCallback(async (phone: string) => {
    if (!phone || phone.length < 10) {
      setRateLimit(null);
      return;
    }
    try {
      const { data, error } = await supabase.functions.invoke("check-otp-rate-limit", {
        body: { phone },
      });
      if (!error && data) {
        setRateLimit({
          remaining: data.remaining,
          max: data.max,
          isLimited: data.isLimited,
          retryAfterMinutes: data.retryAfterMinutes,
        });
      }
    } catch {
      // Silently fail - rate limit check is optional
    }
  }, []);

  // Debounce rate limit check
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (phoneValue && phoneValue.length >= 10) {
        checkRateLimit(phoneValue);
      }
    }, 500);
    return () => clearTimeout(timeout);
  }, [phoneValue, checkRateLimit]);

  const sendOtp = async (phone: string) => {
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
      });

      if (error) {
        toast({ title: "Failed to send OTP", description: error.message, variant: "destructive" });
        return false;
      }

      setSentTo(normalizedPhone);
      setResendSeconds(RESEND_COOLDOWN_SECONDS);
      setOtpValue("");
      toast({ title: "OTP Sent!", description: "Check your phone for a 6-digit verification code." });
      return true;
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Trigger haptic feedback if supported
  const triggerHapticFeedback = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate(50); // Short 50ms vibration for success
    }
  }, []);

  const verifyOtp = async () => {
    if (!sentTo || otpValue.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code from your SMS.",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        phone: sentTo,
        token: otpValue,
        type: "sms",
      });

      if (error) {
        toast({
          title: "Verification Failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      if (data.session?.user) {
        // Trigger success feedback
        setVerificationSuccess(true);
        triggerHapticFeedback();
        
        toast({
          title: "Welcome!",
          description: "You have successfully logged in.",
        });
        
        // Small delay to show success animation before redirect
        await new Promise(resolve => setTimeout(resolve, 300));
        await redirectAfterLogin(navigate, data.session.user.id, nextPath);
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const onSubmit = async (data: PhoneFormData) => {
    await sendOtp(data.phone);
  };

  // Countdown timer for resend
  useEffect(() => {
    if (!sentTo) return;
    if (resendSeconds <= 0) return;

    const t = window.setInterval(() => {
      setResendSeconds((s) => Math.max(0, s - 1));
    }, 1000);

    return () => window.clearInterval(t);
  }, [resendSeconds, sentTo]);

  // Auto-submit when OTP is complete (6 digits)
  useEffect(() => {
    if (otpValue.length === 6 && sentTo && !isVerifying && !hasAutoSubmittedRef.current) {
      hasAutoSubmittedRef.current = true;
      verifyOtp();
    }
  }, [otpValue, sentTo, isVerifying]);

  // Reset auto-submit flag when OTP changes to less than 6 digits
  useEffect(() => {
    if (otpValue.length < 6) {
      hasAutoSubmittedRef.current = false;
    }
  }, [otpValue]);

  // Handle Enter key for OTP submission
  const handleOtpKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && otpValue.length === 6 && !isVerifying) {
      e.preventDefault();
      verifyOtp();
    }
  }, [otpValue, isVerifying]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-primary/5 to-bubu-green/10 px-4 py-8 relative">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors font-medium text-sm rounded-xl"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Home
      </Link>

      <AuthCard>
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Link to="/">
            <img 
              src={bubuLogoColor} 
              alt="Friction" 
              className="h-20 w-auto object-contain drop-shadow-md"
            />
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2">Welcome Back</h1>
        <p className="text-muted-foreground text-center mb-8">
          {sentTo ? "Enter the verification code" : "Sign in with your phone number"}
        </p>

        {!sentTo ? (
          // Step 1: Phone Number Entry
          <div className="space-y-5">
            {/* Google OAuth */}
            <GoogleOAuthButton 
              onClick={handleGoogleLogin} 
              isLoading={isGoogleLoading}
              disabled={isLoading}
            />
            <OrDivider />

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input 
                            placeholder="01XXXXXXXXX" 
                            type="tel" 
                            autoComplete="tel"
                            className="pl-10 rounded-xl h-12"
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Rate Limit Warning */}
                {rateLimit && rateLimit.isLimited && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      Too many requests. Please wait {rateLimit.retryAfterMinutes} minute(s) before trying again.
                    </span>
                  </div>
                )}

                {rateLimit && !rateLimit.isLimited && rateLimit.remaining <= 2 && rateLimit.remaining > 0 && (
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>
                      {rateLimit.remaining} OTP request{rateLimit.remaining === 1 ? "" : "s"} remaining. Limit resets after 10 minutes.
                    </span>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-bubu-red hover:bg-bubu-red/90 text-white font-semibold"
                  disabled={isLoading || (rateLimit?.isLimited ?? false)}
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner className="mr-2" />
                      Sending OTP…
                    </>
                  ) : rateLimit?.isLimited ? (
                    `Wait ${rateLimit.retryAfterMinutes}m`
                  ) : (
                    "Send OTP"
                  )}
                </Button>
              </form>
            </Form>
          </div>
        ) : (
          // Step 2: OTP Entry
          <div className="space-y-6">
            <div className="text-center space-y-1">
              <p className="text-muted-foreground">
                We sent a code to <span className="font-medium text-foreground">{sentTo}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code from your SMS.
              </p>
            </div>

            {/* OTP Input */}
            <div 
              className={`flex justify-center transition-all duration-300 ${
                verificationSuccess 
                  ? "scale-105 opacity-80" 
                  : ""
              }`} 
              onKeyDown={handleOtpKeyDown}
            >
              <InputOTP
                maxLength={6}
                value={otpValue}
                onChange={(value) => setOtpValue(value)}
                disabled={isVerifying || verificationSuccess}
                autoFocus
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot 
                    index={0} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                  <InputOTPSlot 
                    index={1} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                  <InputOTPSlot 
                    index={2} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                  <InputOTPSlot 
                    index={3} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                  <InputOTPSlot 
                    index={4} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                  <InputOTPSlot 
                    index={5} 
                    className={`rounded-xl h-12 w-12 transition-all duration-200 ${
                      verificationSuccess 
                        ? "border-bubu-green bg-bubu-green/10" 
                        : "border-primary/30"
                    }`} 
                  />
                </InputOTPGroup>
              </InputOTP>
            </div>

            {/* Auto-verification status */}
            {otpValue.length === 6 && isVerifying && !verificationSuccess && (
              <p className="text-center text-sm text-muted-foreground animate-pulse">
                Verifying automatically...
              </p>
            )}
            
            {/* Success message */}
            {verificationSuccess && (
              <p className="text-center text-sm text-bubu-green font-medium animate-fade-in">
                ✓ Verified! Redirecting...
              </p>
            )}

            {/* Verify Button */}
            <Button
              className="w-full h-12 rounded-xl bg-bubu-green text-bubu-green-foreground hover:bg-bubu-green/90 font-semibold"
              disabled={isVerifying || otpValue.length !== 6}
              onClick={verifyOtp}
            >
              {isVerifying ? (
                <>
                  <LoadingSpinner className="mr-2" />
                  Verifying…
                </>
              ) : (
                "Verify & Login"
              )}
            </Button>

            {/* Resend & Change Phone */}
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                disabled={isLoading || isVerifying || resendSeconds > 0}
                onClick={async () => {
                  if (!sentTo) return;
                  await sendOtp(sentTo);
                }}
              >
                {resendSeconds > 0 ? `Resend code in ${resendSeconds}s` : "Resend code"}
              </Button>

              <Button
                variant="ghost"
                className="w-full rounded-xl"
                disabled={isVerifying}
                onClick={() => {
                  setSentTo(null);
                  setResendSeconds(0);
                  setOtpValue("");
                }}
              >
                ← Change phone number
              </Button>
            </div>
          </div>
        )}

      </AuthCard>
    </div>
  );
};

export default Login;
