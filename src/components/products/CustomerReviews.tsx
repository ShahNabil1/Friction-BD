import { useState, useEffect } from "react";
import { useAuth } from "@/context/auth";
import { useProductReviews, useReviewStats, useCanWriteReview, useCreateReview } from "@/hooks/useProductReviews";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Star, Loader2, CheckCircle, ImagePlus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { ImageUploader } from "@/components/admin/ImageUploader";

interface CustomerReviewsProps {
  productId: string;
  productRating: number;
  reviewCount: number;
}

function StarRating({ 
  rating, 
  interactive = false, 
  onRate,
  size = "md"
}: { 
  rating: number; 
  interactive?: boolean; 
  onRate?: (rating: number) => void;
  size?: "sm" | "md" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-6 w-6",
  };
  
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = interactive 
          ? star <= (hovered || rating) 
          : star <= rating;
        
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onRate?.(star)}
            onMouseEnter={() => interactive && setHovered(star)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={cn(
              "transition-colors",
              interactive && "cursor-pointer hover:scale-110",
              !interactive && "cursor-default"
            )}
          >
            <Star 
              className={cn(
                sizeClasses[size],
                filled ? "fill-gold text-gold" : "text-muted-foreground/40"
              )} 
            />
          </button>
        );
      })}
    </div>
  );
}

