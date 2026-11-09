import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Star,
  Loader2,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import { ImageUploader } from "@/components/admin/ImageUploader";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface FeaturedReview {
  id: string;
  customer_name: string;
  rating: number;
  image: string;
  review_text?: string;
}

function StarRating({
  rating,
  interactive,
  onRate,
}: {
  rating: number;
  interactive?: boolean;
  onRate?: (r: number) => void;
}) {
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
                "h-5 w-5",
                filled ? "fill-gold text-gold" : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function FeaturedReviewsManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [reviews, setReviews] = useState<FeaturedReview[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settingsId, setSettingsId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    customer_name: "",
    rating: 5,
    image: "",
    review_text: "",
  });

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("store_settings")
        .select("id, featured_reviews")
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettingsId(data.id);
        const parsed = Array.isArray(data.featured_reviews)
          ? (data.featured_reviews as unknown as FeaturedReview[])
          : [];
        setReviews(parsed);
      }
    } catch (error) {
      console.error("Error fetching featured reviews:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddReview = async () => {
    if (!form.customer_name || !form.image) {
      toast({
        title: "Missing Fields",
        description: "Customer name and image are required.",
        variant: "destructive",
      });
      return;
    }

    const newReview: FeaturedReview = {
      id: crypto.randomUUID(),
      customer_name: form.customer_name.trim(),
      rating: form.rating,
      image: form.image,
      review_text: form.review_text.trim() || undefined,
    };

    const updatedReviews = [...reviews, newReview];
    await saveReviews(updatedReviews);

    // Reset form
    setForm({
      customer_name: "",
      rating: 5,
      image: "",
      review_text: "",
    });
    setDialogOpen(false);
  };

  const handleDeleteReview = async (id: string) => {
    const updatedReviews = reviews.filter((r) => r.id !== id);
    await saveReviews(updatedReviews);
  };

  const saveReviews = async (updatedReviews: FeaturedReview[]) => {
    setIsSaving(true);
    try {
      const reviewsJson = JSON.parse(JSON.stringify(updatedReviews));
      
      if (settingsId) {
        const { error } = await supabase
          .from("store_settings")
          .update({ featured_reviews: reviewsJson })
          .eq("id", settingsId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("store_settings")
          .insert({ featured_reviews: reviewsJson })
          .select("id")
          .single();

        if (error) throw error;
        setSettingsId(data.id);
      }

      setReviews(updatedReviews);
      toast({
        title: "Saved",
        description: "Featured reviews updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save reviews",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Featured Social Reviews</CardTitle>
            <CardDescription>
              Upload screenshots of Facebook comments, WhatsApp chats, or other social proof.
              These will appear in the homepage carousel.
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Featured Review</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Customer Name *</Label>
                  <Input
                    value={form.customer_name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, customer_name: e.target.value }))
                    }
                    placeholder="e.g., Salim Sharaft"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Rating</Label>
                  <div>
                    <StarRating
                      rating={form.rating}
                      interactive
                      onRate={(r) => setForm((p) => ({ ...p, rating: r }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Screenshot Image *</Label>
                  <ImageUploader
                    bucket="ecommerce-assets"
                    folder="featured-reviews"
                    value={form.image ? [form.image] : []}
                    onChange={(imgs) =>
                      setForm((p) => ({ ...p, image: imgs[0] || "" }))
                    }
                    maxFiles={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Upload a screenshot of the customer's review (Facebook, WhatsApp, etc.)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Caption (Optional)</Label>
                  <Textarea
                    value={form.review_text}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, review_text: e.target.value }))
                    }
                    placeholder="Short summary of the review..."
                    rows={2}
                  />
                </div>

                <Button
                  onClick={handleAddReview}
                  disabled={isSaving || !form.customer_name || !form.image}
                  className="w-full"
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Add Review
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ImagePlus className="mb-4 h-12 w-12 text-muted-foreground/50" />
              <p className="text-muted-foreground">No featured reviews yet</p>
              <p className="text-sm text-muted-foreground">
                Add screenshots of your best customer reviews
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="group relative overflow-hidden rounded-xl border bg-card"
                >
                  <img
                    src={review.image}
                    alt={`Review by ${review.customer_name}`}
                    className="aspect-[4/5] w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-1 text-gold">
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>
                    <p className="mt-1 font-semibold text-white">
                      {review.customer_name}
                    </p>
                    {review.review_text && (
                      <p className="mt-1 text-sm text-white/80 line-clamp-2">
                        {review.review_text}
                      </p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Review?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove the review from the homepage carousel.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteReview(review.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
