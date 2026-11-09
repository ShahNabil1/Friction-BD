import { useMemo, useState, useEffect } from "react";
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
import { ArrowLeft, Phone, User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import bubuLogoColor from "@/assets/bubu-logo-color.png";

// Sign up schema - phone and name
const signUpSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z
    .string()
    .min(11, "Phone number must be at least 11 digits")
    .regex(/^(\+880|880|0)?1[3-9]\d{8}$/, "Please enter a valid Bangladeshi phone number"),
});

type SignUpFormData = z.infer<typeof signUpSchema>;

// Normalize phone to E.164 format for Bangladesh
const normalizePhone = (phone: string): string => {
  let cleaned = phone.replace(/[^\d+]/g, "");
  
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

const SignUp = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [resendSeconds, setResendSeconds] = useState(0);
  const [otpValue, setOtpValue] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

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

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", phone: "" },
  });

  const sendOtp = async (phone: string, fullName: string) => {
    setIsLoading(true);
    try {
      const normalizedPhone = normalizePhone(phone);
      
      const { error } = await supabase.auth.signInWithOtp({
        phone: normalizedPhone,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast({ title: "Failed to send OTP", description: error.message, variant: "destructive" });
        return false;
      }

      setSentTo(normalizedPhone);
      setUserName(fullName);
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
        // Update profile with full name
        await supabase.from("profiles").upsert({
          user_id: data.session.user.id,
          full_name: userName,
          phone: sentTo,
        });

        toast({
          title: "Welcome!",
          description: "Your account has been created successfully.",
        });
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

  const onSubmit = async (data: SignUpFormData) => {
    await sendOtp(data.phone, data.fullName);
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

      <AuthCard className="max-w-lg">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img 
              src={bubuLogoColor} 
              alt="Friction" 
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        <AnimatePresence mode="wait">
          {!sentTo ? (
            <motion.div
              key="signup-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-center text-foreground mb-2">Create Account</h1>
              <p className="text-muted-foreground text-center mb-8">Sign up with your phone number</p>

              {/* Google OAuth - Disabled for now */}
              <GoogleOAuthButton 
                onClick={() => toast({ title: "Coming Soon", description: "Google sign-up will be available soon." })} 
                isLoading={false}
                disabled
              />
              <OrDivider className="py-3" />

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                              placeholder="John Doe" 
                              autoComplete="name"
                              className="pl-10 rounded-xl h-12"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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

                  <Button
                    type="submit"
                    className="w-full h-12 mt-2 rounded-xl bg-bubu-red hover:bg-bubu-red/90 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner className="mr-2" />
                        Sending OTP…
                      </>
                    ) : (
                      "Send OTP"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-muted-foreground mt-8">
                Already have an account?{" "}
                <Link to="/auth/login" className="text-bubu-red font-semibold hover:text-bubu-red/80 transition-colors">
                  Sign In
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <h1 className="text-2xl font-bold text-center text-foreground mb-2">Verify Phone</h1>
              <div className="text-center space-y-1 mb-6">
                <p className="text-muted-foreground">
                  We sent a code to <span className="font-medium text-foreground">{sentTo}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your SMS.
                </p>
              </div>

              {/* OTP Input */}
              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={(value) => setOtpValue(value)}
                  disabled={isVerifying}
                >
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="rounded-xl border-primary/30 h-12 w-12" />
                    <InputOTPSlot index={1} className="rounded-xl border-primary/30 h-12 w-12" />
                    <InputOTPSlot index={2} className="rounded-xl border-primary/30 h-12 w-12" />
                    <InputOTPSlot index={3} className="rounded-xl border-primary/30 h-12 w-12" />
                    <InputOTPSlot index={4} className="rounded-xl border-primary/30 h-12 w-12" />
                    <InputOTPSlot index={5} className="rounded-xl border-primary/30 h-12 w-12" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

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
                  "Verify & Create Account"
                )}
              </Button>

              {/* Resend & Change Phone */}
              <div className="space-y-2 mt-4">
                <Button
                  variant="outline"
                  className="w-full rounded-xl"
                  disabled={isLoading || isVerifying || resendSeconds > 0}
                  onClick={async () => {
                    if (!sentTo) return;
                    await sendOtp(sentTo, userName);
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
            </motion.div>
          )}
        </AnimatePresence>
      </AuthCard>
    </div>
  );
};

export default SignUp;
