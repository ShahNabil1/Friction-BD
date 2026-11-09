import { useState } from "react";
import { format } from "date-fns";
import {
  Star,
  Search,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Package,
  ShieldCheck,
  ShieldX,
  Plus,
  ImagePlus,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { FeaturedReviewsManager } from "@/components/admin/FeaturedReviewsManager";
import {
  useAdminReviews,
  useAdminProducts,
  useUpdateReviewStatus,
  useVerifyReview,
  useDeleteReview,
  useCreateManualReview,
} from "@/hooks/useAdminReviews";
import { cn } from "@/lib/utils";

function StarRating({ rating, interactive, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive ? star <= (hovered || rating) : star <= rating;
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn(interactive && "cursor-pointer hover:scale-110")}
          >
            <Star
              className={cn(
                "h-4 w-4",
                filled ? "fill-gold text-gold" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return (
      <Badge variant="default" className="bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Approved
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      Pending
    </Badge>
  );
}

export default function AdminReviews() {
  const { data: reviews = [], isLoading } = useAdminReviews();
  const { data: products = [] } = useAdminProducts();
  const updateStatus = useUpdateReviewStatus();
  const verifyReview = useVerifyReview();
  const deleteReview = useDeleteReview();
  const createReview = useCreateManualReview();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // Manual review form state
  const [manualForm, setManualForm] = useState({
    product_id: "",
    reviewer_name: "",
    rating: 5,
    review_text: "",
    images: [] as string[],
    is_verified_purchase: true,
    created_at: "",
  });

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.reviewer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.review_text?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      review.product?.title.toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = true;
    if (filterStatus !== "all") {
      matchesStatus = review.status === filterStatus;
    }

    return matchesSearch && matchesStatus;
  });

  const pendingCount = reviews.filter((r) => r.status === "pending").length;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.product_id || !manualForm.reviewer_name) {
      return;
    }

    await createReview.mutateAsync({
      product_id: manualForm.product_id,
      reviewer_name: manualForm.reviewer_name.trim(),
      rating: manualForm.rating,
      review_text: manualForm.review_text.trim() || undefined,
      images: manualForm.images,
      is_verified_purchase: manualForm.is_verified_purchase,
      created_at: manualForm.created_at || undefined,
    });

    // Reset form
    setManualForm({
      product_id: "",
      reviewer_name: "",
      rating: 5,
      review_text: "",
      images: [],
      is_verified_purchase: true,
      created_at: "",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Reviews</h1>
            <p className="text-muted-foreground">
              Manage and moderate customer reviews
            </p>
          </div>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="w-fit">
              {pendingCount} pending review{pendingCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>

        <Tabs defaultValue="moderation" className="space-y-4">
          <TabsList>
            <TabsTrigger value="moderation">
              Product Reviews
              {pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-destructive px-2 py-0.5 text-xs text-destructive-foreground">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="featured">
              Featured / Social
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Plus className="mr-1 h-4 w-4" />
              Add Review
            </TabsTrigger>
          </TabsList>

          {/* Moderation Tab */}
          <TabsContent value="moderation" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as typeof filterStatus)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reviews</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Reviews Table */}
            <Card className="border-border/50">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : filteredReviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Star className="mb-4 h-12 w-12 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No reviews found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Reviewer</TableHead>
                          <TableHead>Rating</TableHead>
                          <TableHead className="max-w-xs">Review</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredReviews.map((review) => (
                          <TableRow key={review.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {review.product?.images?.[0] ? (
                                  <img
                                    src={review.product.images[0]}
                                    alt={review.product.title}
                                    className="h-10 w-10 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="max-w-32 truncate text-sm font-medium">
                                  {review.product?.title || "Unknown Product"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback className="bg-maroon/10 text-maroon text-xs">
                                    {review.reviewer_name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-sm font-medium">{review.reviewer_name}</p>
                                  {review.is_verified_purchase && (
                                    <Badge variant="secondary" className="mt-0.5 gap-1 text-xs bg-green-100 text-green-700">
                                      <CheckCircle className="h-3 w-3" />
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <StarRating rating={review.rating} />
                            </TableCell>
                            <TableCell className="max-w-xs">
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {review.review_text || <em className="text-muted-foreground/50">No text</em>}
                              </p>
                              {review.images && review.images.length > 0 && (
                                <div className="mt-1 flex gap-1">
                                  {review.images.slice(0, 3).map((img, i) => (
                                    <img key={i} src={img} alt="" className="h-8 w-8 rounded object-cover" />
                                  ))}
                                  {review.images.length > 3 && (
                                    <span className="text-xs text-muted-foreground">+{review.images.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <StatusBadge status={review.status} />
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), "MMM d, yyyy")}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                <TooltipProvider>
                                  {/* Approve */}
                                  {review.status !== "approved" && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            updateStatus.mutate({ id: review.id, status: "approved" })
                                          }
                                          disabled={updateStatus.isPending}
                                        >
                                          <CheckCircle className="h-4 w-4 text-green-600" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Approve</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Reject */}
                                  {review.status !== "rejected" && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() =>
                                            updateStatus.mutate({ id: review.id, status: "rejected" })
                                          }
                                          disabled={updateStatus.isPending}
                                        >
                                          <XCircle className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Reject</TooltipContent>
                                    </Tooltip>
                                  )}

                                  {/* Toggle Verified */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          verifyReview.mutate({
                                            id: review.id,
                                            verified: !review.is_verified_purchase,
                                          })
                                        }
                                        disabled={verifyReview.isPending}
                                      >
                                        {review.is_verified_purchase ? (
                                          <ShieldX className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ShieldCheck className="h-4 w-4 text-blue-600" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {review.is_verified_purchase
                                        ? "Remove verified badge"
                                        : "Mark as verified purchase"}
                                    </TooltipContent>
                                  </Tooltip>

                                  {/* Delete */}
                                  <AlertDialog>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                        </AlertDialogTrigger>
                                      </TooltipTrigger>
                                      <TooltipContent>Delete review</TooltipContent>
                                    </Tooltip>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          This will permanently delete this review. This action cannot
                                          be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => deleteReview.mutate(review.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </TooltipProvider>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Featured / Social Reviews Tab */}
          <TabsContent value="featured">
            <FeaturedReviewsManager />
          </TabsContent>

          {/* Manual Entry Tab */}
          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Add Manual Review</CardTitle>
                <CardDescription>
                  Create a review on behalf of a customer. This will be immediately published.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleManualSubmit} className="space-y-4 max-w-xl">
                  <div className="space-y-2">
                    <Label>Product *</Label>
                    <Select
                      value={manualForm.product_id}
                      onValueChange={(v) => setManualForm((p) => ({ ...p, product_id: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Reviewer Name *</Label>
                    <Input
                      value={manualForm.reviewer_name}
                      onChange={(e) => setManualForm((p) => ({ ...p, reviewer_name: e.target.value }))}
                      placeholder="Customer name"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rating</Label>
                    <div>
                      <StarRating
                        rating={manualForm.rating}
                        interactive
                        onRate={(r) => setManualForm((p) => ({ ...p, rating: r }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Review Text</Label>
                    <Textarea
                      value={manualForm.review_text}
                      onChange={(e) => setManualForm((p) => ({ ...p, review_text: e.target.value }))}
                      placeholder="Write the review content..."
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Review Images</Label>
                    <ImageUploader
                      bucket="ecommerce-assets"
                      folder="reviews"
                      value={manualForm.images}
                      onChange={(imgs) => setManualForm((p) => ({ ...p, images: imgs }))}
                      multiple
                      maxFiles={5}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Switch
                      id="verified"
                      checked={manualForm.is_verified_purchase}
                      onCheckedChange={(checked) =>
                        setManualForm((p) => ({ ...p, is_verified_purchase: checked }))
                      }
                    />
                    <Label htmlFor="verified">Mark as Verified Purchase</Label>
                  </div>

                  <div className="space-y-2">
                    <Label>Backdate Review (Optional)</Label>
                    <Input
                      type="date"
                      value={manualForm.created_at}
                      onChange={(e) => setManualForm((p) => ({ ...p, created_at: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Leave empty to use current date
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={createReview.isPending || !manualForm.product_id || !manualForm.reviewer_name}
                    className="w-full"
                  >
                    {createReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Review
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
