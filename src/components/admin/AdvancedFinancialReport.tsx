import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Download,
  FileDown,
  Loader2,
  TrendingUp,
  TrendingDown,
  Store,
  Globe,
  ReceiptText,
  AlertTriangle,
  XCircle,
  CalendarIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  TableFooter,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useOutlets } from "@/hooks/useOutlets";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ProductSalesData {
  productId: string;
  productName: string;
  quantitySold: number;
  totalBeforeDiscount: number;
  totalDiscount: number;
  totalAfterDiscount: number;
  buyingPrice: number;
  cogs: number;
}

interface ExpenseData {
  id: string;
  category: string;
  description: string;
  amount: number;
  createdByName: string;
  createdAt: string;
}

interface ReportData {
  posSales: ProductSalesData[];
  onlineSales: ProductSalesData[];
  expenses: ExpenseData[];
  returnedOrdersCount: number;
  cancelledOrdersCount: number;
  totalDue: number;
}

export default function AdvancedFinancialReport() {
  const { data: outlets, isLoading: outletsLoading } = useOutlets();
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const activeOutlets = useMemo(
    () => outlets?.filter((o) => o.is_active) || [],
    [outlets]
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generateReport = async () => {
    setIsLoading(true);
    try {
      // Fetch orders (completed/delivered)
      let ordersQuery = supabase
        .from("orders")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedOutlet !== "all") {
        ordersQuery = ordersQuery.eq("outlet_id", selectedOutlet);
      }

      const { data: allOrders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Separate POS and Online orders with different status requirements
      // POS orders: include all except cancelled/returned
      // Online orders: ONLY include 'delivered' status (realized revenue)
      const posOrders =
        allOrders?.filter((o) => {
          const source = (o.source || "").toLowerCase();
          const status = (o.status || "").toLowerCase();
          return source === "pos" && !["cancelled", "returned"].includes(status);
        }) || [];

      const onlineOrders =
        allOrders?.filter((o) => {
          const source = (o.source || "").toLowerCase();
          const status = (o.status || "").toLowerCase();
          // Online = anything not explicitly "pos" AND status must be "delivered"
          return source !== "pos" && status === "delivered";
        }) || [];

      // Combine for order items fetching
      const completedOrders = [...posOrders, ...onlineOrders];
      const completedOrderIds = completedOrders.map((o) => o.id);

      // Count returned and cancelled
      const returnedOrdersCount =
        allOrders?.filter((o) => o.status === "returned").length || 0;
      const cancelledOrdersCount =
        allOrders?.filter((o) => o.status === "cancelled").length || 0;

      // Total due
      const totalDue = completedOrders.reduce(
        (sum, o) => sum + (o.due_amount || 0),
        0
      );

      // Fetch order items for completed orders
      let orderItems: any[] = [];
      if (completedOrderIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from("order_items")
          .select("*, product:products(id, title, price_cents)")
          .in("order_id", completedOrderIds);

        if (itemsError) throw itemsError;
        orderItems = items || [];
      }

      // Fetch products + their buying prices (admin-only table) for COGS
      const productIds = [
        ...new Set(orderItems.map((i) => i.product_id).filter(Boolean)),
      ];
      let productsMap: Record<string, any> = {};
      if (productIds.length > 0) {
        const [{ data: products }, { data: costs }] = await Promise.all([
          supabase.from("products").select("id, title, price_cents").in("id", productIds),
          supabase.from("product_costs").select("product_id, buying_price").in("product_id", productIds),
        ]);

        const costMap = new Map<string, number | null>(
          (costs || []).map((c) => [c.product_id, c.buying_price])
        );

        products?.forEach((p) => {
          productsMap[p.id] = { ...p, buying_price: costMap.get(p.id) ?? null };
        });
      }

      // Map orders to their source - create maps for both POS and Online orders
      const posOrderIds = new Set(posOrders.map((o) => o.id));
      const onlineOrderIds = new Set(onlineOrders.map((o) => o.id));

      // Process sales data
      const posProductMap: Record<string, ProductSalesData> = {};
      const onlineProductMap: Record<string, ProductSalesData> = {};

      orderItems.forEach((item) => {
        const orderId = item.order_id;
        // Use the pre-filtered sets to determine if this is a POS or Online order
        const isPOS = posOrderIds.has(orderId);
        const isOnline = onlineOrderIds.has(orderId);
        
        // Skip items that don't belong to either category (shouldn't happen, but safety check)
        if (!isPOS && !isOnline) return;
        
        const targetMap = isPOS ? posProductMap : onlineProductMap;

        const productId = item.product_id || "unknown";
        const productName =
          item.product_name ||
          item.title ||
          item.product?.title ||
          "Unknown Product";
        const qty = item.quantity || item.qty || 1;
        const unitPrice = item.unit_price || item.price || 0;
        const lineTotal = unitPrice * qty;

        // Get buying price - fallback to selling price if not set
        const product = productsMap[productId];
        const buyingPrice =
          product?.buying_price && product.buying_price > 0
            ? product.buying_price
            : unitPrice; // Fallback to selling price

        if (!targetMap[productId]) {
          targetMap[productId] = {
            productId,
            productName,
            quantitySold: 0,
            totalBeforeDiscount: 0,
            totalDiscount: 0,
            totalAfterDiscount: 0,
            buyingPrice,
            cogs: 0,
          };
        }

        targetMap[productId].quantitySold += qty;
        targetMap[productId].totalBeforeDiscount += lineTotal;
        targetMap[productId].totalAfterDiscount += lineTotal;
        targetMap[productId].cogs += buyingPrice * qty;
      });

      // Fetch expenses
      let expensesQuery = supabase
        .from("expenses")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedOutlet !== "all") {
        expensesQuery = expensesQuery.eq("outlet_id", selectedOutlet);
      }

      const { data: expensesData, error: expensesError } = await expensesQuery;
      if (expensesError) throw expensesError;

      const expenses: ExpenseData[] = (expensesData || []).map((e) => ({
        id: e.id,
        category: e.category,
        description: e.description || "",
        amount: e.amount,
        createdByName: e.created_by_name || "Unknown",
        createdAt: e.created_at,
      }));

      // Fetch returns to adjust quantities
      let returnsQuery = supabase
        .from("order_returns")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (selectedOutlet !== "all") {
        returnsQuery = returnsQuery.eq("outlet_id", selectedOutlet);
      }

      const { data: returns } = await returnsQuery;

      // Process returns to deduct from sales
      returns?.forEach((ret) => {
        const returnedItems = ret.returned_items as any[];
        if (Array.isArray(returnedItems)) {
          returnedItems.forEach((item) => {
            const productId = item.product_id || item.productId;
            const qty = item.quantity || item.qty || 1;

            // Try to deduct from POS first, then online
            if (posProductMap[productId]) {
              posProductMap[productId].quantitySold -= qty;
            } else if (onlineProductMap[productId]) {
              onlineProductMap[productId].quantitySold -= qty;
            }
          });
        }
      });

      setReportData({
        posSales: Object.values(posProductMap).filter(
          (p) => p.quantitySold > 0
        ),
        onlineSales: Object.values(onlineProductMap).filter(
          (p) => p.quantitySold > 0
        ),
        expenses,
        returnedOrdersCount,
        cancelledOrdersCount,
        totalDue,
      });

      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate totals
  const posTotals = useMemo(() => {
    if (!reportData) return { beforeDiscount: 0, afterDiscount: 0, cogs: 0 };
    return reportData.posSales.reduce(
      (acc, p) => ({
        beforeDiscount: acc.beforeDiscount + p.totalBeforeDiscount,
        afterDiscount: acc.afterDiscount + p.totalAfterDiscount,
        cogs: acc.cogs + p.cogs,
      }),
      { beforeDiscount: 0, afterDiscount: 0, cogs: 0 }
    );
  }, [reportData]);

  const onlineTotals = useMemo(() => {
    if (!reportData) return { beforeDiscount: 0, afterDiscount: 0, cogs: 0 };
    return reportData.onlineSales.reduce(
      (acc, p) => ({
        beforeDiscount: acc.beforeDiscount + p.totalBeforeDiscount,
        afterDiscount: acc.afterDiscount + p.totalAfterDiscount,
        cogs: acc.cogs + p.cogs,
      }),
      { beforeDiscount: 0, afterDiscount: 0, cogs: 0 }
    );
  }, [reportData]);

  const totalExpenses = useMemo(() => {
    if (!reportData) return 0;
    return reportData.expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [reportData]);

  const totalRevenue = posTotals.afterDiscount + onlineTotals.afterDiscount;
  const totalCOGS = posTotals.cogs + onlineTotals.cogs;
  const netProfit = totalRevenue - totalCOGS - totalExpenses;

  // Brand colors
  const BRAND_PURPLE = [49, 27, 65] as [number, number, number]; // #311b41
  const BRAND_RED = [239, 62, 91] as [number, number, number]; // #EF3E5B
  const BRAND_GREEN = [34, 139, 34] as [number, number, number]; // ForestGreen
  const BRAND_ORANGE = [217, 119, 6] as [number, number, number]; // Amber-600 for Due

  const addPageHeader = (doc: jsPDF, outletName: string) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Brand name
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_PURPLE);
    doc.text("Friction", 14, 18);
    
    // Report title
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text("Advanced Profit & Loss Statement", 14, 28);
    
    // Meta info on the right
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Outlet: ${outletName}`, pageWidth - 14, 14, { align: "right" });
    doc.text(
      `Period: ${format(startDate, "dd MMM yyyy")} - ${format(endDate, "dd MMM yyyy")}`,
      pageWidth - 14,
      20,
      { align: "right" }
    );
    doc.text(
      `Generated: ${format(new Date(), "dd MMM yyyy, HH:mm")}`,
      pageWidth - 14,
      26,
      { align: "right" }
    );
    
    // Horizontal line separator
    doc.setDrawColor(...BRAND_PURPLE);
    doc.setLineWidth(0.5);
    doc.line(14, 34, pageWidth - 14, 34);
  };

  const addPageFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Footer line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 18, pageWidth - 14, pageHeight - 18);
    
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont("helvetica", "italic");
    
    // Left: Confidential notice
    doc.text("Confidential Financial Report - Internal Use Only", 14, pageHeight - 12);
    
    // Center: Brand
    doc.text("Friction POS System", pageWidth / 2, pageHeight - 12, { align: "center" });
    
    // Right: Page number
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 12, { align: "right" });
  };

  const downloadPDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    const outletName =
      selectedOutlet === "all"
        ? "All Outlets"
        : activeOutlets.find((o) => o.id === selectedOutlet)?.name || "Unknown";

    // Add header to first page
    addPageHeader(doc, outletName);
    
    let currentY = 42;

    // ===== SECTION A: POS Sales Summary =====
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_PURPLE);
    doc.text("Section A: POS Sales Summary", 14, currentY);
    currentY += 6;

    const posTotalQty = reportData.posSales.reduce((sum, p) => sum + p.quantitySold, 0);
    
    if (reportData.posSales.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [["Product Name", "Qty Sold", "Unit Price (Avg)", "Total Before Tax", "Discount", "Total After Tax"]],
        body: reportData.posSales.map((item) => [
          item.productName,
          item.quantitySold.toString(),
          formatCurrency(item.totalBeforeDiscount / item.quantitySold),
          formatCurrency(item.totalBeforeDiscount),
          formatCurrency(item.totalDiscount),
          formatCurrency(item.totalAfterDiscount),
        ]),
        foot: [[
          "TOTAL",
          posTotalQty.toString(),
          "",
          formatCurrency(posTotals.beforeDiscount),
          "৳0",
          formatCurrency(posTotals.afterDiscount),
        ]],
        headStyles: {
          fillColor: BRAND_PURPLE,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: BRAND_PURPLE,
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [250, 248, 252],
        },
        margin: { left: 14, right: 14 },
        theme: "grid",
      });
      currentY = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text("No POS sales in this period", 14, currentY + 4);
      currentY += 12;
    }

    // ===== SECTION B: Online Sales Summary =====
    if (currentY > 220) {
      doc.addPage();
      addPageHeader(doc, outletName);
      currentY = 42;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_PURPLE);
    doc.text("Section B: Online Sales Summary", 14, currentY);
    currentY += 6;

    const onlineTotalQty = reportData.onlineSales.reduce((sum, p) => sum + p.quantitySold, 0);

    if (reportData.onlineSales.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [["Product Name", "Qty Sold", "Unit Price (Avg)", "Total Before Tax", "Discount", "Total After Tax"]],
        body: reportData.onlineSales.map((item) => [
          item.productName,
          item.quantitySold.toString(),
          formatCurrency(item.totalBeforeDiscount / item.quantitySold),
          formatCurrency(item.totalBeforeDiscount),
          formatCurrency(item.totalDiscount),
          formatCurrency(item.totalAfterDiscount),
        ]),
        foot: [[
          "TOTAL",
          onlineTotalQty.toString(),
          "",
          formatCurrency(onlineTotals.beforeDiscount),
          "৳0",
          formatCurrency(onlineTotals.afterDiscount),
        ]],
        headStyles: {
          fillColor: BRAND_PURPLE,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        footStyles: {
          fillColor: [240, 240, 240],
          textColor: BRAND_PURPLE,
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 255],
        },
        margin: { left: 14, right: 14 },
        theme: "grid",
      });
      currentY = (doc as any).lastAutoTable.finalY + 6;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text("No online sales in this period", 14, currentY + 4);
      currentY += 10;
    }

    // Order status summary text
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text(
      `Total Returned Orders: ${reportData.returnedOrdersCount}  |  Total Cancelled Orders: ${reportData.cancelledOrdersCount}`,
      14,
      currentY
    );
    currentY += 10;

    // ===== SECTION C: Operational Expenses =====
    if (currentY > 200) {
      doc.addPage();
      addPageHeader(doc, outletName);
      currentY = 42;
    }

    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_PURPLE);
    doc.text("Section C: Operational Expenses", 14, currentY);
    currentY += 6;

    if (reportData.expenses.length > 0) {
      autoTable(doc, {
        startY: currentY,
        head: [["Category", "Description", "Staff Name", "Amount"]],
        body: reportData.expenses.map((exp) => [
          exp.category,
          exp.description || "-",
          exp.createdByName,
          formatCurrency(exp.amount),
        ]),
        foot: [[
          "TOTAL EXPENSES",
          "",
          "",
          formatCurrency(totalExpenses),
        ]],
        headStyles: {
          fillColor: BRAND_RED,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [50, 50, 50],
        },
        footStyles: {
          fillColor: [255, 240, 242],
          textColor: BRAND_RED,
          fontStyle: "bold",
          fontSize: 9,
        },
        alternateRowStyles: {
          fillColor: [255, 252, 252],
        },
        margin: { left: 14, right: 14 },
        theme: "grid",
      });
      currentY = (doc as any).lastAutoTable.finalY + 12;
    } else {
      doc.setFontSize(9);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(120, 120, 120);
      doc.text("No expenses recorded in this period", 14, currentY + 4);
      currentY += 14;
    }

    // ===== FINANCIAL SUMMARY BOX =====
    if (currentY > 200) {
      doc.addPage();
      addPageHeader(doc, outletName);
      currentY = 42;
    }

    // Draw summary box (increased height to accommodate Total Due)
    const boxX = 14;
    const boxWidth = pageWidth - 28;
    const boxHeight = 88; // Increased from 72 to fit new line
    
    doc.setFillColor(250, 248, 252);
    doc.setDrawColor(...BRAND_PURPLE);
    doc.setLineWidth(1);
    doc.roundedRect(boxX, currentY, boxWidth, boxHeight, 4, 4, "FD");
    
    // Summary title
    currentY += 10;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BRAND_PURPLE);
    doc.text("FINANCIAL SUMMARY", pageWidth / 2, currentY, { align: "center" });
    currentY += 10;

    // Summary lines
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60, 60, 60);
    
    const leftCol = boxX + 10;
    const rightCol = boxX + boxWidth - 10;
    
    doc.text("Total Revenue (POS + Online)", leftCol, currentY);
    doc.text(formatCurrency(totalRevenue), rightCol, currentY, { align: "right" });
    currentY += 8;
    
    doc.text("(-) Cost of Goods Sold (COGS)", leftCol, currentY);
    doc.text(formatCurrency(totalCOGS), rightCol, currentY, { align: "right" });
    currentY += 8;
    
    doc.text("(-) Total Expenses", leftCol, currentY);
    doc.setTextColor(...BRAND_RED);
    doc.text(formatCurrency(totalExpenses), rightCol, currentY, { align: "right" });
    currentY += 4;
    
    // First divider line
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.3);
    doc.line(leftCol, currentY, rightCol, currentY);
    currentY += 6;
    
    // Total Outstanding Due (Orange)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...BRAND_ORANGE);
    doc.text("Total Outstanding Due", leftCol, currentY);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(reportData?.totalDue || 0), rightCol, currentY, { align: "right" });
    currentY += 4;
    
    // Second divider line (before net profit)
    doc.setDrawColor(...BRAND_PURPLE);
    doc.setLineWidth(0.5);
    doc.line(leftCol, currentY, rightCol, currentY);
    currentY += 8;
    
    // Net Profit/Loss (larger and bold)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    const isProfit = netProfit >= 0;
    doc.setTextColor(...(isProfit ? BRAND_GREEN : BRAND_RED));
    
    const profitLabel = isProfit ? "(=) NET PROFIT" : "(=) NET LOSS";
    const profitValue = isProfit ? formatCurrency(netProfit) : `-${formatCurrency(Math.abs(netProfit))}`;
    
    doc.text(profitLabel, leftCol, currentY);
    doc.text(profitValue, rightCol, currentY, { align: "right" });

    // Add page numbers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addPageFooter(doc, i, totalPages);
    }

    // Generate filename with month/year
    const monthYear = format(startDate, "MMM_yyyy");
    doc.save(`Financial_Report_${monthYear}.pdf`);
    toast.success("PDF report downloaded successfully");
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ReceiptText className="h-5 w-5 text-primary" />
            Generate Financial Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            {/* Outlet Selector */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Outlet</label>
              <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outlet" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Outlets</SelectItem>
                  {activeOutlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                      {outlet.is_main_branch && " (Main)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* End Date */}
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                onClick={generateReport}
                disabled={isLoading || outletsLoading}
                className="sm:w-auto"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ReceiptText className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
              <Button
                onClick={downloadPDF}
                variant="outline"
                disabled={!reportData}
                className="sm:w-auto"
              >
                <FileDown className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <>
          {/* POS Sales Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5 text-purple-500" />
                POS Sales Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reportData.posSales.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  No POS sales in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Qty Sold</TableHead>
                      <TableHead className="text-right">Total Before Tax</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total After Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.posSales.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantitySold}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalBeforeDiscount)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(item.totalDiscount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(item.totalAfterDiscount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Grand Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(posTotals.beforeDiscount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        ৳0
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(posTotals.afterDiscount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Online Sales Breakdown */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Online Sales Breakdown
              </CardTitle>
              {/* Summary cards */}
              <div className="mt-4 flex gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 dark:bg-red-950">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <span className="text-sm">
                    Returned:{" "}
                    <strong>{reportData.returnedOrdersCount}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-800">
                  <XCircle className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">
                    Cancelled:{" "}
                    <strong>{reportData.cancelledOrdersCount}</strong>
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {reportData.onlineSales.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  No online sales in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead className="text-center">Qty Sold</TableHead>
                      <TableHead className="text-right">Total Before Tax</TableHead>
                      <TableHead className="text-right">Discount</TableHead>
                      <TableHead className="text-right">Total After Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.onlineSales.map((item) => (
                      <TableRow key={item.productId}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-center">
                          {item.quantitySold}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.totalBeforeDiscount)}
                        </TableCell>
                        <TableCell className="text-right text-orange-600">
                          {formatCurrency(item.totalDiscount)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary">
                          {formatCurrency(item.totalAfterDiscount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={2} className="font-bold">
                        Grand Total
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(onlineTotals.beforeDiscount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-orange-600">
                        ৳0
                      </TableCell>
                      <TableCell className="text-right font-bold text-primary">
                        {formatCurrency(onlineTotals.afterDiscount)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Expenses Section */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                Expenses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {reportData.expenses.length === 0 ? (
                <p className="p-6 text-center text-muted-foreground">
                  No expenses in this period
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Category & Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>
                          {format(new Date(exp.createdAt), "dd/MM/yyyy HH:mm")}
                        </TableCell>
                        <TableCell>{exp.createdByName}</TableCell>
                        <TableCell>
                          <span className="font-medium">{exp.category}</span>
                          {exp.description && (
                            <span className="text-muted-foreground">
                              {" "}
                              - {exp.description}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(exp.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3} className="font-bold">
                        Total Expenses
                      </TableCell>
                      <TableCell className="text-right font-bold text-red-600">
                        {formatCurrency(totalExpenses)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Financial Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">
                    A. Total Sales (Revenue)
                  </span>
                  <span className="text-lg font-bold">
                    {formatCurrency(totalRevenue)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">
                    B. Total Due (Credit)
                  </span>
                  <span className="text-lg font-semibold text-orange-600">
                    {formatCurrency(reportData.totalDue)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">
                    C. Cost of Goods Sold (COGS)
                  </span>
                  <span className="text-lg font-semibold">
                    {formatCurrency(totalCOGS)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-b pb-3">
                  <span className="text-muted-foreground">D. Total Expenses</span>
                  <span className="text-lg font-semibold text-red-600">
                    {formatCurrency(totalExpenses)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-lg font-bold">E. Net Profit / Loss</span>
                  <span
                    className={cn(
                      "text-2xl font-bold",
                      netProfit >= 0 ? "text-green-600" : "text-red-600"
                    )}
                  >
                    {netProfit >= 0
                      ? `Net Profit: ${formatCurrency(netProfit)}`
                      : `Net Loss: ${formatCurrency(Math.abs(netProfit))}`}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
