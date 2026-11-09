import { useState, useEffect } from "react";
import { format, subDays, startOfDay, endOfDay, startOfMonth } from "date-fns";
import {
  ShoppingCart,
  Clock,
  CheckCircle,
  Truck,
  DollarSign,
  TrendingUp,
  Package,
  XCircle,
  Wallet,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { CourierKPIWidget } from "@/components/admin/CourierKPIWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

interface MetricsData {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
}

interface ChartData {
  date: string;
  orders: number;
  revenue: number;
}

const dateRanges = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7days", label: "Last 7 Days" },
  { value: "30days", label: "Last 30 Days" },
  { value: "thisMonth", label: "This Month" },
];

const channelOptions = [
  { value: "all", label: "All Sales" },
  { value: "website", label: "Online Only" },
  { value: "pos", label: "POS Only" },
];

// Premium stat card component
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  borderColor,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  isLoading: boolean;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-t-4 bg-white shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        borderColor
      )}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110",
            bgColor
          )}
        >
          <Icon className={cn("h-6 w-6", color)} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {isLoading ? (
            <Skeleton className="mt-1 h-8 w-16" />
          ) : (
            <p className="text-3xl font-bold text-slate-900">{value}</p>
          )}
        </div>
      </CardContent>
      {/* Subtle gradient overlay on hover */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-transparent to-slate-50/50 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Card>
  );
}

// Premium revenue card
function RevenueCard({
  title,
  value,
  subtitle,
  icon: Icon,
  gradient,
  iconColor,
  isLoading,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  gradient: string;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-0 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
        gradient
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white/90">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10 w-40 bg-white/20" />
        ) : (
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{value}</span>
            <span className="text-sm text-white/70">{subtitle}</span>
          </div>
        )}
      </CardContent>
      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
    </Card>
  );
}

