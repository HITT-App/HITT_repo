-- notify-user's CATEGORY_COLUMN maps 'social' → social_notifications
-- and 'admin' → admin_notifications, but neither column existed on
-- notification_preferences. Every push in those categories silently
-- short-circuited on "user preference disabled" (undefined === false-y)
-- and returned without sending.
--
-- Add both columns with sane defaults (opt-in for social, opt-in for
-- admin — matches the general "quiet by default" posture of the app).

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS social_notifications BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS admin_notifications BOOLEAN NOT NULL DEFAULT true;
