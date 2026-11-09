import { useMemo, useState } from "react";
import { Plus, Edit, Trash2, Image as ImageIcon, Loader2, Save } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useBrands, useCreateBrand, useDeleteBrand, useUpdateBrand } from "@/hooks/useBrands";

export default function AdminBrands() {
  const { toast } = useToast();
  const { data: brands = [], isLoading } = useBrands();
  const createBrand = useCreateBrand();
  const updateBrand = useUpdateBrand();
  const deleteBrand = useDeleteBrand();

  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [logoUrls, setLogoUrls] = useState<string[]>([]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, searchTerm]);

  const reset = () => {
    setEditingId(null);
    setName("");
    setLogoUrls([]);
  };

  const openAdd = () => {
    reset();
    setOpen(true);
  };

  const openEdit = (b: { id: string; name: string; logo_url: string | null }) => {
    setEditingId(b.id);
    setName(b.name);
    setLogoUrls(b.logo_url ? [b.logo_url] : []);
    setOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    try {
      if (editingId) {
        await updateBrand.mutateAsync({ id: editingId, name: trimmed, logo_url: logoUrls[0] ?? null });
        toast({ title: "Brand updated" });
      } else {
        await createBrand.mutateAsync({ name: trimmed, logo_url: logoUrls[0] ?? null });
        toast({ title: "Brand created" });
      }
      setOpen(false);
      reset();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save brand", variant: "destructive" });
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Brands</h1>
            <p className="text-muted-foreground">Manage brand names and logos (Supabase-backed)</p>
          </div>

          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Input
              placeholder="Search brands…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-72"
            />

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) reset();
              }}
            >
              <DialogTrigger asChild>
                <Button onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Brand
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Edit Brand" : "Add Brand"}</DialogTitle>
                  <DialogDescription>Upload a logo to Cloudinary and save the brand.</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2">
                  <div className="space-y-2">
                    <Label>Brand Name *</Label>
                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Rolex" />
                  </div>

                  <div className="space-y-2">
                    <Label>Logo</Label>
                    <ImageUploader
                      bucket="ecommerce-assets"
                      folder="brands"
                      value={logoUrls}
                      onChange={(next) => setLogoUrls(next.slice(0, 1))}
                      multiple={false}
                      maxFiles={1}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={save}
                    disabled={createBrand.isPending || updateBrand.isPending || !name.trim()}
                  >
                    {(createBrand.isPending || updateBrand.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">All Brands</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
                <p className="mt-3 text-muted-foreground">No brands yet.</p>
                <Button className="mt-4" onClick={openAdd}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add your first brand
                </Button>
              </div>
            ) : (
              <div className="divide-y rounded-md border">
                {filtered.map((b) => (
                  <div key={b.id} className="flex items-center justify-between gap-4 p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 overflow-hidden rounded-md border bg-muted/20">
                        {b.logo_url ? (
                          <img
                            src={b.logo_url}
                            alt={`${b.name} logo`}
                            className="h-full w-full object-contain p-1"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <ImageIcon className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.logo_url ? "Logo set" : "No logo"}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" onClick={() => openEdit(b)} aria-label="Edit brand">
                        <Edit className="h-4 w-4" />
                      </Button>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="ghost" size="icon" aria-label="Delete brand">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete brand?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will remove the brand from the brands list. It will not delete any products.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={async () => {
                                try {
                                  await deleteBrand.mutateAsync({ id: b.id, name: b.name });
                                  toast({ title: "Brand deleted" });
                                } catch (e: any) {
                                  toast({ title: "Error", description: e?.message || "Failed to delete", variant: "destructive" });
                                }
                              }}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
