# Sub-task 5C: Migrate JarvisMode to consume useAI

**Type:** Major refactor of an existing user-facing component
**Files affected:**
- `src/components/coach/JarvisMode.tsx` (heavily modified — ~1152 lines → expected ~600-700 lines)
- `src/components/coach/VoiceController.tsx` (small adjustment — share-prompt-detail handling)
**Estimated effort:** A focused day. The migration itself is straightforward; the verification matters more.
**Depends on:** 5A and 5B (both deployed in Build 106, verified end-to-end)
**Does NOT touch:** AICoach.tsx (that's 5D), edge function (stable as of 5B), voice code (deferred)

---

## Why

JarvisMode currently owns the entire AI plumbing locally: conversation history state, streaming fetch, marker regex parsing, action card rendering, DB persistence. The 5A `useAI` hook centralises the conversation plumbing into one tested place. 5C is the migration that makes JarvisMode actually use it.

After 5C:
- JarvisMode is purely a UI surface over the hook
- The marker regex parser is gone — actions arrive as structured chunks
- JarvisMode is roughly half its current size

This is the migration that pays off the foundation work from 5A+5B.

---

## Reference inputs

5A and 5B's deliverables, all live in the codebase as of Build 106:
- `src/hooks/useAI.ts` — the hook
- `src/hooks/useAI.types.ts` — types: `AIMessage`, `Action`, `UseAIReturn`, `StreamStatus`
- Structured response branch in `supabase/functions/ai-coach/index.ts`
- Verified end-to-end: hook → edge function → action → meal_logs write

Current JarvisMode source: `src/components/coach/JarvisMode.tsx` (1152 lines per the audit). The implementer should read this file in full before starting.

---

## What changes — the high-level diff

### Remove from JarvisMode

| Code | Reason |
|---|---|
| `conversationHistory` state + `historyRef` | Hook owns `messages` |
| `response` state (streaming text) | Hook owns `streamingText` |
| `streamAbortRef` | Hook owns abort |
| `isProcessing` state (if it duplicates streaming state) | Hook's `status` |
| The direct `fetch` + `ReadableStream` code in `sendMessage()` | Hook does this |
| The direct `fetch` + streaming code in `triggerGreeting()` | Hook does this |
| `parseAIResponse()` regex function | Actions arrive structured |
| Direct supabase reads from `messages` table on load | Hook does this on mount |
| Direct supabase inserts to `messages` and `conversations` | Hook does this |
| Direct supabase inserts to `meal_logs` (LOG_FOOD action) | Hook does this silently |
| The `customMemory` / `customResponseStyle` localStorage reads | Hook does this |

### Keep in JarvisMode

| Code | Reason |
|---|---|
| The Sheet/overlay UI scaffolding | UI concern |
| The mic visualiser | Visual (voice deferred but UI stays) |
| `pendingSchedule` card rendering + the createScheduleFromJarvis flow | Consumer action handler |
| `recommendedWorkout` card rendering + its three buttons | Consumer action handler |
| `recommendedRecipe` card rendering + its three buttons | Consumer action handler |
| `pendingBodyScan` CTA card | Consumer action handler |
| Share-prompt-detail formatting on open | UI bootstrap |
| Streaming text display in chat bubble | UI rendering of `hook.streamingText` |
| `isListening`, `isConnectingRef` — voice-related local state | Deferred but keep wiring |
| The `hitt:open-jarvis*` event listener integration | External entry points |

### Add to JarvisMode

| Code | Reason |
|---|---|
| `const ai = useAI();` | The hook |
| A `useEffect` on `ai.pendingActions` that dispatches each action to its handler | New action plumbing |
| Action dismiss wiring (each card's "Skip" calls `ai.dismissAction(index)`) | UI cleanup |

---

## Action dispatch — the core change

Today, after a streaming response completes, `parseAIResponse()` runs regex over the text and produces a result like:

```ts
{
  displayText: "...",
  schedule: SchedulePayload | null,
  foods: FoodPayload[],
  workoutRec: WorkoutRecPayload | null,
  recipeRec: RecipeRecPayload | null,
  bodyScanPrompt: boolean,
}
```

…which JarvisMode then dispatches by setting state (`setPendingSchedule(schedule)`, `setRecommendedWorkout(workout)`, etc.).

In the migrated version, actions arrive structured in `ai.pendingActions`. A single useEffect dispatches them as they arrive:

```tsx
const ai = useAI();

useEffect(() => {
  if (ai.pendingActions.length === 0) return;
  
  // Process actions that haven't been dispatched yet.
  // We use a ref to track "already dispatched indices" so the effect
  // doesn't re-dispatch on every re-render.
  const newActions = ai.pendingActions.slice(dispatchedCountRef.current);
  
  for (let i = 0; i < newActions.length; i++) {
    const action = newActions[i];
    const globalIndex = dispatchedCountRef.current + i;
    
    switch (action.type) {
      case 'schedule_plan':
        setPendingSchedule({ ...action.payload, actionIndex: globalIndex });
        break;
      
      case 'log_food':
        // Already written to meal_logs by the hook. Nothing for us to do.
        // Optionally show a small "logged ✓" toast for user feedback.
        toast.success(`Logged: ${action.payload.name}`);
        break;
      
      case 'recommend_workout':
        // Fetch full workout details from DB, then set state.
        fetchWorkoutAndShow(action.payload.id, globalIndex);
        break;
      
      case 'recommend_recipe':
        fetchRecipeAndShow(action.payload.id, globalIndex);
        break;
      
      case 'body_scan_prompt':
        setPendingBodyScan({ actionIndex: globalIndex });
        break;
    }
  }
  
  dispatchedCountRef.current = ai.pendingActions.length;
}, [ai.pendingActions]);
```

The `actionIndex` is captured on each piece of state so the dismiss handler can call `ai.dismissAction(actionIndex)` to remove it.

**Important about the `log_food` toast**: today's behaviour has been silent — the user only knows the meal was logged if they happen to look at the Nutrition screen. Adding a small "Logged: X" toast is a tiny UX improvement that costs nothing. If you'd prefer to keep it fully silent (matching today), drop the toast call. I'd recommend including it.

---

## Step-by-step migration

### Step 1 — Add the hook

At the top of the JarvisMode component body:

```tsx
const ai = useAI();
const dispatchedCountRef = useRef(0);
```

The ref tracks how many actions we've already dispatched, so the dispatch useEffect doesn't re-fire on re-render.

### Step 2 — Replace conversationHistory with ai.messages

Wherever `conversationHistory` is read for rendering chat bubbles, replace with `ai.messages`. Same shape (role + content).

The 40-message slicing — today's code probably slices the array somewhere — can be removed. The hook already loads only the last 40 on mount, and persists each new message. The full history grows beyond 40, but for the AI request the hook sends a slice of recent ones (per the 5A spec).

### Step 3 — Replace response (streaming text) with ai.streamingText

Wherever the current code renders the live-streaming text bubble, use `ai.streamingText` instead. When the stream completes, the hook moves the text into `ai.messages`, so the rendering logic should be:

```tsx
{ai.messages.map(msg => <Bubble key={msg.id} role={msg.role}>{msg.content}</Bubble>)}
{ai.status === 'streaming' && ai.streamingText && (
  <Bubble role="assistant" streaming>{ai.streamingText}</Bubble>
)}
```

### Step 4 — Replace sendMessage with ai.send

JarvisMode's user-input handler currently does:
- Add user message to local state
- Persist to DB
- Build fetch body with history + memory
- Stream the response
- Parse and dispatch actions
- Persist assistant message to DB

All of that is in the hook now. The replacement is one line:

```tsx
const onSend = (text: string) => {
  ai.send(text);
};
```

The text input clearing, the input-disabled-while-streaming UI, etc. all stay in JarvisMode but key off `ai.status` instead of local state.

### Step 5 — Replace triggerGreeting

Today's `triggerGreeting` fires when JarvisMode opens fresh and builds a special greeting prompt. The migration:

```tsx
const triggerGreeting = (sharePromptDetail?: ShareDetail) => {
  // If there's a share-prompt-detail, format it into a user message
  // about the workout. Otherwise, send a generic greeting trigger.
  const messageText = sharePromptDetail
    ? formatSharePrompt(sharePromptDetail)
    : "Hi"; // or whatever generic seed the current greeting uses
  
  ai.send(messageText);
};
```

The existing `formatSharePrompt` function (or wherever the share-prompt formatting lives) stays — it just feeds into `ai.send` now.

### Step 6 — Wire up action dispatch

Add the dispatch useEffect from the "Action dispatch" section above.

### Step 7 — Update action card "skip" / dismiss handlers

Each action card (workout, recipe, schedule, body scan) has a Skip button. Update each to:

```tsx
const onSkipWorkout = () => {
  if (recommendedWorkout?.actionIndex !== undefined) {
    ai.dismissAction(recommendedWorkout.actionIndex);
  }
  setRecommendedWorkout(null);
};
```

The dismiss propagates back to the hook so `pendingActions` clears. JarvisMode also clears its own local card state.

### Step 8 — Remove the dead code

Once everything is wired:

- Delete `parseAIResponse` (the regex function)
- Delete the direct fetch / streaming code from `sendMessage` and `triggerGreeting`
- Delete the conversationHistory state and historyRef
- Delete the response/streaming state and streamAbortRef
- Delete the supabase reads and writes on the messages table
- Delete the localStorage reads for memory/style (hook does this)

Be aggressive about deletion. Anything that's been replaced should go. Lingering dead code is exactly the technical debt this refactor is meant to remove.

### Step 9 — Verify dispatchedCountRef is reset between conversations

If JarvisMode unmounts and remounts (closing and reopening the overlay), the `dispatchedCountRef` should reset to 0. Since it's a `useRef`, it persists per component instance, so a fresh mount gives a fresh ref. This is correct behaviour — verify it works.

---

## VoiceController adjustment

The `hitt:open-jarvis-share` event passes `sharePromptDetail` to JarvisMode. VoiceController currently has some logic around how this is passed. After 5C, the flow becomes:

1. VoiceController receives event with `sharePromptDetail`
2. VoiceController opens JarvisMode, passing the detail as a prop
3. JarvisMode mounts; its `useEffect` for first-open formats the detail into a user message and calls `ai.send(messageText)`
4. The hook handles streaming and action dispatch

This should be a small change to VoiceController — just confirm the prop is still being passed correctly. The internal flow inside JarvisMode handles the actual send.

---

## What's NOT changing

To be ruthlessly explicit:

- The marker-based code path in the edge function (still serving non-header requests like AICoach)
- AICoach.tsx (5D's job)
- useAIChat.ts (5D's job)
- The voice code (deferred — flag stays false)
- The mic visualiser (visual only)
- The action card UI components (workout card, recipe card, etc.) — same components, fed by new state
- The Sheet/overlay scaffolding
- The event listeners on VoiceController
- The TTSContext (voice-related, deferred)
- The custom memory / response style settings UI
- The Schedule, Body Scan, or any destination pages

If you find yourself touching these, stop and check whether it's actually required.

---

## Acceptance criteria

1. **JarvisMode imports and uses `useAI`.** Grep confirms.
2. **`parseAIResponse` regex function is deleted from JarvisMode.** Grep confirms.
3. **Direct fetch / streaming code is removed.** No `fetch(SUPABASE_URL + '/functions/v1/ai-coach')` inside JarvisMode.
4. **No direct supabase inserts to messages, conversations, or meal_logs from JarvisMode.** Grep confirms (the hook does these; JarvisMode does not duplicate).
5. **Conversation persistence works.** Open Jarvis, see 42+ existing messages. Send a new message, refresh, see 43+ messages.
6. **Streaming UI works.** New message responses stream in word-by-word as expected. Final text matches streamed text.
7. **Schedule action card works.** Ask "create me a workout plan for 3 days a week for fat loss". Schedule confirm card appears. Confirm. Plan is created.
8. **Workout recommendation card works.** Ask "suggest a workout for me". Workout card appears with thumbnail, three buttons (Start, Add to schedule, Skip). Each button works.
9. **Recipe recommendation card works.** Similar to workout: ask for a meal suggestion. Recipe card appears, all three buttons work.
10. **Body scan CTA works.** Ask about body composition. CTA appears, tap opens Body Scan page.
11. **Food logging works silently.** Say "I just ate a chicken caesar salad, can you log it?". `meal_logs` row appears. (Optional small toast appears.)
12. **Share-prompt-detail flow works.** Complete a workout with a PB. The post-workout share nudge fires. JarvisMode opens with a pre-formatted message about the workout. AI responds appropriately.
13. **No regressions in AICoach (still on markers).** Open AICoach via HIIT menu → HIIT AI Coach. Send a message. Everything works as before. (5D handles its migration.)
14. **TypeScript clean. No console errors.**
15. **Tested on real iPhone via TestFlight on Vanessa's account.**

---

## Testing checklist (real device, Vanessa's account)

Run in this exact order:

### Setup
- [ ] Build 107+ installed
- [ ] Signed in

### Smoke test
- [ ] Tap centre HIIT button → drawer opens → tap HIIT AI Coach? No — actually, open Jarvis via whatever entry point we have currently. Per the audit: centre BottomNav button dispatches `hitt:open-jarvis` (or did before Task 2's redesign). May need to verify the entry point still works post-Task-2.

Pause and check before proceeding: **how is Jarvis currently opened in Build 106?** If Task 2's HIIT menu didn't preserve a Jarvis entry, we need to either add one or test via the Profile → Debug AI route.

### Conversation continuity
- [ ] Open Jarvis. See existing messages (~42 from Vanessa's history).
- [ ] Send "hello". Expect a streaming response that references Vanessa's name and recent activity.
- [ ] Close Jarvis. Reopen. See the new message in history.

### Each action type
For each of these, run as a separate message and verify:

- [ ] **Schedule:** "Create me a workout plan for 4 days a week for muscle gain." Card appears. Tap "Confirm". Schedule populated.
- [ ] **Workout rec:** "Suggest a workout I could do right now." Workout card appears. Test each button: Start, Add to schedule, Skip.
- [ ] **Recipe rec:** "Suggest a healthy lunch idea." Recipe card appears. Test each button.
- [ ] **Body scan:** "How is my body composition looking?" CTA card appears.
- [ ] **Food log:** "I just had a chicken caesar salad for lunch, can you log it?" Toast appears (if implemented). Check meal_logs:

```sql
SELECT * FROM meal_logs 
WHERE user_id = 'a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd' 
ORDER BY created_at DESC LIMIT 1
```

### Edge cases
- [ ] Send a long-winded message. Streaming text should appear in real-time, not all at once.
- [ ] Send a message and immediately close the Sheet while streaming. Reopening: the message and partial response should either be preserved (if the hook persists mid-stream) or cleanly absent (if it doesn't).
- [ ] Send two messages back-to-back rapidly. Second one should queue or replace cleanly, not error.

### AICoach (regression check)
- [ ] Navigate to /ai-coach via the HIIT menu's "HIIT AI Coach" item.
- [ ] Send a message. Confirm it still works — actions still trigger their cards (via the old marker path).

If AICoach breaks here, the marker-path code was modified by mistake.

---

## Reporting back

Implementer's response should confirm:

1. Each acceptance criterion verified on Vanessa's account.
2. The line count delta (expected: JarvisMode shrinks by ~500 lines).
3. The diff summary — which functions/state were removed, which were added.
4. **AICoach regression test result** — confirm it still works via markers.
5. **The meal_logs SQL output** showing a new row from the food-log test.
6. TestFlight build number.
7. Any voice-adjacent code paths discovered that we hadn't accounted for — flag, don't fix.

---

## Rollback

JarvisMode is a single file. To roll back:
1. Revert JarvisMode.tsx to the pre-5C version (still in git)
2. Revert VoiceController.tsx if changed
3. No DB changes, no schema, no migrations
4. No need to touch the hook, edge function, or any other 5A/5B work — that all stays

---

## Notes for the implementer

1. **Read JarvisMode.tsx in full before starting.** It's 1152 lines. Understand the existing state, the existing data flow, what each ref does. Migration mistakes come from incomplete understanding of the source.

2. **Don't migrate the voice code.** It's wrapped in `VOICE_FEATURE_ENABLED` checks. Leave it alone — the deferral is intact.

3. **The dispatch useEffect's "track what we've dispatched" pattern matters.** Without the ref, the effect fires every render of pendingActions and re-dispatches the same actions. Use a ref to track count.

4. **Vanessa's account has real chat history.** Don't run any DB operations that would clear it (e.g. "delete all messages" cleanup). The 42-message history is part of the verification — losing it would be a regression we couldn't easily distinguish from a migration bug.

5. **The debug route from 5A+5B is still in the codebase.** Don't remove it during 5C — we may want it for diagnosing issues. Removal happens in 5I cleanup.

6. **Aggressive deletion of dead code is the point.** Once a piece of state is replaced by hook state, delete it. Don't leave it as "just in case". The clean refactor is the goal.

7. **One file, one focused change.** Resist the urge to refactor other components while you're in JarvisMode. Touch only what 5C requires.
