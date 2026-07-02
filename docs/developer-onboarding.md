# Developer Onboarding

Everything a new engineer needs to understand HIIT, get productive locally,
and ship changes safely. Assumes you know React, TypeScript, and modern web
tooling. No prior Capacitor / Supabase / Garmin experience assumed —
sections that need it call it out.

Written 2026-07-02. Cross-references: `CLAUDE.md` at the repo root
(mandatory read — it's the operational rulebook everyone follows) and
`architecture-plan.md` (why things are structured this way).

---

## 1. What you're inheriting

**HIIT** — a Capacitor 8 + React 18 + TypeScript iOS fitness coaching
app. Users work out, log meals, connect wearables, and talk to an AI
coach named Jarvis.

Three distinct client codebases share one backend:

1. **iPhone app** — React SPA hosted inside a Capacitor WKWebView
   (`src/`, `ios/App/App/`)
2. **Apple Watch companion** — SwiftUI, native (`ios/App/HIITWatch Watch App/`)
3. **Garmin Connect IQ companion** — Monkey C, native
   (`/Users/vanessa/hitt-garmin/garmin/` — separate worktree on the
   `garmin/connect-iq-app` branch of the same repo)

One backend:

- **Supabase project `pbrqdlkjoxvglcdlixbi`** (region West EU/Ireland) —
  Postgres, Auth, Storage, and Edge Functions (Deno-based)

---

## 2. Tech stack at a glance

| Layer | Choice | Why |
|---|---|---|
| UI framework | React 18 + TypeScript + shadcn/ui | Standard, fast to iterate |
| Styling | Tailwind CSS | Constrained tokens, no snowflakes |
| State / data | React Query + Supabase client | Server-first; local state kept minimal |
| Router | react-router-dom | SPA routing inside the WebView |
| Build | Vite + Bun | Bun is faster than npm and works fine |
| Mobile shell | Capacitor 8 | Bridges the WebView to native iOS APIs |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) | Batteries included; one vendor |
| Edge runtime | Deno | Supabase's default; TypeScript-native |
| Auth | Supabase Auth + Sign in with Google + Sign in with Apple | Multiple providers, JWT session |
| AI | OpenRouter (or Anthropic direct) via `_shared/ai-client.ts` | Provider swap is one env var |
| Voice | ElevenLabs via `elevenlabs-tts` edge function | Only used for the Jarvis coach |
| Errors | Sentry | Frontend + edge function forwarder |
| Analytics | PostHog | Funnels + feature flags |
| Watch (Apple) | SwiftUI, WCSession bridge | Native performance |
| Watch (Garmin) | Monkey C via Connect IQ SDK 9.2 | Native, ~37 target devices |

---

## 3. Local dev setup

```bash
# One-time
brew install openjdk@17          # required for Garmin sim, not for iPhone dev
brew install cocoapods           # if the Xcode project ever wants pods
curl -fsSL https://bun.sh/install | bash
cd ~
git clone https://github.com/HITT-App/HITT_repo.git hitt-app
cd hitt-app

# Env
cp .env.example .env
# fill in values from your team's password manager

# Install deps + start web-only dev server
bun install
bun run dev                      # http://localhost:8080

# iOS build (needs Xcode 16+)
bun run build && npx cap sync ios
open ios/App/App.xcodeproj

# Supabase CLI (needed for edge function deploys + migrations)
brew install supabase/tap/supabase
supabase link --project-ref pbrqdlkjoxvglcdlixbi

# Garmin Connect IQ SDK
# Download from https://developer.garmin.com/connect-iq/sdk/
# Then git clone the garmin worktree:
git worktree add ~/hitt-garmin garmin/connect-iq-app
# The signing key (~/hitt-connect-iq-developer.key) is NOT in git — get
# it from the password manager and drop it at ~/hitt-connect-iq-developer.key
```

There's a `deploy-ios.sh` script at `~/bin/deploy-ios.sh` on the
current maintainer's Mac that runs the full build → archive → TestFlight
upload in one command. You'll want the same script, updated with your
Apple developer credentials.

---

## 4. Repo layout

