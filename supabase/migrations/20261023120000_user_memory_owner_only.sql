-- SEC-008 (2026-10-23)
--
-- profiles is readable by every signed-in user (community display names and avatars),
-- so Jarvis's memory (goal, physique, injuries...) on profiles.user_memory was too.
-- It moves to an owner-only table. A computed field keeps the old API: PostgREST
-- resolves `select=user_memory` and `select=*,user_memory` through public.user_memory(),
-- so ScheduleSetup and ai-coach (and every shipped build) work unchanged. Other users
-- now get '{}'.

CREATE TABLE IF NOT EXISTS public.user_memories (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  memory     jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- Read-only for the owner; writes go through upsert_user_memory_key
CREATE POLICY "Users can read their own memory"
  ON public.user_memories FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

REVOKE ALL ON public.user_memories FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_memories FROM authenticated;

INSERT INTO public.user_memories (user_id, memory)
SELECT p.user_id, p.user_memory
FROM public.profiles p
JOIN auth.users u ON u.id = p.user_id
WHERE p.user_memory IS NOT NULL AND p.user_memory <> '{}'::jsonb
ON CONFLICT (user_id) DO UPDATE SET memory = EXCLUDED.memory;

ALTER TABLE public.profiles DROP COLUMN user_memory;

CREATE OR REPLACE FUNCTION public.user_memory(p public.profiles)
RETURNS jsonb
  LANGUAGE sql
  STABLE
  SET search_path = public
AS $$
  SELECT coalesce((SELECT m.memory FROM public.user_memories m WHERE m.user_id = p.user_id), '{}'::jsonb)
$$;

CREATE OR REPLACE FUNCTION public.upsert_user_memory_key(
  p_user_id UUID,
  p_key     TEXT,
  p_value   TEXT
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- current_user is the function owner here; the "role" setting still holds the caller's role
  IF NOT (
    p_user_id = auth.uid()
    OR current_setting('role', true) = 'service_role'
    OR coalesce(auth.jwt() ->> 'role', '') = 'service_role'
  ) THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;

  IF p_key NOT IN ('goal', 'physique', 'injuries', 'preferences', 'lifestyle', 'notes') THEN
    RAISE EXCEPTION 'unknown memory key' USING ERRCODE = '22023';
  END IF;

  -- Same as before: only users with a profile row get memory
  INSERT INTO public.user_memories (user_id, memory, updated_at)
  SELECT p_user_id, jsonb_build_object(p_key, left(p_value, 4000)), now()
  WHERE EXISTS (SELECT 1 FROM public.profiles WHERE user_id = p_user_id)
  ON CONFLICT (user_id) DO UPDATE
    SET memory = jsonb_set(public.user_memories.memory, ARRAY[p_key], to_jsonb(left(p_value, 4000))),
        updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_user_memory_key(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_memory_key(UUID, TEXT, TEXT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
