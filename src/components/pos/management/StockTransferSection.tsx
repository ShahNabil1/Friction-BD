import { useState } from "react";
import { ArrowRight, Package, Plus, CheckCircle2, Clock, XCircle, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  useOutlets, 
  useInventoryTransfers, 
  useOutletInventory,
  useCreateInventoryTransfer, 
  useCompleteInventoryTransfer,
  OutletInventoryItem 
} from "@/hooks/useOutlets";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function StockTransferSection() {
  const { toast } = useToast();
  const { data: outlets = [] } = useOutlets();
  const { data: transfers = [], isLoading: transfersLoading } = useInventoryTransfers();
  const createTransfer = useCreateInventoryTransfer();
  const completeTransfer = useCompleteInventoryTransfer();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [fromOutletId, setFromOutletId] = useState<string>("");
  const [toOutletId, setToOutletId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");

  const { data: sourceInventory = [] } = useOutletInventory(fromOutletId || null);

  // Get unique products from source inventory
  const availableProducts = sourceInventory.reduce((acc, item) => {
    if (!acc.find((p) => p.product_id === item.product_id)) {
      acc.push(item);
    }
    return acc;
  }, [] as OutletInventoryItem[]);

  // Get variants for selected product
  const availableVariants = sourceInventory.filter(
    (item) => item.product_id === selectedProductId && item.quantity > 0
  );

  const selectedItem = sourceInventory.find(
    (item) => 
      item.product_id === selectedProductId && 
      (item.variant_id === selectedVariantId || (!selectedVariantId && !item.variant_id))
  );
  const maxQuantity = selectedItem?.quantity || 0;

  const handleCreateTransfer = async () => {
    if (!fromOutletId || !toOutletId || !selectedProductId || quantity < 1) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    if (fromOutletId === toOutletId) {
      toast({ title: "Source and destination must be different", variant: "destructive" });
      return;
    }

    if (quantity > maxQuantity) {
      toast({ title: "Quantity exceeds available stock", variant: "destructive" });
      return;
    }

    try {
      await createTransfer.mutateAsync({
        from_outlet_id: fromOutletId,
        to_outlet_id: toOutletId,
        product_id: selectedProductId,
        variant_id: selectedVariantId || null,
        quantity,
        notes: notes || undefined,
      });
      toast({ title: "Transfer created successfully" });
      setShowCreateDialog(false);
      resetForm();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleCompleteTransfer = async (transferId: string) => {
    try {
      await completeTransfer.mutateAsync(transferId);
      toast({ title: "Transfer completed successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFromOutletId("");
    setToOutletId("");
    setSelectedProductId("");
    setSelectedVariantId("");
    setQuantity(1);
    setNotes("");
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "outline";
    }
  };

  const pendingTransfers = transfers.filter((t) => t.status === "pending");
  const completedTransfers = transfers.filter((t) => t.status !== "pending");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Stock Transfer</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Move inventory between outlets
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending" className="relative">
            Pending
            {pendingTransfers.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5">
                {pendingTransfers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {transfersLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading transfers...</div>
          ) : pendingTransfers.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-2">No pending transfers</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a transfer to move stock between outlets
                </p>
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Transfer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pendingTransfers.map((transfer) => (
                <Card key={transfer.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 text-sm">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{transfer.from_outlet?.name}</span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{transfer.to_outlet?.name}</span>
                        </div>
                        <Badge variant="secondary">{transfer.quantity} units</Badge>
                        {transfer.notes && (
                          <span className="text-xs text-muted-foreground">{transfer.notes}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-xs text-muted-foreground">
                          Created {format(new Date(transfer.created_at), "MMM d, yyyy")}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCompleteTransfer(transfer.id)}
                          disabled={completeTransfer.isPending}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {completedTransfers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No transfer history yet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Created By</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedTransfers.map((transfer) => (
                      <TableRow key={transfer.id}>
                        <TableCell className="font-medium">
                          {transfer.from_outlet?.name}
                        </TableCell>
                        <TableCell>{transfer.to_outlet?.name}</TableCell>
                        <TableCell>{transfer.quantity}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(transfer.status)}
                            <Badge variant={getStatusBadgeVariant(transfer.status)}>
                              {transfer.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(transfer.created_at), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {transfer.created_by_name || "Unknown"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Transfer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>New Stock Transfer</DialogTitle>
            <DialogDescription>
              Transfer inventory from one outlet to another
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From Outlet *</Label>
              <Select value={fromOutletId} onValueChange={(v) => {
                setFromOutletId(v);
                setSelectedProductId("");
                setSelectedVariantId("");
              }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets.map((outlet) => (
                    <SelectItem key={outlet.id} value={outlet.id}>
                      {outlet.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>To Outlet *</Label>
              <Select value={toOutletId} onValueChange={setToOutletId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets
                    .filter((o) => o.id !== fromOutletId)
                    .map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product *</Label>
              <Select 
                value={selectedProductId} 
                onValueChange={(v) => {
                  setSelectedProductId(v);
                  setSelectedVariantId("");
                }}
                disabled={!fromOutletId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={fromOutletId ? "Select product" : "Select source outlet first"} />
                </SelectTrigger>
                <SelectContent>
                  {availableProducts.map((item) => (
                    <SelectItem key={item.product_id} value={item.product_id}>
                      {item.product?.title || "Unknown Product"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {availableVariants.length > 1 && (
              <div className="space-y-2">
                <Label>Variant</Label>
                <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select variant" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableVariants.map((item) => (
                      <SelectItem key={item.variant_id || "default"} value={item.variant_id || ""}>
                        {item.variant?.size && item.variant?.color
                          ? `${item.variant.size} / ${item.variant.color}`
                          : item.variant?.size || item.variant?.color || "Default"
                        } ({item.quantity} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label>Quantity * {maxQuantity > 0 && `(Max: ${maxQuantity})`}</Label>
              <Input
                type="number"
                min={1}
                max={maxQuantity}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for transfer..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCreateDialog(false);
              resetForm();
            }}>
              Cancel
            </Button>
            <Button onClick={handleCreateTransfer} disabled={createTransfer.isPending}>
              Create Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
