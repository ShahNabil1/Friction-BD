-- Create admin notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'order_cancelled', 'stock_critical', 'large_stock_change'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  entity_type TEXT, -- 'order', 'product'
  entity_id TEXT,
  severity TEXT NOT NULL DEFAULT 'info', -- 'info', 'warning', 'critical'
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Only admins can view notifications
CREATE POLICY "Admins can view notifications"
ON public.admin_notifications
FOR SELECT
USING (public.is_admin(auth.uid()));

-- Only admins can insert notifications
CREATE POLICY "Admins can insert notifications"
ON public.admin_notifications
FOR INSERT
WITH CHECK (public.is_admin(auth.uid()));

-- Only super_admin can delete notifications
CREATE POLICY "Super admins can delete notifications"
ON public.admin_notifications
FOR DELETE
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins can mark as read
CREATE POLICY "Admins can update notifications"
ON public.admin_notifications
FOR UPDATE
USING (public.is_admin(auth.uid()));

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;