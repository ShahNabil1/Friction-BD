-- POS drafts for Hold/Resume in Manual Orders
CREATE TABLE IF NOT EXISTS public.pos_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  created_by uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_drafts_created_by ON public.pos_drafts(created_by);
CREATE INDEX IF NOT EXISTS idx_pos_drafts_status ON public.pos_drafts(status);

ALTER TABLE public.pos_drafts ENABLE ROW LEVEL SECURITY;

-- Admin-only access (POS staff are admins/moderators in this app)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'pos_drafts' AND policyname = 'Admins can manage POS drafts'
  ) THEN
    CREATE POLICY "Admins can manage POS drafts"
    ON public.pos_drafts
    FOR ALL
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
  END IF;
END $$;

-- updated_at trigger
DROP TRIGGER IF EXISTS update_pos_drafts_updated_at ON public.pos_drafts;
CREATE TRIGGER update_pos_drafts_updated_at
BEFORE UPDATE ON public.pos_drafts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();