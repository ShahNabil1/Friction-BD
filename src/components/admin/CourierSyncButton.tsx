import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface CourierSyncButtonProps {
  getAccessToken: () => Promise<string>;
  onSyncComplete?: () => void;
}

interface SyncResult {
  total: number;
  updated: number;
  failed: number;
  details: { orderId: string; status: string; success: boolean }[];
}

export const CourierSyncButton = ({ getAccessToken, onSyncComplete }: CourierSyncButtonProps) => {
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSync, setLastSync] = useState<SyncResult | null>(null);

  const handleSync = async () => {
    setSyncing(true);
    setProgress(0);
    setLastSync(null);

    try {
      const accessToken = await getAccessToken();

      // Fetch orders with courier consignment IDs that are not in final states
      const { data: orders, error: ordersError } = await supabase
        .from("orders")
        .select("id, courier_consignment_id, status")
        .not("courier_consignment_id", "is", null)
        .not("status", "in", '("delivered","partial_delivered","cancelled","returned")')
        .limit(50);

      if (ordersError) throw ordersError;

      if (!orders || orders.length === 0) {
        toast({ title: "No orders to sync", description: "All orders are already in final states" });
        setSyncing(false);
        return;
      }

      setProgress(10);

      // Get consignment IDs
      const consignmentIds = orders
        .filter((o) => o.courier_consignment_id)
        .map((o) => o.courier_consignment_id as string);

      // Fetch bulk statuses from Steadfast
      const { data: statusData, error: statusError } = await supabase.functions.invoke("steadfast-api", {
        body: { type: "bulk_status", consignment_ids: consignmentIds },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (statusError) throw statusError;

      setProgress(50);

      const statuses = statusData?.data?.statuses || {};
      const errors = statusData?.data?.errors || {};

      // Map Steadfast status → internal order status. Preserve partial_delivered.
      const statusMapping: Record<string, string> = {
        pending: "shipped",
        in_review: "processing",
        delivered_approval_pending: "shipped",
        partial_delivered_approval_pending: "shipped",
        cancelled_approval_pending: "shipped",
        unknown_approval_pending: "shipped",
        delivered: "delivered",
        partial_delivered: "partial_delivered",
        cancelled: "cancelled",
        hold: "hold",
        returned: "returned",
        unknown: "shipped",
      };

      const results: SyncResult = {
        total: orders.length,
        updated: 0,
        failed: 0,
        details: [],
      };

      // Update each order
      for (let i = 0; i < orders.length; i++) {
        const order = orders[i];
        const cid = order.courier_consignment_id;

        if (!cid) continue;

        const steadfastStatus = statuses[cid];
        const steadfastError = errors[cid];

        if (steadfastError) {
          results.failed++;
          results.details.push({ orderId: order.id, status: steadfastError, success: false });
          continue;
        }

        if (steadfastStatus) {
          const normalized = String(steadfastStatus).toLowerCase();
          const mappedStatus = statusMapping[normalized] || order.status;

          const update: Record<string, unknown> = {
            courier_status: normalized,
            courier_last_synced_at: new Date().toISOString(),
          };
          if (mappedStatus !== order.status) update.status = mappedStatus;

          const { error: updateError } = await supabase
            .from("orders")
            .update(update)
            .eq("id", order.id);

          if (updateError) {
            results.failed++;
            results.details.push({ orderId: order.id, status: updateError.message, success: false });
          } else {
            results.updated++;
            results.details.push({
              orderId: order.id,
              status: mappedStatus !== order.status ? `${order.status} → ${mappedStatus}` : `synced (${normalized})`,
              success: true,
            });
          }
        }

        setProgress(50 + Math.round((i / orders.length) * 50));
      }


      setProgress(100);
      setLastSync(results);

      toast({
        title: "Sync Complete",
        description: `Updated ${results.updated} orders, ${results.failed} failed`,
      });

      onSyncComplete?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sync failed";
      toast({ title: "Sync Error", description: message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-500/10 p-2">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Sync Order Statuses</CardTitle>
              <CardDescription>Pull latest statuses from Steadfast</CardDescription>
            </div>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Sync Now"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {syncing && (
          <div className="space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
          </div>
        )}

        {lastSync && !syncing && (
          <div className="space-y-3">
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{lastSync.updated} updated</span>
              </div>
              {lastSync.failed > 0 && (
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <span>{lastSync.failed} failed</span>
                </div>
              )}
              <span className="text-muted-foreground">of {lastSync.total} orders</span>
            </div>

            {lastSync.details.length > 0 && (
              <div className="max-h-32 overflow-auto rounded border bg-muted/30 p-2">
                {lastSync.details.slice(0, 10).map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs py-1">
                    {d.success ? (
                      <CheckCircle className="h-3 w-3 text-green-600 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                    )}
                    <code className="font-mono">{d.orderId.slice(0, 8)}...</code>
                    <span className="text-muted-foreground">{d.status}</span>
                  </div>
                ))}
                {lastSync.details.length > 10 && (
                  <p className="text-xs text-muted-foreground pt-1">
                    +{lastSync.details.length - 10} more...
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {!syncing && !lastSync && (
          <p className="text-sm text-muted-foreground">
            Click "Sync Now" to fetch latest delivery statuses and update local orders.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
