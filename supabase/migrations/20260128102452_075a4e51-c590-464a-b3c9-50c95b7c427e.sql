-- Add ON DELETE CASCADE to order_items foreign key for orders
-- First drop the existing constraint, then recreate with CASCADE

ALTER TABLE public.order_items
DROP CONSTRAINT IF EXISTS order_items_order_id_fkey;

ALTER TABLE public.order_items
ADD CONSTRAINT order_items_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Also add CASCADE for order_notes
ALTER TABLE public.order_notes
DROP CONSTRAINT IF EXISTS order_notes_order_id_fkey;

ALTER TABLE public.order_notes
ADD CONSTRAINT order_notes_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Also add CASCADE for order_status_history
ALTER TABLE public.order_status_history
DROP CONSTRAINT IF EXISTS order_status_history_order_id_fkey;

ALTER TABLE public.order_status_history
ADD CONSTRAINT order_status_history_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;

-- Also add CASCADE for return_notes
ALTER TABLE public.return_notes
DROP CONSTRAINT IF EXISTS return_notes_order_id_fkey;

ALTER TABLE public.return_notes
ADD CONSTRAINT return_notes_order_id_fkey
FOREIGN KEY (order_id) REFERENCES public.orders(id)
ON DELETE CASCADE;