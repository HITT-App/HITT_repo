
-- 1. Reactions table
CREATE TABLE public.community_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE NOT NULL,
  reaction_type text NOT NULL DEFAULT 'heart',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.community_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view reactions"
  ON public.community_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can manage own reactions"
  ON public.community_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reactions"
  ON public.community_reactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
  ON public.community_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2. Add metadata column to notifications
ALTER TABLE public.community_notifications 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- 3. Trigger: create notification on friend request
CREATE OR REPLACE FUNCTION public.create_friend_request_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, metadata)
    VALUES (NEW.friend_id, NEW.user_id, 'friend_request', '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_request
  AFTER INSERT ON public.user_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friend_request_notification();

-- 4. Trigger: create notification on friend accept
CREATE OR REPLACE FUNCTION public.create_friend_accept_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, metadata)
    VALUES (NEW.user_id, NEW.friend_id, 'friend_accept', '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_friend_accept
  AFTER UPDATE ON public.user_friends
  FOR EACH ROW
  EXECUTE FUNCTION public.create_friend_accept_notification();

-- 5. Allow security definer functions to insert notifications (needed for triggers)
CREATE POLICY "System can insert notifications"
  ON public.community_notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_reactions;
