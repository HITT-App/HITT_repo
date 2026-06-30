# HITT Garmin Connect IQ — Delivery Spec

**Doc owner:** Vanessa
**Status:** Draft v2 — pivoted away from Training API (2026-06-30)
**Last updated:** 2026-06-30

> ⚠️ **2026-06-30 — major revision.** Garmin paused the Connect Developer Program (Training API / Activity API / Health API — server-side, gated approvals). Connect IQ (on-watch SDK) and the iOS Companion SDK are **unaffected** and remain freely available. The original two-track architecture in this spec is no longer viable — Track A (Training API push) is closed. See **§9 Revision A** for the new closed-loop architecture, which now does everything via direct Bluetooth between the HITT iPhone app and a HITT Connect IQ app. Earlier sections (§§1–8) describe the original plan and remain as historical context. Read §9 for what's actually being built.

---

## 1. Overview

HITT today is an iPhone-first HIIT/triathlon app (Capacitor/React/Supabase) with a native SwiftUI watchOS companion. Garmin owns the serious-endurance wrist: triathletes, ultra runners, multi-sport athletes — exactly the audience HITT's race/triathlon flows are built for. Right now, those users either don't pick HITT, or they wear two watches.

This spec scopes the work to bring HITT onto Garmin in a way that feels native to both Garmin and HITT. We are not trying to replicate Garmin Connect — we want a tightly-scoped "HITT on Garmin" experience: pull today's structured workout onto the wrist, run it with proper interval cues, push it back into HITT immediately on save, and slot cleanly into the user's existing Garmin Connect data flow.

The user is an existing or prospective HITT user who happens to wear a Garmin (Forerunner, Fenix, Epix, Venu, Edge). They already have a Garmin Connect account. They want HITT's structured-workout brain on the Garmin's superior battery and sensor stack.

This is a multi-month project. The spec assumes one Claude Code agent at a time, working in agent-days (~4–8 focused hours each). Estimates are generous on purpose — Monkey C is unfamiliar territory, the device matrix is broad, and Garmin's review process is opaque.

---

## 2. Two-Track Architecture

Garmin gives us two non-exclusive integration paths. We should ship both, in this order.

### Track A — Training API (server-side, no on-watch code)

Garmin's **Training API** lets us push structured workouts and training plans directly into a user's Garmin Connect calendar from our Supabase backend. The user then syncs their watch to Garmin Connect (which they already do) and the workout shows up on the wrist via Garmin's own native workout player.

- **Reach:** ~every Garmin device made in the last 6+ years that supports structured workouts. Far broader than Connect IQ.
- **No on-watch code:** zero Monkey C, zero device matrix testing.
- **Approval lead time:** Garmin Connect Developer Program application — historically weeks to months. Start this on day one.
- **Limit:** uses Garmin's native workout UI. We don't control the look. No HITT branding on the wrist.

Pair this with the **Activity API** (webhook-based) to receive the completed FIT file back into Supabase the moment the user saves the activity — this is how we close the loop without a Connect IQ app.

### Track B — Connect IQ app (on-watch, Monkey C)

A native HITT app on the Garmin, written in Monkey C, distributed via the Connect IQ Store.

- **Reach:** Connect IQ-capable devices only (Forerunner 245+, Fenix 6+, Epix, Venu 2+, Edge 530+, Instinct 2+, etc.). Smaller subset than Training API.
- **Differentiated UX:** HITT branding, custom interval layouts, triathlon transition flow, HITT-specific in-workout cues.
- **Approval lead time:** Connect IQ Store review is typically days, not months — but EEA distribution adds a separate review.
- **Constraints:** Monkey C only; no garbage collector; tight memory budget; no background HTTP; no native TTS; OAuth must round-trip through the Garmin Connect mobile app.

### Recommended split

| Feature | Track | Why |
|---|---|---|
| Push tomorrow's workout to Garmin calendar | A (TAPI) | Works everywhere; native player is fine for non-HIIT |
| Pull completed FIT back into HITT | A (Activity API webhook) | Universal — covers users without our CIQ app |
| HIIT interval timer with HITT branding | B (CIQ) | Native player can't render the work/rest cadence the way HITT wants |
| Triathlon multi-sport leg switching with HITT plan overlay | B (CIQ) | Garmin's multi-sport works but doesn't know about HITT's per-leg targets |
| OAuth pairing watch ↔ HITT account | B (CIQ) | Required only for the CIQ-app path |
| "Garmin sync working" status in iPhone app | iPhone | Cross-track |

**Recommendation:** ship Track A first (Phase 0–1). It delivers ~70% of perceived value with ~30% of the engineering surface. Then build Track B for the on-watch differentiation.

---

## 3. User Stories

Story IDs:
- `TAPI-*` — Training API / Activity API / server-side
- `CIQ-*` — Connect IQ on-watch app
- `IOS-*` — iPhone app changes
- `INF-*` — Supabase / infra

Each story: persona, acceptance criteria, track, effort in agent-days, deps, agent assignment.

### Epic A — Garmin Developer Program onboarding

#### TAPI-01 — Apply for Garmin Connect Developer Program

> **As** the HITT product owner, **I want** an approved Garmin Connect Developer Program account, **so that** we can use the Training API and Activity API.

- **Acceptance:** Application submitted with use-case write-up; consumer key + secret issued for sandbox.
- **Track:** TAPI
- **Effort:** 1 agent-day (admin + writing) + multi-week external wait
- **Deps:** none
- **Agent:** general-purpose (drafting application)

#### TAPI-02 — Apply for Connect IQ Store developer account

> **As** the HITT product owner, **I want** a Connect IQ developer account, **so that** we can publish a HITT app to the store.

