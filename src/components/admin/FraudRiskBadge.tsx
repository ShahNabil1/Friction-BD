import { useEffect, useState, useCallback } from "react";
import { ShieldCheck, ShieldAlert, AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface FraudRiskBadgeProps {
  phone: string | null;
  compact?: boolean;
}

interface CachedFraudData {
  phone: string;
  total_order: number;
  success_delivery: number;
  cancel_order: number;
  success_ratio: number;
  checked_at: string;
}

// In-memory cache to prevent redundant fetches during same session
const sessionCache = new Map<string, { data: CachedFraudData | null; timestamp: number }>();
const SESSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function FraudRiskBadge({ phone, compact = false }: FraudRiskBadgeProps) {
  const [data, setData] = useState<CachedFraudData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const fetchFraudData = useCallback(async (skipCache = false) => {
    if (!phone) return;

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Check session cache first (unless skipping cache)
    if (!skipCache) {
      const cached = sessionCache.get(normalizedPhone);
      if (cached && Date.now() - cached.timestamp < SESSION_CACHE_TTL) {
        setData(cached.data);
        return;
      }
    }

    setIsLoading(!skipCache);
    setIsRefreshing(skipCache);
    setError(false);

    try {
      // If not skipping cache, try to get from Supabase cache first
      if (!skipCache) {
        const cacheExpiry = new Date();
        cacheExpiry.setHours(cacheExpiry.getHours() - 24);

        const { data: cachedData, error: cacheError } = await supabase
          .from("fraud_check_cache")
          .select("phone, total_order, success_delivery, cancel_order, success_ratio, checked_at")
          .eq("phone", normalizedPhone)
          .gte("checked_at", cacheExpiry.toISOString())
          .single();

        if (!cacheError && cachedData) {
          setData(cachedData as CachedFraudData);
          sessionCache.set(normalizedPhone, { data: cachedData as CachedFraudData, timestamp: Date.now() });
          return;
        }
      }

      // Cache miss or refresh - call edge function
      const { data: responseData, error: invokeError } = await supabase.functions.invoke(
        "check-fraud-status",
        { body: { phone: normalizedPhone, skipCache } }
      );

      if (invokeError || responseData?.error) {
        setError(true);
        sessionCache.set(normalizedPhone, { data: null, timestamp: Date.now() });
        return;
      }

      const fraudData: CachedFraudData = {
        phone: normalizedPhone,
        total_order: responseData.total_order ?? 0,
        success_delivery: responseData.success_delivery ?? 0,
        cancel_order: responseData.cancel_order ?? 0,
        success_ratio: responseData.success_ratio ?? 0,
        checked_at: responseData.checked_at ?? new Date().toISOString(),
      };

      setData(fraudData);
      sessionCache.set(normalizedPhone, { data: fraudData, timestamp: Date.now() });
    } catch (err) {
      console.error("Fraud badge fetch error:", err);
      setError(true);
      sessionCache.set(normalizedPhone, { data: null, timestamp: Date.now() });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [phone]);

  useEffect(() => {
    fetchFraudData();
  }, [fetchFraudData]);

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation();
    fetchFraudData(true);
  };

  // No phone number
  if (!phone) return null;

  // Loading state
  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 bg-muted/50 text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        {!compact && <span className="text-xs">...</span>}
      </Badge>
    );
  }

  // Error or no data
  if (error || !data) {
    return null;
  }

  const successRatio = data.success_ratio ?? 0;

  // Determine risk level and styling
  const getRiskConfig = (ratio: number) => {
    if (ratio >= 80) {
      return {
        icon: ShieldCheck,
        label: "Safe",
        className: "bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20",
      };
    }
    if (ratio >= 50) {
      return {
        icon: AlertTriangle,
        label: "Caution",
        className: "bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500/20",
      };
    }
    return {
      icon: ShieldAlert,
      label: "Risk",
      className: "bg-red-500/10 text-red-600 border-red-500/30 hover:bg-red-500/20",
    };
  };

  const config = getRiskConfig(successRatio);
  const Icon = config.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn("gap-1 cursor-help", config.className)}
          >
            <Icon className="h-3 w-3" />
            {compact ? (
              <span className="text-xs font-semibold">{successRatio}%</span>
            ) : (
              <>
                <span className="text-xs font-semibold">{successRatio}%</span>
                <span className="text-xs hidden sm:inline">{config.label}</span>
              </>
            )}
            {isRefreshing && <Loader2 className="h-3 w-3 animate-spin ml-0.5" />}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <p className="font-medium">Delivery Reliability: {successRatio}%</p>
            <p>📦 Total: {data.total_order}</p>
            <p>✅ Delivered: {data.success_delivery}</p>
            <p>❌ Cancelled: {data.cancel_order}</p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full mt-2 h-7 text-xs gap-1"
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
