import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Truck,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  MapPin,
  Phone,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface CourierStatus {
  consignment_id?: string;
  tracking_code?: string;
  invoice?: string;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_address?: string;
  cod_amount?: number;
  delivery_status?: string;
  status?: string;
  note?: string;
  updated_at?: string;
}

interface CourierTrackingStatusProps {
  orderId: string;
  trackingCode?: string | null;
  consignmentId?: string | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { 
    icon: <Clock className="h-5 w-5" />, 
    color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    label: "Pending Pickup"
  },
  in_review: { 
    icon: <Package className="h-5 w-5" />, 
    color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    label: "In Review"
  },
  picked: { 
    icon: <Package className="h-5 w-5" />, 
    color: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    label: "Picked Up"
  },
  in_transit: { 
    icon: <Truck className="h-5 w-5" />, 
    color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    label: "In Transit"
  },
  out_for_delivery: { 
    icon: <Truck className="h-5 w-5" />, 
    color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    label: "Out for Delivery"
  },
  delivered: { 
    icon: <CheckCircle className="h-5 w-5" />, 
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Delivered"
  },
  partial_delivered: { 
    icon: <CheckCircle className="h-5 w-5" />, 
    color: "bg-green-500/10 text-green-600 border-green-500/20",
    label: "Partially Delivered"
  },
  cancelled: { 
    icon: <XCircle className="h-5 w-5" />, 
    color: "bg-red-500/10 text-red-600 border-red-500/20",
    label: "Cancelled"
  },
  hold: { 
    icon: <Clock className="h-5 w-5" />, 
    color: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    label: "On Hold"
  },
  returned: { 
    icon: <XCircle className="h-5 w-5" />, 
    color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
    label: "Returned"
  },
};

export function CourierTrackingStatus({ orderId, trackingCode, consignmentId }: CourierTrackingStatusProps) {
  const [courierStatus, setCourierStatus] = useState<CourierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchCourierStatus = async () => {
    if (!trackingCode && !consignmentId && !orderId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("public-track-order", {
        body: { 
          order_id: orderId,
          tracking_code: trackingCode,
        },
      });

      if (fnError) throw fnError;

      if (data?.success && data?.data) {
        if (data.data.courier_status) {
          setCourierStatus(data.data.courier_status);
          setLastUpdated(new Date());
        } else if (data.data.courier_error) {
          setError(data.data.courier_error);
        } else if (data.data.message) {
          setError(data.data.message);
        }
      } else {
        throw new Error(data?.error || "Failed to fetch courier status");
      }
    } catch (err) {
      console.error("Error fetching courier status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (trackingCode || consignmentId) {
      fetchCourierStatus();
    }
  }, [orderId, trackingCode, consignmentId]);

  const getStatusInfo = (status: string | undefined) => {
    if (!status) return statusConfig.pending;
    const normalizedStatus = status.toLowerCase().replace(/\s+/g, "_");
    return statusConfig[normalizedStatus] || { 
      icon: <Package className="h-5 w-5" />, 
      color: "bg-gray-500/10 text-gray-600 border-gray-500/20",
      label: status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ")
    };
  };

  // Don't render if no tracking info
  if (!trackingCode && !consignmentId) {
    return null;
  }

  const statusInfo = getStatusInfo(courierStatus?.delivery_status || courierStatus?.status);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Truck className="h-5 w-5 text-primary" />
            Live Courier Status
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchCourierStatus}
            disabled={isLoading}
            className="h-8 gap-2"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && !courierStatus && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Fetching courier status...</span>
          </div>
        )}

        {error && !courierStatus && (
          <div className="flex items-center gap-3 rounded-lg bg-amber-500/10 p-4">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-700">{error}</p>
              <p className="text-xs text-muted-foreground mt-1">
                You can track externally on Steadfast website
              </p>
            </div>
          </div>
        )}

        {courierStatus && (
          <>
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Delivery Status</span>
              <Badge variant="outline" className={`${statusInfo.color} gap-1.5 font-medium`}>
                {statusInfo.icon}
                {statusInfo.label}
              </Badge>
            </div>

            <Separator />

            {/* Tracking Details Grid */}
            <div className="grid gap-3 text-sm">
              {courierStatus.tracking_code && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Tracking Code</span>
                  <code className="font-mono font-semibold text-primary">
                    {courierStatus.tracking_code}
                  </code>
                </div>
              )}

              {courierStatus.consignment_id && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Consignment ID</span>
                  <code className="font-mono text-xs">{courierStatus.consignment_id}</code>
                </div>
              )}

              {courierStatus.cod_amount !== undefined && courierStatus.cod_amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">COD Amount</span>
                  <span className="font-semibold">৳{courierStatus.cod_amount}</span>
                </div>
              )}

              {courierStatus.recipient_name && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Recipient</span>
                  <span>{courierStatus.recipient_name}</span>
                </div>
              )}

              {courierStatus.recipient_address && (
                <div className="flex items-start gap-2 mt-2 p-3 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-muted-foreground">{courierStatus.recipient_address}</p>
                </div>
              )}

              {courierStatus.note && (
                <div className="mt-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <p className="text-sm font-medium text-amber-700">Courier Note:</p>
                  <p className="text-sm text-amber-600 mt-1">{courierStatus.note}</p>
                </div>
              )}
            </div>

            {/* Last Updated */}
            {lastUpdated && (
              <p className="text-xs text-muted-foreground text-center pt-2">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </>
        )}

        {/* External Link */}
        {trackingCode && (
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2 mt-2"
            onClick={() => window.open(`https://steadfast.com.bd/t/${trackingCode}`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
            View on Steadfast Website
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
