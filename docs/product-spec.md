# HIIT App — Product Specification & Roadmap

**Last updated:** 2026-04-29  
**Status:** Engineering ~65% complete. Paused on content and owner decisions.  
**Target:** TestFlight-ready for a £150K investor round.

---

## 1. Vision

An AI-powered fitness platform that unifies workouts, nutrition, sleep, and health data into a single personalised score — the **HIIT Score** (0–100) — that tells users exactly how their lifestyle choices are affecting their fitness. The app targets serious fitness enthusiasts, including endurance athletes competing in events like triathlons and iron man races.

Core differentiators:
- A single motivating number (HIIT Score) derived from real behaviour, not self-report
- An AI coach that speaks in the user's language, remembers context, and adapts plans to their data
- Multi-sport tracking that does not force athletes to end one session before starting another
- Body composition analysis from a phone camera, enriched with biometric history

---

## 2. What is already built

### Auth & Onboarding
- Full sign-up / log-in / password recovery with email verification
- 20-step guided onboarding covering fitness goals, dietary preferences, injuries, and health conditions
- Fitness assessment questionnaire with AI-derived recommendations

### Home & Navigation
- Personalised home dashboard with configurable sections
- HIIT Score badge with tap-to-expand breakdown sheet (workouts, streak, nutrition, sleep, intensity)
- Daily check-in widget, motivational quote, smart daily briefing
- Bottom tab navigation, full drawer menu, quick-action FAB

### Workouts
- Workout library with search, filtering by category/difficulty/body area
- Full workout player with timer, audio cues, and real-time form analysis (AI)
- Workout scheduling and history
- AI workout plan generator (`generate-workout-plan` edge function)
- 20 placeholder workouts seeded (awaiting video URLs)
- Seed data: 15 badges, 20 workout placeholders

### Nutrition
- Daily macro dashboard (calories, protein, carbs, fat, water)
- Meal logging with macro breakdown
- Food photo recognition (AI OCR analysis)
- Barcode scanner → Open Food Facts lookup
- Recipe browser with 30 seeded recipes (muscle/fat/lean categories) — schema includes ingredients, steps, macros, and veg/vegan swaps; **allergen tags column not yet added**
- AI meal plan generator scaffolded

### Activity & GPS Tracking
- Real-time GPS tracking during workouts (`native-gps.ts`, `gps-filter.ts`)
- Live activity map with route drawn as you move (Leaflet / CartoDB dark tiles)
- End-of-workout summary with GPS route overlay
- Shareable activity image generation (`generate-activity-image` edge function)
- Step counting via device pedometer
- Manual activity logging

### Multi-sport / Triathlon Mode
- Full triathlon flow: swim → bike → run as a single continuous session
- Per-leg GPS tracking, calorie calculation, and elapsed time
- Transition UI — tap to move between legs without ending the session
- Lock screen to prevent accidental taps during a race
- Sport selection sheet for configuring session order

### Sleep Tracking
- Sleep dashboard with quality, duration, and efficiency metrics
- Pre-sleep check-in with mood and notes
- Sleep logging (manual and via HealthKit/Health Connect)
- AI sleep recommendations
- *(Feature flag: disabled by default — to be enabled before launch)*

### Health Metrics
- Logging for heart rate, steps, weight, hydration, blood pressure, mood
- Trend charts per metric
- AI health recommendations
- HealthKit (iOS) and Health Connect (Android) two-way sync
- *(Feature flag: disabled by default — to be enabled before launch)*

### Body Scan
- Camera or photo upload with front / side / back pose guides
- AI body composition analysis: body fat estimate, body type, muscle development per zone (upper/core/lower), posture, symmetry
- Manual body measurement input (chest, waist, hips, biceps, thighs, neck)
- Actionable improvement recommendations
- Access to user's biometric history via `useHealthMetrics`

### AI Coach
- Context-aware chat with conversation history and multi-turn memory
- Voice mode: speech-to-text (ElevenLabs Scribe) + text-to-speech (ElevenLabs TTS)
- Jarvis-style immersive voice interface
- Configurable voice, accent, speed, wake word
- AI quota enforcement per user

### Community
- Social feed with posts, likes, comments, and real-time updates
- Post composer with image upload, hashtags, mood tagging
- User profiles with stats, followers, and posts
- 1:1 direct messaging
- Group chatrooms with typing indicators and message reactions
- Stories (24-hour disappearing content) — partially scaffolded

