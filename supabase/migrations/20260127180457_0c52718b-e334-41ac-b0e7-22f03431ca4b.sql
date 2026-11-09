-- Insert profiles for existing auth users that don't have profiles
INSERT INTO public.profiles (id, user_id, phone, full_name, created_at, updated_at)
SELECT 
  id,
  id as user_id, 
  phone,
  COALESCE(raw_user_meta_data->>'full_name', 'User ' || SUBSTRING(phone FROM 7 FOR 4)) as full_name,
  created_at,
  now()
FROM auth.users
WHERE id NOT IN (SELECT COALESCE(user_id, id) FROM public.profiles)
ON CONFLICT (id) DO NOTHING;

-- Create a function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, user_id, phone, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.id,
    NEW.phone,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger to auto-create profile on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();