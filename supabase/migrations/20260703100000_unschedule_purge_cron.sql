-- Undo the 30-day purge cron. We pivoted to instant hard-delete in
-- delete-account, so there's no soft-deleted state that needs a
-- scheduled cleanup any more. The deleted_at columns are left in place
-- (harmless) in case we ever want the restore-window model back.

SELECT cron.unschedule('purge_deleted_accounts_daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'purge_deleted_accounts_daily'
);

-- Vault entries are kept for now — they're inert without a job to
-- consume them and can be cleared manually in Studio if desired.
