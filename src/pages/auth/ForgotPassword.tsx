import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AuthCard } from "@/components/auth/AuthCard";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";
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
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Mail, KeyRound, ShieldCheck } from "lucide-react";
import logoImage from "@/assets/logo-fashion-elegance.png";

type Step = "request" | "verify" | "reset" | "success";

const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const resetSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type EmailFormData = z.infer<typeof emailSchema>;
type ResetFormData = z.infer<typeof resetSchema>;

const ForgotPassword = () => {
  // Password login/reset is disabled (passwordless/OAuth only).
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 px-4 py-8">
      <AuthCard>
        <div className="flex justify-center mb-6">
          <Link to="/">
            <img src={logoImage} alt="Fashion Elegance" className="h-12 object-contain" />
          </Link>
        </div>

        <h1 className="text-2xl font-bold text-center text-foreground mb-2">Password reset disabled</h1>
        <p className="text-muted-foreground text-center mb-8">
          This store uses passwordless sign-in (magic link / Google). Please sign in with a magic link instead.
        </p>

        <Button asChild className="w-full h-12" variant="hero">
          <Link to="/auth/login">Back to Sign In</Link>
        </Button>
      </AuthCard>
    </div>
  );
};

export default ForgotPassword;

