-- Insert super_admin role for user with phone 8801949781709
INSERT INTO public.user_roles (user_id, role)
VALUES ('bb924b8a-1a90-43aa-aff6-2764b15a3cdb', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;