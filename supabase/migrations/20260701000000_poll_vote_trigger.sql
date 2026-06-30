-- Trigger to keep community_posts.poll_options.votes[i] in sync with rows in
-- community_poll_votes. Runs SECURITY DEFINER so it can update any user's
-- post (RLS on community_posts otherwise blocks cross-user updates).

CREATE OR REPLACE FUNCTION public.apply_poll_vote()
RETURNS TRIGGER AS $$
DECLARE
  current_votes JSONB;
  votes_array JSONB;
  old_count INT;
BEGIN
  SELECT poll_options INTO current_votes
  FROM public.community_posts
  WHERE id = NEW.post_id;

  IF current_votes IS NULL THEN
    RETURN NEW;
  END IF;

  votes_array := COALESCE(current_votes->'votes', '[]'::jsonb);
  old_count := COALESCE((votes_array->>NEW.option_index)::int, 0);

  UPDATE public.community_posts
  SET poll_options = jsonb_set(
    current_votes,
    ARRAY['votes', NEW.option_index::text],
    to_jsonb(old_count + 1)
  )
  WHERE id = NEW.post_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS apply_poll_vote_insert ON public.community_poll_votes;
CREATE TRIGGER apply_poll_vote_insert
AFTER INSERT ON public.community_poll_votes
FOR EACH ROW EXECUTE FUNCTION public.apply_poll_vote();
