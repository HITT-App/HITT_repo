-- Composite index to support time-windowed chat history queries.
-- Queries filter by conversation_id (equality) then order/filter by created_at.
-- The existing idx_messages_conversation_id index covers equality-only lookups;
-- this one covers the new .gte('created_at', cutoff) filter and ORDER BY.
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created
  ON public.messages(conversation_id, created_at DESC);
