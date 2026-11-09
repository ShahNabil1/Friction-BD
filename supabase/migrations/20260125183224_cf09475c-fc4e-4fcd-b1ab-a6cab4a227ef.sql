-- Add selected_variation column to order_items to store customer's color/size choices
ALTER TABLE public.order_items 
ADD COLUMN selected_variation jsonb DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.order_items.selected_variation IS 'Stores customer selected variation e.g. {"color": "Gold", "size": "42mm"}';