export default function AdminDashboard() {
  const [dateRange, setDateRange] = useState("today");
  const [channelFilter, setChannelFilter] = useState("all");
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [courierBalance, setCourierBalance] = useState<number | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const getDateRange = (range: string) => {
    const now = new Date();
    switch (range) {
      case "today":
        return { start: startOfDay(now), end: endOfDay(now) };
      case "yesterday":
        const yesterday = subDays(now, 1);
        return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
      case "7days":
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case "30days":
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfDay(now) };
      default:
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  };

  const fetchCourierBalance = async () => {
    setIsBalanceLoading(true);
    setBalanceError(null);
    try {
      const { data, error } = await supabase.functions.invoke("steadfast-api", {
        body: { type: "balance" },
      });

      if (error) throw error;

      if (data?.success && data?.data?.current_balance !== undefined) {
        setCourierBalance(Number(data.data.current_balance));
      } else if (data?.data?.balance !== undefined) {
        setCourierBalance(Number(data.data.balance));
      } else {
        setBalanceError("Unable to fetch balance");
      }
    } catch (error) {
      console.error("Error fetching courier balance:", error);
      setBalanceError("Failed to load");
    } finally {
      setIsBalanceLoading(false);
    }
  };

  useEffect(() => {
    fetchCourierBalance();
  }, []);

  useEffect(() => {
    const fetchMetrics = async () => {
      setIsLoading(true);
      const { start, end } = getDateRange(dateRange);

      try {
        let query = supabase
          .from("orders")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString());

        // Apply channel filter
        if (channelFilter === "website") {
          query = query.or("source.eq.website,source.eq.manual,source.is.null");
        } else if (channelFilter === "pos") {
          query = query.eq("source", "pos");
        }

        const { data: orders, error } = await query;

        if (error) throw error;

        const metricsData: MetricsData = {
          totalOrders: orders?.length || 0,
          pendingOrders: orders?.filter((o) => o.status === "pending").length || 0,
          processingOrders: orders?.filter((o) => o.status === "processing").length || 0,
          shippedOrders: orders?.filter((o) => o.status === "shipped").length || 0,
          deliveredOrders: orders?.filter((o) => o.status === "delivered").length || 0,
          cancelledOrders: orders?.filter((o) => o.status === "cancelled").length || 0,
          totalRevenue: orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
        };

        setMetrics(metricsData);

        // Prepare chart data
        const chartDataMap = new Map<string, { orders: number; revenue: number }>();
        orders?.forEach((order) => {
          const dateKey = format(new Date(order.created_at), "MMM dd");
          const existing = chartDataMap.get(dateKey) || { orders: 0, revenue: 0 };
          chartDataMap.set(dateKey, {
            orders: existing.orders + 1,
            revenue: existing.revenue + Number(order.total_amount),
          });
        });

        const chartArray: ChartData[] = Array.from(chartDataMap.entries()).map(
          ([date, data]) => ({
            date,
            orders: data.orders,
            revenue: data.revenue,
          })
        );

        setChartData(chartArray);
      } catch (error) {
        console.error("Error fetching metrics:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();

    // Set up realtime subscription
    const channel = supabase
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          fetchMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dateRange, channelFilter]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Orders",
      value: metrics?.totalOrders || 0,
      icon: ShoppingCart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-t-blue-500",
    },
    {
      title: "Pending",
      value: metrics?.pendingOrders || 0,
      icon: Clock,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      borderColor: "border-t-amber-500",
    },
    {
      title: "Processing",
      value: metrics?.processingOrders || 0,
      icon: Package,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-t-purple-500",
    },
    {
      title: "Shipped",
      value: metrics?.shippedOrders || 0,
      icon: Truck,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-t-indigo-500",
    },
    {
      title: "Delivered",
      value: metrics?.deliveredOrders || 0,
      icon: CheckCircle,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-t-green-500",
    },
    {
      title: "Cancelled",
      value: metrics?.cancelledOrders || 0,
      icon: XCircle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-t-red-500",
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500">Overview of your store performance</p>
          </div>
          <div className="flex gap-2">
            <Select value={channelFilter} onValueChange={setChannelFilter}>
              <SelectTrigger className="w-[140px] border-slate-200 bg-white shadow-sm">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                {channelOptions.map((channel) => (
                  <SelectItem key={channel.value} value={channel.value}>
                    {channel.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px] border-slate-200 bg-white shadow-sm">
                <SelectValue placeholder="Select date range" />
              </SelectTrigger>
              <SelectContent>
                {dateRanges.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Revenue & Balance Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          <RevenueCard
            title="Total Revenue"
            value={formatCurrency(metrics?.totalRevenue || 0)}
            subtitle={`from ${metrics?.totalOrders || 0} orders`}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-primary via-primary to-maroon"
            iconColor="text-white"
            isLoading={isLoading}
          />

          <Card className="group relative hidden overflow-hidden border-0 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl md:block">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-lg text-white/90">
                <div className="flex items-center gap-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                    <Wallet className="h-5 w-5 text-white" />
                  </div>
                  Steadfast Balance
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/80 hover:bg-white/20 hover:text-white"
                  onClick={fetchCourierBalance}
                  disabled={isBalanceLoading}
                >
                  <RefreshCw
                    className={cn("h-4 w-4", isBalanceLoading && "animate-spin")}
                  />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isBalanceLoading ? (
                <Skeleton className="h-10 w-40 bg-white/20" />
              ) : balanceError ? (
                <span className="text-lg text-white/70">{balanceError}</span>
              ) : (
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {formatCurrency(courierBalance || 0)}
                  </span>
                  <span className="text-sm text-white/70">courier balance</span>
                </div>
              )}
            </CardContent>
            <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
            <div className="pointer-events-none absolute -bottom-4 -right-4 h-16 w-16 rounded-full bg-white/5" />
          </Card>
        </div>

        {/* Courier KPIs - Hidden on mobile */}
        <div className="hidden md:block">
          <CourierKPIWidget />
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {statCards.map((stat) => (
            <StatCard
              key={stat.title}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
              bgColor={stat.bgColor}
              borderColor={stat.borderColor}
              isLoading={isLoading}
            />
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Orders Chart */}
          <Card className="overflow-hidden border-0 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <TrendingUp className="h-4 w-4 text-primary" />
                </div>
                Orders Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorOrders)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-slate-400">
                  No data for selected period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="overflow-hidden border-0 bg-white shadow-lg transition-all duration-300 hover:shadow-xl">
            <CardHeader className="border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="flex items-center gap-2 text-slate-900">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-4 w-4 text-primary" />
                </div>
                Revenue Trend
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <Skeleton className="h-[250px] w-full" />
              ) : chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                      }}
                      formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                    />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, strokeWidth: 0 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[250px] items-center justify-center text-slate-400">
                  No data for selected period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
