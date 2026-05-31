/**
 * Chat history retention window (hours).
 * Messages older than this are excluded from AI prompt context and deleted on next write.
 * Keep in sync with src/lib/constants.ts on the client side.
 */
export const CHAT_RETENTION_HOURS = 24;
