-- Community Notifications table
CREATE TABLE public.community_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  type TEXT NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.community_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.community_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.community_notifications FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
ON public.community_notifications FOR DELETE
USING (auth.uid() = user_id);

-- Community Conversations table for DMs
CREATE TABLE public.community_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID NOT NULL,
  participant_2 UUID NOT NULL,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(participant_1, participant_2)
);

-- Enable RLS
ALTER TABLE public.community_conversations ENABLE ROW LEVEL SECURITY;

-- Policies for conversations
CREATE POLICY "Users can view their own conversations"
ON public.community_conversations FOR SELECT
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can create conversations"
ON public.community_conversations FOR INSERT
WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

CREATE POLICY "Users can update their own conversations"
ON public.community_conversations FOR UPDATE
USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Community Messages table
CREATE TABLE public.community_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.community_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.community_messages ENABLE ROW LEVEL SECURITY;

-- Policies for messages
CREATE POLICY "Users can view messages in their conversations"
ON public.community_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.community_conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can send messages in their conversations"
ON public.community_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.community_conversations c
    WHERE c.id = conversation_id
    AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
  )
);

CREATE POLICY "Users can update their own messages"
ON public.community_messages FOR UPDATE
USING (auth.uid() = sender_id);

-- Community Blocks table
CREATE TABLE public.community_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL,
  blocked_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

-- Enable RLS
ALTER TABLE public.community_blocks ENABLE ROW LEVEL SECURITY;

-- Policies for blocks
CREATE POLICY "Users can view their own blocks"
ON public.community_blocks FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can create blocks"
ON public.community_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can remove their own blocks"
ON public.community_blocks FOR DELETE
USING (auth.uid() = blocker_id);

-- Community Saved Posts table
CREATE TABLE public.community_saved_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, post_id)
);

-- Enable RLS
ALTER TABLE public.community_saved_posts ENABLE ROW LEVEL SECURITY;

-- Policies for saved posts
CREATE POLICY "Users can view their own saved posts"
ON public.community_saved_posts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can save posts"
ON public.community_saved_posts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unsave posts"
ON public.community_saved_posts FOR DELETE
USING (auth.uid() = user_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_notifications;

-- Trigger function for creating notifications on likes
CREATE OR REPLACE FUNCTION public.create_like_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't notify if user likes their own post
  IF NEW.post_id IS NOT NULL THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, post_id)
    SELECT p.user_id, NEW.user_id, 'like', NEW.post_id
    FROM public.community_posts p
    WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  END IF;
  
  IF NEW.comment_id IS NOT NULL THEN
    INSERT INTO public.community_notifications (user_id, actor_id, type, comment_id)
    SELECT c.user_id, NEW.user_id, 'comment_like', NEW.comment_id
    FROM public.community_comments c
    WHERE c.id = NEW.comment_id AND c.user_id != NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_like_create_notification
AFTER INSERT ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.create_like_notification();

-- Trigger function for creating notifications on follows
CREATE OR REPLACE FUNCTION public.create_follow_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.community_notifications (user_id, actor_id, type)
  VALUES (NEW.following_id, NEW.follower_id, 'follow');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_follow_create_notification
AFTER INSERT ON public.community_follows
FOR EACH ROW EXECUTE FUNCTION public.create_follow_notification();

-- Trigger function for creating notifications on comments
CREATE OR REPLACE FUNCTION public.create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.community_notifications (user_id, actor_id, type, post_id, comment_id)
  SELECT p.user_id, NEW.user_id, 'comment', NEW.post_id, NEW.id
  FROM public.community_posts p
  WHERE p.id = NEW.post_id AND p.user_id != NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_comment_create_notification
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.create_comment_notification();

-- Update conversation last_message_at on new message
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.community_conversations
  SET last_message_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_message_update_conversation
AFTER INSERT ON public.community_messages
FOR EACH ROW EXECUTE FUNCTION public.update_conversation_timestamp();