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
  last_workout_sync_at timestamptz,
  workout_import_consented_at timestamptz,
  -- Here, not on profiles, because every signed-in user can read profiles.
  ai_consent_at timestamptz,
  ai_consent_withdrawn_at timestamptz,
  -- Earliest consent whose AI output hasn't been purged, and memory as it stood then.
  ai_purge_from timestamptz,
  ai_memory_snapshot jsonb
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
    CHECK (sync_status IN ('pending', 'sent', 'too_long', 'unsupported', 'failed')),
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
  ADD COLUMN garmin_device_name text,
  ADD COLUMN garmin_summary_id text;
CREATE UNIQUE INDEX activity_logs_garmin_activity
  ON public.activity_logs (user_id, garmin_activity_id)
  WHERE garmin_activity_id IS NOT NULL;

CREATE INDEX activity_logs_garmin_summary
  ON public.activity_logs (user_id, garmin_summary_id)
  WHERE garmin_summary_id IS NOT NULL;

-- Kept apart from activity_logs so no AI path, share card or select("*") can
-- pick up GPS. Keyed by Garmin's ID because details can arrive before the activity.
CREATE TABLE public.garmin_activity_details (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  garmin_activity_id text NOT NULL,
  route jsonb NOT NULL DEFAULT '[]',
  heart_rate jsonb NOT NULL DEFAULT '[]',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, garmin_activity_id)
);
ALTER TABLE public.garmin_activity_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read their own Garmin activity details"
  ON public.garmin_activity_details FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.app_settings (key, value)
VALUES ('ff_garmin_cloud', 'off'), ('ff_garmin_ai', 'off')
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

-- One night or day shows one source, with Garmin preferred over Apple Health (B14).
-- A trigger, because shipped app versions write these rows directly. Hand-logged rows stay.
CREATE FUNCTION public.prefer_garmin_sleep()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.source_platform = 'garmin_api' THEN
    DELETE FROM public.sleep_logs
    WHERE user_id = NEW.user_id
      AND sleep_date = NEW.sleep_date
      AND source_platform IS NOT NULL
      AND source_platform <> 'garmin_api';
  ELSIF NEW.source_platform IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.sleep_logs
    WHERE user_id = NEW.user_id AND sleep_date = NEW.sleep_date AND source_platform = 'garmin_api'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER sleep_logs_prefer_garmin
  BEFORE INSERT ON public.sleep_logs
  FOR EACH ROW EXECUTE FUNCTION public.prefer_garmin_sleep();

CREATE FUNCTION public.prefer_garmin_metric()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.metric_type NOT IN ('steps', 'resting_heart_rate') THEN
    RETURN NEW;
  END IF;
  IF NEW.source_platform = 'garmin_api' THEN
    DELETE FROM public.health_metrics
    WHERE user_id = NEW.user_id
      AND metric_type = NEW.metric_type
      AND recorded_at::date = NEW.recorded_at::date
      AND (notes = 'watch_sync' OR (source_platform IS NOT NULL AND source_platform <> 'garmin_api'));
  ELSIF (NEW.source_platform IS NOT NULL OR NEW.notes = 'watch_sync') AND EXISTS (
    SELECT 1 FROM public.health_metrics
    WHERE user_id = NEW.user_id
      AND metric_type = NEW.metric_type
      AND recorded_at::date = NEW.recorded_at::date
      AND source_platform = 'garmin_api'
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER health_metrics_prefer_garmin
  BEFORE INSERT ON public.health_metrics
  FOR EACH ROW EXECUTE FUNCTION public.prefer_garmin_metric();

-- Users whose schedule changed. A trigger, because shipped app versions write schedules directly.
CREATE TABLE public.garmin_sync_dirty (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  marked_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.garmin_sync_dirty ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.mark_garmin_sync_dirty()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected uuid := COALESCE(NEW.user_id, OLD.user_id);
BEGIN
  INSERT INTO public.garmin_sync_dirty (user_id)
  SELECT affected
  WHERE EXISTS (
    SELECT 1 FROM public.garmin_connections
    WHERE user_id = affected AND workout_import_consented_at IS NOT NULL AND status = 'active'
  )
  ON CONFLICT (user_id) DO UPDATE SET marked_at = now();
  RETURN NULL;
END;
$$;
CREATE TRIGGER scheduled_workouts_garmin_dirty
  AFTER INSERT OR UPDATE OR DELETE ON public.scheduled_workouts
  FOR EACH ROW EXECUTE FUNCTION public.mark_garmin_sync_dirty();
CREATE TRIGGER plan_items_garmin_dirty
  AFTER INSERT OR UPDATE OR DELETE ON public.user_workout_plan_items
  FOR EACH ROW EXECUTE FUNCTION public.mark_garmin_sync_dirty();

SELECT cron.unschedule('garmin_sync_workouts_5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'garmin_sync_workouts_5min');
SELECT cron.schedule(
  'garmin_sync_workouts_5min', '*/5 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-sync-workouts',
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
