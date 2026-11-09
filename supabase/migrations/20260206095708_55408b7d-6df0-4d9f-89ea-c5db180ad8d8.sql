-- Add master_pin column to outlets table for supervisor PIN
ALTER TABLE public.outlets ADD COLUMN IF NOT EXISTS master_pin text;

-- Create order_returns table for tracking returns
CREATE TABLE IF NOT EXISTS public.order_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  return_receipt_number text,
  return_type text NOT NULL DEFAULT 'refund', -- 'refund' or 'exchange'
  reason text, -- 'wrong_size', 'defective', 'changed_mind', 'other'
  reason_notes text,
  returned_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  exchange_items jsonb DEFAULT '[]'::jsonb,
  original_amount integer NOT NULL DEFAULT 0,
  exchange_amount integer DEFAULT 0,
  refund_amount integer DEFAULT 0,
  balance_due integer DEFAULT 0, -- Positive = customer owes, Negative = store owes
  processed_by uuid,
  processed_by_name text,
  customer_name text,
  customer_phone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on order_returns
ALTER TABLE public.order_returns ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_returns
CREATE POLICY "Staff can manage order returns"
ON public.order_returns FOR ALL
USING (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text))
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_access_pos = true)
    AND outlet_id IN (SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid())
  )
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (has_role(auth.uid(), 'moderator'::app_role) AND has_permission(auth.uid(), 'orders'::text))
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND can_access_pos = true)
    AND outlet_id IN (SELECT assigned_outlet_id FROM profiles WHERE id = auth.uid())
  )
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_order_returns_outlet_id ON public.order_returns(outlet_id);
CREATE INDEX IF NOT EXISTS idx_order_returns_created_at ON public.order_returns(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_returns_order_id ON public.order_returns(order_id);

-- Trigger for updated_at
CREATE TRIGGER update_order_returns_updated_at
  BEFORE UPDATE ON public.order_returns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();