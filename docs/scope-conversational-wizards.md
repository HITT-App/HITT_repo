# Scope: Converse first, offer wizards second

---
## STATUS — decisions & what shipped (last updated 2026-07-05)

**Phase 1 — SHIPPED (edge-only, live on `ai-coach`, no TestFlight rebuild):**
- ✅ Converse-first meal flow — coach discusses targets, then offers the wizard underneath
  (removed the "output only the tool call, no text" gag).
- ✅ Invariant preserved — LLM never generates meals; wizard → food DB is the only path.
- ✅ Deterministic wizard backstop, conversation-scoped (last 3 user turns).
- ✅ Informed-autonomy four-state safety gate: **safety-hold › context-hold › serve-with-caveats
  › converse+offer**. Trigger threshold: **< 1200 kcal flat**.
- ✅ ED/self-harm keyword suppressor (blocks plan + wizard, supportive reply).
- ✅ Bug fixed via live smoke test: `extractExplicitMealTargets` now parses "calorie" (singular).
- ✅ Verified: `tests/smoke-meal-safety.ts` **5/5 passing** against the deployed function.

**Phase 2 — DEFERRED (needs front-end → TestFlight rebuild), build "if needed":**
- ⏳ Goal-wizard offer card + `open_goal_wizard` action.
- ⏳ Compact offer-card-then-expand affordance for both wizards.
- ⏳ Onboarding decoupling into 3 independent wizards (goal / body scan / workout) — its last
  coupling (`showGoalWizardPrompt`) lives in the front-end.

**Tracked follow-up tasks (separate work):**
- Task #1 — better ED detection (classifier vs keywords) + surface crisis-support resources.
- Task #2 — in-app contact/support + reporting flow (cancel, report community user, bug, wellbeing).

**Key decisions of record:**
- Meal plans are wizard→DB only — never re-add LLM meal generation (guards the old
  dropped-request bug).
- Safety = informed autonomy, not nannying: ask for context, honour a considered reason
  (fasting/supervised) with caveats, only hold back on absent/harmful rationale.
- Numeric fast-path stays instant (not routed through conversation) except when it trips
  safety/context hold.

Design detail follows below.

---

**Goal:** Stop the AI coach from firing a popup the instant a user mentions food or a
goal. Instead, have it hold a natural coaching conversation about the goal and the plan,
then — at the end of its answer — *offer* the meal wizard and/or goal wizard as
dismissible cards underneath the message.

**Example that must change**
User: *"I'm 88kg, 5'11", 30, male. Give me a diet plan for bodybuilding to put on 5kg of
muscle over the next four months."*

- **Today:** instant popup asking them to pick a calorie amount. No coaching, no numbers,
  no discussion.
- **Wanted:** the coach talks it through — estimates his maintenance + surplus, gives a
  calorie/protein target, sketches the approach — then says *"I've got a meal wizard and a
  goal wizard that can lock this in — want to use them?"* with two dismissible cards below.

---

## How it works today (the three eager-fire paths)

All in `supabase/functions/ai-coach/index.ts` unless noted.

1. **Prompt forbids conversation.** `SYSTEM_PROMPT` line 398 and the injected routing
   message at line 2680 both say: *"call `open_meal_plan_wizard` … Output ONLY the tool
   call, no text."* So on any vague food mention the model emits the wizard action with
   **no coaching text at all** — the popup is the entire response.

2. **`open_meal_plan_wizard` tool** (line 675) is described as fire-on-mention: *"Call
   this when the user asks about meals, food, what to eat, or planning their nutrition."*
   The 88kg example trips "diet plan" → wizard.

3. **Regex fast-path** (`extractExplicitMealTargets`, line 699; invoked line 2715). If the
   user types explicit numbers ("2500 cal", "200g protein"), the server builds the plan
   from the owner recipe library and returns it **without ever calling the LLM** — so even
   the numeric path can't converse.

### What already works in our favour

- **Text + card can coexist in one turn.** `buildStructuredStream` (line 1858) streams
  text deltas first, then emits tool calls as `action` events afterward. The prompt even
  says "You CAN call a tool alongside your text response" (line 491). The only reason meal
  plans don't is the explicit "no text" override.
- **Cards already render *below* the message, dismissibly.** In `JarvisMode.tsx` the
  action dispatch (lines 800–858) sets state (`showMealPlanWizard`, `pendingSchedule`,
  etc.) that renders each card as a block under the transcript. `JarvisMealPlanWizard`
  (rendered line 1338) is inline + has `onCancel`. So "drop it underneath, let them
  use or dismiss" is the existing pattern — no new plumbing.
