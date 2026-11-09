-- Create expenses table for POS expense management
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  receipt_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_by_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policy: Staff can view expenses for their outlet
CREATE POLICY "Staff can view outlet expenses"
ON public.expenses
FOR SELECT
USING (
  (outlet_id IN (
    SELECT profiles.assigned_outlet_id
    FROM profiles
    WHERE profiles.id = auth.uid()
  ))
  OR has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Policy: POS staff can insert expenses for their outlet
CREATE POLICY "POS staff can insert expenses"
ON public.expenses
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
  OR (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.can_access_pos = true
    )
    AND outlet_id IN (
      SELECT profiles.assigned_outlet_id
      FROM profiles
      WHERE profiles.id = auth.uid()
    )
  )
);

-- Policy: Admins can manage all expenses
CREATE POLICY "Admins can manage expenses"
ON public.expenses
FOR ALL
USING (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin')
  OR has_role(auth.uid(), 'admin')
);

-- Add index for faster queries
CREATE INDEX idx_expenses_outlet_id ON public.expenses(outlet_id);
CREATE INDEX idx_expenses_created_at ON public.expenses(created_at DESC);

-- Add comment
COMMENT ON TABLE public.expenses IS 'POS expense records with receipt uploads';