-- Close an unauthenticated read of the whole recipe library.
--
-- public.recipes_full was created without security_invoker, so it executed with its
-- creator's privileges and bypassed the `recipes_read` policy on public.recipes — that
-- policy grants SELECT to `authenticated`, but the view answered anon requests too.
-- Verified against production before this migration: querying /rest/v1/recipes with only
-- the publishable key returned [], while /rest/v1/recipes_full returned recipe rows. The
-- publishable key ships inside the mobile bundle, so this was readable by anyone.
--
-- security_invoker makes the view run as the querying role, so the underlying table's RLS
-- applies normally. Nothing in the app or the edge functions selects from this view, so
-- there is no caller to update; it stays in place because it is part of the documented
-- schema and is cheaper to secure than to remove.

BEGIN;

ALTER VIEW public.recipes_full SET (security_invoker = on);

-- Belt and braces: the view has no reason to be reachable by unauthenticated callers even
-- if the invoker setting is ever lost in a future CREATE OR REPLACE.
REVOKE ALL ON public.recipes_full FROM anon;

COMMIT;
