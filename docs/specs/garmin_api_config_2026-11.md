# Garmin Connect API: configuration changes once approved

**For:** Casey
**Date:** 3 November 2026
**Status:** Research only. Nothing has been built or changed.

> **Superseded on 5 November 2026** by the delivery plan at `~/garmin-developer-docs/HIIT_GARMIN_PLAN.md`, written from Garmin's own documents. It's kept out of this repo because those documents are confidential. Known errors here: Starter has one client ID, not separate evaluation and production keys, and the nightly push and effort estimate are out of date.

## What "the same as Strava" means

Strava's Garmin integration runs entirely server-to-server. There's no Garmin code in the Strava app.

1. **Activities in.** You finish a run on your Garmin and it uploads to Garmin Connect. Garmin then pushes it to Strava automatically (Activity API).
2. **Routes out.** You star a route in Strava and Garmin Connect copies it to the watch (Courses API).

HIIT would do the same, with one addition:

| Direction | Garmin API | What the user sees |
|---|---|---|
| Garmin → HIIT | **Activity API** | Every workout recorded on the watch shows up in HIIT. This works on **Android too**, where we don't import any workouts today. |
| HIIT → Garmin | **Training API** | Workouts HIIT generates or schedules appear on the watch's calendar and run in Garmin's own workout player. Strava doesn't do this. |
| HIIT → Garmin | **Courses API** (optional) | GPS routes from HIIT's activity screens sync to the watch. |
| Garmin → HIIT | **Health API** (optional) | Body Battery, stress score, sleep and HRV, for the HIIT Score and Jarvis. |

## The programme as it stands (reopened 21 October 2026)

Garmin paused new applications in March 2026. That pause is why our June plan (`SPEC_garmin_connect_iq.md` §9) dropped this approach in favour of a watch app. It reopened on 21 October with new tiers:

| | **Starter** (where an approved app begins) | **Enterprise** |
|---|---|---|
| APIs | Activity, Health, Training, Courses, Women's Health | The same, plus Golf |
| Data delivery | **Push only** (Garmin POSTs the full data to us) | Push, or ping/pull |
| Users | **Limited** (reported as about 1,000) | Unlimited |
| History when a user connects | **None**: only activities after they connect | 1 month or more |
| Cost | Free | $1,000 entry fee, then a per-monthly-active-user fee set per company |
| Support | None | Included |

Things that affect us:
- **The ~1,000-user cap.** Once HIIT has more than about 1,000 Garmin-connected users, Casey needs Enterprise and the per-user fee.
- **No back history on Starter.** Users won't see their past Garmin workouts. Only new ones will appear.
- **Unverified label.** A new Starter app reportedly shows as "unverified" until Garmin reviews it, and new connections may be limited until then.
- **AI consent (agreement clause 15.10).** Garmin data processed by AI needs a *conspicuous AI transparency statement and explicit, withdrawable consent from each user*. Jarvis and the AI coach run on Gemini, so this applies to us.
- **Attribution (clause 6.4 + API Brand Guidelines).** Anywhere we show Garmin data, including figures derived from it, it must carry Garmin attribution.
- **The application form** asks for every third party that will process Garmin data. For us that's Supabase, Google Gemini, PostHog, Sentry, and ElevenLabs if voice comes back. It must be submitted by whoever owns or distributes the app (Casey).

Sources: Garmin overview page (developer.garmin.com/gc-developer-program/overview), Sahha (2 Nov 2026) and Garmin Rumors (21 Oct 2026). Garmin didn't publish prices or the user cap itself; those come through DC Rainmaker. The agreement clauses come through Sahha's summary of agreement Rev. B (March 2026). **Check all of these against the Developer Portal docs once access is granted.**

## Configuration changes

### 1. Garmin Developer Portal (Casey, after approval)

| Setting | Value |
|---|---|
| App credentials | Client ID + secret for evaluation, then production. Send them to Vanessa over a secure channel. Never paste them in chat or email. |
| OAuth redirect URI | `https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-oauth-callback` |
| Push endpoints (Endpoint Configuration Tool) | `.../functions/v1/garmin-webhook` for: activities, activity details, activity files, manually updated activities, **deregistrations**, **user permission changes**. Add the dailies, sleep, stress and HRV summaries if we take the Health API. |
| APIs enabled | Activity, Training, plus Courses and Health if wanted |
| Ping/pull | Not available on Starter. Leave unset. |

### 2. Supabase backend (Vanessa)

**Secrets** (`supabase secrets set`): `GARMIN_CLIENT_ID`, `GARMIN_CLIENT_SECRET`, plus a webhook verification secret if Garmin doesn't sign its push requests (to confirm in the docs).

