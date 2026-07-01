# HIIT

AI-powered fitness app covering workouts, nutrition, sleep, health metrics, community, and a personalised HIIT Score. Built as a Capacitor mobile app (iOS / Android / web) with a Supabase backend.

---

## Current state (2026-07-01)

**Actively shipping to TestFlight. Ship cadence is same-day for most fixes.** Iteration cycle:
push to `main` → `~/bin/deploy-ios.sh hitt` → TestFlight in 5-10 minutes. See CHANGELOG.md for the
day-by-day narrative.

Recent architecture landmarks:
- **Multi-wearable via HealthKit aggregator** — Garmin, Fitbit, Whoop, Oura workouts flow into
  `activity_logs` when their iOS apps sync to Apple Health. Cross-source fingerprint dedupe collapses
  duplicates. See CLAUDE.md "Multi-wearable" section.
- **Vendor-aware launch UI** — every activity launch screen (GPS / structured / gym / triathlon)
  shows vendor-appropriate instructions based on the user's detected primary wearable. `phone_only`
  users get a clean universal Start button.
- **Live Activity widget extension** — Lock Screen + Dynamic Island card during workouts. Automatically
  skipped on iOS Simulator (iOS 26 XPC quirk).
- **Automated regression net** — 119 source-file audits + 58 unit tests + 15 live smoke tests +
  5 Maestro UI flows. New primary CTAs must pass the NF-01..04 immediate-feedback contract.

Ongoing dependencies from the owner (Vanessa) — still valid from the April state:
- 20 workout videos (ideally founder-filmed)
- 30 recipes with images + allergen tags
- App Store screenshots / copy
- Apple Developer + RevenueCat production accounts

