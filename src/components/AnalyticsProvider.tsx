import { useAnalytics } from "@/hooks/useAnalytics";

/**
 * Component that initializes analytics tracking.
 * Must be placed inside BrowserRouter.
 */
export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  useAnalytics();
  return <>{children}</>;
}