```
hitt-app/
  src/
    components/             # React components (UI, feature components)
      coach/                # Jarvis AI coach mode (voice + chat)
      wearable/             # Multi-wearable UI + pairing
      workout/              # Share cards, completion flows
      home/                 # Home screen sections
      ui/                   # shadcn primitives (unused ones already stripped)
    pages/                  # One file per screen (matches routes in App.tsx)
    hooks/                  # Reusable React hooks
    lib/                    # Non-React logic (GPS, sync, analytics, etc.)
    plugins/                # TypeScript bridges to native Capacitor plugins
    integrations/supabase/  # Generated Supabase types + client wrapper
  ios/App/                  # Xcode project + native Swift plugins
    App/                    # iPhone target: HealthKit reads, Watch bridge,
                            #                Live Activity, wearable-detect
    HIITWatch Watch App/    # watchOS SwiftUI companion
    HIITLiveActivity/       # Lock-screen + Dynamic Island widget extension
  supabase/
    functions/              # Edge functions (Deno)
      _shared/              # Reusable helpers (AI client, activity upsert,
                            #                  JWT signing, quotas, etc.)
      ai-coach/             # Streams Jarvis responses
      sync-healthkit/       # HealthKit → activity_logs aggregator
      push-garmin-watch-workout/  # Direct-push from Garmin watch
      ... 30+ others
    migrations/             # Postgres migrations (numbered by date)
    config.toml             # Per-function verify_jwt flags
  tests/
    run.ts                  # Source-file audit suite (~180 tests)
    test-*.ts               # Unit tests (mocked) and smoke tests (live)
  .maestro/                 # UI automation flows for iOS
  docs/                     # Product spec, architecture, guides
  CLAUDE.md                 # Operational rules (read this first)
```

The Garmin worktree at `~/hitt-garmin/` on branch `garmin/connect-iq-app`:

```
garmin/                     # Monkey C sources
  source/                   # HittApp.mc, SportMenuView.mc, RecordingView.mc,
                            #  PushClient.mc, AuthPairingView.mc, ...
  resources/                # Strings + drawables
  manifest.xml              # App ID, permissions, target devices
CHANGELOG.md                # Per-version notes
```

---

## 5. Architecture — the important parts

### Data flow

1. **Activity ingest.** Users record workouts via (a) the iPhone GPS
   tracker (`ActivityLive.tsx`), (b) the Apple Watch via WCSession
   → `log-watch-workout`, (c) HealthKit's aggregated data from Garmin /
   Fitbit / Whoop / Oura → `sync-healthkit`, or (d) the Garmin watch
   directly via `push-garmin-watch-workout`. **All four paths route
   through `_shared/activity-upsert.ts`** which enforces a three-layer
   dedupe (exact-key, fingerprint, ±90s fuzzy window) and winner-selection
   based on `SOURCE_PRIORITY`. This is load-bearing — see the "Shared
   activity upsert" section in `CLAUDE.md` before touching either.

2. **Multi-wearable UX.** `getPrimaryWearable(supabase, userId)` in
   `src/lib/wearable-detection.ts` runs on every mount, cached by React
   Query for 1h and localStorage for 7 days. Returns one of
   `apple_watch | garmin | fitbit | whoop | oura | phone_only`. The
   `<WearableLaunchCard />` on every activity page (`ActivityLive`,
   `WorkoutPlayer`, `GymTimer`, `Triathlon`) renders vendor-specific
   copy from the matrix in `src/lib/wearable-launch-copy.ts`.

3. **Jarvis (AI coach).** `src/components/coach/JarvisMode.tsx` is a
   full-screen overlay that streams tokens from the `ai-coach` edge
   function. The AI embeds silent markers in its response text
   (`[SCHEDULE_PLAN:{...}]`, `[LOG_FOOD:{...}]`,
   `[RECOMMEND_WORKOUT:{...}]`, etc.) which `parseAIResponse()` strips
   from display and turns into app actions. Marker docs are in
   `CLAUDE.md` — every marker must have a corresponding switch case.

4. **Garmin direct push.** Casey's stuck-pair saga (2026-07-02) is the
   canonical example of "how NOT to talk to Garmin from a watch app."
   Read the whole "Garmin CIQ direct push" section of `CLAUDE.md` before
   touching `PushClient.mc`. Key rule: `Content-Type` header MUST be
   `Communications.REQUEST_CONTENT_TYPE_JSON` (a Garmin internal
   constant), NEVER the string `"application/json"` — the string form
   silently kills requests on some firmware. Audit CIQ-13 catches this.

