import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RotateCcw,
  Search,
  Filter,
  Calendar,
  Printer,
  ArrowLeftRight,
  RefreshCcw,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePOSSettings } from "@/hooks/usePOSSettings";
import frictionLogo from "@/assets/friction-logo-color.jpg";
import { Input } from "@/components/ui/input";
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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { useOutlets } from "@/hooks/useOutlets";

interface ReturnRecord {
  id: string;
  order_id: string | null;
  outlet_id: string | null;
  return_receipt_number: string | null;
  return_type: "refund" | "exchange" | string;
  reason: string | null;
  returned_items: any;
  exchange_items: any;
  original_amount: number;
  exchange_amount: number | null;
  refund_amount: number | null;
  balance_due: number | null;
  processed_by_name: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  orders?: {
    id?: string | null;
    order_number?: string | null;
  } | null;
}

const REASON_LABELS: Record<string, string> = {
  wrong_size: "Wrong Size",
  defective: "Defective",
  changed_mind: "Changed Mind",
  other: "Other",
};

export default function POSReturns() {
  const navigate = useNavigate();
  const { isSuperAdmin, role } = useUserRole();
  const outletsQuery = useOutlets();
  const outlets = outletsQuery.data || [];
  const settings = usePOSSettings();
  const [returns, setReturns] = useState<ReturnRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const canViewAllOutlets = isSuperAdmin || role === "admin";
  const logoSrc = settings.logoUrl || frictionLogo;

  useEffect(() => {
    fetchReturns();
  }, [selectedOutlet, selectedReason, dateRange]);

  const normalizeJsonArray = (value: unknown): any[] => {
    if (Array.isArray(value)) return value;
    if (!value) return [];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("order_returns")
        .select(
          `
            id,
            order_id,
            outlet_id,
            return_receipt_number,
            return_type,
            reason,
            returned_items,
            exchange_items,
            original_amount,
            exchange_amount,
            refund_amount,
            balance_due,
            processed_by_name,
            customer_name,
            customer_phone,
            created_at,
            orders (
              id,
              order_number
            )
          `
        )
        .order("created_at", { ascending: false });

      if (selectedOutlet !== "all") {
        query = query.eq("outlet_id", selectedOutlet);
      }

      if (selectedReason !== "all") {
        query = query.eq("reason", selectedReason);
      }

      if (dateRange.from) {
        query = query.gte("created_at", format(dateRange.from, "yyyy-MM-dd"));
      }

      if (dateRange.to) {
        query = query.lte(
          "created_at",
          format(dateRange.to, "yyyy-MM-dd") + "T23:59:59"
        );
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;

      const normalized = ((data as any[]) || []).map((row) => ({
        ...row,
        returned_items: normalizeJsonArray(row.returned_items),
        exchange_items: normalizeJsonArray(row.exchange_items),
      }));

      setReturns(normalized as ReturnRecord[]);
    } catch (error) {
      console.error("Error fetching returns:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get the primary reason from returned_items
  const getPrimaryReason = (ret: ReturnRecord): string => {
    // First check the main reason field
    if (ret.reason) return ret.reason;

    const items = Array.isArray(ret.returned_items) ? ret.returned_items : [];
    const firstWithReason = items.find((item: any) => item?.reason);
    return firstWithReason?.reason || "";
  };

  // Helper to get order number - prefer explicit order_number, else derive from order uuid
  const getOrderNumber = (ret: ReturnRecord): string => {
    if (ret.orders?.order_number) return ret.orders.order_number;

    const id = ret.orders?.id || ret.order_id;
    if (id) return `#${id.substring(0, 8).toUpperCase()}`;

    return "";
  };

  const filteredReturns = returns.filter((ret) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ret.return_receipt_number?.toLowerCase().includes(query) ||
      ret.customer_name?.toLowerCase().includes(query) ||
      ret.customer_phone?.includes(query) ||
      getOrderNumber(ret).toLowerCase().includes(query)
    );
  });

  const handlePrintReceipt = (returnRecord: ReturnRecord) => {
    const printWindow = window.open("", "_blank", "width=420,height=800");
    if (!printWindow) return;

    const widthMm = settings.paperWidth === "58mm" ? "58mm" : "80mm";
    const pageHeightMm = settings.paperWidth === "58mm" ? "1200mm" : "1800mm";
    const returnId = `RET-${(returnRecord.return_receipt_number || returnRecord.id).slice(0, 8).toUpperCase()}`;
    const orderNumber = getOrderNumber(returnRecord) || "N/A";
    const dateTime = format(new Date(returnRecord.created_at), "dd MMM yyyy HH:mm");

    const formatPrice = (amount: number) => amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const returnItemsTotal = returnRecord.returned_items.reduce(
      (sum: number, item: any) => sum + (item.price * item.qty), 0
    );
    const exchangeItemsTotal = returnRecord.exchange_items.reduce(
      (sum: number, item: any) => sum + (item.price * item.qty), 0
    );

    const returnedItemsHtml = returnRecord.returned_items.map((item: any) => {
      const variantInfo = [item.size, item.color].filter(Boolean).join(" / ");
      return `
        <tr style="border-bottom: 1px dotted #ccc;">
          <td style="padding: 6px 0; font-size: 9px;">
            <div>${item.title}</div>
            ${variantInfo ? `<div style="font-size: 7px; color: #666;">${variantInfo}</div>` : ""}
          </td>
          <td style="padding: 6px 0; text-align: center; font-size: 9px;">${item.qty}</td>
          <td style="padding: 6px 0; text-align: right; font-size: 9px;">${formatPrice(item.price)}</td>
          <td style="padding: 6px 0; text-align: left; font-size: 7px; color: #666;">${REASON_LABELS[item.reason] || item.reason || "-"}</td>
          <td style="padding: 6px 0; text-align: right; font-size: 9px; font-weight: 600;">${formatPrice(item.price * item.qty)}</td>
        </tr>
      `;
    }).join("");

    const exchangeItemsHtml = returnRecord.return_type === "exchange" && returnRecord.exchange_items.length > 0
      ? returnRecord.exchange_items.map((item: any) => {
          const variantInfo = [item.size, item.color].filter(Boolean).join(" / ");
          return `
            <tr style="border-bottom: 1px dotted #ccc;">
              <td style="padding: 6px 0; font-size: 9px;">
                <div>${item.title}</div>
                ${variantInfo ? `<div style="font-size: 7px; color: #666;">${variantInfo}</div>` : ""}
              </td>
              <td style="padding: 6px 0; text-align: center; font-size: 9px;">${item.qty}</td>
              <td style="padding: 6px 0; text-align: right; font-size: 9px;">${formatPrice(item.price)}</td>
              <td style="padding: 6px 0; text-align: right; font-size: 9px; font-weight: 600;">${formatPrice(item.price * item.qty)}</td>
            </tr>
          `;
        }).join("")
      : "";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Credit Note ${returnId}</title>
        <style>
          @page { size: ${widthMm} ${pageHeightMm}; margin: 0 !important; }
          *, *::before, *::after { color: #000 !important; font-weight: 700 !important; font-size: 12px !important; }
          html, body { margin: 0 !important; padding: 0 !important; width: ${widthMm} !important; max-width: ${widthMm} !important; background: #fff !important; font-family: Arial, sans-serif; }
          body { line-height: 1.35; padding: 1mm 3mm !important; }
          h1 { font-size: 14px !important; } h2 { font-size: 12px !important; }
          table { width: 100%; border-collapse: collapse; }
          .receipt-logo { max-width: 45mm !important; height: auto !important; margin: 0 auto 3mm auto !important; display: block !important; /* logo already color */ }
          .grand-total { font-size: 14px !important; }
          @media print { @page { size: ${widthMm} ${pageHeightMm}; margin: 0 !important; } html, body { width: ${widthMm} !important; } }
        </style>
      </head>
      <body>
        <!-- Mushak Label -->
        ${settings.showMushakLabel ? `<div style="text-align: right; font-size: 8px; color: #666;">${settings.mushakLabel}</div>` : ""}
        
        <!-- Header -->
        <div style="text-align: center; padding-top: 2mm;">
          ${settings.showLogo ? `<img src="${logoSrc}" alt="Logo" class="receipt-logo" />` : ""}
          ${settings.govtHeader1 ? `<p style="font-size: 9px; color: #666; font-family: 'Times New Roman', serif;">${settings.govtHeader1}</p>` : ""}
          ${settings.govtHeader2 ? `<p style="font-size: 9px; color: #666; font-family: 'Times New Roman', serif; margin-bottom: 3mm;">${settings.govtHeader2}</p>` : ""}
          <h1 style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2mm 0;">${settings.companyName}</h1>
          ${settings.registeredAddress ? `<p style="font-size: 8px; color: #666; margin: 0;">${settings.registeredAddress}</p>` : ""}
          ${settings.vatRegNo ? `<p style="font-size: 9px; margin: 2mm 0 0 0;">Central VAT Reg. No.: ${settings.vatRegNo}</p>` : ""}
          ${settings.contactMobile || settings.contactWebsite ? `<p style="font-size: 8px; color: #666; margin: 2mm 0 0 0;">${settings.contactMobile ? `Mobile: ${settings.contactMobile}` : ""}${settings.contactMobile && settings.contactWebsite ? ", " : ""}${settings.contactWebsite || ""}</p>` : ""}
        </div>
        
        <hr style="border: none; border-top: 1px dashed #000; margin: 3mm 0;" />
        
        <!-- Title -->
        <h2 style="text-align: center; font-size: 13px; text-transform: uppercase; margin: 0 0 3mm 0;">
          ${returnRecord.return_type === "exchange" ? "Exchange Note" : "Credit Note / Return"}
        </h2>
        
        <!-- Details -->
        <div style="margin-bottom: 3mm;">
          <div style="display: flex; justify-content: space-between; font-size: 9px;"><span style="color: #666;">Return ID:</span><span>${returnId}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 9px;"><span style="color: #666;">Date:</span><span>${dateTime}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 9px;"><span style="color: #666;">Original Invoice:</span><span>${orderNumber}</span></div>
          <div style="display: flex; justify-content: space-between; font-size: 9px;"><span style="color: #666;">Customer:</span><span>${returnRecord.customer_name || "Walk-in Customer"}</span></div>
          ${returnRecord.customer_phone ? `<div style="font-size: 9px;"><span style="color: #666;">Mobile:</span> ${returnRecord.customer_phone}</div>` : ""}
          ${returnRecord.processed_by_name ? `<div style="font-size: 9px;"><span style="color: #666;">Processed By:</span> ${returnRecord.processed_by_name}</div>` : ""}
        </div>
        
        <hr style="border: none; border-top: 1px solid #000; margin: 2mm 0;" />
        
        <!-- Returned Items -->
        <p style="font-size: 8px; text-transform: uppercase; color: #666; margin: 0 0 2mm 0;">Items Returned</p>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000;">
              <th style="text-align: left; font-size: 8px; padding: 3px 0; width: 30%;">Item</th>
              <th style="text-align: center; font-size: 8px; padding: 3px 0; width: 10%;">Qty</th>
              <th style="text-align: right; font-size: 8px; padding: 3px 0; width: 18%;">Price</th>
              <th style="text-align: left; font-size: 8px; padding: 3px 0; width: 22%;">Reason</th>
              <th style="text-align: right; font-size: 8px; padding: 3px 0; width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>${returnedItemsHtml}</tbody>
        </table>
        
        ${returnRecord.return_type === "exchange" && returnRecord.exchange_items.length > 0 ? `
          <hr style="border: none; border-top: 1px dashed #000; margin: 3mm 0;" />
          <p style="font-size: 8px; text-transform: uppercase; color: #666; margin: 0 0 2mm 0;">Exchange Items</p>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000;">
                <th style="text-align: left; font-size: 8px; padding: 3px 0; width: 40%;">Item</th>
                <th style="text-align: center; font-size: 8px; padding: 3px 0; width: 15%;">Qty</th>
                <th style="text-align: right; font-size: 8px; padding: 3px 0; width: 20%;">Price</th>
                <th style="text-align: right; font-size: 8px; padding: 3px 0; width: 25%;">Total</th>
              </tr>
            </thead>
            <tbody>${exchangeItemsHtml}</tbody>
          </table>
        ` : ""}
        
        <hr style="border: none; border-top: 1px dashed #000; margin: 3mm 0;" />
        
        <!-- Totals -->
        <div style="font-size: 9px; margin-bottom: 2mm;">
          <div style="display: flex; justify-content: space-between;"><span>Returned Items Total:</span><span>${formatPrice(returnItemsTotal)}</span></div>
          ${returnRecord.return_type === "exchange" && returnRecord.exchange_items.length > 0 ? `<div style="display: flex; justify-content: space-between;"><span>Exchange Items Total:</span><span>${formatPrice(exchangeItemsTotal)}</span></div>` : ""}
        </div>
        
        <!-- Grand Total -->
        <div class="grand-total" style="display: flex; justify-content: space-between; padding: 3mm 0; margin: 2mm 0; border-top: 2px solid #000; border-bottom: 2px solid #000; font-size: 14px;">
          ${returnRecord.return_type === "refund" 
            ? `<span>TOTAL REFUNDED:</span><span>৳ ${formatPrice(returnRecord.refund_amount || 0)}</span>`
            : `<span>${(returnRecord.balance_due || 0) > 0 ? "CUSTOMER PAYS:" : "CREDIT TO CUSTOMER:"}</span><span>৳ ${formatPrice(Math.abs(returnRecord.balance_due || 0))}</span>`
          }
        </div>
        
        <!-- Method -->
        <div style="font-size: 9px; margin-bottom: 4mm;">
          <div style="display: flex; justify-content: space-between;"><span style="color: #666;">Refund Method:</span><span>${returnRecord.return_type === "exchange" ? "Adjustment" : "Cash"}</span></div>
        </div>
        
        <!-- Footer -->
        <div style="text-align: center; margin-top: 5mm; font-size: 8px; color: #666;">
          <p style="margin: 2mm 0;">Thank you for shopping with us!</p>
          ${settings.contactWebsite ? `<p style="margin: 0;">${settings.contactWebsite}</p>` : ""}
        </div>
        <div style="text-align: center; margin-top: 4mm; font-size: 9px; font-family: monospace; color: #666;">
          Developed By www.shahnabil.com
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();

    const triggerPrint = () => {
      setTimeout(() => {
        try {
          printWindow.focus();
          printWindow.print();
        } finally {
          printWindow.close();
        }
      }, 400);
    };

    printWindow.onload = triggerPrint;
    setTimeout(triggerPrint, 1200);
  };

  // Stats
  const totalReturns = filteredReturns.length;
  const totalRefunds = filteredReturns
    .filter((r) => r.return_type === "refund")
    .reduce((sum, r) => sum + r.refund_amount, 0);
  const totalExchanges = filteredReturns.filter(
    (r) => r.return_type === "exchange"
  ).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/pos")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <RotateCcw className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Return History</h1>
                <p className="text-xs text-muted-foreground">
                  Track all returns and exchanges
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReturns}>
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Returns
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalReturns}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Refunded
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">
                ৳{totalRefunds.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Exchanges
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{totalExchanges}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by receipt, order, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {canViewAllOutlets && outlets.length > 1 && (
            <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
              <SelectTrigger className="w-[180px]">
                <Building2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All Outlets" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Outlets</SelectItem>
                {outlets.map((outlet) => (
                  <SelectItem key={outlet.id} value={outlet.id}>
                    {outlet.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={selectedReason} onValueChange={setSelectedReason}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Reasons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Reasons</SelectItem>
              <SelectItem value="wrong_size">Wrong Size</SelectItem>
              <SelectItem value="defective">Defective</SelectItem>
              <SelectItem value="changed_mind">Changed Mind</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                {dateRange.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`
                    : format(dateRange.from, "MMM d")
                  : "Date Range"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <CalendarComponent
                mode="range"
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={(range) =>
                  setDateRange({ from: range?.from, to: range?.to })
                }
                initialFocus
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setDateRange({ from: undefined, to: undefined })
                    }
                  >
                    Clear
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date/Time</TableHead>
                  <TableHead>Original Order</TableHead>
                  <TableHead>Return Receipt</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Served By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredReturns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No returns found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReturns.map((ret) => (
                    <TableRow key={ret.id}>
                      <TableCell className="whitespace-nowrap">
                        <div>
                          <p className="font-medium">
                            {format(new Date(ret.created_at), "dd MMM yyyy")}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(ret.created_at), "HH:mm")}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {getOrderNumber(ret) || "—"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {ret.return_receipt_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {ret.customer_name || "Walk-in"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {ret.customer_phone}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {ret.returned_items.slice(0, 2).map((item: any, i) => (
                            <p key={i} className="text-sm truncate max-w-[150px]">
                              {item.qty}× {item.title}
                            </p>
                          ))}
                          {ret.returned_items.length > 2 && (
                            <p className="text-xs text-muted-foreground">
                              +{ret.returned_items.length - 2} more
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {REASON_LABELS[getPrimaryReason(ret)] || getPrimaryReason(ret) || "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ret.return_type === "exchange"
                              ? "secondary"
                              : "default"
                          }
                          className={cn(
                            "gap-1",
                            ret.return_type === "refund" &&
                              "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          )}
                        >
                          {ret.return_type === "exchange" ? (
                            <>
                              <ArrowLeftRight className="h-3 w-3" />
                              Exchange
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3 w-3" />
                              Refund
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {ret.return_type === "exchange" ? (
                          <span
                            className={
                              ret.balance_due > 0
                                ? "text-destructive"
                                : "text-emerald-600"
                            }
                          >
                            {ret.balance_due > 0 ? "+" : ""}৳
                            {Math.abs(ret.balance_due).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-emerald-600">
                            ৳{ret.refund_amount.toLocaleString()}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {ret.processed_by_name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePrintReceipt(ret)}
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
