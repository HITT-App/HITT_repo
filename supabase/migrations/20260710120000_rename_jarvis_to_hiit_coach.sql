-- Rename user-visible AI-coach conversation title from "Jarvis" to
-- "HIIT Coach". Every existing user has exactly one such conversation
-- (useAI.ts:99-115 upserts singleton per user_id + title). The client
-- also has a lazy rename fallback so a user who opens the app before
-- this runs still gets renamed on their first session.
--
-- Scope: user-visible strings only. Internal event names
-- (hitt:open-jarvis, jarvis_onboarding_suppressed sessionStorage key,
-- JarvisMode component name, etc.) stay unchanged.

UPDATE public.conversations
   SET title = 'HIIT Coach'
 WHERE title = 'Jarvis';
