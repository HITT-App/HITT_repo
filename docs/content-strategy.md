# HIIT App — Content Strategy & MVP Plan

This document outlines what content the HIIT app needs to launch, how much of it must exist as curated static data, and how the rest can be generated on demand by AI. It also covers the safety rails required before any AI-generated content is exposed to users.

Context: the app as handed over is a functional shell with schema, auth, UI scaffolding, and an AI coach — but zero seed content (no workouts, no recipes, no badges, no coaches). This plan assumes a limited content budget and prioritises the minimum set needed to demo, TestFlight, and submit to the App Store without the app feeling empty.

---

## TL;DR

- Launch with **~20 curated workouts, 30 recipes, 20 badges, and an AI coach** — no real coach profiles in v1.
- Wire **Open Food Facts** (free, 2M+ products) into the barcode scanner to solve the "empty food DB" problem with zero manual curation.
- Build **AI workout-plan and meal-plan generators** that assemble plans from the curated catalogue rather than inventing from scratch — safer, cheaper, higher quality.
- Hard guardrails around AI: allergen filtering happens in the database query, never in the LLM prompt. Disclaimers and medical exclusions are mandatory.
- Estimated cost of AI generation at 1,000 active users: **~£60/month**.

---

## Part 1 — Minimum static content for MVP

The app must feel inhabited on first open. Numbers below are a judgement call and can be tuned.

### Workouts — 20–30 items

| Category | Count |
|---|---|
| HIIT (brand hero) | 6 |
| Strength (upper / lower / full-body / core) | 4 |
| Cardio (run / cycle / row / jump) | 4 |
| Mobility / stretch | 3 |
| Cool-down / recovery | 3 |
| Warm-up | 3 |
| Beginner-adapted versions | 3–5 |

Cover three difficulty tiers (beginner / intermediate / advanced). Each row needs: title, description, duration, difficulty, body areas, equipment list, thumbnail image, video URL.

**Video is the expensive bit.** Options:

1. **Founder-filmed bodyweight videos** — 20 short workouts recorded on a phone in a single afternoon. Free, fastest, reinforces the "built by a real founder with 10 years of social-media experience" story for investors.
2. **YouTube embeds** from public instructors — check licensing, but linking to public videos is generally acceptable.
3. **Stock fitness video pack** — £200–£500 for a licensed library.

Non-video fields (titles, descriptions, exercise sequences, tags, calorie estimates) can be drafted with an LLM from a list of workout types, saving significant writing time.

### Exercises — 30–50 individual moves

Each workout breaks into exercises with reps/sets/duration. For MVP these can be static descriptions; animated GIFs can come later. The **ExerciseDB** and **Free Exercise DB** datasets on GitHub are MIT-licensed and provide ~1,300 exercises with GIFs — use as a starter set and customise to the brand.

### Meals / recipes — 30 curated

Breakdown: 8 breakfast / 8 lunch / 8 dinner / 6 snack. Each with title, ingredients, calories + macros, one image. Pull the first pass from **Spoonacular** or **Edamam** (free tiers) and edit to brand voice.

For food logging, integrate **Open Food Facts** (free public API, 2M+ UK/EU products with nutrition data). This is ~1 day of work and completely solves the barcode scanner's empty-database problem.

### Badges — 15–20 predefined

Streak-based (3 / 7 / 30 / 100 days), workout-count milestones (10 / 50 / 100 done), category milestones (first HIIT, first cardio), nutrition (7-day protein goal hit), social (first community post). Pure text plus icon — can be authored in one sitting.

### Coaches — skip for MVP

The proposal positions the AI as the "coach". Shipping with two or three stock coach profiles tends to feel tacky and invites awkward questions. Recommended: **launch with AI Coach only**, add real coach profiles once there is subscriber volume to justify a marketplace.

### Articles / courses / workshops — skip for MVP

The stub pages in the codebase can be hidden behind a feature flag until post-launch content is ready.

---

## Part 2 — AI-on-demand plan generation

The founder's suggested flow ("user asks for a week of stamina-focused workouts → AI assembles a plan based on their fitness level") is the right shape. Three ways to implement it, in increasing complexity:

### Option A — Pure AI generation (not recommended)

LLM generates the entire plan from scratch, inventing workouts that may not exist in the catalogue.

- Flexible in theory
- Prone to hallucinated exercises — users tap through and find nothing
- Harder to vet for safety
- Output formats drift, breaking the client

### Option B — AI assembles from the static catalogue (recommended)

The LLM is given the full list of curated workouts plus the user's profile. Its job is to **pick and sequence**, not invent.

Prompt shape:

> User goal: improve stamina. Fitness level: intermediate. Availability: 4 sessions/week × 30 minutes. Here are the 28 workouts in our catalogue. Build a 7-day plan using only these IDs. Output JSON matching this schema.

