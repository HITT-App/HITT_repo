/**
 * Chat history retention window (hours).
 * Messages older than this are hidden from the user's chat view AND
 * excluded from the AI prompt context, then physically deleted on next write.
 * To extend retention: change this value AND the matching copy in
 * supabase/functions/_shared/constants.ts — keep them in sync.
 */
export const CHAT_RETENTION_HOURS = 24;
