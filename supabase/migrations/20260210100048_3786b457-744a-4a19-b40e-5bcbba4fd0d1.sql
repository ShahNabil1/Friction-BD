INSERT INTO public.user_roles (user_id, role)
VALUES ('0fe70abc-43b7-4bee-a53f-1d52e6b68d49', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;