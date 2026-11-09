import { useState, useEffect } from "react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import {
  FileText,
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Loader2,
  Calculator,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import AdvancedFinancialReport from "@/components/admin/AdvancedFinancialReport";
import { useUserRole } from "@/hooks/useUserRole";

interface ReportData {
  date: string;
  orders: number;
  revenue: number;
  cancelled: number;
}

interface OrderSummary {
  id: string;
  order_number: string | null;
  date: string;
  customer: string;
  status: string;
  amount: number;
}

export default function AdminReports() {
  const [period, setPeriod] = useState("thisMonth");
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrderSummary[]>([]);
  const [activeTab, setActiveTab] = useState("basic");
  const { role } = useUserRole();
  const isSuperAdmin = role === "super_admin";
  const [totals, setTotals] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
  });

  const getDateRange = (p: string) => {
    const now = new Date();
    switch (p) {
      case "last7days":
        return { start: subDays(now, 7), end: now };
      case "last30days":
        return { start: subDays(now, 30), end: now };
      case "thisMonth":
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case "lastMonth":
        const lastMonth = subDays(startOfMonth(now), 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      default:
        return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  };

  useEffect(() => {
    const fetchReport = async () => {
      setIsLoading(true);
      const { start, end } = getDateRange(period);

      try {
        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .gte("created_at", start.toISOString())
          .lte("created_at", end.toISOString())
          .order("created_at", { ascending: true });

        if (error) throw error;

        // Calculate totals
        const completedOrders = orders?.filter((o) => o.status !== "cancelled") || [];
        const cancelledOrders = orders?.filter((o) => o.status === "cancelled") || [];
        const totalRevenue = completedOrders.reduce(
          (sum, o) => sum + Number(o.total_amount),
          0
        );

        setTotals({
          totalRevenue,
          totalOrders: orders?.length || 0,
          cancelledOrders: cancelledOrders.length,
          averageOrderValue: completedOrders.length
            ? totalRevenue / completedOrders.length
            : 0,
        });

        // Group by date for chart
        const dateMap = new Map<string, ReportData>();
        orders?.forEach((order) => {
          const dateKey = format(new Date(order.created_at), "MMM dd");
          const existing = dateMap.get(dateKey) || {
            date: dateKey,
            orders: 0,
            revenue: 0,
            cancelled: 0,
          };
          dateMap.set(dateKey, {
            date: dateKey,
            orders: existing.orders + 1,
            revenue:
              existing.revenue +
              (order.status !== "cancelled" ? Number(order.total_amount) : 0),
            cancelled: existing.cancelled + (order.status === "cancelled" ? 1 : 0),
          });
        });

        setReportData(Array.from(dateMap.values()));

        // Order summary for table
        const summary: OrderSummary[] = (orders || []).slice(0, 20).map((o: any) => ({
          id: o.id,
          order_number: o.order_number ?? null,
          date: format(new Date(o.created_at), "MMM dd, yyyy"),
          customer: o.customer_name || "N/A",
          status: o.status,
          amount: Number(o.total_amount),
        }));

        setOrderSummary(summary);
      } catch (error) {
        console.error("Error fetching report:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [period]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const exportToCSV = () => {
    const headers = ["Order ID", "Date", "Customer", "Status", "Amount"];
    const rows = orderSummary.map((o) => [
      o.id,
      `"${o.date}"`, // Wrap in quotes to prevent comma from breaking CSV
      `"${o.customer}"`, // Wrap in quotes in case customer name has commas
      o.status,
      o.amount,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${period}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reports</h1>
            <p className="text-muted-foreground">
              Sales and revenue analytics
            </p>
          </div>
        </div>

        {/* Tabs for Basic and Advanced Reports */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="basic" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Basic Report
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="advanced" className="flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Advanced Financial
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="basic" className="space-y-6">
            {/* Basic Report Controls */}
            <div className="flex gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last7days">Last 7 Days</SelectItem>
                  <SelectItem value="last30days">Last 30 Days</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportToCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Summary Cards - 2x2 grid on mobile */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center gap-2 p-3 text-center md:flex-row md:items-center md:gap-4 md:p-4 md:text-left">
                  <div className="rounded-lg bg-green-100 p-1.5 md:p-2.5">
                    <DollarSign className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Total Revenue</p>
                    <p className="text-base font-bold md:text-2xl">
                      {formatCurrency(totals.totalRevenue)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center gap-2 p-3 text-center md:flex-row md:items-center md:gap-4 md:p-4 md:text-left">
                  <div className="rounded-lg bg-blue-100 p-1.5 md:p-2.5">
                    <ShoppingCart className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Total Orders</p>
                    <p className="text-base font-bold md:text-2xl">{totals.totalOrders}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center gap-2 p-3 text-center md:flex-row md:items-center md:gap-4 md:p-4 md:text-left">
                  <div className="rounded-lg bg-purple-100 p-1.5 md:p-2.5">
                    <TrendingUp className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Avg. Order</p>
                    <p className="text-base font-bold md:text-2xl">
                      {formatCurrency(totals.averageOrderValue)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center gap-2 p-3 text-center md:flex-row md:items-center md:gap-4 md:p-4 md:text-left">
                  <div className="rounded-lg bg-red-100 p-1.5 md:p-2.5">
                    <TrendingDown className="h-4 w-4 text-red-600 md:h-5 md:w-5" />
                  </div>
                  <div>
                    <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Cancelled</p>
                    <p className="text-base font-bold md:text-2xl">{totals.cancelledOrders}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts - Hidden on mobile */}
            <div className="hidden gap-6 md:grid lg:grid-cols-2">
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                          formatter={(value: number) => [formatCurrency(value), "Revenue"]}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          stroke="hsl(var(--primary))"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      No data for selected period
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle>Orders vs Cancellations</CardTitle>
                </CardHeader>
                <CardContent>
                  {reportData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={reportData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--background))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                        <Bar dataKey="orders" name="Orders" fill="hsl(var(--primary))" />
                        <Bar dataKey="cancelled" name="Cancelled" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                      No data for selected period
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Orders */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Recent Orders
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 md:p-0">
                {/* Mobile Cards */}
                <div className="space-y-2 p-3 md:hidden">
                  {orderSummary.length === 0 ? (
                    <p className="py-8 text-center text-muted-foreground">No orders found</p>
                  ) : (
                    orderSummary.map((order) => (
                      <div
                        key={order.id}
                        className="rounded-lg border border-border/50 p-3"
                      >
                        {/* Top Row: Order ID + Status */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm font-medium">
                            #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                              order.status === "delivered"
                                ? "bg-green-100 text-green-700"
                                : order.status === "cancelled"
                                ? "bg-red-100 text-red-700"
                                : order.status === "processing"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {order.status}
                          </span>
                        </div>
                        {/* Middle: Customer Name */}
                        <p className="mt-1.5 truncate text-sm font-medium">
                          {order.customer}
                        </p>
                        {/* Bottom Row: Date + Amount */}
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{order.date}</span>
                          <span className="font-semibold text-primary">
                            {formatCurrency(order.amount)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderSummary.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-mono text-sm">
                            #{order.order_number || order.id.slice(0, 8).toUpperCase()}
                          </TableCell>
                          <TableCell>{order.date}</TableCell>
                          <TableCell>{order.customer}</TableCell>
                          <TableCell className="capitalize">{order.status}</TableCell>
                          <TableCell className="text-right font-semibold text-primary">
                            {formatCurrency(order.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
          </TabsContent>

          {isSuperAdmin && (
            <TabsContent value="advanced">
              <AdvancedFinancialReport />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
