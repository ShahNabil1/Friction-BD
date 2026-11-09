-- Ensure Courier page is visible in admin sidebar for admin roles
INSERT INTO public.permissions (page_path, role, can_access)
SELECT v.page_path, v.role, v.can_access
FROM (
  VALUES
    ('/admin/courier', 'super_admin'::public.app_role, true),
    ('/admin/courier', 'admin'::public.app_role, true),
    ('/admin/courier', 'moderator'::public.app_role, true)
) AS v(page_path, role, can_access)
WHERE NOT EXISTS (
  SELECT 1
  FROM public.permissions p
  WHERE p.page_path = v.page_path
    AND p.role = v.role
);
