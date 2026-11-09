import { useState, useEffect } from "react";
import { BarChart3, Save, Loader2, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { resetAnalyticsConfig } from "@/services/Analytics";

interface AnalyticsSettings {
  meta_pixel_id: string;
  meta_conversion_token: string;
  google_analytics_id: string;
  google_tag_manager_id: string;
}

export function AnalyticsTrackingTab() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [settings, setSettings] = useState<AnalyticsSettings>({
    meta_pixel_id: "",
    meta_conversion_token: "",
    google_analytics_id: "",
    google_tag_manager_id: "",
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("meta_pixel_id, google_analytics_id, google_tag_manager_id")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      const { data: tokenRow } = await supabase
        .from("secure_settings")
        .select("value")
        .eq("key", "meta_conversion_token")
        .maybeSingle();

      setSettings({
        meta_pixel_id: data?.meta_pixel_id || "",
        meta_conversion_token: tokenRow?.value || "",
        google_analytics_id: data?.google_analytics_id || "",
        google_tag_manager_id: data?.google_tag_manager_id || "",
      });
    } catch (error) {
      console.error("Error fetching analytics settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save non-secret settings to store_settings
      const { data: existing } = await supabase
        .from("store_settings")
        .select("id")
        .limit(1)
        .maybeSingle();

      const payload = {
        meta_pixel_id: settings.meta_pixel_id || null,
        google_analytics_id: settings.google_analytics_id || null,
        google_tag_manager_id: settings.google_tag_manager_id || null,
      };

      if (existing) {
        const { error } = await supabase
          .from("store_settings")
          .update(payload)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_settings").insert(payload);
        if (error) throw error;
      }

      // Save the Meta conversion token to admin-only secure_settings
      const tokenValue = settings.meta_conversion_token?.trim() || null;
      const { error: tokenError } = await supabase
        .from("secure_settings")
        .upsert(
          { key: "meta_conversion_token", value: tokenValue },
          { onConflict: "key" }
        );
      if (tokenError) throw tokenError;

      resetAnalyticsConfig();

      toast({
        title: "Analytics Settings Saved",
        description: "Your tracking pixels have been updated. Changes will apply on page reload.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Meta Pixel */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Meta Pixel (Facebook)
          </CardTitle>
          <CardDescription>
            Track conversions from Facebook & Instagram ads. Get your Pixel ID from Facebook Events Manager.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="meta_pixel_id">Pixel ID</Label>
            <Input
              id="meta_pixel_id"
              placeholder="123456789012345"
              value={settings.meta_pixel_id}
              onChange={(e) =>
                setSettings({ ...settings, meta_pixel_id: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Find this in Facebook Events Manager → Data Sources → Your Pixel
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="meta_conversion_token">Conversions API Access Token</Label>
            <div className="relative">
              <Input
                id="meta_conversion_token"
                type={showToken ? "text" : "password"}
                placeholder="EAAxxxxxxxxxxxxxxxxxxxxxxx"
                value={settings.meta_conversion_token}
                onChange={(e) =>
                  setSettings({ ...settings, meta_conversion_token: e.target.value })
                }
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Stored in an admin-only secure settings table. Required for server-side tracking (bypasses ad blockers).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Analytics */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Google Analytics 4
          </CardTitle>
          <CardDescription>
            Track website traffic and user behavior with GA4.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google_analytics_id">Measurement ID</Label>
            <Input
              id="google_analytics_id"
              placeholder="G-XXXXXXXXXX"
              value={settings.google_analytics_id}
              onChange={(e) =>
                setSettings({ ...settings, google_analytics_id: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Find this in GA4 Admin → Data Streams → Web → Measurement ID
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Google Tag Manager */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0L1.608 6v12L12 24l10.392-6V6L12 0zm-1.5 17.25l-4.5-4.5 1.5-1.5 3 3 6-6 1.5 1.5-7.5 7.5z"/>
            </svg>
            Google Tag Manager
          </CardTitle>
          <CardDescription>
            Manage all your marketing tags from one place without touching code.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google_tag_manager_id">Container ID</Label>
            <Input
              id="google_tag_manager_id"
              placeholder="GTM-XXXXXX"
              value={settings.google_tag_manager_id}
              onChange={(e) =>
                setSettings({ ...settings, google_tag_manager_id: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              Find this in GTM Admin → Container Settings → Container ID
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Events Being Tracked</p>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>PageView</strong> - Every page load</li>
                <li>• <strong>ViewContent</strong> - Product detail page views</li>
                <li>• <strong>AddToCart</strong> - Items added to cart</li>
                <li>• <strong>InitiateCheckout</strong> - Checkout page started</li>
                <li>• <strong>Purchase</strong> - Order completed (with Server-Side backup)</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Server-Side events bypass ad blockers for accurate conversion tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button onClick={handleSave} disabled={isSaving} size="lg">
        {isSaving ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-2 h-4 w-4" />
        )}
        Save Analytics Settings
      </Button>
    </div>
  );
}
