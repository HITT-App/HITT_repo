-- One-shot cleanup: remove residue Garmin rows from the QA test account.
-- The test account (hitt.qa.test@gmail.com) picked up Garmin-attributed
-- HealthKit workouts during earlier CIQ testing on a phone that had Garmin
-- Connect Mobile installed. Those rows persist across device changes since
-- activity_logs are keyed by user_id, causing "Garmin" to show up in
-- Connected Devices on the test account even when the tester has no
-- Garmin watch.
--
-- Idempotent: runs once, subsequent applications match zero rows.

DELETE FROM public.activity_logs
WHERE source_platform = 'garmin'
  AND user_id = (
    SELECT id FROM auth.users WHERE email = 'hitt.qa.test@gmail.com' LIMIT 1
  );

-- Also drop any lingering Garmin-attributed health_metrics for the test
-- account (steps/HR that came in alongside the workouts).
DELETE FROM public.health_metrics
WHERE source_platform = 'garmin'
  AND user_id = (
    SELECT id FROM auth.users WHERE email = 'hitt.qa.test@gmail.com' LIMIT 1
  );
