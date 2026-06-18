-- Update handle_new_user to assign a random preset avatar to new users.
-- Avatars are served as static web assets at /avatars/avatar-NN.jpg (12 total).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  avatar_index INT;
  preset_avatar_url TEXT;
BEGIN
  avatar_index := floor(random() * 12 + 1)::INT;
  preset_avatar_url := '/avatars/avatar-' || lpad(avatar_index::TEXT, 2, '0') || '.jpg';

  INSERT INTO public.profiles (user_id, display_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'display_name',
    preset_avatar_url
  );
  RETURN new;
END;
$$;
