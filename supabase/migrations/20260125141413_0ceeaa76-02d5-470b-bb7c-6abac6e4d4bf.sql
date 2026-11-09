-- Add unique constraint on user_id for cart upsert functionality
ALTER TABLE public.customer_carts
ADD CONSTRAINT customer_carts_user_id_unique UNIQUE (user_id);