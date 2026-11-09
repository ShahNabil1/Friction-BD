-- Create a function to recalculate and update product rating stats
CREATE OR REPLACE FUNCTION public.update_product_review_stats()
RETURNS TRIGGER AS $$
DECLARE
  target_product_id UUID;
  avg_rating NUMERIC;
  total_reviews INTEGER;
BEGIN
  -- Determine which product_id to update
  IF TG_OP = 'DELETE' THEN
    target_product_id := OLD.product_id;
  ELSE
    target_product_id := NEW.product_id;
  END IF;

  -- Skip if no product_id
  IF target_product_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Calculate average rating and count from approved reviews only
  SELECT 
    COALESCE(ROUND(AVG(rating)::numeric, 1), 0),
    COALESCE(COUNT(*), 0)
  INTO avg_rating, total_reviews
  FROM public.product_reviews
  WHERE product_id = target_product_id
    AND is_approved = true;

  -- Update the product's rating and review_count
  UPDATE public.products
  SET 
    rating = avg_rating,
    review_count = total_reviews,
    updated_at = now()
  WHERE id = target_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for INSERT, UPDATE, and DELETE on product_reviews
DROP TRIGGER IF EXISTS trigger_update_product_stats_insert ON public.product_reviews;
CREATE TRIGGER trigger_update_product_stats_insert
  AFTER INSERT ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_review_stats();

DROP TRIGGER IF EXISTS trigger_update_product_stats_update ON public.product_reviews;
CREATE TRIGGER trigger_update_product_stats_update
  AFTER UPDATE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_review_stats();

DROP TRIGGER IF EXISTS trigger_update_product_stats_delete ON public.product_reviews;
CREATE TRIGGER trigger_update_product_stats_delete
  AFTER DELETE ON public.product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_product_review_stats();

-- Recalculate stats for all existing products with approved reviews
UPDATE public.products p
SET 
  rating = COALESCE(stats.avg_rating, 0),
  review_count = COALESCE(stats.total_reviews, 0),
  updated_at = now()
FROM (
  SELECT 
    product_id,
    ROUND(AVG(rating)::numeric, 1) as avg_rating,
    COUNT(*) as total_reviews
  FROM public.product_reviews
  WHERE is_approved = true
  GROUP BY product_id
) stats
WHERE p.id = stats.product_id;