- Safe by construction — users only ever see workouts that actually exist
- Output is structured JSON, validated against a schema before saving
- Cheap (~£0.03 per plan)
- Quality improves automatically as more workouts are added to the catalogue

### Option C — Hybrid (Option B + micro-tweaks)

LLM picks from the catalogue and suggests per-user adjustments (intensity, reps, duration) that attach to the plan as metadata without modifying the base workout. Nice polish for v1.1 but adds complexity — defer.

### The end-to-end workflow

```
User taps "Generate my week"
  →
  Client POST /functions/v1/generate-workout-plan
    { goal: "stamina", days: 7, sessions_per_week: 4, duration_minutes: 30 }
  →
  Edge function:
    1. Fetch user profile (fitness_level, assessment data, workout history)
    2. Fetch current workouts catalogue (id, title, category, difficulty, body_areas)
    3. Fetch user restrictions (allergens, injuries, disabilities)
    4. Build prompt with { profile, catalogue, constraints, output schema }
    5. Call LLM (Claude Sonnet) in JSON mode
    6. Validate response: every referenced workout_id exists, no duplicates,
       intensity matches fitness_level, schedule fits days × duration
    7. If validation fails → retry once with the error as feedback
    8. Insert into user_workout_plans and user_workout_plan_items
    9. Return plan to client
  →
  Client renders the plan; user can accept, edit, or regenerate
```

The same pattern works for meal plans, with the critical addition of allergen filtering at the query layer (see safety section below).

### Cost estimate

Using Claude Sonnet pricing (~$3 / $15 per million input/output tokens):

- One weekly workout plan ≈ 1K input + 2K output tokens ≈ **~£0.03 per plan**
- 1,000 active users × 2 plans/week ≈ **~£60/month in LLM costs**
- Can be capped by subscription tier: e.g. 5 regenerations/month free, unlimited on Premium — aligning AI costs with the revenue model

---

## Part 3 — Safety rails (non-negotiable)

Before any AI-generated plan reaches a real user, the following must be in place:

1. **Disclaimer.** Every AI-generated plan shows: *"This plan is AI-generated for informational purposes. Consult a qualified professional before starting any new exercise or nutrition programme, especially if you have existing health conditions."* First-use acceptance required.

2. **Allergen filtering in the query layer, not the prompt.** Never trust the LLM to remember that a user is allergic to peanuts. Pre-filter candidate recipes in the database query *before* the LLM sees them. (This is the standard practice from food-safety-critical apps — the LLM is not a safety boundary.)

3. **Injury / condition respect.** The existing 20-step onboarding captures some of this. When generating, exclude plyometric / high-impact workouts if the user has flagged a knee injury, etc.

4. **Output validation.** Every AI response runs through a schema check before being persisted. Reject-and-retry rather than silently storing malformed data.

5. **Audit log.** An `ai_generation_log` table stores every prompt + response pair. Cheap to maintain, essential if a user later claims the app suggested something harmful.

6. **Medical exclusions at sign-up.** Ask if the user has any of: pregnancy, cardiac conditions, eating disorders, chronic illness. If yes, show a "this app is not a substitute for your specialist" interstitial and soften all recommendations accordingly.

---

## Part 4 — Proposed build sequence

Each step below can be executed without waiting on content from the founder or owner. Steps 1–4 are concrete engineering tasks; step 5 is the founder's video production.

1. **Seed migration.** Ship a SQL migration that populates 20 starter badges and 20 placeholder workouts (with blank video URLs for now). Every new Supabase project applies this on `db push`, so the app is never empty again. **Half a day.**

2. **Open Food Facts integration.** Replace the hardcoded `lookup-barcode` edge function with real calls to the Open Food Facts API. The barcode scanner works end-to-end. **Two to three hours.**

3. **`generate-workout-plan` edge function + tables.** New tables (`user_workout_plans`, `user_workout_plan_items`), Option B workflow above, schema validation, JSON-mode LLM call, UI button. **Half a day.**

4. **`generate-meal-plan` edge function + tables.** Same pattern, with allergen filtering in the candidate-set query and the extra safety rails from Part 3. **One day.**

5. **Founder films the 20 workouts** on a phone in a single session. Uploads to YouTube (unlisted). Seed migration updated with the real video URLs and pushed.

After these five steps the app has: a credible workout catalogue, working barcode food logging, AI-personalised plans in both dimensions, and enough badges to keep users engaged for weeks. That is a defensible MVP for both investors and the App Store reviewers.

---

## Content ownership and handover risks

- The handed-over codebase included no seed content and no handover documentation.
- API keys for the previous LLM provider (Lovable), ElevenLabs, and VAPID push notifications are not recoverable; these are being replaced with keys under the new owner's accounts.
- Nine existing edge functions call Lovable's AI gateway — these need to be swapped to a direct Anthropic (or equivalent) integration before any cutover to production, since Lovable access will be terminated.

A separate handover gap log lives in `OWNER_DECISIONS.md`.
