-- Schedule the 30-day account purge to run daily at 03:15 UTC.
-- Requires pg_cron + pg_net (both available on Supabase's paid tier).
-- The PURGE_CRON_SECRET and PURGE_ENDPOINT are stored in Supabase
-- Vault so the migration file itself never carries live credentials.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Vault entries (create/rotate via Supabase Studio → Project Settings →
-- Vault). Values are read at cron-fire time, not at migration time.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'purge_cron_secret') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'purge_cron_secret',
      'HMAC secret required by the purge-deleted-accounts edge function');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets WHERE name = 'purge_endpoint_url') THEN
    PERFORM vault.create_secret('__set_via_supabase_studio__', 'purge_endpoint_url',
      'Fully-qualified https URL of the purge-deleted-accounts edge function');
  END IF;
END $$;

-- Drop any prior schedule with the same name so this migration is
-- idempotent on re-run.
SELECT cron.unschedule('purge_deleted_accounts_daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'purge_deleted_accounts_daily');

-- 03:15 UTC every day — off-peak, before the daily briefing job.
SELECT cron.schedule(
  'purge_deleted_accounts_daily',
  '15 3 * * *',
  $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'purge_endpoint_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization',
      'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'purge_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