5. **Live Activities (Lock Screen + Dynamic Island).** A separate Xcode
   extension target (`ios/App/HIITLiveActivity/`) built via the
   `capacitor-live-activity` plugin. **iOS 26 simulator crashes widget
   extensions** — always test on a real device (see
   `feedback_live_activity_sim.md` in the auto-memory). The extension's
   `Info.plist` MUST be explicit (not synthesised from build settings)
   or iOS crashes the extension at startup.

### Auth

Supabase Auth handles email/password, Google (via
`@capgo/capacitor-social-login`), and Apple Sign-In. Session is a JWT
stored by the Supabase client. RLS policies on every user-scoped table
gate all reads/writes to `auth.uid()`.

**Admin roles.** `public.user_roles` with the `app_role` enum stores who
can access `/admin/*` routes. The first admin has to be granted via SQL
(see `admin-guide.md`). Every admin page is gated by `AdminRoute` which
calls the `has_role(auth.uid(), 'admin')` RPC.

### Edge functions

All ~30 functions live in `supabase/functions/`. Deploy one with
`supabase functions deploy <name>` — instant, no app rebuild needed. The
`_shared/` folder contains reusable helpers; import them with relative
paths (`../_shared/foo.ts`) which Supabase's Deno resolver handles.

**`config.toml` controls JWT verification per function.** Default is
`verify_jwt = true` (Supabase's front door rejects any request without
a valid Supabase user JWT). We turn it off for functions the watch calls
(`redeem-garmin-pairing`, `push-garmin-watch-workout`) because the watch
authenticates with its own HMAC JWT verified inside the function body.
See `CIQ-07` audit in `run.ts` for what must stay wired up.

**All LLM calls go through `_shared/ai-client.ts`.** Never fetch the AI
provider directly — the shared client lets us swap Gemini → OpenAI →
Anthropic via a single env var without code changes.

---

## 6. Testing

Four layers, matching CLAUDE.md's summary:

1. **Source-file audits** (`tests/run.ts`, 180 tests, ~18 pre-existing
   fails that predate current work). Enforces structural contracts by
   grepping source. Groups: NF (UI feedback), WD (wearable detection),
   DEDUPE (activity dedupe), SYNC (Garmin coaching), CIQ (Garmin
   direct push), CA / WA / MP / AI / SCH (historical).
2. **Pure unit tests** (mocked deps, no auth). Under `tests/test-*.ts`.
3. **Live smoke tests** (need `TEST_EMAIL` + `TEST_PASSWORD`).
   `tests/test-wearable-endpoints.ts`.
4. **Maestro UI flows** (`.maestro/`). Anchored to visible elements;
   need iOS Simulator + app installed. `brew install openjdk@17` +
   Maestro CLI.

Run all:

```bash
npx tsx tests/run.ts
npx tsx tests/test-activity-dedupe.ts
npx tsx tests/test-garmin-sync-tier.ts
npx tsx tests/test-garmin-pairing.ts
npx tsx tests/test-wearable-detection.ts
npx tsx tests/test-wearable-launch-copy.ts
TEST_EMAIL=… TEST_PASSWORD=… npx tsx tests/test-wearable-endpoints.ts
maestro test .maestro
```

**Rule: don't add a new pattern without also adding the audit to guard
it.** The DEDUPE + SYNC + CIQ audits exist because the pattern they
guard has already broken in production once and we don't want it
happening again.

---

## 7. Deployment

### iPhone app to TestFlight

```bash
~/bin/deploy-ios.sh hitt
```

Runs: `bun run build` → `npx cap sync ios` → `xcodebuild archive` →
`xcodebuild -exportArchive` → `xcrun altool upload`. Build number
auto-increments inside the script. Takes 5-10 minutes. When it prints
`UPLOAD SUCCEEDED`, the build appears in TestFlight in another 5-10.

There's a slash command `/jeffrey` (a Claude Code skill) that automates
the full pipeline: summarise diff → update CHANGELOG → commit → push →
deploy. Read `~/.claude/skills/jeffrey.md` if you want to use it.

### Supabase edge function

