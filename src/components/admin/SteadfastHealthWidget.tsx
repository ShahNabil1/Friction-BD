import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface HealthStatus {
  status: "connected" | "error" | "checking";
  balance: number | null;
  lastChecked: Date | null;
  responseTimeMs: number | null;
  errorMessage: string | null;
}

interface SteadfastHealthWidgetProps {
  getAccessToken: () => Promise<string>;
}

export function SteadfastHealthWidget({ getAccessToken }: SteadfastHealthWidgetProps) {
  const [health, setHealth] = useState<HealthStatus>({
    status: "checking",
    balance: null,
    lastChecked: null,
    responseTimeMs: null,
    errorMessage: null,
  });
  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    setHealth((prev) => ({ ...prev, status: "checking", errorMessage: null }));

    const startTime = performance.now();

    try {
      const accessToken = await getAccessToken();

      const { data, error } = await supabase.functions.invoke("steadfast-api", {
        body: { type: "balance" },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      if (error) throw error;

      if (data?.success && data?.data) {
        const balanceValue =
          data.data.current_balance ??
          data.data.balance ??
          data.data.data?.current_balance ??
          0;

        setHealth({
          status: "connected",
          balance: parseFloat(balanceValue) || 0,
          lastChecked: new Date(),
          responseTimeMs,
          errorMessage: null,
        });
      } else {
        throw new Error(data?.error || "Failed to connect to Steadfast API");
      }
    } catch (error: any) {
      const endTime = performance.now();
      const responseTimeMs = Math.round(endTime - startTime);

      setHealth({
        status: "error",
        balance: null,
        lastChecked: new Date(),
        responseTimeMs,
        errorMessage: error.message || "Connection failed",
      });
    } finally {
      setIsChecking(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    checkHealth();
    // Check every 5 minutes
    const interval = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [checkHealth]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-BD", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = () => {
    switch (health.status) {
      case "connected":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusIcon = () => {
    switch (health.status) {
      case "connected":
        return <Wifi className="h-5 w-5 text-green-600" />;
      case "error":
        return <WifiOff className="h-5 w-5 text-red-600" />;
      default:
        return <Activity className="h-5 w-5 text-yellow-600 animate-pulse" />;
    }
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 500) return "text-green-600";
    if (ms < 1500) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="rounded-full bg-muted p-2">
                {getStatusIcon()}
              </div>
              <span
                className={cn(
                  "absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-background",
                  getStatusColor(),
                  health.status === "checking" && "animate-pulse"
                )}
              />
            </div>
            <div>
              <CardTitle className="text-base">Steadfast API Status</CardTitle>
              <CardDescription className="text-xs">
                Connection health & diagnostics
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={checkHealth}
            disabled={isChecking}
            className="h-8 w-8"
          >
            <RefreshCw className={cn("h-4 w-4", isChecking && "animate-spin")} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Connection</span>
          {health.status === "checking" ? (
            <Skeleton className="h-5 w-20" />
          ) : (
            <Badge
              variant={health.status === "connected" ? "default" : "destructive"}
              className={cn(
                "gap-1",
                health.status === "connected" && "bg-green-600 hover:bg-green-700"
              )}
            >
              {health.status === "connected" ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  Error
                </>
              )}
            </Badge>
          )}
        </div>

        {/* Response Time */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Response Time</span>
          {health.status === "checking" ? (
            <Skeleton className="h-5 w-16" />
          ) : health.responseTimeMs !== null ? (
            <span
              className={cn(
                "text-sm font-medium",
                getResponseTimeColor(health.responseTimeMs)
              )}
            >
              {health.responseTimeMs}ms
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Balance</span>
          {health.status === "checking" ? (
            <Skeleton className="h-5 w-24" />
          ) : health.balance !== null ? (
            <span className="text-sm font-semibold text-primary">
              {formatCurrency(health.balance)}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>

        {/* Last Checked */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Last Checked</span>
          {health.lastChecked ? (
            <span className="text-sm text-muted-foreground">
              {formatTime(health.lastChecked)}
            </span>
          ) : (
            <Skeleton className="h-5 w-16" />
          )}
        </div>

        {/* Error Message */}
        {health.errorMessage && (
          <div className="flex items-start gap-2 rounded-md bg-destructive/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <span className="text-destructive">{health.errorMessage}</span>
          </div>
        )}

        {/* Low Balance Warning */}
        {health.status === "connected" &&
          health.balance !== null &&
          health.balance < 500 && (
            <div className="flex items-start gap-2 rounded-md bg-yellow-500/10 p-3 text-sm">
              <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
              <span className="text-yellow-700 dark:text-yellow-500">
                Low balance! Consider topping up your Steadfast account.
              </span>
            </div>
          )}
      </CardContent>
    </Card>
  );
}
