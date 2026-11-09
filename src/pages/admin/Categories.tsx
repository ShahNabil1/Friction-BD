import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  ChevronRight,
  ImageIcon,
  FolderTree,
  Star,
} from "lucide-react";
import { useCategories, Category, CategoryFormData } from "@/hooks/useCategories";
import { CategoryFormDialog } from "@/components/admin/CategoryFormDialog";

const AdminCategories = () => {
  const {
    categories,
    hierarchicalCategories,
    mainCategories,
    isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
  } = useCategories();

  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);

  // Flatten hierarchical categories for display with indentation
  const flattenForDisplay = (
    cats: Category[],
    level = 0
  ): Array<Category & { level: number }> => {
    const result: Array<Category & { level: number }> = [];
    cats.forEach((cat) => {
      result.push({ ...cat, level });
      if (cat.children && cat.children.length > 0) {
        result.push(...flattenForDisplay(cat.children, level + 1));
      }
    });
    return result;
  };

  const displayCategories = flattenForDisplay(hierarchicalCategories);

  // Filter by search
  const filteredCategories = displayCategories.filter((cat) =>
    cat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleDelete = (category: Category) => {
    setDeletingCategory(category);
  };

  const confirmDelete = () => {
    if (deletingCategory) {
      deleteCategory.mutate({ id: deletingCategory.id, name: deletingCategory.name });
      setDeletingCategory(null);
    }
  };

  const handleSubmit = (data: CategoryFormData) => {
    if (editingCategory) {
      updateCategory.mutate(
        { id: editingCategory.id, data },
        {
          onSuccess: () => setIsFormOpen(false),
        }
      );
    } else {
      createCategory.mutate(data, {
        onSuccess: () => setIsFormOpen(false),
      });
    }
  };

  // Get parent name for display
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name || null;
  };

  // Count subcategories
  const getSubcategoryCount = (categoryId: string) => {
    return categories.filter((c) => c.parent_id === categoryId).length;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-muted-foreground">
              Manage product categories and subcategories
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Category
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Badge variant="secondary" className="gap-1">
            <FolderTree className="h-3 w-3" />
            {categories.length} categories
          </Badge>
        </div>

        {/* Table */}
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Image</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Parent</TableHead>
                <TableHead className="text-center">Featured</TableHead>
                <TableHead className="text-center">Subcategories</TableHead>
                <TableHead className="text-center">Sort Order</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-10 w-10 rounded" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8 mx-auto" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20 ml-auto" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <FolderTree className="h-8 w-8" />
                      <p>No categories found</p>
                      <Button variant="link" onClick={handleCreate}>
                        Create your first category
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      {category.image_url ? (
                        <img
                          src={category.image_url_optimized || category.image_url}
                          alt={category.name}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded bg-muted">
                          <ImageIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div
                        className="flex items-center gap-1"
                        style={{ paddingLeft: `${category.level * 24}px` }}
                      >
                        {category.level > 0 && (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {category.slug}
                      </code>
                    </TableCell>
                    <TableCell>
                      {getParentName(category.parent_id) ? (
                        <Badge variant="outline">
                          {getParentName(category.parent_id)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.is_featured ? (
                        <Star className="h-4 w-4 mx-auto text-amber-500 fill-amber-500" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {getSubcategoryCount(category.id) > 0 ? (
                        <Badge variant="secondary">
                          {getSubcategoryCount(category.id)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {category.sort_order}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Form Dialog */}
      <CategoryFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        category={editingCategory}
        mainCategories={mainCategories}
        onSubmit={handleSubmit}
        isSubmitting={createCategory.isPending || updateCategory.isPending}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deletingCategory}
        onOpenChange={() => setDeletingCategory(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingCategory?.name}"?
              {getSubcategoryCount(deletingCategory?.id || "") > 0 && (
                <span className="mt-2 block font-medium text-destructive">
                  Warning: This category has{" "}
                  {getSubcategoryCount(deletingCategory?.id || "")} subcategories.
                  They will become main categories.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default AdminCategories;
