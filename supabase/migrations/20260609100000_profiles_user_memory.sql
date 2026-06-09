-- Add user_memory JSONB column to profiles.
-- Stores Jarvis-authored persistent facts about the user: goal summary, physique,
-- injuries, preferences, lifestyle context. Written by goal wizard, body scan,
-- and Jarvis update_memory tool. Read and injected as a synthetic assistant turn
-- on every AI coach request so Gemini treats it as its own prior recall.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_memory JSONB NOT NULL DEFAULT '{}';

-- Merges a single key into user_memory without overwriting the whole column.
-- Used by goal wizard, body scan, and the edge function's update_memory tool.
CREATE OR REPLACE FUNCTION public.upsert_user_memory_key(
  p_user_id UUID,
  p_key     TEXT,
  p_value   TEXT
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET user_memory = jsonb_set(
    COALESCE(user_memory, '{}'),
    ARRAY[p_key],
    to_jsonb(p_value)
  )
  WHERE user_id = p_user_id;
END;
$$;