function RatingBreakdown({ stats }: { stats: ReturnType<typeof useReviewStats> }) {
  const maxCount = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 md:p-6">
      <div className="mb-4 text-center md:text-left">
        <div className="text-4xl font-bold text-foreground md:text-5xl">
          {stats.averageRating.toFixed(1)}
        </div>
        <div className="mt-1">
          <StarRating rating={Math.round(stats.averageRating)} size="md" />
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.distribution[star] || 0;
          const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;

          return (
            <div key={star} className="flex items-center gap-2">
              <span className="w-6 text-sm font-medium">{star}</span>
              <Star className="h-4 w-4 fill-gold text-gold" />
              <Progress value={percentage} className="h-2 flex-1" />
              <span className="w-8 text-right text-sm text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CustomerReviews({ productId, productRating, reviewCount }: CustomerReviewsProps) {
  const { user } = useAuth();
  const { data: reviews = [], isLoading } = useProductReviews(productId);
  const stats = useReviewStats(productId);
  const { data: eligibility } = useCanWriteReview(productId);
  const createReview = useCreateReview();
  
  const [showModal, setShowModal] = useState(false);
  const [rating, setRating] = useState(5);
  const [name, setName] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  
  // Image preview lightbox state
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  const openImagePreview = (images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
  };

  const closeImagePreview = () => {
    setPreviewImages([]);
    setPreviewIndex(0);
  };

  const goToPrevImage = () => {
    setPreviewIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNextImage = () => {
    setPreviewIndex((prev) => Math.min(previewImages.length - 1, prev + 1));
  };

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (previewImages.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          closeImagePreview();
          break;
        case "ArrowLeft":
          e.preventDefault();
          goToPrevImage();
          break;
        case "ArrowRight":
          e.preventDefault();
          goToNextImage();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [previewImages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Please enter your name");
      return;
    }

    try {
      await createReview.mutateAsync({
        product_id: productId,
        reviewer_name: name.trim(),
        rating,
        review_text: reviewText.trim() || undefined,
        images,
      });
      
      toast.success("Thank you! Your review is pending approval.");
      setShowModal(false);
      setRating(5);
      setName("");
      setReviewText("");
      setImages([]);
    } catch {
      toast.error("Failed to submit review. Please try again.");
    }
  };

  const canWriteReview = eligibility?.canWrite ?? false;

  return (
    <section className="mt-12" aria-label="Customer reviews">
      <h2 className="mb-6 text-xl font-bold tracking-tight md:text-2xl">
        Customer Reviews
      </h2>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: Rating Summary */}
        <div className="space-y-4">
          <RatingBreakdown stats={stats} />
          
          {/* Write Review Button */}
          {user ? (
            canWriteReview ? (
              <Button 
                onClick={() => setShowModal(true)} 
                className="w-full bg-maroon hover:bg-maroon/90"
              >
                Write a Review
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {eligibility?.reason === "already_reviewed" 
                    ? "You've already reviewed this product"
                    : "Only customers who purchased this item can review"}
                </p>
              </div>
            )
          ) : (
            <div className="rounded-lg border border-dashed border-border p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Sign in to write a review
              </p>
            </div>
          )}
        </div>

        {/* Right: Reviews List */}
        <div>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : reviews.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Star className="mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground">No reviews yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to review this product!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="border-border/50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-maroon/10 text-maroon">
                          {review.reviewer_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{review.reviewer_name}</span>
                          {review.is_verified_purchase && (
                            <Badge variant="secondary" className="gap-1 bg-green-100 text-green-700 text-xs">
                              <CheckCircle className="h-3 w-3" />
                              Verified Purchase
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2">
                          <StarRating rating={review.rating} size="sm" />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.created_at), "MMM d, yyyy")}
                          </span>
                        </div>
                        {review.review_text && (
                          <p className="mt-2 text-sm text-muted-foreground">
                            {review.review_text}
                          </p>
                        )}
                        {/* Review Images */}
                        {review.images && review.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {review.images.map((img, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => openImagePreview(review.images as string[], idx)}
                                className="h-16 w-16 cursor-pointer overflow-hidden rounded-md border border-border transition-all hover:ring-2 hover:ring-primary hover:ring-offset-2 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              >
                                <img
                                  src={img}
                                  alt={`Review image ${idx + 1}`}
                                  className="h-full w-full object-cover"
                                />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Write a Review</DialogTitle>
            <DialogDescription>
              Share your experience with this product
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">Your Rating</label>
              <StarRating rating={rating} interactive onRate={setRating} size="lg" />
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium">Your Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            
            <div>
              <label className="mb-2 block text-sm font-medium">Your Review</label>
              <Textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                rows={4}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Add Photos (Optional)</label>
              <ImageUploader
                bucket="ecommerce-assets"
                folder="reviews"
                value={images}
                onChange={setImages}
                multiple
                maxFiles={5}
              />
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button 
                type="submit" 
                disabled={createReview.isPending}
                className="flex-1 bg-maroon hover:bg-maroon/90"
              >
                {createReview.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Review
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowModal(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Image Preview Lightbox with Navigation */}
      <Dialog open={previewImages.length > 0} onOpenChange={(open) => !open && closeImagePreview()}>
        <DialogContent className="w-[90%] max-w-4xl rounded-xl border-none bg-black/90 p-2 shadow-2xl sm:p-4">
          {/* Previous button */}
          {previewImages.length > 1 && (
            <button
              type="button"
              onClick={goToPrevImage}
              disabled={previewIndex === 0}
              className="absolute left-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-30 sm:left-2 sm:p-2 md:-left-14 md:bg-black/50 md:hover:bg-black/70"
              aria-label="Previous image"
            >
              <ChevronLeft className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Next button */}
          {previewImages.length > 1 && (
            <button
              type="button"
              onClick={goToNextImage}
              disabled={previewIndex === previewImages.length - 1}
              className="absolute right-1 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/20 p-1.5 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus:ring-2 focus:ring-white disabled:cursor-not-allowed disabled:opacity-30 sm:right-2 sm:p-2 md:-right-14 md:bg-black/50 md:hover:bg-black/70"
              aria-label="Next image"
            >
              <ChevronRight className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}

          {/* Image */}
          {previewImages[previewIndex] && (
            <img
              src={previewImages[previewIndex]}
              alt={`Review image ${previewIndex + 1} of ${previewImages.length}`}
              className="max-h-[70vh] w-full rounded-lg object-contain sm:max-h-[75vh]"
            />
          )}

          {/* Image counter */}
          {previewImages.length > 1 && (
            <div className="mt-2 text-center text-sm text-white/80">
              {previewIndex + 1} / {previewImages.length}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