```bash
supabase functions deploy <name>
```

Instant. Zero downtime. Always redeploy `_shared/*.ts` consumers when
you edit a shared helper — Supabase doesn't auto-redeploy dependents.

### Postgres migration

```bash
supabase db push
```

Applies every pending migration file in `supabase/migrations/`.
**Never edit an already-applied migration in place** — write a new
migration on top instead.

### Garmin CIQ watch app

```bash
export PATH="/opt/homebrew/opt/openjdk@17/bin:$PATH"
cd ~/hitt-garmin
$SDK/monkeyc \
  -o hitt-<version>.iq \
  -f garmin/monkey.jungle \
  -y ~/hitt-connect-iq-developer.key \
  -e --release
```

Then upload the `.iq` at `apps.garmin.com/developer` under the HITT app
listing. Store version label should match the manifest version. Store
review is usually a few hours for updates to an existing app.

---

## 8. Third-party integrations

See `owner-handover.md` Section 2 for the full account list. From a
developer's angle:

- **Supabase** — Postgres 15, ~50 tables, RLS on everything user-scoped.
  Edge Functions on Deno 2. Storage buckets: `avatars`, `share-cards`,
  and `owner-media`. Realtime is set up but not currently used.
- **ElevenLabs** — TTS via `supabase/functions/elevenlabs-tts/`. **Always
  normalise "HIIT" → "hit"** before sending text (regex in `CLAUDE.md`).
- **AI provider** — currently OpenRouter → Gemini/Claude. Configured via
  `AI_GATEWAY_URL` and `AI_API_KEY` env vars. Swap providers with an env
  change only.
- **Apple HealthKit** — reads via `HealthKitReadPlugin.swift`, writes
  (workouts, calories) via `HealthWritePlugin.swift`. iOS 15 minimum.
- **Apple Watch WCSession** — `WatchPlugin.swift` + `WatchBridge.swift`
  on iPhone side; `WatchSessionManager.swift` on watch side. Use
  `transferUserInfo` (not `updateApplicationContext`) for queued
  delivery — application context overwrites, user info queues in order.
- **Garmin Connect IQ** — see the direct-push section of `CLAUDE.md`.

---

## 9. Scalability and limits

Rough back-of-envelope for what today's setup handles before needing
architecture changes:

| Constraint | Comfortable ceiling | Mitigation when we hit it |
|---|---|---|
| Supabase free tier row storage | 500 MB DB | Upgrade to Pro ($25/mo) — 8 GB then usage-based |
| Supabase free tier egress | 5 GB/mo | Upgrade to Pro |
| Concurrent DB connections | ~100 direct | Supabase pooler already fronts everything |
| Edge function invocations | 500k/mo free | Pro is 2M; per-invocation cost after |
| Supabase Auth users | Unlimited on free | Enterprise features (SSO) at ~100k |
| ElevenLabs voice characters | Depends on plan | Cache TTS per phrase; queue with debounce |
| AI provider tokens/day | Rate-limited by provider | Per-user quota via `_shared/ai-quota.ts` already in place |
| PostgREST max_rows per response | 1000 | **Must paginate above this** — see the ingredient-fix bug in CLAUDE.md's Supabase section. `drainTable()` pattern in `BrowseMeals.tsx` |
| APNS device tokens | Unlimited | Only iPhones; token rotation handled |
| Garmin CIQ storage per app | 8 KB PersistedContent | JWT fits easily; be careful with per-workout metadata |

### Realistic user thresholds

- **~500 active users** — free tier holds; no infrastructure changes.
- **~5,000** — upgrade Supabase to Pro, expect $50-$150/mo total.
- **~50,000** — consider a dedicated Redis for React Query bg refresh,
  batch the HealthKit sync writes, put a CDN in front of the share-card
  storage bucket. Realtime channels start mattering.
- **~500,000+** — separate the AI coach traffic onto a dedicated Deno
  Deploy or Cloudflare Worker, move analytics to a real warehouse
  (BigQuery via PostHog export).

None of these are blockers now — but every new feature should be built
with dedupe / pagination / RLS in mind from day one.

---

## 10. Known restrictions & footguns

Ordered by "most likely to burn you in the first week":

