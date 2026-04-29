# HIIT App — Scalability-Focused Architecture Plan

**Date:** 2026-04-29  
**Supabase project:** `pbrqdlkjoxvglcdlixbi`

---

## A. Build Sequencing — TestFlight Critical Path

The estimate from the product spec ("~2 weeks from content arrival") is accurate but fragile. Two items are hard blockers for App Store submission that are not yet started. The sequencing below orders work so nothing blocks unnecessarily.

**Week 1 — Unblock everything**

1. **AI provider swap** (half a day) — Do this first. Every other AI feature depends on a working, billed gateway. Lovable's Gemini gateway is a shared sandbox. Replace `AI_GATEWAY_URL` and `AI_API_KEY` secrets with OpenRouter + Anthropic (see Section C). No code changes required. Un-blocks everything.

2. **Sentry wiring** (1 hour) — Owner supplies DSN, install `@sentry/react`, wire the existing `log-error` edge function forwarder. Must be live before device testing so crashes are caught.

3. **PostHog wiring** (1 day) — Owner supplies API key, instrument the 7 baseline events. Required to show investor a real funnel on demo day.

4. **Account deletion flow** (1 day) — App Store hard-blocker (Guideline 5.1.1(v)). The edge function, soft-delete cascade, and 30-day restore path are the work. Owner needs to supply modal copy in parallel; engineering can proceed with placeholder copy.

5. **Missing indexes migration** (2 hours) — Add the indexes listed in Section B before any real user data accumulates. Cheap now, expensive to add with production traffic.

**Week 2 — Polish and smoke test**

6. **Privacy policy page** (2 hours engineering) — Content must be supplied by owner. Required for App Store submission for a health data app.

7. **GPS shareable card polish** (1 day) — `generate-activity-image` function exists; this is UX polish work. Good investor demo material.

8. **Body scan pattern analysis wiring** (1 day) — Wire workout history into the AI body analysis recommendations. Infrastructure already there; single integration pass.

9. **Feature flag soft-enables** (half a day) — Enable activity tracking, sleep tracking, health metrics, and achievements flags. Pages are functional. See Section D for full order.

10. **End-to-end device smoke test** (half a day) — On a physical iPhone. Capacitor apps frequently have Xcode signing or plugin permission issues invisible in the browser.

**Parallelisable:** Sentry (1h) and PostHog (1 day) can run simultaneously. Account deletion engineering starts while owner writes modal copy. Indexes migration is independent.

**Cannot be parallelised:** AI provider swap must complete before testing any AI feature end-to-end. Privacy policy content must exist before the page can be submitted for review.

**Estimated calendar time to TestFlight-ready (assuming content arrives end of week 1): 10–12 working days.**

---

## B. Database Scalability

### Missing indexes — High priority

The community tables are the most serious gap. The original community migration created `community_posts`, `community_likes`, `community_comments`, `community_follows`, and `community_profiles` with **zero explicit indexes** beyond unique constraints. There are no indexes on `user_id` foreign keys or `created_at`.

Concretely, these queries will scan entire tables as the dataset grows:

- **`community_posts`** — `.order('created_at', { ascending: false }).limit(50)` will use a sequential scan without an index on `created_at`.
- **`community_likes`** — `eq('user_id', user.id).not('post_id', 'is', null)` will scan all likes for all users.
- **`community_comments`** — `eq('post_id', postId).order('created_at', { ascending: true })` has no index on `(post_id, created_at)`.
- **`community_follows`** — Follow graph lookups have no supporting indexes.
- **`scheduled_workouts`** — HIIT Score queries `(user_id, status, completed_at)` with no composite index. Runs on every HIIT Score recompute.
- **`meal_logs`** — HIIT Score queries `(user_id, logged_at)`. No index.
- **`sleep_logs`** — Same pattern. No index.
- **`ai_generation_log`** — Quota check needs `(user_id, generation_type, created_at DESC)` composite. Current separate indexes don't serve the three-column WHERE clause efficiently.

**Required migration (add before any real users):**

