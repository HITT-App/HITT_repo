# PARKED SPEC — Unified Logging Confirmation Pop-up (food + activity)

Status: PARKED. Captured for scheduling by the PM. Not yet sequenced.

## Why this exists

The recurring nutrition bugs (BUG1 double-logging, A23 Jarvis-reads-chat-not-diary)
share one root cause: food information lives in two places that disagree — the chat
history (time-blind, repeated, garbled by voice input) and `meal_logs` (the actual
truth). Every fix that tried to make the AI prefer one source while both were in
context proved unreliable.

This pop-up cuts the knot: food/activity specifics never become permanent chat
messages, so the chat can never act as a competing record. `meal_logs` becomes the
single source of truth. The chat shows only a neutral receipt.

## Core behaviour

When the user asks Jarvis to log a food OR an activity (by voice or text):

1. The AI parses the item and produces an estimate (food: calories in + macros;
   activity: calories out + duration/type).
2. Instead of writing to the database automatically, a confirmation POP-UP appears
   over the chat showing:
   - What the user said (the parsed item)
   - The estimate: calories in (food) or calories out (activity), plus key detail
   - Confirm and Cancel actions
3. NOTHING is written to `meal_logs` (or the activity log) until the user taps Confirm.
4. On Confirm: write the entry, dismiss the pop-up, post a NEUTRAL line in the chat
   (e.g. "✅ Food logged" / "✅ Activity logged") with NO specifics.
5. On Cancel: dismiss, write nothing, optionally a neutral "Cancelled" line or nothing.
6. The user's original food/activity-describing message and the AI's estimate detail
   do NOT persist in the chat history as food/activity references.

## Why this fixes the bugs (not just the feature)

- BUG1 (double-logging via reload or via questions): logging is no longer automatic.
  Even if the model mistakenly fires a log action on a read question ("what have I
  eaten today"), the worst case is a pop-up the user dismisses — no silent DB write.
  The human becomes the gate. This turns a data-integrity bug into, at worst, a minor
  "why did a pop-up appear" annoyance.
- A23 (Jarvis reads chat not diary): specifics are stripped from chat, so there is no
  competing chat-history food record. The diary block in the AI context is the only
  food source the model sees.

## Food + activity unification

One confirmation primitive, two uses:
- Food: shows calories IN, macros (protein/carbs/fat/fibre), meal category.
- Activity: shows calories OUT, activity type, duration.
This is a single reusable component, not two. Worth designing as one primitive.

## CRITICAL: design alongside A20 and A21 (do not triplicate)

There is real overlap risk. Three tasks would otherwise each build their own
"confirm/edit a food entry" surface:
- A20 (scan correction with context) — adds a confirm-and-correct step to the photo scan.
- A21 (edit/delete logged foods) — already built an edit sheet for logged food.
- This pop-up — confirms a chat-logged food/activity before saving.

These should share ONE confirm/edit surface where possible, not three slightly
different ones. The pop-up may be the shared primitive that A20's correction step and
the chat-logging confirm both reuse. Design this with A20 and A21 in mind, or
explicitly decide they stay separate and document why.

## Scope / size warning

This is a real feature, in the weight class of an A-task, NOT a patch. It touches:
- Chat flow (intercept the log action before DB write)
- Logging path (food + activity writes gated behind confirm)
- AI action handling (the AI proposes; it no longer auto-commits)
- Chat rendering (user's food message and AI estimate kept out of persistent history;
  neutral receipt posted instead)
- UI (the pop-up component itself, food + activity variants)

## Diagnose-first before building

Before implementation, get Claude Code to report:
1. How does the current `log_food` action flow from AI output to DB write? Where exactly
   does the write happen (the intercept point for the pop-up)?
2. Is there an equivalent activity-logging action/path? Where does it write?
3. How is the user's message currently stored vs rendered? What would it take to keep
   a message out of persistent history while still showing a transient/neutral version?
4. Does A21's existing edit sheet have a shape the pop-up could reuse?

## Interim safety note (separate from this build)

Until this pop-up exists, the half-fixed A23 state (deployed edge function + committed
`useAI.ts` synthetic-flag change) can double-log via questions. The clean safe state is
to revert to build 118, where BUG1 was closed, and park A23 entirely. Decide this
independently of when the pop-up is scheduled.

## Pass criteria (for when it's built)

- Asking Jarvis to log food shows a pop-up with item + estimated calories in; nothing
  saved until Confirm.
- Asking Jarvis to log an activity shows a pop-up with item + estimated calories out;
  nothing saved until Confirm.
- After Confirm: entry appears in the diary/log; chat shows only a neutral receipt with
  no food/activity specifics.
- After Cancel: nothing is saved.
- Asking a READ question ("what have I eaten today") never silently writes an entry. If
  the model wrongly proposes a log, it surfaces as a dismissable pop-up, not a DB write.
- Force-quit/reopen does not re-log (BUG1 stays closed because writes require confirm).
