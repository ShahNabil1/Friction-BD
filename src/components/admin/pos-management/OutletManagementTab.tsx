import { useState } from "react";
import { Plus, Pencil, Trash2, MapPin, Phone, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useOutlets, Outlet } from "@/hooks/useOutlets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { OutletFormDialog } from "./OutletFormDialog";

export function OutletManagementTab() {
  const { data: outlets = [], isLoading, refetch } = useOutlets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [outletToDelete, setOutletToDelete] = useState<Outlet | null>(null);

  const handleEdit = (outlet: Outlet) => {
    setEditingOutlet(outlet);
    setDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingOutlet(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!outletToDelete) return;

    try {
      const { error } = await supabase
        .from("outlets")
        .delete()
        .eq("id", outletToDelete.id);

      if (error) throw error;

      toast.success("Outlet deleted successfully");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete outlet");
    } finally {
      setDeleteConfirmOpen(false);
      setOutletToDelete(null);
    }
  };

  const confirmDelete = (outlet: Outlet) => {
    setOutletToDelete(outlet);
    setDeleteConfirmOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-5 w-32 bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-4 w-full bg-muted rounded" />
                <div className="h-4 w-24 bg-muted rounded" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Outlet Branches</h2>
          <p className="text-sm text-muted-foreground">
            Manage your store branches and their details
          </p>
        </div>
        <Button onClick={handleAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Outlet
        </Button>
      </div>

      {/* Outlet Grid */}
      {outlets.length === 0 ? (
        <Card className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No outlets yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first outlet to get started with multi-branch management
            </p>
            <Button onClick={handleAddNew} className="gap-2">
              <Plus className="h-4 w-4" />
              Add First Outlet
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {outlets.map((outlet) => (
            <Card key={outlet.id} className="relative group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{outlet.name}</CardTitle>
                    {outlet.is_main_branch && (
                      <Badge variant="secondary" className="text-xs">
                        Main
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleEdit(outlet)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    {!outlet.is_main_branch && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => confirmDelete(outlet)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {outlet.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{outlet.address}</span>
                  </div>
                )}
                {outlet.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 shrink-0" />
                    <span>{outlet.phone}</span>
                  </div>
                )}
                <div className="pt-2">
                  <Badge variant={outlet.is_active ? "default" : "secondary"}>
                    {outlet.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <OutletFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        outlet={editingOutlet}
        onSuccess={() => {
          setDialogOpen(false);
          setEditingOutlet(null);
          refetch();
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Outlet</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{outletToDelete?.name}"? This action
              cannot be undone. All inventory and orders associated with this outlet
              will be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