```sql
-- Community feed
CREATE INDEX idx_community_posts_created ON public.community_posts (created_at DESC);
CREATE INDEX idx_community_posts_user_id ON public.community_posts (user_id);

-- Likes lookups
CREATE INDEX idx_community_likes_user_post ON public.community_likes (user_id, post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_community_likes_user_comment ON public.community_likes (user_id, comment_id) WHERE comment_id IS NOT NULL;
CREATE INDEX idx_community_likes_post_id ON public.community_likes (post_id) WHERE post_id IS NOT NULL;

-- Comments
CREATE INDEX idx_community_comments_post_created ON public.community_comments (post_id, created_at ASC);
CREATE INDEX idx_community_comments_user ON public.community_comments (user_id);

-- Follow graph
CREATE INDEX idx_community_follows_follower ON public.community_follows (follower_id);
CREATE INDEX idx_community_follows_following ON public.community_follows (following_id);

-- HIIT Score computation queries
CREATE INDEX idx_scheduled_workouts_user_status_completed
  ON public.scheduled_workouts (user_id, status, completed_at DESC)
  WHERE status = 'completed';

CREATE INDEX idx_meal_logs_user_logged
  ON public.meal_logs (user_id, logged_at DESC);

CREATE INDEX idx_sleep_logs_user_date
  ON public.sleep_logs (user_id, sleep_date DESC);

-- AI quota (3-column composite to match the WHERE clause)
CREATE INDEX idx_ai_generation_log_user_type_created
  ON public.ai_generation_log (user_id, generation_type, created_at DESC);
```

**Impact: High. Effort: 2 hours. Must land before real users, not a TestFlight blocker.**

### RLS policy performance

The `has_role()` function is correctly marked `STABLE` and `SECURITY DEFINER` — Postgres can cache the result within a transaction. The community and nutrition RLS policies use `auth.uid() = user_id`, which Postgres optimises as a startup filter. No seq-scan risks. **No action required.**

### Community feed at 10K users

The feed query fetches 50 posts then issues 3 more serial round-trips for profiles and user likes — a 4-query waterfall per feed open. Worse: the realtime subscription calls `fetchPosts()` (the entire 4-query sequence) on **any change to `community_posts` or `community_likes`** for **any user**. At 100 concurrent users, a single like triggers 100 full re-fetches × 4 queries each.

**Fix before App Store (not just TestFlight):**
1. Eliminate the profile waterfall by joining profiles in the initial posts query (database view or Postgres JOIN).
2. Use the realtime event payload for targeted local state updates instead of full re-fetches.

**Also missing:** cursor-based pagination. The current `limit(50)` is a permanent ceiling — older posts are invisible. Add alongside the feed refactor. **Impact: High. Effort: 1–2 days.**

### HIIT Score computation

The `compute-hiit-score` function issues 5 parallel queries via `Promise.all` per user — correct pattern. The batch mode processes users sequentially in a `for...await` loop. At 1K+ users this will be slow once the pg_cron job is enabled (currently deferred). Fix when batch mode is enabled: process in parallel chunks of 20. **Deferred — not a TestFlight concern.**

### Schema changes needed before data accumulates

1. **`allergens TEXT[]` on `public.recipes`** — Required for safe AI meal plan generation and UK Food Information Regulation compliance. Add now while the table is small.
2. **`deleted_at TIMESTAMPTZ` on user-facing tables** — Required for the 30-day soft delete account deletion flow. Cascade soft-deletes rather than hard deletes. Trivial now; expensive after user data exists.

---

## C. AI Gateway Resilience

### Current state

`ai-client.ts` is a thin wrapper around a single `fetch()` call with:
- **No timeout** — if the provider hangs, users see a spinner for up to 60 seconds
- **No retry logic**
- **No fallback provider**
- **No circuit breaker**

The quota system (`ai-quota.ts`) is correctly implemented — rolling 24-hour window, structured quota state, `429` with `Retry-After`. The log insert before the AI call (failed calls count against quota) is intentional to prevent abuse loops. This is the correct pattern.

The `ai_generation_log.model` field is hardcoded to `"google/gemini-2.5-flash"` across all edge functions — these will be stale after the provider swap.

### Provider swap recommendation

**Recommended: OpenRouter as gateway, Anthropic Claude as primary model.**

