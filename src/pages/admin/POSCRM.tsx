import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { Search, Users, Loader2, ArrowLeft, TrendingUp, ShoppingBag, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useNavigate } from "react-router-dom";
import { CRMCustomerDetailDialog } from "@/components/pos/CRMCustomerDetailDialog";

export interface CRMCustomer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  loyalty_points: number;
  source: "manual" | "profile";
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
  }).format(amount);

export default function POSCRM() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<CRMCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CRMCustomer | null>(null);

  useEffect(() => {
    fetchAllCustomers();
  }, []);

  const fetchAllCustomers = async () => {
    setIsLoading(true);
    try {
      const { data: manualCustomers } = await supabase
        .from("customers")
        .select("id, full_name, phone, email, total_orders, total_spent, last_order_at, loyalty_points")
        .order("created_at", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, phone, email")
        .order("created_at", { ascending: false });

      const profileIds = (profiles || []).map((p) => p.id);

      let profileOrderStats = new Map<string, { count: number; spent: number; lastOrder: string | null }>();
      if (profileIds.length > 0) {
        const { data: profileOrders } = await supabase
          .from("orders")
          .select("user_id, total_amount, created_at")
          .in("user_id", profileIds);

        (profileOrders || []).forEach((o: any) => {
          const existing = profileOrderStats.get(o.user_id);
          if (existing) {
            existing.count += 1;
            existing.spent += Number(o.total_amount);
            if (!existing.lastOrder || o.created_at > existing.lastOrder) {
              existing.lastOrder = o.created_at;
            }
          } else {
            profileOrderStats.set(o.user_id, {
              count: 1,
              spent: Number(o.total_amount),
              lastOrder: o.created_at,
            });
          }
        });
      }

      const manualIds = (manualCustomers || []).map((c) => c.id);
      let manualOrderStats = new Map<string, { count: number; spent: number; lastOrder: string | null }>();
      if (manualIds.length > 0) {
        const { data: manualOrders } = await supabase
          .from("orders")
          .select("customer_id, total_amount, created_at")
          .in("customer_id", manualIds);

        (manualOrders || []).forEach((o: any) => {
          const existing = manualOrderStats.get(o.customer_id);
          if (existing) {
            existing.count += 1;
            existing.spent += Number(o.total_amount);
            if (!existing.lastOrder || o.created_at > existing.lastOrder) {
              existing.lastOrder = o.created_at;
            }
          } else {
            manualOrderStats.set(o.customer_id, {
              count: 1,
              spent: Number(o.total_amount),
              lastOrder: o.created_at,
            });
          }
        });
      }

      const manual: CRMCustomer[] = (manualCustomers || []).map((c) => {
        const stats = manualOrderStats.get(c.id);
        return {
          id: c.id,
          full_name: c.full_name || "Unknown",
          phone: c.phone,
          email: c.email,
          total_orders: stats?.count || c.total_orders || 0,
          total_spent: stats?.spent || c.total_spent || 0,
          last_order_at: stats?.lastOrder || c.last_order_at,
          loyalty_points: c.loyalty_points ?? 0,
          source: "manual" as const,
        };
      });

      const profileCusts: CRMCustomer[] = (profiles || [])
        .filter((p) => p.full_name)
        .map((p) => {
          const stats = profileOrderStats.get(p.id);
          return {
            id: p.id,
            full_name: p.full_name || "Unknown",
            phone: p.phone,
            email: p.email,
            total_orders: stats?.count || 0,
            total_spent: stats?.spent || 0,
            last_order_at: stats?.lastOrder || null,
            loyalty_points: 0,
            source: "profile" as const,
          };
        });

      const phoneMap = new Map<string, CRMCustomer>();
      const noDupes: CRMCustomer[] = [];

      [...manual, ...profileCusts].forEach((c) => {
        if (c.phone && c.phone !== "N/A") {
          const existing = phoneMap.get(c.phone);
          if (existing) {
            existing.total_orders += c.total_orders;
            existing.total_spent += c.total_spent;
            if (c.last_order_at && (!existing.last_order_at || c.last_order_at > existing.last_order_at)) {
              existing.last_order_at = c.last_order_at;
            }
          } else {
            phoneMap.set(c.phone, { ...c });
          }
        } else {
          noDupes.push(c);
        }
      });

      const all = [...phoneMap.values(), ...noDupes].sort((a, b) => b.total_spent - a.total_spent);
      setCustomers(all);
    } catch (error) {
      console.error("Error fetching CRM customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return customers;
    const q = searchTerm.toLowerCase();
    return customers.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
    );
  }, [customers, searchTerm]);

  const totalLTV = customers.reduce((s, c) => s + c.total_spent, 0);
  const withOrders = customers.filter((c) => c.total_orders > 0).length;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate("/pos")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              CRM
            </h1>
            <p className="text-xs text-muted-foreground">All customers across POS & Online</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-3 gap-2">
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <UserCheck className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">{customers.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-lg bg-emerald-500/10 p-2">
                <ShoppingBag className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">With Orders</p>
                <p className="text-lg font-bold">{withOrders}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="flex items-center gap-3 p-3">
              <div className="rounded-lg bg-amber-500/10 p-2">
                <TrendingUp className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total LTV</p>
                <p className="text-lg font-bold">{formatCurrency(totalLTV)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
            autoFocus
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Users className="mb-3 h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">
              {searchTerm ? "No customers match your search" : "No customers found"}
            </p>
          </div>
        ) : (
          <Card className="border-border/50 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Customer</TableHead>
                  <TableHead className="hidden sm:table-cell">Phone</TableHead>
                  <TableHead className="text-center">Orders</TableHead>
                  <TableHead className="text-right">LTV</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Last Purchase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow
                    key={c.source + "-" + c.id}
                    className="cursor-pointer"
                    onClick={() => setSelectedCustomer(c)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {c.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{c.full_name}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">{c.phone || "\u2014"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">
                      {c.phone || "\u2014"}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {c.total_orders}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-primary">
                      {formatCurrency(c.total_spent)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground hidden md:table-cell">
                      {c.last_order_at ? format(new Date(c.last_order_at), "MMM dd, yyyy") : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>

      {selectedCustomer && (
        <CRMCustomerDetailDialog
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}
