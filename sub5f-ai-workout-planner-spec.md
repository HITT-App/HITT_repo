# Sub-task 5F: AI-generated workouts (the planner)

**Type:** Two new edge functions + shared context module + extended action contract + GymTimer adaptation + frontend dispatch
**Files affected:**
- `supabase/functions/_shared/ai-workout-context.ts` (new — shared context-gathering logic)
- `supabase/functions/generate-ai-workout/index.ts` (new — single-workout function)
- `supabase/functions/generate-ai-workout-plan/index.ts` (new — multi-day plan function)
- `supabase/functions/ai-coach/index.ts` (modify — extend `recommend_workout` tool to source-aware shape)
- `src/hooks/useAI.ts` (modify — handle the new payload shape in action validation)
- `src/hooks/useAI.types.ts` (modify — extend the `RecommendWorkoutPayload` type)
- `src/components/coach/JarvisMode.tsx` (modify — handle source-aware action; new "Do now" path)
- `src/pages/GymTimer.tsx` (modify — accept AI workout content via state OR scheduled_id; write workout_progress)
- Possibly new component: `AIWorkoutCard.tsx` for the single-workout action card UI
- Possibly new component: `AIWorkoutPlanCard.tsx` for the plan action card UI
**Estimated effort:** 1–2 days of focused implementation plus a careful verification cycle
**Depends on:** 5E (the schema), 5A/5B/5C (the AI plumbing)
**Does NOT touch:** WorkoutPlayer (catalogue workouts only), the workout-recommendations widget (that's 5F2), the user MD memory (6H)

---

## Why

The catalogue-based `generate-workout-plan` is obsolete (validates IDs against a catalogue we're moving away from, fails on timeouts, and produces selections not generation). 5F replaces it properly:

- The AI **generates** workout content directly (exercises, sets, reps, durations), rather than picking from a fixed catalogue
- Output is the workout *content*, stored inline using 5E's schema
- Users follow AI workouts by reading the exercise list and using a generic timer — no exercise-by-exercise structured player
- Two modes supported: single workout (one session) and multi-day plan (a week of workouts)

5F also extends the `recommend_workout` action contract to be source-aware, so a single action type carries either a catalogue UUID reference or an inline AI-generated workout, depending on its `source` field.

---

## Decisions already made (do not re-open)

These were settled in planning. The spec implements them:

1. **Two separate edge functions**, not one with a mode parameter
2. **Shared context module** (`_shared/ai-workout-context.ts`) to avoid duplicating HealthKit + goals + recent activity logic
3. **Extend `recommend_workout` to be source-aware** rather than adding new action types
4. **GymTimer adapted** to handle AI workouts — both scheduled and ad-hoc entry paths
5. **Ad-hoc "Do now" workouts skip the schedule** — they write directly to `workout_progress` with no `scheduled_id` link
6. **Plan output** writes multiple `scheduled_workouts` rows together when confirmed by the user
7. **Context window**: 90 days of HealthKit data, plus goals, plus recent activity logs
8. **User MD memory deferred** — context for 5F is HealthKit + goals + activity, not the MD (that's 6H)

---

## Architecture overview

```
User: "Build me a workout for tomorrow"
     │
     ▼
JarvisMode (via useAI) → ai-coach edge function with structured-v1
     │
     ▼
ai-coach decides to call recommend_workout tool, internally invokes
generate-ai-workout (single) → returns the workout content
     │
     ▼
ai-coach emits an action chunk:
{
  type: "recommend_workout",
  payload: {
    source: "ai_generated",
    title, description, exercises_snapshot,
    estimated_duration_minutes, estimated_calories
  }
}
     │
     ▼
useAI hook receives action, places in pendingActions, validates payload
     │
     ▼
JarvisMode dispatches → shows AIWorkoutCard with three buttons:
  - "Add to schedule"  → write scheduled_workouts row (ai_generated)
  - "Do now"           → navigate to /gym-timer with workout in state
  - "Skip"             → dismiss action
```

For plans, the flow is similar but `recommend_workout` action carries a `workouts: []` array, and "Add all to schedule" writes multiple rows.

---

# Part 1: The shared context module

## File: `supabase/functions/_shared/ai-workout-context.ts`

Both `generate-ai-workout` and `generate-ai-workout-plan` need the same context-gathering. Extract it once.

```ts
// supabase/functions/_shared/ai-workout-context.ts

export type WorkoutContext = {
  healthMetricsSummary: string;
  goalsSummary: string;
  recentActivitySummary: string;
  customMemory: string;
  customResponseStyle: string;
};

export async function gatherWorkoutContext(
  supabase: SupabaseClient,
  userId: string,
  client: { customMemory?: string; customResponseStyle?: string }
): Promise<WorkoutContext> {
  // 1. HealthKit metrics — last 90 days
  // Fetch from health_metrics table, summarise into a short narrative
  // (full data would balloon the prompt — summarise as "average steps X,
  // resting HR Y, sleep avg Z hrs, weekly active days W")
  const healthMetricsSummary = await summariseHealthMetrics(supabase, userId, 90);

  // 2. User goals — from the goals table (whichever holds them)
  const goalsSummary = await summariseGoals(supabase, userId);

  // 3. Recent activity — last 30 days of activity_logs as a short list
  const recentActivitySummary = await summariseRecentActivity(supabase, userId, 30);

  // 4. Client-provided custom memory + response style (passed through)
  return {
    healthMetricsSummary,
    goalsSummary,
    recentActivitySummary,
    customMemory: client.customMemory || '',
    customResponseStyle: client.customResponseStyle || '',
  };
}
```

The three `summarise*` helpers each query a small slice of data and produce a short narrative string. The exact format is the implementer's call — what matters is that the total context stays within a reasonable prompt budget (target: ~2000 tokens for the full context, leaving room for the system prompt and the user message).

**Why summarise vs raw data:** 90 days of HealthKit data raw would be huge. The model doesn't need every reading — it needs the *picture* of the user's fitness level and patterns. A summary like "average resting HR 62, weekly active days 4, average session duration 35 min, mostly cardio with 2x/wk strength" gives the model what it needs to generate appropriate workouts.

---

# Part 2: The single-workout function

## File: `supabase/functions/generate-ai-workout/index.ts`

Generates one AI workout based on context. Returns a structured JSON workout.

### Request shape

```ts
POST /functions/v1/generate-ai-workout
Authorization: Bearer <token>
Content-Type: application/json

{
  "intent": "<user's natural-language description, e.g. 'a 30-min lower body session for tomorrow morning'>",
  "customMemory"?: string,
  "customResponseStyle"?: string
}
```

`intent` is the user-facing request from chat — the AI uses it alongside context to decide what to generate.

### Response shape

```ts
{
  "workout": {
    "title": string,                    // e.g. "Lower Body Strength"
    "description": string,              // 1-2 sentences explaining the focus
    "estimated_duration_minutes": number,
    "estimated_calories": number,
    "exercises": [
      {
        "title": string,                // e.g. "Goblet Squat"
        "description": string | null,   // form cue / instruction
        "duration_seconds": number | null,
        "sets": number | null,
        "reps": number | null,
        "order_index": number,
        "body_area": string | null,
        "thumbnail_url": null,          // always null for AI workouts
        "video_url": null               // always null for AI workouts
      }
    ]
  }
}
```

Note: `thumbnail_url` and `video_url` are always null. AI workouts have no media. The schema accommodates them so the snapshot shape is uniform with catalogue workouts.

### Implementation

```ts
// supabase/functions/generate-ai-workout/index.ts
import { gatherWorkoutContext } from '../_shared/ai-workout-context.ts';
import { aiChatCompletion } from '../_shared/ai-client.ts';
import { checkAIQuota, logAIGeneration } from '../_shared/ai-quota.ts';

const SYSTEM_PROMPT = `
You are an expert fitness coach. Generate a single workout tailored to the user's context.

Output must be valid JSON matching this shape:
{
  "workout": {
    "title": "<short, descriptive>",
    "description": "<1-2 sentences>",
    "estimated_duration_minutes": <integer>,
    "estimated_calories": <integer>,
    "exercises": [
      {
        "title": "<exercise name>",
        "description": "<form cue or instruction, max 1 sentence>",
        "duration_seconds": <integer or null>,
        "sets": <integer or null>,
        "reps": <integer or null>,
        "order_index": <integer, 1-based>,
        "body_area": "<lower_body | upper_body | core | full_body | cardio | flexibility>",
        "thumbnail_url": null,
        "video_url": null
      }
    ]
  }
}

Rules:
- Match the workout intensity to the user's fitness level (inferred from health metrics)
- Estimated calories should be realistic for the duration and intensity
- Each exercise should have either sets+reps OR duration_seconds (not both, not neither)
- order_index starts at 1
- Always set thumbnail_url and video_url to null
- Aim for 4-8 exercises in a typical workout
`;

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  try {
    const { intent, customMemory, customResponseStyle } = await req.json();
    const supabase = createSupabaseClient(req);
    const { user } = await getAuthedUser(supabase);

    // Pre-log (for traceability per the pattern we established in ai-coach)
    await logAIGenerationStart(supabase, user.id, 'generate_ai_workout');

    // Quota check
    const quotaOk = await checkAIQuota(supabase, user.id, 'workout_plan');
    if (!quotaOk) return new Response(JSON.stringify({ error: 'Quota exceeded' }), { status: 429 });

    // Gather context
    const context = await gatherWorkoutContext(supabase, user.id, { customMemory, customResponseStyle });

    // Build the prompt
    const userPrompt = `
Context:
${context.healthMetricsSummary}
${context.goalsSummary}
${context.recentActivitySummary}
${context.customMemory ? `Custom memory: ${context.customMemory}` : ''}
${context.customResponseStyle ? `Response style: ${context.customResponseStyle}` : ''}

User intent: ${intent}

Generate a workout matching the intent and context. Output ONLY the JSON, no commentary.
    `.trim();

    // Call the model with structured output
    const response = await aiChatCompletion({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      thinkingConfig: { thinkingBudget: 1024 },  // creative gen, modest thinking
    });

    const parsed = JSON.parse(response.content);

    // Validate against the CHECK constraint requirements
    if (!parsed.workout?.title || !Array.isArray(parsed.workout?.exercises) || parsed.workout.exercises.length === 0) {
      return new Response(JSON.stringify({ error: 'AI produced invalid workout' }), { status: 502 });
    }

    // Validate each exercise has the required fields
    for (const ex of parsed.workout.exercises) {
      if (!ex.title || typeof ex.order_index !== 'number') {
        return new Response(JSON.stringify({ error: 'AI exercise missing required fields' }), { status: 502 });
      }
      // Ensure media fields are null (AI workouts have no media)
      ex.thumbnail_url = null;
      ex.video_url = null;
    }

    // Log completion
    await logAIGenerationEnd(supabase, user.id, 'generate_ai_workout', /* latency */);

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('generate-ai-workout error:', err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
```

---

# Part 3: The plan function

## File: `supabase/functions/generate-ai-workout-plan/index.ts`

Same shape, but generates an array of workouts for a multi-day plan.

### Request shape

```ts
POST /functions/v1/generate-ai-workout-plan
{
  "intent": "<e.g. 'a 4-day plan for muscle building this week'>",
  "daysPerWeek": number,
  "startDate": "<YYYY-MM-DD>",
  "selectedDays"?: [0, 2, 4],  // 0=Sun..6=Sat, optional — AI distributes if omitted
  "customMemory"?: string,
  "customResponseStyle"?: string
}
```

### Response shape

```ts
{
  "plan": {
    "title": "<plan name>",
    "goal": "<goal summary>",
    "start_date": "YYYY-MM-DD",
    "workouts": [
      {
        "scheduled_date": "YYYY-MM-DD",
        "title": "...",
        "description": "...",
        "estimated_duration_minutes": N,
        "estimated_calories": N,
        "exercises": [ /* same shape as single workout */ ]
      }
      // ... one per scheduled day
    ]
  }
}
```

### Implementation

Mirror of `generate-ai-workout` but:
- System prompt instructs the model to generate a coherent multi-workout plan (varying focus across days, appropriate progression, recovery considerations)
- `max_tokens` higher (6000) and `thinkingBudget` higher (2048) — plan generation involves more reasoning (distributing workouts across days, ensuring variety, alternating muscle groups)
- Output validation checks the workouts array matches the requested `daysPerWeek` count

The system prompt for plan:

```
You are an expert fitness coach. Generate a multi-workout plan tailored to the user's context.

Rules:
- Generate exactly the requested number of workouts (one per training day)
- Distribute focus across days (e.g. for 4 days: legs, push, pull, full body — adapt to goal)
- Ensure progressive intensity if appropriate to the goal
- Avoid overworking the same muscle group on consecutive days
- Scheduled_date for each workout uses the selectedDays if provided, else AI distributes
- All workouts within the plan use the same JSON shape as single workouts
- Output JSON only, no commentary
```

---

# Part 4: ai-coach tool extension

The `ai-coach` edge function's `recommend_workout` tool needs updating to be source-aware.

### Current tool (5B)

```ts
{
  name: 'recommend_workout',
  description: 'Recommend a specific workout...',
  parameters: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' }
    },
    required: ['id', 'name']
  }
}
```

### New tool (5F)

```ts
{
  name: 'recommend_workout',
  description: `
    Recommend a workout to the user. Two modes:
    - source = "catalogue": picks an existing workout by UUID (use only if you're confident the UUID exists in the catalogue)
    - source = "ai_generated": call this to trigger generation of a custom workout
    
    For ai_generated, the function will internally call generate-ai-workout to produce the full workout content.
    You don't need to provide the exercises — just call this tool with source: 'ai_generated' and the intent.
  `,
  parameters: {
    type: 'object',
    properties: {
      source: { type: 'string', enum: ['catalogue', 'ai_generated'] },
      // For catalogue:
      id: { type: 'string', description: 'Catalogue workout UUID (required if source=catalogue)' },
      name: { type: 'string', description: 'Catalogue workout name (required if source=catalogue)' },
      // For ai_generated:
      intent: { type: 'string', description: 'Natural-language description of the workout to generate (required if source=ai_generated)' }
    },
    required: ['source']
  }
}
```

### When the tool is called

In the `ai-coach` edge function's tool-call handler:

```ts
case 'recommend_workout': {
  if (toolCall.arguments.source === 'catalogue') {
    // Existing behaviour — validate UUID, emit action with catalogue payload
    if (!toolCall.arguments.id || !catalogueWorkoutIds.has(toolCall.arguments.id)) {
      // Skip invalid catalogue references
      break;
    }
    emitAction({
      type: 'recommend_workout',
      payload: {
        source: 'catalogue',
        id: toolCall.arguments.id,
        name: toolCall.arguments.name,
      }
    });
  } else if (toolCall.arguments.source === 'ai_generated') {
    // Server-side call to generate-ai-workout
    if (!toolCall.arguments.intent) break;
    
    const generated = await fetch(
      `${SUPABASE_URL}/functions/v1/generate-ai-workout`,
      {
        method: 'POST',
        headers: {
          'Authorization': req.headers.get('Authorization')!,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          intent: toolCall.arguments.intent,
          customMemory: clientContext.customMemory,
          customResponseStyle: clientContext.customResponseStyle,
        }),
      }
    );
    
    if (!generated.ok) {
      // Generation failed — emit text apology, no action
      emitText('Sorry, I couldn\'t generate a workout right now. Try again in a moment.');
      break;
    }
    
    const { workout } = await generated.json();
    emitAction({
      type: 'recommend_workout',
      payload: {
        source: 'ai_generated',
        title: workout.title,
        description: workout.description,
        exercises_snapshot: workout.exercises,
        estimated_duration_minutes: workout.estimated_duration_minutes,
        estimated_calories: workout.estimated_calories,
      }
    });
  }
  break;
}
```

A parallel `recommend_workout_plan` tool definition would do the same for `generate-ai-workout-plan` — except that's a multi-workout payload. **Decision point:** do we add a separate tool for plans, or extend `recommend_workout` to also handle plans?

Strong recommendation: **separate tool, `recommend_workout_plan`**. Plans are conceptually different (multi-day, requires `daysPerWeek` parameter, payload is a list). Overloading `recommend_workout` to cover both single and plan would make it three-mode (catalogue, ai_single, ai_plan) which is too much for one tool.

So actually:
- `recommend_workout` — source-aware: catalogue OR ai_generated single workout
- `recommend_workout_plan` — always AI-generated, multi-day plan (no catalogue equivalent)

This means a *new* action type after all, just for plans. The original "extend recommend_workout" decision still applies for single workouts; plans get their own thing.

### New action type: `recommend_workout_plan`

```ts
// In useAI.types.ts
export type RecommendWorkoutPlanPayload = {
  title: string;
  goal: string;
  start_date: string;  // YYYY-MM-DD
  workouts: Array<{
    scheduled_date: string;
    title: string;
    description: string;
    exercises: ExerciseSnapshot[];
    estimated_duration_minutes: number;
    estimated_calories: number;
  }>;
};

export type Action =
  | { type: 'schedule_plan', payload: SchedulePlanPayload }
  | { type: 'log_food', payload: LogFoodPayload }
  | { type: 'recommend_workout', payload: RecommendWorkoutPayload }  // now source-aware
  | { type: 'recommend_workout_plan', payload: RecommendWorkoutPlanPayload }  // NEW
  | { type: 'recommend_recipe', payload: RecommendRecipePayload }
  | { type: 'body_scan_prompt' };

export type RecommendWorkoutPayload =
  | { source: 'catalogue', id: string, name: string }
  | { source: 'ai_generated', title: string, description: string, exercises_snapshot: ExerciseSnapshot[], estimated_duration_minutes: number, estimated_calories: number };
```

---

# Part 5: Frontend dispatch and UI

## useAI action validation

In `useAI.ts`, the action validation in the stream parser needs to handle the new shapes:

```ts
// For recommend_workout, validate the source-discriminated shape
function validateRecommendWorkout(payload: any): payload is RecommendWorkoutPayload {
  if (payload?.source === 'catalogue') {
    return typeof payload.id === 'string' && typeof payload.name === 'string';
  }
  if (payload?.source === 'ai_generated') {
    return typeof payload.title === 'string'
      && Array.isArray(payload.exercises_snapshot)
      && payload.exercises_snapshot.length > 0
      && typeof payload.estimated_duration_minutes === 'number';
  }
  return false;
}

function validateRecommendWorkoutPlan(payload: any): boolean {
  return typeof payload?.title === 'string'
    && Array.isArray(payload?.workouts)
    && payload.workouts.length > 0
    && payload.workouts.every((w: any) =>
      typeof w.title === 'string'
      && Array.isArray(w.exercises)
      && typeof w.scheduled_date === 'string'
    );
}
```

Invalid actions are silently dropped (with a console warning). The user just doesn't see a card.

## JarvisMode dispatch

In JarvisMode's action dispatch useEffect (from 5C), add the new action types:

```ts
case 'recommend_workout':
  if (action.payload.source === 'catalogue') {
    // Existing catalogue behaviour — fetch full workout from DB by ID
    fetchCatalogueWorkoutAndShow(action.payload.id, globalIndex);
  } else {
    // New AI behaviour — payload already has all the content
    setAIWorkout({ ...action.payload, actionIndex: globalIndex });
  }
  break;

case 'recommend_workout_plan':
  setAIWorkoutPlan({ ...action.payload, actionIndex: globalIndex });
  break;
```

## New UI components

### `AIWorkoutCard.tsx`

Renders a single AI-generated workout. Shows title, description, exercise list (collapsed or expanded), duration estimate, calorie estimate. Three buttons:

- **"Add to schedule"** — opens a date picker (default tomorrow), writes a `scheduled_workouts` row with `workout_source='ai_generated'` and inline content, marks action as dismissed, shows synthetic confirmation in chat
- **"Do now"** — navigates to `/gym-timer` with workout content passed via `location.state.aiWorkout`
- **"Skip"** — calls `ai.dismissAction(index)`, removes the card

### `AIWorkoutPlanCard.tsx`

Renders a multi-workout plan. Shows plan title, goal, list of workouts (each collapsed showing date + title + duration). Buttons:

- **"Add all to schedule"** — writes N `scheduled_workouts` rows (one per workout in the plan), all with `workout_source='ai_generated'`, marks action dismissed, shows synthetic confirmation listing the dates and titles
- **"Skip"** — dismisses

The "Add all to schedule" write is done as a transaction (a single insert with multiple rows). If any row fails the CHECK constraint, the whole insert rolls back — the user gets nothing added rather than a partial plan.

---

# Part 6: GymTimer adaptation

## File: `src/pages/GymTimer.tsx`

The diagnostic confirmed GymTimer is the right base. Adapt it to support AI workouts in two entry modes.

### Entry modes

**Mode A — from schedule (`?scheduled_id=<uuid>`):**

```tsx
const [searchParams] = useSearchParams();
const scheduledId = searchParams.get('scheduled_id');
// Fetch scheduled_workouts row, read exercises_snapshot, workout_title, etc.
// On completion: write workout_progress with workout_source='ai_generated', 
//                link to scheduled_id, mark scheduled row complete
```

**Mode B — ad-hoc "Do now" (`location.state.aiWorkout`):**

```tsx
const location = useLocation();
const adhocWorkout = location.state?.aiWorkout as AIWorkoutPayload | undefined;
// Use the workout content directly from state
// On completion: write workout_progress with workout_source='ai_generated',
//                no scheduled_id link
```

**Mode C — existing freeform sport (unchanged):**

The existing `?sport=X` mode keeps working as today (logs to activity_logs, no exercise list).

### UI changes

When in Mode A or B:
- Show the exercise list above the timer (collapsible to save space)
- Each exercise shows: order_index, title, sets×reps or duration, body_area badge
- The timer below works as today — hold-to-finish gesture

When in Mode C: unchanged from today.

### Completion writes

**Mode A:**
```ts
await supabase.from('workout_progress').insert({
  user_id: user.id,
  workout_id: null,  // AI workouts have no catalogue ID
  workout_source: 'ai_generated',
  workout_title: scheduledRow.workout_title,
  workout_description: scheduledRow.workout_description,
  exercises_snapshot: scheduledRow.exercises_snapshot,
  estimated_duration_minutes: scheduledRow.estimated_duration_minutes,
  estimated_calories: scheduledRow.estimated_calories,
  duration_seconds: totalElapsed,
  calories_burned: computedCalories,
});

await supabase.from('scheduled_workouts').update({
  status: 'completed',
  completed_at: new Date().toISOString(),
  duration_minutes: Math.round(totalElapsed / 60),
  calories_burned: computedCalories,
}).eq('id', scheduledId);
```

**Mode B:**
```ts
await supabase.from('workout_progress').insert({
  user_id: user.id,
  workout_id: null,
  workout_source: 'ai_generated',
  workout_title: adhocWorkout.title,
  workout_description: adhocWorkout.description,
  exercises_snapshot: adhocWorkout.exercises_snapshot,
  estimated_duration_minutes: adhocWorkout.estimated_duration_minutes,
  estimated_calories: adhocWorkout.estimated_calories,
  duration_seconds: totalElapsed,
  calories_burned: computedCalories,
});
// No scheduled_workouts row to update
```

---

# Out of scope

- The Workout Recommendations widget on Home (that's 5F2)
- The user MD memory system (6H)
- WorkoutPlayer changes (catalogue workouts only, deferred from v1.0 nav)
- The Coach tab's Workout Planner guided flow (6D — that's the UI side; this is the underlying capability)
- Migration of any other AI surface to this flow (5G/5H/etc are separate)
- Removing the obsolete `generate-workout-plan` edge function (5I cleanup)
- A "save plan as template" feature
- Editing/regenerating individual workouts within a plan
- Multi-week plans (only single-week for v1.0)
- Calorie estimation refinement (the AI's estimate is good enough for v1.0)
- The "track this against my goals" feature (just logging is enough)

---

# Acceptance criteria

## Edge functions
1. `generate-ai-workout` deployed and returns valid JSON matching the schema.
2. `generate-ai-workout-plan` deployed and returns valid JSON matching the schema.
3. Both validate output server-side; malformed AI responses produce 502 with a clear error, not silent failures.
4. Both pre-log to `ai_generation_log` (per the pattern established earlier today).
5. Both honour quota checks.
6. Generation completes within reasonable time: target <10s for single, <20s for plan. If the `thinkingConfig` parameter is honoured, both should be faster.

## ai-coach integration
7. `recommend_workout` tool is source-aware. Calling with `source='ai_generated'` invokes `generate-ai-workout` internally and emits an action with the inline payload.
8. `recommend_workout_plan` tool exists and emits the plan action.
9. Invalid AI outputs (failing payload validation) produce a graceful failure (text apology to user, no action emitted) rather than a stuck stream.

## Frontend
10. `useAI` validates the new payload shapes. Invalid actions dropped with console warning.
11. JarvisMode dispatches both `recommend_workout` (catalogue and ai_generated) and `recommend_workout_plan` to their respective cards.
12. `AIWorkoutCard` renders correctly with title, description, exercise list, duration, calories, three buttons.
13. `AIWorkoutPlanCard` renders correctly with plan title, goal, workouts list, two buttons.
14. "Add to schedule" writes a row passing the CHECK constraint and shows a synthetic confirmation in chat.
15. "Add all to schedule" (plan) writes all rows as a transaction; partial failure rolls back.
16. "Do now" navigates to GymTimer with the workout in state.

## GymTimer
17. Mode A (from schedule) loads the scheduled row, reads exercises_snapshot, runs the timer, on hold-to-finish writes workout_progress AND marks the scheduled row complete.
18. Mode B (ad-hoc) reads from location.state, runs the timer, on completion writes workout_progress only.
19. Mode C (existing sport) still works unchanged.
20. The exercise list above the timer renders correctly in Modes A and B; hidden in Mode C.

## Schema compliance
21. Every workout_progress row from AI workouts passes the 5E CHECK constraint (workout_source='ai_generated' implies workout_title and exercises_snapshot are non-null).
22. Every scheduled_workouts row from AI workouts passes the same.

## Verification on real device
23. Vanessa can ask Jarvis for a single workout, see the AIWorkoutCard, tap "Add to schedule" — row appears in scheduled_workouts.
24. Vanessa can tap "Do now" on the same card — navigates to GymTimer, sees the exercises, runs the timer, completes — workout_progress row appears.
25. Vanessa can ask Jarvis for a multi-day plan, see AIWorkoutPlanCard, tap "Add all to schedule" — multiple rows appear.
26. The schedule view renders the AI workouts correctly (no crash on null workout_id, title from inline field).
27. The History view renders completed AI workouts correctly.

---

# Verification SQL (post-test)

After Vanessa tests on device:

```sql
-- Latest workout_progress rows
SELECT 
  id, workout_source, workout_title,
  workout_id, 
  jsonb_array_length(exercises_snapshot) as exercises_count,
  estimated_duration_minutes, estimated_calories,
  duration_seconds, calories_burned, completed_at
FROM workout_progress 
WHERE user_id = 'a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd' 
ORDER BY completed_at DESC LIMIT 5;

-- Latest scheduled_workouts rows
SELECT 
  id, workout_source, workout_title,
  workout_id, scheduled_date, status,
  jsonb_array_length(exercises_snapshot) as exercises_count
FROM scheduled_workouts
WHERE user_id = 'a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd' 
ORDER BY created_at DESC LIMIT 10;

-- ai_generation_log for the two new functions
SELECT 
  created_at, generation_type, latency_ms, error
FROM ai_generation_log
WHERE user_id = 'a4cbfe56-bc10-484c-9b3c-aa0d5677fbbd'
  AND generation_type IN ('generate_ai_workout', 'generate_ai_workout_plan')
ORDER BY created_at DESC LIMIT 10;
```

---

# Rollback

5F is mostly additive — new files, new edge functions, new action types. To roll back:

1. Revert the two new edge functions (or just stop calling them from ai-coach)
2. Revert the `recommend_workout` tool extension in ai-coach back to catalogue-only
3. Remove the `recommend_workout_plan` action type from useAI.types.ts
4. Revert the JarvisMode action dispatch additions
5. Remove the AIWorkoutCard and AIWorkoutPlanCard components
6. Revert GymTimer's mode A/B handling — Mode C (existing) is untouched

The 5E schema stays — nullable workout_id is fine even without 5F using it. No DB rollback needed.

---

# Notes for the implementer

1. **This is the biggest spec in the refactor.** Read it carefully before starting. The parts are interconnected — edge function output shape must match the action payload shape must match the schema CHECK constraint must match the GymTimer state shape. A single field name typo breaks the chain.

2. **Pre-implementation review required.** Before writing code, confirm your plan back to me: file structure, the exact `recommend_workout_plan` tool schema, the AIWorkoutCard's UI sketch, whether you intend to use the existing CompletionSummary component or a new one for AI completions.

3. **Test the gateway thinking budget on the FIRST function you build.** We know `thinkingConfig: { thinkingBudget: N }` is the correct Gemini syntax. Verify it's actually capping thinking by checking the latency_ms in ai_generation_log — should be much faster than the catalogue version was.

4. **The action payload validation in useAI is the schema's first line of defence.** If a malformed AI output slips through to the schedule write, the CHECK constraint catches it but the user sees an error. Validate early, fail gracefully (skip the action, emit text apology).

5. **The "Add to schedule" date picker** should default to tomorrow but allow any future date. Don't over-engineer — a simple date picker is fine.

6. **The plan "Add all to schedule" write is a single transaction.** Use Supabase's bulk insert. If any row fails, all roll back. Don't write rows one at a time in a loop — that's the path to half-written plans.

7. **Don't touch WorkoutPlayer.** AI workouts are GymTimer territory. If you find yourself in WorkoutPlayer, you're in the wrong file.

8. **The shared context module is the place to summarise.** 90 days of raw HealthKit is too much. Summarise to a narrative. The implementer's call on exactly what summary fields matter most.

9. **Pre-deployment plan:** edge functions first (test each via curl with a real token), then the ai-coach tool extension (test via the existing test-structured script), then the frontend, then full end-to-end on real device.

10. **Real-device test on Vanessa's account is non-negotiable.** Every acceptance criterion needs verifying. AI generation has variability — run each test 2-3 times to confirm consistency.
