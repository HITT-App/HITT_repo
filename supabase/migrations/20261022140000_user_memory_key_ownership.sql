-- SEC-003 (2026-10-22)
--
-- upsert_user_memory_key runs as SECURITY DEFINER, so it must check the caller itself.
-- App callers (GoalSetup, BodyScan) pass their own id; ai-coach calls it with the
-- service role. Same signature, so no app build is needed. Callers ignore the
-- returned error, so a rejected write is silent, as before.
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

  UPDATE public.profiles
  SET user_memory = jsonb_set(
    COALESCE(user_memory, '{}'),
    ARRAY[p_key],
    to_jsonb(left(p_value, 4000))
  )
  WHERE user_id = p_user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_user_memory_key(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.upsert_user_memory_key(UUID, TEXT, TEXT) TO authenticated, service_role;
