import { useState, useEffect } from "react";
import { startOfDay, endOfDay } from "date-fns";
import { Truck, Package, CheckCircle, RotateCcw, Banknote, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface CourierKPIs {
  activeShipments: number;
  deliveredToday: number;
  returnedToday: number;
  codPending: number;
  codPendingAmount: number;
}

export function CourierKPIWidget() {
  const [kpis, setKpis] = useState<CourierKPIs | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchKPIs = async () => {
    setIsLoading(true);
    try {
      const today = new Date();
      const dayStart = startOfDay(today).toISOString();
      const dayEnd = endOfDay(today).toISOString();

      // Fetch all orders in a single query for efficiency
      const { data: orders, error } = await supabase
        .from("orders")
        .select("status, payment_status, payment_method, total_amount, updated_at, courier_tracking_code");

      if (error) throw error;

      // Calculate KPIs
      const activeShipments = orders?.filter(
        (o) => o.status === "shipped" && o.courier_tracking_code
      ).length || 0;

      const deliveredToday = orders?.filter(
        (o) => o.status === "delivered" && o.updated_at >= dayStart && o.updated_at <= dayEnd
      ).length || 0;

      const returnedToday = orders?.filter(
        (o) => (o.status === "returned" || o.status === "return_pending") && 
               o.updated_at >= dayStart && o.updated_at <= dayEnd
      ).length || 0;

      const codPendingOrders = orders?.filter(
        (o) => o.payment_method === "cod" && 
               o.payment_status === "pending" && 
               o.status === "delivered"
      ) || [];

      const codPending = codPendingOrders.length;
      const codPendingAmount = codPendingOrders.reduce(
        (sum, o) => sum + Number(o.total_amount), 0
      );

      setKpis({
        activeShipments,
        deliveredToday,
        returnedToday,
        codPending,
        codPendingAmount,
      });
    } catch (error) {
      console.error("Error fetching courier KPIs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("courier-kpi-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => fetchKPIs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const kpiItems = [
    {
      label: "Active Shipments",
      value: kpis?.activeShipments ?? 0,
      icon: Truck,
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      label: "Delivered Today",
      value: kpis?.deliveredToday ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      label: "Returned Today",
      value: kpis?.returnedToday ?? 0,
      icon: RotateCcw,
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      label: "COD Pending",
      value: kpis?.codPending ?? 0,
      subValue: kpis?.codPendingAmount ? formatCurrency(kpis.codPendingAmount) : undefined,
      icon: Banknote,
      color: "text-amber-600",
      bgColor: "bg-amber-100",
    },
  ];

  return (
    <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 to-cyan-500/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-cyan-600" />
            Courier KPIs
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={fetchKPIs}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpiItems.map((item) => (
            <div
              key={item.label}
              className="flex flex-col items-center rounded-lg border bg-background/50 p-3 text-center"
            >
              <div className={`mb-2 rounded-full p-2 ${item.bgColor}`}>
                <item.icon className={`h-4 w-4 ${item.color}`} />
              </div>
              {isLoading ? (
                <Skeleton className="mb-1 h-6 w-8" />
              ) : (
                <span className="text-xl font-bold">{item.value}</span>
              )}
              <span className="text-xs text-muted-foreground">{item.label}</span>
              {item.subValue && !isLoading && (
                <span className="mt-0.5 text-xs font-medium text-amber-600">
                  {item.subValue}
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