- **The meal wizard loop is clean.** `JarvisMealPlanWizard.onSubmit(prompt)` feeds a
  numbers-filled prompt back into chat → hits the regex fast-path → plan renders. We keep
  this untouched; we only change *when/how* the wizard is offered.

### The gap: there is no goal wizard to offer

Goal-setting today is either the silent `set_goals` tool (→ `GoalConfirmCard`) or the
`/schedule-setup` page reached via the "Update your goals first?" gate
(`showGoalWizardPrompt`, JarvisMode line 1077). There is **no offerable "goal wizard"
card** the coach can surface at the end of a message. We need to add one (it can simply
deep-link to `/schedule-setup`, which is the real goal/plan setup flow).

---

## Non-negotiable constraint: do NOT resurface the old dropped-request problem

**This is a guard-rail, not a bug to fix.** There was previously a real problem where the
LLM, asked for a meal plan mid-chatter, would waver between *invoking a tool* and
*writing a plan on the fly* — sometimes spinning with no output and dropping the request,
sometimes returning a plan. **Introducing the meal wizard deliberately solved this**, by
removing meal-plan generation from the LLM's hands entirely. Since the wizard shipped,
requests are not being dropped. The redesign in this doc must **preserve that guarantee**.

### The invariant to keep

The LLM must **never be put in a position to choose** between "open the wizard" and
"generate a meal plan myself." Meal plans come exclusively from:
`open_meal_plan_wizard` → user picks targets → `onSubmit` prompt → server pulls real
recipes from the **owner/Spoonacular database** → `recommend_meal_plan` action
(server-emitted only). The AI never invents meals inline (free-text meals can't be logged
to nutrition anyway).

### How "converse first" must respect this

The risk in loosening the prompt to allow conversation is that we hand the LLM back the
"write it yourself" option. We don't. The rule the prompt rewrite (§A) must state
explicitly:

> *Discuss nutrition **strategy and numbers** in words (maintenance, surplus, protein/kg,
> timeframe) as much as you like — but you do **not** produce a meal-by-meal plan
> yourself. The meal wizard pulls real recipes from the database for that. Coach the
> approach, then offer the wizard.*

So conversation stays on strategy/targets; **generation stays 100% wizard→DB**, exactly as
today. The offer-card change (§A/§C) only affects *when* the wizard appears (after a
coaching sentence instead of instead of one) — it does not give the LLM a generation path.

### Minor tidy-up (optional, low priority — not a live bug)

Line **487** in `STRUCTURED_MODE_OVERRIDE` still references `recommend_meal_plan` as a
tool to "use," though it was removed from the callable list (line 639) and the strong
routing message at 2680 has empirically kept the model on the wizard path. It's a dangling
reference worth cleaning up **only if** we touch that block anyway — verify behaviour
stays wizard-only after any edit. Do not treat it as the cause of anything; nothing is
currently broken.

---

## Proposed change

### A. Reframe the wizards as *offers*, not *interrupts* (prompt + routing)

1. **Delete the "Output ONLY the tool call, no text" instructions** (SYSTEM_PROMPT line
   398; injected message line 2680). Replace the meal-plan section with: *answer the
   coaching question first — compute real numbers (maintenance, surplus, protein target,
   timeframe), discuss the approach in the normal short format — and only then, if a plan
   or goal would help, offer the relevant wizard.*

2. **Split the trigger from the answer.** New rule: a bare mention of food/goals is a cue
   to **coach**, not to fire a tool. Fire the wizard tool only as a closing offer, and
   keep emitting the coaching text in the same turn (already supported).

3. **Retune the tool descriptions** (`open_meal_plan_wizard`, and a new
   `open_goal_wizard`) from "call when the user mentions X" to "call *after* you've given
   your coaching answer, to offer the user a guided way to lock it in."

### B. Add a goal-wizard offer

- New action type `open_goal_wizard` (mirror `open_meal_plan_wizard`): tool def in
  `STRUCTURED_TOOLS`, case in `mapToolCallToAction` (line 1652), dispatch case in
  `JarvisMode` (line 807 switch), and a dismissible offer card (reuse the
  `showGoalWizardPrompt` card shape at line 1077, which already deep-links
  `/schedule-setup`).
- Coach can now end a goal conversation with *"Want me to open the goal wizard to set
  this as your target?"* → card appears below → **Set it up** / **Not now**.

### C. Offer-card affordance (both wizards)