- OpenRouter provides a single OpenAI-compatible endpoint (matches the existing wrapper exactly)
- If one provider has an outage, swap the `model` string — not the gateway URL
- Recommended models: `anthropic/claude-sonnet-4-5` for the AI Coach (quality + speed), `anthropic/claude-haiku-3-5` for lower-cost tasks (food analysis, form tips, recommendations)
- **Migration cost: half a day** — update `AI_GATEWAY_URL` to `https://openrouter.ai/api/v1`, update `AI_API_KEY`, update model strings and log inserts in each edge function. No changes to `ai-client.ts` core logic.

### What to add before production

**Timeout (must add with the provider swap):**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s deadline
const response = await fetch(`${url}/v1/chat/completions`, {
  signal: controller.signal,
  // ...
});
clearTimeout(timeoutId);
```
Gives users a clean error instead of a 60-second hang. **Effort: 1 hour.**

**Graceful degradation (client-side):** When the AI provider returns an error, `useAIChat` should show a user-facing message ("Coach is temporarily unavailable — try again in a moment") rather than exposing the raw error. **Effort: 2 hours.**

**Retry with backoff (deferrable):** Single retry with 1-second delay for transient failures. Only before the stream starts (mid-stream retry is not practical). **Effort: 2 hours. Post-launch.**

**Context window truncation (deferrable):** The `ai-coach` function accepts the full conversation history from the client with no server-side limit. Long conversations send unbounded context, increasing latency and cost. Add server-side truncation to system prompt + last 20 turns. **Effort: 2 hours. Post-launch.**

---

## D. Feature Flag Rollout Plan

### Group 1 — Enable before TestFlight (investor demo)

| Flag | Prerequisite | Effort |
|---|---|---|
| `activity_enabled` | Pages functional, GPS works | 1 day polish |
| `sleep_enabled` | Pages functional, HealthKit wired | 1 day polish |
| `health_metrics_enabled` | HealthKit wired, pages functional | 1 day polish |
| `achievements_enabled` | Hook and UI substantial, badges seeded | Half day |

All four flags are pure polish — features exist, need a review pass and the flag toggled. All are high-value for the investor demo. Prerequisite: health data sync defaults decision (or default to: prompt all metrics, write workouts back, iOS only).

### Group 2 — Enable at or shortly after App Store submission

| Flag | Prerequisite | Effort |
|---|---|---|
| `gamification_enabled` | Engagement points values from owner | 1 day |
| `challenges_enabled` | Leaderboard prize structure from owner | 1 day |
| `leaderboard_enabled` | Already on | — |

### Group 3 — Post-launch (Phase 3)

| Flag | Prerequisite |
|---|---|
| `coaching_enabled` | Real coach profiles + booking tested |
| `resources_enabled` | Content authored (articles, videos) |

Keep off until content exists. Enabling with empty content would embarrass the app.

### Group 4 — Already enabled, no action

`workouts_enabled`, `nutrition_enabled`, `food_scanner_enabled`, `community_enabled`, `ai_coach_enabled` — all `true`, working.

### Structural note

`useFeatureFlags` is called in 3 separate components (BottomNav, FullNavMenu, Index.tsx), each issuing an independent Supabase query per mount. Lift to a React Context provider at the app root so the fetch happens once per session. **Effort: 1 hour. Deferrable.**

---

## E. Architecture Risks

### E1. Community feed realtime subscription pattern — High risk

Every like from any user triggers a full 4-query re-fetch for every currently-connected client. Fine for a 20-person investor demo. Reliability issue at 200 concurrent users. Fix before App Store submission (Section B covers the fix).

### E2. No server-side conversation history persistence — Medium risk

The AI Coach conversation lives only in client memory. When the app is closed, history is lost. The `ai_generation_log` stores `prompt: { redacted: true }` deliberately (PII concern). A separate `ai_conversations` table with user-controlled retention is needed to support the "Coach that remembers you" product claim. **Effort: 1–2 days. Post-launch.**

### E3. Batch HIIT Score processes users sequentially — Medium risk, deferred

The `for...await` loop in batch mode is not currently triggered (pg_cron deferred). When enabled at 5K+ users, fix by processing in chunks of 20 via `Promise.all`. **Effort: 4 hours. Deferred.**

### E4. `useFeatureFlags` called 3× per page load — Low risk, technical debt

See Section D. 1-hour fix, deferrable.

### E5. No pagination on community feed — Medium risk

Feed permanently capped at 50 posts. Add cursor-based pagination alongside the feed realtime refactor. **Effort: 1 day.**

### E6. Realtime subscription is table-wide — Medium risk at scale

`community_posts` subscription fires for every row change across the entire table for every connected client. Compounds E1. Fix: row-level filtering on the subscription or channel-based fan-out. **Plan for post-launch.**

### E7. Apple Watch for triathlon — confirmed: cannot be done in Capacitor

Capacitor runs in a WKWebView. WKWebView is not available on watchOS. The Apple Watch transition UI for triathlon must be a native WatchKit/SwiftUI app in a separate Xcode target. Path: add a `HIITWatch` WatchKit App target, implement SwiftUI leg-transition UI, use WatchConnectivity to sync session state with the phone app. **Estimate: 2–4 weeks Swift development. Phase 4.**

**Investor risk:** if the Watch app is being pitched as a current feature, be explicit it is on the roadmap. Showing a Figma mockup is fine; misrepresenting the build state is not.

### E8. RevenueCat not wired — High risk for monetisation story

`RevenueCat` does not appear anywhere in the codebase. The subscription UI and admin panel exist, but no real IAP purchase can be made. Not a TestFlight blocker, but the investor demo has no end-to-end monetisation flow without it. **Effort: 2 days once API key exists. Pre-TestFlight.**

### E9. Privacy policy is a placeholder — High risk (ICO, App Store)

The current `Privacy.tsx` is a generic template. The app collects heart rate, sleep, body composition (photos + estimates), workout data, and food intake — all Article 9 special-category health data under UK GDPR. Processing this without a real privacy policy and documented lawful basis is ICO exposure. Apple requires a real policy for health apps. **Blocks App Store submission. Owner action required — engineering is 2 hours once content exists.**

### E10. `CORS: *` on all edge functions — Low risk, accepted

All edge functions set `Access-Control-Allow-Origin: *`. For a Capacitor mobile app this is largely irrelevant (the app does not use browser CORS), and the JWT requirement is the real security boundary. Acceptable for MVP.

### E11. AI context window growth — Medium risk, post-launch

Full conversation history is sent to the model on every turn with no server-side truncation. Long conversations increase latency and cost. Add truncation to system prompt + last 20 turns. **Effort: 2 hours. Post-launch.**

---

## Summary Priority Table

| Item | Section | Impact | Effort | TestFlight blocker |
|---|---|---|---|---|
| AI provider swap (OpenRouter/Anthropic) | C | High | Half day | No — but do first |
| Missing database indexes | B | High | 2 hours | No — before real users |
| Add timeout to `ai-client.ts` | C | High | 1 hour | No |
| Account deletion flow | A | High | 1 day | App Store blocker |
| Sentry wiring | A | High | 1 hour | No |
| PostHog wiring | A | High | 1 day | No |
| RevenueCat wiring | E8 | High | 2 days | No |
| Privacy policy (real content) | E9 | High | 2h eng + owner | App Store blocker |
| Community feed realtime refactor | E1/B | High | 1–2 days | No — pre-App Store |
| Add cursor pagination to feed | E5 | Medium | 1 day | No |
| Feed profile join (eliminate waterfall) | B | Medium | 1 day | No |
| `allergens` column on `recipes` | B | Medium | 1 hour | No |
| `deleted_at` soft-delete columns | B | Medium | 2 hours | Needed for account deletion |
| `useFeatureFlags` Context lift | D/E4 | Low | 1 hour | No |
| AI conversation history persistence | E2 | Medium | 1–2 days | No — post-launch |
| Batch HIIT Score parallelism | B/E3 | Medium | 4 hours | No — deferred |
| AI context window truncation | E11 | Medium | 2 hours | No — post-launch |
| Watch app (native SwiftUI) | E7 | Phase 4 | 2–4 weeks | No — Phase 4 |

---

## Critical Files for Implementation

- `supabase/functions/_shared/ai-client.ts` — add timeout here
- `src/hooks/useCommunity.ts` — feed realtime refactor
- `supabase/migrations/20260121235330_*.sql` — community tables (reference for index migration)
- `src/hooks/useFeatureFlags.ts` — lift to Context
- `supabase/functions/ai-coach/index.ts` — context window truncation
