-- Create community_posts table
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'text',
  category TEXT NOT NULL DEFAULT 'workout',
  tags TEXT[] DEFAULT '{}',
  image_url TEXT,
  poll_options JSONB,
  before_image_url TEXT,
  after_image_url TEXT,
  workout_data JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_comments table
CREATE TABLE IF NOT EXISTS public.community_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create community_likes table
CREATE TABLE IF NOT EXISTS public.community_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  post_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.community_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT like_target CHECK (
    (post_id IS NOT NULL AND comment_id IS NULL) OR 
    (post_id IS NULL AND comment_id IS NOT NULL)
  )
);

-- Add unique constraints separately to handle IF NOT EXISTS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_likes_user_id_post_id_key') THEN
    ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_user_id_post_id_key UNIQUE(user_id, post_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_likes_user_id_comment_id_key') THEN
    ALTER TABLE public.community_likes ADD CONSTRAINT community_likes_user_id_comment_id_key UNIQUE(user_id, comment_id);
  END IF;
END $$;

-- Create community_follows table
CREATE TABLE IF NOT EXISTS public.community_follows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id UUID NOT NULL,
  following_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT no_self_follow CHECK (follower_id != following_id)
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_follows_follower_id_following_id_key') THEN
    ALTER TABLE public.community_follows ADD CONSTRAINT community_follows_follower_id_following_id_key UNIQUE(follower_id, following_id);
  END IF;
END $$;

-- Create community_profiles table
CREATE TABLE IF NOT EXISTS public.community_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  is_private BOOLEAN DEFAULT false,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS public.community_poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'community_poll_votes_post_id_user_id_key') THEN
    ALTER TABLE public.community_poll_votes ADD CONSTRAINT community_poll_votes_post_id_user_id_key UNIQUE(post_id, user_id);
  END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_poll_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view public posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.community_posts;

DROP POLICY IF EXISTS "Anyone can view comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.community_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.community_comments;

DROP POLICY IF EXISTS "Anyone can view likes" ON public.community_likes;
DROP POLICY IF EXISTS "Users can create likes" ON public.community_likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON public.community_likes;

DROP POLICY IF EXISTS "Anyone can view follows" ON public.community_follows;
DROP POLICY IF EXISTS "Users can follow others" ON public.community_follows;
DROP POLICY IF EXISTS "Users can unfollow" ON public.community_follows;

DROP POLICY IF EXISTS "Anyone can view profiles" ON public.community_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.community_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.community_profiles;

DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.community_poll_votes;
DROP POLICY IF EXISTS "Users can vote" ON public.community_poll_votes;

-- RLS Policies for community_posts
CREATE POLICY "Anyone can view public posts" ON public.community_posts FOR SELECT USING (true);
CREATE POLICY "Users can create their own posts" ON public.community_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own posts" ON public.community_posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own posts" ON public.community_posts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for community_comments
CREATE POLICY "Anyone can view comments" ON public.community_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.community_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own comments" ON public.community_comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.community_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for community_likes
CREATE POLICY "Anyone can view likes" ON public.community_likes FOR SELECT USING (true);
CREATE POLICY "Users can create likes" ON public.community_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own likes" ON public.community_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for community_follows
CREATE POLICY "Anyone can view follows" ON public.community_follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others" ON public.community_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.community_follows FOR DELETE USING (auth.uid() = follower_id);

-- RLS Policies for community_profiles
CREATE POLICY "Anyone can view profiles" ON public.community_profiles FOR SELECT USING (true);
CREATE POLICY "Users can create their own profile" ON public.community_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.community_profiles FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for poll_votes
CREATE POLICY "Anyone can view poll votes" ON public.community_poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.community_poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create trigger functions
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_id IS NOT NULL THEN
    UPDATE public.community_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.post_id IS NOT NULL THEN
    UPDATE public.community_posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_follow_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_profiles SET following_count = following_count + 1 WHERE user_id = NEW.follower_id;
    UPDATE public.community_profiles SET followers_count = followers_count + 1 WHERE user_id = NEW.following_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_profiles SET following_count = following_count - 1 WHERE user_id = OLD.follower_id;
    UPDATE public.community_profiles SET followers_count = followers_count - 1 WHERE user_id = OLD.following_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing triggers if any
DROP TRIGGER IF EXISTS update_post_likes_insert ON public.community_likes;
DROP TRIGGER IF EXISTS update_post_likes_delete ON public.community_likes;
DROP TRIGGER IF EXISTS update_comments_insert ON public.community_comments;
DROP TRIGGER IF EXISTS update_comments_delete ON public.community_comments;
DROP TRIGGER IF EXISTS update_follows_insert ON public.community_follows;
DROP TRIGGER IF EXISTS update_follows_delete ON public.community_follows;

-- Create triggers
CREATE TRIGGER update_post_likes_insert
AFTER INSERT ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER update_post_likes_delete
AFTER DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.update_post_likes_count();

CREATE TRIGGER update_comments_insert
AFTER INSERT ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER update_comments_delete
AFTER DELETE ON public.community_comments
FOR EACH ROW EXECUTE FUNCTION public.update_post_comments_count();

CREATE TRIGGER update_follows_insert
AFTER INSERT ON public.community_follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

CREATE TRIGGER update_follows_delete
AFTER DELETE ON public.community_follows
FOR EACH ROW EXECUTE FUNCTION public.update_follow_counts();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_likes;