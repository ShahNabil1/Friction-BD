import { useState } from "react";
import { Building2, Plus, MapPin, Phone, Package, Edit2, Trash2, MoreHorizontal, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useOutlets, useOutletInventory, useCreateOutlet, useUpdateOutlet, useDeleteOutlet, Outlet } from "@/hooks/useOutlets";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function OutletManagementSection() {
  const { toast } = useToast();
  const { data: outlets = [], isLoading } = useOutlets();
  const createOutlet = useCreateOutlet();
  const updateOutlet = useUpdateOutlet();
  const deleteOutlet = useDeleteOutlet();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", address: "", phone: "" });

  const { data: inventory = [], isLoading: inventoryLoading } = useOutletInventory(selectedOutletId);

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }

    try {
      if (editingOutlet) {
        await updateOutlet.mutateAsync({
          id: editingOutlet.id,
          name: formData.name,
          address: formData.address || null,
          phone: formData.phone || null,
        });
        toast({ title: "Outlet updated successfully" });
      } else {
        await createOutlet.mutateAsync(formData);
        toast({ title: "Outlet created successfully" });
      }
      setShowAddDialog(false);
      setEditingOutlet(null);
      setFormData({ name: "", address: "", phone: "" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setFormData({
      name: outlet.name,
      address: outlet.address || "",
      phone: outlet.phone || "",
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (outlet: Outlet) => {
    if (outlet.is_main_branch) {
      toast({ title: "Cannot delete main branch", variant: "destructive" });
      return;
    }

    if (!confirm(`Are you sure you want to delete "${outlet.name}"?`)) return;

    try {
      await deleteOutlet.mutateAsync(outlet.id);
      toast({ title: "Outlet deleted successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Outlet Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your store branches and their inventory
          </p>
        </div>
        <Button onClick={() => {
          setEditingOutlet(null);
          setFormData({ name: "", address: "", phone: "" });
          setShowAddDialog(true);
        }}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Outlet
        </Button>
      </div>

      <Tabs defaultValue="outlets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="outlets">All Outlets</TabsTrigger>
          <TabsTrigger value="inventory">Outlet Inventory</TabsTrigger>
        </TabsList>

        <TabsContent value="outlets" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading outlets...</div>
          ) : outlets.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-medium text-foreground mb-2">No outlets yet</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first outlet to get started
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Outlet
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {outlets.map((outlet) => (
                <Card key={outlet.id} className={cn(outlet.is_main_branch && "border-primary/30")}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-10 w-10 rounded-lg flex items-center justify-center",
                          outlet.is_main_branch ? "bg-primary/20" : "bg-muted"
                        )}>
                          <Building2 className={cn(
                            "h-5 w-5",
                            outlet.is_main_branch ? "text-primary" : "text-muted-foreground"
                          )} />
                        </div>
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            {outlet.name}
                            {outlet.is_main_branch && (
                              <Badge variant="secondary" className="text-xs">Main</Badge>
                            )}
                          </CardTitle>
                          <Badge variant={outlet.is_active ? "default" : "secondary"} className="mt-1">
                            {outlet.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(outlet)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setSelectedOutletId(outlet.id)}>
                            <Package className="h-4 w-4 mr-2" />
                            View Inventory
                          </DropdownMenuItem>
                          {!outlet.is_main_branch && (
                            <DropdownMenuItem 
                              onClick={() => handleDelete(outlet)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    {outlet.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                        <span className="line-clamp-2">{outlet.address}</span>
                      </div>
                    )}
                    {outlet.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 shrink-0" />
                        <span>{outlet.phone}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Label>Select Outlet</Label>
                <Select value={selectedOutletId || ""} onValueChange={setSelectedOutletId}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Choose an outlet" />
                  </SelectTrigger>
                  <SelectContent>
                    {outlets.map((outlet) => (
                      <SelectItem key={outlet.id} value={outlet.id}>
                        {outlet.name} {outlet.is_main_branch && "(Main)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedOutletId ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select an outlet to view its inventory
                </div>
              ) : inventoryLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading inventory...</div>
              ) : inventory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No inventory items found for this outlet
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Variant</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.product?.title || "Unknown Product"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.variant?.sku || item.product?.sku || "-"}
                        </TableCell>
                        <TableCell>
                          {item.variant ? (
                            <div className="flex gap-1">
                              {item.variant.size && <Badge variant="outline">{item.variant.size}</Badge>}
                              {item.variant.color && <Badge variant="outline">{item.variant.color}</Badge>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {item.quantity}
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOutlet ? "Edit Outlet" : "Add New Outlet"}</DialogTitle>
            <DialogDescription>
              {editingOutlet ? "Update the outlet details" : "Create a new store branch"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="outlet-name">Outlet Name *</Label>
              <Input
                id="outlet-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Downtown Branch"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outlet-address">Address</Label>
              <Textarea
                id="outlet-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Full address"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="outlet-phone">Phone</Label>
              <Input
                id="outlet-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Contact number"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createOutlet.isPending || updateOutlet.isPending}>
              {editingOutlet ? "Update" : "Create"} Outlet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
