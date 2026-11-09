-- Add missing columns to user_addresses
ALTER TABLE public.user_addresses ADD COLUMN IF NOT EXISTS road_no TEXT;

-- Add missing columns to pos_drafts
ALTER TABLE public.pos_drafts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE public.pos_drafts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.pos_drafts ADD COLUMN IF NOT EXISTS payload JSONB;