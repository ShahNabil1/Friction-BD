-- Update shahriarnabil94@gmail.com to super_admin role
UPDATE public.user_roles 
SET role = 'super_admin', updated_at = now()
WHERE user_id = '7f7e6342-ff04-4244-9134-53056a751a6e';