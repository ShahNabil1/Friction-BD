-- Update app_role enum to include customer and super_admin
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'customer';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Create email_templates table
CREATE TABLE IF NOT EXISTS public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates" ON public.email_templates FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();