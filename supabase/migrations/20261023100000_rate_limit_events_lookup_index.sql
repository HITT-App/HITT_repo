-- SEC-006 (2026-10-23): redeem-garmin-pairing counts recent failures by endpoint and IP hash
CREATE INDEX IF NOT EXISTS rate_limit_events_endpoint_created_idx
  ON public.rate_limit_events (endpoint, created_at DESC);
