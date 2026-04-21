-- HIIT Score nightly cron — run once in the Supabase SQL editor to enable.
--
-- Computes fresh scores at 03:00 UTC for every user active in the last 7 days.
-- Client-side compute (on home load) already covers active users; this catches
-- the rest so the trend chart doesn't gap.
--
-- Prereqs (one-time, in Supabase dashboard → Database → Extensions):
--   - pg_cron
--   - pg_net
--
-- Before running, replace the two placeholders at the bottom:
--   - <PROJECT_REF>             your Supabase project ref (iglwpwdnwztutbaybhfq)
--   - <SERVICE_ROLE_KEY>        your service role key (Supabase dashboard → Project Settings → API)
--
-- Storing the key in a cron SQL is acceptable for managed Supabase; for
-- stronger hygiene, put it in vault.secrets and reference via vault.decrypt.

SELECT cron.schedule(
  'compute-hiit-score-nightly',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/compute-hiit-score',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := jsonb_build_object('batch', true)
  );
  $$
);

-- To remove:
--   SELECT cron.unschedule('compute-hiit-score-nightly');