- Render both wizards as a compact **suggestion card** ("Meal wizard — pick your
  targets with buttons" / "Goal wizard — lock in your target") with a primary
  **Open** button and a **Dismiss**. Opening the meal card expands into the existing
  `JarvisMealPlanWizard`; opening the goal card routes to `/schedule-setup`.
- This replaces the current behaviour where `showMealPlanWizard` immediately renders the
  full multi-step wizard. Gentler, matches "pop up underneath for the user to use/dismiss."

### D. Decide the fast-path's fate (needs a call — see Open Questions)

The regex fast-path currently short-circuits the LLM whenever numbers are present. If we
want conversation even for numeric requests, we either (i) keep the fast-path but still
prepend a short coaching line, or (ii) route numeric requests through the LLM and let it
offer the wizard/plan. Simplest first step: **leave the fast-path as-is** (explicit
numbers = user already knows what they want, plan immediately) and only fix the
no-numbers conversational path. The 88kg example is a no-numbers case, so this alone
solves the reported bug.

---

### E. Split onboarding into three independent wizards

**Today** onboarding is one chained script (SYSTEM_PROMPT lines 416–436): goal intake
→ emit `[SCHEDULE_PLAN]` (workout) → then *"do you want a body scan?"* → `[BODY_SCAN_PROMPT]`.
Completing one step auto-promotes the next. There's also a front-end coupling: the
`schedule_plan` dispatch auto-shows the goal prompt (`showGoalWizardPrompt`, JarvisMode
line 808–812).

**Wanted:** three wizards that stand alone and can each be launched on their own, where
finishing one does **not** push the user into the next:

| Wizard | Trigger | Delivers |
|---|---|---|
| **Goal wizard** | user sets/updates a goal, or coach offers it | saves the goal (`/schedule-setup` goal step or `set_goals`) |
| **Body scan** | user asks about body comp, or coach offers it | `[BODY_SCAN_PROMPT]` / body scan flow |
| **Workout wizard** | user wants a plan/schedule, or coach offers it | `schedule_plan` → schedule |

Changes:
1. **Decouple the prompt** — rewrite the ONBOARDING section so each of goal / body scan /
   workout is described as an independently offerable wizard. Remove the "after schedule,
   ask about body scan" and "Turn 4 → immediately emit `[SCHEDULE_PLAN]`" auto-chaining.
   A first-run user can still be walked through all three in sequence **as an offer**
   ("want to set a goal? … now shall we build your plan? … want a body scan?"), but each
   step is a discrete offer card the user can take or skip, and skipping one does not
   block or auto-launch the others.
2. **Remove the front-end auto-promotion** — the `schedule_plan` dispatch should not force
   `showGoalWizardPrompt`; the goal offer is its own card shown only when goal is the
   topic.
3. **Each wizard individually reachable** — the coach can open just the body-scan card, or
   just the workout card, without dragging the other two along.

> Note: "workout wizard" = the existing `schedule_plan` / `/schedule-setup` flow;
> "body scan" = existing `[BODY_SCAN_PROMPT]`. This is decoupling + re-offer, not three
> new builds. The only genuinely new card is the **goal wizard offer** (§B).

---

## Files to touch

| File | Change |
|---|---|
| `supabase/functions/ai-coach/index.ts` | Rewrite meal-plan prompt section (~398), remove "no text" overrides (~2680), reinforce "never generate a meal plan inline — wizard→DB only" invariant, retune `open_meal_plan_wizard` desc (~675), add `open_goal_wizard` tool + `mapToolCallToAction` case, **rewrite ONBOARDING section (416–436) to decouple goal / body scan / workout**. *(Optional: tidy the dangling `recommend_meal_plan` reference at line 487 — only if editing that block; not a fix.)* |
| `src/components/coach/JarvisMode.tsx` | Add `open_goal_wizard` dispatch case; convert wizard rendering to compact offer-card → expand-on-open; add goal offer card; **remove `schedule_plan`→`showGoalWizardPrompt` auto-promotion (808–812)** |
| `src/components/coach/JarvisMealPlanWizard.tsx` | No logic change; may add a collapsed "offer" header state |
| (new) goal offer card | Small component or inline block reusing the line-1077 pattern |

## Safety: informed-autonomy four-state gate (SHIPPED, edge-only)

Principle: don't nanny a considered adult, and don't silently serve an unwise request.
For any meal request the handler resolves ONE of four states, priority top-down:

1. **Safety-hold** — ED / self-harm signal in the last ~6 user turns → no plan, no wizard,
   no fast-path; coach responds with care. Suppresses the backstop AND strips any
   wizard the LLM tries to emit (`suppressMealWizard`).
2. **Context-hold** — explicit request `< 1200 kcal` with no fasting/medical reason in the
   conversation → don't serve, don't open the wizard; coach asks ONE context question and
   invites the user to restate. Backstop suppressed.
3. **Serve** — explicit numbers, `≥ 1200` OR `< 1200` *with* a sensible reason
   (fasting/5:2/OMAD/supervised) → fast-path serves the DB plan; if sub-floor, a caveat
   line is streamed before the card (`sseTextThenAction`).
4. **Converse + offer** — vague meal request → coach in words, then the wizard. Backstop
   armed, now **conversation-scoped** (last 3 user turns) so a one-word follow-up
   ("muscle") can't drop the wizard.

Key interactions this fixes (all were real gaps in the first backstop):
- The deterministic backstop no longer force-fires the wizard during a context check or a
  safety hold (it's gated by `!safetyHold && !contextHold`).
- A safety signal in the SAME turn as meal phrasing no longer leaks a wizard card
  (`suppressMealWizard` drops it server-side; cross-turn, the front-end already
  auto-dismisses an open wizard on the next send).
- Mid-conversation follow-ups keep the wizard armed (conversation-scoped intent).

Prompt carve-outs shipped alongside: a RESPONSE-LENGTH exception (explain fully when a
request is unwise) and an INFORMED-AUTONOMY block in SAFETY RULES (ask → honour a
considered reason with caveats → only hold back on absent/harmful rationale).

**Follow-up (tracked, task #1):** ED/self-harm detection is keyword-based and only
*suppresses*. Improve detection (classifier vs regex) and surface region-appropriate
crisis-support resources (Samaritans / Beat) in the response. Safety-critical — separate
change.

## Implementation & release (does it need a TestFlight rebuild?)

App uses standard Capacitor bundling (`webDir: 'dist'`, no OTA/live-update in production),
so: **edge-function changes deploy instantly with no rebuild; front-end changes require a
TestFlight build.** The work splits so most of the visible win ships without TestFlight.

### Phase 1 — edge function only · NO rebuild · `supabase functions deploy ai-coach`
Delivers converse-first for meals + decoupled onboarding conversation, invariant preserved.
Works with no app change because the client already renders streamed `text` and already
handles the `open_meal_plan_wizard` action (wizard shows below the message).
1. Remove the two "output ONLY the tool call, no text" instructions (lines 398, 2680).
2. Add the "discuss strategy/numbers in words, never generate meals inline, offer the
   wizard after coaching" invariant.
3. Rewrite ONBOARDING section (416–436) to stop auto-chaining goal → schedule → body scan.
4. Deploy the function. Check logs after first deploy.

### Phase 2 — front-end · REQUIRES rebuild → `deploy-ios.sh hitt` → TestFlight
1. Goal wizard: `open_goal_wizard` tool (backend) + dispatch case + goal offer card (front-end).
2. Offer-card-then-expand affordance for both wizards (compact card → expands on tap).
3. Remove front-end auto-promotion (`schedule_plan`→`showGoalWizardPrompt`, JarvisMode 808–812).
4. Build → deploy → TestFlight (build number auto-increments in `deploy-ios.sh`).

**Ordering safety:** the front-end action `switch` (JarvisMode ~807) has no `default`
case, so unknown action types are silently ignored — deploying the backend
`open_goal_wizard` tool ahead of the app update is harmless. Still, ship that tool *with*
the Phase 2 build so client and backend match.

## Testing

- `tests/run.ts` has an `AI-*` group for coach markers — add assertions that the
  meal/goal wizard is offered *with* accompanying text, and that the "no text" phrasing is
  gone from the prompt.
- Manual: run the 88kg example and confirm coaching text + offer cards, no bare popup.

---

## Open questions for Vanessa

1. **Fast-path:** when a user *does* type explicit numbers, converse first too, or keep
   the instant plan? (Recommendation: keep instant for now — it's not the reported bug.)
2. **Goal wizard target:** should "goal wizard" mean the existing `/schedule-setup` page,
   or a new in-chat button flow like the meal wizard? (Recommendation: reuse
   `/schedule-setup` first; build in-chat later if wanted.)
3. **Offer aggressiveness:** always offer the wizard after a relevant conversation, or
   only when the user signals they're ready ("ok let's do it")? (Recommendation: offer
   once at the end of the first substantive goal/meal answer, then only on explicit ask.)
4. **First-run onboarding:** should a brand-new user still be *offered* all three wizards
   in sequence (goal → workout → body scan, each skippable), or land in free chat with no
   sequence at all? (Recommendation: offer the sequence, but every step is a skippable
   card that doesn't block or auto-launch the next.)
