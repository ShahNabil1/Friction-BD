import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

// Session key to prevent multiple triggers in the same browser session
const SESSION_KEY = "fraud_cache_warmed_at";
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes cooldown

/**
 * Automatically triggers bulk fraud cache warming for recent orders (last 24h)
 * on admin dashboard load. Rate-limited to once per session/cooldown period.
 */
export function useWarmFraudCache() {
  const hasTriggered = useRef(false);

  useEffect(() => {
    if (hasTriggered.current) return;

    // Check cooldown
    const lastWarmed = sessionStorage.getItem(SESSION_KEY);
    if (lastWarmed) {
      const elapsed = Date.now() - parseInt(lastWarmed, 10);
      if (elapsed < COOLDOWN_MS) {
        return;
      }
    }

    hasTriggered.current = true;

    const warmCache = async () => {
      try {
        const { error } = await supabase.functions.invoke("warm-fraud-cache", {
          body: { hoursBack: 24 },
        });

        if (error) {
          console.error("[useWarmFraudCache] Error:", error.message);
          return;
        }

        sessionStorage.setItem(SESSION_KEY, Date.now().toString());
      } catch (err) {
        console.error("[useWarmFraudCache] Failed:", err);
      }
    };

    // Delay slightly to not block initial page render
    const timer = setTimeout(warmCache, 2000);

    return () => clearTimeout(timer);
  }, []);
}
