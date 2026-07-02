-- Pairing flow for the HITT Connect IQ app.
--
-- Phone (Settings → Wearables → Pair Garmin Watch) POSTs to
-- create-garmin-pairing → we return a 6-digit code with a 5-minute TTL.
-- The user types that code on the watch → watch POSTs it to
-- redeem-garmin-pairing → we validate + mint a scoped JWT for the watch.
--
-- Storage rules:
--   - code_hash: SHA-256 of the plaintext code so a DB dump doesn't leak
--     the live code. (Codes are only 6 digits so brute-force finding them
--     from the hash is trivial for an attacker with DB access, but the
--     TTL is short and the code is dead after redemption or 5 minutes.
--     Hashing is defence-in-depth against casual leaks.)
--   - attempts: failed redemptions increment this. At 5, the code is
--     considered burnt and no longer redeemable — mitigates brute-force
--     of the 10^6 code space.
--   - redeemed_at: set on first successful redemption; further attempts
--     with the same code fail. Row kept for audit.
--   - revoked_at: set by the phone to nuke a paired device (lost watch).
--     Any subsequent push from that device's JWT is rejected server-side
--     by cross-checking the pairing_id inside the JWT.

CREATE TABLE IF NOT EXISTS public.garmin_pairings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code_hash     text NOT NULL,
  expires_at    timestamptz NOT NULL,
  attempts      int  NOT NULL DEFAULT 0,
  redeemed_at   timestamptz,
  revoked_at    timestamptz,
  device_label  text,                             -- e.g. "fenix 7"; watch sends on redeem
  last_seen_at  timestamptz,                      -- updated on every push
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Only one live (unexpired, unredeemed, unrevoked) pairing per user at a
-- time. Prevents a flood of pending codes if the user opens the pair sheet
-- repeatedly.
CREATE UNIQUE INDEX IF NOT EXISTS garmin_pairings_live_per_user
  ON public.garmin_pairings(user_id)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

-- Fast lookup by hash for redemption.
CREATE INDEX IF NOT EXISTS garmin_pairings_code_hash_idx
  ON public.garmin_pairings(code_hash)
  WHERE redeemed_at IS NULL AND revoked_at IS NULL;

ALTER TABLE public.garmin_pairings ENABLE ROW LEVEL SECURITY;

-- Users can see their own pairings (Settings shows "Paired watches" list).
CREATE POLICY "users_see_own_pairings"
  ON public.garmin_pairings
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can revoke their own pairings (Settings → Unpair button).
CREATE POLICY "users_revoke_own_pairings"
  ON public.garmin_pairings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- INSERT and initial UPDATE (redeem) go through service-role edge
-- functions only — no client-side RLS for those paths.

COMMENT ON TABLE public.garmin_pairings IS
  'Pairing records for the HITT Connect IQ app. Phone creates, watch redeems.';
COMMENT ON COLUMN public.garmin_pairings.code_hash IS
  'SHA-256 of the 6-digit code. Compare via digest() in redeem-garmin-pairing.';
COMMENT ON COLUMN public.garmin_pairings.attempts IS
  'Failed redemption attempts. At >=5 the code is considered burnt.';
