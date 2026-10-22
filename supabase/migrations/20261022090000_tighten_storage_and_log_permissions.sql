-- SEC-001 / SEC-002 (2026-10-22)
--
-- activity-images: the original 2026-03-12 read policy was never dropped when the
-- bucket went private (20260422202917), so it still granted reads to everyone.
-- "Owners can read their private media" keeps owner access.
DROP POLICY IF EXISTS "Public read access for activity images" ON storage.objects;

-- Security log tables: only edge functions write these, and they use the service
-- role, which bypasses RLS. The insert/update policies for app users served no caller.
DROP POLICY IF EXISTS "Service can insert security events" ON public.security_events;
DROP POLICY IF EXISTS "Service can insert audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Service can insert rate limit events" ON public.rate_limit_events;
DROP POLICY IF EXISTS "Service can update rate limit events" ON public.rate_limit_events;
DROP POLICY IF EXISTS "Service can insert data access logs" ON public.data_access_logs;

-- No app client calls these; Supabase grants EXECUTE to anon explicitly, so name it
REVOKE EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_security_event(TEXT, TEXT, UUID, TEXT, TEXT, JSONB) TO service_role;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;
