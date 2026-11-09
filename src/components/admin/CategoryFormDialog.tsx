import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Category, CategoryFormData } from "@/hooks/useCategories";
import { Loader2 } from "lucide-react";

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: Category | null;
  mainCategories: Category[];
  onSubmit: (data: CategoryFormData) => void;
  isSubmitting: boolean;
}

export const CategoryFormDialog = ({
  open,
  onOpenChange,
  category,
  mainCategories,
  onSubmit,
  isSubmitting,
}: CategoryFormDialogProps) => {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState<string>("none");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isFeatured, setIsFeatured] = useState(false);

  const isEditing = !!category;

  // Auto-generate slug from name
  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  };

  useEffect(() => {
    if (category) {
      setName(category.name);
      setParentId(category.parent_id || "none");
      setImageUrl(category.image_url || "");
      setSortOrder(category.sort_order);
      setIsFeatured(category.is_featured);
    } else {
      setName("");
      setParentId("none");
      setImageUrl("");
      setSortOrder(0);
      setIsFeatured(false);
    }
  }, [category, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = generateSlug(name);
    onSubmit({
      name,
      slug,
      image_url: imageUrl || null,
      parent_id: parentId === "none" ? null : parentId,
      sort_order: sortOrder,
      is_featured: isFeatured,
    });
  };

  // Filter out the current category and its children from parent options
  const availableParents = mainCategories.filter((c) => c.id !== category?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {isEditing ? "Edit Category" : "Add New Category"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Electronics, Men's Watches"
                required
              />
              <p className="text-xs text-muted-foreground">
                Slug will be auto-generated: <span className="font-mono text-foreground">{generateSlug(name) || "..."}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parent">Parent Category</Label>
              <Select value={parentId} onValueChange={setParentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Main Category)</SelectItem>
                  {availableParents.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "None" to create a main category.
              </p>
            </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sortOrder">Sort Order</Label>
              <Input
                id="sortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
                placeholder="0"
              />
              <p className="text-xs text-muted-foreground">
                Lower numbers appear first.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="isFeatured">Featured on Homepage</Label>
              <div className="flex items-center gap-2 pt-2">
                <Switch
                  id="isFeatured"
                  checked={isFeatured}
                  onCheckedChange={setIsFeatured}
                />
                <span className="text-sm text-muted-foreground">
                  {isFeatured ? "Visible" : "Hidden"}
                </span>
              </div>
            </div>
          </div>

            <div className="space-y-2">
              <Label>Category Image</Label>
              <ImageUploader
                bucket="ecommerce-assets"
                folder="categories"
                value={imageUrl ? [imageUrl] : []}
                onChange={(urls) => setImageUrl(urls[0] || "")}
                multiple={false}
                maxFiles={1}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !name}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEditing ? "Update Category" : "Create Category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
