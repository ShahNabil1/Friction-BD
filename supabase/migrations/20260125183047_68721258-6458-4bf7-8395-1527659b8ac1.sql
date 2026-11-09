-- Add permissions for the Reviews page to admin roles
INSERT INTO public.permissions (role, page_path, can_access)
VALUES 
  ('super_admin', '/admin/reviews', true),
  ('admin', '/admin/reviews', true),
  ('moderator', '/admin/reviews', true)
ON CONFLICT DO NOTHING;