import { cn } from "@/lib/utils";
import { X, Loader2, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AnnouncementSettings {
  text: string;
  code: string;
  is_active: boolean;
}

const STORAGE_KEY = "announcement_dismissed_v2";

export function AnnouncementBar() {
  const [open, setOpen] = useState(() => {
    // Check sessionStorage for dismissal (resets on new tab/browser restart)
    if (typeof window !== "undefined") {
      return sessionStorage.getItem(STORAGE_KEY) !== "true";
    }
    return true;
  });
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<AnnouncementSettings | null>(null);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const { data, error } = await supabase
          .from("site_settings")
          .select("setting_value")
          .eq("setting_key", "announcement_bar")
          .maybeSingle();

        if (error) throw error;

        if (data?.setting_value) {
          setSettings(data.setting_value as unknown as AnnouncementSettings);
        } else {
          setSettings({
            text: "Get 5% Flat Discount on Your First Order",
            code: "FIRST5",
            is_active: true,
          });
        }
      } catch {
        setSettings({
          text: "Get 5% Flat Discount on Your First Order",
          code: "FIRST5",
          is_active: true,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();

    const channel = supabase
      .channel("announcement_bar_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "site_settings",
          filter: "setting_key=eq.announcement_bar",
        },
        (payload) => {
          const nextValue = (payload.new as any)?.setting_value as AnnouncementSettings | undefined;
          setSettings(
            nextValue ?? {
              text: "Get 5% Flat Discount on Your First Order",
              code: "FIRST5",
              is_active: true,
            }
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (settings?.is_active) setOpen(true);
  }, [settings?.is_active]);

  // Always render while loading to maintain layout space
  if (loading) {
    return (
      <div 
        id="announcement-bar"
        className="relative w-full bg-gradient-to-r from-primary via-primary/90 to-primary"
      >
        <div className="container flex items-center justify-center py-2.5">
          <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
        </div>
      </div>
    );
  }

  if (!open || !settings?.is_active) return null;

  return (
    <div 
      id="announcement-bar"
      className="relative w-full bg-gradient-to-r from-primary via-primary/85 to-primary overflow-hidden"
    >
      {/* Shimmer overlay */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
        aria-hidden
      />
      
      <div className="container relative flex items-center justify-center gap-3 py-2.5 text-sm md:text-base pr-10">
        {/* Icon */}
        <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-bubu-amber shrink-0 animate-pulse" />
        
        {/* Content */}
        <p className="font-semibold text-primary-foreground text-center leading-tight">
          <span>{settings.text}</span>
          {settings.code && (
            <>
              {" "}— use code{" "}
              <span className="inline-flex items-center bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full text-bubu-amber font-bold tracking-wide">
                {settings.code}
              </span>
            </>
          )}
        </p>

        {/* Close button */}
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            sessionStorage.setItem(STORAGE_KEY, "true");
          }}
          className={cn(
            "absolute right-2 md:right-4 inline-flex h-7 w-7 items-center justify-center rounded-full",
            "bg-white/0 hover:bg-white/15 active:bg-white/25",
            "transition-all duration-200 ease-out",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          )}
          aria-label="Dismiss announcement"
        >
          <X className="h-4 w-4 text-primary-foreground/80 hover:text-primary-foreground transition-colors" />
        </button>
      </div>
    </div>
  );
}
