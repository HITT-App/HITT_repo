# Garmin Connect Developer Program — Application Draft

**Purpose:** Pre-written answers for the Garmin Connect Developer Program application form. Fill in the bracketed `[FIELDS]` with your specifics before submitting. Reuse paragraphs verbatim where useful.

**Submit at:** https://developer.garmin.com/gc-developer-program/overview/
(Click "Get Started" → fill the form. Expect 2–8 weeks for approval; faster if the use case is clear.)

**Last updated:** 2026-06-29

---

## Pre-flight: things you need ready before you start

| Item | What you need | Status |
|---|---|---|
| **Company name** | Legal entity name. If sole-trader, your full legal name + trading-as. | `[FILL IN]` |
| **Company address** | Registered business address. Sole-traders: your residential or registered office. | `[FILL IN]` |
| **Privacy policy URL** | Public URL to HITT's privacy policy. Must explicitly mention third-party data sources (Garmin, Apple Health). | `[NEEDED — see §6 below]` |
| **Production callback URL** | Where Garmin will POST OAuth callbacks. Will be a Supabase edge function. | `https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-oauth-callback` (provisional — function not yet built) |
| **Webhook URL** | Where Garmin will POST activity-completion pings. Another Supabase edge function. | `https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-activity-webhook` (provisional) |
| **Technical contact** | Email of the person Garmin will reach if there's an integration issue. | `[FILL IN]` |
| **Business contact** | Same person or different — used for commercial conversations. | `[FILL IN]` |
| **Estimated active users in year 1** | Honest estimate; Garmin uses this to gauge capacity needs. Under-estimating is fine. | `[FILL IN — e.g. "100–500 in year 1, growing to ~5,000 by year 2"]` |

---

## Form answers

### Application name

> **HIIT Fitness**

### Application type

> Mobile + Web (iPhone-first via Capacitor, Supabase backend, planned Garmin Connect IQ companion).

### Platform(s)

> iOS (iPhone + Apple Watch), Garmin (Connect IQ + Training API / Activity API integration).

### Application URL

> [your HITT website URL — e.g. `https://hiitfitness.app`]

### Privacy policy URL