Decisions the owner is tracking live in [`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md).

### Resuming this project

Read in this order:

1. **[`OWNER_DECISIONS.md`](./OWNER_DECISIONS.md)** — live tracker for everything pending.
2. **[`docs/content-production-checklist.md`](./docs/content-production-checklist.md)** — simplified deliverables map for the owner (20 workouts × video, 30 recipes × image, 20 badges × icon, etc.).
3. **[`docs/content-strategy.md`](./docs/content-strategy.md)** — strategic thinking behind the content plan + AI-on-demand workflow.
4. **[`docs/admin-guide.md`](./docs/admin-guide.md)** — `/admin/*` route map + how to grant admin role.

### Working with Vanessa

- **Discord-first comms** when not at the terminal — every reply through the Discord MCP `reply` tool.
- **Push authority is hers** — never `git push` without explicit approval.
- **Honest assessments** preferred over reassurance.
- **First-time Mac user** — explain Mac-specific tooling when non-obvious.

### Supabase project

`pbrqdlkjoxvglcdlixbi` — Vanessa's own account. Set up from scratch (handover from old dev had nothing usable). Supabase CLI is linked; auth persists across sessions via `~/.supabase`.

---

## Tech stack

- **Frontend:** Vite + React 18 + TypeScript + Tailwind + shadcn-ui + React Router
- **Mobile shell:** Capacitor 8 (iOS first, Android to follow)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Health data:** `@capgo/capacitor-health` → Apple HealthKit / Google Health Connect
- **AI:** provider-neutral OpenAI-compatible gateway (`AI_GATEWAY_URL` + `AI_API_KEY` secrets) — currently Lovable's Gemini gateway, swappable to Anthropic / OpenAI / OpenRouter with no code change
- **Package manager:** bun (npm/pnpm also work, but `bun.lock` is the source of truth)
- **CI for native builds:** Codemagic (`codemagic.yaml`)

## Repo layout

```
hitt-app/
├── src/                        React app
│   ├── pages/                  Route components (including /admin/* for the dashboard)
│   ├── components/             Reusable UI; home/, wearable/, workout/ subfolders
│   ├── hooks/                  useAuth, useHiitScore, usePrimaryWearable, useActivity, …
│   ├── lib/                    wearable-detection, healthkit-sync, live-activity, gps-filter, …
│   ├── plugins/                Capacitor bridges: Watch, HealthKitRead
│   └── integrations/supabase/  Generated types + client
├── supabase/
│   ├── migrations/             SQL migrations (source of truth for schema)
│   ├── functions/              Edge functions (Deno) — _shared/ has activity-upsert, ai-client
│   └── manual_setup/           Optional SQL (e.g. pg_cron) to run in the dashboard
├── ios/App/                    Xcode workspace
│   ├── App/                    iPhone Capacitor host + native plugins
│   ├── HIITWatch Watch App/    watchOS companion (SwiftUI)
│   └── HIITLiveActivity/       Lock Screen + Dynamic Island widget extension
├── tests/                      Audit runner + unit + live smoke tests
├── .maestro/                   Maestro UI automation flows
├── docs/                       Content strategy, admin guide, test plans, etc.
└── OWNER_DECISIONS.md          Open design questions for the owner
```

## Local development

Prerequisites: **Node 20+ or bun**, **Supabase CLI** (`brew install supabase/tap/supabase`), and for iOS builds: **Xcode** with Command Line Tools and **CocoaPods** (`brew install cocoapods`).

```bash
# 1. Install deps
bun install

# 2. Create a local .env from the template
cp .env.example .env
# Edit .env with your Supabase URL + publishable key

# 3. Start the web dev server (Vite on :8080)
bun run dev
```

Open http://localhost:8080/.

## Supabase setup

If you're cloning fresh and pointing at a **new** Supabase project:

```bash
# Link this repo to your project
supabase link --project-ref <your-project-ref>

# Apply all migrations to remote
supabase db push

# Deploy edge functions
supabase functions deploy compute-hiit-score
supabase functions deploy lookup-barcode
# …and any others you want available. All current functions:
ls supabase/functions
```

Supabase secrets the edge functions expect (set with `supabase secrets set KEY=value`):

- `AI_GATEWAY_URL` + `AI_API_KEY` — OpenAI-compatible chat endpoint (see `_shared/ai-client.ts`). Falls back to `LOVABLE_API_KEY` and Lovable's gateway if unset.
- `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` — web push notifications.
- `ELEVENLABS_API_KEY` — optional, only needed for voice features (`elevenlabs-*` functions).

To grant yourself admin access after signing up, see `docs/admin-guide.md`.

## iOS builds

```bash
# Build web assets, sync to native project, open in Xcode
bun run cap:ios
```

Inside Xcode:

1. Select the `App` target → **Signing & Capabilities** → set your **Team**.
2. If this is the first build after cloning, add the **HealthKit** capability (+ Capability → HealthKit). The entitlements file already exists; this just registers it with the provisioning profile.
3. Pick a simulator or device → ⌘R.

Bundle ID: `com.hiitfitness.app`.

## Android builds

Not yet scaffolded. Run `bun x cap add android` when ready. See `OWNER_DECISIONS.md` for the timing discussion.

## Key features — how they hang together

- **HIIT Score** (`src/hooks/useHiitScore.ts`, `supabase/functions/compute-hiit-score`) — nightly-computable 0–100 score derived from workouts, streak, nutrition, sleep, and intensity. Tap the badge on Home for the breakdown.
- **Health data sync** (`src/hooks/useHealthSync.ts`) — pulls from HealthKit / Health Connect on app open. Feeds `health_metrics` and `sleep_logs`, which in turn feed HIIT Score.
- **AI coach** (`supabase/functions/ai-coach`) — context-aware chat, routed through the provider-neutral wrapper. Same routing applies to form analysis, food analysis, body analysis, smart insights, and workout/activity/sleep recommendations.
- **Nutrition** — manual logging + Open Food Facts barcode lookup (`supabase/functions/lookup-barcode`).
- **AI plan generation** — tables are in place (`user_workout_plans`, `user_meal_plans`, `ai_generation_log`); the generator edge function is pending a provider decision (see `OWNER_DECISIONS.md`).

## Documentation

- **`docs/content-strategy.md`** — MVP content targets, AI-on-demand proposal, safety rails.
- **`docs/admin-guide.md`** — how to grant admin role and what the `/admin/*` routes do.
- **`OWNER_DECISIONS.md`** — running list of open product questions.
- **`supabase/manual_setup/`** — optional SQL (pg_cron, etc.) that's deliberately not in migrations.

## Deployment

- **Web:** `bun run build` → `dist/` is a standard Vite output. Any static host works.
- **iOS:** Xcode → Archive → distribute via App Store Connect. Codemagic is configured for automated builds.
- **Supabase migrations:** `supabase db push` against the target project. Edge functions: `supabase functions deploy <name>`.

## Licence

Proprietary. All rights reserved.
