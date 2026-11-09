-- Add can_access_pos column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS can_access_pos boolean DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.can_access_pos IS 'Whether this user can access the POS terminal. Only super_admin can modify this value.';