> [the URL where HITT's privacy policy is hosted — see §6 for what it must say]

### Brief description (1–2 sentences)

> HITT is a personalised HIIT and triathlon training app that builds structured workouts and race plans for users, with an AI coach that adapts plans to logged activity. We are integrating with Garmin to offer Garmin-wearing users a first-class experience: structured workouts delivered to their watch, and completed activities synced back to HITT.

### APIs requested

Check / request:

- ✅ **Training API** — required. Pushes structured workouts (intervals, distance / HR / power targets) into the user's Garmin Connect calendar so they appear on the watch.
- ✅ **Activity API** — required. Receives a webhook ping the moment a user finishes a Garmin-recorded activity; pulls the FIT file to populate the user's HITT activity history.
- ✅ **User API** — required. To resolve OAuth user identity to a Garmin user ID and basic profile.
- ◯ **Health API / Wellness API** — not requested in this phase. Day-to-day wellness (steps, HR, sleep) reach HITT via Apple HealthKit when the user enables Garmin Connect → Apple Health sync. We may request these in a future phase if direct Garmin → HITT wellness sync becomes a product need.
- ◯ **Courses API** — not requested in this phase.

### Detailed use case (~250 words — paste this in the "Describe your use case" field)

> HITT is a HIIT and triathlon training app launched on iOS in 2026. Our users are recreational and competitive athletes following AI-personalised training plans built around the user's goal (fat loss, endurance, race prep, etc.). The app produces structured workouts — HIIT interval blocks, paced runs, swim/bike/run brick sessions, full triathlon race plans — and tracks the user's completed activity to adapt the plan over time.
>
> A meaningful share of HITT's users wear Garmin watches and currently have to manage two systems: a HITT plan on their phone, and a separate Garmin Connect workout that they assemble themselves on the watch. We want to close that gap with a two-sided integration.
>
> **Outbound (Training API):** when HITT generates a workout, we push the structured version into the user's Garmin Connect calendar. The user syncs their watch as normal, and the workout appears on the wrist in Garmin's native workout player — work/rest intervals, distance targets, HR zones — exactly as HITT designed it.
>
> **Inbound (Activity API):** when the user finishes any activity on their Garmin (HITT-scheduled or otherwise), we receive the webhook ping, pull the FIT, parse summary metrics, and write the activity into the user's HITT history. This drives our AI coach's adaptation logic and removes the manual "log this activity" friction that exists today.
>
> Over time, a HITT Garmin Connect IQ app will handle the differentiated on-watch experience — HIIT-branded interval cues, triathlon transition flow — but the Training and Activity APIs are the foundation. They give every Garmin-owning HITT user a working integration on day one, regardless of which Garmin model they wear.

### OAuth callback URL

> `https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-oauth-callback`
>
> Implementation: Supabase edge function. Receives Garmin OAuth callback, exchanges request token for permanent token, stores `(garmin_user_id, oauth_token, oauth_secret)` against the HITT user ID. Tokens encrypted at rest via Supabase's column encryption.

### Webhook (ping) URL

> `https://pbrqdlkjoxvglcdlixbi.supabase.co/functions/v1/garmin-activity-webhook`
>
> Implementation: Supabase edge function. Verifies Garmin signature, pulls FIT, parses summary, idempotent insert into our `activities` table keyed on `(user_id, start_time, duration_seconds)`.

### Data handling and security commitments

Paste this verbatim if Garmin asks:

> HITT runs on Supabase (Postgres + edge functions, AWS us-east-1). All Garmin OAuth tokens are stored encrypted at rest using Supabase column-level encryption. TLS 1.2+ is enforced for all in-transit traffic. Activity data is scoped per-user with Row-Level Security policies — no user can read another user's Garmin-derived data. We retain activity data as long as the user holds an active HITT account; on account deletion we delete the user's Garmin tokens and activity records within 30 days. Users can disconnect their Garmin account at any time from HITT Settings, which triggers an immediate OAuth token revoke via Garmin's API.
>
> We do not share, sell, or resell Garmin-derived data with any third party. Garmin-derived activity data is used only to (1) display the user's activity history inside HITT, (2) feed our internal AI coach's plan-adaptation logic, and (3) compute aggregate stats that the user sees on their dashboard. The user is the sole consumer of their own data.

### Expected request volume

> Year 1: ~10,000 Training API pushes / month (one per user per scheduled workout, ~3–5 per user per week, ramping with user growth). ~10,000 Activity API pings / month (one per user per completed activity). Spikes around weekly cron firing (we push the next day's workout to Garmin Connect at 18:00 user-local, so traffic is staggered across timezones, not synchronised).
>
> Year 2 estimate: 5–10× the above if growth follows current trajectory.

### Test devices on hand

> Apple iPhone, Garmin [model — fill in if you have one, otherwise "We will be purchasing test devices for Forerunner / Fenix / Edge categories before submission to the Connect IQ Store"].

### Where will the app be distributed?

> - Connect IQ Store (global)
> - Connect IQ Store EEA distribution (submitted separately on approval)
> - Companion iPhone app via Apple App Store (already live in TestFlight)

### Anticipated launch date

> Track A (Training API + Activity API server-side integration): ~8–10 weeks after sandbox credentials issued.
> Track B (Connect IQ app on watch): ~4–6 months after sandbox credentials issued.

---

## 6. Privacy policy — what HITT's policy needs to say

If your existing privacy policy doesn't already cover these, Garmin's review will flag it. Add a "Third-party integrations" section with at minimum:

> **Garmin Connect**
>
> If you connect your Garmin Connect account, HITT receives the following data via the Garmin Connect Developer Program:
>
> - Your Garmin Connect user ID and basic profile
> - Completed activities (sport type, duration, distance, calories, heart rate samples, GPS track if recorded)
> - Workout completion confirmations against workouts HITT has pushed to your Garmin Connect calendar
>
> We send the following data to Garmin Connect on your behalf:
>
> - Structured workouts (intervals, distance / time / heart rate targets) that HITT generates as part of your training plan
>
> You can disconnect your Garmin Connect account at any time from HITT Settings → Connect Garmin. Disconnecting immediately revokes HITT's access to your Garmin data and deletes your Garmin tokens from our systems.
>
> Garmin's own privacy policy governs how Garmin handles data on its side: https://www.garmin.com/en-US/privacy/connect/

Add a similar block for Apple Health if it's not already in there.

---

## What happens after submission

| Step | What | Expected timing |
|---|---|---|
| 1 | You receive an automated email confirming submission | Immediately |
| 2 | Garmin assigns a developer-relations contact, may email follow-up questions about the use case | 1–2 weeks |
| 3 | Sandbox credentials (consumer key + secret) issued for testing | 2–4 weeks |
| 4 | You build against sandbox; Garmin's team reviews your integration on request | 4–8 weeks |
| 5 | Production credentials issued once integration passes review | 6–10 weeks |

We can start TAPI-04 (schema mapping design) and CIQ-01 (Connect IQ scaffold) in parallel while waiting on sandbox credentials — both are unblocked.

---

## What to do next, in order

1. **Fill in the bracketed fields** in this document.
2. **Confirm the privacy policy URL** is public and covers the Garmin third-party language in §6.
3. **Submit the application** at https://developer.garmin.com/gc-developer-program/overview/. Paste the long-form answers verbatim where the form asks for them.
4. **Email reply** if Garmin's developer relations team follows up with clarifying questions.
5. **Forward the sandbox-credential email** to me (Jeffrey/Claude) when it arrives — that unblocks TAPI-03 (the `garmin-push-workout` edge function).

The application itself is free. The Connect IQ Store developer account (TAPI-02) is a separate, independent application — file that on the same day from https://developer.garmin.com/connect-iq/ → "Start Developing".
