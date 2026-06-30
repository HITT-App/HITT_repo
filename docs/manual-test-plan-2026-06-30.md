# Manual Test Plan — Build 287 onwards (2026-06-30)

This plan walks through every fix shipped today across two builds (delivery UUIDs `9b505d5f...` and `ac1be0a7...`). Use it as a pre-promotion checklist before the build goes wider on TestFlight.

**Tester accounts available:**
- Production: `vanessajhutton@outlook.com` (your real user — 47 scheduled workouts)
- QA: `hitt.qa.test@gmail.com` / `HITTqa2026!test` (clean slate, no schedule)

**Hardware needed for full coverage:**
- iPhone (latest TestFlight build installed)
- Paired Apple Watch with HIIT Watch App installed (for Watch-side tests)

---

## ✅ Already verified via automation

The following are covered by the automated suite — no manual repeat needed unless something below behaves unexpectedly:

| ID | Coverage |
|---|---|
| Maestro `connected-devices.yaml` | Connected Devices page renders + Sync responds |
| Maestro `launch-card-activity.yaml` | ActivityLive pre-start renders correctly |
| Maestro `launch-card-workout.yaml` | WorkoutPlayer ReadyScreen renders correctly |
| Maestro `finish-activity.yaml` | Finish button → completion screen within 3s |
| Unit suite (32 tests) | WearableLaunchCard copy matrix complete for all activity × wearable combos |
| Source audits NF-01..04, WD-07..16, SCH-01..03 | All structural contracts green (84/122 passing, 17 pre-existing fails) |
| Verified live | #24 Jarvis ↔ wizard loop — returning to Jarvis on QA account does NOT show wizard ✓ |

---

## 🧪 Section 1 — App-level fixes (P0/P1)

### Test 1.1 — App tutorial doesn't reappear for returning users (#11)

**Setup:**
1. iOS Settings → General → iPhone Storage → HIIT → **Offload App**
2. Tap the HIIT icon to redownload from TestFlight

**Steps:**
1. Sign in
2. Walk through the welcome / tutorial overlay if it appears (don't skip — let it run)
3. Force-quit the app (swipe up from app switcher)
4. Re-launch

**Expected:** Tutorial overlay does NOT reappear. Welcome splash MAY appear (intentional once-per-session).

**Fail signal:** You see the multi-step walkthrough explaining bottom nav, Quick Add, etc. again.

---

### Test 1.2 — Jarvis ↔ wizard loop is broken (#24)

**Setup:** Use your real account (vanessajhutton@outlook.com) — you have 47 scheduled workouts which means the no-plan wizard *should not* appear.

**Steps:**
1. Open Jarvis from anywhere in the app
2. Tap X (top-left)
3. ✅ Land on home
4. Re-open Jarvis
5. Tap X again

**Expected:** No wizard loop. Each X lands you cleanly on home. Jarvis doesn't keep re-opening the workout-builder wizard.

**Fail signal:** Bouncing between Jarvis and a "Let's add a plan" wizard.

---

## 🏗️ Section 2 — Schedule page fixes (P1)

### Test 2.1 — Delete the "Up next" workout (#26)

**Steps:**
1. Open the **Schedule** tab
2. Find the "Up next" hero card at the top (orange card with the next-up workout)
3. Tap the ⋯ menu (top-right of the hero card)
4. Tap "Remove from schedule"
5. Confirm

**Expected:** The up-next item is deleted. The next workout in your schedule becomes the new "Up next".

**Fail signal:** No ⋯ menu visible on the hero card, OR menu opens but Remove doesn't work, OR Remove only works on per-day rail rows.

---

### Test 2.2 — Reschedule from home opens the date picker (#27)

**Steps:**
1. Open **Home**
2. Scroll to the Schedule card (showing your next workout)
3. Tap "Reschedule"

**Expected:** Lands you on the Schedule page with the 28-day date picker open, pre-targeted to that specific workout. Picking a new date moves it.

**Fail signal:** Lands you on Schedule page with NO picker visible, just sitting there.

---

## ⌚ Section 3 — Apple Watch fixes (P2/P3)

### Test 3.1 — Watch Today screen shows REAL stats (#15)

**Steps:**
1. On your Apple Watch, open the HIIT Watch App
2. You should land on the Today tab (first horizontal page)

**Expected:** Real numbers from Apple Health:
- Steps: today's actual step count (not `8214`)
- Calories: today's active kcal (not `612`)
- HR: latest sample (not `72`)
- Streak: consecutive days with a workout (not `12d`)

If you've done nothing today, expect 0s — that's correct.

**Fail signal:** Exactly `8214 / 612 / 72 / 12d` displayed — those were the placeholders.

---

### Test 3.2 — Horizontal swipe locked during active workout (#16)

**Steps:**
1. On the Watch, swipe to the **Workout** tab (middle page)
2. Tap a sport (Walk, Run, etc.) → countdown starts
3. **During the 3-2-1 countdown**, swipe horizontally (left or right) with intent
4. Continue into the workout proper
5. Try horizontal swipes again

**Expected:**
- During countdown: swipe blocked. Countdown continues uninterrupted.
- During workout: swipe blocked, you stay on the workout view.
- Vertical swipes (between metrics / HR / controls) still work.
- Tap controls (Pause, End) still respond.
- After ending the workout, horizontal swipe back to Today tab works again.

**Fail signal:** Swipe takes you to Today or Triathlon tab; countdown resets to 3; you have to restart.

---

### Test 3.3 — Back-to-back workouts wait for HK teardown (#14)

**Steps:**
1. On the Watch, do a short workout (~30 seconds Walk)
2. End the workout
3. **Within 5 seconds**, on the iPhone tap any "Start on Apple Watch" button (e.g. Triathlon or a GPS activity)

**Expected:** Watch eventually accepts the second workout. There may be a brief delay (~3-8s) — the iPhone is waiting for HealthKit to finish persisting the previous session.

**Fail signal:** Silent failure, error toast, Watch doesn't wake up, second workout doesn't start.

---

## 📱 Section 4 — Triathlon (P3)

### Test 4.1 — Friendly toast when Watch unreachable (#12)

**Setup:** Either unpair your Apple Watch OR uninstall the HIIT Watch App temporarily. (Or use an account on an iPhone with no Apple Watch paired.)

**Steps:**
1. On iPhone, navigate to Triathlon
2. Tap "Start Race on Apple Watch"

**Expected:** Toast appears:
- Title: *"Couldn't reach your Apple Watch"*
- Description: *"Make sure the HITT Watch app is installed on your paired watch and try again."*

**Fail signal:** A long, scary toast containing `native=true · watchAvail=... · pluginsKnown=...` (the old diagnostic dump).

---

## 🐞 Known issues NOT in scope for this round

| Task | Status |
|---|---|
| #25 — HIITLiveActivityExtension crashes on iOS 26 simulator | Pre-existing sim quirk, doesn't affect real-device TestFlight builds |

---

## Reporting failures

For each failing test, capture:
1. **Test ID** (e.g. "1.2")
2. **What you saw** (one sentence)
3. **Screenshot or short screen recording** if visual
4. **Repro consistency** (every time / sometimes / once)

Drop this in your usual notes — the developer will create a tracked task per real bug.

---

*Generated 2026-06-30 — covers commits 04d4acb through 7b58401 (8 fixes + 1 audit suite expansion).*
