-- Garmin Connect API foundation. Everything stays dark until ff_garmin_cloud is 'on'
-- or the user is in garmin_testers.

CREATE TABLE public.garmin_connections (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  garmin_user_id text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  permissions_changed_at bigint,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'permission_off', 'needs_reconnect', 'disconnected')),
  connected_at timestamptz NOT NULL DEFAULT now(),
  disconnected_at timestamptz,
  disconnect_reason text,
  last_activity_at timestamptz,
  last_workout_pushed_at timestamptz,
  workout_import_consented_at timestamptz
);
CREATE UNIQUE INDEX garmin_connections_one_live_link
  ON public.garmin_connections (garmin_user_id)
  WHERE status <> 'disconnected';
ALTER TABLE public.garmin_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own Garmin connection"
  ON public.garmin_connections FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- No policies on the tables below: service role only.
CREATE TABLE public.garmin_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  refresh_lock_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garmin_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.garmin_oauth_states (
  state text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_verifier text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
ALTER TABLE public.garmin_oauth_states ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.garmin_oauth_results (
  result_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garmin_user_id text NOT NULL,
  permissions text[] NOT NULL DEFAULT '{}',
  access_token_enc text NOT NULL,
  refresh_token_enc text NOT NULL,
  access_expires_at timestamptz NOT NULL,
  refresh_expires_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);
ALTER TABLE public.garmin_oauth_results ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.garmin_testers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
ALTER TABLE public.garmin_testers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.garmin_webhook_inbox (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  summary_type text,
  raw_body text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  claimed_at timestamptz,
  attempts integer NOT NULL DEFAULT 0,
  last_error text
);
CREATE INDEX garmin_webhook_inbox_unprocessed
  ON public.garmin_webhook_inbox (received_at)
  WHERE processed_at IS NULL;
ALTER TABLE public.garmin_webhook_inbox ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.garmin_workout_links (
  scheduled_workout_id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garmin_workout_id bigint,
  garmin_schedule_id bigint,
  content_hash text,
  sync_status text NOT NULL DEFAULT 'pending'
    CHECK (sync_status IN ('pending', 'sent', 'too_long', 'failed')),
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX garmin_workout_links_user ON public.garmin_workout_links (user_id);
ALTER TABLE public.garmin_workout_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own Garmin workout links"
  ON public.garmin_workout_links FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Merges can leave Garmin values in a row owned by another source, so these
-- columns, not source_platform, decide what counts as Garmin data.
ALTER TABLE public.activity_logs
  ADD COLUMN garmin_activity_id text,
  ADD COLUMN garmin_device_name text;
CREATE UNIQUE INDEX activity_logs_garmin_activity
  ON public.activity_logs (user_id, garmin_activity_id)
  WHERE garmin_activity_id IS NOT NULL;

ALTER TABLE public.profiles
  ADD COLUMN garmin_ai_consent_at timestamptz,
  ADD COLUMN garmin_ai_consent_withdrawn_at timestamptz;

INSERT INTO public.app_settings (key, value)
VALUES ('ff_garmin_cloud', 'off')
ON CONFLICT (key) DO NOTHING;

-- SKIP LOCKED plus a lease, so overlapping cron runs never take the same batch.
CREATE FUNCTION public.claim_garmin_inbox(batch_size integer, max_attempts integer, lease_seconds integer)
RETURNS SETOF public.garmin_webhook_inbox
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.garmin_webhook_inbox
  SET claimed_at = now(), attempts = attempts + 1
  WHERE id IN (
    SELECT id FROM public.garmin_webhook_inbox
    WHERE processed_at IS NULL
      AND attempts < max_attempts
      AND (claimed_at IS NULL OR claimed_at < now() - make_interval(secs => lease_seconds))
    ORDER BY received_at
    LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_garmin_inbox(integer, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_garmin_inbox(integer, integer, integer) TO service_role;

SELECT cron.unschedule('garmin_process_inbox_1min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'garmin_process_inbox_1min');
SELECT cron.schedule(
  'garmin_process_inbox_1min', '* * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-process-inbox',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || secret.decrypted_secret
    ),
    body := '{}'::jsonb
  )
  FROM vault.decrypted_secrets AS secret
  WHERE secret.name = 'garmin_cron_secret';
  $cron$
);
