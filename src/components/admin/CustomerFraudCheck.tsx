import { useEffect, useState } from "react";
import { Package, CheckCircle2, XCircle, AlertTriangle, Loader2, ShieldCheck, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface CourierBreakdownItem {
  key: string;
  name: string;
  logo?: string | null;
  total_parcel: number;
  success_parcel: number;
  cancelled_parcel: number;
  success_ratio: number;
}

interface FraudCheckData {
  success_delivery?: number;
  cancel_order?: number;
  total_order?: number;
  success_ratio?: number;
  checked_at?: string;
  cached?: boolean;
  stale?: boolean;
  source?: "api" | "cache" | "cache_fallback";
  courier_breakdown?: CourierBreakdownItem[];
  api_error?: { status?: number; details?: string };
  error?: string;
}

interface CustomerFraudCheckProps {
  phone: string | null;
}

export function CustomerFraudCheck({ phone }: CustomerFraudCheckProps) {
  const [data, setData] = useState<FraudCheckData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) {
      setError("No phone number available");
      return;
    }

    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");
    let cancelled = false;

    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

    const invokeWithRetry = async () => {
      const delays = [0, 600, 1200];
      let lastErr: unknown = null;
      for (let i = 0; i < delays.length; i++) {
        if (i > 0) await sleep(delays[i]);

        try {
          const { data: responseData, error: invokeError } = await supabase.functions.invoke(
            "check-fraud-status",
            { body: { phone: normalizedPhone, skipCache: true } }
          );

          if (invokeError) throw new Error(invokeError.message);
          if (responseData?.error) throw new Error(responseData.error);
          return { ok: true as const, data: responseData as FraudCheckData };
        } catch (e) {
          lastErr = e;
        }
      }
      return { ok: false as const, error: lastErr };
    };

    const load = async () => {
      setIsLoading(true);
      setError(null);
      setNotice(null);

      // 1) Show cached value immediately (even if stale) so the modal never looks broken.
      let hadCache = false;
      try {
        // Fetch summary cache
        const { data: cached } = await supabase
          .from("fraud_check_cache")
          .select("phone, total_order, success_delivery, cancel_order, success_ratio, checked_at")
          .eq("phone", normalizedPhone)
          .order("checked_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Fetch breakdown from DB
        const { data: breakdownRows } = await supabase
          .from("fraud_courier_breakdown")
          .select("courier_key, courier_name, logo_url, total_parcel, success_parcel, cancelled_parcel, success_ratio")
          .eq("phone", normalizedPhone);

        const breakdown: CourierBreakdownItem[] = (breakdownRows || []).map((r) => ({
          key: r.courier_key,
          name: r.courier_name ?? r.courier_key,
          logo: r.logo_url,
          total_parcel: r.total_parcel ?? 0,
          success_parcel: r.success_parcel ?? 0,
          cancelled_parcel: r.cancelled_parcel ?? 0,
          success_ratio: r.success_ratio ?? 0,
        }));

        if (!cancelled && cached) {
          hadCache = true;
          setData({
            total_order: cached.total_order ?? 0,
            success_delivery: cached.success_delivery ?? 0,
            cancel_order: cached.cancel_order ?? 0,
            success_ratio: cached.success_ratio ?? 0,
            checked_at: cached.checked_at,
            cached: true,
            stale: false,
            source: "cache",
            courier_breakdown: breakdown,
          });
        }
      } catch {
        // ignore cache read errors in UI
      }

      // 2) Fetch live BD Courier details (retry a few times). If it fails, keep cached.
      const live = await invokeWithRetry();

      if (cancelled) return;

      if (live.ok) {
        setData(live.data);
        if (live.data?.source === "cache_fallback") {
          setNotice("Live BD Courier fetch failed — showing cached fallback.");
        }
      } else {
        const msg = live.error instanceof Error ? live.error.message : "Could not verify delivery history";
        if (hadCache) {
          setNotice(`Live BD Courier fetch failed — showing cached data. (${msg})`);
        } else {
          setError(msg);
        }
      }

      setIsLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [phone]);

  // Initial loading state (no cached data yet)
  if (isLoading && !data) {
    return (
      <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <div>
            <p className="font-medium text-sm">Customer Delivery Reliability</p>
            <p className="text-xs text-muted-foreground">Checking BD Courier...</p>
          </div>
        </div>
      </div>
    );
  }

  // Hard error only if we couldn't load cache AND live failed
  if (error || !data) {
    return (
      <div className="rounded-lg border border-bubu-amber/30 bg-bubu-amber/10 p-4">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-bubu-amber" />
          <div>
            <p className="font-medium text-sm">Customer Delivery Reliability</p>
            <p className="text-xs text-muted-foreground">
              {error || "Could not verify delivery history"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate values
  const successRatio = Number(data.success_ratio ?? 0);
  const totalOrders = data.total_order ?? 0;
  const deliveredOrders = data.success_delivery ?? 0;
  const cancelledOrders = data.cancel_order ?? 0;

  // Tier: no-orders (neutral), low (red), mid (amber), high (green)
  const hasOrders = totalOrders > 0;
  const getTier = (ratio: number) => {
    if (!hasOrders) return "none" as const;
    if (ratio >= 80) return "high" as const;
    if (ratio >= 41) return "mid" as const;
    return "low" as const;
  };

  const getRatioColor = (ratio: number) => {
    const t = getTier(ratio);
    if (t === "high") return "text-emerald-600 dark:text-emerald-400";
    if (t === "mid") return "text-amber-600 dark:text-amber-400";
    if (t === "low") return "text-rose-600 dark:text-rose-400";
    return "text-sky-600 dark:text-sky-400";
  };

  const getRatioBgColor = (ratio: number) => {
    const t = getTier(ratio);
    if (t === "high") return "bg-emerald-500/10 border-emerald-500/30";
    if (t === "mid") return "bg-amber-500/10 border-amber-500/30";
    if (t === "low") return "bg-rose-500/10 border-rose-500/30";
    return "bg-sky-500/10 border-sky-500/30";
  };

  const getIcon = (ratio: number) => {
    const t = getTier(ratio);
    if (t === "high") return <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />;
    if (t === "mid") return <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />;
    if (t === "low") return <ShieldAlert className="h-6 w-6 text-rose-600 dark:text-rose-400" />;
    return <Package className="h-6 w-6 text-sky-600 dark:text-sky-400" />;
  };

  

  const formatPercent = (v: number) => {
    if (!Number.isFinite(v)) return "0%";
    const rounded1 = Math.round(v * 10) / 10;
    return `${rounded1 % 1 === 0 ? rounded1.toFixed(0) : rounded1.toFixed(1)}%`;
  };
  const displayRatio = hasOrders ? formatPercent(successRatio) : "—";

  return (
    <div className={cn("rounded-lg border p-3", getRatioBgColor(successRatio))}>
      {/* Mobile: Compact 2-column grid layout */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getIcon(successRatio)}
            <p className="font-semibold text-sm">Delivery Reliability</p>
          </div>
          <div className="flex items-center gap-1.5">
            {data?.source === "api" ? (
              <span className="text-[10px] text-muted-foreground">Live</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Cached</span>
            )}
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
        </div>

        {notice && (
          <div className="mb-2 rounded-md border border-border/50 bg-muted/30 px-2 py-1.5 text-[10px] text-muted-foreground">
            {notice}
          </div>
        )}

        {/* 2-column grid for stats */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="flex items-center gap-2 rounded-md bg-background/50 p-2">
            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
            <div>
              <p className="font-bold text-sm">{totalOrders}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-background/50 p-2">
            <div className={cn("font-bold text-lg", getRatioColor(successRatio))}>
              {displayRatio}
            </div>
            <p className="text-[10px] text-muted-foreground">{hasOrders ? "Success" : "No orders"}</p>
          </div>
        </div>

        {/* Breakdown row */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-bubu-green" />
            {deliveredOrders} delivered
          </span>
          <span className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-bubu-red" />
            {cancelledOrders} cancelled
          </span>
        </div>
      </div>

      {/* Desktop: Original horizontal layout */}
      <div className="hidden md:block">
        <div className="flex items-start gap-4">
          {/* Icon and Ratio */}
          <div className="flex flex-col items-center gap-1">
            {getIcon(successRatio)}
            <span className={cn("text-2xl font-bold", getRatioColor(successRatio))}>
              {displayRatio}
            </span>
            <span className="text-xs text-muted-foreground">{hasOrders ? "Success Rate" : "No orders yet"}</span>
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="font-semibold text-sm">Customer Delivery Reliability</p>
              <div className="flex items-center gap-2">
                {data?.source === "api" ? (
                  <span className="text-[11px] text-muted-foreground">Live (BD Courier)</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Cached</span>
                )}
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
              </div>
            </div>

            {notice && (
              <div className="mb-3 rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                {notice}
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col">
                  <p className="font-medium">{totalOrders}</p>
                  <p className="text-xs text-muted-foreground">Total Orders</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-bubu-green shrink-0" />
                <div className="flex flex-col">
                  <p className="font-medium">{deliveredOrders}</p>
                  <p className="text-xs text-muted-foreground">Delivered</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <XCircle className="h-4 w-4 text-bubu-red shrink-0" />
                <div className="flex flex-col">
                  <p className="font-medium">{cancelledOrders}</p>
                  <p className="text-xs text-muted-foreground">Cancelled</p>
                </div>
              </div>
            </div>

            {Array.isArray(data.courier_breakdown) && data.courier_breakdown.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Breakdown by Courier</p>
                <div className="space-y-2">
                  {data.courier_breakdown
                    .filter((c) => c.total_parcel > 0)
                    .sort((a, b) => b.total_parcel - a.total_parcel)
                    .slice(0, 4)
                    .map((c) => (
                      <div key={c.key} className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[55%]">{c.name}</span>
                        <span className="text-muted-foreground">Total {c.total_parcel} • Cancel {c.cancelled_parcel} • {formatPercent(c.success_ratio)}</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
