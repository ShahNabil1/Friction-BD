import { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Wallet, CreditCard, AlertCircle } from "lucide-react";
import { CourierStatusLookup } from "@/components/admin/CourierStatusLookup";
import { CourierSyncButton } from "@/components/admin/CourierSyncButton";
import { SteadfastHealthWidget } from "@/components/admin/SteadfastHealthWidget";

interface Payment {
  payment_id: string;
  amount: number;
  total: number;
  method: string;
  status_label: string;
  created_at: string;
  paid_at: string;
  ready_at?: string;
  due_bills?: number;
  paid_bills?: number;
  charges?: number;
}

const Courier = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const [paymentsError, setPaymentsError] = useState<string | null>(null);

  const getAccessToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;
    if (!accessToken) {
      throw new Error("You are not signed in. Please log in as an admin and try again.");
    }
    return accessToken;
  }, []);

  const invokeSteadfast = useCallback(async (type: "balance" | "payments" | "returns") => {
    const accessToken = await getAccessToken();
    return await supabase.functions.invoke("steadfast-api", {
      body: { type },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }, [getAccessToken]);

  const fetchBalance = async () => {
    setLoadingBalance(true);
    setBalanceError(null);
    try {
      const { data, error } = await invokeSteadfast("balance");

      if (error) throw error;

      if (data?.success && data?.data) {
        // Steadfast returns balance in different formats, handle both
        const balanceValue = data.data.current_balance ?? data.data.balance ?? data.data.data?.current_balance ?? 0;
        setBalance(parseFloat(balanceValue) || 0);
      } else {
        throw new Error(data?.error || "Failed to fetch balance");
      }
    } catch (error: any) {
      console.error("Balance fetch error:", error);
      setBalanceError(error.message || "Failed to fetch balance");
      setBalance(null);
    } finally {
      setLoadingBalance(false);
    }
  };

  const fetchPayments = async () => {
    setLoadingPayments(true);
    setPaymentsError(null);
    try {
      const { data, error } = await invokeSteadfast("payments");

      if (error) throw error;

      if (data?.success && data?.data) {
        // Steadfast returns payments in data.payments array
        const paymentsList = data.data.payments || data.data.data || data.data || [];
        setPayments(Array.isArray(paymentsList) ? paymentsList : []);
      } else {
        throw new Error(data?.error || "Failed to fetch payments");
      }
    } catch (error: any) {
      console.error("Payments fetch error:", error);
      setPaymentsError(error.message || "Failed to fetch payments");
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  };

  const refreshAll = () => {
    fetchBalance();
    fetchPayments();
    toast({
      title: "Refreshing",
      description: "Fetching latest data from Steadfast...",
    });
  };

  useEffect(() => {
    fetchBalance();
    fetchPayments();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    try {
      return new Date(dateString).toLocaleDateString("en-BD", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const getStatusVariant = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "paid") return "default";
    if (s === "ready") return "secondary";
    if (s === "pending") return "outline";
    return "outline";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Courier Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your Steadfast courier account
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={refreshAll} variant="outline" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh All
            </Button>
          </div>
        </div>

        {/* Balance Card */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Wallet className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Current Courier Balance</CardTitle>
                <CardDescription>Your available balance with Steadfast</CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchBalance}
              disabled={loadingBalance}
            >
              <RefreshCw className={`h-4 w-4 ${loadingBalance ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBalance ? (
              <Skeleton className="h-12 w-48" />
            ) : balanceError ? (
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <span>{balanceError}</span>
              </div>
            ) : (
              <p className="text-4xl font-bold text-primary">
                {balance !== null ? formatCurrency(balance) : "N/A"}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Health Widget and Status Lookup Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          <SteadfastHealthWidget getAccessToken={getAccessToken} />
          <CourierStatusLookup getAccessToken={getAccessToken} />
          <CourierSyncButton getAccessToken={getAccessToken} onSyncComplete={refreshAll} />
        </div>

        {/* Two Column Layout for Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Payment History */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-500/10 p-2">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Payment History</CardTitle>
                  <CardDescription>Recent payouts from Steadfast</CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchPayments}
                disabled={loadingPayments}
              >
                <RefreshCw className={`h-4 w-4 ${loadingPayments ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent>
              {loadingPayments ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : paymentsError ? (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" />
                  <span>{paymentsError}</span>
                </div>
              ) : payments.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  No payment history available
                </p>
              ) : (
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment ID</TableHead>
                        <TableHead className="text-right">COD</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((payment, index) => (
                        <TableRow key={payment.payment_id || index}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {formatDate(payment.paid_at || payment.ready_at || payment.created_at)}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs font-mono">
                            {payment.payment_id || "-"}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            {formatCurrency(payment.amount || 0)}
                          </TableCell>
                          <TableCell className="text-right text-green-600 font-semibold whitespace-nowrap">
                            {formatCurrency(payment.total || 0)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={getStatusVariant(payment.status_label)} className="text-xs capitalize">
                              {payment.status_label || "-"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Courier;