- **Acceptance:** Connect IQ developer agreement signed; UUID reserved for HITT app.
- **Track:** CIQ
- **Effort:** 0.5 agent-day + days-to-weeks external
- **Deps:** none
- **Agent:** general-purpose

### Epic B — Server-side Training API (Track A)

#### TAPI-03 — Supabase edge function `garmin-push-workout`

> **As** a HITT user with Garmin connected, **I want** my scheduled HITT workout to appear in my Garmin Connect calendar, **so that** I see it on my watch the next morning.

- **Acceptance:**
  - Edge function accepts a HITT workout ID + user ID.
  - Translates HITT's workout structure (warmup/sets/cooldown, distance/duration/HR targets) into Garmin's workout JSON schema.
  - POSTs to Training API with the user's OAuth token.
  - Logs success/fail to a `garmin_sync_log` table.
- **Track:** TAPI / INF
- **Effort:** 3 agent-days
- **Deps:** TAPI-01, TAPI-05 (OAuth tokens)
- **Agent:** general-purpose

#### TAPI-04 — Schema mapping: HITT workout → Garmin workout JSON

> **As** the system, **I want** a deterministic mapping from HITT's interval/triathlon schema to Garmin's workout JSON, **so that** every supported workout type pushes correctly.

- **Acceptance:**
  - Unit tests cover: HIIT intervals, running with HR zones, cycling with power/HR, swimming with distance, strength (best-effort), triathlon (single push covering all three legs).
  - Documented mapping table for unsupported HITT fields (graceful degradation).
- **Track:** TAPI
- **Effort:** 2 agent-days
- **Deps:** TAPI-01
- **Agent:** Plan (schema design) then general-purpose

#### TAPI-05 — Garmin OAuth pairing flow (iPhone app)

> **As** a HITT user, **I want** to link my Garmin Connect account from inside the HITT iPhone app, **so that** HITT can push workouts to my watch.

- **Acceptance:**
  - Settings → "Connect Garmin" button opens Garmin OAuth in `SFSafariViewController`.
  - Successful callback stores `garmin_user_id`, `oauth_token`, `oauth_secret` against the HITT user in Supabase (encrypted at rest).
  - Disconnect button revokes the token via Garmin API.
- **Track:** IOS / INF
- **Effort:** 2 agent-days
- **Deps:** TAPI-01
- **Agent:** general-purpose

#### TAPI-06 — Activity API webhook receiver

> **As** the HITT backend, **I want** to receive a webhook the moment a user finishes a Garmin activity, **so that** completed workouts appear in HITT without manual sync.

- **Acceptance:**
  - Public Supabase edge function endpoint registered with Garmin as the ping URL.
  - Receives ping → pulls FIT file → parses summary (sport, duration, distance, HR, route) → writes to `activities` table.
  - Matches to a scheduled HITT workout when timestamps overlap (within ±2h).
  - Idempotent on retry.
- **Track:** TAPI / INF
- **Effort:** 3 agent-days
- **Deps:** TAPI-01, TAPI-05
- **Agent:** general-purpose

#### TAPI-07 — Daily scheduler: push tomorrow's workout at 6pm

> **As** a HITT user, **I want** my next scheduled workout to be in my Garmin calendar by the evening before, **so that** my morning sync just works.

- **Acceptance:** Supabase cron job at 18:00 user-local; calls TAPI-03 for every Garmin-linked user with a workout in the next 24h.
- **Track:** TAPI / INF
- **Effort:** 1 agent-day
- **Deps:** TAPI-03
- **Agent:** general-purpose

### Epic C — iPhone-side surfacing

#### IOS-01 — Settings panel: Garmin connection status

> **As** a user, **I want** to see whether Garmin sync is working, **so that** I trust the integration.

- **Acceptance:**
  - Shows "Connected as <Garmin name>" or "Not connected".
  - Last successful push timestamp.
  - Last received activity timestamp.
  - Deep-link to install the HITT Connect IQ app in the Garmin Connect mobile app.
- **Track:** IOS
- **Effort:** 1.5 agent-days
- **Deps:** TAPI-05, TAPI-06
- **Agent:** general-purpose

#### IOS-02 — Watch-platform picker

> **As** a user with both Apple Watch and Garmin, **I want** to choose which watch HITT should treat as primary, **so that** I don't get double-recorded activities.

- **Acceptance:** Setting persists per-user; affects which device gets the WCSession push (Apple) vs Training API push (Garmin); deduplication logic in `activities` ingest.
- **Track:** IOS / INF
- **Effort:** 1.5 agent-days
- **Deps:** IOS-01
- **Agent:** Plan then general-purpose

### Epic D — Connect IQ app foundations (Track B)

#### CIQ-01 — Connect IQ project scaffold

> **As** a developer, **I want** a Monkey C project for the HITT app with the standard Garmin device targets, **so that** subsequent stories have a build to land in.

- **Acceptance:**
  - `garmin/` directory at repo root with `manifest.xml`, `monkey.jungle`, `resources/`, `source/`.
  - Builds for at least: Forerunner 265, Fenix 7, Epix 2, Venu 3, Edge 840, Instinct 2.
  - CI step compiles the app for the target list.
  - HITT orange/dark theme tokens in `resources/colors.xml`.
- **Track:** CIQ
- **Effort:** 2 agent-days
- **Deps:** TAPI-02
- **Agent:** Explore (Monkey C ramp-up) then general-purpose

#### CIQ-02 — OAuth pairing with HITT account

> **As** a Garmin user, **I want** to log in to my HITT account from the watch app, **so that** the app knows who I am.

- **Acceptance:**
  - First launch → "Sign in with HITT" → triggers `Toybox.Authentication.makeOAuthRequest`.
  - Mobile-app webview hands the user a HITT login.
  - Token stored in `Application.Storage` (persists across launches).
  - Subsequent launches skip login.
  - Sign-out clears the token.
