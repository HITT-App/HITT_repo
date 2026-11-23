-- community_profiles.posts_count and likes_received were created in 20260121235330 with no
-- trigger, so every profile showed "0 Posts" and 0 likes whatever it had. following_count was
-- also wrong where follows existed before the profile row (the follow trigger had no row to bump).
--
-- Counts are recomputed per user rather than incremented: a cascade delete of a post removes its
-- likes after the post is gone, so an increment trigger on likes can't find the author.

-- The three posts soft-deleted on 2026-07-02 under the old 30-day restore model. Nothing writes
-- deleted_at any more (instant hard delete since 20260703100000), so these were the only ones,
-- and the owner asked for them removed.
DELETE FROM public.community_posts WHERE deleted_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.refresh_community_profile_counts(p_user_id uuid)
RETURNS void AS $$
  UPDATE public.community_profiles cp SET
    posts_count = (SELECT count(*) FROM public.community_posts p
                   WHERE p.user_id = p_user_id AND p.deleted_at IS NULL),
    likes_received = (SELECT count(*) FROM public.community_likes l
                      JOIN public.community_posts p ON p.id = l.post_id
                      WHERE p.user_id = p_user_id AND p.deleted_at IS NULL),
    followers_count = (SELECT count(*) FROM public.community_follows f WHERE f.following_id = p_user_id),
    following_count = (SELECT count(*) FROM public.community_follows f WHERE f.follower_id = p_user_id)
  WHERE cp.user_id = p_user_id;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION public.refresh_community_profile_counts(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.community_posts_refresh_author_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM public.refresh_community_profile_counts(OLD.user_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') AND (TG_OP = 'INSERT' OR NEW.user_id IS DISTINCT FROM OLD.user_id) THEN
    PERFORM public.refresh_community_profile_counts(NEW.user_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS community_posts_author_counts ON public.community_posts;
CREATE TRIGGER community_posts_author_counts
AFTER INSERT OR DELETE OR UPDATE OF user_id, deleted_at ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.community_posts_refresh_author_counts();

CREATE OR REPLACE FUNCTION public.community_likes_refresh_author_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_post_id uuid := COALESCE(NEW.post_id, OLD.post_id);
  v_author uuid;
BEGIN
  IF v_post_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;
  SELECT user_id INTO v_author FROM public.community_posts WHERE id = v_post_id;
  IF v_author IS NOT NULL THEN
    PERFORM public.refresh_community_profile_counts(v_author);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS community_likes_author_counts ON public.community_likes;
CREATE TRIGGER community_likes_author_counts
AFTER INSERT OR DELETE ON public.community_likes
FOR EACH ROW EXECUTE FUNCTION public.community_likes_refresh_author_counts();

-- A profile created after its owner already posted, liked or followed starts with the real counts.
CREATE OR REPLACE FUNCTION public.community_profiles_init_counts()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.refresh_community_profile_counts(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS community_profiles_init_counts ON public.community_profiles;
CREATE TRIGGER community_profiles_init_counts
AFTER INSERT ON public.community_profiles
FOR EACH ROW EXECUTE FUNCTION public.community_profiles_init_counts();

SELECT public.refresh_community_profile_counts(user_id) FROM public.community_profiles;