### Gamification & Achievements
- Points system: workout completion, streak days, badges, check-ins, meal logging
- Leaderboard ranking by accumulated points
- 15 predefined badges (streak milestones, workout counts, nutrition goals, social)
- Challenges with submissions and a leaderboard
- Level progression with XP and celebration animations
- Accountability partner matching
- *(Feature flags: achievements/challenges/gamification disabled by default — to be enabled)*

### Coaching Marketplace
- Coach directory with filtering and search
- Coach profile pages with bio, rates, availability, and reviews
- Appointment booking with calendar
- Live video session interface
- *(Feature flag: disabled by default — deferred from MVP)*

### Resources
- Article, workshop, course, and short-form video browsing
- Short video player with autoplay
- *(Feature flag: disabled by default — deferred from MVP, content not yet authored)*

### Subscriptions & Payments
- Subscription tier management in admin panel
- RevenueCat integration: **not yet wired** — pending owner account setup

### Notifications
- Web push (VAPID), iOS push
- In-app notification centre
- Admin broadcast panel (send targeted pushes by user segment)

### Admin Panel
- Dashboard: user counts, workout/meal/badge stats, recent activity
- Workout CRUD (title, video URL, exercises, metadata)
- Meal/recipe CRUD
- Badge creation and unlock-condition configuration
- User role management and account administration
- Community moderation queue (scaffolded)
- Analytics charts: retention, feature adoption, engagement
- Feature flag toggles
- Push notification broadcaster
- System settings and email templates

### Infrastructure
- **Database:** 58 SQL migrations; Supabase Postgres with RLS on all tables
- **Edge functions:** 19 (AI coaching, plan generation, body analysis, form analysis, food analysis, recommendations, push notifications, error logging, barcode lookup, security monitoring)
- **Storage:** 6 private buckets (activity images, meal images, body scan photos, etc.) with signed URLs
- **Error logging:** `error_logs` table + `log-error` edge function + React `ErrorBoundary`
- **AI gateway:** provider-neutral OpenAI-compatible wrapper — currently Lovable's Gemini gateway, swap-ready for Anthropic/OpenAI/OpenRouter with no code changes
- **iOS project:** Xcode project scaffolded, HealthKit entitlements added, bundle ID `com.hiitfitness.app`, app icon complete

---

## 3. Key architectural risks (from architecture review 2026-04-29)

See `docs/architecture-plan.md` for full detail. Summary of the critical points:

| Risk | Severity | When to fix |
|---|---|---|
| Community feed realtime: any like triggers full re-fetch for all connected users | High | Before App Store (not just TestFlight) |
| Missing indexes on community, HIIT Score, and AI quota tables | High | Before any real users |
| AI gateway has no timeout — hangs 60s on provider outage | High | With provider swap |
| AI provider is Lovable's shared sandbox (not production) | High | Week 1 |
| No cursor pagination on community feed (capped at 50 posts) | Medium | Pre-App Store |
| `useFeatureFlags` fetches 3× per page load (should be a Context) | Low | Post-launch |
| AI coach conversation history lives only in client memory | Medium | Post-launch |
| Apple Watch triathlon transitions require native Swift app | Phase 4 | Phase 4 |

---

## 4. Ready to add (days of work each)

These are engineering-complete or near-complete features that need only integration or polish work. None require architectural decisions.

| Feature | Work | Blocker |
|---|---|---|
| **PostHog analytics** | ~1 day | Owner to create PostHog project and supply API key |
| **Sentry error monitoring** | ~1 hour | Owner to supply DSN from existing Sentry account |
| **Account deletion flow** | ~1 day | Modal copy still needed from owner (30-day soft delete decided) |
| **Body scan pattern analysis** | ~1 day | Wire workout history into AI recommendations (infrastructure already there) |
| **GPS workout shareable card** | ~1 day | Polish pass on end-of-workout summary + `generate-activity-image` output |
| **Privacy policy** | ~2 hours engineering, content TBD | Owner to decide: draft in-house, use Termly/Iubenda (~£100), or I draft from codebase facts |
| **Enable activity tracking** | ~1 day | Feature flag off; pages are partial but functional |
| **Enable sleep tracking** | ~1 day | Feature flag off; pages are partial but functional |
| **Enable health metrics** | ~1 day | Feature flag off; pages are partial but functional |
| **Enable achievements/gamification** | ~half a day | Feature flag off; hooks and UI are substantial |
| **Engagement points system** | ~1 day | Owner to confirm values for social actions (sharing, posting, inviting) |
| **RevenueCat / IAP wiring** | ~2 days | Owner must create RevenueCat account and supply API key |
| **AI provider swap** | ~half a day | Replace Lovable gateway with Anthropic/OpenAI — swap `AI_GATEWAY_URL` + `AI_API_KEY` secrets |