- **Track:** CIQ / INF (HITT OAuth endpoint)
- **Effort:** 3 agent-days
- **Deps:** CIQ-01
- **Agent:** Plan (OAuth design) then general-purpose

#### CIQ-03 — Persistent storage layer

> **As** the CIQ app, **I want** a small, typed storage layer over `Application.Storage`, **so that** plans, tokens, and partial-activity recovery state survive restarts.

- **Acceptance:**
  - Wrapper with `get<T>`, `set<T>`, `clear`.
  - Size-budget enforcement (warn at 80% of device storage cap).
  - Schema-version migration helper.
- **Track:** CIQ
- **Effort:** 1 agent-day
- **Deps:** CIQ-01
- **Agent:** general-purpose

### Epic E — Recording an activity (Track B MVP)

#### CIQ-04 — Activity recording: start / pause / lap / stop

> **As** a Garmin user, **I want** to start a HIIT, run, ride, or swim from the HITT app, **so that** Garmin records it just like a native activity.

- **Acceptance:**
  - Activity selector screen lists: HIIT, Run, Bike, Swim, Strength, Triathlon.
  - Start → uses `Toybox.ActivityRecording.createSession` with the correct sport.
  - Lap button → adds a lap marker.
  - Pause/resume works via dedicated UI button and the device's hardware button if available.
  - Stop → save dialog → activity file saved to device → syncs to Garmin Connect on next phone-sync.
  - Live HR, pace, distance, elapsed time visible during recording.
- **Track:** CIQ
- **Effort:** 4 agent-days
- **Deps:** CIQ-01, CIQ-03
- **Agent:** general-purpose

#### CIQ-05 — Sync completed activity directly to HITT

> **As** a Garmin user, **I want** my finished activity to appear in HITT immediately, **so that** I don't have to wait for the Garmin Connect → HITT pipeline.

- **Acceptance:**
  - On activity save, CIQ app POSTs activity summary JSON to a HITT endpoint via `Communications.makeWebRequest`.
  - Endpoint requires the user's HITT token (from CIQ-02).
  - Queues request if phone unreachable; retries on next foreground.
  - Falls back gracefully to the TAPI-06 webhook path (no double-insert).
- **Track:** CIQ / INF
- **Effort:** 2 agent-days
- **Deps:** CIQ-02, CIQ-04, TAPI-06
- **Agent:** general-purpose

### Epic F — Structured workouts on watch

#### CIQ-06 — Pull today's HITT workout on app launch

> **As** a Garmin user, **I want** to see today's scheduled workout when I open the HITT app, **so that** I can start it with one tap.

- **Acceptance:**
  - On foreground, app calls HITT `/api/today` with the user's token.
  - Renders workout title, target duration/distance, and "Start" button.
  - Caches result in `Application.Storage` so the screen renders instantly on next launch even offline.
- **Track:** CIQ
- **Effort:** 2 agent-days
- **Deps:** CIQ-02, CIQ-03
- **Agent:** general-purpose

#### CIQ-07 — HIIT interval engine on watch

> **As** a Garmin user doing a HIIT session, **I want** the watch to count me through work/rest intervals with vibration cues, **so that** I don't have to look at a phone.

