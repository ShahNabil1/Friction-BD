import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  Wallet,
  Calendar,
  ChevronDown,
  Eye,
  X,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useUserOutlet } from "@/hooks/useOutlets";
import { useUserRole } from "@/hooks/useUserRole";
import { cn } from "@/lib/utils";
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
} from "date-fns";

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string | null;
  receipt_url: string | null;
  created_by_name: string | null;
  created_at: string;
}

type DatePreset = "today" | "yesterday" | "this_week" | "this_month" | "custom";

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food & Beverages",
  transport: "Transport",
  utilities: "Utilities / Bills",
  maintenance: "Maintenance",
  supplies: "Office Supplies",
  salary: "Salary / Wages",
  rent: "Rent",
  other: "Other",
};

export default function POSExpenseHistory() {
  const navigate = useNavigate();
  const { data: userOutlet } = useUserOutlet();
  const { isSuperAdmin, role } = useUserRole();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Date range state
  const [datePreset, setDatePreset] = useState<DatePreset>("today");
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
  });
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Lightbox for receipt
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Get current outlet ID
  const currentOutletId = useMemo(() => {
    if (isSuperAdmin || role === "admin") {
      return localStorage.getItem("pos_current_outlet");
    }
    return userOutlet?.outlet?.id || null;
  }, [isSuperAdmin, role, userOutlet]);

  // Handle date preset changes
  const handleDatePreset = (preset: DatePreset) => {
    const today = new Date();
    let from: Date, to: Date;

    switch (preset) {
      case "today":
        from = startOfDay(today);
        to = endOfDay(today);
        break;
      case "yesterday":
        from = startOfDay(subDays(today, 1));
        to = endOfDay(subDays(today, 1));
        break;
      case "this_week":
        from = startOfWeek(today, { weekStartsOn: 0 });
        to = endOfWeek(today, { weekStartsOn: 0 });
        break;
      case "this_month":
        from = startOfMonth(today);
        to = endOfMonth(today);
        break;
      default:
        return;
    }

    setDatePreset(preset);
    setDateRange({ from, to });
    setShowDatePicker(false);
  };

  const getPresetLabel = () => {
    switch (datePreset) {
      case "today":
        return "Today";
      case "yesterday":
        return "Yesterday";
      case "this_week":
        return "This Week";
      case "this_month":
        return "This Month";
      case "custom":
        return `${format(dateRange.from, "MMM d")} - ${format(dateRange.to, "MMM d")}`;
      default:
        return "Select Date";
    }
  };

  // Fetch expenses
  useEffect(() => {
    const fetchExpenses = async () => {
      if (!currentOutletId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("expenses")
          .select("*")
          .eq("outlet_id", currentOutletId)
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: false })
          .limit(500);

        if (error) throw error;
        setExpenses(data || []);
      } catch (error) {
        console.error("Error fetching expenses:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchExpenses();
  }, [currentOutletId, dateRange]);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    if (!searchQuery.trim()) return expenses;

    const query = searchQuery.toLowerCase().trim();
    return expenses.filter(
      (e) =>
        e.category.toLowerCase().includes(query) ||
        e.description?.toLowerCase().includes(query) ||
        e.created_by_name?.toLowerCase().includes(query)
    );
  }, [expenses, searchQuery]);

  // Calculate total
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="flex h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4 gap-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => navigate("/pos")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            <span className="font-semibold text-lg hidden sm:block">Expense History</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-48 sm:w-56">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        {/* Date Range Picker */}
        <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 min-w-[120px]">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">{getPresetLabel()}</span>
              <ChevronDown className="h-3 w-3 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex">
              {/* Presets */}
              <div className="border-r p-2 space-y-1">
                <Button
                  variant={datePreset === "today" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("today")}
                >
                  Today
                </Button>
                <Button
                  variant={datePreset === "yesterday" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("yesterday")}
                >
                  Yesterday
                </Button>
                <Button
                  variant={datePreset === "this_week" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("this_week")}
                >
                  This Week
                </Button>
                <Button
                  variant={datePreset === "this_month" ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start text-xs"
                  onClick={() => handleDatePreset("this_month")}
                >
                  This Month
                </Button>
              </div>
              {/* Calendar */}
              <div className="p-2">
                <CalendarComponent
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({
                        from: startOfDay(range.from),
                        to: endOfDay(range.to),
                      });
                      setDatePreset("custom");
                    } else if (range?.from) {
                      setDateRange({
                        from: startOfDay(range.from),
                        to: endOfDay(range.from),
                      });
                      setDatePreset("custom");
                    }
                  }}
                  numberOfMonths={1}
                  className="pointer-events-auto"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredExpenses.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground p-8 min-h-[300px]">
              <Wallet className="h-12 w-12 mb-4 opacity-50" />
              <p className="font-medium">No expenses found</p>
              <p className="text-sm">
                {searchQuery
                  ? "Try a different search term"
                  : `No expenses for ${getPresetLabel().toLowerCase()}`}
              </p>
            </div>
          ) : (
            <div className="p-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead>Category & Reason</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(expense.created_at), "dd/MM/yyyy HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm">
                        {expense.created_by_name || "Unknown"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <Badge variant="outline" className="w-fit text-xs">
                            {CATEGORY_LABELS[expense.category] || expense.category}
                          </Badge>
                          {expense.description && (
                            <span className="text-xs text-muted-foreground mt-1">
                              {expense.description}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="font-bold text-destructive">
                          -{formatPrice(expense.amount)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {expense.receipt_url ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setViewingReceipt(expense.receipt_url)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Footer Summary */}
      <footer className="shrink-0 border-t bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? "s" : ""} for{" "}
            {getPresetLabel().toLowerCase()}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Total:</span>
            <span className="text-lg font-bold text-destructive">
              -{formatPrice(totalExpenses)}
            </span>
          </div>
        </div>
      </footer>

      {/* Receipt Lightbox */}
      <Dialog open={!!viewingReceipt} onOpenChange={() => setViewingReceipt(null)}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-10 bg-background/80 hover:bg-background"
              onClick={() => setViewingReceipt(null)}
            >
              <X className="h-4 w-4" />
            </Button>
            {viewingReceipt && (
              <img
                src={viewingReceipt}
                alt="Receipt"
                className="w-full max-h-[80vh] object-contain"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
