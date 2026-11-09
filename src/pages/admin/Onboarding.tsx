import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone, Mail, Loader2, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/auth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BDPhoneInput } from "@/components/ui/bd-phone-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/auth/LoadingSpinner";

export default function AdminOnboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isLoading: roleLoading, isAdmin } = useUserRole();
  const { toast } = useToast();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("profiles")
        .select("full_name, phone, email, is_onboarded")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        // If already onboarded, redirect to dashboard
        if (data.is_onboarded) {
          navigate("/admin/dashboard", { replace: true });
          return;
        }
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setEmail(data.email || user.email || "");
      } else {
        setEmail(user.email || "");
      }
      setIsLoading(false);
    };

    if (!roleLoading) {
      // Super admins skip onboarding
      if (isSuperAdmin) {
        navigate("/admin/dashboard", { replace: true });
        return;
      }
      if (!isAdmin) {
        navigate("/", { replace: true });
        return;
      }
      fetchProfile();
    }
  }, [user, roleLoading, isSuperAdmin, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your phone number",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          phone: phone.trim(),
          is_onboarded: true,
        })
        .eq("id", user?.id);

      if (error) throw error;

      toast({
        title: "Profile Complete!",
        description: "Welcome to the admin panel",
      });

      navigate("/admin/dashboard", { replace: true });
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (roleLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <LoadingSpinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800/50 backdrop-blur-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/20">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl text-white">Complete Your Profile</CardTitle>
          <CardDescription className="text-slate-400">
            Please provide your details to continue accessing the admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-slate-300">
                Full Name *
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-slate-300">
                Phone Number *
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <BDPhoneInput
                  id="phone"
                  value={phone}
                  onChange={(v) => setPhone(v)}
                  placeholder="01XXXXXXXXX"
                  className="border-slate-600 bg-slate-700/50 pl-10 text-white placeholder:text-slate-500"
                  required
                  showValidationHint
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-300">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="border-slate-600 bg-slate-700/30 pl-10 text-slate-400 cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-slate-500">Email cannot be changed</p>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Complete Setup
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
