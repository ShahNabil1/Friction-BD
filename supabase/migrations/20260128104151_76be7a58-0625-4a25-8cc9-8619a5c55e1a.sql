-- Add invoice_terms column to store_settings for editable PDF invoice terms
ALTER TABLE public.store_settings
ADD COLUMN IF NOT EXISTS invoice_terms jsonb DEFAULT '[
  "Returns are accepted within 3 days of delivery for unused items in original packaging.",
  "Exchange requests must be initiated within 3 days of receiving the product.",
  "Refunds will be processed within 7-10 business days after receiving the returned item.",
  "Delivery charges are non-refundable unless the return is due to a defective product.",
  "For any queries, contact us at 09611-656671 or visit www.bubulifestyle.com"
]'::jsonb;