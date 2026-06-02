# USER-MD ARCHITECTURE SPEC (the "glue")

Status: LIVE (un-parked, MVP). This is the anchor doc for the user-MD effort.
Vanessa's call: Jarvis knowing who the user is, what they're doing, and their goals
IS the MVP. The MD is the glue that makes that true.

## The problem this solves

Diagnostic finding (the through-line across every AI tool): the tools work, but what
they LEARN is discarded or siloed, and almost none of it reaches Jarvis.

- Body scanner: generates rich analysis (body fat, muscle development, posture,
  recommendations) → persists ONLY the body-fat number → rest discarded → none reaches Jarvis.
- Goal planner: collects goals conversationally → no dedicated write-back → goals only
  live in workout_preferences from onboarding.
- Meal: food scanner logs to meal_logs → DOES reach Jarvis (A23 diary block) — the one
  bright spot, and the template for how the MD should work.
- Workout planners: two of three generators return ephemeral data, never persisted as a
  workout definition.
- Memory: localStorage only (hiit-ai-custom-memory), device-specific, no DB backing.

Result: Jarvis is effectively amnesiac. It cannot say "your last scan showed weak
posterior chain" or "last month you wanted to lose 5kg, you're 2kg down."

## The hard-won design principle (from the A23 saga)

The MD is only as good as its inputs, AND the inputs must reach Jarvis through the
STRUCTURED PATH (server-side context injection), the same mechanism the A23 diary block
uses. NEVER by scraping chat history.

Chat history is time-blind, repeated, and garbled by voice input. Any architecture that
lets the MD, the chat history, and the live DB disagree will recreate the A23 mess at a
larger scale. The MD must be built from AUTHORITATIVE sources (DB, saved scan results,
saved goals) and injected server-side, exactly like the diary block.

## Build order (data-first)

### Stage 1 — Stop discarding the inputs (PREREQUISITE)
The MD can't read what isn't saved. Fix the two biggest holes first:
- **1a. Persist the full body-scan analysis** (not just body fat). The analysis is
  already generated; we're saving what's currently thrown away. Near-free, purely additive.
- **1b. Goal write-back.** Add a way for a goal stated to Jarvis to durably save (a
  set_goals action or equivalent), so goals aren't trapped in onboarding-only
  workout_preferences.

### Stage 2 — Build the MD document
A single, database-backed (NOT localStorage) user profile/memory doc, assembled from
authoritative sources:
- Body-scan analysis (from 1a)
- Saved goals (from 1b + workout_preferences)
- Today's / recent meal_logs (already authoritative, A23)
- Workout history
- Any durable facts worth keeping from chat (added deliberately, not scraped)

### Stage 3 — Feed the MD to Jarvis via the structured path
The MD reaches the model the SAME way the A23 diary block does: injected server-side into
the structured context in ai-coach, positioned for weight (the A23 splice lesson). NOT
pulled from chat. This is the step that makes Jarvis actually know the user.

### Stage 4 — Keep the MD current
When a tool produces new info (new scan, changed goal, completed plan, etc.), the MD
updates. This is the "continuous" part. Decide update triggers (on tool completion) vs
periodic rebuild.

### Stage 5 — The unified surface (A3)
Surface unification (text input, Features tiles wired, mic press-and-hold, retire
/ai-coach). Exposes the tools that feed the MD. Deliberately LAST: a polished shell around
an amnesiac Jarvis is worth less than a plain shell around a Jarvis that knows you. The
MVP (Jarvis knowing the user) is Stages 1-4; the surface is how users reach it.

NOTE: Stage 5 can be moved to FIRST if the visible unified surface is wanted early for
testing/daily use — it does not block Stages 1-4 (tools work from current entry points).
PM's call.

## A3 surface unification — already-mapped facts (for Stage 5)

- Keep `useAI` (has structured path, A23 diary work, action cards, synthetic-flag fix).
  Retire `useAIChat`.
- Carry over from /ai-coach: ChatInput (text field) + image upload (add imageData to
  useAI.send/runStream). Discard the rest (history sidebar, detectRichContent, VoiceMode,
  CoachOnboarding component, quota display, ChatContainer).
- Tab shell: AISurface reused. Coach → "Features". Settings tab to be filled.
- MyConversations: RETIRED (Vanessa's call; singleton Jarvis model).
- Mic change: tap-once-auto-stop (ElevenLabs VAD) → press-and-hold (onPointerDown/Up),
  grab accumulated transcript on release, ~150-200ms debounce to avoid truncation. Likely
  needs on-device feel-tuning.
- Retire /ai-coach LAST. Repoint list (from diagnostic Q6): QuickActionsSheet,
  AICoachSection, MealDetail (add prefill), MyConversations (retire), App.tsx route,
  FloatingActionButton + AppLayout hide-lists, routes.ts constant (dead code). Delete:
  AICoach.tsx, useAIChat.ts, ChatContainer.tsx, VoiceMode.tsx, CoachOnboarding component.

## Open decisions still needed
- Settings tab contents: existing voice/chat settings, or new AI-function-management
  controls? (Define concretely before specing Stage 5 Settings.)
- Stage 4 update strategy: event-driven on tool completion vs periodic rebuild.
- Where the MD lives (table/format) — settled during Stage 2 design.

## Cross-references
- See PARKED-logging-confirmation-popup.md — the logging pop-up interacts with how chat
  vs DB truth is handled; relevant to Stage 1b and the "don't scrape chat" principle.
- A23 (shipped, edge function side) is the working template for Stage 3.
