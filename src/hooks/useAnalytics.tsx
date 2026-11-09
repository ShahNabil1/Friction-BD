import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, trackPageView } from "@/services/Analytics";

/**
 * Hook to initialize analytics and track page views on route changes
 */
export function useAnalytics() {
  const location = useLocation();
  const isInitialized = useRef(false);

  // Initialize analytics on mount
  useEffect(() => {
    if (!isInitialized.current) {
      initAnalytics().then(() => {
        isInitialized.current = true;
        // Track initial page view
        trackPageView(location.pathname);
      });
    }
  }, []);

  // Track page views on route change
  useEffect(() => {
    if (isInitialized.current) {
      trackPageView(location.pathname);
    }
  }, [location.pathname]);
}