1. **PostgREST silently caps every response at 1000 rows.** Any read
   over 1000 needs pagination via `drainTable()` (see `BrowseMeals.tsx`).
   Not paginating manifests as random subsets of data mysteriously
   missing. There's a CLAUDE.md callout and it broke the meals browser
   once.
2. **`activity_type` must go through `normaliseActivityType()`** before
   any write to `activity_logs`. The fingerprint dedupe hashes it, so
   drift ("run" vs "running") breaks dedupe silently. DEDUPE-04 audit
   catches this.
3. **iOS 26 simulator crashes the Live Activity extension**. Use a real
   device. `isIOSSimulator()` short-circuits `LiveActivity.start()`.
4. **Xcode `INFOPLIST_KEY_*` synthesis silently drops array values**.
   Any plist key whose value is an array (Watch's `WKBackgroundModes`,
   Live Activity's `NSExtension`) must live in an explicit `Info.plist`,
   NOT in `INFOPLIST_KEY_*` build settings. Verify with `plutil -p` on
   the built binary. WA-11, WA-12 audits catch this.
5. **Never use `ScrollArea` to wrap a whole page** on Capacitor iOS —
   breaks sticky headers. Use native browser scroll.
6. **Garmin `Content-Type` must be the internal constant**
   `Communications.REQUEST_CONTENT_TYPE_JSON`, not the string. CIQ-13
   audit catches this. See the casey debug saga in CHANGELOG for the
   full story.
7. **iOS WKWebView blocks `<a href="scheme://">` clicks** — external
   URL schemes need `window.location.href = scheme` to reach iOS's URL
   handler. See `GarminSetupSheet.tsx` for the pattern.
8. **`TTS normalisation`** — always replace `\bHIIT\b` → `"hit"` before
   sending text to ElevenLabs. "HIIT" pronounced letter-by-letter
   sounds like "H-I-I-T". CA-11 audit.
9. **Sticky headers pattern** is exact — see `CLAUDE.md`. Every
   scrollable page must use it verbatim, `top-0 z-20 bg-background/90
   backdrop-blur-sm` plus safe-area padding.
10. **Never edit an applied migration.** Always write a new one. If
    you find yourself wanting to change an old migration, that's a
    signal you need a new one.

---

## 11. Working style + tooling

- **Claude Code integration.** This repo is set up for Claude Code (see
  `.claude/`). The `CLAUDE.md` file at repo root is the authoritative
  operational rulebook. Read it. Everything relevant to daily work is
  in there.
- **The `/jeffrey` skill** automates release: CHANGELOG → commit → push
  → TestFlight. Trigger it with `/jeffrey ship <description>`.
- **The `/ultrareview` skill** runs a multi-agent cloud code review of
  the current branch. User-triggered only; you cannot invoke it
  yourself.
- **Git.** Branches: `main` (production), `garmin/connect-iq-app` (the
  Garmin watch app — mounted at `~/hitt-garmin` via a git worktree).
- **CHANGELOG.md** — one entry per shipped change, user-facing prose.
  `/jeffrey` maintains this automatically.
- **Discord** — the current maintainer's primary comms channel. There's
  a Claude Code Discord bridge. Not required for a new dev but worth
  knowing.

---

## 12. First-week checklist

- [ ] Read `CLAUDE.md` end to end (it's ~350 lines but every line matters)
- [ ] Run `bun run dev` and get the app running locally
- [ ] Run `bun run build && npx cap sync ios && open ios/App/App.xcodeproj`
      and get an iOS build running on a simulator or a physical device
- [ ] Run all four test suites and confirm the pass counts match the
      README numbers (any regression is your first bug to fix)
- [ ] Sign into the QA test account (`hitt.qa.test@gmail.com`) and
      poke around the app — every feature you're about to touch
- [ ] Read `docs/product-spec.md` and `docs/architecture-plan.md`
- [ ] Skim the last 20 CHANGELOG entries — that's the last month of
      shipped work
- [ ] Do the "Reset pairing" / "Pair Garmin watch" flow end-to-end
      on a real Garmin watch — this exercises the deepest and most
      recently-broken code path in the whole app
- [ ] Set up your local Supabase CLI: `supabase link` and confirm
      `supabase functions list` returns the ~30 functions

Once all of the above works and passes, you're ready to ship.
