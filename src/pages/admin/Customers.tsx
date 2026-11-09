import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Search,
  UserCircle,
  Mail,
  Phone,
  ShoppingCart,
  MapPin,
  Loader2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerAddressDialog } from "@/components/admin/CustomerAddressDialog";
import { CustomerOrderHistoryDialog } from "@/components/admin/CustomerOrderHistoryDialog";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

interface CustomerAddress {
  label?: string;
  full_name?: string | null;
  phone?: string | null;
  house_no?: string | null;
  road_no?: string | null;
  village?: string | null;
  thana?: string | null;
  zilla?: string | null;
}

interface Customer {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  order_count?: number;
  total_spent?: number;
  address?: CustomerAddress | null;
  isManual?: boolean;
  cart_item_count?: number;
  role?: "super_admin" | "admin" | "moderator" | "customer";
}

interface CartItem {
  id: string;
  title: string;
  price: number;
  qty: number;
}

const roleColors: Record<string, string> = {
  super_admin: "bg-red-500/10 text-red-600 border-red-500/20",
  admin: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  moderator: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  customer: "bg-green-500/10 text-green-600 border-green-500/20",
};

export default function AdminCustomers() {
  const { toast } = useToast();
  const { role: currentUserRole } = useUserRole();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerCart, setCustomerCart] = useState<CartItem[]>([]);
  const [cartDialogOpen, setCartDialogOpen] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [orderHistoryOpen, setOrderHistoryOpen] = useState(false);
  const [updatingRole, setUpdatingRole] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  const canEditRoles = currentUserRole === "super_admin";

  const fetchCustomers = async () => {
    try {
      // Fetch authenticated customers (profiles)
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles for all profiles
      const profileIds = (profiles || []).map((p: any) => p.id);
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", profileIds);

      const roleMap = new Map<string, string>();
      (rolesData || []).forEach((r: any) => {
        roleMap.set(r.user_id, r.role);
      });

      // Fetch manual/POS customers
      const { data: manualCustomers, error: manualError } = await supabase
        .from("customers")
        .select("id, full_name, email, phone, address, created_at")
        .order("created_at", { ascending: false });

      if (manualError) throw manualError;

      // Fetch default addresses for profile customers
      const { data: addresses } = await supabase
        .from("user_addresses")
        .select("*")
        .in("user_id", profileIds)
        .eq("is_default", true);

      const addressMap = new Map<string, CustomerAddress>();
      (addresses || []).forEach((addr: any) => {
        addressMap.set(addr.user_id, addr);
      });

      // If no default address, fetch any address
      const usersWithoutDefault = profileIds.filter((id: string) => !addressMap.has(id));
      if (usersWithoutDefault.length > 0) {
        const { data: fallbackAddrs } = await supabase
          .from("user_addresses")
          .select("*")
          .in("user_id", usersWithoutDefault)
          .order("created_at", { ascending: false });

        (fallbackAddrs || []).forEach((addr: any) => {
          if (!addressMap.has(addr.user_id)) {
            addressMap.set(addr.user_id, addr);
          }
        });
      }

      // Filter out stealth/ghost users
      const STEALTH_USER_IDS = ["0fe70abc-43b7-4bee-a53f-1d52e6b68d49"];
      const filteredProfiles = (profiles || []).filter(
        (p: any) => !STEALTH_USER_IDS.includes(p.id)
      );

      // Combine profiles with addresses and roles
      const profilesWithAddrs = filteredProfiles.map((p: any) => ({
        ...p,
        address: addressMap.get(p.id) || null,
        isManual: false,
        role: roleMap.get(p.id) || "customer",
      }));

      // Manual customers
      const manualWithAddrs = (manualCustomers || []).map((c: any) => ({
        ...c,
        isManual: true,
        role: "customer" as const,
      }));

      const all = [...profilesWithAddrs, ...manualWithAddrs];

      // Fetch cart counts for profile customers
      const { data: cartData } = await supabase
        .from("customer_carts")
        .select("user_id, cart_items")
        .in("user_id", profileIds);

      const cartCountMap = new Map<string, number>();
      (cartData || []).forEach((cart: any) => {
        const items = cart.cart_items as any[];
        const count = items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0;
        cartCountMap.set(cart.user_id, count);
      });

      // Fetch order counts and totals for each customer
      const customersWithStats = await Promise.all(
        all.map(async (c) => {
          const column = c.isManual ? "customer_id" : "user_id";

          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq(column, c.id);

          return {
            ...c,
            order_count: orders?.length || 0,
            total_spent: orders?.reduce((sum, o) => sum + Number(o.total_amount), 0) || 0,
            cart_item_count: c.isManual ? 0 : (cartCountMap.get(c.id) || 0),
          } as Customer;
        })
      );

      // Sort by newest first
      customersWithStats.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomerCart = async (userId: string) => {
    setCartLoading(true);
    try {
      const { data, error } = await supabase
        .from("customer_carts")
        .select("cart_items")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;

      const items = (data?.cart_items as unknown as CartItem[]) || [];
      setCustomerCart(items);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setCustomerCart([]);
    } finally {
      setCartLoading(false);
    }
  };

  const handleViewCart = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setCartDialogOpen(true);
    await fetchCustomerCart(customer.id);
  };

  const handleViewAddress = (customer: Customer) => {
    setSelectedCustomer(customer);
    setAddressDialogOpen(true);
  };

  const handleViewOrderHistory = (customer: Customer) => {
    setSelectedCustomer(customer);
    setOrderHistoryOpen(true);
  };

  const handleRoleChange = async (customerId: string, newRole: string) => {
    setUpdatingRole(customerId);
    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from("user_roles")
        .select("id")
        .eq("user_id", customerId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole as "super_admin" | "admin" | "moderator" | "customer" })
          .eq("user_id", customerId);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: customerId, role: newRole as "super_admin" | "admin" | "moderator" | "customer" });

        if (error) throw error;
      }

      // Update local state
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === customerId ? { ...c, role: newRole as Customer["role"] } : c
        )
      );

      if (newRole !== "customer") {
        toast({
          title: "User promoted",
          description: "Go to User Management to set their permissions.",
        });
      } else {
        toast({
          title: "Role updated",
          description: "User role has been updated to Customer.",
        });
      }
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setUpdatingRole(null);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone?.includes(searchTerm)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-BD", {
      style: "currency",
      currency: "BDT",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Header with mobile search toggle */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Customers</h1>
            <p className="text-muted-foreground hidden md:block">View and manage customer accounts</p>
          </div>
          {/* Mobile Search Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
          >
            {isSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Search - Expandable */}
        {isSearchOpen && (
          <div className="md:hidden">
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
              autoFocus
            />
          </div>
        )}

        {/* Stats - Compact 3-column on mobile */}
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-blue-100 p-1.5 md:mb-0 md:p-2.5">
                <UserCircle className="h-4 w-4 text-blue-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">Total Customers</p>
                <p className="text-lg font-bold md:text-2xl">{customers.length}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-green-100 p-1.5 md:mb-0 md:p-2.5">
                <ShoppingCart className="h-4 w-4 text-green-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">With Orders</p>
                <p className="text-lg font-bold md:text-2xl">
                  {customers.filter((c) => (c.order_count || 0) > 0).length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-2 text-center md:flex-row md:items-center md:justify-start md:gap-4 md:p-4 md:text-left">
              <div className="mb-1 rounded-lg bg-purple-100 p-1.5 md:mb-0 md:p-2.5">
                <UserCircle className="h-4 w-4 text-purple-600 md:h-5 md:w-5" />
              </div>
              <div>
                <p className="text-[10px] leading-tight text-muted-foreground md:text-sm">New This Month</p>
                <p className="text-lg font-bold md:text-2xl">
                  {
                    customers.filter((c) => {
                      const created = new Date(c.created_at);
                      const now = new Date();
                      return (
                        created.getMonth() === now.getMonth() &&
                        created.getFullYear() === now.getFullYear()
                      );
                    }).length
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Desktop Search */}
        <div className="relative hidden max-w-sm md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Mobile Customer Cards */}
        <div className="space-y-2 md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <UserCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          ) : (
            filteredCustomers.map((customer) => (
              <Card key={customer.id} className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Avatar + Name */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10">
                        <UserCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold">
                          {customer.full_name || "N/A"}
                        </p>
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">{customer.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Badge */}
                    <Badge
                      variant="outline"
                      className={`flex-shrink-0 text-xs ${
                        customer.isManual
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-green-500/10 text-green-600 border-green-500/20"
                      }`}
                    >
                      {customer.isManual ? "Manual" : "Registered"}
                    </Badge>
                  </div>

                  {/* Quick Stats Row */}
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs">
                    <button
                      onClick={() => handleViewOrderHistory(customer)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ShoppingCart className="h-3.5 w-3.5" />
                      <span>{customer.order_count || 0} orders</span>
                    </button>
                    <span className="font-semibold text-primary">
                      {formatCurrency(customer.total_spent || 0)}
                    </span>
                    <button
                      onClick={() => handleViewAddress(customer)}
                      className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Address</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Desktop Customers Table */}
        <Card className="hidden border-border/50 md:block">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <UserCircle className="mb-4 h-12 w-12 text-muted-foreground/50" />
                <p className="text-muted-foreground">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Orders</TableHead>
                      <TableHead>Total Spent</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => (
                      <TableRow key={customer.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                              <UserCircle className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <span className="font-medium">
                                {customer.full_name || "N/A"}
                              </span>
                              {customer.isManual && (
                                <Badge variant="outline" className="ml-2 text-xs">
                                  Manual
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            {customer.email && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Phone className="h-3 w-3" />
                                {customer.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.isManual || !canEditRoles ? (
                            <Badge variant="outline" className={roleColors[customer.role || "customer"]}>
                              {customer.role || "customer"}
                            </Badge>
                          ) : (
                            <Select
                              value={customer.role || "customer"}
                              onValueChange={(value) => handleRoleChange(customer.id, value)}
                              disabled={updatingRole === customer.id}
                            >
                              <SelectTrigger className="w-32">
                                {updatingRole === customer.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="customer">Customer</SelectItem>
                                <SelectItem value="moderator">Moderator</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="super_admin">Super Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 text-muted-foreground hover:text-foreground"
                            onClick={() => handleViewAddress(customer)}
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            View
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className="cursor-pointer hover:bg-secondary/80 transition-colors"
                            onClick={() => handleViewOrderHistory(customer)}
                          >
                            {customer.order_count || 0} orders
                          </Badge>
                        </TableCell>
                        <TableCell className="font-semibold text-primary">
                          {formatCurrency(customer.total_spent || 0)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(customer.created_at), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCart(customer)}
                            disabled={customer.isManual}
                            title={
                              customer.isManual
                                ? "Manual customers don't have synced carts"
                                : "View customer's cart"
                            }
                            className="relative"
                          >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            View Cart
                            {!customer.isManual && (customer.cart_item_count || 0) > 0 && (
                              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                                {customer.cart_item_count}
                              </span>
                            )}
                          </Button>
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

      {/* Address Dialog */}
      {selectedCustomer && (
        <>
          <CustomerAddressDialog
            open={addressDialogOpen}
            onOpenChange={setAddressDialogOpen}
            customerName={selectedCustomer.full_name || "Customer"}
            address={selectedCustomer.address}
          />

          <CustomerOrderHistoryDialog
            open={orderHistoryOpen}
            onOpenChange={setOrderHistoryOpen}
            customerId={selectedCustomer.id}
            customerName={selectedCustomer.full_name || "Customer"}
            isManual={selectedCustomer.isManual || false}
          />
        </>
      )}

      {/* Cart View Dialog */}
      {cartDialogOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h3 className="mb-4 text-lg font-semibold">
              {selectedCustomer.full_name}'s Cart
            </h3>
            {cartLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : customerCart.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">Cart is empty</p>
            ) : (
              <div className="space-y-2">
                {customerCart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Qty: {item.qty} × ৳{item.price}
                      </p>
                    </div>
                    <p className="font-semibold">৳{item.price * item.qty}</p>
                  </div>
                ))}
              </div>
            )}
            <Button
              className="mt-4 w-full"
              onClick={() => setCartDialogOpen(false)}
            >
              Close
            </Button>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