**New edge functions**

| Function | Purpose | `verify_jwt` |
|---|---|---|
| `garmin-oauth-start` | Creates the PKCE verifier and state, returns the Garmin consent URL | true (signed-in user) |
| `garmin-oauth-callback` | Swaps the code for tokens, stores them, redirects to `hiitfitness://garmin-connected` | **false** |
| `garmin-webhook` | Receives every push. Must answer 200 quickly and process after; routes by summary type; handles deregistration and permission changes | **false**, with our own verification |
| `garmin-push-workout` | HIIT workout → Training API workout + schedule (mapping already designed in `TAPI-04_workout_schema_mapping.md`) | true |
| `garmin-disconnect` | Revokes the tokens at Garmin and deletes them on our side | true |
| `garmin-push-course` (optional) | GPS route → Courses API | true |

The callback and webhook entries go into `supabase/config.toml` with `verify_jwt = false`, alongside the existing `redeem-garmin-pairing` entries.

**Migrations**
- `garmin_connections`: user_id, garmin_user_id, access/refresh tokens (stored in Supabase Vault, not plain columns), granted permissions, connected_at, revoked_at. Owner-only row-level security.
- `garmin_workout_links`: HIIT scheduled workout ↔ Garmin workout and schedule IDs, so edits and deletes stay in sync.
- `garmin_sync_log`: push and receive audit trail for the "last synced" status.
- Feature flag `ff_garmin_cloud` in `app_settings`, matching the existing `ff_garmin_watch_direct_push`.

**Dedupe:** add a new `source_platform = 'garmin_api'` in `_shared/activity-upsert.ts` and place it in `SOURCE_PRIORITY`. Without that, a Garmin user with Apple Health sync turned on gets every workout twice: once from Garmin directly, once via HealthKit (today's `'garmin'` source).

**pg_cron:** a nightly push of the next day's scheduled workouts to Garmin, and token refresh.

**Account deletion:** `delete-account` must also revoke Garmin tokens and delete Garmin-derived data.

### 3. iOS + Android app (Vanessa, needs a new build)

- **Connected Devices → "Connect Garmin"** opens Garmin's consent page in the system browser, which returns via the `hiitfitness://` scheme. The scheme already exists on iOS. Android needs a matching intent filter in `AndroidManifest.xml`.
- Status card on the same page: connected as…, last activity received, last workout sent, Disconnect.
- **AI consent toggle**, off until the user opts in, gating whether Garmin data reaches Jarvis/Gemini (clause 15.10).
- **Garmin attribution** on activity cards, detail screens and anything derived from Garmin data, following the brand guidelines.
- `wearable-detection.ts` should treat a cloud-linked Garmin as the primary wearable.

### 4. Legal and store listings (Casey to approve the wording)

- Privacy policy: Garmin section (a draft exists in `garmin_developer_application_draft.md` §6), plus the AI transparency statement and Gemini named as a processor of Garmin data.
- App Store privacy label and Play Data Safety: recheck the fitness, location and health data types against what Garmin sends.

## Effort, and what happens to the existing Garmin work

- **Activities in + workouts out + Connect/Disconnect UI + consent:** about 2–3 weeks of build and test once sandbox credentials arrive. Courses and Health add about 3–5 days each.
- **What it replaces.** Today Garmin workouts reach HIIT only by a roundabout route: the user must turn on Garmin Connect → Apple Health, which only works on iPhone. That's what `GarminSetupSheet` and the 3/7/14-day `GarminSyncBanner` nudges exist for. Once a user connects Garmin directly, both should be hidden for that user. The new `garmin_api` source should rank **above** the HealthKit `garmin` source (60–70) and **below** `hitt_garmin_watch` (100) in `SOURCE_PRIORITY`.
- **The HIIT Connect IQ watch app** (`~/hitt-garmin`, pairing code, `push-garmin-watch-workout`) can stay as it is. The cloud API reaches every modern Garmin without it. Its remaining value is the HIIT-branded on-watch interval timer.
- The 29 June application draft describes **OAuth 1.0a tokens** (`oauth_token` / `oauth_secret`). Garmin has moved partners to OAuth 2.0 with PKCE. Treat the draft's auth sections as out of date and confirm against the portal docs.

## Decisions for Casey

1. Activities in + workouts out only, or include Courses and/or Health from day one?
2. Is he happy to plan for Enterprise fees once Garmin-connected users approach ~1,000?
3. Will he approve the AI consent wording, given Jarvis is a core feature and Garmin requires explicit opt-in?
