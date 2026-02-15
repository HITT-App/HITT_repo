
-- Function to get user emails for admin panel (security definer to access auth.users)
CREATE OR REPLACE FUNCTION public.admin_get_user_emails()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id AS user_id, au.email::text
  FROM auth.users au
  WHERE public.has_role(auth.uid(), 'admin')
$$;
