-- Reportable AI-generated content (Google Play Generative AI policy).
--
-- Play requires an in-app way to report offensive AI output. The coach is the only
-- conversational AI surface, so 'ai_message' joins the existing content_reports
-- pipeline rather than getting a parallel one.
--
-- Two differences from user-generated content:
--   * content_snapshot — a post is still there when a moderator opens the report;
--     an AI reply is private to one user and can't be re-read, so the report has to
--     carry the text with it or it's unreviewable.
--   * no auto-hide — the trigger's ELSIF chain has no 'ai_message' branch and must
--     not gain one. These conversations are 1:1, so there is nobody to hide them
--     from; the remedy is a prompt change, not removal.

ALTER TABLE public.content_reports
  DROP CONSTRAINT IF EXISTS content_reports_content_type_check;

ALTER TABLE public.content_reports
  ADD CONSTRAINT content_reports_content_type_check
  CHECK (content_type IN ('post','comment','story','dm','chatroom','profile','ai_message'));

ALTER TABLE public.content_reports
  ADD COLUMN IF NOT EXISTS content_snapshot text;

COMMENT ON COLUMN public.content_reports.content_snapshot IS
  'Verbatim copy of the reported content, captured at report time. Set for ai_message, where the original is private to the reporter and cannot be retrieved later.';
