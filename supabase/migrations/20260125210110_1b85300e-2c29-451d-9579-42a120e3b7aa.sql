-- Add is_onboarded column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_onboarded boolean NOT NULL DEFAULT false;

-- Create activity_logs table for tracking staff actions
CREATE TABLE public.activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_name text NOT NULL,
  action_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create indexes for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_action_type ON public.activity_logs(action_type);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Admins can view and insert, only super_admin can delete
CREATE POLICY "Admins can view activity logs"
ON public.activity_logs FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Admins can insert activity logs"
ON public.activity_logs FOR INSERT
WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Only super admins can delete activity logs"
ON public.activity_logs FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));