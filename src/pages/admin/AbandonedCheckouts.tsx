import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import {
  Phone,
  ShoppingCart,
  Trash2,
  CheckCircle,
  XCircle,
  Loader2,
  UserX,
  Clock,
  MapPin,
  MessageCircle,
  Search,
  Filter,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LeadStatusFilterDrawer } from "@/components/admin/LeadStatusFilterDrawer";
import {
  useAbandonedCheckouts,
  useUpdateAbandonedCheckoutStatus,
  useDeleteAbandonedCheckout,
  type AbandonedCheckout,
} from "@/hooks/useAbandonedCheckouts";

function formatPrice(n: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function formatAddress(address: AbandonedCheckout["address_details"]): string | null {
  if (!address) return null;
  const parts = [
    address.road_no,
    address.village,
    address.thana,
    address.zilla,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export default function AbandonedCheckoutsPage() {
  const navigate = useNavigate();
  const { data: checkouts = [], isLoading } = useAbandonedCheckouts("all");
  const updateStatus = useUpdateAbandonedCheckoutStatus();
  const deleteCheckout = useDeleteAbandonedCheckout();
  const [activeTab, setActiveTab] = useState("pending");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const pendingCheckouts = checkouts.filter((c) => c.status === "pending");
  const convertedCheckouts = checkouts.filter((c) => c.status === "converted");
  const dismissedCheckouts = checkouts.filter((c) => c.status === "dismissed");

  // Filter checkouts based on search term
  const filterCheckouts = (list: AbandonedCheckout[]) => {
    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase();
    return list.filter(
      (c) =>
        c.customer_name?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term)
    );
  };

  const getActiveCheckouts = () => {
    switch (activeTab) {
      case "converted":
        return filterCheckouts(convertedCheckouts);
      case "dismissed":
        return filterCheckouts(dismissedCheckouts);
      default:
        return filterCheckouts(pendingCheckouts);
    }
  };

  const handleCreateOrder = (checkout: AbandonedCheckout) => {
    const params = new URLSearchParams({
      prefill: "true",
      name: checkout.customer_name || "",
      phone: checkout.phone,
      cart: JSON.stringify(checkout.cart_items),
      abandonedId: checkout.id,
    });
    navigate(`/admin/orders?${params.toString()}`);
  };

  const handleWhatsApp = (checkout: AbandonedCheckout) => {
    const phone = checkout.phone.startsWith("0") 
      ? `880${checkout.phone.slice(1)}` 
      : checkout.phone;
    const message = encodeURIComponent(
      `Hi ${checkout.customer_name || "there"}! We noticed you didn't complete your order. Can we help you with anything?`
    );
    window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
  };

  const statusColors: Record<string, string> = {
    pending: "#f97316",
    converted: "#22c55e",
    dismissed: "#6b7280",
  };

  // Mobile Card Component
  const renderMobileCard = (checkout: AbandonedCheckout) => {
    const totalValue = checkout.cart_items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );

    return (
      <div
        key={checkout.id}
        className="rounded-xl border bg-card p-4 space-y-3"
      >
        {/* Header: Name & Time */}
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground truncate">
              {checkout.customer_name || (
                <span className="text-muted-foreground italic flex items-center gap-1">
                  <UserX className="h-3 w-3" /> Guest
                </span>
              )}
            </p>
            <a
              href={`tel:${checkout.phone}`}
              className="text-sm text-sky-600 font-mono"
            >
              {checkout.phone}
            </a>
          </div>
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(new Date(checkout.created_at), { addSuffix: true })}
          </span>
        </div>

        {/* Cart Items Summary */}
        <div className="space-y-2">
          {checkout.cart_items.slice(0, 2).map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-10 h-10 rounded object-cover shrink-0 border"
                />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 border">
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                <p className="text-xs text-muted-foreground">x{item.qty}</p>
              </div>
            </div>
          ))}
          {checkout.cart_items.length > 2 && (
            <p className="text-xs text-muted-foreground">
              +{checkout.cart_items.length - 2} more items
            </p>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Cart Total</span>
          <Badge variant="secondary" className="font-bold">
            {formatPrice(totalValue)}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1" asChild>
            <a href={`tel:${checkout.phone}`}>
              <Phone className="h-4 w-4 mr-1" />
              Call
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-green-600 border-green-200 hover:bg-green-50"
            onClick={() => handleWhatsApp(checkout)}
          >
            <MessageCircle className="h-4 w-4 mr-1" />
            WhatsApp
          </Button>
          {checkout.status === "pending" && (
            <Button
              size="sm"
              variant="default"
              className="flex-1"
              onClick={() => handleCreateOrder(checkout)}
            >
              <ShoppingCart className="h-4 w-4 mr-1" />
              Recover
            </Button>
          )}
        </div>

        {/* Secondary Actions for Pending */}
        {checkout.status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
              onClick={() =>
                updateStatus.mutate({ id: checkout.id, status: "converted" })
              }
              disabled={updateStatus.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Mark Converted
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="flex-1 text-orange-600 hover:text-orange-700 hover:bg-orange-50"
              onClick={() =>
                updateStatus.mutate({ id: checkout.id, status: "dismissed" })
              }
              disabled={updateStatus.isPending}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Dismiss
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderCheckoutRow = (checkout: AbandonedCheckout) => {
    const totalItems = checkout.cart_items.reduce((sum, item) => sum + item.qty, 0);
    const totalValue = checkout.cart_items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0
    );
    const addressStr = formatAddress(checkout.address_details);

    return (
      <TableRow key={checkout.id}>
        <TableCell>
          <div className="flex flex-col">
            <span className="font-medium">
              {checkout.customer_name || (
                <span className="text-muted-foreground italic flex items-center gap-1">
                  <UserX className="h-3 w-3" /> Guest
                </span>
              )}
            </span>
            <a
              href={`tel:${checkout.phone}`}
              className="text-sm text-sky-600 hover:underline font-mono"
            >
              {checkout.phone}
            </a>
            {addressStr && (
              <div className="flex items-start gap-1 mt-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="line-clamp-2">{addressStr}</span>
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className="max-w-sm">
          <div className="space-y-2">
            {checkout.cart_items.map((item, i) => {
              const variantParts: string[] = [];
              if (item.variation) {
                if (item.variation.size) variantParts.push(`Size: ${item.variation.size}`);
                if (item.variation.color) variantParts.push(`Color: ${item.variation.color}`);
                Object.entries(item.variation).forEach(([key, val]) => {
                  if (key !== "size" && key !== "color" && val) {
                    variantParts.push(`${key}: ${val}`);
                  }
                });
              }
              return (
                <div key={i} className="flex items-start gap-2">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.title}
                      className="w-10 h-10 rounded object-cover flex-shrink-0 border"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0 border">
                      <span className="text-xs text-muted-foreground">N/A</span>
                    </div>
                  )}
                  <div className="text-sm leading-tight min-w-0">
                    <span className="font-medium text-foreground line-clamp-1">{item.title}</span>
                    {variantParts.length > 0 && (
                      <span className="text-muted-foreground text-xs block">
                        {variantParts.join(", ")}
                      </span>
                    )}
                    <span className="text-muted-foreground text-xs">x{item.qty}</span>
                  </div>
                </div>
              );
            })}
            <Badge variant="secondary" className="mt-1">
              {formatPrice(totalValue)}
            </Badge>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(checkout.created_at), { addSuffix: true })}
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 flex-wrap">
            <Button size="sm" variant="outline" asChild>
              <a href={`tel:${checkout.phone}`}>
                <Phone className="h-4 w-4 mr-1" />
                Call
              </a>
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => handleWhatsApp(checkout)}
            >
              <MessageCircle className="h-4 w-4 mr-1" />
              WhatsApp
            </Button>

            {checkout.status === "pending" && (
              <>
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleCreateOrder(checkout)}
                >
                  <ShoppingCart className="h-4 w-4 mr-1" />
                  Create Order
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() =>
                    updateStatus.mutate({ id: checkout.id, status: "converted" })
                  }
                  disabled={updateStatus.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                  onClick={() =>
                    updateStatus.mutate({ id: checkout.id, status: "dismissed" })
                  }
                  disabled={updateStatus.isPending}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently remove this abandoned checkout lead.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => deleteCheckout.mutate(checkout.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const activeCheckouts = getActiveCheckouts();

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        {/* Mobile Header - App Style */}
        <div className="md:hidden">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-foreground">Lead Recovery</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                className="h-10 w-10"
              >
                <Search className="h-5 w-5" />
              </Button>
              <LeadStatusFilterDrawer
                statuses={[
                  { value: "pending", label: "Pending", count: pendingCheckouts.length, color: statusColors.pending },
                  { value: "converted", label: "Converted", count: convertedCheckouts.length, color: statusColors.converted },
                  { value: "dismissed", label: "Dismissed", count: dismissedCheckouts.length, color: statusColors.dismissed },
                ]}
                selectedStatus={activeTab}
                onApplyFilter={setActiveTab}
                trigger={
                  <Button variant="ghost" size="icon" className="h-10 w-10 relative">
                    <Filter className="h-5 w-5" />
                    {activeTab !== "pending" && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        1
                      </span>
                    )}
                  </Button>
                }
              />
            </div>
          </div>
          
          {/* Mobile Search - Expandable */}
          {mobileSearchOpen && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
          )}

          {/* Mobile Status Badge */}
          <div className="mt-3 flex items-center gap-2">
            <Badge 
              variant="outline" 
              className="capitalize"
              style={{ borderColor: statusColors[activeTab], color: statusColors[activeTab] }}
            >
              {activeTab} ({activeCheckouts.length})
            </Badge>
          </div>
        </div>

        {/* Desktop Header */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-foreground">Lead Recovery</h1>
          <p className="text-muted-foreground">
            Customers who started checkout but didn't complete their order
          </p>
        </div>

        {/* Stats Cards - Desktop Only */}
        <div className="hidden md:grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending Leads
              </CardTitle>
              <Phone className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingCheckouts.length}</div>
              <p className="text-xs text-muted-foreground">Need follow-up</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Converted
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {convertedCheckouts.length}
              </div>
              <p className="text-xs text-muted-foreground">Successfully converted</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dismissed
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">
                {dismissedCheckouts.length}
              </div>
              <p className="text-xs text-muted-foreground">Marked as not interested</p>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : activeCheckouts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Phone className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No {activeTab} leads</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeCheckouts.map(renderMobileCard)}
            </div>
          )}
        </div>

        {/* Desktop Table */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="border-b px-4">
                <TabsList className="h-12 bg-transparent">
                  <TabsTrigger value="pending" className="data-[state=active]:bg-muted">
                    Pending ({pendingCheckouts.length})
                  </TabsTrigger>
                  <TabsTrigger value="converted" className="data-[state=active]:bg-muted">
                    Converted ({convertedCheckouts.length})
                  </TabsTrigger>
                  <TabsTrigger value="dismissed" className="data-[state=active]:bg-muted">
                    Dismissed ({dismissedCheckouts.length})
                  </TabsTrigger>
                </TabsList>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <TabsContent value="pending" className="m-0">
                    {filterCheckouts(pendingCheckouts).length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <Phone className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No pending leads</p>
                        <p className="text-sm">
                          Leads will appear when customers enter their phone at checkout
                        </p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Cart</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterCheckouts(pendingCheckouts).map(renderCheckoutRow)}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="converted" className="m-0">
                    {filterCheckouts(convertedCheckouts).length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <CheckCircle className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No converted leads yet</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Cart</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterCheckouts(convertedCheckouts).map(renderCheckoutRow)}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="dismissed" className="m-0">
                    {filterCheckouts(dismissedCheckouts).length === 0 ? (
                      <div className="py-12 text-center text-muted-foreground">
                        <XCircle className="mx-auto h-12 w-12 opacity-20 mb-4" />
                        <p>No dismissed leads</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Cart</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filterCheckouts(dismissedCheckouts).map(renderCheckoutRow)}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </>
              )}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