---

## 5. What is needed to reach MVP (TestFlight submission)

### Content — owner must supply
- [ ] 20 workout videos (founder-filmed or licensed) — add URLs via Admin → Workouts
- [ ] Recipe images (30 needed — the recipes and macros are already seeded, but no images yet)
- [ ] Allergen tags — a migration is needed to add an `allergens` column to the `recipes` table; data then needs to be filled in per recipe (required for safe AI meal plan generation)
- [ ] App Store screenshots (6.7" iPhone required; we can generate from the app once it's on device)
- [ ] App Store short description and full description copy
- [ ] Privacy policy content (see above)
- [ ] Confirmation modal copy for account deletion

### Accounts — owner must set up
- [x] Apple Developer account — Vanessa's account in use for TestFlight; to be transferred to owner after launch. Open in Xcode → Signing & Capabilities → set Team.
- [ ] RevenueCat account → supply API key
- [ ] PostHog project → supply API key
- [ ] Sentry DSN → supply from existing account

### Decisions still open (see `OWNER_DECISIONS.md`)
- [ ] Engagement points values for social actions (sharing, posting, inviting a friend, etc.)
- [ ] Leaderboard prize structure and cadence
- [ ] Health data sync defaults (progressive opt-in vs full prompt; write-back to HealthKit; Android timing)
- [ ] Privacy policy approach

### Engineering remaining before TestFlight
- Account deletion flow (30-day soft delete) — ~1 day
- PostHog wiring — ~1 day
- Sentry wiring — ~1 hour
- Privacy policy page — ~2 hours (once content provided)
- AI provider swap (off Lovable gateway) — ~half a day
- End-to-end smoke test on device — ~half a day

**Estimated time from content arrival to TestFlight-ready: ~2 weeks.**  
That clock has not started yet.

---

## 6. Full product roadmap

### Phase 1 — TestFlight (current focus)
Everything in sections 3 and 4 above. Goal: investor demo build.

### Phase 2 — App Store submission
- Account deletion flow live (Apple Guideline 5.1.1(v) blocker)
- Real privacy policy
- App Store review submission
- Android scaffolding (`bun x cap add android`)

### Phase 3 — Post-launch growth features
- Engagement points system for social actions
- Leaderboard prizes and competition cadence
- Direct wearable APIs: Oura Ring and/or Whoop (1–2 weeks each, plus vendor review)
- Resources section with authored content (articles, workshops, courses)
- Coaching marketplace (enable feature flag + real coach profiles)
- pg_cron nightly HIIT Score recompute for dormant users

### Phase 4 — Platform scale
- Apple Watch native app for triathlon leg transitions (2–4 weeks Swift/SwiftUI, separate Xcode target — cannot be done in Capacitor)
- Mindfulness / mental health signal in HIIT Score (revisit once daily check-in data exists)
- Community moderation tooling (currently scaffolded)
- Stories (currently partial)
- CSV bulk import in Admin → Workouts

---

## 7. Open owner decisions

See [`OWNER_DECISIONS.md`](../OWNER_DECISIONS.md) for the live tracker. As of 2026-04-29:

**Resolved today:**
- ✅ HIIT Score formula — accepted as-is
- ✅ Analytics provider — PostHog
- ✅ Account deletion — 30-day soft delete
- ⚠️ Error monitoring — Sentry account exists but not connected; to be wired at terminal

**Still open:**
- Engagement points values for social actions
- Leaderboard prize structure and cadence
- Health data sync defaults (4 sub-questions)
- Privacy policy approach and DPO contact
- Account deletion modal copy

---

## 8. Tech stack summary

| Layer | Technology |
|---|---|
| Frontend | Vite + React 18 + TypeScript + Tailwind + shadcn/ui |
| Mobile shell | Capacitor 8 (iOS first, Android to follow) |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Health data | `@capgo/capacitor-health` → HealthKit / Health Connect |
| AI | Provider-neutral OpenAI-compatible gateway (swap-ready) |
| Voice | ElevenLabs TTS + Scribe (speech-to-text) |
| Maps | Leaflet + CartoDB dark tiles |
| Package manager | Bun (`bun.lock` is source of truth) |
| CI/CD (native builds) | Codemagic (`codemagic.yaml`) |
| Supabase project | `pbrqdlkjoxvglcdlixbi` |
| iOS bundle ID | `com.hiitfitness.app` |
