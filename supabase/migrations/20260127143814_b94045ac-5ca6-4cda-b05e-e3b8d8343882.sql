-- Create return_notes table
CREATE TABLE IF NOT EXISTS public.return_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    note TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_by_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.return_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage return notes" ON public.return_notes FOR ALL USING (public.has_role(auth.uid(), 'admin'));