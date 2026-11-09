-- Create return_notes table for internal resolution notes on orders
CREATE TABLE public.return_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.return_notes ENABLE ROW LEVEL SECURITY;

-- Only admins can manage return notes
CREATE POLICY "Admins can view return notes"
  ON public.return_notes FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert return notes"
  ON public.return_notes FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update return notes"
  ON public.return_notes FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete return notes"
  ON public.return_notes FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_return_notes_updated_at
  BEFORE UPDATE ON public.return_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert permissions for /admin/returns page
INSERT INTO public.permissions (page_path, role, can_access) VALUES
  ('/admin/returns', 'super_admin', true),
  ('/admin/returns', 'admin', true),
  ('/admin/returns', 'moderator', true)
ON CONFLICT DO NOTHING;