# Google Play — Health Connect data-access declaration

**Filed via:** Play Console → App content → Health Connect permissions declaration
**Reviewer wait:** typically 2–6 weeks per Google Play policy. File as soon as an AAB with these permissions is uploaded (versionCode 6 or later).

> **Rejected 2026-08-01 — `HeartRateVariabilityRmssd` removed.** Google Play rejected the
> declaration under the Health Connect **Minimum Scope** policy: HRV was requested but no
> feature consumed it. The justification previously written here claimed it fed a "daily
> recovery / readiness score shown on the health metrics dashboard" — **that screen does not
> exist**, and nothing ever wrote HRV to `health_metrics`. It has been removed from the
> manifest, from the app's permission request, and from this document.
>
> **The lesson: every permission below must map to a screen a reviewer can actually open.**
> Do not write a justification for a feature that is planned rather than shipped.

For each permission below, paste the answer into the corresponding form field. Google's questions vary slightly; use the "Purpose" as your primary answer and "Data flow" if a follow-up asks about processing/storage.

---

## Reads

### 1. `READ_EXERCISE` (workouts / activity sessions)

**Purpose:** Show the user their own workout history from Google Fit / connected wearables (Garmin, Fitbit, Wear OS, Whoop, Oura) inside the HIIT Fitness app. Powers activity dashboards, streak / consistency tracking, and the AI Coach's context for personalised recommendations.

**Data flow:** Sessions read into the app UI, cross-referenced against workouts the user recorded directly in HIIT, and stored server-side in Supabase against the signed-in user's own row so the same view is available across devices. Not shared with any third party, not used for advertising, not sold.

---

### 2. `READ_STEPS`

**Purpose:** Contribute the user's daily step count into their HIIT Score and activity dashboard. Used to spot low-activity days for coaching prompts.

**Data flow:** Aggregated daily totals stored in Supabase against the signed-in user. UI only. Not shared, sold, or used for ads.

---

### 3. `READ_HEART_RATE`

**Purpose:** Show live and post-workout heart rate on the activity dashboard and workout completion screens. Feeds into AI Coach effort analysis ("your average HR was 158 bpm — solid Zone 4 effort").

**Data flow:** Individual samples stored against the user's activity_logs row in Supabase. Not shared. Not used for advertising or third-party analytics.

---

### 4. `READ_RESTING_HEART_RATE`

**Purpose:** Display resting heart rate as a wellness trend metric on the health metrics dashboard. Long-term downward trend is a coaching signal (improved cardiovascular fitness).

**Data flow:** Stored in the user's health_metrics table server-side. Only visible to the signed-in user. Not shared.

---

### 5. `READ_SLEEP`

**Purpose:** Show sleep duration and stages on the sleep dashboard. The AI Coach uses recent sleep data to adjust workout recommendations (light day after poor sleep).

**Data flow:** Nightly summaries stored in sleep_logs against the signed-in user. Not shared with any third party. Optional per-user setting to send to the AI provider (see AI opt-in policy).

---

### 6. `READ_WEIGHT`

**Purpose:** Display weight trend on the health metrics dashboard and factor it into calorie / macronutrient targets.

**Data flow:** Stored in the user's health_metrics table server-side. Personal to the signed-in user; not shared.

---

### 7. `READ_BODY_FAT`

**Purpose:** Display body composition trend and use the value to refine calorie / macronutrient targets and coaching progress language.

**Data flow:** Stored server-side against the signed-in user. Not shared.

---

### 8. `READ_TOTAL_CALORIES_BURNED`

**Purpose:** Show total daily energy expenditure on the activity dashboard. Used as one input to the daily calorie balance calculation with nutrition logs.

**Data flow:** Aggregated daily totals stored server-side. UI only. Not shared.

---

### 9. `READ_ACTIVE_CALORIES_BURNED`

**Purpose:** Show workout-driven calorie expenditure separately from total, so the user can see how much of their calorie burn was from activity vs. baseline metabolism.

**Data flow:** Per-workout values stored in activity_logs. Not shared.

---

### 10. `READ_DISTANCE`

**Purpose:** Display distance covered per activity session (runs, walks, rides) and total weekly distance for milestone tracking.

**Data flow:** Per-activity values stored in activity_logs. UI + personal weekly reports. Not shared.

---

## Writes

### 11. `WRITE_EXERCISE`

**Purpose:** When a user records a GPS activity (run, walk, cycle) directly in HIIT Fitness, write it back to Health Connect so it appears in Google Fit's activity ring alongside workouts from other apps.

**Data flow:** One write per completed activity, at the moment the user taps Finish. Write is scoped to the user's own Health Connect data. Not shared.

---

### 12. `WRITE_DISTANCE`

**Purpose:** Attach the GPS-measured distance to the exercise session written above so Google Fit shows the correct distance value.

**Data flow:** Written alongside the ExerciseSessionRecord above. Not shared.

---

### 13. `WRITE_ACTIVE_CALORIES_BURNED`

**Purpose:** Attach the calorie estimate for the completed exercise session so Google Fit's daily calorie burn total reflects the HIIT-recorded activity.

**Data flow:** Written alongside the ExerciseSessionRecord above. Not shared.

---

## Cross-cutting answers

Some Play Console questions apply to all permissions at once:

- **Do you sell health data?** No.
- **Do you share health data with third parties?** No, with one narrow user-opt-in exception: when the user turns ON "Use my health data for AI coaching" in Settings (default OFF), a subset of activity / heart rate / sleep is sent to Google's Gemini API for personalised coaching responses. Not used for advertising, not used to train Google's general models (contractually prohibited under Google's API terms). See privacy policy §3.7.
- **Do you use health data for advertising or cross-context behavioural advertising?** No.
- **Retention:** health data is retained for as long as the user keeps their HIIT Fitness account. The user can delete their account (and all associated data) at any time from the app's Settings screen.
- **Security:** stored in Supabase (EU region) with row-level security scoping every row to its owning user. HTTPS in transit. Database at-rest encryption via Supabase's managed Postgres.
- **Privacy policy URL:** https://www.hiituk.com/privacy
