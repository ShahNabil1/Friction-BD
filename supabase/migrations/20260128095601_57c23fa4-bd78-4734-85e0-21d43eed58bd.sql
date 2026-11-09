-- Create order_notes table for internal staff notes
CREATE TABLE public.order_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

-- Only admins, super_admins, and moderators can manage order notes
CREATE POLICY "Staff can manage order notes"
ON public.order_notes
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Create order_status_history table
CREATE TABLE public.order_status_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id),
  changed_by_name TEXT,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- Staff can view and create status history
CREATE POLICY "Staff can manage order status history"
ON public.order_status_history
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);

-- Customers can view their own order status history
CREATE POLICY "Customers can view own order status history"
ON public.order_status_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.user_id = auth.uid()
  )
);

-- Add indexes for performance
CREATE INDEX idx_order_notes_order_id ON public.order_notes(order_id);
CREATE INDEX idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX idx_order_status_history_changed_at ON public.order_status_history(changed_at DESC);