- **Acceptance:**
  - Renders current interval (e.g. "Work 4 / 8 — 30s remaining").
  - Vibration pattern at interval transitions (no TTS — Garmin doesn't support it).
  - Large countdown number visible at arm's length.
  - Skip / extend interval buttons.
  - Captures per-interval HR + lap markers in the FIT file.
- **Track:** CIQ
- **Effort:** 4 agent-days
- **Deps:** CIQ-04, CIQ-06
- **Agent:** Plan (interval state machine) then general-purpose

#### CIQ-08 — Triathlon plan: three legs with transitions

> **As** a triathlete using HITT, **I want** the watch to walk me through swim → T1 → bike → T2 → run with per-leg targets, **so that** I have my race plan on my wrist.

- **Acceptance:**
  - Receives 3-leg plan from CIQ-06 (target km per leg + HR target).
  - Uses `Toybox.ActivityRecording.MultiSportSession` for proper sport switching.
  - T1/T2 are timed transition screens; user taps to advance.
  - Per-leg metrics shown live (km remaining, pace, HR).
  - On finish, captures all three legs in a single multi-sport FIT file.
- **Track:** CIQ
- **Effort:** 5 agent-days
- **Deps:** CIQ-04, CIQ-06
- **Agent:** Plan then general-purpose

#### CIQ-09 — Live data overlay during structured workouts

> **As** a user, **I want** HR, pace, and distance visible during any structured workout, **so that** the watch is genuinely useful.

- **Acceptance:**
  - Configurable 3-field data layout (HR, pace/speed, distance, interval timer).
  - Renders cleanly on 240×240, 260×260, 280×280, and 416×416 screens.
  - Round and rectangular device variants both tested.
- **Track:** CIQ
- **Effort:** 3 agent-days (cross-device layout pain)
- **Deps:** CIQ-07
- **Agent:** general-purpose

### Epic G — Robustness & polish

#### CIQ-10 — Crash recovery

> **As** a user whose watch crashes mid-workout, **I want** to resume on next launch, **so that** I don't lose my session.

- **Acceptance:**
  - Active session state checkpointed every 30s to `Application.Storage`.
  - On launch, if a checkpoint exists with no clean shutdown marker → offer "Resume previous workout?".
- **Track:** CIQ
- **Effort:** 2 agent-days
- **Deps:** CIQ-04, CIQ-07
- **Agent:** general-purpose

#### CIQ-11 — Settings: sync prefs, data fields, units

> **As** a user, **I want** to control what HITT pushes and pulls, **so that** my data flow matches my preferences.

- **Acceptance:**
  - In-app settings: auto-sync on/off, data fields to show, units (km/mi), vibration intensity.
  - Persisted via `Properties` (so they show up in Garmin Connect Mobile app settings too).
- **Track:** CIQ
- **Effort:** 1.5 agent-days
- **Deps:** CIQ-03
- **Agent:** general-purpose

#### CIQ-12 — Multi-device test matrix

> **As** the release manager, **I want** the app verified on every supported device family, **so that** we don't ship breakage to a major device class.

- **Acceptance:**
  - Simulator test pass: Forerunner 165/265/965, Fenix 7/8, Epix 2, Venu 3, Edge 540/840/1040, Instinct 2/3.
  - Physical-device smoke test on at least: 1 Forerunner, 1 Fenix/Epix, 1 Venu, 1 Edge.
  - Known-issues doc per device.
- **Track:** CIQ
- **Effort:** 3 agent-days (more if real bugs surface)
- **Deps:** CIQ-04 through CIQ-11
- **Agent:** Explore (device matrix research) then general-purpose

#### CIQ-13 — Connect IQ Store submission

> **As** the release manager, **I want** the app submitted and approved, **so that** users can install it.

- **Acceptance:**
  - Store listing copy, screenshots (one per device family), icon at all required sizes.
  - Privacy policy URL.
  - Submitted to global store.
  - EEA distribution form submitted separately.
- **Track:** CIQ
- **Effort:** 2 agent-days work + opaque external review wait
- **Deps:** CIQ-12
- **Agent:** general-purpose

---

## 4. Risk Register

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Garmin Connect Developer Program rejects application or takes months | Medium | High | Apply day 1 (TAPI-01); build Track B in parallel so we have *something* shippable if Track A stalls |
| R2 | Connect IQ Store rejects app on first submission | Medium | Medium | Read submission guidelines early; build Phase 3 buffer for fixes; submit a minimal version first to learn the review bar |
| R3 | EEA approval delays Europe launch by weeks | High | Medium | Submit EEA form the day global approval lands; communicate to UK/EU users explicitly |
| R4 | Device matrix breakage — works on Forerunner, broken on Fenix | High | Medium | Simulator-test on every target from day 1; budget CIQ-12 generously; consider initial launch on a narrower device list |
| R5 | Monkey C learning curve eats agent-days | High | Medium | Front-load with an Explore phase; pad CIQ-01 through CIQ-04 estimates by 30%; don't try to be idiomatic on first pass |
| R6 | No background HTTP means activity sync is foreground-only | Certain | Low | Documented limit — sync happens on next app foreground; UX must communicate this clearly |
| R7 | OAuth token refresh complexity on a constrained device | Medium | Medium | Use long-lived tokens where Garmin auth model allows; refresh via the mobile-app round-trip |
| R8 | Storage cap exceeded on cheaper devices (Instinct, low-end Forerunner) | Medium | Low | Hard cap on cached plans; evict oldest; CIQ-03 size warnings |
| R9 | Garmin and HITT both record the activity → duplicates | High if not handled | Medium | IOS-02 primary-watch picker + server-side dedup keyed on start-time + duration |
| R10 | Garmin changes Connect IQ API in a major SDK bump | Low per year | High | Pin SDK version in `monkey.jungle`; smoke-test against new SDKs before adopting |
| R11 | Connect IQ app architecture forces us to rewrite when Garmin retires older SDKs | Low | Medium | Target a modern SDK floor (≥4.x) from the start; accept the device-cut |
| R12 | Triathlon multi-sport recording is more fragile than single-sport (state machine edge cases mid-race) | Medium | High (user-facing) | CIQ-08 gets the biggest single estimate; ship single-sport first, gate triathlon behind a beta flag |
| R13 | Owner / product priorities shift and Garmin gets de-scoped mid-project | Medium | High | Phase 0 + Phase 1 deliver real value standalone; project can stop after Phase 1 and still have shipped something |

---

## 5. Delivery Phases

### Phase 0 — Foundation

External approvals + scaffolding. Mostly waiting, but unblocks everything.

| Story | Effort |
|---|---|
| TAPI-01 Garmin Connect Developer Program application | 1 |
| TAPI-02 Connect IQ Store developer account | 0.5 |
| TAPI-04 Workout schema mapping design (begin) | 2 |
| CIQ-01 Connect IQ project scaffold | 2 |

**Phase 0 total: 5.5 agent-days** (plus weeks of external wait — start now)

### Phase 1 — Track A MVP + CIQ foundation

Server-side push and pull working. Users see HITT workouts on their Garmin calendar.

| Story | Effort |
|---|---|
| TAPI-05 Garmin OAuth pairing (iPhone) | 2 |
| TAPI-03 `garmin-push-workout` edge function | 3 |
| TAPI-06 Activity API webhook receiver | 3 |
| TAPI-07 Daily push scheduler | 1 |
| IOS-01 Garmin connection status panel | 1.5 |
| IOS-02 Watch-platform picker | 1.5 |
| CIQ-02 OAuth pairing on watch | 3 |
| CIQ-03 Persistent storage layer | 1 |
| CIQ-04 Activity recording start/pause/lap/stop | 4 |
| CIQ-05 Sync completed activity to HITT | 2 |

**Phase 1 total: 22 agent-days**

### Phase 2 — Structured workouts on watch

The differentiated on-watch experience.

| Story | Effort |
|---|---|
| CIQ-06 Pull today's workout | 2 |
| CIQ-07 HIIT interval engine | 4 |
| CIQ-08 Triathlon multi-sport | 5 |
| CIQ-09 Live data overlay | 3 |

**Phase 2 total: 14 agent-days**

### Phase 3 — Polish, test matrix, store submission

Get it past review and onto users' wrists.

| Story | Effort |
|---|---|
| CIQ-10 Crash recovery | 2 |
| CIQ-11 Settings | 1.5 |
| CIQ-12 Multi-device test matrix | 3 |
| CIQ-13 Connect IQ Store submission | 2 |

**Phase 3 total: 8.5 agent-days** (plus external review wait)

### Cumulative

| Phase | Agent-days | Cumulative |
|---|---|---|
| Phase 0 | 5.5 | 5.5 |
| Phase 1 | 22 | 27.5 |
| Phase 2 | 14 | 41.5 |
| Phase 3 | 8.5 | **50 agent-days total** |

At one focused Claude Code session per working day, that's **~2.5 calendar months of dev work** — not counting external wait time for the Garmin Connect Developer Program (weeks to months), Connect IQ Store review (days to weeks), and EEA distribution (separate review).

Honest read: budget **4–6 calendar months from kickoff to "available on Connect IQ Store in EEA"**, with Track A value (calendar push + activity sync) shippable inside 6–8 weeks if TAPI-01 approval comes through quickly.

---

## 6. Agent Assignment Hints

Quick reference for which Claude Code agent to use per story.

| Story | Primary agent | Why |
|---|---|---|
| TAPI-01, TAPI-02 | general-purpose | Forms and admin writing |
| TAPI-03 | general-purpose | Standard edge function work |
| TAPI-04 | Plan → general-purpose | Schema mapping is a design decision before it's code |
| TAPI-05, TAPI-06, TAPI-07 | general-purpose | Standard backend integration |
| IOS-01 | general-purpose | Standard React UI |
| IOS-02 | Plan → general-purpose | Dedup design before code |
| CIQ-01 | Explore → general-purpose | Need Monkey C ramp-up first |
| CIQ-02 | Plan → general-purpose | OAuth across two systems needs sequence-diagram thinking |
| CIQ-03, CIQ-04, CIQ-05, CIQ-06 | general-purpose | Mechanical once CIQ-01 lands |
| CIQ-07 | Plan → general-purpose | Interval state machine benefits from explicit design |
| CIQ-08 | Plan → general-purpose | Multi-sport state machine — highest design risk |
| CIQ-09 | general-purpose | Layout grind |
| CIQ-10, CIQ-11 | general-purpose | Standard implementation |
| CIQ-12 | Explore → general-purpose | Device-matrix research first |
| CIQ-13 | general-purpose | Submission paperwork |

---

## 7. Decisions Locked In (2026-06-29)

1. **Auth flow → Device-pair code via Supabase Auth.**
   Connect IQ app shows a 6-digit code on the watch. User enters it into the HITT iPhone app, which calls a Supabase edge function to mint a long-lived token bound to that user. Watch stores the token in `Application.Storage`. No new OAuth provider, no parallel auth system. (Replaces the "OAuth pairing" wording in CIQ-02 — see addendum.)

2. **Device floor → Connect IQ SDK 4.x.**
   Supported: Forerunner 255+, Fenix 7+, Epix 2+, Venu 3+, Edge 540+, Instinct 2+. All devices released 2022 or later. ~12 representative test targets instead of 50+. Older device support is a post-launch decision based on demand.

3. **Triathlon → Ships in Phase 2** (CIQ-08 stays).

4. **EEA → Ship global first, submit EEA same day.**
   UK / US / Canada / Australia / Asia users get the app on approval day. EU users see an "available in your region soon" notice in the iPhone app's Garmin section, then get it 2–6 weeks later when EEA review passes.

5. **Pricing → Free Connect IQ app, gated by HITT subscription.**
   The Connect IQ app is free to install from the Connect IQ Store. Sign-in requires a HITT account, which is created via the iPhone app (free) and subscribed to via App Store IAP. Without an active HITT subscription, the Connect IQ app shows the user's status and offers structured workouts only if their plan covers it. The iPhone app remains the source of truth for billing — same pattern as Strava, TrainingPeaks, Wahoo, Komoot.

   **Onboarding flow:**
   1. User installs HITT Connect IQ from the Garmin Connect mobile app (free).
   2. Watch displays "Sign in with HITT" + 6-digit code.
   3. User opens iPhone HITT app → Settings → "Connect Garmin Watch" → enters code.
   4. If not subscribed, iPhone app shows paywall.
   5. On subscription, watch pairs and Phase 2 features unlock.

   **Implication:** Connect IQ app is technically standalone-installable but practically requires the iPhone app. This is the standard Connect IQ pattern.

---

## 8. Addendum — CIQ-02 revised under the device-pair code flow

The original CIQ-02 (OAuth pairing) is simpler under the device-pair flow. Replace the acceptance criteria with:

#### CIQ-02 (revised) — Device-pair code login

> **As** a Garmin user, **I want** to sign in to my HITT account from the watch app with a short code, **so that** I don't need to type a password on the watch.

- **Acceptance:**
  - First launch → "Sign in with HITT" → calls a Supabase edge function `garmin-pair-start` which returns a 6-digit code.
  - Watch displays the code and a "Waiting for sign-in…" screen.
  - iPhone HITT app exposes Settings → "Connect Garmin Watch" → text field for the code.
  - On code entry, iPhone calls `garmin-pair-confirm` with the code + signed-in user ID. Backend mints a long-lived token, marks the pair record consumed.
  - Watch polls `garmin-pair-status` every 5s. On success, receives the token, stores it in `Application.Storage`, transitions to home screen.
  - Codes expire after 10 minutes and are single-use.
  - Sign-out clears the token and revokes server-side.
- **Track:** CIQ / INF / IOS
- **Effort:** 2 agent-days (down from 3 — simpler than full OAuth)
- **Deps:** CIQ-01
- **Agent:** Plan (device-pair sequence design) → general-purpose

This is the same code-pair pattern Sonos uses to pair speakers and Apple uses for AirPlay handoffs. Well-trodden, no third-party OAuth library needed on the watch.

---

## Sources

- [Garmin Training API — Garmin Developers](https://developer.garmin.com/gc-developer-program/training-api/)
- [Garmin Activity API — Garmin Developers](https://developer.garmin.com/gc-developer-program/activity-api/)
- [Connect IQ SDK — Garmin Developers](https://developer.garmin.com/connect-iq/)
- [Connect IQ Compatible Devices](https://developer.garmin.com/connect-iq/compatible-devices/)
- [Toybox.Authentication module](https://developer.garmin.com/connect-iq/api-docs/Toybox/Authentication.html)
- [Toybox.Communications module](https://developer.garmin.com/connect-iq/api-docs/Toybox/Communications.html)
- [Authenticated Web Services — Connect IQ](https://developer.garmin.com/connect-iq/core-topics/authenticated-web-services/)
- [Connect IQ background services FAQ](https://developer.garmin.com/connect-iq/connect-iq-faq/how-do-i-create-a-connect-iq-background-service/)
- [Publishing to the Connect IQ Store](https://developer.garmin.com/connect-iq/core-topics/publishing-to-the-store/)
- [Strava Live Relative Effort on Garmin devices](https://support.strava.com/hc/en-us/articles/219376367-Live-Relative-Effort-on-Garmin-devices)
- [Strava apps in the Connect IQ Store](https://apps.garmin.com/en-US/developer/fbd3f2ee-4483-47f1-b478-a2056edca8dc/apps)
- [Garmin and Strava integration](https://support.strava.com/hc/en-us/articles/216918057-Garmin-and-Strava)
- [Connect IQ approval timeline forum thread](https://forums.garmin.com/developer/connect-iq/f/connect-iq-web-store/428068/app-approval-process-taking-longer-than-usual-10-days)
- [EEA approval process forum thread](https://forums.garmin.com/developer/connect-iq/f/discussion/380687/app-approved-on-iq-store---waiting-for-eea-approval)

---

## 9. Revision A — Connect IQ–only path (2026-06-30)

### Context

Garmin's Connect Developer Program — the gated server-side APIs (Training, Activity, Health, User) — is paused for new partners. The application form has been removed; Garmin's forum representative confirmed "no projected re-opening date." Existing partners can still use the APIs; new applicants cannot.

**This invalidates Track A** (push HITT workouts to Garmin's native calendar). It does **not** affect Connect IQ, which is a separate product with no gated approvals.

### What's still available

- **Connect IQ SDK** — free, public, builds Monkey C apps that run on Garmin watches. Distribution via Connect IQ Store has a review process but no "program" to apply to.
- **Connect IQ Companion App SDK for iOS** — official `ConnectIQ.xcframework`, MIT-style licence, Swift Package Manager install. Lets a native iPhone app talk directly to Connect IQ apps on paired Garmin watches over Bluetooth LE. No Garmin Connect Mobile install required on the user's phone. Open repo: `github.com/garmin/connectiq-companion-app-sdk-ios`.
- **`Toybox.Communications.transmit()`** on the watch side — sends messages back to the iPhone over BLE. Supports Strings, Numbers, Dictionaries, Arrays, ByteArrays (API 6.0+).

### Revised architecture

Closed-loop, all data flows through HITT — Garmin servers are not in the data path.

```
┌─────────────────────────────────────────────────────────────┐
│                  HITT iPhone (Capacitor)                    │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Custom Capacitor plugin wrapping ConnectIQ.xcframework│  │
│  └────────────────────┬──────────────────────────────────┘  │
│                       │ Bluetooth LE                         │
└───────────────────────┼──────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│             HITT Connect IQ app (Monkey C)                  │
│  - Receives triathlon plans + structured workouts via BLE   │
│  - Records activity via Toybox.ActivityRecording            │
│  - Sends summary + FIT chunks back via BLE                  │
└─────────────────────────────────────────────────────────────┘
                                                  ▲
                                                  │
                                                  │
            ┌─────────────────────────────────────┘
            │ HTTPS (from iPhone, not from watch)
            ▼
   ┌──────────────────┐
   │     Supabase     │
   └──────────────────┘
```

**This is structurally identical to how HITT's Apple Watch app works today** — `WCSession` between iPhone and Apple Watch, then iPhone uploads to Supabase. The only change is the transport (Connect IQ Companion SDK vs WCSession) and the watch runtime (Monkey C vs Swift).

### What we keep from the original plan

- All Phase 2 / 3 stories (CIQ-04 through CIQ-13). The on-watch experience — recording, HIIT interval engine, triathlon multi-sport, live data overlay, crash recovery, settings, multi-device test, store submission — is unchanged.
- The pair-code auth flow (revised CIQ-02) still works, just via Bluetooth instead of HTTP.
- The HITT theme + colors + manifest scaffold in `garmin/` is unchanged.
- The TAPI-04 workout schema mapping spec is **partially repurposed** — we still need to translate HITT workouts into a structured representation for the watch, just in our own JSON over Bluetooth instead of Garmin's calendar format. ~70% of TAPI-04's logic transfers.

### What we drop

| Story (original) | Status now | Reason |
|---|---|---|
| TAPI-01 Developer Program application | **Cancelled** | Program paused — no point applying |
| TAPI-03 `garmin-push-workout` edge function | **Cancelled** | No Training API to push to |
| TAPI-05 OAuth pairing flow | **Cancelled** | No Garmin OAuth without User API; auth happens between HITT and watch directly |
| TAPI-06 Activity API webhook receiver | **Cancelled** | No Activity API; activities arrive via the Connect IQ app over Bluetooth instead |
| TAPI-07 Daily workout-push scheduler | **Cancelled** | No calendar to push to |
| TAPI-02 Connect IQ Store developer account | **Still needed** | Connect IQ Store remains open |
| TAPI-04 Workout schema mapping | **Re-scoped** | Becomes "HITT workout → BLE message format" instead of "→ Garmin JSON" |

### New stories

#### CIQ-14 — Capacitor plugin wrapping `ConnectIQ.xcframework`

> **As** the HITT iPhone app, **I want** a Capacitor plugin that exposes Garmin watch discovery, pairing, and message send/receive, **so that** TypeScript code can talk to a HITT Connect IQ app on the user's Garmin.

- **Acceptance:**
  - New `src/plugins/GarminPlugin.ts` + native iOS shim under `ios/App/App/GarminPlugin.swift`.
  - Methods: `isAvailable()`, `discoverDevices()`, `connectDevice(uuid)`, `sendMessage(payload)`, `onWatchEvent((event) => ...)`.
  - iOS adds `ConnectIQ.xcframework` via SPM in `ios/App/Package.swift`.
  - "Uses Bluetooth LE accessories" added to Info.plist background modes.
  - Drop-in pattern mirrors the existing `WatchPlugin.ts` (Apple Watch bridge).
- **Effort:** 4 agent-days
- **Deps:** TAPI-02 (need the reserved app UUID for the Connect IQ side to match)
- **Agent:** Plan (architecture) → general-purpose

#### CIQ-15 — Watch ↔ phone message protocol

> **As** the system, **I want** a versioned message format between HITT iPhone and HITT Connect IQ app, **so that** both sides agree on workout/triathlon/event shapes.

- **Acceptance:**
  - Schema doc at `docs/specs/garmin_ble_protocol.md`.
  - Phone → Watch messages: `pushWorkout(workoutId, exercises[])`, `pushTriathlon(plan)`, `clearActive()`.
  - Watch → Phone events: `workoutStarted`, `workoutCompleted({fit_chunks, summary})`, `lapAdded`, `transitionEntered`.
  - Version field on every message; receiver tolerates unknown fields for forward-compat.
  - FIT files chunked (16KB chunks per `transmit()` call, reassembled phone-side).
- **Effort:** 2 agent-days
- **Deps:** none
- **Agent:** Plan → general-purpose

#### CIQ-16 — Phone-side FIT ingestion + Supabase upload

> **As** a user, **I want** my Garmin-recorded activity to appear in HITT seconds after I finish, **so that** I don't have to wait for any cloud sync.

- **Acceptance:**
  - On `workoutCompleted` event, iPhone reassembles FIT chunks, parses with a FIT JS library (e.g. `garmin-fit-sdk` via Capacitor or a small Swift FIT parser), extracts summary metrics + GPS track.
  - Posts to `/functions/v1/log-watch-workout` (already exists for Apple Watch — reuse).
  - Deduplicates against any HealthKit-derived copy of the same activity (start-time + duration match within 60s).
- **Effort:** 3 agent-days
- **Deps:** CIQ-14, CIQ-15
- **Agent:** general-purpose

#### CIQ-17 — Garmin Connect → Apple Health fallback path documentation

> **As** a Garmin user who doesn't have HITT's Connect IQ app yet, **I want** my Garmin activities to still flow into HITT, **so that** I get value before installing the watch app.

- **Acceptance:**
  - In-app help screen explaining how to enable Garmin Connect → Apple Health sync.
  - HITT detects HealthKit activities with source bundle `com.garmin` and attributes them.
  - Settings panel shows "Garmin → Apple Health sync working" / "not yet enabled" with a deep link.
- **Effort:** 1.5 agent-days
- **Deps:** none (independent path, useful immediately)
- **Agent:** general-purpose

### Revised delivery phases

#### Phase 0 — Foundation (revised)

| Story | Effort |
|---|---|
| TAPI-02 Connect IQ Store developer account (still needed) | 0.5 |
| CIQ-17 Garmin → HealthKit fallback help screen | 1.5 |
| CIQ-01 Connect IQ project scaffold (done — 2026-06-29) | ✓ |
| TAPI-04 Workout schema mapping (done — 2026-06-29, partial re-use) | ✓ |
| CIQ-15 BLE protocol design | 2 |

**Phase 0 total: 4 agent-days remaining** + Connect IQ Store account external wait

#### Phase 1 — MVP closed-loop (replaces old Phase 1)

| Story | Effort |
|---|---|
| CIQ-14 Capacitor plugin wrapping `ConnectIQ.xcframework` | 4 |
| CIQ-02 Pair-code login (now over BLE, not HTTP) | 2 |
| CIQ-03 Persistent storage layer | 1 |
| CIQ-04 Activity recording start/pause/lap/stop | 4 |
| CIQ-16 Phone-side FIT ingestion + Supabase upload | 3 |
| IOS-01 (revised) Garmin connection status — now shows BLE pairing status | 1.5 |

**Phase 1 total: 15.5 agent-days**

#### Phase 2 — Structured workouts (unchanged)

| Story | Effort |
|---|---|
| CIQ-06 Pull today's workout (from iPhone via BLE, not HTTP) | 1.5 |
| CIQ-07 HIIT interval engine | 4 |
| CIQ-08 Triathlon multi-sport (the owner's flagship — see §10) | 5 |
| CIQ-09 Live data overlay | 3 |

**Phase 2 total: 13.5 agent-days**

#### Phase 3 — Polish + store submission (unchanged)

| Story | Effort |
|---|---|
| CIQ-10 Crash recovery | 2 |
| CIQ-11 Settings | 1.5 |
| CIQ-12 Multi-device test matrix | 3 |
| CIQ-13 Connect IQ Store submission | 2 |

**Phase 3 total: 8.5 agent-days**

### Revised cumulative estimate

| Phase | Old plan | New plan |
|---|---|---|
| Phase 0 | 5.5 | 4 (+ done items) |
| Phase 1 | 22 | 15.5 |
| Phase 2 | 14 | 13.5 |
| Phase 3 | 8.5 | 8.5 |
| **Total** | **50** | **~41 agent-days** |

**~9 agent-days saved** by dropping the Training API path (it was 6 cancelled stories totalling ~13 days, partially offset by 3 new stories totalling ~9 days).

Calendar timeline also improves: **the longest external blocker (the Developer Program approval, weeks to months) is gone.** Only the Connect IQ Store developer account (days to weeks) and the eventual store-submission review remain.

Realistic end-to-end: **~2.5–3 months of focused work + 1–4 weeks of store review** = ~3–4 months to "available on Connect IQ Store globally," roughly 1–2 months faster than the original plan.

### What we lose by going Connect IQ–only

To be explicit:

1. **No HITT workouts in Garmin Connect's native calendar.** A user who never installs the HITT Connect IQ app won't see HITT workouts on their watch via Garmin's native workout player. The HITT app on the watch is the only way to access HITT plans.
2. **No automatic ingestion of activities recorded outside HITT.** If a user starts a regular Garmin "Run" activity from their watch (without using the HITT Connect IQ app), HITT only sees it via the Apple Health bridge — i.e. they need Garmin Connect → Apple Health sync enabled (which is the existing problem; CIQ-17 addresses it via in-app help).
3. **No direct Garmin health data** (steps / sleep / HRV / body composition). HealthKit is the only path; Garmin Connect iOS pushes these to Apple Health if the user toggles it on.

For HITT's actual use case — structured-workout brain on the wrist, triathlon race plan with auto-advance, post-activity sync — none of these losses matter materially. The Connect IQ app delivers the differentiated experience; the HealthKit fallback covers ad-hoc activities.

### Revised risk register (additions and removals)

- **R1 (Developer Program rejects application) — RESOLVED by removal.** No application needed.
- **R3 (EEA approval delays Europe launch) — Still applies** to the Connect IQ Store submission.
- **R4 (Device matrix breakage) — Still applies.**
- **R5 (Monkey C learning curve) — Still applies.**
- **NEW R14 — Connect IQ Companion SDK is open source but not heavily maintained.** Last release Jan 2026 (v1.8.0). If Garmin's iOS SDK falls behind iOS versions, our integration could break. Mitigation: pin to a known-working SDK version, smoke-test on each new iOS major.
- **NEW R15 — Bluetooth foreground requirements on iPhone.** Background BLE is supported but has caveats. iPhone needs "Uses Bluetooth LE accessories" capability and the app must be the active BLE central when the watch sends data. Mitigation: clear UX showing "open HITT to receive your activity" if foreground-required, and silent push to wake the app where possible.
- **NEW R16 — No native Garmin Connect data integration means HITT misses passive metrics for non-HITT users.** A Garmin user who wears the watch but doesn't run HITT activities still has rich data Garmin holds (sleep, HRV, etc.) that we can't access. Mitigation: lean on HealthKit's bridge; document the limitation in onboarding; revisit if Garmin reopens the program.

---

## 10. CIQ-08 confirmed — the owner's triathlon auto-advance use case

The owner asked whether Garmin can be made to sequence triathlon legs (preload distances → auto-advance → record everything in one session). Investigation (2026-06-30) confirms:

- **Native Garmin Multisport profile** — supports the activity type but no preloaded distances; user manages transitions manually or via unreliable GPS detection.
- **Training API** — doesn't accept multisport workouts at all. (Moot now anyway — program paused.)
- **Connect IQ app** — **yes**, this is the path. Uses a single `ActivityRecording.Session` with `SPORT_MULTISPORT`, manages leg state in Monkey C, calls `addLap()` when each preloaded distance is reached, updates the UI for the next leg.

CIQ-08 already covers exactly this. The 5-day estimate stands. The output is one FIT file tagged `SPORT_MULTISPORT` with laps — HITT shows clean per-leg metrics (it knows which lap is which leg from the plan we pushed); Garmin Connect sees one blended activity with laps. That trade-off is acceptable for our use case.

For users who want the cleaner Garmin Connect per-sport view on race day: in-app docs recommend they use Garmin's native Multisport profile and let the activity flow into HITT via the Apple Health bridge. Two paths, both supported.

### Additional sources (Revision A)

- [Connect IQ Overview (vs Developer Program)](https://developer.garmin.com/connect-iq/overview/)
- [Connect IQ Companion App SDK for iOS (GitHub)](https://github.com/garmin/connectiq-companion-app-sdk-ios)
- [Connect IQ Companion App Example iOS](https://github.com/garmin/connectiq-companion-app-example-ios)
- [Communicating with Mobile Apps — Connect IQ Core Topics](https://developer.garmin.com/connect-iq/core-topics/communicating-with-mobile-apps/)
- [Mobile SDK for iOS — Connect IQ Core Topics](https://developer.garmin.com/connect-iq/core-topics/mobile-sdk-for-ios/)
- [Connect Developer Program — paused](https://developer.garmin.com/gc-developer-program/)
- [Forum: GCDP access rejected without notification (2025)](https://forums.garmin.com/developer/connect-iq/f/discussion/434542/garmin-connect-developer-program---access-request-rejected-without-notification)
- [Forum: iOS Companion background execution](https://forums.garmin.com/developer/connect-iq/f/discussion/7533/ios-companion-app---background-execution-mode)
- [Toybox.ActivityRecording.Session (multisport recording)](https://developer.garmin.com/connect-iq/api-docs/Toybox/ActivityRecording/Session.html)
- [the5krunner — Garmin Auto Activity Detect Transition](https://the5krunner.com/2024/01/05/garmin-auto-activity-detect-transition-for-multisport-profiles-how-does-it-work/)
